-- Preserve every historical version while restoring the invariant that an
-- opportunity has at most one active current scenario.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY base_id
           ORDER BY version DESC, updated_at DESC, created_at DESC, id DESC
         ) AS position
  FROM scenarios
  WHERE is_current = TRUE AND deleted_at IS NULL
)
UPDATE scenarios s
SET is_current = FALSE,
    updated_at = NOW()
FROM ranked r
WHERE s.id = r.id AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scenarios_one_active_current_per_base
  ON scenarios(base_id)
  WHERE is_current = TRUE AND deleted_at IS NULL;
