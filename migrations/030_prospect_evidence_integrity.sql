/* v6.5.3 — server-authoritative Prospect questionnaire and link boundary. */
ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS base_id UUID,
  ADD COLUMN IF NOT EXISTS source_scenario_version INTEGER,
  ADD COLUMN IF NOT EXISTS questionnaire_schema_source VARCHAR(40) NOT NULL DEFAULT 'server_generated';

UPDATE discovery_sessions ds SET base_id=s.base_id,source_scenario_version=s.version,
  questionnaire_schema_source='legacy_backfill'
FROM scenarios s WHERE s.id=ds.scenario_id AND (ds.base_id IS NULL OR ds.source_scenario_version IS NULL);

CREATE INDEX IF NOT EXISTS idx_disc_sessions_base_id ON discovery_sessions(base_id);

CREATE TABLE IF NOT EXISTS discovery_session_questions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE RESTRICT,
  question_id VARCHAR(80) NOT NULL,
  question_text TEXT NOT NULL,
  section TEXT NOT NULL,
  input_type VARCHAR(30) NOT NULL DEFAULT 'text',
  classification VARCHAR(40) NOT NULL CHECK(classification IN('financial_input','value_engineering','context')),
  canonical_input VARCHAR(100),
  unit VARCHAR(80),
  conversion VARCHAR(80) NOT NULL DEFAULT 'identity',
  placeholder TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(discovery_session_id,question_id)
);
CREATE INDEX IF NOT EXISTS idx_session_questions_session_order ON discovery_session_questions(discovery_session_id,display_order);

DROP TRIGGER IF EXISTS immutable_discovery_session_questions ON discovery_session_questions;
CREATE TRIGGER immutable_discovery_session_questions BEFORE UPDATE OR DELETE ON discovery_session_questions FOR EACH ROW EXECUTE FUNCTION reject_immutable_value_history_change();

INSERT INTO audit_log(action,entity_type,detail) VALUES('system.migration_applied','schema',jsonb_build_object('migration','030_prospect_evidence_integrity','note','Server-owned per-link questionnaire schema and explicit opportunity boundary','applied_at',NOW()));
