import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import crypto from "crypto"

/**
 * @swagger
 * /tenderbot/planes:
 *   post:
 *     summary: Crea un nuevo plan
 *     tags:
 *       - TenderBot Planes
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
 *             required:
 *               - codigo
 *               - nombre
 *               - precio_mensual
 *               - precio_anual
 *             properties:
 *               codigo:
 *                 type: string
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               precio_mensual:
 *                 type: number
 *               precio_semestral:
 *                 type: number
 *               precio_anual:
 *                 type: number
 *               moneda:
 *                 type: string
 *               activo:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Plan creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { codigo, nombre, descripcion, precio_mensual, precio_semestral, precio_anual, moneda, activo } = body

    if (!codigo || !nombre || precio_mensual === undefined || precio_anual === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan campos requeridos: codigo, nombre, precio_mensual, precio_anual' })
      }
    }

    if (precio_mensual < 0 || precio_anual < 0 || (precio_semestral !== undefined && precio_semestral < 0)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Los precios deben ser mayores o iguales a 0' })
      }
    }

    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('tb_planes')
      .insert([
        {
          id,
          codigo,
          nombre,
          descripcion,
          precio_mensual,
          precio_semestral: precio_semestral !== undefined ? precio_semestral : 0, // Default 0 or null if column allows
          precio_anual,
          moneda: moneda || 'CLP',
          activo: activo !== undefined ? activo : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'El código del plan ya existe' })
        }
      }
      throw error
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ plan: data })
    }

  } catch (error) {
    console.error('Error en crearPlan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
