import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'
/**
 * @swagger
 * /partidos/calificar:
 *   get:
 *     summary: Lista calificaciones de un partido
 *     description: Obtiene todas las calificaciones realizadas en un partido, con posibilidad de filtrar por jugador_id o calificador_id.
 *     tags:
 *       - Calificación
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
 *         description: Filtra por jugador calificado
 *       - in: query
 *         name: calificador_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra por calificador
 *     responses:
 *       200:
 *         description: Lista de calificaciones
 *       400:
 *         description: Falta el parámetro partido_id
 *       500:
 *         description: Error interno del servidor
 *
 *   post:
 *     summary: Registra o actualiza una calificación
 *     description: Crea o actualiza la calificación otorgada por un jugador a otro en un partido.
 *     tags:
 *       - Calificación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partido_id
 *               - jugador_id
 *               - calificador_id
 *               - calificacion
 *             properties:
 *               partido_id:
 *                 type: string
 *                 format: uuid
 *               jugador_id:
 *                 type: string
 *                 format: uuid
 *                 description: Jugador que recibe la calificación
 *               calificador_id:
 *                 type: string
 *                 format: uuid
 *                 description: Jugador que califica
 *               calificacion:
 *                 type: integer
 *                 enum: [1, 2, 3, 4, 5]
 *     responses:
 *       201:
 *         description: Calificación creada o actualizada correctamente
 *       400:
 *         description: Datos incompletos
 *       500:
 *         description: Error al registrar calificación
 *
 *   delete:
 *     summary: Elimina una calificación
 *     description: Permite eliminar la calificación otorgada por un jugador a otro.
 *     tags:
 *       - Calificación
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
 *       - in: query
 *         name: calificador_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Calificación eliminada correctamente
 *       404:
 *         description: No se encontró la calificación
 *       500:
 *         description: Error interno del servidor
 */

export const handlerLocal = async (event) => {
  try {
    const method = event.requestContext.http.method
    const query = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : {}

    // 🧩 MOCK MODE
    if (process.env.USE_DB_MOCK === 'true') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          mock: true,
          input: { method, query, body }
        })
      }
    }

    // 🟢 GET: Listar calificaciones
    if (method === 'GET') {
      const { partido_id, jugador_id, calificador_id } = query

      if (!partido_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Debe indicar partido_id' })
        }
      }

      let request = supabase.from('calificacion').select('*').eq('partido_id', partido_id)

      if (jugador_id) request = request.eq('jugador_id', jugador_id)
      if (calificador_id) request = request.eq('calificador_id', calificador_id)

      const { data, error } = await request.order('updated_at', { ascending: false })

      if (error) throw error

      return {
        statusCode: 200,
        body: JSON.stringify({ calificaciones: data })
      }
    }

    // 🟢 POST: Crear o actualizar calificación
    if (method === 'POST') {
      const { partido_id, jugador_id, calificador_id, calificacion } = body

      if (!partido_id || !jugador_id || !calificador_id || !calificacion) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Campos requeridos: partido_id, jugador_id, calificador_id, calificacion'
          })
        }
      }

      // Validar rango
      if (calificacion < 1 || calificacion > 5) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'La calificación debe estar entre 1 y 5' })
        }
      }

      // Verificar si ya existe una calificación previa
      const { data: existente } = await supabase
        .from('calificacion')
        .select('*')
        .eq('partido_id', partido_id)
        .eq('jugador_id', jugador_id)
        .eq('calificador_id', calificador_id)
        .maybeSingle()

      let result

      if (existente) {
        // Actualizar
        const { data, error } = await supabase
          .from('calificacion')
          .update({
            calificacion,
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Crear
        const { data, error } = await supabase
          .from('calificacion')
          .insert([
            {
              partido_id,
              jugador_id,
              calificador_id,
              calificacion,
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
        body: JSON.stringify({ calificacion: result })
      }
    }

    // 🟢 DELETE: Eliminar calificación
    if (method === 'DELETE') {
      const { partido_id, jugador_id, calificador_id } = query

      if (!partido_id || !jugador_id || !calificador_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Debe indicar partido_id, jugador_id y calificador_id'
          })
        }
      }

      const { data, error } = await supabase
        .from('calificacion')
        .delete()
        .eq('partido_id', partido_id)
        .eq('jugador_id', jugador_id)
        .eq('calificador_id', calificador_id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Calificación no encontrada' })
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
    console.error('Error en calificar:', error)
    return {
      statusCode: 500,
      // body: JSON.stringify({ error: 'Error interno del servidor' })
      body: JSON.stringify({ error}),
    }
  }
}

export const handler = withAuth(handlerLocal)
