import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from "../../utils/withJsonResponse.js";
import { encodeNext, decodeNext } from "../../utils/pagination.js";

/**
 * @swagger
 * /partidos/pasados:
 *   get:
 *     summary: Busca partidos pasados por owner_id
 *     description: Retorna partidos pasados filtrados por propietario.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del propietario
 *       - in: query
 *         name: next
 *         schema:
 *           type: string
 *         description: Token de paginación
 *     responses:
 *       200:
 *         description: Lista de partidos pasados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partidos:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total_partidos:
 *                   type: integer
 *                   description: Total de partidos pasados encontrados
 *                 next:
 *                   type: string
 *       500:
 *         description: Error al buscar partidos
 */

export const handlerLocal = async (event) => {
    try {
        const query = event.queryStringParameters || {};
        const { owner_id } = query;

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

        // Fecha base: siempre usamos la fecha actual del sistema
        // "Pasados" implica < fecha_base
        const fechaBase = new Date().toISOString();

        // 🚀 Consulta a Supabase
        let request = supabase
            .from('partidos')
            .select('*', { count: 'exact' })
            .lt('fecha', fechaBase)
            .order('fecha', { ascending: false }); // Orden descendente para ver los más recientes primero

        if (owner_id) {
            request = request.eq('owner_id', owner_id);
        }

        // paginación
        const { data, error, count } = await request.range(offset, offset + limit);

        if (error) {
            console.error('Error al buscar partidos pasados:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al buscar partidos pasados' })
            };
        }

        // calcular next (si hay más datos)
        let nextToken = null;
        if (data.length === limit + 1) {
            data.pop(); // eliminar extra
            nextToken = encodeNext(offset + limit, limit);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                partidos: data,
                total_partidos: count,
                next: nextToken
            })
        };

    } catch (error) {
        console.error('Error en buscarPartidosPasados:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error }),
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
