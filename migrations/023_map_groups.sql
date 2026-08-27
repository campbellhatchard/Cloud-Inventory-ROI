-- Flexible groupings for Mutual Action Plans. Existing plans keep working:
-- the client derives groups from milestone.phase until the plan is next saved.
ALTER TABLE mutual_action_plans
  ADD COLUMN IF NOT EXISTS groups JSONB NOT NULL DEFAULT '[]'::jsonb;
