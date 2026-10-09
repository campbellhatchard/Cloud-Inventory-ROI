/* v6.9.36 — server-authoritative Admin bulk cleanup governance.
   Adds forward-looking creator attribution without fabricating legacy creators,
   one-use preview metadata, immutable cleanup batches and record-to-batch audit
   references. Governed business records remain soft removable only. */

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE discovery_sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON scenarios(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_created_by ON discovery_sessions(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_cleanup_dates ON customers(created_at,updated_at,deleted_at);
CREATE INDEX IF NOT EXISTS idx_scenarios_cleanup_dates ON scenarios(created_at,updated_at,deleted_at);
CREATE INDEX IF NOT EXISTS idx_discovery_cleanup_dates ON discovery_sessions(created_at,updated_at,cleanup_removed_at);
CREATE INDEX IF NOT EXISTS idx_handoffs_cleanup_dates ON handoffs(created_at,updated_at,deleted_at);

ALTER TABLE admin_cleanup_previews
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS record_count INTEGER,
  ADD COLUMN IF NOT EXISTS dependency_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS admin_cleanup_batches (
  id UUID PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  preview_id UUID NOT NULL REFERENCES admin_cleanup_previews(id) ON DELETE RESTRICT,
  mode VARCHAR(20) NOT NULL CHECK(mode IN ('selected','all')),
  search_text TEXT NOT NULL DEFAULT '',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason VARCHAR(40) NOT NULL,
  note TEXT,
  requested_count INTEGER NOT NULL CHECK(requested_count >= 0),
  removed_count INTEGER NOT NULL CHECK(removed_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK(skipped_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_count >= 0),
  typed_confirmation_used BOOLEAN NOT NULL DEFAULT FALSE,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cleanup_batches_admin_created
  ON admin_cleanup_batches(admin_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_batches_preview
  ON admin_cleanup_batches(preview_id);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS cleanup_batch_id UUID REFERENCES admin_cleanup_batches(id) ON DELETE SET NULL;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS cleanup_batch_id UUID REFERENCES admin_cleanup_batches(id) ON DELETE SET NULL;
ALTER TABLE discovery_sessions ADD COLUMN IF NOT EXISTS cleanup_batch_id UUID REFERENCES admin_cleanup_batches(id) ON DELETE SET NULL;
ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS cleanup_batch_id UUID REFERENCES admin_cleanup_batches(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION reject_admin_cleanup_batch_change()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin cleanup batch history is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_admin_cleanup_batches ON admin_cleanup_batches;
CREATE TRIGGER immutable_admin_cleanup_batches
  BEFORE UPDATE OR DELETE ON admin_cleanup_batches
  FOR EACH ROW EXECUTE FUNCTION reject_admin_cleanup_batch_change();

INSERT INTO audit_log(action,entity_type,detail)
VALUES('system.migration_applied','schema',jsonb_build_object(
  'migration','044_admin_bulk_cleanup',
  'note','Server-authoritative date filtering, exact preview snapshots, immutable cleanup batches and creator attribution',
  'applied_at',NOW()
));
