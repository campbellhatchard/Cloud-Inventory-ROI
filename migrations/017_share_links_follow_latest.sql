/* ═══════════════════════════════════════════════════════════════════
   017_share_links_follow_latest.sql

   Changes share links to resolve to the latest version of a scenario
   rather than the specific row that existed when the link was created.

   IMPORTANT HOTFIX v4.9.2:
   scenario_base_id stores scenarios.base_id, which is a version-group key.
   In historical data, base_id is not guaranteed to also exist as a row id in
   scenarios.id. Therefore scenario_base_id must NOT have a foreign key to
   scenarios(id). The lookup joins scenario_base_id to scenarios.base_id.

   This migration is idempotent and defensive: it removes the incorrect FK if
   it exists from a failed/partial/manual attempt, then backfills from the
   original scenario_id.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE scenario_shares
  ADD COLUMN IF NOT EXISTS scenario_base_id UUID;

ALTER TABLE business_case_shares
  ADD COLUMN IF NOT EXISTS scenario_base_id UUID;

/* Remove the incorrect FK constraint from the original 017 draft if it exists.
   scenario_base_id is a base_id grouping key, not necessarily scenarios.id. */
ALTER TABLE scenario_shares
  DROP CONSTRAINT IF EXISTS scenario_shares_scenario_base_id_fkey;

ALTER TABLE business_case_shares
  DROP CONSTRAINT IF EXISTS business_case_shares_scenario_base_id_fkey;

/* Back-fill: find the base_id for each existing share's scenario_id. */
UPDATE scenario_shares ss
SET scenario_base_id = s.base_id
FROM scenarios s
WHERE ss.scenario_base_id IS NULL
  AND ss.scenario_id IS NOT NULL
  AND s.id = ss.scenario_id;

UPDATE business_case_shares bs
SET scenario_base_id = s.base_id
FROM scenarios s
WHERE bs.scenario_base_id IS NULL
  AND bs.scenario_id IS NOT NULL
  AND s.id = bs.scenario_id;

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
    'note', 'Share links now resolve to the latest scenario version via scenario_base_id; v4.9.2 removes incorrect FK to scenarios(id)',
    'applied_at', NOW()
  )
);
