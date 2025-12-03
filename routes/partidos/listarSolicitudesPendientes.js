import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { encodeNext, decodeNext } from '../../utils/pagination.js'

/**
 * @swagger
 * /partidos/solicitudes/pendientes:
 *   get:
 *     summary: Listar solicitudes de ingreso pendientes
 *     description: Retorna las solicitudes pendientes para los partidos de un dueño específico con paginación.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: owner_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del dueño de los partidos
 *       - in: query
 *         name: next
 *         required: false
 *         schema:
 *           type: string
 *         description: Token de paginación encriptado
 *     responses:
 *       200:
 *         description: Lista de solicitudes pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 solicitudes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total_solicitudes:
 *                   type: integer
 *                   description: Total de solicitudes pendientes encontradas
 *                 next:
 *                   type: string
 *                   description: Token de paginación para siguiente página
 *       400:
 *         description: Faltan parámetros
 *       500:
 *         description: Error del servidor
 */

export const handlerLocal = async (event) => {
    try {
        const query = event.queryStringParameters || {};
        const { owner_id } = query;

        if (!owner_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Se requiere owner_id'
                })
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

        // 🔍 Modo MOCK
        if (process.env.USE_DB_MOCK === 'true') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    solicitudes: [
                        {
                            solicitud_id: 'mock-sol-1',
                            jugador_id: 'mock-jugador-1',
                            jugador_nombre: 'Jugador Mock 1',
                            partido_id: 'mock-partido-1',
                            partido_nombre: 'Partido Mock 1',
                            owner_id: owner_id,
                            estado: 'pendiente',
                            fecha_solicitud: new Date().toISOString()
                        }
                    ],
                    total_solicitudes: 1,
                    next: null
                })
            };
        }

        // Consulta a Supabase con Joins
        // Usamos !inner en partidos para filtrar por owner_id (INNER JOIN)
        const { data, error, count } = await supabase
            .from('solicitudes_ingreso_partido')
            .select(`
        id,
        jugador_id,
        partido_id,
        estado,
        fecha_solicitud,
        jugadores ( nombre ),
        partidos!inner ( nombre, owner_id )
      `, { count: 'exact' })
            .eq('estado', 'pendiente')
            .eq('partidos.owner_id', owner_id)
            .order('fecha_solicitud', { ascending: false })
            .range(offset, offset + limit);

        if (error) {
            console.error('Error al listar solicitudes:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al obtener solicitudes' })
            };
        }

        // Formatear respuesta para que sea plana
        const responseData = data.map(item => ({
            solicitud_id: item.id,
            jugador_id: item.jugador_id,
            jugador_nombre: item.jugadores?.nombre,
            partido_id: item.partido_id,
            partido_nombre: item.partidos?.nombre,
            owner_id: item.partidos?.owner_id,
            estado: item.estado,
            fecha_solicitud: item.fecha_solicitud
        }));

        // calcular next (si hay más datos)
        let nextToken = null;
        if (data.length === limit + 1) {
            responseData.pop(); // eliminar el elemento extra
            nextToken = encodeNext(offset + limit, limit);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                solicitudes: responseData,
                total_solicitudes: count,
                next: nextToken
            })
        };

    } catch (error) {
        console.error('Error en listarSolicitudesPendientes:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
