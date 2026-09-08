/* v6.5.2 — immutable Prospect submissions and opportunity-wide ROI value lineage. */
ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS discovery_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE RESTRICT,
  base_id UUID NOT NULL,
  source_scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  source_scenario_version INTEGER,
  submission_number INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answer_count INTEGER NOT NULL DEFAULT 0,
  submitted_by VARCHAR(30) NOT NULL DEFAULT 'prospect',
  submission_hash TEXT NOT NULL,
  client_submission_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(discovery_session_id, submission_number),
  UNIQUE(discovery_session_id, client_submission_id)
);
CREATE INDEX IF NOT EXISTS idx_discovery_submissions_base ON discovery_submissions(base_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_submissions_session ON discovery_submissions(discovery_session_id, submission_number DESC);

CREATE TABLE IF NOT EXISTS discovery_submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES discovery_submissions(id) ON DELETE RESTRICT,
  question_id VARCHAR(80) NOT NULL,
  question_text TEXT NOT NULL,
  section TEXT,
  classification VARCHAR(40) NOT NULL CHECK(classification IN ('financial_input','value_engineering','context')),
  canonical_input VARCHAR(100),
  answer_text TEXT,
  normalized_value NUMERIC,
  unit VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON discovery_submission_answers(submission_id);

CREATE TABLE IF NOT EXISTS roi_value_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id UUID NOT NULL,
  canonical_input VARCHAR(100) NOT NULL,
  question_id VARCHAR(80),
  event_type VARCHAR(40) NOT NULL CHECK(event_type IN ('prospect_submitted','customer_revalidated','customer_provided','rep_updated','legacy_scenario_snapshot','legacy_prospect_recovered')),
  value_text TEXT,
  normalized_value NUMERIC,
  currency VARCHAR(12),
  unit VARCHAR(80),
  source_scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  source_scenario_version INTEGER,
  discovery_submission_id UUID REFERENCES discovery_submissions(id) ON DELETE RESTRICT,
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  stakeholder_name_snapshot VARCHAR(120),
  stakeholder_title_snapshot VARCHAR(120),
  evidence_source TEXT,
  evidence_note TEXT,
  evidence_date DATE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provenance_state VARCHAR(40) NOT NULL,
  supersedes_event_id UUID REFERENCES roi_value_events(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roi_value_events_base_input ON roi_value_events(base_id, canonical_input, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roi_value_events_submission ON roi_value_events(discovery_submission_id) WHERE discovery_submission_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS scenario_roi_value_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
  base_id UUID NOT NULL,
  scenario_version INTEGER NOT NULL,
  canonical_input VARCHAR(100) NOT NULL,
  value_text TEXT,
  normalized_value NUMERIC,
  unit VARCHAR(80),
  currency VARCHAR(12),
  field_state VARCHAR(40),
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  origin_event_id UUID REFERENCES roi_value_events(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id, canonical_input)
);
CREATE INDEX IF NOT EXISTS idx_scenario_roi_snapshots_base ON scenario_roi_value_snapshots(base_id, scenario_version, canonical_input);

/* Historical evidence is append-only. Corrections are new events/submissions. */
CREATE OR REPLACE FUNCTION reject_immutable_value_history_change() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION '% is immutable; append a correction event instead', TG_TABLE_NAME; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS immutable_discovery_submissions ON discovery_submissions;
CREATE TRIGGER immutable_discovery_submissions BEFORE UPDATE OR DELETE ON discovery_submissions FOR EACH ROW EXECUTE FUNCTION reject_immutable_value_history_change();
DROP TRIGGER IF EXISTS immutable_discovery_submission_answers ON discovery_submission_answers;
CREATE TRIGGER immutable_discovery_submission_answers BEFORE UPDATE OR DELETE ON discovery_submission_answers FOR EACH ROW EXECUTE FUNCTION reject_immutable_value_history_change();
DROP TRIGGER IF EXISTS immutable_roi_value_events ON roi_value_events;
CREATE TRIGGER immutable_roi_value_events BEFORE UPDATE OR DELETE ON roi_value_events FOR EACH ROW EXECUTE FUNCTION reject_immutable_value_history_change();
/* Honest legacy backfill: snapshot what each scenario stored without recalculating it. */
INSERT INTO scenario_roi_value_snapshots(scenario_id,base_id,scenario_version,canonical_input,value_text,normalized_value,unit,currency,field_state,provenance,captured_at)
SELECT s.id,s.base_id,s.version,e.key,e.value #>> '{}',
  CASE WHEN (e.value #>> '{}') ~ '^[-+]?[0-9]*\.?[0-9]+$' THEN (e.value #>> '{}')::numeric END,
  NULL,s.data->>'currency',s.data->'fieldStates'->>e.key,
  COALESCE(s.data->'fieldProvenance'->e.key,'{"source":"Legacy provenance snapshot","legacy":true}'::jsonb),s.created_at
FROM scenarios s CROSS JOIN LATERAL jsonb_each(COALESCE(s.data,'{}'::jsonb)) e
WHERE e.key = ANY(ARRAY['userCount','laborCost','labor','laborWastePct','currentAccuracy','annualWriteOff','inventoryValue','invTurnsCurrent','revenue','otifBaseline','otifTarget','contributionMarginPct','lostSalesYr','servicePenaltyCostYr','expediteSpendYr','downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr','countDaysYr','countPeople','ordersPerYr','orderErrorPct','costPerError','costPerOrder','pickRateGainPct','repeatVisitsYr','costPerTruckRoll','fieldInvValue','fieldLeakageRate','fieldLocations','fieldReconcilePerYr','fieldReconcilePersonHours','itCost','discRate'])
ON CONFLICT(scenario_id,canonical_input) DO NOTHING;

/* A legacy event makes the value visible in the opportunity timeline without
   claiming that an original customer submission can be reconstructed. */
INSERT INTO roi_value_events(base_id,canonical_input,event_type,value_text,normalized_value,currency,unit,source_scenario_id,source_scenario_version,evidence_source,evidence_note,evidence_date,provenance_state,created_at)
SELECT x.base_id,x.canonical_input,'legacy_scenario_snapshot',x.value_text,x.normalized_value,x.currency,x.unit,x.scenario_id,x.scenario_version,
  CASE WHEN x.field_state='confirmed_prospect' THEN 'Prospect provenance recorded in scenario' ELSE 'Existing scenario value' END,
  CASE WHEN x.field_state='confirmed_prospect' THEN 'Original immutable submission unavailable' ELSE 'Legacy provenance snapshot; exact original evidence unavailable' END,
  x.captured_at::date,COALESCE(x.field_state,'estimated'),x.captured_at
FROM scenario_roi_value_snapshots x
WHERE NOT EXISTS(SELECT 1 FROM roi_value_events e WHERE e.source_scenario_id=x.scenario_id AND e.canonical_input=x.canonical_input AND e.event_type='legacy_scenario_snapshot');

UPDATE scenario_roi_value_snapshots x SET origin_event_id=e.id
FROM roi_value_events e WHERE e.source_scenario_id=x.scenario_id AND e.canonical_input=x.canonical_input AND e.event_type='legacy_scenario_snapshot' AND x.origin_event_id IS NULL;

DROP TRIGGER IF EXISTS immutable_scenario_roi_value_snapshots ON scenario_roi_value_snapshots;
CREATE TRIGGER immutable_scenario_roi_value_snapshots BEFORE UPDATE OR DELETE ON scenario_roi_value_snapshots FOR EACH ROW EXECUTE FUNCTION reject_immutable_value_history_change();

/* Recover only what the legacy database still genuinely contains. These are
   explicitly labelled recovered, never represented as original proof. */
INSERT INTO discovery_submissions(discovery_session_id,base_id,source_scenario_id,source_scenario_version,submission_number,submitted_at,answer_count,submitted_by,submission_hash,client_submission_id)
SELECT ds.id,s.base_id,s.id,s.version,1,ds.submitted_at,COUNT(da.id),'legacy_recovery',md5(COALESCE(string_agg(da.question_id||'='||da.answer,'|' ORDER BY da.question_id),'')),'legacy_recovered_'||ds.id
FROM discovery_sessions ds JOIN scenarios s ON s.id=ds.scenario_id JOIN discovery_answers da ON da.session_id=ds.id AND da.entered_by='prospect' AND BTRIM(COALESCE(da.answer,''))<>''
WHERE ds.submitted_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM discovery_submissions z WHERE z.discovery_session_id=ds.id)
GROUP BY ds.id,s.base_id,s.id,s.version,ds.submitted_at;

INSERT INTO discovery_submission_answers(submission_id,question_id,question_text,section,classification,answer_text)
SELECT sub.id,da.question_id,'Legacy question '||da.question_id,'Recovered legacy Prospect Link','context',da.answer
FROM discovery_submissions sub JOIN discovery_answers da ON da.session_id=sub.discovery_session_id AND da.entered_by='prospect' AND BTRIM(COALESCE(da.answer,''))<>''
WHERE sub.submitted_by='legacy_recovery' ON CONFLICT(submission_id,question_id) DO NOTHING;

UPDATE discovery_sessions ds SET submission_count=GREATEST(ds.submission_count,1),last_submitted_at=COALESCE(ds.last_submitted_at,ds.submitted_at)
WHERE EXISTS(SELECT 1 FROM discovery_submissions sub WHERE sub.discovery_session_id=ds.id AND sub.submitted_by='legacy_recovery');

INSERT INTO audit_log(action,entity_type,detail) VALUES('system.migration_applied','schema',jsonb_build_object('migration','029_value_validation_history','note','Immutable prospect submissions, ROI value events, and scenario value lineage','applied_at',NOW()));
