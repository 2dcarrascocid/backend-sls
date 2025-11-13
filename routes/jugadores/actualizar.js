import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'

/**
 * @swagger
 * /jugadores/actualizar:
 *   put:
 *     summary: Actualizar datos de un jugador
 *     description: Actualiza los campos editables de un jugador existente en la tabla `jugadores`.
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
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 example: "b8a8e2f0-30a3-4c8a-8c1b-5c6f3c2e7f21"
 *               nombre:
 *                 type: string
 *                 example: "Carlos Torres"
 *               apellidos:
 *                 type: string
 *                 example: "Sánchez López"
 *               email:
 *                 type: string
 *                 example: "carlos@example.com"
 *               username:
 *                 type: string
 *                 example: "carlitos7"
 *               avatar_url:
 *                 type: string
 *                 example: "https://example.com/avatar.png"
 *               telefono:
 *                 type: string
 *                 example: "+56998765432"
 *               posicion:
 *                 type: string
 *                 example: "Mediocampista"
 *     responses:
 *       200:
 *         description: Jugador actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Jugador actualizado exitosamente"
 *                 data:
 *                   type: object
 *       400:
 *         description: Faltan parámetros o ID inválido
 *       404:
 *         description: Jugador no encontrado
 */

export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { id, ...updates } = body;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Falta el campo 'id' del jugador a actualizar" }),
      };
    }

    // Timestamp de actualización
    const updated_at = new Date().toISOString();

    // Mock para desarrollo local
    if (process.env.USE_DB_MOCK === 'true') {
      const mockJugador = { id, ...updates, updated_at };
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Jugador actualizado (mock)", data: mockJugador }),
      };
    }

    // Actualización real en Supabase
    const { data, error } = await supabase
      .from("jugadores")
      .update({ ...updates, updated_at })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error al actualizar en Supabase:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error al actualizar jugador", error: error.message }),
      };
    }

    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Jugador no encontrado" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Jugador actualizado exitosamente",
        data,
      }),
    };
  } catch (error) {
    console.error("❌ Error general en actualizar jugador:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error al procesar la solicitud",
        error: error.message,
      }),
    };
  }
};

export const handler = withAuth(handlerLocal);
