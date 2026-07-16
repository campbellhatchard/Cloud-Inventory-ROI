/* ═══════════════════════════════════════════════════════════════════
   src/db.js  —  PostgreSQL connection pool
   Single shared pool used by all route modules. Never call pg.Pool()
   anywhere else — always import { query, pool } from this file.
   ═══════════════════════════════════════════════════════════════════ */

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is not set — database features will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }   // Required for Render PostgreSQL
    : false,
  max:                 10,            // Maximum pool connections
  idleTimeoutMillis:   30000,         // Close idle connections after 30s
  connectionTimeoutMillis: 5000       // Fail fast if DB unreachable
});

/* ── Log pool errors (lost connections, etc.) ── */
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

/**
 * Parameterised query helper.
 * ALWAYS use this — never string-interpolate user input into SQL.
 *
 * Usage:
 *   const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
 *
 * @param {string} text    — SQL with $1, $2, ... placeholders
 * @param {Array}  params  — values to bind (can be omitted for no-param queries)
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 200) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return result;
  } catch (err) {
    console.error('Database query error:', { text: text.substring(0, 100), err: err.message });
    throw err;
  }
}

/**
 * Transaction helper — wraps multiple queries in a single transaction.
 * Automatically ROLLBACK on any error, COMMIT on success.
 *
 * Usage:
 *   await transaction(async (client) => {
 *     await client.query('INSERT ...', []);
 *     await client.query('UPDATE ...', []);
 *   });
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


async function testConnection() {
  const result = await pool.query('SELECT NOW() AS db_time');
  return result.rows[0]?.db_time;
}

module.exports = { query, transaction, pool, testConnection };
