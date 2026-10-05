'use strict';

const { sameValue } = require('./value-history');
const { scenarioDisplayValue } = require('./scenario-input-storage');

function selectedScenarioProjection(scenario, canEdit) {
  return {
    id: scenario.id,
    version: Number(scenario.version),
    isCurrent: scenario.is_current === true,
    isClosed: Boolean(scenario.governed_outcome || scenario.outcome),
    canEdit: Boolean(canEdit)
  };
}

/* Load the complete review surface from one repeatable-read transaction. The
 * browser no longer has to join a submission list, snapshot and value-history
 * response that may have been captured at different moments. */
async function loadProspectEvidenceReview({ client, scenario, canEdit }) {
  const selectedScenario = selectedScenarioProjection(scenario, canEdit);
  const submissionResult = await client.query(
    `SELECT id,discovery_session_id,source_scenario_id,source_scenario_version,
            submission_number,submitted_at,answer_count,submitted_by,created_at
       FROM discovery_submissions
      WHERE base_id=$1
      ORDER BY submitted_at DESC,submission_number DESC,id DESC
      LIMIT 1`,
    [scenario.base_id]
  );
  const submission = submissionResult.rows[0] || null;
  if (!submission) {
    return { baseId: scenario.base_id, selectedScenario, submission: null, answers: [], rows: [], history: { selectedScenario, inputs: {} } };
  }

  const answers = (await client.query(
    `SELECT question_id,question_text,section,classification,canonical_input,
            answer_text,normalized_value,unit
       FROM discovery_submission_answers
      WHERE submission_id=$1
      ORDER BY section,question_id`,
    [submission.id]
  )).rows;
  const events = (await client.query(
    `SELECT e.*,u.username actor_username
       FROM roi_value_events e
       LEFT JOIN users u ON u.id=e.actor_user_id
      WHERE e.base_id=$1 AND e.discovery_submission_id=$2
        AND e.event_type='prospect_submitted'
      ORDER BY e.created_at,e.id`,
    [scenario.base_id, submission.id]
  )).rows;
  const eventIds = events.map(event => event.id);
  const applications = eventIds.length ? (await client.query(
    `SELECT a.*,u.username applied_by_username
       FROM roi_value_applications a
       LEFT JOIN users u ON u.id=a.actor_user_id
      WHERE a.target_scenario_id=$1 AND a.source_value_event_id=ANY($2::uuid[])
      ORDER BY a.created_at DESC`,
    [scenario.id, eventIds]
  )).rows : [];

  const answersByInput = new Map();
  for (const answer of answers) {
    if (!answer.canonical_input) continue;
    const group = answersByInput.get(answer.canonical_input) || [];
    group.push(answer);
    answersByInput.set(answer.canonical_input, group);
  }
  const eventByQuestionAndInput = new Map(events.map(event => [
    `${event.question_id || ''}\u0000${event.canonical_input}`,
    event
  ]));
  const applicationByEvent = new Map();
  for (const application of applications) {
    const key = String(application.source_value_event_id);
    if (!applicationByEvent.has(key)) applicationByEvent.set(key, application);
  }

  const fieldProvenance = scenario.data?.fieldProvenance || {};
  const rows = [];
  const inputs = {};
  for (const [canonicalInput, inputAnswers] of [...answersByInput.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const conflict = inputAnswers.length > 1;
    const answer = conflict ? null : inputAnswers[0];
    const event = answer
      ? eventByQuestionAndInput.get(`${answer.question_id || ''}\u0000${canonicalInput}`) || null
      : null;
    const application = event ? applicationByEvent.get(String(event.id)) || null : null;
    const currentValue = scenarioDisplayValue(scenario.data || {}, canonicalInput);
    const provenance = fieldProvenance[canonicalInput] || {};
    const isCurrentApplication = Boolean(event)
      && String(provenance.eventId || '') === String(event.id)
      && sameValue(currentValue, event.normalized_value ?? event.value_text);
    const status = conflict
      ? 'CONFLICT'
      : !event
        ? 'NO_VERIFIED_EVENT'
        : isCurrentApplication
          ? 'APPLIED'
          : application
            ? 'PREVIOUSLY_APPLIED'
            : selectedScenario.canEdit && selectedScenario.isCurrent && !selectedScenario.isClosed
              ? 'AVAILABLE'
              : 'READ_ONLY';
    const row = {
      canonicalInput,
      answer,
      conflictingAnswers: conflict ? inputAnswers : [],
      event,
      application,
      currentValue,
      currentProvenance: provenance,
      status
    };
    rows.push(row);
    inputs[canonicalInput] = {
      events: event ? [event] : [],
      valueUsed: currentValue === null ? null : {
        value_text: String(currentValue),
        normalized_value: currentValue,
        origin_event_id: provenance.eventId || null
      },
      application,
      status,
      conflict
    };
  }
  return { baseId: scenario.base_id, selectedScenario, submission, answers, rows, history: { selectedScenario, inputs } };
}

module.exports = { loadProspectEvidenceReview, selectedScenarioProjection };
