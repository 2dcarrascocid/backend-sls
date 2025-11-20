import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'
/**
 * @swagger
 * /partidos/buscar:
 *   get:
 *     summary: Busca partidos dinámicamente
 *     description: Permite filtrar partidos por cualquier campo disponible en la tabla.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra por ID del partido
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra por ID del propietario
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtra por nombre del partido
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtra por fecha del partido
 *     responses:
 *       200:
 *         description: Lista de partidos que cumplen con los filtros
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partidos:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Error al buscar partidos
 */

export const handlerLocal = async (event) => {
  try {
    const query = event.queryStringParameters || {}

    // 🔍 Modo MOCK
    if (process.env.USE_DB_MOCK === 'true') {
      const mockPartidos = [
        {
          id: 'mock-1',
          owner_id: 'mock-owner',
          nombre: 'Partido de prueba',
          fecha: '2025-11-15T18:00:00Z',
          created_at: '2025-11-10T10:00:00Z',
          lat: -33.45,
          lng: -70.66
        }
      ]
      return {
        statusCode: 200,
        body: JSON.stringify({ partidos: mockPartidos })
      }
    }

    // 🚀 Consulta dinámica a Supabase
    let request = supabase.from('partidos').select('*')

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        request = request.eq(key, value)
      }
    })

    const { data, error } = await request.order('fecha', { ascending: true })

    if (error) {
      console.error('Error al buscar partidos:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al buscar partidos' })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ partidos: data })
    }
  } catch (error) {
    console.error('Error en buscarPartidos:', error)
    return {
      statusCode: 500,
      // body: JSON.stringify({ error: 'Error interno del servidor' })
      body: JSON.stringify({ error}),
    }
  }
}

export const handler = withAuth(handlerLocal)


