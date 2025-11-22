import { supraLiga } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /parametros/tournaments:
 *   post:
 *     summary: Crea un nuevo torneo
 *     tags: [Parametros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [season_id, name, status, type]
 *             properties:
 *               season_id: { type: string, format: uuid }
 *               name: { type: string }
 *               status: { type: string, enum: [draft, active, finished] }
 *               type: { type: string, enum: [league, cup, groups] }
 *     responses:
 *       201: { description: Torneo creado }
 *       500: { description: Error interno }
 */
const createHandlerInternal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}')
        const { season_id, name, status, type } = body

        if (!season_id || !name || !status || !type) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Campos requeridos: season_id, name, status, type' }) }
        }

        const { data, error } = await supraLiga
            .from('tournaments')
            .insert([{ season_id, name, status, type }])
            .select()
            .single()

        if (error) throw error

        return { statusCode: 201, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error creating tournament:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

/**
 * @swagger
 * /parametros/tournaments:
 *   get:
 *     summary: Obtiene todos los torneos
 *     tags: [Parametros]
 *     parameters:
 *       - in: query
 *         name: season_id
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por temporada
 *     responses:
 *       200: { description: Lista de torneos }
 *       500: { description: Error interno }
 */
const getHandlerInternal = async (event) => {
    try {
        const season_id = event.queryStringParameters?.season_id

        let query = supraLiga.from('tournaments').select('*')

        if (season_id) {
            query = query.eq('season_id', season_id)
        }

        const { data, error } = await query

        if (error) throw error

        return { statusCode: 200, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error getting tournaments:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

export const handler = withAuth(withJsonResponse(createHandlerInternal))
export const getHandler = withAuth(withJsonResponse(getHandlerInternal))
