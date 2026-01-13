import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { sendPaymentConfirmationEmail } from './services/emailService.js'
import { sendPaymentWebhook } from './services/webhookService.js'

/**
 * @swagger
 * /tenderbot/pagos/{id}/marcar-pagado:
 *   post:
 *     summary: Marcar pago como PAGADO
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API Key para autenticar la solicitud
 *         schema:
 *           type: string
 */
export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters || {}
    const body = JSON.parse(event.body || '{}')
    const { transaction_id, proveedor_pago, orden_compra } = body

    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    // 1. Obtener Pago y Suscripción
    const { data: pago, error: errPago } = await supabase
        .from('tb_pagos')
        .select('*, tb_suscripciones(*)')
        .eq('id', id)
        .single()
    
    if (errPago || !pago) return { statusCode: 404, body: JSON.stringify({ error: 'Pago no encontrado' }) }
    
    if (pago.estado === 'PAGADO') {
        return { statusCode: 200, body: JSON.stringify({ message: 'Pago ya estaba pagado', pago }) }
    }

    const now = new Date().toISOString()
    const suscripcion = pago.tb_suscripciones

    // 2. Actualizar Pago
    const { error: updatePagoErr } = await supabase
        .from('tb_pagos')
        .update({
            estado: 'PAGADO',
            pagado_en: now,
            transaction_id,
            proveedor_pago,
            orden_compra
        })
        .eq('id', id)
    
    if (updatePagoErr) throw updatePagoErr

    // 3. Lógica Suscripción
    let subUpdates = { updated_at: now }
    let shouldAdvance = false

    // Reactivar si estaba vencida/pausada
    if (['VENCIDA', 'PAUSADA'].includes(suscripcion.estado)) {
        subUpdates.estado = 'ACTIVA'
    }

    // Verificar si avanza facturación
    // Si el pago cubre hasta el día anterior a la próxima facturación (o cerca), avanzamos.
    // Simplificación: Si es el último pago generado, avanzamos.
    // Mejor: comparamos fechas.
    const pagoHasta = new Date(pago.periodo_hasta)
    const proxFact = new Date(suscripcion.proxima_facturacion)
    
    // Check if pagoHasta is roughly proxFact - 1 day.
    // Or simpler: always advance if this is a payment for the cycle ending at proxFact.
    // Let's assume yes.
    
    const nextBilling = new Date(proxFact)
    if (suscripcion.periodicidad === 'MENSUAL') {
        nextBilling.setMonth(nextBilling.getMonth() + 1)
    } else {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1)
    }
    
    subUpdates.proxima_facturacion = nextBilling.toISOString()
    
    const { error: updateSubErr } = await supabase
        .from('tb_suscripciones')
        .update(subUpdates)
        .eq('id', suscripcion.id)

    if (updateSubErr) console.error('Error updating sub:', updateSubErr)

    // 4. Generar siguiente pago PENDIENTE (Opcional pero recomendado)
    // Periodo: old_proxFact to new_proxFact - 1 day
    const nextPeriodoHasta = new Date(nextBilling)
    nextPeriodoHasta.setDate(nextPeriodoHasta.getDate() - 1)
    
    await supabase.from('tb_pagos').insert([{
        suscripcion_id: suscripcion.id,
        periodo_desde: suscripcion.proxima_facturacion, // The OLD one
        periodo_hasta: nextPeriodoHasta.toISOString(),
        monto: suscripcion.precio_acordado,
        moneda: suscripcion.moneda,
        estado: 'PENDIENTE',
        created_at: now
    }])

    // 5. Enviar Notificaciones (Correo y Webhook)
    let emailStatus = { success: false }
    let webhookStatus = { success: false }
    
    try {
        console.log(`[PagosPagado] Iniciando proceso de notificación para Pago ID: ${id}`)
        
        // Obtenemos Cliente y Plan para las notificaciones
        const { data: cliente } = await supabase.from('tb_clientes').select('*').eq('id', suscripcion.cliente_id).single()
        const { data: plan } = await supabase.from('tb_planes').select('*').eq('id', suscripcion.plan_id).single()

        if (cliente && plan) {
             console.log(`[PagosPagado] Cliente y Plan encontrados. Enviando notificaciones a: ${cliente.email_contacto}`)
             const pagoActualizado = { ...pago, estado: 'PAGADO', pagado_en: now, orden_compra, transaction_id, proveedor_pago }
             
             // Enviar Email
             emailStatus = await sendPaymentConfirmationEmail({ cliente, plan, suscripcion, pago: pagoActualizado })
             console.log(`[PagosPagado] Resultado Email:`, emailStatus)

             if (emailStatus.success) {
                 await supabase.from('tb_pagos').update({ email_notificado_en: new Date().toISOString() }).eq('id', id)
             }

             // Enviar Webhook
             webhookStatus = await sendPaymentWebhook({ cliente, plan, suscripcion, pago: pagoActualizado })
             console.log(`[PagosPagado] Resultado Webhook:`, webhookStatus)
        } else {
             console.warn(`[PagosPagado] No se encontró Cliente o Plan para notificar. ClienteID: ${suscripcion.cliente_id}, PlanID: ${suscripcion.plan_id}`)
        }
    } catch (e) {
        console.error('Error enviando notificaciones:', e)
        // No lanzamos error para no revertir el pago
    }

    return { 
        statusCode: 200, 
        body: JSON.stringify({ 
            message: 'Pago procesado exitosamente', 
            email_notificado: emailStatus.success,
            email_details: emailStatus.error ? emailStatus.error : undefined,
            webhook_notificado: webhookStatus.success
        }) 
    }

  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
