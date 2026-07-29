/* ═══════════════════════════════════════════════════════════════════
   008_engagement_tracking.sql — prospect engagement tracking (v3.1)
   - Discovery link open/activity counters on discovery_sessions
   - Business-case shareable views table (link-view approach, no pixels)
   ═══════════════════════════════════════════════════════════════════ */

/* Discovery-link engagement: opens + activity timestamps. */
ALTER TABLE discovery_sessions ADD COLUMN IF NOT EXISTS open_count    INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE discovery_sessions ADD COLUMN IF NOT EXISTS first_opened  TIMESTAMPTZ;
ALTER TABLE discovery_sessions ADD COLUMN IF NOT EXISTS last_opened   TIMESTAMPTZ;

/* Business-case shareable views. A rep generates a view token for a scenario;
   each prospect open is counted here. No tracking pixels — engagement is
   measured by views of the hosted business-case link. */
CREATE TABLE IF NOT EXISTS business_case_shares (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(64) NOT NULL UNIQUE,
  scenario_id  UUID        REFERENCES scenarios(id) ON DELETE CASCADE,
  owner_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  company      VARCHAR(255),
  title        VARCHAR(255),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  view_count   INTEGER     NOT NULL DEFAULT 0,
  first_viewed TIMESTAMPTZ,
  last_viewed  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bcshares_token ON business_case_shares(token);
CREATE INDEX IF NOT EXISTS idx_bcshares_owner ON business_case_shares(owner_id);
