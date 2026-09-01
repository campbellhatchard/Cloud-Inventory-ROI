/* v6.6.1 — dependency-aware Data Cleanup & Recovery. */
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS cleanup_removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cleanup_reason VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cleanup_note TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS cleanup_removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cleanup_reason VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cleanup_note TEXT;

ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS cleanup_removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleanup_removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cleanup_reason VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cleanup_note TEXT;

ALTER TABLE handoffs
  ADD COLUMN IF NOT EXISTS cleanup_removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cleanup_reason VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cleanup_note TEXT;

CREATE TABLE IF NOT EXISTS admin_cleanup_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_records JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes'
);
CREATE INDEX IF NOT EXISTS idx_cleanup_previews_admin_expiry
  ON admin_cleanup_previews(admin_user_id,expires_at);

INSERT INTO audit_log(action,entity_type,detail)
VALUES('system.migration_applied','schema',jsonb_build_object(
  'migration','031_cleanup_recovery',
  'note','Explicit cleanup snapshots, recoverable Discovery and Solution Fit, cleanup reason metadata, and safe current-scenario governance',
  'applied_at',NOW()
));
