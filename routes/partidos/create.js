import { query } from '../../services/db.js';
import crypto from 'crypto';

/**
 * @swagger
 * /partidos:
 *   post:
 *     summary: Crea un nuevo partido
 *     description: Crea un partido y devuelve su ID y join_code.
 *     tags:
 *       - Partidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               lugar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partido creado exitosamente
 *       500:
 *         description: Error al crear el partido
 */

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { nombre, fecha, lugar, creador_id } = body;

    const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const result = await query(
      `INSERT INTO partidos (nombre, fecha, lugar, creador_id, join_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, join_code`,
      [nombre, fecha, lugar, creador_id, joinCode]
    );

    return {
      statusCode: 201,
      body: JSON.stringify(result.rows[0]),
    };
  } catch (err) {
    console.error('Error al crear partido:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno' }),
    };
  }
};
