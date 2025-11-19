import pkg from "swagger-jsdoc";
const swaggerJSDoc = pkg.default || pkg;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Fair Play Chile",
      version: "1.0.0",
    },
  },
  apis: ["./routes/**/*.js"],
};

export const handler = async () => {
  try {
    console.log("Generando Swagger spec...");
    const spec = swaggerJSDoc(options);

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Swagger UI</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            spec: ${JSON.stringify(spec)},
            dom_id: '#swagger'
          });
        </script>
      </body>
    </html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };
  } catch (err) {
    console.error("ERROR SWAGGER:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Swagger error",
        error: err.message,
        stack: err.stack,
      }),
    };
  }
};
