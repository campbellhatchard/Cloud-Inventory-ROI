'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.54 Buyer Evidence persistence/evaluator integration is NOT TESTED';
let db, server, base, token;
const ids = {};

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const namedForTesting = /(?:test|qa|ci|dev|codex)/i.test(url.pathname);
  assert.ok(local || namedForTesting, 'v6.9.54 integration requires an explicitly non-production database');
}

async function api(route, { method = 'GET', body, auth = token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, json: await response.json().catch(() => null) };
}

function evidence(id) {
  return { criterionId: id, status: 'Complete', quality: 'strong', confidence: 'High', evidence: `Customer confirmed ${id}`, stakeholder: 'Pat Buyer', evidenceDate: '2026-10-30', customerValidated: true, source: 'Customer meeting', amount: '$100,000', timing: 'Q1' };
}

function solutionFitData() {
  const inventoryConfiguration = Object.fromEntries([
    'Lot Numbers', 'FIFO, LIFO, FEFO, etc.', 'Serial Numbers', 'LPNs / Handling Units / Packing Units',
    'Zones', 'Specialized Storage Areas', 'Defined Pick Sequence', 'Job', 'Ownership', 'Country of Origin'
  ].map(name => [name, { answer: 'No' }]));
  return {
    solutionScope: { primaryProduct: 'MEP', additionalProducts: [], erp: 'JDE', erpVersion: 'E1' },
    opportunity: { customer: 'v6.9.54 Test Customer', products: ['MEP'], locations: '3', users: '20', problem: 'Lost time', outcome: 'Accuracy' },
    architecture: { relationship: 'Standalone', erp: 'JDE', version: 'E1' }, partner: { involved: 'No' },
    processes: [{ id: 'workflow-v6954', name: 'Inbound Receiving', product: 'MEP', erp: 'JDE', source: 'standard_app', selected: true, demoStatus: 'Demonstrated', fit: 'Fit', customerValidation: 'Customer validated' }],
    gaps: [], inventoryConfiguration,
    turnover: { contractStatus: 'Reviewed', projectManager: 'Pat PM', systemAdminEmail: 'admin@example.invalid', deliveryModel: 'Cloud', internalDeliveryContact: 'Alex AE', projectStart: '2026-12-01', eapEdition: 'Standard', environments: '2', authorizedDefinitions: '1', authorizedLanguages: 'English', customerDomain: 'example.invalid', sowLink: 'https://example.invalid/sow', mepLicenseId: 'MEP-1' }
  };
}

