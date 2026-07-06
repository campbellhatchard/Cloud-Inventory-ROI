/* ═══════════════════════════════════════════════════════════════════
   005_maps_stakeholders.sql — Mutual Action Plans + Stakeholder Maps
   ═══════════════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS mutual_action_plans (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id       UUID,
  company           VARCHAR(200) NOT NULL DEFAULT '',
  title             VARCHAR(200) NOT NULL DEFAULT 'Mutual Action Plan',
  target_close_date DATE,
  token             TEXT         UNIQUE,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  milestones        JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maps_owner  ON mutual_action_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_maps_token  ON mutual_action_plans(token);

CREATE TABLE IF NOT EXISTS stakeholders (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company     VARCHAR(200) NOT NULL DEFAULT '',
  scenario_id UUID,
  name        VARCHAR(120) NOT NULL,
  title       VARCHAR(120) NOT NULL DEFAULT '',
  role        VARCHAR(30)  NOT NULL DEFAULT 'influencer'
              CHECK (role IN ('champion','economic_buyer','technical_buyer','influencer','blocker','end_user')),
  influence   SMALLINT     NOT NULL DEFAULT 3 CHECK (influence BETWEEN 1 AND 5),
  support     SMALLINT     NOT NULL DEFAULT 3 CHECK (support BETWEEN 1 AND 5),
  engaged     BOOLEAN      NOT NULL DEFAULT FALSE,
  notes       TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stake_owner   ON stakeholders(owner_id);
CREATE INDEX IF NOT EXISTS idx_stake_company ON stakeholders(company);

DROP TRIGGER IF EXISTS trg_maps_updated  ON mutual_action_plans;
CREATE TRIGGER trg_maps_updated  BEFORE UPDATE ON mutual_action_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_stake_updated ON stakeholders;
CREATE TRIGGER trg_stake_updated BEFORE UPDATE ON stakeholders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
