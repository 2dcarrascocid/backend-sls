import { supabase } from '../../services/db.js'
import { withAuth } from '../../services/withAuth.js'
/**
 * @swagger
 * /jugadores/{id}:
 *   get:
 *     summary: Obtener un jugador por su ID
 *     description: Retorna los datos del jugador con el ID especificado.
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID (uuid) del jugador
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Jugador encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 nombre:
 *                   type: string
 *                 posicion:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                 email:
 *                   type: string
 *                 apellidos:
 *                   type: string
 *                 username:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 telefono:
 *                   type: string
 *       404:
 *         description: Jugador no encontrado
 *       500:
 *         description: Error interno
 */



export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Debe proporcionar un ID de jugador" }),
      };
    }

    const { data, error } = await supabase
      .from("jugadores")
      .select("*")
      .eq("id", id)
      .single(); // como es una búsqueda única, aquí sí aplica .single()

    if (error) throw error;

    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Jugador no encontrado" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error al obtener jugador:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error al obtener jugador",
        error: error.message,
      }),
    };
  }
};

export const handler = withAuth(handlerLocal)
