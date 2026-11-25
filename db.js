// Conexión a MySQL. Lee los datos del archivo .env.
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function crearPool(nombreBD = process.env.DB_NAME || 'medipuente') {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: nombreBD,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true // las fechas regresan como texto (YYYY-MM-DD), sin problemas de zona horaria
  });
}

module.exports = { crearPool };
