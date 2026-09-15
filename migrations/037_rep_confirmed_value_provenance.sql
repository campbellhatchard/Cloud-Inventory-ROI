/* v6.9.6 — server-governed, exact-value internal Rep Confirmed provenance. */
ALTER TABLE roi_value_events DROP CONSTRAINT IF EXISTS roi_value_events_event_type_check;
ALTER TABLE roi_value_events ADD CONSTRAINT roi_value_events_event_type_check
  CHECK(event_type IN ('prospect_submitted','customer_revalidated','customer_provided','rep_confirmed','rep_updated','legacy_scenario_snapshot','legacy_prospect_recovered'));

CREATE INDEX IF NOT EXISTS idx_roi_value_events_rep_confirmed
  ON roi_value_events(base_id,canonical_input,created_at DESC)
  WHERE event_type='rep_confirmed';

INSERT INTO audit_log(action,entity_type,detail)
VALUES('system.migration_applied','schema',jsonb_build_object(
  'migration','037_rep_confirmed_value_provenance',
  'note','Immutable exact-value internal Rep Confirmed events; never customer evidence',
  'applied_at',NOW()
));
