/* ═══════════════════════════════════════════════════════════════════
   011_customers.sql — first-class customer entity + backfill
   ───────────────────────────────────────────────────────────────────
   Today a "customer" is only a free-text `company` string derived on the
   fly. This introduces a stable customers table and links scenarios to it
   by ID, so future features (e.g. the SE Solution Fit handoff) can attach
   to a customer without fragile name-matching.

   SAFE / ADDITIVE:
     • customers table created if absent.
     • scenarios.customer_id added NULLABLE (existing rows keep working).
     • Backfill creates one customer per distinct (owner, lower(company))
       from existing scenarios, then links each scenario. Idempotent:
       re-running matches existing customers instead of duplicating.
     • Nothing is dropped; `company` stays as a denormalized label.

   Take a database snapshot before applying (this writes real rows).
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. customers table ─────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS customers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  owner_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* One canonical customer per owner per case-insensitive name. */
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_owner_name
  ON customers(owner_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);

/* ── 2. scenarios.customer_id (nullable; FK, keep scenario if customer
        somehow removed — SET NULL rather than cascade-delete deals) ── */
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS customer_id UUID
  REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_scenarios_customer ON scenarios(customer_id);

/* ── 3. Backfill: create customers from distinct scenario companies ──
   DISTINCT ON picks the most recently-updated spelling as canonical,
   matching how /api/companies canonicalizes today. ON CONFLICT keeps it
   idempotent (re-running won't duplicate). */
INSERT INTO customers (name, owner_id, created_at, updated_at)
SELECT name, owner_id, MIN(first_seen), MAX(last_seen)
FROM (
  SELECT DISTINCT ON (owner_id, LOWER(company))
         company AS name,
         owner_id,
         created_at AS first_seen,
         updated_at AS last_seen
  FROM scenarios
  WHERE company IS NOT NULL AND company <> '' AND deleted_at IS NULL
  ORDER BY owner_id, LOWER(company), updated_at DESC
) canon
GROUP BY name, owner_id
ON CONFLICT (owner_id, LOWER(name)) DO NOTHING;

/* ── 4. Link scenarios to their customer (only where not yet linked) ── */
UPDATE scenarios s
SET customer_id = c.id
FROM customers c
WHERE s.customer_id IS NULL
  AND s.company IS NOT NULL AND s.company <> ''
  AND c.owner_id = s.owner_id
  AND LOWER(c.name) = LOWER(s.company);
