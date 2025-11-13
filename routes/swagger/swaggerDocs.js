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
        url: "http://localhost:3000",
        description: "Servidor local",
      },
      {
        url: "https://tu-api-url.execute-api.us-east-1.amazonaws.com/dev",
        description: "Servidor AWS",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API Key requerida para acceder a los endpoints protegidos",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: ["routes/**/*.js"], // Documentación extraída de tus endpoints
};

const swaggerSpec = swaggerJsdoc(options);

export const handler = async () => {
  try {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Swagger UI - Fair Play Chile</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
          <script>
            const spec = ${JSON.stringify(swaggerSpec)};
            SwaggerUIBundle({
              spec,
              dom_id: '#swagger-ui',
              presets: [SwaggerUIBundle.presets.apis],
              layout: "BaseLayout"
            });
          </script>
        </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      body: html,
    };
  } catch (err) {
    console.error("Error generando Swagger UI:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error generando Swagger UI" }),
    };
  }
};
