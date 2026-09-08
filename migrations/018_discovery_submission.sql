/* ═══════════════════════════════════════════════════════════════════
   018_discovery_submission.sql

   Adds two columns to discovery_sessions to track explicit submission:

   submitted_at  — set when the prospect clicks "Confirm and send".
                   NULL means in-progress (not yet submitted).
   answer_count  — snapshot of how many answers were recorded at
                   submission time. Saves a JOIN on every badge check.

   Previously confirmSubmit() only updated the UI. Now it calls a
   server endpoint that stamps submitted_at, fires the rep email, and
   logs the audit event. The in-app badge polls for sessions where
   submitted_at IS NOT NULL and the rep hasn't opened the tab yet.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answer_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_disc_viewed TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_disc_sessions_submitted
  ON discovery_sessions(submitted_at) WHERE submitted_at IS NOT NULL;

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '018_discovery_submission',
    'note',      'submitted_at + answer_count on discovery_sessions for rep notification',
    'applied_at', NOW()
  )
);
