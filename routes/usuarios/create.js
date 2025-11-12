'use strict';

module.exports.main = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { name } = body;

  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Falta el nombre del usuario' }),
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ message: `Usuario ${name} creado` }),
  };
};
