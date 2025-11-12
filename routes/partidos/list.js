import db from '../../services/db.js';

/**
 * @swagger
 * /api/partidos:
 *   get:
 *     summary: Lista partidos creados o vinculados al usuario
 *     tags:
 *       - Partidos
 *     parameters:
 *       - name: mine
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Si es true, lista los partidos creados por mí
 *       - name: vinculados
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Si es true, lista partidos donde estoy vinculado
 *     responses:
 *       200:
 *         description: Lista de partidos obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *                   fecha:
 *                     type: string
 *                     format: date-time
 */

export const handler = async (event) => {
  try {
    const user_id = event.queryStringParameters?.user_id;
    const mine = event.queryStringParameters?.mine === 'true';
    const vinculados = event.queryStringParameters?.vinculados === 'true';

    if (!user_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'user_id es requerido' }) };
    }

    let query = '';
    let params = [user_id];

    if (mine) {
      query = 'SELECT * FROM partidos WHERE id_creador = $1 ORDER BY created_at DESC';
    } else if (vinculados) {
      query = `
        SELECT p.*
        FROM partidos p
        JOIN participaciones pa ON pa.id_partido = p.id
        WHERE pa.id_usuario = $1
        ORDER BY p.created_at DESC
      `;
    } else {
      query = 'SELECT * FROM partidos ORDER BY created_at DESC';
      params = [];
    }

    const result = await db.query(query, params);

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al listar partidos' }) };
  }
};
