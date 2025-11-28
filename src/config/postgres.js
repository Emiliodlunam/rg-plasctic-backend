// src/config/postgres.js

require('dotenv').config();
const { Pool } = require('pg');

// ✔ Si existe DATABASE_URL (Render), úsala.
// ✔ Si NO existe (modo local), usa las variables separadas.
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

pool.on('connect', () => {
  console.log('✅ Base de Datos conectada exitosamente.');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
