'use strict';

/* Real HTTP + PostgreSQL certification. This suite is intentionally destructive
   only against a disposable test database. Absence of DATABASE_URL is reported
   as NOT TESTED; production credentials must never be supplied. */
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.36 Admin bulk cleanup PostgreSQL integration is NOT TESTED';
let db, server, base, adminToken, repAToken, seToken;
const ids = {};

async function api(path, { method='GET', token=adminToken, body } = {}) {
  const headers = {'Content-Type':'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(base + path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,json:await response.json().catch(()=>null)};
}
async function login(username,password){const x=await api('/api/auth/login',{method:'POST',token:null,body:{username,password}});assert.equal(x.status,200,`login ${username}`);return x.json.token}

if (!HAS_DB) {
  test('v6.9.36 Admin cleanup PostgreSQL filters, transactions, recovery and concurrency gate', {skip:blocked},()=>{});
} else describe('v6.9.36 Advanced Admin Cleanup against disposable PostgreSQL',{concurrency:false},()=>{
  const suffix=`${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const password=`Cleanup-${suffix}!`;
  const recent='2026-10-05T12:00:00.000Z',old='2026-05-01T12:00:00.000Z',removed='2026-10-06T12:00:00.000Z';

  before(async()=>{
    process.env.NODE_ENV='test';
    process.env.JWT_SECRET=process.env.JWT_SECRET||`cleanup-secret-${suffix}`;
    await require('../src/migrate').runMigrations();
    db=require('../src/db');
    const bcrypt=require('bcrypt'),hash=await bcrypt.hash(password,8);
    async function user(label,role,roles){return (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active) VALUES($1,$2,$3,$4,$5,FALSE,TRUE) RETURNING id,username`,[`${label}_${suffix}@example.invalid`,`${label}_${suffix}`,hash,role,roles])).rows[0]}
    ids.admin=await user('cleanup_admin','admin',['admin']);
    ids.repA=await user('cleanup_rep_a','rep',['rep']);
    ids.repB=await user('cleanup_rep_b','rep',['rep']);
    ids.se=await user('cleanup_se','se',['se']);
    async function customer(label,owner,creator,date){const row=(await db.query(`INSERT INTO customers(name,owner_id,created_by,status,created_at,updated_at) VALUES($1,$2,$3,'active',$4,$4) RETURNING id,name`,[`QA ${label} ${suffix}`,owner,creator,date])).rows[0];return row}
    ids.customerA=await customer('Recent A',ids.repA.id,ids.repA.id,recent);
    ids.customerB=await customer('Old B',ids.repB.id,ids.repB.id,old);
    ids.customerC=await customer('Transferred C',ids.repA.id,ids.repA.id,recent);
    ids.customerStale=await customer('Stale',ids.repA.id,ids.repA.id,recent);
    ids.customerSnapshot=await customer('Snapshot',ids.repA.id,ids.repA.id,recent);
    async function scenario(customer,owner,version,current,label,date){const baseId=ids[`${label}Base`]||(ids[`${label}Base`]=(await db.query('SELECT gen_random_uuid() id')).rows[0].id);return (await db.query(`INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,customer_id,created_by,data,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$10) RETURNING id,base_id`,[baseId,version,current,`QA ${label} ${suffix}`,customer.name,owner,customer.id,ids.repA.id,JSON.stringify({modelVersion:28,annualBenefit:100000,totalContractBenefit:300000,totalContractInvestment:100000}),date])).rows[0]}
    ids.scenarioA1=await scenario(ids.customerA,ids.repA.id,1,false,'OpportunityA',old);
    ids.scenarioA2=await scenario(ids.customerA,ids.repA.id,2,true,'OpportunityA',recent);
    ids.scenarioC=await scenario(ids.customerC,ids.repA.id,1,true,'OpportunityC',recent);
    ids.scenarioStale=await scenario(ids.customerStale,ids.repA.id,1,true,'StaleOpportunity',recent);
    ids.scenarioSnapshot=await scenario(ids.customerSnapshot,ids.repA.id,1,true,'SnapshotOpportunity',recent);
    ids.removedScenario=await scenario(ids.customerB,ids.repB.id,1,false,'RemovedOpportunity',old);
    await db.query(`UPDATE scenarios SET deleted_at=$2,cleanup_removed_by=$3,cleanup_reason='test_demo' WHERE id=$1`,[ids.removedScenario.id,removed,ids.admin.id]);
    ids.session=(await db.query(`INSERT INTO discovery_sessions(scenario_id,base_id,source_scenario_version,owner_id,created_by,token,company,is_active,created_at,updated_at) VALUES($1,$2,2,$3,$3,$4,$5,TRUE,$6,$6) RETURNING id`,[ids.scenarioA2.id,ids.scenarioA2.base_id,ids.repA.id,`cleanup-${suffix}`,ids.customerA.name,recent])).rows[0];
    ids.submission=(await db.query(`INSERT INTO discovery_submissions(discovery_session_id,base_id,source_scenario_id,source_scenario_version,submission_number,answer_count,submitted_by,submission_hash,client_submission_id) VALUES($1,$2,$3,2,1,1,'prospect',$4,$5) RETURNING id`,[ids.session.id,ids.scenarioA2.base_id,ids.scenarioA2.id,`hash-${suffix}`,`client-${suffix}`])).rows[0];
    await db.query(`INSERT INTO discovery_submission_answers(submission_id,question_id,question_text,section,classification,canonical_input,answer_text,normalized_value,unit) VALUES($1,'f1','Annual write offs','Economics','financial_input','annualWriteOff','100000',100000,'USD/year')`,[ids.submission.id]);
    ids.valueEvent=(await db.query(`INSERT INTO roi_value_events(base_id,canonical_input,event_type,value_text,normalized_value,currency,unit,source_scenario_id,source_scenario_version,discovery_submission_id,evidence_source,evidence_date,actor_user_id,provenance_state) VALUES($1,'annualWriteOff','prospect_submitted','100000',100000,'USD','USD/year',$2,2,$3,'Prospect submission',CURRENT_DATE,NULL,'submitted') RETURNING id`,[ids.scenarioA2.base_id,ids.scenarioA2.id,ids.submission.id])).rows[0];
    ids.fit=(await db.query(`INSERT INTO handoffs(customer_id,owner_id,created_by,last_edited_by,primary_se_id,data,created_at,updated_at) VALUES($1,$2,$3,$3,$3,'{}'::jsonb,$4,$4) RETURNING id`,[ids.customerA.id,ids.repA.id,ids.se.id,recent])).rows[0];
    ids.fitC=(await db.query(`INSERT INTO handoffs(customer_id,owner_id,created_by,last_edited_by,primary_se_id,data,created_at,updated_at) VALUES($1,$2,$3,$3,$3,'{}'::jsonb,$4,$4) RETURNING id`,[ids.customerC.id,ids.repA.id,ids.se.id,recent])).rows[0];
    await db.query(`INSERT INTO scenario_stage_history(scenario_id,previous_stage,new_stage,evidence_supported_stage,readiness,roi_maturity,evidence_snapshot,stakeholder_coverage,commitment_strength,changed_by,change_type) VALUES($1,1,2,2,70,70,'{}','{}','moderate',$2,'rep_advance')`,[ids.scenarioA2.id,ids.repA.id]);

    const {app}=require('../server');server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener))});base=`http://127.0.0.1:${server.address().port}`;
    adminToken=await login(ids.admin.username,password);repAToken=await login(ids.repA.username,password);seToken=await login(ids.se.username,password);
    const transferPreview=await api(`/api/customers/${ids.customerC.id}/ownership-transfer-preview?newOwnerId=${ids.repB.id}`);assert.equal(transferPreview.status,200);
    const transfer=await api(`/api/customers/${ids.customerC.id}/ownership-transfer`,{method:'POST',body:{newOwnerId:ids.repB.id,expectedCurrentOwnerId:ids.repA.id,reason:'v6.9.36 owner-filter fixture'}});assert.equal(transfer.status,200);
  });
  after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await db?.pool?.end?.()});

  test('Admin-only filter metadata and direct API enforcement',async()=>{
    assert.equal((await api('/api/admin/cleanup/options')).status,200);
    assert.equal((await api('/api/admin/cleanup/options',{token:repAToken})).status,403);
    assert.equal((await api('/api/admin/cleanup/preview',{method:'POST',token:seToken,body:{filters:{types:['customer']}}})).status,403);
  });

  test('created date, owner and creator combine with AND; reassigned owner differs from creator',async()=>{
    const matched=await api('/api/admin/cleanup/preview',{method:'POST',body:{search:ids.customerC.name,filters:{types:['customer'],status:'active',ownerId:ids.repB.id,createdById:ids.repA.id,dateBasis:'created',quickRange:'custom',dateFrom:'2026-10-01',dateThrough:'2026-10-31'}}});
    assert.equal(matched.status,200);assert.equal(matched.json.customers.length,1);assert.equal(matched.json.customers[0].id,ids.customerC.id);assert.equal(matched.json.customers[0].owner,ids.repB.username);assert.equal(matched.json.customers[0].creator,ids.repA.username);
    const oldOwner=await api('/api/admin/cleanup/preview',{method:'POST',body:{search:ids.customerC.name,filters:{types:['customer'],ownerId:ids.repA.id}}});assert.equal(oldOwner.status,200);assert.equal(oldOwner.json.summary.total,0);
  });

  test('quick and open-ended date filters plus invalid range are server authoritative',async()=>{
    const old=await api('/api/admin/cleanup/preview',{method:'POST',body:{search:ids.customerB.name,filters:{types:['customer'],dateBasis:'created',quickRange:'custom',dateThrough:'2026-06-01'}}});assert.equal(old.status,200);assert.equal(old.json.customers.length,1);
    const invalid=await api('/api/admin/cleanup/preview',{method:'POST',body:{filters:{types:['customer'],quickRange:'custom',dateFrom:'2026-10-10',dateThrough:'2026-10-01'}}});assert.equal(invalid.status,400);assert.equal(invalid.json.code,'INVALID_DATE_RANGE');
    const removedRows=await api(`/api/admin/cleanup/deleted?types=scenario&quickRange=custom&dateFrom=2026-10-06&dateThrough=2026-10-06`);assert.equal(removedRows.status,200);assert.ok(removedRows.json.scenarios.some(x=>x.id===ids.removedScenario.id));
  });

  test('exact preview impact uses stable IDs and current scenario protection promotes the prior version',async()=>{
    const preview=await api('/api/admin/cleanup/preview',{method:'POST',body:{search:`QA OpportunityA ${suffix}`,filters:{types:['scenario'],status:'active',scenario:'current'}}});assert.equal(preview.status,200);assert.deepEqual(preview.json.scenarios.map(x=>x.id),[ids.scenarioA2.id]);
    const impact=await api('/api/admin/cleanup/impact',{method:'POST',body:{previewId:preview.json.previewId,mode:'selected',scenarioIds:[ids.scenarioA2.id]}});assert.equal(impact.status,200);assert.equal(impact.json.affectedCount,1);assert.ok(impact.json.dependencies.immutableSubmissions>=1);
    const removed=await api('/api/admin/cleanup/execute',{method:'POST',body:{previewId:preview.json.previewId,mode:'selected',scenarioIds:[ids.scenarioA2.id],reason:'test_demo'}});assert.equal(removed.status,200);assert.equal(removed.json.removedCount,1);
    assert.equal((await db.query('SELECT is_current FROM scenarios WHERE id=$1',[ids.scenarioA1.id])).rows[0].is_current,true);
    assert.equal((await db.query('SELECT COUNT(*)::int count FROM discovery_submissions WHERE id=$1',[ids.submission.id])).rows[0].count,1);
    assert.equal((await db.query('SELECT COUNT(*)::int count FROM roi_value_events WHERE id=$1',[ids.valueEvent.id])).rows[0].count,1);
    const restored=await api('/api/admin/cleanup/restore',{method:'POST',body:{type:'scenario',id:ids.scenarioA2.id}});assert.equal(restored.status,200);
  });

  test('Remove All acts only on reviewed snapshot and never includes a later matching row',async()=>{
    const search=`QA SnapshotOpportunity ${suffix}`;
    const preview=await api('/api/admin/cleanup/preview',{method:'POST',body:{search,filters:{types:['scenario'],status:'active'}}});assert.equal(preview.status,200);assert.equal(preview.json.summary.total,1);
    const later=await db.query(`INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,customer_id,created_by,data) VALUES(gen_random_uuid(),1,TRUE,$1,$2,$3,$4,$3,'{}') RETURNING id`,[search,ids.customerSnapshot.name,ids.repA.id,ids.customerSnapshot.id]);
    const impact=await api('/api/admin/cleanup/impact',{method:'POST',body:{previewId:preview.json.previewId,mode:'all'}});assert.equal(impact.status,200);assert.equal(impact.json.affectedCount,1);
    const run=await api('/api/admin/cleanup/execute',{method:'POST',body:{previewId:preview.json.previewId,mode:'all',reason:'test_demo',typedConfirmation:impact.json.confirmationPhrase}});assert.equal(run.status,200);assert.equal(run.json.removedCount,1);
    assert.equal((await db.query('SELECT deleted_at IS NULL active FROM scenarios WHERE id=$1',[later.rows[0].id])).rows[0].active,true);
    const retry=await api('/api/admin/cleanup/execute',{method:'POST',body:{previewId:preview.json.previewId,mode:'all',reason:'test_demo',typedConfirmation:impact.json.confirmationPhrase}});assert.equal(retry.status,409);assert.equal(retry.json.code,'CLEANUP_PREVIEW_USED');
  });

  test('stale row fingerprint aborts the entire batch without partial removal',async()=>{
    const preview=await api('/api/admin/cleanup/preview',{method:'POST',body:{search:`QA StaleOpportunity ${suffix}`,filters:{types:['scenario'],status:'active'}}});assert.equal(preview.status,200);assert.equal(preview.json.summary.total,1);
    await db.query(`UPDATE scenarios SET version_note='concurrent Admin edit',updated_at=NOW() WHERE id=$1`,[ids.scenarioStale.id]);
    const run=await api('/api/admin/cleanup/execute',{method:'POST',body:{previewId:preview.json.previewId,mode:'selected',scenarioIds:[ids.scenarioStale.id],reason:'test_demo'}});assert.equal(run.status,409);assert.equal(run.json.code,'CLEANUP_PREVIEW_STALE');
    assert.equal((await db.query('SELECT deleted_at IS NULL active FROM scenarios WHERE id=$1',[ids.scenarioStale.id])).rows[0].active,true);
  });

  test('Customer removal expands all operational dependencies, preserves evidence and restores reassigned owner',async()=>{
    const preview=await api('/api/admin/cleanup/preview',{method:'POST',body:{search:ids.customerC.name,filters:{types:['customer'],status:'active'}}});assert.equal(preview.status,200);assert.equal(preview.json.customers.length,1);
    const impact=await api('/api/admin/cleanup/impact',{method:'POST',body:{previewId:preview.json.previewId,mode:'selected',customerIds:[ids.customerC.id]}});assert.equal(impact.status,200);assert.ok(impact.json.affectedCount>=2);assert.ok(impact.json.breakdown.scenarioIds>=1);
    const body={previewId:preview.json.previewId,mode:'selected',customerIds:[ids.customerC.id],reason:'test_demo'};if(impact.json.typedConfirmationRequired)body.typedConfirmation=impact.json.confirmationPhrase;
    const run=await api('/api/admin/cleanup/execute',{method:'POST',body});assert.equal(run.status,200);
    const customer=(await db.query('SELECT owner_id,deleted_at FROM customers WHERE id=$1',[ids.customerC.id])).rows[0];assert.equal(customer.owner_id,ids.repB.id);assert.ok(customer.deleted_at);
    const transferCount=(await db.query('SELECT COUNT(*)::int count FROM customer_ownership_transfers WHERE customer_id=$1',[ids.customerC.id])).rows[0].count;assert.equal(transferCount,1);
    const batch=(await db.query('SELECT * FROM admin_cleanup_batches WHERE id=$1',[run.json.batchId])).rows[0];assert.equal(batch.admin_user_id,ids.admin.id);assert.equal(batch.removed_count,run.json.removedCount);
    assert.equal((await db.query(`SELECT COUNT(*)::int count FROM audit_log WHERE action='admin.cleanup_record_removed' AND detail->>'batchId'=$1`,[run.json.batchId])).rows[0].count,run.json.removedCount);
    const restore=await api('/api/admin/cleanup/restore',{method:'POST',body:{type:'customer',id:ids.customerC.id}});assert.equal(restore.status,200);
    assert.equal((await db.query('SELECT owner_id FROM customers WHERE id=$1',[ids.customerC.id])).rows[0].owner_id,ids.repB.id);
    assert.equal((await db.query('SELECT deleted_at IS NULL active,is_current FROM scenarios WHERE id=$1',[ids.scenarioC.id])).rows[0].active,true);
    const restoredFit=(await db.query('SELECT owner_id,deleted_at IS NULL active FROM handoffs WHERE id=$1',[ids.fitC.id])).rows[0];assert.equal(restoredFit.active,true);assert.equal(restoredFit.owner_id,ids.repB.id);
    assert.equal(restore.json.identityPreserved,true);assert.equal(restore.json.ownershipPreserved,true);
  });
});
