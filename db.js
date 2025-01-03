import mysql from 'mysql2';

// MySQL bağlantı havuzu oluşturma
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fasteatDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise tabanlı kullanım
const promisePool = pool.promise();

// Bağlantı testi
promisePool.query('SELECT 1')
    .then(() => {
        console.log('Database bağlantısı başarılı');
    })
    .catch(err => {
        console.error('Database bağlantı hatası:', err);
        process.exit(1);
    });

export default promisePool;