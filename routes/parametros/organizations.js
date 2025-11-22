import { supraLiga } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /parametros/organizations:
 *   post:
 *     summary: Crea una nueva organización
 *     tags: [Parametros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               website: { type: string }
 *     responses:
 *       201: { description: Organización creada }
 *       500: { description: Error interno }
 */
const createHandlerInternal = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}')
        const { name, slug, website } = body

        if (!name || !slug) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Campos requeridos: name, slug' }) }
        }

        const { data, error } = await supraLiga
            .from('organizations')
            .insert([{ name, slug, website }])
            .select()
            .single()

        if (error) throw error

        return { statusCode: 201, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error creating organization:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

/**
 * @swagger
 * /parametros/organizations:
 *   get:
 *     summary: Obtiene todas las organizaciones
 *     tags: [Parametros]
 *     responses:
 *       200: { description: Lista de organizaciones }
 *       500: { description: Error interno }
 */
const getHandlerInternal = async (event) => {
    try {
        const { data, error } = await supraLiga
            .from('organizations')
            .select('*')

        if (error) throw error

        return { statusCode: 200, body: JSON.stringify(data) }
    } catch (error) {
        console.error('Error getting organizations:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
}

export const handler = withAuth(withJsonResponse(createHandlerInternal))
export const getHandler = withAuth(withJsonResponse(getHandlerInternal))
