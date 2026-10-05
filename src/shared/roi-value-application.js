'use strict';

const { v4: uuidv4 } = require('uuid');
const { problem } = require('./api-problem');
const { loadApplicableValueEvent, buildValueApplication } = require('./prospect-value-authority');
const { normalizeExternalNumber, definitionFor, scenarioStoredValue, scenarioDisplayValue, setScenarioDisplayValue } = require('./scenario-input-storage');
const { sameValue } = require('./value-history');
const { projectScenarioData } = require('./scenario-roi-projection');

function rejection(value) {
  return { ok: false, status: value.status, code: value.code, error: value.detail, problem: value };
}

function safeIdempotencyKey(value, eventId, canonicalInput) {
  const supplied = String(value || '').trim();
  return (supplied || `${eventId}:${canonicalInput}`).slice(0, 160);
}

function currentApplicationMatches(scenario, event, canonicalInput) {
  const provenance = scenario.data?.fieldProvenance?.[canonicalInput] || {};
  const eventValue = normalizeExternalNumber(event.normalized_value ?? event.value_text);
  return String(provenance.eventId || '') === String(event.id)
    && eventValue !== null
    && sameValue(scenarioDisplayValue(scenario.data || {}, canonicalInput), eventValue);
}

async function applyRoiValueEvent({ client, scenarioId, authorizedBaseId, canonicalInput, eventId, userId, ipAddress, idempotencyKey }) {
  const locked = await client.query(
    `SELECT s.id,s.base_id,s.version,s.is_current,s.data,s.outcome,g.outcome governed_outcome
       FROM scenarios s
       LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
      WHERE s.id=$1 AND s.deleted_at IS NULL
      FOR UPDATE OF s`,
    [scenarioId]
  );
  const scenario = locked.rows[0];
  if (!scenario || String(scenario.base_id) !== String(authorizedBaseId)) {
    return rejection(problem({ status: 404, code: 'SCENARIO_NOT_FOUND', title: 'Scenario not found', detail: 'Scenario not found.', phase: 'scenario-lock' }));
  }
  if (!scenario.is_current || scenario.governed_outcome || scenario.outcome) {
    return rejection(problem({ status: 409, code: 'SCENARIO_READ_ONLY', title: 'Scenario is read only', detail: 'Closed or historical scenario values cannot be changed.', phase: 'scenario-state' }));
  }

  const authority = await loadApplicableValueEvent({
    query: client.query.bind(client),
    eventId,
    baseId: scenario.base_id,
    canonicalInput
  });
  if (!authority.ok) return authority;
  const event = authority.event;
  const displayValue = normalizeExternalNumber(event.normalized_value ?? event.value_text);
  if (displayValue === null) {
    return rejection(problem({ status: 409, code: 'VALUE_EVENT_NOT_NUMERIC', title: 'Value is not applicable', detail: 'This evidence does not contain a verified numeric value and cannot be applied.', phase: 'value-normalization' }));
  }

  const requestKey = safeIdempotencyKey(idempotencyKey, event.id, canonicalInput);
  const existing = await client.query(
    `SELECT a.*,u.username applied_by_username
       FROM roi_value_applications a
       LEFT JOIN users u ON u.id=a.actor_user_id
      WHERE a.target_scenario_id=$1
        AND ((a.source_value_event_id=$2 AND a.canonical_input=$3) OR a.idempotency_key=$4)
      ORDER BY CASE WHEN a.source_value_event_id=$2 AND a.canonical_input=$3 THEN 0 ELSE 1 END
      LIMIT 1`,
    [scenario.id, event.id, canonicalInput, requestKey]
  );
  if (existing.rows[0]) {
    if (String(existing.rows[0].source_value_event_id) !== String(event.id)
        || String(existing.rows[0].canonical_input) !== canonicalInput) {
      return rejection(problem({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED', title: 'Request key already used', detail: 'This application request key was already used for different evidence. Refresh Prospect evidence and try again.', phase: 'application-idempotency' }));
    }
    if (!currentApplicationMatches(scenario, event, canonicalInput)) {
      return rejection(problem({ status: 409, code: 'VALUE_APPLICATION_SUPERSEDED', title: 'Applied value was later changed', detail: 'This evidence was previously applied, but the current business case now uses a different value. Review Value History before applying newer evidence.', phase: 'application-idempotency' }));
    }
    const application = existing.rows[0];
    return {
      ok: true,
      alreadyApplied: true,
      application,
      scenario,
      apply: {
        ...buildValueApplication(event, canonicalInput),
        value: displayValue,
        domId: definitionFor(canonicalInput).domId,
        storedValue: application.applied_stored_value,
        provenance: application.provenance,
        applicationId: application.id,
        persisted: true,
        scenarioUnchanged: false
      }
    };
  }

  const actor = await client.query('SELECT id,username FROM users WHERE id=$1 AND is_active=TRUE', [userId]);
  if (!actor.rows[0]) {
    return rejection(problem({ status: 403, code: 'ACTIVE_USER_REQUIRED', title: 'Active user required', detail: 'An active authorized user is required to apply this value.', phase: 'actor-validation' }));
  }

  const baseApplication = buildValueApplication(event, canonicalInput);
  const applicationId = uuidv4();
  const appliedAt = new Date().toISOString();
  const provenance = {
    ...baseApplication.provenance,
    state: baseApplication.fieldState,
    value: displayValue,
    applicationId,
    appliedAt,
    appliedBy: actor.rows[0].username,
    discoverySubmissionId: event.discovery_submission_id || null,
    questionId: event.question_id || null
  };
  const patched = setScenarioDisplayValue(scenario.data || {}, canonicalInput, displayValue);
  patched.fieldStates = { ...(scenario.data?.fieldStates || {}), [canonicalInput]: baseApplication.fieldState };
  patched.fieldProvenance = { ...(scenario.data?.fieldProvenance || {}), [canonicalInput]: provenance };
  const projected = projectScenarioData(patched);
  const nextData = { ...(scenario.data || {}), ...projected };
  const definition = definitionFor(canonicalInput);
  const previousStoredValue = scenarioStoredValue(scenario.data || {}, canonicalInput);
  const appliedStoredValue = nextData[definition.storageKey];

  await client.query(
    `INSERT INTO roi_value_applications
       (id,target_scenario_id,base_id,canonical_input,source_value_event_id,
        discovery_submission_id,previous_stored_value,applied_stored_value,
        applied_display_value,applied_field_state,provenance,actor_user_id,
        idempotency_key,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11::jsonb,$12,$13,$14)`,
    [
      applicationId, scenario.id, scenario.base_id, canonicalInput, event.id,
      event.discovery_submission_id || null,
      JSON.stringify(previousStoredValue === undefined ? null : previousStoredValue),
      JSON.stringify(appliedStoredValue), displayValue, baseApplication.fieldState,
      JSON.stringify(provenance), userId,
      requestKey, appliedAt
    ]
  );
  await client.query('UPDATE scenarios SET data=$2::jsonb,updated_at=NOW() WHERE id=$1', [scenario.id, JSON.stringify(nextData)]);
  await client.query(
    `INSERT INTO audit_log(user_id,action,entity_type,entity_id,detail,ip_address)
     VALUES($1,'roi_value.applied','roi_value_application',$2,$3::jsonb,$4)`,
    [userId, applicationId, JSON.stringify({
      baseId: scenario.base_id,
      canonicalInput,
      targetScenarioId: scenario.id,
      sourceValueEventId: event.id,
      discoverySubmissionId: event.discovery_submission_id || null,
      appliedDisplayValue: displayValue
    }), ipAddress || null]
  );

  const application = {
    id: applicationId,
    target_scenario_id: scenario.id,
    base_id: scenario.base_id,
    canonical_input: canonicalInput,
    source_value_event_id: event.id,
    discovery_submission_id: event.discovery_submission_id || null,
    previous_stored_value: previousStoredValue === undefined ? null : previousStoredValue,
    applied_stored_value: appliedStoredValue,
    applied_display_value: displayValue,
    applied_field_state: baseApplication.fieldState,
    provenance,
    actor_user_id: userId,
    applied_by_username: actor.rows[0].username,
    created_at: appliedAt
  };
  return {
    ok: true,
    alreadyApplied: false,
    application,
    scenario: { ...scenario, data: nextData },
    apply: {
      ...baseApplication,
      value: displayValue,
      domId: definition.domId,
      storedValue: appliedStoredValue,
      provenance,
      applicationId,
      persisted: true,
      scenarioUnchanged: false,
      authoritativeRoi: {
        annualBenefit: nextData.annualBenefit,
        totalContractRoi: nextData.totalContractRoi,
        totalContractNpv: nextData.totalContractNpv,
        payback: nextData.payback
      }
    }
  };
}

module.exports = { applyRoiValueEvent, safeIdempotencyKey, currentApplicationMatches };
