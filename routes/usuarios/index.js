'use strict';

module.exports.main = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      users: [
        { id: 1, name: 'David' },
        { id: 2, name: 'Ana' },
      ],
    }),
  };
};
