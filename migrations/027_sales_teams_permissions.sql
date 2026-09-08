/* Sales teams, multi-team membership, Solution Fit responsibility and history. */
CREATE TABLE IF NOT EXISTS sales_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  primary_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_teams_name ON sales_teams(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_sales_teams_leader ON sales_teams(primary_leader_id) WHERE status='active';

CREATE TABLE IF NOT EXISTS sales_team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES sales_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_functions TEXT[] NOT NULL DEFAULT '{}',
  effective_start DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id,user_id),
  CHECK (effective_end IS NULL OR effective_end >= effective_start)
);
CREATE INDEX IF NOT EXISTS idx_team_membership_user ON sales_team_memberships(user_id,team_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_team_membership_team ON sales_team_memberships(team_id,user_id) WHERE is_active;

ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS primary_se_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS additional_se_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE handoffs SET created_by=COALESCE(created_by,last_edited_by) WHERE created_by IS NULL;
CREATE INDEX IF NOT EXISTS idx_handoffs_primary_se ON handoffs(primary_se_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_additional_se ON handoffs USING GIN(additional_se_ids);

CREATE TABLE IF NOT EXISTS handoff_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  field_path TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handoff_history_handoff ON handoff_change_history(handoff_id,changed_at DESC);

CREATE TABLE IF NOT EXISTS handoff_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handoff_attachments_handoff ON handoff_attachments(handoff_id);

CREATE TABLE IF NOT EXISTS opportunity_team_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK(outcome IN ('won','lost')),
  owner_id_at_close UUID REFERENCES users(id) ON DELETE SET NULL,
  team_ids_at_close UUID[] NOT NULL DEFAULT '{}',
  leader_ids_at_close UUID[] NOT NULL DEFAULT '{}',
  primary_se_id_at_close UUID REFERENCES users(id) ON DELETE SET NULL,
  contributing_se_ids_at_close UUID[] NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id)
);

COMMENT ON TABLE sales_teams IS 'Record scope. Roles remain separate and determine capabilities.';
COMMENT ON COLUMN handoffs.created_by IS 'Historical creator attribution; never the exclusive authorization owner.';
COMMENT ON COLUMN handoffs.primary_se_id IS 'Technical responsibility; does not independently define access.';
