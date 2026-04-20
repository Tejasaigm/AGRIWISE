/**
 * PostgreSQL connection pool (pg)
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max:              10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

/**
 * Execute a parameterised query.
 * Throws on error so callers use try/catch or Express error middleware.
 */
async function query(text, params) {
  const start = Date.now();
  const res   = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DB] ${text.slice(0, 80)}  (${Date.now() - start}ms)`);
  }
  return res;
}

module.exports = { query, pool };
