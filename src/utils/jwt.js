// src/utils/jwt.js
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT para un usuario.
 * @param {object} payload - Los datos a incluir en el token (e.g., id, rol).
 * @returns {string} El token JWT.
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

module.exports = {
  generateToken,
};