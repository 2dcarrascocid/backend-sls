import db from '../../services/db.js';

/**
 * @swagger
 * /api/partidos/{id}/asistire:
 *   post:
 *     summary: Confirmar asistencia a un partido
 *     tags:
 *       - Partidos
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del partido
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Asistencia confirmada
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

    console.log(`Usuario ${usuario_id} confirma asistencia a partido ${id}`);

    await db.query(
      `UPDATE participaciones
       SET estado_asistencia = 'ASISTIRE', updated_at = NOW()
       WHERE id_partido = $1 AND id_usuario = $2`,
      [id, usuario_id]
    );

    return { statusCode: 200, body: JSON.stringify({ message: 'Asistencia confirmada' }) };
  } catch (err) {
    console.error('Error en POST /partidos/{id}/asistire', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: err.message }) };
  }
};
