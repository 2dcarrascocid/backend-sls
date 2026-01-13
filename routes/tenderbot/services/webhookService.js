export const sendPaymentWebhook = async ({ cliente, plan, suscripcion, pago }) => {
    const webhookUrl = process.env.WEBHOOK_PAGOS_EXITOSOS

    if (!webhookUrl) {
        console.log('[WebhookService] WEBHOOK_PAGOS_EXITOSOS no configurado, omitiendo envío.')
        return { success: false, skipped: true }
    }

    try {
        console.log(`[WebhookService] Enviando notificación a: ${webhookUrl}`)

        const payload = {
            event: 'payment.success',
            timestamp: new Date().toISOString(),
            data: {
                pago: {
                    id: pago.id,
                    monto: pago.monto,
                    moneda: pago.moneda,
                    estado: pago.estado,
                    orden_compra: pago.orden_compra,
                    transaction_id: pago.transaction_id,
                    proveedor_pago: pago.proveedor_pago,
                    pagado_en: pago.pagado_en,
                    created_at: pago.created_at
                },
                suscripcion: {
                    id: suscripcion.id,
                    periodicidad: suscripcion.periodicidad,
                    estado: suscripcion.estado,
                    proxima_facturacion: suscripcion.proxima_facturacion
                },
                cliente: {
                    id: cliente.id,
                    razon_social: cliente.razon_social,
                    nombre_contacto: cliente.nombre_contacto,
                    email_contacto: cliente.email_contacto,
                    rut: cliente.rut
                },
                plan: {
                    id: plan.id,
                    codigo: plan.codigo,
                    nombre: plan.nombre
                }
            }
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TenderBot-Serverless/1.0'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const text = await response.text()
            console.error(`[WebhookService] Error respuesta webhook (${response.status}): ${text}`)
            return { success: false, status: response.status, error: text }
        }

        console.log(`[WebhookService] Webhook enviado exitosamente. Status: ${response.status}`)
        return { success: true, status: response.status }

    } catch (error) {
        console.error('[WebhookService] Error enviando webhook:', error)
        return { success: false, error: error.message }
    }
}
