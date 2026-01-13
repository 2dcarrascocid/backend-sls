import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { WebpayService } from '../../services/transbankService.js'

/**
 * @swagger
 * /tenderbot/pagos/{id}/init-webpay:
 *   post:
 *     summary: Iniciar transacción con Webpay
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *             required: [returnUrl]
 *             properties:
 *               returnUrl: { type: string }
 *     responses:
 *       200:
 *         description: Transacción iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 url: { type: string }
 */
export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters || {}
    const body = JSON.parse(event.body || '{}')
    const { returnUrl } = body

    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID del pago' }) }
    if (!returnUrl) return { statusCode: 400, body: JSON.stringify({ error: 'Falta returnUrl' }) }

    // 1. Obtener Pago
    const { data: pago, error: errPago } = await supabase
        .from('tb_pagos')
        .select('*')
        .eq('id', id)
        .single()
    
    if (errPago || !pago) return { statusCode: 404, body: JSON.stringify({ error: 'Pago no encontrado' }) }
    if (pago.estado === 'PAGADO') return { statusCode: 400, body: JSON.stringify({ error: 'Pago ya está pagado' }) }

    // 2. Generar BuyOrder y SessionId
    // Usamos timestamp para asegurar unicidad y que sea corto (max 26 chars)
    // ID del pago es UUID, muy largo.
    const buyOrder = `P-${Date.now()}` 
    const sessionId = pago.suscripcion_id 
    const amount = pago.monto

    // 3. Iniciar Webpay
    const response = await WebpayService.create(buyOrder, sessionId, amount, returnUrl)

    // 4. Guardar orden_compra en el pago para poder recuperarlo después
    const { error: updateErr } = await supabase.from('tb_pagos').update({
        orden_compra: buyOrder
    }).eq('id', id)

    if (updateErr) throw updateErr

    return { statusCode: 200, body: JSON.stringify(response) }

  } catch (error) {
    console.error('Webpay Init Error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al iniciar transacción con Webpay' }) }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
