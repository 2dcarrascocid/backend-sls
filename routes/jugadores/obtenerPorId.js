import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
/**
 * @swagger
 * /jugadores/{id}:
 *   get:
 *     summary: Obtener un jugador por su ID o Email
 *     description: Retorna los datos del jugador buscando por ID (UUID) o por Email.
 *     tags:
 *       - Jugadores
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID (uuid) o Email del jugador
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
        body: JSON.stringify({ message: "Debe proporcionar un ID o Email de jugador" }),
      };
    }

    // Determinar si es UUID o Email
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(id);
    const isEmail = id.includes('@');

    let query = supabase.from("jugadores").select("*");

    if (isUuid) {
      query = query.eq("id", id);
    } else if (isEmail) {
      query = query.eq("email", id);
    } else {
      // Si no es ni UUID ni Email válido, asumimos que es un ID inválido o intentamos buscarlo como ID de todas formas (fallará en BD si es UUID strict)
      // O retornamos error 400.
      // Para ser flexibles, intentaremos buscar por ID si no parece email, pero Supabase lanzará error si el tipo no coincide con UUID.
      // Mejor retornar 400 si no tiene formato esperado.
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "El parámetro debe ser un UUID válido o un Email" }),
      };
    }

    const { data, error } = await query.single();

    if (error) {
      // Si no encuentra resultados .single() lanza error con code 'PGRST116'
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Jugador no encontrado" }),
        };
      }
      throw error;
    }

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

export const handler = withAuth(withJsonResponse(handlerLocal));