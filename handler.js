'use strict';

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: '¡Hola desde tu Lambda Serverless!',
      },
      null,
      2
    ),
  };
};

