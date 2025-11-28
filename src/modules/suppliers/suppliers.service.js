// src/modules/suppliers/suppliers.service.js
const db = require('../../config/postgres');

/**
 * Busca todos los proveedores activos.
 * @returns {Promise<Array>} Un arreglo de proveedores.
 */
const findAllSuppliers = async () => {
  const text = 'SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name ASC';
  const { rows } = await db.query(text);
  return rows;
};

module.exports = {
  findAllSuppliers,
};