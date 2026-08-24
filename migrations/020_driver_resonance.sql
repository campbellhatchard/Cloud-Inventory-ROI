/* ═══════════════════════════════════════════════════════════════════
   020_driver_resonance.sql

   Batch C — learning loop.
   Stores post-meeting rep feedback on which ROI drivers resonated with
   the prospect. One row per scenario per meeting debrief. Used to surface
   patterns across deals (which drivers work in which industries) in the
   admin Analytics tab.
   ═══════════════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS driver_resonance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   UUID NOT NULL UNIQUE REFERENCES scenarios(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  /* Which drivers landed — stored as a JSONB array of driver keys
     e.g. ["labor","otif","downtime"] */
  drivers_resonated  JSONB NOT NULL DEFAULT '[]',
  drivers_questioned JSONB NOT NULL DEFAULT '[]',
  /* Free-text notes from the debrief */
  meeting_notes TEXT,
  /* Meeting outcome */
  meeting_outcome VARCHAR(40) CHECK (meeting_outcome IN (
    'progressed','stalled','lost','no_decision','closed_won'
  )),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resonance_scenario
  ON driver_resonance(scenario_id);

CREATE INDEX IF NOT EXISTS idx_resonance_owner
  ON driver_resonance(owner_id);

CREATE INDEX IF NOT EXISTS idx_resonance_outcome
  ON driver_resonance(meeting_outcome) WHERE meeting_outcome IS NOT NULL;

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied', 'schema',
  jsonb_build_object(
    'migration', '020_driver_resonance',
    'note', 'Batch C learning loop — driver resonance feedback table',
    'applied_at', NOW()
  )
);
