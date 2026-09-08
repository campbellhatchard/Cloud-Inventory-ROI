/* Sales Manager dashboard: additive multi-role support and internal actions. */
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

UPDATE users
SET roles = ARRAY[role]
WHERE roles IS NULL OR cardinality(roles) = 0;

CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

CREATE TABLE IF NOT EXISTS sales_manager_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  owner VARCHAR(255),
  due_date DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','done')),
  related_risk TEXT,
  expected_outcome TEXT,
  customer_commitment_sought TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_actions_scenario ON sales_manager_actions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_manager_actions_due ON sales_manager_actions(due_date) WHERE status <> 'done';

DROP TRIGGER IF EXISTS trg_manager_actions_updated ON sales_manager_actions;
CREATE TRIGGER trg_manager_actions_updated BEFORE UPDATE ON sales_manager_actions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
