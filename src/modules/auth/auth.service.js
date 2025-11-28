// src/modules/auth/auth.service.js
const db = require('../../config/postgres');
const { hashPassword } = require('../../utils/hash');

const findUserByUsername = async (username) => {
  const text = `
    SELECT u.*, e.position as role FROM users u
    LEFT JOIN employees e ON u.employee_id = e.id
    WHERE u.username = $1 AND u.is_active = TRUE;
  `;
  const { rows } = await db.query(text, [username]);
  return rows[0];
};

const registerUser = async (userData) => {
  const { employee_id, username, password, email, role } = userData;
  const hashedPassword = await hashPassword(password);
  
  const text = `
    INSERT INTO users (employee_id, username, password_hash, email, role, is_active)
    VALUES ($1, $2, $3, $4, $5, TRUE)
    RETURNING id, username, email, role, created_at;
  `;
  const values = [employee_id, username, hashedPassword, email, role];
  const { rows } = await db.query(text, values);
  return rows[0];
};

module.exports = {
  findUserByUsername,
  registerUser,
};