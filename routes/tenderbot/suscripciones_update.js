import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/suscripciones/{id}:
 *   patch:
 *     summary: Actualizar suscripción
 *     tags: [TenderBot Suscripciones]
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
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    const updates = { ...body, updated_at: new Date().toISOString() }
    delete updates.id
    delete updates.cliente_id // No mover suscripción de cliente

    const { data, error } = await supabase
      .from('tb_suscripciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ suscripcion: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
