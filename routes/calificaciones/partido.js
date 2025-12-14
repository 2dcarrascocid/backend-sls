import { supabase } from '../../services/db.js';
import { withAuth } from '../../utils/withAuth.js';
import { withJsonResponse } from '../../utils/withJsonResponse.js';

/**
 * @swagger
 * /partidos/mis-calificados:
 *   get:
 *     summary: Obtener calificaciones de un partido
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: partido_id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del partido (UUID)
 *       - in: query
 *         name: jugador_id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del jugador (UUID) que consulta
 *     responses:
 *       200:
 *         description: Detalle de calificaciones por jugador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jugadores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_jugador:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       promedio_calificaciones:
 *                         type: number
 *                         format: float
 *                       calificaciones:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id_calificacion:
 *                               type: string
 *                             calificacion:
 *                               type: number
 *                             id_usuario:
 *                               type: string
 */
export const handlerLocal = async (event) => {
    try {
        const { partido_id, jugador_id } = event.queryStringParameters || {};

        if (!partido_id || !jugador_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Falta el parámetro partido_id o jugador_id' }),
            };
        }

        const userId = jugador_id;

        // 1. Obtener jugadores del partido (desde asistencias)
        const { data: asistencias, error: asistenciasError } = await supabase
            .from('asistencias')
            .select(`
        jugadores (
          id,
          nombre,
          apellidos,
          avatar_url
        )
      `)
            .eq('partido_id', partido_id);

        if (asistenciasError) {
            console.error('Error al consultar asistencias:', asistenciasError);
            throw asistenciasError;
        }

        // Filtrar asistencias sin jugador (si las hay)
        const jugadoresList = asistencias
            .map((a) => a.jugadores)
            .filter((j) => j);

        // 2. Obtener todas las calificaciones del partido
        const { data: calificacionesData, error: calificacionesError } = await supabase
            .from('calificacion')
            .select('*')
            .eq('partido_id', partido_id);

        if (calificacionesError) {
            console.error('Error al consultar calificaciones:', calificacionesError);
            throw calificacionesError;
        }

        // 3. Procesar datos
        const jugadoresResultado = jugadoresList.map((jugador) => {
            // Filtrar calificaciones para este jugador
            const ratingsJugador = calificacionesData.filter((c) => c.jugador_id === jugador.id);

            // Calcular promedio
            const totalPuntos = ratingsJugador.reduce((sum, c) => sum + c.calificacion, 0);
            const promedio = ratingsJugador.length > 0 ? totalPuntos / ratingsJugador.length : 0;

            // Filtrar calificaciones realizadas por el usuario indicado (jugador_id)
            const misCalificaciones = ratingsJugador
                .filter((c) => c.calificador_id === userId)
                .map((c) => ({
                    id_calificacion: c.id,
                    calificacion: c.calificacion,
                    id_usuario: c.calificador_id,
                }));

            return {
                id_jugador: jugador.id,
                nombre: jugador.nombre,
                promedio_calificaciones: Number(promedio.toFixed(2)),
                calificaciones: misCalificaciones,
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ jugadores: jugadoresResultado }),
        };
    } catch (error) {
        console.error('Error en mis-calificados:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor' }),
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
