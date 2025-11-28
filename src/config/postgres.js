// src/config/postgres.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
    console.log('✅ Base de Datos conectada exitosamente.');
});

// CORRECCIÓN: Exportamos tanto el pool como la función query
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool, // <-- Exportamos el pool para poder usar transacciones
};