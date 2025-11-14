import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'

/**
 * @swagger
 * /partidos/jugador:
 *   get:
 *     summary: Obtiene partidos pendientes y pasados de un jugador (paginados)
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: jugador_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
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
