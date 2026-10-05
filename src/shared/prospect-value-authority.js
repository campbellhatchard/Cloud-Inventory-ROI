'use strict';

const { isFinancialInput } = require('./value-history');
const { problem } = require('./api-problem');

function rejection(value) { return { ok: false, status: value.status, code: value.code, error: value.detail, problem: value }; }

/* One authority owns the full event -> immutable submission -> immutable answer
   relationship. It deliberately does not join mutable discovery_sessions data:
   a submitted value is authorized by the opportunity base_id frozen on the
   submission and by the matching immutable answer. */
async function loadApplicableValueEvent({ query, eventId, baseId, canonicalInput }) {
  if (!String(eventId || '').trim()) {
    return rejection(problem({ status: 400, code: 'INVALID_VALUE_EVENT_ID', title: 'Invalid value event', detail: 'A valid value event is required.', phase: 'value-event-validation' }));
  }
  if (!isFinancialInput(String(canonicalInput || ''))) {
    return rejection(problem({ status: 400, code: 'UNKNOWN_FINANCIAL_INPUT', title: 'Unknown financial input', detail: 'This field is not a governed financial ROI input.', phase: 'value-event-validation' }));
  }

  const result = await query(`SELECT e.*,u.username actor_username,u.is_active internal_actor_valid,
      ds.base_id submission_base_id,
      (dsa.id IS NOT NULL) submission_answer_valid
    FROM roi_value_events e
    LEFT JOIN users u ON u.id=e.actor_user_id
    LEFT JOIN discovery_submissions ds ON ds.id=e.discovery_submission_id
    LEFT JOIN discovery_submission_answers dsa
      ON dsa.submission_id=e.discovery_submission_id
     AND dsa.question_id=e.question_id
     AND dsa.canonical_input=e.canonical_input
     AND dsa.normalized_value IS NOT DISTINCT FROM e.normalized_value
    WHERE e.id::text=$1 AND e.base_id=$2 AND e.canonical_input=$3`, [String(eventId), baseId, canonicalInput]);

  const event = result.rows && result.rows[0];
  if (!event) {
    return rejection(problem({ status: 404, code: 'VALUE_EVENT_NOT_FOUND', title: 'Value event not found', detail: 'Value event not found for this customer opportunity.', phase: 'value-event-lookup' }));
  }
  if (event.event_type === 'prospect_submitted' && (!event.discovery_submission_id || String(event.submission_base_id || '') !== String(baseId) || event.submission_answer_valid === false)) {
    return rejection(problem({ status: 409, code: 'PROSPECT_EVIDENCE_MISMATCH', title: 'Prospect evidence mismatch', detail: 'The submitted Prospect evidence is not linked to this customer opportunity and immutable answer.', phase: 'prospect-evidence-validation' }));
  }
  return { ok: true, event };
}

function buildValueApplication(event, canonicalInput) {
  const eventType = event.event_type;
  return {
    canonicalInput,
    value: event.normalized_value ?? event.value_text,
    fieldState: eventType === 'prospect_submitted'
      ? 'confirmed_prospect'
      : ['customer_revalidated', 'customer_provided'].includes(eventType)
        ? 'confirmed_customer'
        : eventType === 'rep_confirmed' && event.internal_actor_valid
          ? 'confirmed'
          : 'estimated',
    provenance: {
      eventId: event.id,
      source: eventType === 'rep_confirmed' ? 'Internally confirmed' : eventType,
      date: event.evidence_date || event.created_at,
      confirmedBy: event.actor_username,
      note: event.evidence_note,
      stakeholderId: event.stakeholder_id,
      stakeholder: event.stakeholder_name_snapshot
    },
    dirty: true,
    scenarioUnchanged: true
  };
}

async function resolveValueApplication(args) {
  const authority = await loadApplicableValueEvent(args);
  return authority.ok ? { ok: true, event: authority.event, apply: buildValueApplication(authority.event, args.canonicalInput) } : authority;
}

module.exports = { loadApplicableValueEvent, buildValueApplication, resolveValueApplication };
