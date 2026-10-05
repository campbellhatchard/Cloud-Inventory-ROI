'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Prospect value application uses immutable opportunity evidence without a nonexistent session column',async()=>{
  const {resolveValueApplication}=require('../src/shared/prospect-value-authority');
  const event={id:'event-1',base_id:'base-1',canonical_input:'contributionMarginPct',event_type:'prospect_submitted',normalized_value:32,discovery_submission_id:'submission-1',submission_base_id:'base-1',submission_answer_valid:true,created_at:'2026-10-01'};
  let sql='';
  const result=await resolveValueApplication({query:async(text,params)=>{sql=text;assert.deepEqual(params,['event-1','base-1','contributionMarginPct']);return{rows:[event]};},eventId:'event-1',baseId:'base-1',canonicalInput:'contributionMarginPct'});
  assert.equal(result.ok,true);assert.equal(result.apply.value,32);assert.equal(result.apply.fieldState,'confirmed_prospect');
  assert.match(sql,/discovery_submission_answers/);assert.match(sql,/dsa\.canonical_input=e\.canonical_input/);assert.doesNotMatch(sql,/discovery_sessions|dss\.customer_id/);
  const mismatch=await resolveValueApplication({query:async()=>({rows:[{...event,submission_answer_valid:false}]}),eventId:'event-1',baseId:'base-1',canonicalInput:'contributionMarginPct'});
  assert.equal(mismatch.ok,false);assert.equal(mismatch.code,'PROSPECT_EVIDENCE_MISMATCH');assert.equal(mismatch.problem.phase,'prospect-evidence-validation');
});

test('Prospect value application rejects unknown fields before querying',async()=>{
  const {resolveValueApplication}=require('../src/shared/prospect-value-authority');let queried=false;
  const result=await resolveValueApplication({query:async()=>{queried=true;return{rows:[]}},eventId:'event-1',baseId:'base-1',canonicalInput:'notAField'});
  assert.equal(queried,false);assert.equal(result.code,'UNKNOWN_FINANCIAL_INPUT');assert.equal(result.status,400);
});

test('Field Help owns exact field semantics instead of inferring meaning from a shared formula',()=>{
  const knowledge=require('../src/shared/application-knowledge');
  const revenue=knowledge.fieldKnowledge('revenue');
  const margin=knowledge.fieldKnowledge('contributionMarginPct');
  assert.equal(revenue.label,'Annual revenue');assert.match(revenue.definition,/Total annual company or in-scope business revenue/);assert.match(revenue.whatToEnter,/not gross profit, contribution margin/);
  assert.equal(margin.label,'Contribution margin');assert.match(margin.definition,/after variable costs/);
  assert.notEqual(revenue.definition,margin.definition);
  const answer=knowledge.deterministicFieldAnswer('What does this field mean and what should I enter?','revenue');
  assert.match(answer,/Annual revenue:/);assert.match(answer,/not gross profit, contribution margin/);assert.doesNotMatch(answer,/This is the contribution margin field/);
});

test('Competitive context defaults to the active saved scenario, preserves only same-scenario override, and cancels stale loads',()=>{
  const context=require('../public/competitive-context');
  assert.equal(context.resolve({scenarioKey:'scenario-a',savedProduct:'mep',currentProduct:'cip'}),'mep');
  assert.equal(context.resolve({scenarioKey:'unsaved-b',savedProduct:null,currentProduct:'epp'}),'epp');
  context.setOverride('scenario-a','cip');
  assert.equal(context.resolve({scenarioKey:'scenario-a',savedProduct:'mep'}),'cip');
  assert.equal(context.resolve({scenarioKey:'scenario-b',savedProduct:'mep',currentProduct:'cip'}),'mep');
  const first=context.beginRequest('workspace','mep');const second=context.beginRequest('workspace','cip');
  assert.equal(first.isCurrent(),false);assert.equal(Boolean(first.signal?.aborted),true);assert.equal(second.isCurrent(),true);
  const app=read('public/app.js'),ui=read('public/competitive-intelligence-v662.js');
  assert.match(app,/CICompetitiveContext\?\.resolve/);assert.match(ui,/beginRequest\('competitive-workspace'/);assert.match(ui,/if\(op&&!op\.isCurrent\(\)\)return/);
});

test('Customer summary separates opportunity count from saved version count',()=>{
  const {mapCustomerSummaryRow}=require('../src/shared/customer-summary');
  const result=mapCustomerSummaryRow({id:'c1',name:'Northstar',owner_id:'u1',opportunity_count:'1',version_count:'5'});
  assert.equal(result.opportunityCount,1);assert.equal(result.versionCount,5);assert.equal(result.scenarioCount,1);
  const auth=read('src/authorization.js');assert.match(auth,/COUNT\(DISTINCT s\.base_id\).*opportunity_count/);assert.match(auth,/COUNT\(s\.id\).*version_count/);
  for(const ui of ['public/admin-customers.js','public/customer-switcher.js']){const source=read(ui);assert.match(source,/opportunityCount/);assert.match(source,/versionCount/);}
});

test('Error Log returns one internally consistent page contract from one statement',async()=>{
  const {recentErrors}=require('../src/error-log');let calls=0,sql='';
  const result=await recentErrors(200,0,'client',async text=>{calls++;sql=text;return{rows:[{errors:[{id:'e1',source:'client:ui'}],total_all:693,total_filtered:115,total_server:578,total_client:115}]};});
  assert.equal(calls,1);assert.match(sql,/jsonb_agg/);assert.equal(result.page.totalAll,693);assert.equal(result.page.totalFiltered,115);assert.equal(result.page.returned,1);assert.deepEqual(result.page.counts,{all:693,server:578,client:115});
  const ui=read('public/index.html');assert.match(ui,/page\.totalAll/);assert.match(ui,/page\.totalFiltered/);assert.match(ui,/page\.counts\?\.client/);assert.doesNotMatch(ui,/All \(' \+ all\.length/);
});

test('Reliability correction does not alter ROI Model v2.8 authority',()=>{
  const pkg=require('../package.json'),knowledge=require('../config/application-knowledge.json');
  assert.equal(knowledge.roiModel.version,'2.8');assert.equal(knowledge.roiModel.modelVersion,28);
  assert.match(read('src/shared/roi-engine.js'),/modelVersion/);assert.equal(pkg.name,'cloud-inventory-roi-builder');
});
