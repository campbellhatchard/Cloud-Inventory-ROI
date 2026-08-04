/* ═══════════════════════════════════════════════════════════════════
   009_outcome_tracking.sql — win/loss outcome tracking (phase 1: capture)
   Records the real-world result of a business case so benchmarks can later
   be calibrated against outcomes. Outcome applies to the whole scenario
   group (base_id), not an individual version.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS outcome         VARCHAR(20);   -- 'won' | 'lost' | 'no_decision' | NULL (open)
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS outcome_reason  TEXT;          -- optional note (esp. for losses)
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS realized_value  NUMERIC;       -- actual annual benefit for won deals, when known
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS outcome_at      TIMESTAMPTZ;   -- when the outcome was recorded

/* Index for outcome analytics (only rows that have an outcome). */
CREATE INDEX IF NOT EXISTS idx_scenarios_outcome ON scenarios(outcome) WHERE outcome IS NOT NULL;
