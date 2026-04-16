const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Gunakan promise wrapper agar bisa pakai async/await
const promisePool = pool.promise();

promisePool.getConnection()
    .then(() => console.log('✅ Terhubung ke MySQL Laragon (db: sampah)'))
    .catch(err => console.error('❌ Gagal koneksi MySQL:', err));

module.exports = promisePool;