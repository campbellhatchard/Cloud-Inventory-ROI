'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { evaluateCriterionEvidence } = require('../src/shared/criterion-evidence');
const { deriveStageReadiness } = require('../src/shared/stage-readiness-service');

const NOW = new Date('2026-10-30T12:00:00Z');
const proposalCriterion = Object.freeze({
  id: 'proposal_alignment',
  name: 'Proposal aligns to value and criteria',
  description: 'Proposal connects scope and investment to agreed value and criteria.',
  required: true,
  source: 'proposal',
  minQuality: 'strong',
  customerValidation: true,
  freshnessDays: 45
});

function evidence(id, overrides = {}) {
  return {
    criterionId: id,
    status: 'Complete',
    quality: 'strong',
    evidence: `Customer confirmed ${id}`,
    stakeholder: 'Pat Buyer — Economic Buyer',
    source: 'Customer meeting',
    evidenceDate: '2026-10-30',
    customerValidated: true,
    amount: '$100,000',
    timing: 'Q1',
    ...overrides
  };
}

function evaluate({ scenarioData = {}, savedEvidence = {} } = {}) {
  return evaluateCriterionEvidence({
    criterion: proposalCriterion,
    scenarioData,
    savedEvidence,
    stakeholders: [],
    now: NOW
  });
}

function process(id = 'workflow-1') {
  return { id, name: 'Inbound Receiving', product: 'MEP', erp: 'JDE', source: 'standard_app', selected: true, demoStatus: 'Demonstrated', fit: 'Fit', customerValidation: 'Customer validated' };
}

const inventoryConfiguration = Object.fromEntries([
  'Lot Numbers', 'FIFO, LIFO, FEFO, etc.', 'Serial Numbers', 'LPNs / Handling Units / Packing Units',
  'Zones', 'Specialized Storage Areas', 'Defined Pick Sequence', 'Job', 'Ownership', 'Country of Origin'
].map(name => [name, { answer: 'No' }]));

function readySolutionFit() {
  return {
    primary_se_id: '00000000-0000-4000-8000-000000000001',
    data: {
      solutionScope: { primaryProduct: 'MEP', additionalProducts: [], erp: 'JDE', erpVersion: 'E1' },
      opportunity: { customer: 'Acme', products: ['MEP'], locations: '3', users: '20', problem: 'Lost time', outcome: 'Accuracy' },
      architecture: { relationship: 'Standalone', erp: 'JDE', version: 'E1' },
      partner: { involved: 'No' },
      processes: [process()], gaps: [], inventoryConfiguration,
      turnover: {
        contractStatus: 'Reviewed', projectManager: 'Pat PM', systemAdminEmail: 'admin@acme.test',
        deliveryModel: 'Cloud', internalDeliveryContact: 'Alex AE', projectStart: '2026-12-01',
        eapEdition: 'Standard', environments: '2', authorizedDefinitions: '1', authorizedLanguages: 'English',
        customerDomain: 'acme.test', sowLink: 'https://example.test/sow', mepLicenseId: 'MEP-1'
      }
    }
  };
}

function stageContext(includeProposalEvidence = true, scenarioData = {}) {
  const records = {
    criteria_addressed: evidence('criteria_addressed'),
    alternatives: evidence('alternatives'),
    preference: evidence('preference')
  };
  if (includeProposalEvidence) records.proposal_alignment = evidence('proposal_alignment');
  return {
    sc: { id: 'scenario-v6954', base_id: 'base-v6954', owner_id: 'owner-v6954', company: 'Acme', rep: 'rep', deal_stage: 'Stage 5 — Evaluate Alternatives', data: scenarioData },
    gov: { current_stage: 5, rep_assessed_stage: 5, evidence: records, certifications: {}, stage_entered_at: NOW.toISOString(), legacy_setup_needed: false },
    people: [], plan: null, handoff: readySolutionFit(), prospectInputs: [], history: [], overrides: [],
    cfg: [{
      stage_order: 5,
      stage_name: 'Evaluate Alternatives',
      minimum_roi_maturity: 4,
      minimum_commitment: 'very_strong',
      criteria: [
        { id: 'workflows', name: 'Critical workflows customer validated', required: true, source: 'solution_fit', minQuality: 'strong', customerValidation: true, freshnessDays: 45 },
        { id: 'criteria_addressed', name: 'Decision criteria addressed', required: true, source: 'evidence', minQuality: 'strong', customerValidation: true, freshnessDays: 45 },
        { id: 'alternatives', name: 'Competitive alternatives known', required: true, source: 'competitive', minQuality: 'moderate', customerValidation: false, freshnessDays: 45 },
        proposalCriterion,
        { id: 'preference', name: 'Buyer preference signal', required: true, source: 'evidence', minQuality: 'strong', customerValidation: true, freshnessDays: 30 }
      ]
    }]
  };
}

