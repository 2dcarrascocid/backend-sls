import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/suscripciones/{id}:
 *   get:
 *     summary: Obtener suscripción
 *     tags: [TenderBot Suscripciones]
 */
export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters || {}
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    const { data, error } = await supabase
      .from('tb_suscripciones')
      .select(`
        *,
        tb_planes (*),
        tb_clientes (*)
      `)
      .eq('id', id)
      .single()

    if (error) return { statusCode: 404, body: JSON.stringify({ error: 'No encontrada' }) }

    return { statusCode: 200, body: JSON.stringify({ suscripcion: data }) }
  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
