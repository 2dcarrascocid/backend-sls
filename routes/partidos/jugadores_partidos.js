import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'

/**
 * @swagger
 * /partidos/jugador:
 *   get:
 *     summary: Obtiene todos los partidos de un jugador con paginación
 *     description: Devuelve todos los partidos asociados a un jugador, separados en pendientes y pasados, con límite y offset para paginación.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: jugador_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del jugador a consultar
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Índice de inicio para la paginación
 *     responses:
 *       200:
 *         description: Partidos obtenidos correctamente
 *       400:
 *         description: Falta parámetro jugador_id
 *       404:
 *         description: Jugador no encontrado
 *       500:
 *         description: Error interno del servidor
 */

const getPartidosPorJugador = async (event) => {
  try {
    const { jugador_id, limit = 10, offset = 0 } = event.queryStringParameters || {}

    if (!jugador_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Falta el parámetro jugador_id' }),
      }
    }

    const limitInt = parseInt(limit, 10)
    const offsetInt = parseInt(offset, 10)
    const ahora = new Date().toISOString()

    // 🧑‍🦱 Obtener jugador
    const { data: jugador, error: jugadorError } = await supabase
      .from('jugadores')
      .select('*')
      .eq('id', jugador_id)
      .single()

    if (jugadorError || !jugador) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Jugador no encontrado' }),
      }
    }

    // ⚽ Pendientes
    const { data: pendientes, count: countPendientes } = await supabase
      .from('partidos')
      .select('*, partido_jugador(jugador_id)', { count: 'exact' })
      .eq('partido_jugador.jugador_id', jugador_id)
      .gte('fecha', ahora)
      .order('fecha', { ascending: true })
      .range(offsetInt, offsetInt + limitInt - 1)

    // 🕒 Pasados
    const { data: pasados, count: countPasados } = await supabase
      .from('partidos')
      .select('*, partido_jugador(jugador_id)', { count: 'exact' })
      .eq('partido_jugador.jugador_id', jugador_id)
      .lt('fecha', ahora)
      .order('fecha', { ascending: false })
      .range(offsetInt, offsetInt + limitInt - 1)

    return {
      statusCode: 200,
      body: JSON.stringify({
        jugador,
        partidos_pendientes: pendientes,
        total_pendientes: countPendientes || 0,
        partidos_pasados: pasados,
        total_pasados: countPasados || 0,
      }),
    }
  } catch (error) {
    console.error('Error en getPartidosJugador:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    }
  }
}

// ✅ Export final con autenticación automática
export const handler = withAuth(getPartidosPorJugador)
