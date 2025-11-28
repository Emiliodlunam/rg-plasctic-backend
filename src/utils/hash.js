// src/utils/hash.js
const bcrypt = require('bcryptjs');

/**
 * Encripta una contraseña en texto plano.
 * @param {string} password - La contraseña a encriptar.
 * @returns {Promise<string>} La contraseña encriptada (hash).
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compara una contraseña en texto plano con un hash.
 * @param {string} password - La contraseña en texto plano.
 * @param {string} hashedPassword - La contraseña encriptada de la BD.
 * @returns {Promise<boolean>} True si las contraseñas coinciden.
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};