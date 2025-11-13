import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'

/**
 * @swagger
 * /jugadores:
 *   post:
 *     summary: Crear un nuevo jugador
 *     description: Crea un nuevo registro en la tabla `jugadores` en Supabase.
 *     tags:
 *       - Jugadores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - nombre
 *               - ower_id
 *               - posicion
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 example: "b8a8e2f0-30a3-4c8a-8c1b-5c6f3c2e7f21"
 *               owner_id:
 *                 type: string
 *                 format: uuid
 *                 example: "b8a8e2f0-30a3-4c8a-8c1b-5c6f3c2e7f21"
 *               nombre:
 *                 type: string
 *                 example: "Carlos"
 *               posicion:
 *                 type: string
 *                 example: "Delantero"
 *     responses:
 *       200:
 *         description: Jugador creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Jugador creado exitosamente"
 *                 data:
 *                   type: object
 *                   example:
 *                     id: "b8a8e2f0-30a3-4c8a-8c1b-5c6f3c2e7f21"
 *                     owner_id: "b8a8e2f0-30a3-4c8a-8c1b-5c6f3c2e7f21"
 *                     nombre: "Carlos"
 *                     posicion: "Delantero"
 *                     created_at: "2025-11-13T12:00:00Z"
 *       400:
 *         description: Error de validación o fallo al crear
 */

export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { id, owner_id ,nombre, posicion } = body;

    // Validación básica
    if (!id || !owner_id || !nombre || !posicion) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Faltan campos requeridos (id, owner_id ,nombre, posicion)" }),
      };
    }
    // Timestamp automático
    const created_at = new Date().toISOString();

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
    // Llamada al servicio Supabase
    const { data, error } = await supabase
        .from("jugadores")
        .insert([{ id, owner_id, nombre, posicion, created_at }])
        .select()
        .single()
    
     if (error) {
      console.error('Error al insertar en Supabase:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al crear el Jugador' })
      }
    }

    // ✅ Retornar el jugador  recién creado
    return {
      statusCode: 201,
      body: JSON.stringify({ juagador: data })
    }

  } catch (error) {
    console.error("❌ Error creando jugador:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error al crear jugador",
        error: error.message,
      }),
    };
  }
};

export const handler = withAuth(handlerLocal)