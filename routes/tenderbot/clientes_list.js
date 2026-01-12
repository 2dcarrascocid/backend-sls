import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/clientes:
 *   get:
 *     summary: Listar clientes
 *     tags: [TenderBot Clientes]
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
    const { data, error } = await supabase
      .from('tb_clientes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ clientes: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
