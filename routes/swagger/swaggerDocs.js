import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Fair Play Chile",
      version: "1.0.0",
      description: "Documentación de endpoints del backend Serverless Fair Play Chile",
    },
    servers: [
      {
        url: "http://localhost:3000/",
        description: "Servidor local",
      },
      {
        url: "https://tu-api-url.execute-api.us-east-1.amazonaws.com/dev",
        description: "Servidor AWS",
      },
    ],

    // 🔑 Definición del esquema de seguridad global
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key", // 👈 Header que se enviará en las peticiones
          description: "API Key requerida para acceder a los endpoints protegidos",
        },
      },
    },

    // 🔒 Aplica seguridad global (opcional)
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },

  // Swagger buscará los comentarios JSDoc dentro de tu estructura de rutas
  apis: ["routes/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Endpoint de prueba
 *     tags:
 *       - Test
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Devuelve un saludo de prueba
 */
export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Swagger UI</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerSpec)},
            dom_id: '#swagger-ui'
          });
        </script>
      </body>
      </html>
    `,
  };
};
