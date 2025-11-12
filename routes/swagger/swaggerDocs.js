import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Fair Play Chile",
      version: "1.0.0",
      description: "Documentación de endpoints de tu backend Serverless",
    },
    servers: [
      {
        url: "http://localhost:3000/dev/api", // Ajusta si usas /api directamente
      },
    ],
  },
  apis: ["routes/**/*.js"], // Aquí Swagger buscará tus comentarios de rutas
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Endpoint de prueba
 *     responses:
 *       200:
 *         description: Devuelve un saludo de prueba
 */
export const handler = async (event, context) => {
  // Devuelve el contenido HTML de Swagger UI
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
