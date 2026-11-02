'use strict';

/* Real HTTP + PostgreSQL certification for v6.9.35. This suite must use a
   disposable database. Absence of DATABASE_URL is reported as NOT TESTED. */
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.35 ownership transfer PostgreSQL integration is NOT TESTED';
const ADMIN_USER = process.env.TEST_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASS;
let server, base, db, adminToken, repAToken, repBToken, managerAToken, managerBToken;
let ids = {};

async function api(path, { method = 'GET', token = adminToken, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, json: await response.json().catch(() => null) };
}

async function login(username, password) {
  const result = await api('/api/auth/login', { method: 'POST', token: null, body: { username, password } });
  assert.equal(result.status, 200, `login failed for ${username}`);
  return result.json.token;
}

if (!HAS_DB) {
  test('v6.9.35 Customer ownership PostgreSQL transaction and authorization gate', { skip: blocked }, () => {});
} else describe('v6.9.35 Customer ownership reassignment against PostgreSQL', { concurrency: false }, () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const password = `OwnerTransfer-${suffix}!`;

  before(async () => {
    if (!ADMIN_PASS) throw new Error('ADMIN_PASSWORD or TEST_ADMIN_PASS is required for disposable PostgreSQL certification.');
    process.env.NODE_ENV = 'test';
    const { runMigrations } = require('../src/migrate');
    await runMigrations();
    db = require('../src/db');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 8);
    async function user(label, role, roles) {
      const username = `v6935_${label}_${suffix}`;
      const row = await db.query(
        `INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active)
         VALUES($1,$2,$3,$4,$5,FALSE,TRUE) RETURNING id,username`,
        [`${username}@example.invalid`, username, hash, role, roles]
      );
      return row.rows[0];
    }
    ids.repA = await user('rep_a', 'rep', ['rep']);
    ids.repB = await user('rep_b', 'rep', ['rep']);
    ids.managerA = await user('manager_a', 'rep', ['sales_manager']);
    ids.managerB = await user('manager_b', 'rep', ['sales_manager']);
    ids.se = await user('se', 'se', ['se']);
    ids.ineligible = await user('ineligible', 'se', ['se']);

    const teamA = await db.query(`INSERT INTO sales_teams(name,primary_leader_id) VALUES($1,$2) RETURNING id`, [`v6935 Team A ${suffix}`, ids.managerA.id]);
    const teamB = await db.query(`INSERT INTO sales_teams(name,primary_leader_id) VALUES($1,$2) RETURNING id`, [`v6935 Team B ${suffix}`, ids.managerB.id]);
    for (const [teamId, userId, functions] of [
      [teamA.rows[0].id, ids.managerA.id, ['sales_manager']], [teamA.rows[0].id, ids.repA.id, ['rep']],
      [teamB.rows[0].id, ids.managerB.id, ['sales_manager']], [teamB.rows[0].id, ids.repB.id, ['rep']]
    ]) await db.query(`INSERT INTO sales_team_memberships(team_id,user_id,membership_functions) VALUES($1,$2,$3)`, [teamId, userId, functions]);

    const customer = await db.query(`INSERT INTO customers(name,owner_id,status) VALUES($1,$2,'active') RETURNING id`, [`Customer Alpha ${suffix}`, ids.repA.id]);
    ids.customer = customer.rows[0].id;
    const baseId = (await db.query('SELECT gen_random_uuid() id')).rows[0].id;
    ids.baseId = baseId;
    const economics = { modelVersion: 28, annualBenefit: 120000, totalContractBenefit: 360000, totalContractInvestment: 100000, totalContractNetBenefit: 260000, totalContractRoi: 260, contractNpv: 210000, currency: 'USD' };
    const first = await db.query(
      `INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,customer_id,data)
       VALUES($1,1,FALSE,$2,$3,$4,$5,$6::jsonb) RETURNING id,created_at,updated_at`,
      [baseId, `Alpha Opportunity ${suffix}`, `Customer Alpha ${suffix}`, ids.repA.id, ids.customer, JSON.stringify(economics)]
    );
    const second = await db.query(
      `INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,customer_id,data)
       VALUES($1,2,TRUE,$2,$3,$4,$5,$6::jsonb) RETURNING id,created_at,updated_at`,
      [baseId, `Alpha Opportunity ${suffix}`, `Customer Alpha ${suffix}`, ids.repA.id, ids.customer, JSON.stringify({ ...economics, proposalDraft: { title: 'Alpha proposal' } })]
    );
    ids.scenario1 = first.rows[0].id; ids.scenario2 = second.rows[0].id;
    ids.scenarioTimestamps = [first.rows[0].updated_at.toISOString(), second.rows[0].updated_at.toISOString()];

    const session = await db.query(
      `INSERT INTO discovery_sessions(scenario_id,base_id,source_scenario_version,owner_id,token,company,is_active)
       VALUES($1,$2,2,$3,$4,$5,TRUE) RETURNING id`,
      [ids.scenario2, baseId, ids.repA.id, `v6935-token-${suffix}`, `Customer Alpha ${suffix}`]
    );
    ids.session = session.rows[0].id;
    const submission = await db.query(
      `INSERT INTO discovery_submissions(discovery_session_id,base_id,source_scenario_id,source_scenario_version,submission_number,answer_count,submitted_by,submission_hash,client_submission_id)
       VALUES($1,$2,$3,2,1,1,'prospect',$4,$5) RETURNING id`,
      [ids.session, baseId, ids.scenario2, `hash-${suffix}`, `client-${suffix}`]
    );
    ids.submission = submission.rows[0].id;
    await db.query(`INSERT INTO discovery_submission_answers(submission_id,question_id,question_text,section,classification,canonical_input,answer_text,normalized_value,unit) VALUES($1,'f1','Annual value','Economics','financial_input','annualWriteOff','120000',120000,'USD/year')`, [ids.submission]);
    const valueEvent = await db.query(`INSERT INTO roi_value_events(base_id,canonical_input,event_type,value_text,normalized_value,currency,unit,source_scenario_id,source_scenario_version,evidence_source,evidence_date,actor_user_id,provenance_state) VALUES($1,'annualWriteOff','rep_confirmed','120000',120000,'USD','USD/year',$2,2,'Rep confirmation',CURRENT_DATE,$3,'confirmed') RETURNING id`, [baseId, ids.scenario2, ids.repA.id]);
    ids.valueEvent = valueEvent.rows[0].id;
    const stakeholder = await db.query(`INSERT INTO stakeholders(owner_id,scenario_id,company,name,title,role) VALUES($1,$2,$3,'Buyer Alpha','VP Operations','economic_buyer') RETURNING id`, [ids.repA.id, ids.scenario2, `Customer Alpha ${suffix}`]);
    ids.stakeholder = stakeholder.rows[0].id;
    const plan = await db.query(`INSERT INTO mutual_action_plans(owner_id,scenario_id,company,title,milestones) VALUES($1,$2,$3,'Joint Project Plan','[]'::jsonb) RETURNING id`, [ids.repA.id, ids.scenario2, `Customer Alpha ${suffix}`]);
    ids.plan = plan.rows[0].id;
    const handoff = await db.query(`INSERT INTO handoffs(customer_id,owner_id,data,primary_se_id,created_by,last_edited_by) VALUES($1,$2,'{}'::jsonb,$3,$3,$3) RETURNING id`, [ids.customer, ids.repA.id, ids.se.id]);
    ids.handoff = handoff.rows[0].id;
    await db.query(`INSERT INTO scenario_stage_governance(scenario_id,evidence,updated_by) VALUES($1,$2::jsonb,$3)`, [ids.scenario2, JSON.stringify({ budget: { status: 'confirmed' } }), ids.repA.id]);
    await db.query(`INSERT INTO business_case_shares(token,scenario_id,scenario_base_id,owner_id,company,title,published_payload,scenario_version,story_revision,model_version,currency,output_readiness,published_at) VALUES($1,$2,$3,$4,$5,'Customer Business Case',$6::jsonb,2,'story-1',28,'USD','ready',NOW())`, [`published-${suffix}`, ids.scenario2, baseId, ids.repA.id, `Customer Alpha ${suffix}`, JSON.stringify({ annualBenefit: 120000 })]);

    const { app } = require('../server');
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    base = `http://127.0.0.1:${server.address().port}`;
    adminToken = await login(ADMIN_USER, ADMIN_PASS);
    repAToken = await login(ids.repA.username, password);
    repBToken = await login(ids.repB.username, password);
    managerAToken = await login(ids.managerA.username, password);
    managerBToken = await login(ids.managerB.username, password);
  });

  after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

  test('non-Admin roles cannot preview or execute transfer', async () => {
    const preview = await api(`/api/customers/${ids.customer}/ownership-transfer-preview?newOwnerId=${ids.repB.id}`, { token: repAToken });
    const transfer = await api(`/api/customers/${ids.customer}/ownership-transfer`, { method:'POST', token:managerAToken, body:{newOwnerId:ids.repB.id,expectedCurrentOwnerId:ids.repA.id,reason:'unauthorized'} });
    assert.equal(preview.status, 403); assert.equal(transfer.status, 403);
    assert.equal((await db.query('SELECT owner_id FROM customers WHERE id=$1',[ids.customer])).rows[0].owner_id, ids.repA.id);
  });

  test('server preview validates eligible owner and returns actual impact', async () => {
    const invalid = await api(`/api/customers/${ids.customer}/ownership-transfer-preview?newOwnerId=${ids.ineligible.id}`);
    assert.equal(invalid.status, 409); assert.equal(invalid.json.code, 'NEW_OWNER_INELIGIBLE');
    const preview = await api(`/api/customers/${ids.customer}/ownership-transfer-preview?newOwnerId=${ids.repB.id}`);
    assert.equal(preview.status, 200); assert.equal(preview.json.currentOwner.id, ids.repA.id); assert.equal(preview.json.counts.scenarioVersions, 2); assert.equal(preview.json.counts.prospectSubmissions, 1); ids.preview = preview.json;
  });

  test('required reason is enforced and successful transfer commits all operational owners plus immutable audit', async () => {
    const missing = await api(`/api/customers/${ids.customer}/ownership-transfer`, { method:'POST', body:{newOwnerId:ids.repB.id,expectedCurrentOwnerId:ids.repA.id,reason:' '} });
    assert.equal(missing.status, 400); assert.equal(missing.json.code, 'TRANSFER_REASON_REQUIRED');
    const result = await api(`/api/customers/${ids.customer}/ownership-transfer`, { method:'POST', body:{newOwnerId:ids.repB.id,expectedCurrentOwnerId:ids.repA.id,reason:'Territory reassignment'} });
    assert.equal(result.status, 200); assert.equal(result.json.oldOwner.id, ids.repA.id); assert.equal(result.json.newOwner.id, ids.repB.id); ids.transfer = result.json;
    for (const [sql, expected] of [
      ['SELECT owner_id FROM customers WHERE id=$1', ids.repB.id],
      ['SELECT owner_id FROM scenarios WHERE id=$1', ids.repB.id],
      ['SELECT owner_id FROM discovery_sessions WHERE id=$1', ids.repB.id],
      ['SELECT owner_id FROM stakeholders WHERE id=$1', ids.repB.id],
      ['SELECT owner_id FROM mutual_action_plans WHERE id=$1', ids.repB.id],
      ['SELECT owner_id FROM handoffs WHERE id=$1', ids.repB.id]
    ]) assert.equal((await db.query(sql,[sql.includes('scenarios')?ids.scenario2:sql.includes('discovery')?ids.session:sql.includes('stakeholders')?ids.stakeholder:sql.includes('mutual')?ids.plan:sql.includes('handoffs')?ids.handoff:ids.customer])).rows[0].owner_id, expected);
    const transferRow = (await db.query('SELECT * FROM customer_ownership_transfers WHERE id=$1',[result.json.transferId])).rows[0];
    assert.equal(transferRow.reason,'Territory reassignment');assert.equal(transferRow.admin_actor_id,(await db.query('SELECT id FROM users WHERE username=$1',[ADMIN_USER])).rows[0].id);
  });

  test('new Rep and Manager gain scope while old Rep and Manager lose owner-derived scope', async () => {
    const lists = await Promise.all([repBToken,repAToken,managerBToken,managerAToken].map(token=>api('/api/customers',{token})));
    assert.equal(lists[0].json.some(row=>row.id===ids.customer),true);
    assert.equal(lists[1].json.some(row=>row.id===ids.customer),false);
    assert.equal(lists[2].json.some(row=>row.id===ids.customer),true);
    assert.equal(lists[3].json.some(row=>row.id===ids.customer),false);
  });

  test('future owner actions identify Rep B while prior actors remain Rep A', async () => {
    const current=(await db.query('SELECT name,company,data FROM scenarios WHERE id=$1',[ids.scenario2])).rows[0];
    const saved=await api('/api/scenarios',{method:'POST',token:repBToken,body:{name:current.name,company:current.company,data:current.data,baseId:ids.baseId,versionNote:'Post-transfer owner action'}});
    assert.equal(saved.status,201);assert.equal(saved.json.version,3);ids.futureScenario=saved.json.id;
    const row=(await db.query('SELECT owner_id,base_id,version FROM scenarios WHERE id=$1',[saved.json.id])).rows[0];
    assert.equal(row.owner_id,ids.repB.id);assert.equal(String(row.base_id),String(ids.baseId));assert.equal(row.version,3);
    const savedAudit=(await db.query(`SELECT user_id FROM audit_log WHERE entity_type='scenario' AND entity_id=$1 AND action='scenario.saved' ORDER BY created_at DESC LIMIT 1`,[saved.json.id])).rows[0];
    assert.equal(savedAudit.user_id,ids.repB.id);
    assert.equal((await db.query('SELECT actor_user_id FROM roi_value_events WHERE id=$1',[ids.valueEvent])).rows[0].actor_user_id,ids.repA.id);
  });

  test('future owner-routed Prospect notification resolves to Rep B without rewriting prior notification history', async () => {
    const historical=await db.query('SELECT recipient_user_id,status FROM prospect_submission_notifications WHERE submission_id=$1',[ids.submission]);
    const submitted=await db.query(
      `INSERT INTO discovery_submissions(discovery_session_id,base_id,source_scenario_id,source_scenario_version,submission_number,answer_count,submitted_by,submission_hash,client_submission_id)
       VALUES($1,$2,$3,2,2,0,'prospect',$4,$5) RETURNING id`,
      [ids.session,ids.baseId,ids.scenario2,`future-hash-${suffix}`,`future-client-${suffix}`]
    );
    const sessionOwner=(await db.query('SELECT owner_id FROM discovery_sessions WHERE id=$1',[ids.session])).rows[0].owner_id;
    const {enqueueProspectSubmissionNotification}=require('../src/shared/prospect-submission-notifications');
    await enqueueProspectSubmissionNotification({query:db.query}, {submissionId:submitted.rows[0].id,recipientUserId:sessionOwner});
    const future=(await db.query('SELECT recipient_user_id FROM prospect_submission_notifications WHERE submission_id=$1',[submitted.rows[0].id])).rows[0];
    assert.equal(future.recipient_user_id,ids.repB.id);
    assert.deepEqual((await db.query('SELECT recipient_user_id,status FROM prospect_submission_notifications WHERE submission_id=$1',[ids.submission])).rows,historical.rows);
  });

  test('historical evidence, actors, SE assignment, scenario identity, economics and frozen output remain unchanged', async () => {
    const scenarios = await db.query('SELECT id,base_id,version,data,updated_at FROM scenarios WHERE id=ANY($1::uuid[]) ORDER BY version',[[ids.scenario1,ids.scenario2]]);
    assert.deepEqual(scenarios.rows.map(row=>row.id),[ids.scenario1,ids.scenario2]);
    assert.deepEqual(scenarios.rows.map(row=>row.version),[1,2]);
    assert.ok(scenarios.rows.every(row=>String(row.base_id)===String(ids.baseId)));
    assert.deepEqual(scenarios.rows.map(row=>Number(row.data.annualBenefit)),[120000,120000]);
    assert.deepEqual(scenarios.rows.map(row=>row.updated_at.toISOString()),ids.scenarioTimestamps);
    assert.equal((await db.query('SELECT actor_user_id FROM roi_value_events WHERE id=$1',[ids.valueEvent])).rows[0].actor_user_id,ids.repA.id);
    assert.equal((await db.query('SELECT submitted_by FROM discovery_submissions WHERE id=$1',[ids.submission])).rows[0].submitted_by,'prospect');
    const fit=(await db.query('SELECT primary_se_id,created_by,last_edited_by FROM handoffs WHERE id=$1',[ids.handoff])).rows[0];assert.equal(fit.primary_se_id,ids.se.id);assert.equal(fit.created_by,ids.se.id);assert.equal(fit.last_edited_by,ids.se.id);
    const published=(await db.query('SELECT owner_id,token,published_payload FROM business_case_shares WHERE scenario_id=$1',[ids.scenario2])).rows[0];assert.equal(published.owner_id,ids.repA.id);assert.match(published.token,/^published-/);assert.equal(Number(published.published_payload.annualBenefit),120000);
  });

  test('a no-scenario Customer transfers successfully', async () => {
    const row=await db.query(`INSERT INTO customers(name,owner_id,status) VALUES($1,$2,'active') RETURNING id`,[`No Scenario ${suffix}`,ids.repA.id]);const id=row.rows[0].id;
    const preview=await api(`/api/customers/${id}/ownership-transfer-preview?newOwnerId=${ids.repB.id}`);assert.equal(preview.status,200);assert.equal(preview.json.counts.scenarioVersions,0);
    const result=await api(`/api/customers/${id}/ownership-transfer`,{method:'POST',body:{newOwnerId:ids.repB.id,expectedCurrentOwnerId:ids.repA.id,reason:'Coverage change'}});assert.equal(result.status,200);
  });

  test('stale preview conflict cannot overwrite a newer owner', async () => {
    const row=await db.query(`INSERT INTO customers(name,owner_id,status) VALUES($1,$2,'active') RETURNING id`,[`Concurrent ${suffix}`,ids.repA.id]);const id=row.rows[0].id;
    const preview=await api(`/api/customers/${id}/ownership-transfer-preview?newOwnerId=${ids.repB.id}`);assert.equal(preview.status,200);
    await db.query('UPDATE customers SET owner_id=$2 WHERE id=$1',[id,ids.managerB.id]);
    const stale=await api(`/api/customers/${id}/ownership-transfer`,{method:'POST',body:{newOwnerId:ids.repB.id,expectedCurrentOwnerId:preview.json.expectedCurrentOwnerId,reason:'Stale transfer'}});assert.equal(stale.status,409);assert.equal(stale.json.code,'OWNERSHIP_CONFLICT');assert.equal((await db.query('SELECT owner_id FROM customers WHERE id=$1',[id])).rows[0].owner_id,ids.managerB.id);
  });

  test('an induced post-update failure rolls back PostgreSQL changes and audit', async () => {
    const row=await db.query(`INSERT INTO customers(name,owner_id,status) VALUES($1,$2,'active') RETURNING id`,[`Rollback ${suffix}`,ids.repA.id]);const id=row.rows[0].id;
    const {transferCustomerOwnership}=require('../src/shared/customer-ownership-transfer');
    await assert.rejects(transferCustomerOwnership({customerId:id,newOwnerId:ids.repB.id,expectedCurrentOwnerId:ids.repA.id,reason:'Rollback proof',adminUserId:(await db.query('SELECT id FROM users WHERE username=$1',[ADMIN_USER])).rows[0].id,transaction:db.transaction,beforeAudit:async()=>{throw new Error('induced transaction failure');}}),/induced transaction failure/);
    assert.equal((await db.query('SELECT owner_id FROM customers WHERE id=$1',[id])).rows[0].owner_id,ids.repA.id);
    assert.equal((await db.query('SELECT COUNT(*)::int count FROM customer_ownership_transfers WHERE customer_id=$1',[id])).rows[0].count,0);
  });
});
