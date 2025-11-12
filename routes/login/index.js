'use strict';

module.exports.main = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { username, password } = body;

  if (username === 'admin' && password === '1234') {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Login exitoso', token: 'fake-jwt-token' }),
    };
  }

  return {
    statusCode: 401,
    body: JSON.stringify({ message: 'Usuario o contraseña incorrectos' }),
  };
};
