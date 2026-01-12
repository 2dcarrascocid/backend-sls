import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/clientes/{id}:
 *   patch:
 *     summary: Actualizar cliente
 *     tags: [TenderBot Clientes]
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

    const { data, error } = await supabase
      .from('tb_clientes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ cliente: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
