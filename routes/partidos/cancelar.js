import db from '../../services/db.js';

/**
 * @swagger
 * /api/partidos/{id}/cancelar:
 *   post:
 *     summary: Cancelar asistencia a un partido
 *     tags:
 *       - Partidos
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del partido
 *     responses:
 *       200:
 *         description: Asistencia cancelada
 *       404:
 *         description: Partido no encontrado
 */

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { usuario_id } = body;

    if (!id || !usuario_id) {
      return { statusCode: 400, body: JSON.stringify({ message: 'id y usuario_id son requeridos' }) };
    }

    console.log(`Usuario ${usuario_id} cancela asistencia a partido ${id}`);

    await db.query(
      `UPDATE participaciones
       SET estado_asistencia = 'CANCELADO', updated_at = NOW()
       WHERE id_partido = $1 AND id_usuario = $2`,
      [id, usuario_id]
    );

    return { statusCode: 200, body: JSON.stringify({ message: 'Asistencia cancelada' }) };
  } catch (err) {
    console.error('Error en POST /partidos/{id}/cancelar', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: err.message }) };
  }
};
