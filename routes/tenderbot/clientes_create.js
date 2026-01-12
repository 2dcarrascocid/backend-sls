import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import crypto from "crypto"

/**
 * @swagger
 * /tenderbot/clientes:
 *   post:
 *     summary: Crear cliente
 *     tags: [TenderBot Clientes]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API Key para autenticar la solicitud
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razon_social, nombre_contacto, email_contacto]
 *             properties:
 *               razon_social: { type: string }
 *               rut: { type: string }
 *               nombre_contacto: { type: string }
 *               email_contacto: { type: string }
 *               telefono: { type: string }
 *               pais: { type: string }
 *     responses:
 *       201: { description: Cliente creado }
 *       400: { description: Error validación }
 *       409: { description: Email duplicado }
 */
export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { razon_social, rut, nombre_contacto, email_contacto, telefono, pais } = body

    if (!razon_social || !nombre_contacto || !email_contacto) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan campos requeridos' })
      }
    }

    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('tb_clientes')
      .insert([{
        id,
        razon_social,
        rut,
        nombre_contacto,
        email_contacto,
        telefono,
        pais,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { statusCode: 409, body: JSON.stringify({ error: 'Email o RUT ya registrado' }) }
      }
      throw error
    }

    return { statusCode: 201, body: JSON.stringify({ cliente: data }) }

  } catch (error) {
    console.error('Error createCliente:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
