import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /partidos/solicitudes/responder:
 *   put:
 *     summary: Responder a una solicitud de ingreso (Aceptar/Rechazar)
 *     description: Actualiza el estado de una solicitud de ingreso a un partido.
 *     tags:
 *       - Partidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - solicitud_id
 *               - estado
 *             properties:
 *               solicitud_id:
 *                 type: string
 *                 format: uuid
 *               estado:
 *                 type: string
 *                 enum: [aceptado, rechazado]
 *     responses:
 *       200:
 *         description: Solicitud actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error del servidor
 */

export const handlerLocal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { solicitud_id, estado } = body;

        // Validación básica
        if (!solicitud_id || !estado) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Se requieren solicitud_id y estado'
                })
            };
        }

        // Validar estado permitido
        const estadosPermitidos = ['aceptado', 'rechazado'];
        if (!estadosPermitidos.includes(estado)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: `Estado inválido. Valores permitidos: ${estadosPermitidos.join(', ')}`
                })
            };
        }

        // 🔍 Modo MOCK
        if (process.env.USE_DB_MOCK === 'true') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Solicitud ${estado} (MOCK)`,
                    data: {
                        id: solicitud_id,
                        estado: estado,
                        updated_at: new Date().toISOString()
                    }
                })
            };
        }

        // Actualizar en Supabase
        const { data, error } = await supabase
            .from('solicitudes_ingreso_partido')
            .update({ estado: estado, fecha_respuesta: new Date().toISOString() })
            .eq('id', solicitud_id)
            .select()
            .single();

        if (error) {
            console.error('Error al responder solicitud:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al actualizar la solicitud' })
            };
        }

        if (!data) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Solicitud no encontrada' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Solicitud ${estado} exitosamente`,
                solicitud: data
            })
        };

    } catch (error) {
        console.error('Error en responderSolicitud:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
