/* v6.9.44 — governed Solution Fit evidence and attachment lifecycle.
   Extends the existing handoff_attachments foundation in place. */

ALTER TABLE handoff_attachments
  ADD COLUMN IF NOT EXISTS context_type TEXT NOT NULL DEFAULT 'GENERAL_SOLUTION_FIT',
  ADD COLUMN IF NOT EXISTS context_id TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS evidence_category TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS expected_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS expected_content_type TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS upload_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS object_etag TEXT,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_status TEXT,
  ADD COLUMN IF NOT EXISTS deletion_error TEXT;

UPDATE handoff_attachments
SET original_filename = COALESCE(original_filename, file_name),
    expected_size_bytes = COALESCE(expected_size_bytes, file_size),
    expected_content_type = COALESCE(expected_content_type, content_type),
    completed_at = COALESCE(completed_at, created_at),
    status = COALESCE(NULLIF(status, ''), 'ACTIVE')
WHERE original_filename IS NULL
   OR expected_size_bytes IS NULL
   OR expected_content_type IS NULL
   OR completed_at IS NULL
   OR status IS NULL
   OR status = '';

ALTER TABLE handoff_attachments
  ALTER COLUMN original_filename SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='handoff_attachments_context_type_check') THEN
    ALTER TABLE handoff_attachments ADD CONSTRAINT handoff_attachments_context_type_check
      CHECK (context_type IN ('GENERAL_SOLUTION_FIT','APPLICATION_PROCESS','GAP','INTEGRATION'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='handoff_attachments_context_identity_check') THEN
    ALTER TABLE handoff_attachments ADD CONSTRAINT handoff_attachments_context_identity_check
      CHECK ((context_type='GENERAL_SOLUTION_FIT' AND context_id IS NULL)
          OR (context_type<>'GENERAL_SOLUTION_FIT' AND context_id IS NOT NULL AND length(context_id)>0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='handoff_attachments_status_check') THEN
    ALTER TABLE handoff_attachments ADD CONSTRAINT handoff_attachments_status_check
      CHECK (status IN ('PENDING','ACTIVE','FAILED','REMOVED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='handoff_attachments_size_check') THEN
    ALTER TABLE handoff_attachments ADD CONSTRAINT handoff_attachments_size_check
      CHECK (COALESCE(file_size,0)>=0 AND COALESCE(expected_size_bytes,0)>=0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_handoff_attachments_active_context
  ON handoff_attachments(handoff_id,context_type,context_id,created_at DESC)
  WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_handoff_attachments_pending
  ON handoff_attachments(status,created_at)
  WHERE status IN ('PENDING','FAILED');
CREATE INDEX IF NOT EXISTS idx_handoff_attachments_customer
  ON handoff_attachments(customer_id,created_at DESC);
