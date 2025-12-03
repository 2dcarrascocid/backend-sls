import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from "../../utils/withJsonResponse.js";
import { encodeNext, decodeNext } from "../../utils/pagination.js";

/**
 * @swagger
 * /partidos/buscar:
 *   get:
 *     summary: Busca partidos creados por un jugador
 *     description: Retorna todos los partidos donde el jugador es el owner, divididos en pendientes y pasados.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: jugador_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del jugador (owner de los partidos)
 *       - in: query
 *         name: next
 *         required: false
 *         schema:
 *           type: string
 *         description: Token de paginación encriptado
 *     responses:
 *       200:
 *         description: Partidos del jugador divididos en pendientes y pasados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jugador:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                 partidos_pendientes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total_pendientes:
 *                   type: integer
 *                 partidos_pasados:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total_pasados:
 *                   type: integer
 *                 next:
 *                   type: string
 *       400:
 *         description: Falta el parámetro jugador_id
 *       404:
 *         description: Jugador no encontrado
 *       500:
 *         description: Error al buscar partidos
 */

export const handlerLocal = async (event) => {
  try {
    const query = event.queryStringParameters || {};
    const jugador_id = query.jugador_id;

    if (!jugador_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Se requiere jugador_id' })
      };
    }

    // defaults para paginación
    let limit = 10;
    let offset = 0;

    // si viene next → decodificar
    if (query.next) {
      const decoded = decodeNext(query.next);
      if (decoded) {
        offset = decoded.offset;
        limit = decoded.limit;
      }
    }

    // ========================================
    // 1. Traer datos del jugador
    // ========================================
    const { data: jugadorData, error: jugadorError } = await supabase
      .from("jugadores")
      .select("id, nombre")
      .eq("id", jugador_id)
      .single();

    if (jugadorError || !jugadorData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Jugador no encontrado' })
      };
    }

    // ========================================
    // 2. Buscar partidos pendientes (futuros)
    // ========================================
    const ahora = new Date().toISOString();

    const { data: pendientes, error: errorPendientes, count: totalPendientes } = await supabase
      .from('partidos')
      .select('*', { count: 'exact' })
      .eq('owner_id', jugador_id)
      .gte('fecha', ahora)
      .order('fecha', { ascending: true })
      .range(offset, offset + limit);

    if (errorPendientes) {
      console.error('Error al buscar partidos pendientes:', errorPendientes);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al buscar partidos pendientes' })
      };
    }

    // ========================================
    // 3. Buscar partidos pasados
    // ========================================
    const { data: pasados, error: errorPasados, count: totalPasados } = await supabase
      .from('partidos')
      .select('*', { count: 'exact' })
      .eq('owner_id', jugador_id)
      .lt('fecha', ahora)
      .order('fecha', { ascending: false })
      .range(offset, offset + limit);

    if (errorPasados) {
      console.error('Error al buscar partidos pasados:', errorPasados);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al buscar partidos pasados' })
      };
    }

    // ========================================
    // 4. Calcular next token para paginación
    // ========================================
    let nextToken = null;
    const totalItems = (pendientes?.length || 0) + (pasados?.length || 0);

    if (totalItems === limit + 1) {
      nextToken = encodeNext(offset + limit, limit);
    }

    // ========================================
    // 5. Retornar respuesta con estructura solicitada
    // ========================================
    return {
      statusCode: 200,
      body: JSON.stringify({
        jugador: {
          id: jugadorData.id,
          nombre: jugadorData.nombre
        },
        partidos_pendientes: pendientes || [],
        total_pendientes: totalPendientes || 0,
        partidos_pasados: pasados || [],
        total_pasados: totalPasados || 0,
        next: nextToken
      })
    };

  } catch (error) {
    console.error('Error en buscarPartidos:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
