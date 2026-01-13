import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { sendPaymentConfirmationEmail } from './services/emailService.js'

/**
 * @swagger
 * /tenderbot/pagos/{id}/reenviar-confirmacion:
 *   post:
 *     summary: Reenviar correo de confirmación de pago
 *     tags: [TenderBot Pagos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: force
 *         schema: { type: boolean }
 *         description: Forzar envío aunque ya se haya notificado
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema: { type: string }
 */
export const handlerLocal = async (event) => {
  try {
    const { id } = event.pathParameters || {}
    const { force } = event.queryStringParameters || {}
    const forceSend = force === 'true'

    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta ID' }) }

    // 1. Obtener Datos Completos
    // Necesitamos Pago, Suscripción, Cliente, Plan
    // Hacemos fetch encadenado o joins si FKs lo permiten.
    // Asumimos FKs: tb_pagos.suscripcion_id -> tb_suscripciones
    // tb_suscripciones.cliente_id -> tb_clientes
    // tb_suscripciones.plan_id -> tb_planes
    
    const { data: pago, error: errPago } = await supabase
        .from('tb_pagos')
        .select(`
            *,
            tb_suscripciones (
                *,
                tb_clientes (*),
                tb_planes (*)
            )
        `)
        .eq('id', id)
        .single()
    
    if (errPago || !pago) return { statusCode: 404, body: JSON.stringify({ error: 'Pago no encontrado' }) }
    
    if (pago.estado !== 'PAGADO') {
        return { statusCode: 400, body: JSON.stringify({ error: 'El pago no está en estado PAGADO' }) }
    }

    // 2. Verificar Idempotencia
    if (pago.email_notificado_en && !forceSend) {
        return { statusCode: 200, body: JSON.stringify({ message: 'El correo ya fue enviado previamente', email_notificado_en: pago.email_notificado_en }) }
    }

    // 3. Preparar datos para servicio
    const suscripcion = pago.tb_suscripciones
    const cliente = suscripcion.tb_clientes
    const plan = suscripcion.tb_planes

    if (!cliente || !plan) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Datos incompletos (cliente o plan no encontrados)' }) }
    }

    // 4. Enviar Correo
    const result = await sendPaymentConfirmationEmail({ cliente, plan, suscripcion, pago })

    if (result.success) {
        // 5. Actualizar flag
        const now = new Date().toISOString()
        await supabase.from('tb_pagos').update({ email_notificado_en: now }).eq('id', id)
        
        return { statusCode: 200, body: JSON.stringify({ message: 'Correo enviado exitosamente', messageId: result.messageId }) }
    } else {
        return { statusCode: 500, body: JSON.stringify({ error: 'Error al enviar correo', details: result.error }) }
    }

  } catch (error) {
    console.error(error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}

export const handler = withAuth(withJsonResponse(handlerLocal))
