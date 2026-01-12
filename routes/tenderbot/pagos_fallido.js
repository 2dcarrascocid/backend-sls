import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/pagos/{id}/marcar-fallido:
 *   post:
 *     summary: Marcar pago como FALLIDO
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
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    const { error } = await supabase
      .from('tb_pagos')
      .update({ estado: 'FALLIDO' })
      .eq('id', id)
    
    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ message: 'Pago marcado como fallido' }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
