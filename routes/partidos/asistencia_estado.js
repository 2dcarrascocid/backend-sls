import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
/**
 * @swagger
 * /partidos/asistencia-estado:
 *   get:
 *     summary: Lista las asistencias de un partido
 *     description: Devuelve todos los registros de asistencia con su estado para un partido.
 *     tags:
 *       - Asistencia
 *     parameters:
 *       - in: query
 *         name: partido_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del partido
 *     responses:
 *       200:
 *         description: Lista de asistencias del partido
 *       400:
 *         description: Falta partido_id
 *       500:
 *         description: Error interno del servidor
 *
 *   post:
 *     summary: Registra o actualiza el estado de asistencia de un jugador
 *     description: Crea o actualiza un registro de asistencia según el jugador y partido indicados.
 *     tags:
 *       - Asistencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partido_id
 *               - jugador_id
 *               - estado
 *             properties:
 *               partido_id:
 *                 type: string
 *                 format: uuid
 *               jugador_id:
 *                 type: string
 *                 format: uuid
 *               estado:
 *                 type: string
 *                 enum: [confirmed, maybe, no]
 *     responses:
 *       201:
 *         description: Asistencia creada o actualizada
 *       500:
 *         description: Error al guardar la asistencia
 *
 *   delete:
 *     summary: Elimina el registro de asistencia de un jugador
 *     description: El jugador puede eliminar su registro de asistencia del partido.
 *     tags:
 *       - Asistencia
 *     parameters:
 *       - in: query
 *         name: partido_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *       - in: query
 *         name: jugador_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Asistencia eliminada
 *       404:
 *         description: No se encontró el registro
 *       500:
 *         description: Error interno del servidor
 */

export const handlerLocal = async (event) => {
  try {
    const method = event.requestContext.http.method
    const query = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : {}

    // Modo mock
    if (process.env.USE_DB_MOCK === 'true') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          mock: true,
          method,
          input: { query, body }
        })
      }
    }

    // 🟢 GET: Listar asistencias de un partido
    if (method === 'GET') {
      const { partido_id } = query
      if (!partido_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Debe indicar partido_id' })
        }
      }

      const { data, error } = await supabase
        .from('asistencias')
        .select('*')
        .eq('partido_id', partido_id)

      if (error) throw error

      return {
        statusCode: 200,
        body: JSON.stringify({ asistencias: data })
      }
    }

    // 🟢 POST: Crear o actualizar estado de asistencia
    if (method === 'POST') {
      const { partido_id, jugador_id, estado } = body

      if (!partido_id || !jugador_id || !estado) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Campos requeridos: partido_id, jugador_id, estado'
          })
        }
      }

      // Verificar si ya existe
      const { data: existente } = await supabase
        .from('asistencias')
        .select('*')
        .eq('partido_id', partido_id)
        .eq('jugador_id', jugador_id)
        .maybeSingle()

      let result

      if (existente) {
        // Actualizar estado existente
        const { data, error } = await supabase
          .from('asistencias')
          .update({
            estado,
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Crear nuevo registro
        const { data, error } = await supabase
          .from('asistencias')
          .insert([
            {
              partido_id,
              jugador_id,
              estado,
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (error) throw error
        result = data
      }

      return {
        statusCode: 201,
        body: JSON.stringify({ asistencia: result })
      }
    }

    // 🟢 DELETE: Eliminar registro de asistencia
    if (method === 'DELETE') {
      const { partido_id, jugador_id } = query

      if (!partido_id || !jugador_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Debe indicar partido_id y jugador_id' })
        }
      }

      const { data, error } = await supabase
        .from('asistencias')
        .delete()
        .eq('partido_id', partido_id)
        .eq('jugador_id', jugador_id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Registro de asistencia no encontrado' })
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ eliminado: true, registro: data[0] })
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    }
  } catch (error) {
    console.error('Error en asistencia_estado:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error  })
    }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal));
