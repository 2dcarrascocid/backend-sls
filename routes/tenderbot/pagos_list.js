import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/pagos:
 *   get:
 *     summary: Listar pagos
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: query
 *         name: suscripcion_id
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
    const { suscripcion_id } = event.queryStringParameters || {}
    let query = supabase
      .from('tb_pagos')
      .select('*')
      .order('created_at', { ascending: false })

    if (suscripcion_id) query = query.eq('suscripcion_id', suscripcion_id)

    const { data, error } = await query
    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ pagos: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
