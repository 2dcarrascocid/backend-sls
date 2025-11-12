import { swaggerUi, swaggerSpec } from '../../swagger/swaggerDocs.js';

export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: swaggerUi.generateHTML(swaggerSpec),
  };
};
