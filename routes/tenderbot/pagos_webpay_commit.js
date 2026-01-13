import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { WebpayService } from '../../services/transbankService.js'

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

    return { statusCode: 200, body: JSON.stringify({ message: 'Pago exitoso', payment: response }) }

  } catch (error) {
    console.error('Webpay Commit Error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno al procesar pago' }) }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
