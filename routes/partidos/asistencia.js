import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'
/**
 * @swagger
 * /partidos/asistencia:
 *   get:
 *     summary: Lista jugadores que asisten a un partido
 *     description: Devuelve todos los jugadores registrados como asistentes en un partido.
 *     tags:
 *       - Partido Jugador
 *     parameters:
 *       - in: query
 *         name: partido_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del partido para listar asistentes
 *     responses:
 *       200:
 *         description: Lista de jugadores asistentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 asistentes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       partido_id:
 *                         type: string
 *                         format: uuid
 *                       jugador_id:
 *                         type: string
 *                         format: uuid
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Falta el parámetro partido_id
 *       500:
 *         description: Error al obtener asistentes
 *
 *   post:
 *     summary: Confirma asistencia de un jugador
 *     description: Inserta un registro en partido_jugador para confirmar asistencia al partido.
 *     tags:
 *       - Partido Jugador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partido_id
 *               - jugador_id
 *             properties:
 *               partido_id:
 *                 type: string
 *                 format: uuid
 *                 example: "22eec19e-ecde-4a60-97a1-5344e8cc0e5d"
 *               jugador_id:
 *                 type: string
 *                 format: uuid
 *                 example: "b2d5d19c-4a18-4a64-bd1a-4b9e1fd7f9ef"
 *     responses:
 *       201:
 *         description: Asistencia registrada correctamente
 *       409:
 *         description: El jugador ya estaba registrado en este partido
 *       500:
 *         description: Error al registrar asistencia
 *
 *   delete:
 *     summary: Elimina la asistencia de un jugador
 *     description: Elimina el registro de asistencia (jugador deja de asistir al partido).
 *     tags:
 *       - Partido Jugador
 *     parameters:
 *       - in: query
 *         name: partido_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del partido
 *       - in: query
 *         name: jugador_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del jugador
 *     responses:
 *       200:
 *         description: Asistencia eliminada correctamente
 *       404:
 *         description: No se encontró la asistencia a eliminar
 *       500:
 *         description: Error al eliminar la asistencia
 */

export const handlerLocal = async (event) => {
  try {
    const method = event.requestContext.http.method
    const query = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : {}

    if (process.env.USE_DB_MOCK === 'true') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          mock: true,
          message: 'Modo MOCK activo',
          input: { method, query, body }
        })
      }
    }

    // 🟢 GET - Listar asistentes por partido
    if (method === 'GET') {
      const { partido_id } = query
      if (!partido_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Debe indicar partido_id' })
        }
      }

      const { data, error } = await supabase
        .from('partido_jugador')
        .select('*')
        .eq('partido_id', partido_id)

      if (error) throw error

      return {
        statusCode: 200,
        body: JSON.stringify({ asistentes: data })
      }
    }

    // 🟢 POST - Confirmar asistencia
    if (method === 'POST') {
      const { partido_id, jugador_id } = body
      if (!partido_id || !jugador_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Campos requeridos: partido_id, jugador_id' })
        }
      }

      // Verificar si ya existe
      const { data: existente } = await supabase
        .from('partido_jugador')
        .select('*')
        .eq('partido_id', partido_id)
        .eq('jugador_id', jugador_id)
        .maybeSingle()

      if (existente) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'El jugador ya está registrado en este partido' })
        }
      }

      const { data, error } = await supabase
        .from('partido_jugador')
        .insert([
          {
            partido_id,
            jugador_id,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 201,
        body: JSON.stringify({ asistencia: data })
      }
    }

    // 🟢 DELETE - Eliminar asistencia
    if (method === 'DELETE') {
      const { partido_id, jugador_id } = query
      if (!partido_id || !jugador_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Debe indicar partido_id y jugador_id' })
        }
      }

      const { data, error } = await supabase
        .from('partido_jugador')
        .delete()
        .eq('partido_id', partido_id)
        .eq('jugador_id', jugador_id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'No se encontró la asistencia a eliminar' })
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ eliminado: true, registro: data[0] })
      }
    }

    // 🚫 Método no permitido
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    }
  } catch (error) {
    console.error('Error en asistencia:', error)
    return {
      statusCode: 500,
      // body: JSON.stringify({ error: 'Error interno del servidor' })
      body: JSON.stringify({ error}),
    }
  }
}

export const handler = withAuth(handlerLocal)
