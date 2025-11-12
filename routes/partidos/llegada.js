import db from '../../services/db.js';

/**
 * @swagger
 * /api/partidos/{id}/llegada:
 *   post:
 *     summary: Registrar llegada del usuario
 *     tags:
 *       - Partidos
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *                 example: -33.456
 *               lng:
 *                 type: number
 *                 example: -70.648
 *     responses:
 *       200:
 *         description: Llegada registrada
 *       404:
 *         description: Partido no encontrado
 */

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { usuario_id, lat, lng } = body;

    if (!id || !usuario_id || !lat || !lng) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Campos requeridos: id, usuario_id, lat, lng' }) };
    }

    console.log(`Usuario ${usuario_id} llegó al partido ${id}`, { lat, lng });

    await db.query(
      `UPDATE participaciones
       SET llegada_lat = $1, llegada_lng = $2, llegada_hora = NOW()
       WHERE id_partido = $3 AND id_usuario = $4`,
      [lat, lng, id, usuario_id]
    );

    return { statusCode: 200, body: JSON.stringify({ message: 'Llegada registrada' }) };
  } catch (err) {
    console.error('Error en POST /partidos/{id}/llegada', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: err.message }) };
  }
};
