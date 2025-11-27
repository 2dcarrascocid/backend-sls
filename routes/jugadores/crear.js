import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

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

    // 1. Verificar si ya existe un jugador con ese ID o Email
    let query = supabase.from("jugadores").select("*");

    if (email) {
      // Si hay email, buscamos por ID O Email
      query = query.or(`id.eq.${id},email.eq.${email}`);
    } else {
      // Si no hay email, solo buscamos por ID
      query = query.eq("id", id);
    }

    const { data: existingPlayer, error: searchError } = await query.maybeSingle();

    if (searchError) {
      console.error("Error buscando jugador existente:", searchError);
      // No bloqueamos, intentamos crear y si falla la BD lo dirá, o retornamos error?
      // Mejor retornar error 500 si falla la búsqueda para evitar inconsistencias.
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error al verificar existencia del jugador" }),
      };
    }

    // Si existe, lo retornamos
    if (existingPlayer) {
      return {
        statusCode: 200, // OK (no Created)
        body: JSON.stringify({ jugador: existingPlayer }),
      };
    }

    // 2. Si no existe, procedemos a crear
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

export const handler = withAuth(withJsonResponse(handlerLocal));
