import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/suscripciones:
 *   get:
 *     summary: Listar suscripciones
 *     tags: [TenderBot Suscripciones]
 *     parameters:
 *       - in: query
 *         name: cliente_id
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
    const { cliente_id } = event.queryStringParameters || {}
    
    let query = supabase
      .from('tb_suscripciones')
      .select(`
        *,
        tb_planes (nombre, codigo),
        tb_clientes (razon_social)
      `)
      .order('created_at', { ascending: false })

    if (cliente_id) {
        query = query.eq('cliente_id', cliente_id)
    }

    const { data, error } = await query
    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ suscripciones: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
