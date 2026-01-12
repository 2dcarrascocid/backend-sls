import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/planes/{id}:
 *   get:
 *     summary: Obtener detalle de un plan
 *     tags:
 *       - TenderBot Planes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API Key para autenticar la solicitud
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del plan
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno del servidor
 */
export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters || {}

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Falta el ID del plan' })
      }
    }

    const { data, error } = await supabase
      .from('tb_planes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
        if (error.code === 'PGRST116') { // JSON result is empty (no rows)
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Plan no encontrado' })
            }
        }
        throw error
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ plan: data })
    }

  } catch (error) {
    console.error('Error en obtenerPlan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
