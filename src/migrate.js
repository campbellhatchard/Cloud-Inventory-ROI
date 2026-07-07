/* ═══════════════════════════════════════════════════════════════════
   src/migrate.js  —  Database migration runner

   Runs on server startup (called from server.js before app.listen).
   Also runnable standalone: node src/migrate.js

   - Reads migration files from /migrations/*.sql in alphabetical order
   - Tracks applied migrations in schema_migrations table
   - Only runs unapplied migrations — safe to run repeatedly
   - Ensures the configured bootstrap Admin exists
   - Any migration failure aborts startup with a clear error
   ═══════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { envInt } = require('./config');

async function ensureBootstrapAdmin(client) {
  const username = String(process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin').trim();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || 'CloudInventory2026!');
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@cloudinventory.com')
    .trim()
    .toLowerCase();
  const roundsRaw = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const rounds = Number.isInteger(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 15
    ? roundsRaw
    : 12;

  if (!username || !email || !password) {
    throw new Error(
      'BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD must be non-empty.'
    );
  }

  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const { rows } = await client.query(
    `SELECT id, username, email, password_hash, first_login
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username]
  );

  if (!rows.length) {
    const passwordHash = await bcrypt.hash(password, rounds);
    await client.query(
      `INSERT INTO users (email, username, password_hash, role, first_login, is_active)
       VALUES ($1, $2, $3, 'admin', FALSE, TRUE)`,
      [email, username, passwordHash]
    );
    console.log(
      `✅ Bootstrap Admin created: ${username}`
    );
    return;
  }

  const existing = rows[0];
  const configuredPasswordAlreadySet = await bcrypt
    .compare(password, existing.password_hash)
    .catch(() => false);

  if (existing.first_login) {
    /* A bootstrap account still marked first_login is treated as an incomplete
       setup. Synchronize it to the configured recovery credential, clear any
       lockout, and allow direct access. */
    const passwordHash = configuredPasswordAlreadySet
      ? existing.password_hash
      : await bcrypt.hash(password, rounds);

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           role = 'admin',
           first_login = FALSE,
           is_active = TRUE,
           failed_login_count = 0,
           locked_until = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, existing.id]
    );

    console.log(`✅ Bootstrap Admin synchronized and unlocked: ${username}`);
    return;
  }

  /* Never overwrite a password after the administrator has established a
     user-managed credential. */
  console.log(
    `✅ Bootstrap Admin present with a user-managed password: ${existing.username}`
  );
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — skipping migrations.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 1,
    connectionTimeoutMillis: 10000
  });

  let client;
  const maxAttempts = envInt('DB_STARTUP_MAX_ATTEMPTS', 60, { min: 1, max: 200 });
  const retryDelayMs = envInt('DB_STARTUP_RETRY_MS', 3000, { min: 250, max: 30000 });
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      client = await pool.connect();
      break;
    } catch (err) {
      if (attempt === maxAttempts) {
        await pool.end().catch(() => {});
        throw new Error(`Unable to connect to PostgreSQL after ${maxAttempts} attempts: ${err.message}`);
      }
      console.warn(`PostgreSQL not ready (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const allFiles = fs
      .readdirSync(migrationsDir)
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    const { rows: applied } = await client.query(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((row) => row.filename));
    const pending = allFiles.filter((filename) => !appliedSet.has(filename));

    if (pending.length === 0) {
      console.log('✅ Database migrations: up to date');
    } else {
      console.log(`Running ${pending.length} pending migration(s)...`);

      for (const filename of pending) {
        const filepath = path.join(migrationsDir, filename);
        const sql = fs.readFileSync(filepath, 'utf8');

        console.log(`  → Applying: ${filename}`);
        await client.query('BEGIN');

        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [filename]
          );
          await client.query('COMMIT');
          console.log(`  ✓ Applied: ${filename}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`  ✗ FAILED: ${filename}`);
          console.error('  Error:', err.message);
          throw err;
        }
      }

      console.log(`✅ Migrations complete — ${pending.length} applied.`);
    }

    await ensureBootstrapAdmin(client);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
