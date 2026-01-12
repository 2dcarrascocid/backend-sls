import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import crypto from "crypto"

/**
 * @swagger
 * /tenderbot/pagos:
 *   post:
 *     summary: Crear pago manual
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API Key para autenticar la solicitud
 *         schema:
 *           type: string
 */
export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    // Asumimos creación manual de pago extra o reintento
    const { suscripcion_id, monto, periodo_desde, periodo_hasta } = body

    if (!suscripcion_id || !monto) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Faltan campos' }) }
    }
    
    const { data: sub } = await supabase.from('tb_suscripciones').select('moneda').eq('id', suscripcion_id).single()

    const { data, error } = await supabase.from('tb_pagos').insert([{
        id: crypto.randomUUID(),
        suscripcion_id,
        monto,
        moneda: sub?.moneda || 'CLP',
        periodo_desde,
        periodo_hasta,
        estado: 'PENDIENTE',
        created_at: new Date().toISOString()
    }]).select().single()

    if (error) throw error

    return { statusCode: 201, body: JSON.stringify({ pago: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
