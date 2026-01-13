import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { WebpayService } from '../../services/transbankService.js'
import { sendPaymentConfirmationEmail } from './services/emailService.js'
import { sendPaymentWebhook } from './services/webhookService.js'

/**
 * @swagger
 * /tenderbot/pagos/webpay-commit:
 *   post:
 *     summary: Confirmar transacción de Webpay
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token_ws]
 *             properties:
 *               token_ws: { type: string }
 *     responses:
 *       200: { description: Pago confirmado }
 *       400: { description: Pago rechazado o error }
 */
export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { token_ws } = body 

    if (!token_ws) return { statusCode: 400, body: JSON.stringify({ error: 'Falta token_ws' }) }

    // 1. Commit Webpay
    let response;
    try {
        response = await WebpayService.commit(token_ws)
    } catch (e) {
        console.error("Error committing transaction:", e)
        return { statusCode: 400, body: JSON.stringify({ error: 'Error al confirmar transacción en Webpay', details: e.message }) }
    }
    
    // 2. Buscar Pago en DB usando buy_order
    const { data: pago, error: errPago } = await supabase
        .from('tb_pagos')
        .select('*, tb_suscripciones(*)')
        .eq('orden_compra', response.buy_order)
        .single()

    if (errPago || !pago) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Pago no encontrado para esta orden', buy_order: response.buy_order }) }
    }

    // 3. Validar estado de la transacción
    if (response.status !== 'AUTHORIZED' || response.response_code !== 0) {
         await supabase.from('tb_pagos').update({
             estado: 'FALLIDO',
             transaction_id: token_ws, // Guardamos token como ref
             proveedor_pago: 'WEBPAY'
         }).eq('id', pago.id)

         return { statusCode: 400, body: JSON.stringify({ error: 'Pago rechazado por Webpay', details: response }) }
    }

    // 4. Actualizar Pago a PAGADO
    const now = new Date().toISOString()
    const suscripcion = pago.tb_suscripciones

    await supabase
        .from('tb_pagos')
        .update({
            estado: 'PAGADO',
            pagado_en: now,
            transaction_id: response.authorization_code,
            proveedor_pago: 'WEBPAY'
        })
        .eq('id', pago.id)

    // 5. Actualizar Suscripción
    let subUpdates = { updated_at: now }
    
    // Reactivar si estaba vencida/pausada
    if (['VENCIDA', 'PAUSADA'].includes(suscripcion.estado)) {
        subUpdates.estado = 'ACTIVA'
    }

    // Avanzar fecha de facturación
    const proxFact = new Date(suscripcion.proxima_facturacion)
    const nextBilling = new Date(proxFact)
    if (suscripcion.periodicidad === 'MENSUAL') {
        nextBilling.setMonth(nextBilling.getMonth() + 1)
    } else {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1)
    }
    subUpdates.proxima_facturacion = nextBilling.toISOString()
    
    await supabase
        .from('tb_suscripciones')
        .update(subUpdates)
        .eq('id', suscripcion.id)

    // 6. Enviar Notificaciones (Correo y Webhook)
    let emailStatus = { success: false }
    let webhookStatus = { success: false }

    try {
        console.log(`[PagosWebpayCommit] Iniciando proceso de notificación para Pago ID: ${pago.id}`)
        
        // Fetch manual para asegurar datos correctos (evitar problemas de join)
        const { data: cliente } = await supabase.from('tb_clientes').select('*').eq('id', suscripcion.cliente_id).single()
        const { data: plan } = await supabase.from('tb_planes').select('*').eq('id', suscripcion.plan_id).single()

        if (cliente && plan) {
             console.log(`[PagosWebpayCommit] Cliente y Plan encontrados. Enviando notificaciones a: ${cliente.email_contacto}`)
             const pagoActualizado = { 
                 ...pago, 
                 estado: 'PAGADO', 
                 pagado_en: now, 
                 transaction_id: response.authorization_code, 
                 proveedor_pago: 'WEBPAY' 
             }
             
             // Enviar Email
             emailStatus = await sendPaymentConfirmationEmail({ cliente, plan, suscripcion, pago: pagoActualizado })
             console.log(`[PagosWebpayCommit] Resultado Email:`, emailStatus)

             if (emailStatus.success) {
                 await supabase.from('tb_pagos').update({ email_notificado_en: new Date().toISOString() }).eq('id', pago.id)
             }

             // Enviar Webhook
             webhookStatus = await sendPaymentWebhook({ cliente, plan, suscripcion, pago: pagoActualizado })
             console.log(`[PagosWebpayCommit] Resultado Webhook:`, webhookStatus)
        } else {
             console.warn(`[PagosWebpayCommit] No se encontró Cliente o Plan para notificar. ClienteID: ${suscripcion.cliente_id}, PlanID: ${suscripcion.plan_id}`)
        }
    } catch (e) {
        console.error('Error enviando notificaciones (Webpay):', e)
    }

    return { 
        statusCode: 200, 
        body: JSON.stringify({ 
            message: 'Pago exitoso', 
            payment: response,
            email_notificado: emailStatus.success,
            webhook_notificado: webhookStatus.success
        }) 
    }

  } catch (error) {
    console.error('Webpay Commit Error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno al procesar pago' }) }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
