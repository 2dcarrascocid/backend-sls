import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'

/**
 * @swagger
 * /partidos:
 *   post:
 *     summary: Crea un nuevo partido
 *     description: Crea un partido en la base de datos Supabase y devuelve el registro recién creado.
 *     tags:
 *       - Partidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - owner_id
 *               - nombre
 *               - fecha
 *             properties:
 *               owner_id:
 *                 type: string
 *                 format: uuid
 *                 example: "b2d5d19c-4a18-4a64-bd1a-4b9e1fd7f9ef"
 *                 description: ID del usuario creador del partido
 *               nombre:
 *                 type: string
 *                 example: "Partido amistoso en Ñuñoa"
 *                 description: Nombre del partido
 *               fecha:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-15T18:00:00Z"
 *                 description: Fecha y hora del partido
 *               lat:
 *                 type: number
 *                 format: float
 *                 example: -33.45694
 *                 description: Latitud del partido
 *               lng:
 *                 type: number
 *                 format: float
 *                 example: -70.64827
 *                 description: Longitud del partido
 *     responses:
 *       201:
 *         description: Partido creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partido:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     owner_id:
 *                       type: string
 *                       format: uuid
 *                     nombre:
 *                       type: string
 *                     fecha:
 *                       type: string
 *                       format: date-time
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *       400:
 *         description: Faltan campos requeridos
 *       500:
 *         description: Error al crear el partido
 */





export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { owner_id, nombre, fecha, lat, lng } = body

    // 🔍 Validación
    if (!owner_id || !nombre || !fecha) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Campos requeridos: owner_id, nombre, fecha'
        })
      }
    }

    // ⚙️ Modo MOCK
    if (process.env.USE_DB_MOCK === 'true') {
      const mockPartido = {
        id: 'mock-id-123',
        owner_id,
        nombre,
        fecha,
        created_at: new Date().toISOString(),
        lat: lat || -33.45,
        lng: lng || -70.66
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

    // ✅ Retornar el partido recién creado
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

