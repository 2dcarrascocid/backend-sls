import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import crypto from "crypto"

/**
 * @swagger
 * /partidos:
 *   put:
 *     summary: Actualiza un partido existente
 *     tags:
 *       - Partidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               nombre:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date-time
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               actividad:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partido actualizado exitosamente
 *       400:
 *         description: ID inválido o faltante
 *       404:
 *         description: Partido no encontrado
 *       500:
 *         description: Error interno del servidor
 */

export const handlerLocal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}')
        const { id, nombre, fecha, lat, lng, actividad } = body

        // 🔍 Validación
        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Se requiere el ID del partido para actualizar'
                })
            }
        }

        // Validar formato UUID
        if (!crypto.randomUUID || !/^[0-9a-fA-F-]{36}$/.test(id)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'ID no es un UUID válido' })
            }
        }

        // Preparar objeto de actualización dinámico
        const updateData = {}
        if (nombre !== undefined) updateData.nombre = nombre
        if (fecha !== undefined) updateData.fecha = fecha
        if (lat !== undefined) updateData.lat = lat
        if (lng !== undefined) updateData.lng = lng
        if (actividad !== undefined) updateData.actividad = actividad

        // Si no hay nada que actualizar
        if (Object.keys(updateData).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No se enviaron campos para actualizar' })
            }
        }

        // ⚙️ MODO MOCK
        if (process.env.USE_DB_MOCK === 'true') {
            const mockResult = {
                id,
                ...updateData,
                updated_at: new Date().toISOString()
            }
            return {
                statusCode: 200,
                body: JSON.stringify({ partido: mockResult })
            }
        }

        // 🚀 Update en Supabase
        const { data, error } = await supabase
            .from('partidos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error al actualizar en Supabase:', error)
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al actualizar el partido' })
            }
        }

        if (!data) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Partido no encontrado' })
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ partido: data })
        }

    } catch (error) {
        console.error('Error en updatePartido:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        }
    }
}

export const handler = withAuth(withJsonResponse(handlerLocal));
