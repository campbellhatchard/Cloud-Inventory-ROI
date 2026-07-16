/* ═══════════════════════════════════════════════════════════════════
   007_analytics_benchmarks.sql — server-side analytics + custom benchmarks
   Replaces client-only localStorage storage so usage analytics are
   team-wide and admin benchmark overrides reach every user.
   ═══════════════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  event       VARCHAR(60) NOT NULL,
  data        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_event   ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

CREATE TABLE IF NOT EXISTS custom_benchmarks (
  industry    VARCHAR(30)  NOT NULL,
  metric      VARCHAR(40)  NOT NULL,
  value       NUMERIC      NOT NULL,
  updated_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (industry, metric)
);
