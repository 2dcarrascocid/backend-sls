import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'

/**
 * @swagger
 * /partidos/jugador:
 *   get:
 *     summary: Obtiene los partidos pasados y pendientes de un jugador
 *     description: >
 *       Retorna los partidos asociados a un jugador, separados en pendientes (futuros) y pasados.
 *       La solicitud requiere autenticación mediante la cabecera **x-api-key**.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: jugador_id
 *         required: true
 *         description: ID del jugador a consultar
 *         schema:
 *           type: string
 *           example: "15"
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Cantidad máxima de registros por listado
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 10
 *       - in: query
 *         name: offset
 *         required: false
 *         description: Cantidad de registros a omitir
 *         schema:
 *           type: integer
 *           default: 0
 *           example: 0
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API Key para autenticar la solicitud
 *         schema:
 *           type: string
 *           example: "TU_API_KEY"
 *     responses:
 *       200:
 *         description: Partidos obtenidos correctamente
 *         content:
 *           application/json:
 *             example:
 *               partidos_pendientes:
 *                 - id: 12
 *                   fecha: "2025-11-20T23:00:00.000Z"
 *                   cancha: "Cancha 3"
 *                   equipo_local: "Tigres"
 *                   equipo_visita: "Leones"
 *               total_pendientes: 1
 *               partidos_pasados:
 *                 - id: 9
 *                   fecha: "2025-10-10T23:00:00.000Z"
 *                   cancha: "Cancha 1"
 *                   equipo_local: "Panteras"
 *                   equipo_visita: "Halcones"
 *               total_pasados: 1
 *       400:
 *         description: Faltan parámetros obligatorios
 *         content:
 *           application/json:
 *             example:
 *               error: "Falta el parámetro jugador_id"
 *       404:
 *         description: Jugador no encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Jugador no encontrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Error interno del servidor"
 */


const getPartidosPorJugador = async (event) => {
  try {
    const { jugador_id, limit = 10, offset = 0 } = event.queryStringParameters || {};

    if (!jugador_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Falta el parámetro jugador_id" }),
      };
    }

    const limitInt = parseInt(limit, 10);
    const offsetInt = parseInt(offset, 10);
    const ahora = new Date().toISOString();

    // 1️⃣ Verificar existencia del jugador
    const { data: jugador, error: jugadorError } = await supabase
      .from("jugadores")
      .select("id, nombre")
      .eq("id", jugador_id)
      .single();

    if (jugadorError || !jugador) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Jugador no encontrado" }),
      };
    }

    // 2️⃣ Obtener IDs de partidos desde la tabla relación
    const { data: relaciones, error: relError } = await supabase
      .from("partido_jugador")
      .select("partido_id")
      .eq("jugador_id", jugador_id);

    if (relError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error buscando relaciones jugador/partido" }),
      };
    }

    // Si no tiene partidos → retornamos vacío
    if (!relaciones || relaciones.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          jugador,
          partidos_pendientes: [],
          total_pendientes: 0,
          partidos_pasados: [],
          total_pasados: 0
        }),
      };
    }

    const ids = relaciones.map(r => r.partido_id);

    // 3️⃣ Obtener partidos pendientes
    const { data: pendientes, error: pendientesError } = await supabase
      .from("partidos")
      .select("*", { count: "exact" })
      .in("id", ids)
      .gte("fecha", ahora)
      .order("fecha", { ascending: true })
      .range(offsetInt, offsetInt + limitInt - 1);

    // 4️⃣ Obtener partidos pasados
    const { data: pasados, error: pasadosError } = await supabase
      .from("partidos")
      .select("*", { count: "exact" })
      .in("id", ids)
      .lt("fecha", ahora)
      .order("fecha", { ascending: false })
      .range(offsetInt, offsetInt + limitInt - 1);

    return {
      statusCode: 200,
      body: JSON.stringify({
        partidos_pendientes: pendientes || [],
        total_pendientes: pendientes?.length || 0,
        partidos_pasados: pasados || [],
        total_pasados: pasados?.length || 0,
      }),
    };

  } catch (error) {
    console.error("❌ Error en getPartidosJugador:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};

export const handler = withAuth(getPartidosPorJugador)
