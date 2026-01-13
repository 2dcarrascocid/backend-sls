require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('--- Probando Configuración SMTP ---');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);
    console.log(`Secure: ${process.env.SMTP_SECURE}`);
    console.log(`From: ${process.env.SMTP_FROM}`);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Faltan variables de entorno SMTP en .env');
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // Forzamos false para puerto 587 (STARTTLS)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        debug: true,
        logger: true
    });

    try {
        console.log('Intento de verificación de conexión (verify)...');
        await transporter.verify();
        console.log('✅ Conexión SMTP exitosa.');

        console.log('Enviando correo de prueba...');
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.SMTP_USER, // Enviar al mismo usuario para probar
            subject: 'Test SMTP Tender Bot (CJS)',
            text: 'Si lees esto, el envío de correos funciona correctamente.',
            html: '<b>Si lees esto, el envío de correos funciona correctamente.</b>'
        });

        console.log(`✅ Correo enviado. MessageId: ${info.messageId}`);
        console.log(`Preview URL (si aplica): ${nodemailer.getTestMessageUrl(info)}`);

    } catch (error) {
        console.error('❌ Error SMTP:', error);
    }
};

testEmail();
