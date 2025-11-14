import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'
import crypto from "crypto" // solo por si quieres validar el uuid

/**
 * @swagger
 * /partidos:
 *   post:
 *     summary: Crea un nuevo partido
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
 *               - owner_id
 *               - nombre
 *               - fecha
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 example: "4e3c59ae-0a4d-4b75-93a9-eaa2b8948df7"
 *                 description: ID único del partido enviado por el cliente
 *               owner_id:
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
 */

export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { id, owner_id, nombre, fecha, lat, lng } = body

    // 🔍 Validación
    if (!id || !owner_id || !nombre || !fecha) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Campos requeridos: id, owner_id, nombre, fecha'
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

    // ⚙️ MODO MOCK
    if (process.env.USE_DB_MOCK === 'true') {
      const mockPartido = {
        id,
        owner_id,
        nombre,
        fecha,
        created_at: new Date().toISOString(),
        lat: lat || null,
        lng: lng || null
      }

      return {
        statusCode: 201,
        body: JSON.stringify({ partido: mockPartido })
      }
    }

    // 🚀 Inserción real en Supabase
    const { data, error } = await supabase
      .from('partidos')
      .insert([
        {
          id,
          owner_id,
          nombre,
          fecha,
          created_at: new Date().toISOString(),
          lat,
          lng
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error al insertar en Supabase:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al crear el partido' })
      }
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ partido: data })
    }

  } catch (error) {
    console.error('Error en createPartido:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    }
  }
}

export const handler = withAuth(handlerLocal)
