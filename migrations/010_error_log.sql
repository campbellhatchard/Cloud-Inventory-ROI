/* ═══════════════════════════════════════════════════════════════════
   010_error_log.sql — production error visibility
   Captures server-side errors so they're reviewable in-app rather than
   only in transient Render logs. Additive and idempotent.
   ═══════════════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS error_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level       VARCHAR(20) NOT NULL DEFAULT 'error',  -- 'error' | 'fatal'
  source      VARCHAR(120),                          -- route/handler or process hook
  message     TEXT        NOT NULL,
  stack       TEXT,
  method      VARCHAR(10),
  path        TEXT,
  status      INTEGER,
  user_id     UUID,                                  -- best-effort; no FK (errors may precede auth)
  ip          VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_error_log_occurred ON error_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_level    ON error_log(level);

/* Retention helper: callers may periodically prune old rows. Kept as a plain
   DELETE at the app layer rather than a scheduled job for portability. */
