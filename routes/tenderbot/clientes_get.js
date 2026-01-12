import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/clientes/{id}:
 *   get:
 *     summary: Obtener cliente
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
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    const { data, error } = await supabase
      .from('tb_clientes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return { statusCode: 404, body: JSON.stringify({ error: 'Cliente no encontrado' }) }

    return { statusCode: 200, body: JSON.stringify({ cliente: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
