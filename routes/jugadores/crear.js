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
 *               - owner_id
 *               - nombre
 *               - posicion
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               owner_id:
 *                 type: string
 *                 format: uuid
 *               nombre:
 *                 type: string
 *               posicion:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 required: false
 *     responses:
 *       201:
 *         description: Jugador creado correctamente
 *       400:
 *         description: Error de validación
 */

export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { id, owner_id, nombre, posicion, email } = body;

    // Validación obligatoria
    if (!id || !owner_id || !nombre || !posicion) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Faltan campos requeridos (id, owner_id, nombre, posicion)"
        })
      }
    }

    const created_at = new Date().toISOString();

    // Construcción dinámica del objeto a insertar
    const jugadorInsert = {
      id,
      owner_id,
      nombre,
      posicion,
      created_at
    };

    // Si viene email -> incluirlo
    if (email) {
      jugadorInsert.email = email;
    }

    // Inserción Supabase
    const { data, error } = await supabase
      .from("jugadores")
      .insert([jugadorInsert])
      .select()
      .single();

    if (error) {
      console.error("Error al insertar en Supabase:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error al crear el jugador" }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ jugador: data }),
    };

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

export const handler = withAuth(handlerLocal);
