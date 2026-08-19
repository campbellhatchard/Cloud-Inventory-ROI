/* ═══════════════════════════════════════════════════════════════════
   015_scenario_shares.sql

   Trackable scenario share links.

   Previously "Share" produced index.html#share=<base64-of-the-whole-scenario>.
   That link was untrackable (nothing server-side ever saw it) and could not be
   revoked once sent, because the data travelled inside the URL itself.

   This table gives scenario shares the same treatment business-case shares
   already have: a token, view counting, and an active flag so a link can be
   switched off. Views are counted server-side on fetch — no tracking pixels.
   ────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS scenario_shares (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token         VARCHAR(128) NOT NULL UNIQUE,
  scenario_id   UUID         NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  owner_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  company       VARCHAR(255) NOT NULL DEFAULT '',
  title         VARCHAR(255) NOT NULL DEFAULT '',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  view_count    INTEGER      NOT NULL DEFAULT 0,
  first_viewed  TIMESTAMPTZ,
  last_viewed   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenario_shares_scenario ON scenario_shares(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_shares_owner    ON scenario_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_scenario_shares_token    ON scenario_shares(token);

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '015_scenario_shares',
    'note', 'Trackable, revocable scenario share links (replaces untrackable #share= payload)',
    'applied_at', NOW()
  )
);
