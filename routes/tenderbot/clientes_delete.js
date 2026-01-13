import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { deleteClienteWithBackup } from './services/clientesService.js'

/**
 * @swagger
 * /tenderbot/clientes/{id}:
 *   delete:
 *     summary: Eliminar cliente (con respaldo automático)
 *     tags: [TenderBot Clientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cliente eliminado y respaldado }
 *       404: { description: Cliente no encontrado }
 *       409: { description: Conflicto (suscripciones activas) }
 *       500: { description: Error interno }
 */
export const handlerLocal = async (event) => {
    try {
        const { id } = event.pathParameters || {}
        
        if (!id) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID de cliente' }) }
        }

        console.log(`[ClientesDelete] Iniciando eliminación para ID: ${id}`)
        
        const result = await deleteClienteWithBackup(id)
        
        if (!result.success) {
            const statusCode = result.code || 500
            return { statusCode, body: JSON.stringify({ error: result.error }) }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Cliente eliminado y respaldado exitosamente',
                deleted: true,
                cliente_id: id,
                backed_up: true
            })
        }

    } catch (error) {
        console.error('Error deleteCliente:', error)
        return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor' }) }
    }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
