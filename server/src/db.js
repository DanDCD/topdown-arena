const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('Database ready');
      return;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.log(`DB not ready, retrying in 2s... (${retries} left)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { pool, init };
