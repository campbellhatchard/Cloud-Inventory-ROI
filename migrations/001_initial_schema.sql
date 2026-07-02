/* ═══════════════════════════════════════════════════════════════════
   001_initial_schema.sql  —  Cloud Inventory ROI Builder
   Initial database schema — all core tables

   Applied once. All subsequent changes go in 002_*.sql, 003_*.sql, etc.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Enable UUID generation ── */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* ═══════════════════════
   USERS
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  username            VARCHAR(100) UNIQUE NOT NULL,
  password_hash       TEXT        NOT NULL,
  role                VARCHAR(20) NOT NULL DEFAULT 'rep'
                        CHECK (role IN ('admin', 'rep')),
  first_login         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by          UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at       TIMESTAMPTZ,
  failed_login_count  INTEGER     NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ          -- NULL = not locked
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

/* ═══════════════════════
   SESSIONS
   JWT sessions — stored so logout actually invalidates tokens
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

/* ═══════════════════════
   PASSWORD RESET TOKENS
   Time-limited one-use tokens sent via email
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,            -- NULL = not yet used
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id   ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires   ON password_reset_tokens(expires_at);

/* ═══════════════════════
   SCENARIOS
   Full scenario data in JSONB — versioned, with ownership and sharing
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS scenarios (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id      UUID        NOT NULL,   -- groups all versions of one scenario
  version      INTEGER     NOT NULL DEFAULT 1,
  is_current   BOOLEAN     NOT NULL DEFAULT TRUE,
  name         VARCHAR(255) NOT NULL,
  company      VARCHAR(255) NOT NULL,
  owner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shared_with  UUID[]      NOT NULL DEFAULT '{}',
  industry     VARCHAR(50),
  deal_stage   VARCHAR(50),
  exec_audience VARCHAR(20) DEFAULT 'mixed',
  data         JSONB       NOT NULL,   -- full scenario inputs and calc results
  version_note TEXT,
  deleted_at   TIMESTAMPTZ,           -- soft delete
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (base_id, version)
);

CREATE INDEX IF NOT EXISTS idx_scenarios_owner_id    ON scenarios(owner_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_base_id     ON scenarios(base_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_is_current  ON scenarios(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_scenarios_company     ON scenarios(company);
CREATE INDEX IF NOT EXISTS idx_scenarios_shared_with ON scenarios USING GIN(shared_with);
CREATE INDEX IF NOT EXISTS idx_scenarios_deleted     ON scenarios(deleted_at) WHERE deleted_at IS NULL;

/* ═══════════════════════
   DISCOVERY SESSIONS
   Prospect link tokens tied to scenarios — anonymous (no user account needed)
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS discovery_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id      UUID        REFERENCES scenarios(id) ON DELETE SET NULL,
  owner_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token            VARCHAR(128) UNIQUE NOT NULL,
  token_rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  industry         VARCHAR(50),
  company          VARCHAR(255),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at       TIMESTAMPTZ,        -- NULL = no expiry
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disc_sessions_token      ON discovery_sessions(token);
CREATE INDEX IF NOT EXISTS idx_disc_sessions_owner_id   ON discovery_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_disc_sessions_scenario   ON discovery_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_disc_sessions_is_active  ON discovery_sessions(is_active) WHERE is_active = TRUE;

/* ═══════════════════════
   DISCOVERY ANSWERS
   Individual question answers per session — upserted as prospect fills them in
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS discovery_answers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  question_id VARCHAR(10) NOT NULL,   -- e.g. 'dq1', 'dq2' ... 'dq17'
  answer      TEXT,
  entered_by  VARCHAR(10) NOT NULL DEFAULT 'rep'
                CHECK (entered_by IN ('rep', 'prospect')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_disc_answers_session ON discovery_answers(session_id);

/* ═══════════════════════
   HELP PAGES
   "How to Use" content — admin-editable via the UI
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS help_pages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) UNIQUE NOT NULL,
  title       VARCHAR(255) NOT NULL,
  content     TEXT        NOT NULL DEFAULT '',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  updated_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_pages_slug       ON help_pages(slug);
CREATE INDEX IF NOT EXISTS idx_help_pages_sort_order ON help_pages(sort_order);

/* ═══════════════════════
   AUDIT LOG
   Immutable record of all user and system actions
   2-year retention with Admin-confirmed purge
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,   -- e.g. 'user.login', 'scenario.saved'
  entity_type VARCHAR(50),             -- e.g. 'scenario', 'user'
  entity_id   UUID,
  detail      JSONB,                   -- extra context (version number, company, etc.)
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity_type, entity_id);

/* ═══════════════════════
   PURGE CONFIRMATION TOKENS
   Signed tokens emailed to Admin before purging audit logs
   ═══════════════════════ */
CREATE TABLE IF NOT EXISTS purge_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT        NOT NULL UNIQUE,
  action      VARCHAR(20) NOT NULL CHECK (action IN ('confirm', 'cancel')),
  purge_count INTEGER     NOT NULL DEFAULT 0,   -- records that will be purged
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* ═══════════════════════
   UPDATED_AT TRIGGER FUNCTION
   Automatically updates updated_at on any row change
   ═══════════════════════ */
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Apply trigger to all tables with updated_at */
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'scenarios', 'discovery_sessions', 'discovery_answers'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;

/* ═══════════════════════
   COMMENTS — documentation embedded in schema
   ═══════════════════════ */
COMMENT ON TABLE users IS 'Application users — Admin and Rep/SE roles only. Prospects are anonymous.';
COMMENT ON TABLE sessions IS 'Active JWT sessions. Deleting a row invalidates that token immediately.';
COMMENT ON TABLE password_reset_tokens IS 'Time-limited one-use tokens for email-based password reset. Expire after 1 hour.';
COMMENT ON TABLE scenarios IS 'All scenario versions. base_id groups versions; is_current marks the active version.';
COMMENT ON TABLE discovery_sessions IS 'Anonymous prospect link tokens. No user account required for prospects.';
COMMENT ON TABLE discovery_answers IS 'Individual question answers per discovery session. Upserted by rep or prospect.';
COMMENT ON TABLE help_pages IS 'How to Use content. Admin-editable in the UI without a code deploy.';
COMMENT ON TABLE audit_log IS 'Immutable action log. 2-year retention with Admin-confirmed purge.';
COMMENT ON COLUMN scenarios.data IS 'Full JSONB snapshot of scenario inputs and calculated results at save time.';
COMMENT ON COLUMN scenarios.shared_with IS 'Array of user UUIDs with read access. Owner always has full access.';
