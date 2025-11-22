import { supraLiga } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /parametros/categories:
 *   post:
 *     summary: Crea una nueva categoría
 *     tags: [Parametros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tournament_id, name, gender]
 *             properties:
 *               tournament_id: { type: string, format: uuid }
 *               name: { type: string }
 *               gender: { type: string, enum: [male, female, mixed] }
 *     responses:
 *       201: { description: Categoría creada }
 *       500: { description: Error interno }
 */
const createHandlerInternal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}')
        const { tournament_id, name, gender } = body

        if (!tournament_id || !name || !gender) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Campos requeridos: tournament_id, name, gender' }) }
        }

        const { data, error } = await supraLiga
            .from('categories')
            .insert([{ tournament_id, name, gender }])
            .select()
            .single()

        if (error) throw error

        return { statusCode: 201, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error creating category:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

/**
 * @swagger
 * /parametros/categories:
 *   get:
 *     summary: Obtiene todas las categorías
 *     tags: [Parametros]
 *     parameters:
 *       - in: query
 *         name: tournament_id
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por torneo
 *     responses:
 *       200: { description: Lista de categorías }
 *       500: { description: Error interno }
 */
const getHandlerInternal = async (event) => {
    try {
        const tournament_id = event.queryStringParameters?.tournament_id

        let query = supraLiga.from('categories').select('*')

        if (tournament_id) {
            query = query.eq('tournament_id', tournament_id)
        }

        const { data, error } = await query

        if (error) throw error

        return { statusCode: 200, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error getting categories:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

export const handler = withAuth(withJsonResponse(createHandlerInternal))
export const getHandler = withAuth(withJsonResponse(getHandlerInternal))
