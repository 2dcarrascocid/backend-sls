import db from '../../services/db.js';

/**
 * @swagger
 * /api/partidos/{id}/calificar:
 *   post:
 *     summary: Calificar jugadores de un partido
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
 *               calificaciones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     run:
 *                       type: string
 *                       example: 12345678-9
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     jmv:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Calificaciones registradas
 *       404:
 *         description: Partido no encontrado
 */

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { calificaciones } = body; // [{ run, rating, jmv }]

    if (!id || !Array.isArray(calificaciones)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Datos inválidos o id faltante' }) };
    }

    console.log(`Calificaciones recibidas para partido ${id}:`, calificaciones.length);

    for (const cal of calificaciones) {
      await db.query(
        `INSERT INTO calificaciones (id_partido, run, rating, jmv, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id_partido, run) DO UPDATE
         SET rating = EXCLUDED.rating, jmv = EXCLUDED.jmv, updated_at = NOW()`,
        [id, cal.run, cal.rating, cal.jmv]
      );
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Calificaciones guardadas' }) };
  } catch (err) {
    console.error('Error en POST /partidos/{id}/calificar', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: err.message }) };
  }
};
