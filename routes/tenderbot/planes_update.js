import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /tenderbot/planes/{id}:
 *   patch:
 *     summary: Actualizar un plan
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               precio_mensual: { type: number }
 *               precio_anual: { type: number }
 *               moneda: { type: string }
 *               activo: { type: boolean }
 *     responses:
 *       200:
 *         description: Plan actualizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno del servidor
 */
export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters || {}
    const body = JSON.parse(event.body || '{}')
    
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }
    }

    // Validar precios si vienen
    if ((body.precio_mensual !== undefined && body.precio_mensual < 0) || 
        (body.precio_anual !== undefined && body.precio_anual < 0)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Precios deben ser >= 0' }) }
    }

    const updates = {
        ...body,
        updated_at: new Date().toISOString()
    }
    // Evitar actualizar ID o codigo si no es deseado, aqui permitimos todo lo que venga en body salvo id
    delete updates.id
    // delete updates.codigo // Opcional: impedir cambio de codigo

    const { data, error } = await supabase
      .from('tb_planes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ plan: data })
    }

  } catch (error) {
    console.error('Error en actualizarPlan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
