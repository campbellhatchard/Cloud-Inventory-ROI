/* v6.9.30 — durable, idempotent, server-authoritative ROI value application. */
CREATE TABLE IF NOT EXISTS roi_value_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
  base_id UUID NOT NULL,
  canonical_input VARCHAR(100) NOT NULL,
  source_value_event_id UUID NOT NULL REFERENCES roi_value_events(id) ON DELETE RESTRICT,
  discovery_submission_id UUID REFERENCES discovery_submissions(id) ON DELETE RESTRICT,
  previous_stored_value JSONB,
  applied_stored_value JSONB NOT NULL,
  applied_display_value NUMERIC NOT NULL,
  applied_field_state VARCHAR(40) NOT NULL,
  provenance JSONB NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_scenario_id, source_value_event_id, canonical_input),
  UNIQUE(target_scenario_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_roi_value_applications_scenario_input
  ON roi_value_applications(target_scenario_id, canonical_input, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roi_value_applications_submission
  ON roi_value_applications(discovery_submission_id)
  WHERE discovery_submission_id IS NOT NULL;

/* Keep application scope valid even if a future caller bypasses the HTTP
   service. The database is the final authority for opportunity/evidence
   identity. */
CREATE OR REPLACE FUNCTION validate_roi_value_application_scope()
RETURNS TRIGGER AS $$
DECLARE
  scenario_base UUID;
  event_base UUID;
  event_input VARCHAR(100);
  event_submission UUID;
BEGIN
  SELECT base_id INTO scenario_base FROM scenarios WHERE id=NEW.target_scenario_id;
  SELECT base_id,canonical_input,discovery_submission_id
    INTO event_base,event_input,event_submission
    FROM roi_value_events WHERE id=NEW.source_value_event_id;
  IF scenario_base IS NULL OR event_base IS NULL
     OR scenario_base IS DISTINCT FROM NEW.base_id
     OR event_base IS DISTINCT FROM NEW.base_id
     OR event_input IS DISTINCT FROM NEW.canonical_input
     OR event_submission IS DISTINCT FROM NEW.discovery_submission_id THEN
    RAISE EXCEPTION 'ROI value application scope does not match scenario and evidence authority';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_roi_value_application_scope_trigger ON roi_value_applications;
CREATE TRIGGER validate_roi_value_application_scope_trigger
  BEFORE INSERT ON roi_value_applications
  FOR EACH ROW EXECUTE FUNCTION validate_roi_value_application_scope();

/* An application is historical evidence. Corrections are later applications;
   an earlier application is never rewritten or deleted. */
DROP TRIGGER IF EXISTS immutable_roi_value_applications ON roi_value_applications;
CREATE TRIGGER immutable_roi_value_applications
  BEFORE UPDATE OR DELETE ON roi_value_applications
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_value_history_change();

/* Submission notification is a durable outbox. Submission success never
   depends on the email provider, and failed deliveries remain retryable. */
CREATE TABLE IF NOT EXISTS prospect_submission_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES discovery_submissions(id) ON DELETE RESTRICT,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','sending','sent','failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_submission_notifications_due
  ON prospect_submission_notifications(status,next_attempt_at)
  WHERE status IN ('pending','failed','sending');

INSERT INTO audit_log(action,entity_type,detail)
VALUES('system.migration_applied','schema',jsonb_build_object(
  'migration','042_server_authoritative_value_application',
  'note','Durable idempotent value application authority',
  'applied_at',NOW()
));
