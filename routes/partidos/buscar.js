import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from "../../utils/withJsonResponse.js";
import { encodeNext, decodeNext } from "../../utils/pagination.js";
/**
 * @swagger
 * /partidos/buscar:
 *   get:
 *     summary: Busca partidos dinámicamente
 *     description: Permite filtrar partidos por cualquier campo disponible en la tabla.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra por ID del partido
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra por ID del propietario
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtra por nombre del partido
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtra por fecha del partido
 *     responses:
 *       200:
 *         description: Lista de partidos que cumplen con los filtros
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partidos:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Error al buscar partidos
 */


/**
 * GET /partidos/jugador
 * Respuesta:
 * {
 *   jugador: {},
 *   partidos_pendientes: [],
 *   total_pendientes: 0,
 *   partidos_pasados: [],
 *   total_pasados: 0,
 *   next: "xxxx"
 * }
 */


export const handlerLocal = async (event) => {
  try {
    const query = event.queryStringParameters || {};
    const jugador_id = query.jugador_id;

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

    // 🚀 Consulta dinámica a Supabase
    let request = supabase.from('partidos').select('*');

    console.log("request", request);

    // aplicamos todos los filtros dinámicos
    Object.entries(query).forEach(([key, value]) => {
      if (['limit', 'offset', 'next', 'jugador_id'].includes(key)) return;
      if (value) request = request.eq(key, value);
    });

    // paginación real
    const { data, error } = await request
      .order('fecha', { ascending: true })
      .range(offset, offset + limit);

    if (error) {
      console.error('Error al buscar partidos:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al buscar partidos' })
      };
    }

    // separar partidos pendientes y pasados
    const ahora = new Date().toISOString();
    const partidos_pendientes = data.filter(p => p.fecha >= ahora);
    const partidos_pasados = data.filter(p => p.fecha < ahora);

    // calcular next (si hay más datos)
    let nextToken = null;

    if (data.length === limit + 1) {
      data.pop(); // eliminar extra
      nextToken = encodeNext(offset + limit, limit);
    }

    // traer datos del jugador
    let jugador = null;
    if (jugador_id) {
      const { data: jugadorData } = await supabase
        .from("jugadores")
        .select("id,nombre")
        .eq("id", jugador_id)
        .single();
      jugador = jugadorData;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        jugador,
        partidos_pendientes,
        total_pendientes: partidos_pendientes.length,
        partidos_pasados,
        total_pasados: partidos_pasados.length,
        next: nextToken
      })
    };

  } catch (error) {
    console.error('Error en buscarPartidos:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};

export const handler = withAuth(withJsonResponse(handlerLocal));

