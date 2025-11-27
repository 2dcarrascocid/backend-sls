import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /partidos/unirse:
 *   post:
 *     summary: Solicitar unirse a un partido
 *     description: Crea una solicitud de ingreso a un partido para un jugador.
 *     tags:
 *       - Partidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jugador_id
 *               - partido_id
 *             properties:
 *               jugador_id:
 *                 type: string
 *                 format: uuid
 *               partido_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error del servidor
 */

export const handlerLocal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { jugador_id, partido_id } = body;
        console.log('Received jugador_id:', jugador_id);
        console.log('Received partido_id:', partido_id);

        // Validación básica
        if (!jugador_id || !partido_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Se requieren jugador_id y partido_id'
                })
            };
        }

        // Validar formato UUID (regex simple)
        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
        if (!uuidRegex.test(jugador_id) || !uuidRegex.test(partido_id)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'jugador_id o partido_id no tienen formato UUID válido'
                })
            };
        }

        // 🔍 Modo MOCK
        if (process.env.USE_DB_MOCK === 'true') {
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: 'Solicitud creada (MOCK)',
                    data: {
                        jugador_id,
                        partido_id,
                        estado: 'pendiente',
                        fecha_solicitud: new Date().toISOString()
                    }
                })
            };
        }

        // Insertar en Supabase
        // Nota: estado y fecha_solicitud tienen defaults en BD, pero podemos enviarlos si queremos ser explícitos.
        // Dejaremos que la BD ponga los defaults.
        const { data, error } = await supabase
            .from('solicitudes_ingreso_partido')
            .insert([
                {
                    jugador_id,
                    partido_id
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error al crear solicitud:', error);
            // Manejar error de duplicados si existe constraint unique
            if (error.code === '23505') { // unique_violation
                return {
                    statusCode: 409, // Conflict
                    body: JSON.stringify({ error: 'Ya existe una solicitud para este jugador y partido' })
                };
            }
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al crear la solicitud' })
            };
        }

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Solicitud enviada exitosamente',
                solicitud: data
            })
        };

    } catch (error) {
        console.error('Error en solicitarIngreso:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
