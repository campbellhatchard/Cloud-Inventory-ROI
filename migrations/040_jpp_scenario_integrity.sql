/* v6.9.27 — keep Joint Project Plans attached only to real scenarios. */
UPDATE mutual_action_plans m
SET scenario_id = NULL
WHERE scenario_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM scenarios s WHERE s.id = m.scenario_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mutual_action_plans_scenario_id_fkey'
  ) THEN
    ALTER TABLE mutual_action_plans
      ADD CONSTRAINT mutual_action_plans_scenario_id_fkey
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mutual_action_plans_scenario
  ON mutual_action_plans(scenario_id);
