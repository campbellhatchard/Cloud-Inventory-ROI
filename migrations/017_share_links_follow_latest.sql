/* ═══════════════════════════════════════════════════════════════════
   017_share_links_follow_latest.sql

   Changes share links to always resolve to the latest version of a
   scenario rather than the specific row that existed when the link
   was created.

   Previously both scenario_shares and business_case_shares stored
   scenario_id (a UUID pointing at a specific version row). When a new
   version was saved, the share link still showed the old version's data.

   This migration adds scenario_base_id to both tables. The lookup query
   now JOINs on base_id + is_current=TRUE, so the link always shows
   the current version. The original scenario_id column is kept for
   audit purposes.

   Backfill: populate scenario_base_id from the scenario's base_id for
   all existing share rows. Idempotent (IF NOT EXISTS / ON CONFLICT).
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE scenario_shares
  ADD COLUMN IF NOT EXISTS scenario_base_id UUID
    REFERENCES scenarios(id) ON DELETE CASCADE;

ALTER TABLE business_case_shares
  ADD COLUMN IF NOT EXISTS scenario_base_id UUID
    REFERENCES scenarios(id) ON DELETE CASCADE;

/* Back-fill: find the base_id for each existing share's scenario_id.
   Uses the scenario's own base_id column (self-referencing — the first
   version of a scenario has base_id = its own id). */
UPDATE scenario_shares ss
SET scenario_base_id = (
  SELECT s.base_id FROM scenarios s WHERE s.id = ss.scenario_id
)
WHERE ss.scenario_base_id IS NULL AND ss.scenario_id IS NOT NULL;

UPDATE business_case_shares bs
SET scenario_base_id = (
  SELECT s.base_id FROM scenarios s WHERE s.id = bs.scenario_id
)
WHERE bs.scenario_base_id IS NULL AND bs.scenario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scenario_shares_base
  ON scenario_shares(scenario_base_id);

CREATE INDEX IF NOT EXISTS idx_bc_shares_base
  ON business_case_shares(scenario_base_id);

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '017_share_links_follow_latest',
    'note', 'Share links now resolve to the latest scenario version via scenario_base_id',
    'applied_at', NOW()
  )
);
