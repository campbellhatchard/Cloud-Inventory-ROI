/* ═══════════════════════════════════════════════════════════════════
   012_handoffs.sql — SE Solution Fit & Handoff records (phase 1b)
   ───────────────────────────────────────────────────────────────────
   One handoff record per customer, holding the solution-fit / gap /
   services-handoff data. The flexible, free-text-heavy content
   (opportunity, architecture, partner, processes, gaps, interfaces,
   drivers) lives in a JSONB `data` blob — like scenarios.data — while
   a few queryable columns are promoted for list views and scoping.

   Keyed to the first-class customer (migration 011). Owner is the AE who
   owns the customer; the SE role (phase 2) will get cross-customer access.
   Additive and idempotent.
   ═══════════════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS handoffs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  owner_id      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- AE who owns the customer
  data          JSONB       NOT NULL DEFAULT '{}'::jsonb,                       -- full handoff state
  readiness     INTEGER     NOT NULL DEFAULT 0,                                 -- cached 0–100 score
  status        VARCHAR(20) NOT NULL DEFAULT 'not_ready',                       -- not_ready | conditional | ready
  last_edited_by UUID       REFERENCES users(id) ON DELETE SET NULL,           -- SE or AE who last saved
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* One handoff per customer. */
CREATE UNIQUE INDEX IF NOT EXISTS idx_handoffs_customer ON handoffs(customer_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_owner ON handoffs(owner_id);
