'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.55 Buyer Evidence PostgreSQL integration is NOT TESTED';
let db, server, base, token;
const ids = {};

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const namedForTesting = /(?:test|qa|ci|dev|codex)/i.test(url.pathname);
  assert.ok(local || namedForTesting, 'v6.9.55 integration requires an explicitly non-production database');
}

async function api(route, { method = 'GET', body, auth = token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, json: await response.json().catch(() => null) };
}

function evidence(id, overrides = {}) {
  return {
    criterionId: id,
    status: 'Complete',
    quality: 'strong',
    confidence: 'High',
    evidence: `Customer confirmed ${id}`,
    stakeholder: 'Pat Buyer',
    evidenceDate: '2026-10-30',
    customerValidated: true,
    source: 'Customer meeting',
    amount: '$100,000',
    timing: 'Q1',
    targetDate: '2027-01-31',
    term: '36 months',
    ...overrides
  };
}

function solutionFitData(customer) {
  const inventoryConfiguration = Object.fromEntries([
    'Lot Numbers', 'FIFO, LIFO, FEFO, etc.', 'Serial Numbers', 'LPNs / Handling Units / Packing Units',
    'Zones', 'Specialized Storage Areas', 'Defined Pick Sequence', 'Job', 'Ownership', 'Country of Origin'
  ].map(name => [name, { answer: 'No' }]));
  return {
    solutionScope: { primaryProduct: 'MEP', additionalProducts: [], erp: 'JDE', erpVersion: 'E1' },
    opportunity: { customer, products: ['MEP'], locations: '3', users: '20', problem: 'Lost time', outcome: 'Accuracy' },
    architecture: { relationship: 'Standalone', erp: 'JDE', version: 'E1' },
    partner: { involved: 'No' },
    processes: [{ id: 'workflow-v6955', name: 'Inbound Receiving', product: 'MEP', erp: 'JDE', source: 'standard_app', selected: true, demoStatus: 'Demonstrated', fit: 'Fit', customerValidation: 'Customer validated' }],
    gaps: [],
    inventoryConfiguration,
    turnover: { contractStatus: 'Reviewed', projectManager: 'Pat PM', systemAdminEmail: 'admin@example.invalid', deliveryModel: 'Cloud', internalDeliveryContact: 'Alex AE', projectStart: '2026-12-01', eapEdition: 'Standard', environments: '2', authorizedDefinitions: '1', authorizedLanguages: 'English', customerDomain: 'example.invalid', sowLink: 'https://example.invalid/sow', mepLicenseId: 'MEP-1' }
  };
}

if (!HAS_DB) test('v6.9.55 real PostgreSQL commercial evidence persistence and evaluator integration', { skip: blocked }, () => {});
else describe('v6.9.55 commercial evidence against disposable PostgreSQL', { concurrency: false }, () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const password = `BuyerEvidence-${suffix}!`;
  const customerName = `Buyer Evidence v6955 ${suffix}`;

  before(async () => {
    assertDisposableDatabase();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || `buyer-evidence-secret-${suffix}`;
    await require('../src/migrate').runMigrations();
    db = require('../src/db');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 8);
    ids.owner = (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active)
      VALUES($1,$2,$3,'rep',$4,FALSE,TRUE) RETURNING id,username`, [`buyer_evidence_v6955_${suffix}@example.invalid`, `buyer_evidence_v6955_${suffix}`, hash, ['rep', 'se']])).rows[0];
    ids.customer = (await db.query('INSERT INTO customers(name,owner_id) VALUES($1,$2) RETURNING id', [customerName, ids.owner.id])).rows[0].id;
    ids.scenario = (await db.query(`INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,deal_stage,data,customer_id)
      VALUES(gen_random_uuid(),1,TRUE,$1,$1,$2,'Stage 6 — Select Vendor Solution',$3::jsonb,$4) RETURNING id`, [customerName, ids.owner.id, JSON.stringify({ modelVersion: 28, contractMonths: 36 }), ids.customer])).rows[0].id;
    ids.handoff = (await db.query(`INSERT INTO handoffs(customer_id,owner_id,primary_se_id,data,readiness,status,last_edited_by)
      VALUES($1,$2,$2,$3::jsonb,100,'ready',$2) RETURNING id`, [ids.customer, ids.owner.id, JSON.stringify(solutionFitData(customerName))])).rows[0].id;
    const existing = {
      selected: evidence('selected'),
      contract: evidence('contract'),
      funding_reconfirmed: evidence('funding_reconfirmed'),
      signature_date: evidence('signature_date'),
      implementation: evidence('implementation')
    };
    await db.query(`INSERT INTO scenario_stage_governance(scenario_id,current_stage,rep_assessed_stage,evidence,updated_by,legacy_setup_needed)
      VALUES($1,6,6,$2::jsonb,$3,FALSE)`, [ids.scenario, JSON.stringify(existing), ids.owner.id]);

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

  test('commercial evidence is validated, persisted and reevaluated independently of a Proposal artifact', async () => {
    const before = await api(`/api/stage-readiness/${ids.scenario}`);
    assert.equal(before.status, 200);
    const beforeCommercial = before.json.currentStage.criteria.find(item => item.criterionId === 'commercial');
    assert.equal(beforeCommercial.complete, false);
    assert.equal(beforeCommercial.proofType, 'CUSTOMER_EVIDENCE');
    assert.equal(beforeCommercial.navigationTarget, 'proposal');

    const missingTerm = await api(`/api/stage-readiness/${ids.scenario}/evidence/commercial`, {
      method: 'PUT', body: evidence('commercial', { term: '' })
    });
    assert.equal(missingTerm.status, 400);
    assert.deepEqual(missingTerm.json.missingFields, ['term']);

    const saved = await api(`/api/stage-readiness/${ids.scenario}/evidence/commercial`, {
      method: 'PUT', body: evidence('commercial')
    });
    assert.equal(saved.status, 200);
    const commercial = saved.json.currentStage.criteria.find(item => item.criterionId === 'commercial');
    assert.equal(commercial.complete, true);
    assert.equal(commercial.semanticState, 'COMPLETE');
    assert.equal(commercial.evidenceComplete, true);
    assert.equal((await db.query(`SELECT data ? 'proposalDraft' AS has_proposal FROM scenarios WHERE id=$1`, [ids.scenario])).rows[0].has_proposal, false);

    const stored = (await db.query(`SELECT evidence->'commercial' AS commercial FROM scenario_stage_governance WHERE scenario_id=$1`, [ids.scenario])).rows[0].commercial;
    assert.equal(stored.term, '36 months');
    assert.equal(stored.customerValidated, true);

    await db.query(`UPDATE scenario_stage_governance SET evidence=evidence-'commercial' WHERE scenario_id=$1`, [ids.scenario]);
    await db.query(`UPDATE scenarios SET data=jsonb_set(data,'{proposalDraft}',$2::jsonb,true) WHERE id=$1`, [ids.scenario, JSON.stringify({ title: 'Seller artifact only' })]);
    const artifactOnly = await api(`/api/stage-readiness/${ids.scenario}`);
    const artifactCommercial = artifactOnly.json.currentStage.criteria.find(item => item.criterionId === 'commercial');
    assert.equal(artifactCommercial.complete, false);
    assert.equal(artifactCommercial.semanticState, 'NEEDS_CUSTOMER_EVIDENCE');
    assert.match(artifactCommercial.blockingReasons.join(' '), /customer-confirmed/i);
  });
});
