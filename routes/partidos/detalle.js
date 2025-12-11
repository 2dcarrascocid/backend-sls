import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from "../../utils/withJsonResponse.js";

/**
 * @swagger
 * /partidos/detalle:
 *   get:
 *     summary: Obtiene el detalle de jugadores de un partido
 *     description: Retorna la lista de jugadores que asisten a un partido con su estado y detalles del perfil.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: partido_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID del partido
 *     responses:
 *       200:
 *         description: Lista de jugadores con detalle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 creador:
 *                   type: object
 *                   properties:
 *                     owner_id:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                 jugadores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       apellido:
 *                         type: string
 *                       posicion:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                       estado:
 *                         type: string
 *                       pago:
 *                         type: boolean
 *       400:
 *         description: Falta partido_id
 *       500:
 *         description: Error al obtener detalle
 */
export const handlerLocal = async (event) => {
    try {
        const query = event.queryStringParameters || {};
        const { partido_id } = query;

        if (!partido_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Falta el parámetro partido_id' })
            };
        }

        // 1. Obtener datos del partido y del creador
        const { data: partidoData, error: partidoError } = await supabase
            .from('partidos')
            .select(`
                owner_id,
                jugadores!partidos_owner_id_fkey (
                    nombre,
                    apellidos
                )
            `)
            .eq('id', partido_id)
            .single();

        if (partidoError) {
            console.error('Error al obtener datos del partido:', partidoError);
            // No retornamos error fatal si falla esto, pero es ideal manejarlo.
            // Si el partido no existe, sí debería ser error.
        }

        const creador = {
            owner_id: partidoData?.owner_id,
            nombre: partidoData?.jugadores?.nombre,
            apellidos: partidoData?.jugadores?.apellidos
        };

        // 2. Obtener jugadores asistentes
        // 🚀 Consulta a Supabase emulando el JOIN
        // SELECT j.id, j.nombre, j.apellido, j.posicion, j.avatar_url, a.estado
        // FROM asistencias a JOIN jugadores j ON j.id = a.jugador_id
        const { data, error } = await supabase
            .from('asistencias')
            .select(`
                estado,
                pago,
                jugadores (
                    id,
                    nombre,
                    apellidos,
                    posicion,
                    avatar_url
                )
            `)
            .eq('partido_id', partido_id);

        if (error) {
            console.error('Error al obtener detalle del partido:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al obtener detalle del partido' })
            };
        }

        // Aplanar la respuesta para que coincida con el formato solicitado
        const jugadores = data.map(item => ({
            id: item.jugadores?.id,
            nombre: item.jugadores?.nombre,
            apellidos: item.jugadores?.apellidos,
            posicion: item.jugadores?.posicion,
            avatar_url: item.jugadores?.avatar_url,
            estado: item.estado,
            pago: item.pago
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                creador,
                jugadores
            })
        };

    } catch (error) {
        console.error('Error en detallePartido:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error }),
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