test('qualifying proposal_alignment evidence completes without proposalDraft', () => {
  const result = evaluate({ savedEvidence: { proposal_alignment: evidence('proposal_alignment') } });
  assert.equal(result.matched, true);
  assert.equal(result.complete, true);
  assert.equal(result.status, 'Complete');
  assert.equal(result.evidenceMode, 'structured');
  assert.deepEqual(result.blockedBy, []);
});

test('proposal artifact does not change valid evidence semantics', () => {
  const savedEvidence = { proposal_alignment: evidence('proposal_alignment') };
  assert.equal(evaluate({ savedEvidence }).complete, true);
  assert.equal(evaluate({ scenarioData: { proposalDraft: { title: 'Saved Proposal' } }, savedEvidence }).complete, true);
});

test('proposalDraft alone is not buyer evidence', () => {
  const result = evaluate({ scenarioData: { proposalDraft: { title: 'Seller-created Proposal' } } });
  assert.equal(result.matched, false);
  assert.equal(result.complete, false);
  assert.match(result.blockedBy.join(' '), /Criterion-specific evidence/);
});

test('invalid, unconfirmed, stale, and unrelated evidence remain incomplete', () => {
  const cases = [
    { proposal_alignment: evidence('proposal_alignment', { quality: 'weak' }) },
    { proposal_alignment: evidence('proposal_alignment', { customerValidated: false }) },
    { proposal_alignment: evidence('proposal_alignment', { evidenceDate: '2026-01-01' }) },
    { proposal_alignment: evidence('proposal_alignment', { evidence: '' }) },
    { preference: evidence('preference') }
  ];
  for (const savedEvidence of cases) assert.equal(evaluate({ savedEvidence }).complete, false);
});

test('authoritative service naturally recalculates 4/5 to 5/5 and 80% to 100%', () => {
  const before = deriveStageReadiness(stageContext(false), { now: NOW });
  assert.equal(before.currentStage.done, 4);
  assert.equal(before.currentStage.required, 5);
  assert.equal(before.readiness, 80);
  assert.equal(before.currentStage.criteria.find(item => item.criterionId === 'proposal_alignment').complete, false);

  const afterContext = stageContext(true);
  const after = deriveStageReadiness(afterContext, { now: NOW });
  assert.equal(after.currentStage.done, 5);
  assert.equal(after.currentStage.required, 5);
  assert.equal(after.readiness, 100);
  assert.equal(after.currentStage.criteria.find(item => item.criterionId === 'proposal_alignment').complete, true);
  assert.equal(after.readyToAdvance, false, 'evidence completion must not bypass independent stage gates');

  const reloaded = deriveStageReadiness(JSON.parse(JSON.stringify(afterContext)), { now: NOW });
  assert.equal(reloaded.readiness, 100, 'fresh authoritative evaluation must preserve the result');
  delete afterContext.gov.evidence.proposal_alignment;
  assert.equal(deriveStageReadiness(afterContext, { now: NOW }).readiness, 80, 'removing qualifying evidence must recalculate rather than latch completion');
});

test('proposal_alignment no longer contains a proposalDraft gate and commercial remains unchanged', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'criterion-evidence.js'), 'utf8');
  const proposalRule = /case 'proposal_alignment':([^\n]+)/.exec(source)?.[1] || '';
  const commercialRule = /case 'commercial':([^\n]+)/.exec(source)?.[1] || '';
  assert.doesNotMatch(proposalRule, /proposalDraft|componentRequired/);
  assert.match(proposalRule, /fromStructured\(criterion,ctx\)/);
  assert.match(commercialRule, /proposalDraft/);
});
