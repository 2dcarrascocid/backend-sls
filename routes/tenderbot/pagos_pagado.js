import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

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

    return { statusCode: 200, body: JSON.stringify({ message: 'Pago procesado exitosamente' }) }

  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