if (!HAS_DB) test('v6.9.54 real PostgreSQL Buyer Evidence confirmation and reload', { skip: blocked }, () => {});
else describe('v6.9.54 proposal-alignment evidence against disposable PostgreSQL', { concurrency: false }, () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const password = `BuyerEvidence-${suffix}!`;

  before(async () => {
    assertDisposableDatabase();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || `buyer-evidence-secret-${suffix}`;
    await require('../src/migrate').runMigrations();
    db = require('../src/db');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 8);
    ids.owner = (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active)
      VALUES($1,$2,$3,'rep',$4,FALSE,TRUE) RETURNING id,username`, [`buyer_evidence_${suffix}@example.invalid`, `buyer_evidence_${suffix}`, hash, ['rep', 'se']])).rows[0];
    ids.customer = (await db.query('INSERT INTO customers(name,owner_id) VALUES($1,$2) RETURNING id', [`Buyer Evidence ${suffix}`, ids.owner.id])).rows[0].id;
    ids.scenario = (await db.query(`INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,deal_stage,data,customer_id)
      VALUES(gen_random_uuid(),1,TRUE,$1,$1,$2,'Stage 5 — Evaluate Alternatives',$3::jsonb,$4) RETURNING id`, [`Buyer Evidence ${suffix}`, ids.owner.id, JSON.stringify({ modelVersion: 28, contractMonths: 36 }), ids.customer])).rows[0].id;
    ids.handoff = (await db.query(`INSERT INTO handoffs(customer_id,owner_id,primary_se_id,data,readiness,status,last_edited_by)
      VALUES($1,$2,$2,$3::jsonb,100,'ready',$2) RETURNING id`, [ids.customer, ids.owner.id, JSON.stringify(solutionFitData())])).rows[0].id;
    const existing = { criteria_addressed: evidence('criteria_addressed'), alternatives: evidence('alternatives'), preference: evidence('preference') };
    await db.query(`INSERT INTO scenario_stage_governance(scenario_id,current_stage,rep_assessed_stage,evidence,updated_by,legacy_setup_needed)
      VALUES($1,5,5,$2::jsonb,$3,FALSE)`, [ids.scenario, JSON.stringify(existing), ids.owner.id]);

    const { app } = require('../server');
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    base = `http://127.0.0.1:${server.address().port}`;
    const login = await api('/api/auth/login', { method: 'POST', auth: null, body: { username: ids.owner.username, password } });
    assert.equal(login.status, 200);
    token = login.json.token;
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) {
      if (ids.scenario) await db.query('DELETE FROM scenarios WHERE id=$1', [ids.scenario]);
      if (ids.customer) await db.query('DELETE FROM customers WHERE id=$1', [ids.customer]);
      if (ids.owner) await db.query('DELETE FROM users WHERE id=$1', [ids.owner.id]);
      await db.pool?.end?.();
    }
  });

  test('confirm route persists valid evidence without proposalDraft and naturally moves 4/5 to 5/5', async () => {
    const before = await api(`/api/stage-readiness/${ids.scenario}`);
    assert.equal(before.status, 200);
    assert.equal(before.json.currentStage.done, 4);
    assert.equal(before.json.currentStage.required, 5);
    assert.equal(before.json.readiness, 80);
    assert.equal(before.json.currentStage.criteria.find(item => item.criterionId === 'proposal_alignment').complete, false);

    const saved = await api(`/api/stage-readiness/${ids.scenario}/evidence/proposal_alignment`, { method: 'PUT', body: evidence('proposal_alignment') });
    assert.equal(saved.status, 200);
    assert.equal(saved.json.currentStage.done, 5);
    assert.equal(saved.json.readiness, 100);
    assert.equal(saved.json.currentStage.criteria.find(item => item.criterionId === 'proposal_alignment').complete, true);
    assert.equal((await db.query(`SELECT data ? 'proposalDraft' AS has_proposal FROM scenarios WHERE id=$1`, [ids.scenario])).rows[0].has_proposal, false);

    const fresh = await api(`/api/stage-readiness/${ids.scenario}`);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.json.readiness, 100);
    assert.equal(fresh.json.evidence.proposal_alignment.customerValidated, true);

    await db.query(`UPDATE scenario_stage_governance SET evidence=evidence-'proposal_alignment' WHERE scenario_id=$1`, [ids.scenario]);
    await db.query(`UPDATE scenarios SET data=jsonb_set(data,'{proposalDraft}',$2::jsonb,true) WHERE id=$1`, [ids.scenario, JSON.stringify({ title: 'Seller artifact only' })]);
    const artifactOnly = await api(`/api/stage-readiness/${ids.scenario}`);
    assert.equal(artifactOnly.json.readiness, 80);
    assert.equal(artifactOnly.json.currentStage.criteria.find(item => item.criterionId === 'proposal_alignment').complete, false);

    const combined = await api(`/api/stage-readiness/${ids.scenario}/evidence/proposal_alignment`, { method: 'PUT', body: evidence('proposal_alignment') });
    assert.equal(combined.status, 200);
    assert.equal(combined.json.readiness, 100);

    await db.query(`UPDATE scenarios SET data=data-'proposalDraft' WHERE id=$1`, [ids.scenario]);
    const artifactRemoved = await api(`/api/stage-readiness/${ids.scenario}`);
    assert.equal(artifactRemoved.json.readiness, 100, 'qualifying buyer evidence must remain authoritative when the artifact is absent');

    await db.query(`UPDATE scenario_stage_governance SET evidence=evidence-'proposal_alignment' WHERE scenario_id=$1`, [ids.scenario]);
    const evidenceRemoved = await api(`/api/stage-readiness/${ids.scenario}`);
    assert.equal(evidenceRemoved.json.readiness, 80, 'completion must recalculate when qualifying evidence is removed');
  });
});
