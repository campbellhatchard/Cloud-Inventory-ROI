/* ═══════════════════════════════════════════════════════════════════
   src/customers.js — first-class customer helpers
   A customer is owned by an AE and identified by a stable id. New scenarios
   link to a customer via ensureCustomer() (upsert on owner + case-insensitive
   name), matching how customers were previously derived from `company`.
   ═══════════════════════════════════════════════════════════════════ */

/* Ensure a customer row exists for (ownerId, name); return its id.
   Accepts an optional query executor `q` so it can run inside a transaction
   (pass the transaction client's query fn); defaults to the pool. */
async function ensureCustomer(ownerId, name, q) {
  const runner = q || require('./db').query;
  const clean = (name || '').trim();
  if (!ownerId || !clean) return null;
  /* Upsert: insert if new, else return the existing canonical row. */
  const { rows } = await runner(
    `INSERT INTO customers (name, owner_id)
     VALUES ($1, $2)
     ON CONFLICT (owner_id, LOWER(name))
       DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [clean, ownerId]
  );
  return rows[0] ? rows[0].id : null;
}

/* List customers for an owner (AE view). Includes scenario counts. */
async function listCustomersForOwner(ownerId) {
  const { query } = require('./db');
  const { rows } = await query(
    `SELECT c.id, c.name, c.created_at, c.updated_at, c.owner_id,
            u.username AS owner_username,
            COUNT(s.id) FILTER (WHERE s.deleted_at IS NULL) AS scenario_count
       FROM customers c
       LEFT JOIN users u ON u.id = c.owner_id
       LEFT JOIN scenarios s ON s.customer_id = c.id
      WHERE c.owner_id = $1
      GROUP BY c.id, u.username
      ORDER BY c.name ASC`,
    [ownerId]
  );
  return rows.map(mapCustomerRow);
}

/* List ALL customers across every AE (SE / admin cross-customer view). */
async function listAllCustomers() {
  const { query } = require('./db');
  const { rows } = await query(
    `SELECT c.id, c.name, c.created_at, c.updated_at, c.owner_id,
            u.username AS owner_username,
            COUNT(s.id) FILTER (WHERE s.deleted_at IS NULL) AS scenario_count
       FROM customers c
       LEFT JOIN users u ON u.id = c.owner_id
       LEFT JOIN scenarios s ON s.customer_id = c.id
      GROUP BY c.id, u.username
      ORDER BY c.name ASC`
  );
  return rows.map(mapCustomerRow);
}

function mapCustomerRow(r) {
  return {
    id: r.id, name: r.name,
    ownerId: r.owner_id, ownerUsername: r.owner_username || null,
    scenarioCount: Number(r.scenario_count) || 0,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

/* Fetch a single customer, scoped to owner unless the caller is privileged
   (SE/admin). `allowAny` = cross-customer read (Phase 2 will set this for SEs). */
async function getCustomer(id, ownerId, allowAny = false) {
  const { query } = require('./db');
  const { rows } = await query(
    `SELECT id, name, owner_id, created_at, updated_at FROM customers WHERE id = $1`,
    [id]
  );
  if (!rows.length) return null;
  const c = rows[0];
  if (!allowAny && c.owner_id !== ownerId) return null;
  return { id: c.id, name: c.name, ownerId: c.owner_id, createdAt: c.created_at, updatedAt: c.updated_at };
}

module.exports = { ensureCustomer, listCustomersForOwner, listAllCustomers, getCustomer };
