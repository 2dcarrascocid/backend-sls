import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { encodeNext, decodeNext } from '../../utils/pagination.js'

/**
 * @swagger
 * /partidos/mis-asistencias-pasadas:
 *   get:
 *     summary: Listar partidos pasados donde el jugador asistió
 *     description: Retorna los partidos pasados a los cuales el jugador asistió basándose en la tabla asistencias.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: jugador_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del jugador
 *       - in: query
 *         name: next
 *         required: false
 *         schema:
 *           type: string
 *         description: Token de paginación encriptado
 *     responses:
 *       200:
 *         description: Lista de partidos pasados confirmados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partidos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *                       tipo:
 *                         type: string
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *                       owner_id:
 *                         type: string
 *                       estado_asistencia:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 total_partidos:
 *                   type: integer
 *                   description: Total de partidos pasados donde asistió
 *                 next:
 *                   type: string
 *                   description: Token de paginación para siguiente página
 *       400:
 *         description: Falta el parámetro jugador_id
 *       500:
 *         description: Error del servidor
 */

export const handlerLocal = async (event) => {
    try {
        const query = event.queryStringParameters || {};
        const { jugador_id } = query;

        if (!jugador_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Se requiere jugador_id'
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

        // Fecha actual para filtrar solo partidos pasados
        const ahora = new Date().toISOString();

        // Consulta desde partidos con JOIN a asistencias
        const { data, error, count } = await supabase
            .from('partidos')
            .select(`
                id,
                nombre,
                fecha,
                tipo,
                lat,
                lng,
                owner_id,
                asistencias!inner (
                    jugador_id,
                    estado,
                    updated_at
                )
            `, { count: 'exact' })
            .eq('asistencias.jugador_id', jugador_id)
            .lt('fecha', ahora)
            .order('fecha', { ascending: false })
            .range(offset, offset + limit);

        if (error) {
            console.error('Error al listar asistencias pasadas:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al obtener partidos pasados' })
            };
        }

        // Formatear respuesta para aplanar la estructura
        const partidosFormateados = data.map(item => ({
            id: item.id,
            nombre: item.nombre,
            fecha: item.fecha,
            tipo: item.tipo,
            lat: item.lat,
            lng: item.lng,
            owner_id: item.owner_id,
            estado_asistencia: item.asistencias[0]?.estado,
            updated_at: item.asistencias[0]?.updated_at
        }));

        // Calcular next token (si hay más datos)
        let nextToken = null;
        if (data.length === limit + 1) {
            partidosFormateados.pop(); // eliminar el elemento extra
            nextToken = encodeNext(offset + limit, limit);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                partidos: partidosFormateados,
                total_partidos: count,
                next: nextToken
            })
        };

    } catch (error) {
        console.error('Error en misAsistenciasPasadas:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
