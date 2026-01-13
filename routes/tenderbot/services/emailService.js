import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export const sendPaymentConfirmationEmail = async ({ cliente, plan, suscripcion, pago }) => {
    try {
        console.log(`[EmailService] Iniciando envío a: ${cliente.email_contacto}`)
        console.log(`[EmailService] Configuración SMTP - Host: ${process.env.SMTP_HOST}, Port: ${process.env.SMTP_PORT}, User: ${process.env.SMTP_USER}, From: ${process.env.SMTP_FROM}`)

        const subject = 'Pago confirmado – Tender Bot'
        
        // Formatear monto
        const montoFormatted = new Intl.NumberFormat('es-CL', { 
            style: 'currency', 
            currency: pago.moneda || 'CLP' 
        }).format(pago.monto)

        const fechaPagado = pago.pagado_en 
            ? new Date(pago.pagado_en).toLocaleString('es-CL') 
            : new Date().toLocaleString('es-CL')

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background-color: #1a1a1a; color: #ffffff; padding: 20px; text-align: center; }
                .content { padding: 30px; }
                .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .detail-row:last-child { border-bottom: none; }
                .label { font-weight: bold; color: #555; }
                .value { color: #000; }
                .footer { background-color: #f4f4f4; text-align: center; padding: 15px; font-size: 12px; color: #888; }
                .status-badge { background-color: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>¡Pago Recibido Exitosamente!</h2>
                </div>
                <div class="content">
                    <p>Hola <strong>${cliente.razon_social || cliente.nombre_contacto}</strong>,</p>
                    <p>Hemos recibido el pago de tu suscripción a Tender Bot. A continuación encontrarás los detalles:</p>
                    
                    <div class="details">
                        <div class="detail-row">
                            <span class="label">Plan:</span>
                            <span class="value">${plan.nombre} (${suscripcion.periodicidad})</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Monto:</span>
                            <span class="value">${montoFormatted}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Fecha:</span>
                            <span class="value">${fechaPagado}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Orden de Compra:</span>
                            <span class="value">${pago.orden_compra || '-'}</span>
                        </div>
                        ${pago.transaction_id ? `
                        <div class="detail-row">
                            <span class="label">ID Transacción:</span>
                            <span class="value">${pago.transaction_id}</span>
                        </div>` : ''}
                        ${pago.proveedor_pago ? `
                        <div class="detail-row">
                            <span class="label">Medio de Pago:</span>
                            <span class="value">${pago.proveedor_pago}</span>
                        </div>` : ''}
                        <div class="detail-row" style="align-items: center;">
                            <span class="label">Estado:</span>
                            <span class="status-badge">PAGADO</span>
                        </div>
                    </div>

                    <p>Si tienes alguna duda o necesitas ayuda, no dudes en contactarnos respondiendo a este correo o escribiendo a <a href="mailto:${process.env.SMTP_FROM}">${process.env.SMTP_FROM}</a>.</p>
                </div>
                <div class="footer">
                    <p>Tender Bot - Gestión de Licitaciones</p>
                </div>
            </div>
        </body>
        </html>
        `

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: cliente.email_contacto,
            subject: subject,
            html: html,
        })

        console.log(`[EmailService] Correo enviado. MessageId: ${info.messageId}`)
        return { success: true, messageId: info.messageId }

    } catch (error) {
        console.error('[EmailService] Error enviando correo:', error)
        return { success: false, error: error.message }
    }
}
