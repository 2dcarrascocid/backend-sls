import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/pagos/{id}:
 *   get:
 *     summary: Obtener pago
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del pago
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
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    const { data, error } = await supabase
      .from('tb_pagos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return { statusCode: 404, body: JSON.stringify({ error: 'Pago no encontrado' }) }

    return { statusCode: 200, body: JSON.stringify({ pago: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
