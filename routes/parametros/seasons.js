import { supraLiga } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /parametros/seasons:
 *   post:
 *     summary: Crea una nueva temporada
 *     tags: [Parametros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organization_id, name, start_date, end_date]
 *             properties:
 *               organization_id: { type: string, format: uuid }
 *               name: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *     responses:
 *       201: { description: Temporada creada }
 *       500: { description: Error interno }
 */
const createHandlerInternal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}')
        const { organization_id, name, start_date, end_date } = body

        if (!organization_id || !name || !start_date || !end_date) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Campos requeridos: organization_id, name, start_date, end_date' }) }
        }

        const { data, error } = await supraLiga
            .from('seasons')
            .insert([{ organization_id, name, start_date, end_date }])
            .select()
            .single()

        if (error) throw error

        return { statusCode: 201, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error creating season:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

/**
 * @swagger
 * /parametros/seasons:
 *   get:
 *     summary: Obtiene todas las temporadas
 *     tags: [Parametros]
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por organización
 *     responses:
 *       200: { description: Lista de temporadas }
 *       500: { description: Error interno }
 */
const getHandlerInternal = async (event) => {
    try {
        const organization_id = event.queryStringParameters?.organization_id

        let query = supraLiga.from('seasons').select('*')

        if (organization_id) {
            query = query.eq('organization_id', organization_id)
        }

        const { data, error } = await query

        if (error) throw error

        return { statusCode: 200, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error getting seasons:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

export const handler = withAuth(withJsonResponse(createHandlerInternal))
export const getHandler = withAuth(withJsonResponse(getHandlerInternal))
