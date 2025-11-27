import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /partidos/solicitudes/pendientes:
 *   get:
 *     summary: Listar solicitudes de ingreso pendientes
 *     description: Retorna las solicitudes pendientes para los partidos de un dueño específico.
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
 *     responses:
 *       200:
 *         description: Lista de solicitudes pendientes
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
                    ]
                })
            };
        }

        // Consulta a Supabase con Joins
        // Usamos !inner en partidos para filtrar por owner_id (INNER JOIN)
        const { data, error } = await supabase
            .from('solicitudes_ingreso_partido')
            .select(`
        id,
        jugador_id,
        partido_id,
        estado,
        fecha_solicitud,
        jugadores ( nombre ),
        partidos!inner ( nombre, owner_id )
      `)
            .eq('estado', 'pendiente')
            .eq('partidos.owner_id', owner_id)
            .order('fecha_solicitud', { ascending: false });

        if (error) {
            console.error('Error al listar solicitudes:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al obtener solicitudes' })
            };
        }

        // Formatear respuesta para que sea plana como en la query SQL solicitada
        const formattedData = data.map(item => ({
            solicitud_id: item.id,
            jugador_id: item.jugador_id,
            jugador_nombre: item.jugadores?.nombre || null,
            partido_id: item.partidos?.id, // Nota: id de partido no viene explícito en el select anidado si no se pide, pero está en la solicitud
            // Espera, item.partidos es un objeto. El id del partido está en item.partido_id (columna de la tabla base)
            // Pero item.partidos trae los datos del join.
            partido_nombre: item.partidos?.nombre || null,
            owner_id: item.partidos?.owner_id,
            estado: item.estado,
            fecha_solicitud: item.fecha_solicitud
        }));

        // Corrección: item.partidos no trae el ID a menos que lo pidamos, pero item tiene partido_id.
        // Vamos a asegurarnos de devolver lo que pide el usuario.
        const responseData = data.map(item => ({
            solicitud_id: item.id,
            jugador_id: item.jugador_id,
            jugador_nombre: item.jugadores?.nombre,
            partido_id: item.partido_id, // Supabase devuelve las columnas de la tabla base también si están implícitas o explícitas?
            // Por defecto select('*') trae todo. Aquí seleccionamos columnas específicas.
            // Debemos asegurarnos de pedir partido_id en el select principal si no viene solo.
            // En Supabase 'partido_id' es la FK, debería venir si seleccionamos 'partido_id' o si seleccionamos todo.
            // Voy a ajustar el select para ser explícito.
            partido_nombre: item.partidos?.nombre,
            owner_id: item.partidos?.owner_id,
            estado: item.estado,
            fecha_solicitud: item.fecha_solicitud
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ solicitudes: responseData })
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
