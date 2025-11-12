import { query } from '../../services/db.js';

/**
 * @swagger
 * /api/partidos/{join_code}/join:
 *   post:
 *     summary: Unirse a un partido mediante join_code
 *     tags:
 *       - Partidos
 *     parameters:
 *       - name: join_code
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de invitación del partido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 45
 *     responses:
 *       200:
 *         description: Usuario unido al partido
 *       404:
 *         description: Partido no encontrado
 */

export const handler = async (event) => {
  try {
    const { join_code } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { usuario_id } = body;

    const partido = await query('SELECT id FROM partidos WHERE join_code = $1', [join_code]);

    if (partido.rowCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Código no válido' }) };
    }

    const id_partido = partido.rows[0].id;

    await query(
      'INSERT INTO participaciones (usuario_id, partido_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [usuario_id, id_partido]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Participación creada', partido_id: id_partido }),
    };
  } catch (err) {
    console.error('Error al unirse al partido:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
