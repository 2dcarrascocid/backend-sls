import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from "../../utils/withJsonResponse.js";
import { encodeNext, decodeNext } from "../../utils/pagination.js";

/**
 * @swagger
 * /api/partidos/{id}:
 *   get:
 *     summary: Obtiene detalle de un partido
 *     tags:
 *       - Partidos
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Información del partido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 participantes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_usuario:
 *                         type: integer
 *                       nombre:
 *                         type: string
 */

export const handlerLocal = async (event) => {
    try {
        const { id } = event.pathParameters

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Falta el parámetro id' }),
            }
        }

        // Si USE_DB_MOCK está activado, devolver datos simulados
        if (process.env.USE_DB_MOCK === 'true') {
            const mockPartido = {
                id: parseInt(id),
                owner_id: 1,
                nombre: 'Partido de prueba (mock)',
                fecha: '2025-11-15T18:00:00Z',
                created_at: '2025-11-10T10:00:00Z',
                lat: 40.416775,
                lng: -3.70379,
                participantes: [
                    { id_usuario: 1, nombre: 'Jugador 1' },
                    { id_usuario: 2, nombre: 'Jugador 2' },
                ],
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ partido: mockPartido }),
            }
        }

        // 🚀 Consulta real a Supabase
        const { data: partido, error } = await supabase
            .from('partidos')
            .select(`
        id,
        owner_id,
        nombre,
        fecha,
        created_at,
        lat,
        lng,
        actividad
      `)
            .eq('id', id)
            .single()  // devuelve un solo registro

        if (error) {
            console.error('Error al consultar Supabase:', error)
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al consultar la base de datos' }),
            }
        }

        if (!partido) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Partido no encontrado' }),
            }
        }

        // Obtener jugadores que asisten al partido
        const { data: asistencias, error: asistenciasError } = await supabase
            .from('asistencias')
            .select(`
                estado,
                jugadores (
                    id,
                    nombre,
                    apellidos,
                    posicion,
                    avatar_url
                )
            `)
            .eq('partido_id', id);

        if (asistenciasError) {
            console.error('Error al consultar asistencias:', asistenciasError)
            // No fallamos todo el request si fallan los participantes, pero logueamos
        }

        // Mapear a la estructura requerida (similar a detalle.js)
        const participantes = asistencias ? asistencias.map(a => ({
            id_usuario: a.jugadores?.id,
            nombre: a.jugadores?.nombre,
            apellidos: a.jugadores?.apellidos,
            posicion: a.jugadores?.posicion,
            avatar_url: a.jugadores?.avatar_url,
            estado: a.estado
        })).filter(p => p.id_usuario && p.nombre) : [];

        partido.participantes = participantes;

        return {
            statusCode: 200,
            body: JSON.stringify({ partido }),
        }
    } catch (error) {
        console.error('Error en getById:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor' }),
        }
    }
}

export const handler = withAuth(withJsonResponse(handlerLocal));