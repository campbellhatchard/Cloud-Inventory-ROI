'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {normalizeExternalNumber,toStoredValue,toDisplayValue,scenarioDisplayValue,historicalSnapshotMatches}=require('../src/shared/scenario-input-storage');
const {buildSnapshotRows}=require('../src/shared/value-history');
const {applyRoiValueEvent}=require('../src/shared/roi-value-application');
const {loadProspectEvidenceReview}=require('../src/shared/prospect-evidence-review');

test('canonical input storage preserves aliases, percentage units, decimals, zero, and missing values',()=>{
  assert.equal(normalizeExternalNumber('.5'),.5);
  assert.equal(normalizeExternalNumber('0'),0);
  assert.equal(normalizeExternalNumber('$55,000,000'),55000000);
  for(const missing of [null,undefined,'','   ','$','%','not sure'])assert.equal(normalizeExternalNumber(missing),null,String(missing));
  assert.equal(toStoredValue('contributionMarginPct',32),.32);
  assert.equal(toDisplayValue('contributionMarginPct',.32),32);
  assert.equal(scenarioDisplayValue({users:24},'userCount'),24);
  assert.equal(scenarioDisplayValue({labor:85000},'laborCost'),85000);
  assert.equal(scenarioDisplayValue({inventory:5000000},'inventoryValue'),5000000);
  const margin=buildSnapshotRows({contributionMarginPct:.32}).find(row=>row.canonicalInput==='contributionMarginPct');
  assert.equal(margin.normalizedValue,32);
  assert.equal(historicalSnapshotMatches('contributionMarginPct',.32,32),true);
  assert.equal(historicalSnapshotMatches('contributionMarginPct',.31,32),false);
});

function applicationClient({scenario,event,existingApplication=null}){
  const calls=[];
  return{calls,query:async(sql,params)=>{
    calls.push({sql,params});
    if(/FROM scenarios s[\s\S]*FOR UPDATE OF s/.test(sql))return{rows:[scenario]};
    if(/FROM roi_value_events e/.test(sql))return{rows:[event]};
    if(/FROM roi_value_applications a/.test(sql))return{rows:existingApplication?[existingApplication]:[]};
    if(/SELECT id,username FROM users/.test(sql))return{rows:[{id:'user-1',username:'qa_rep'}]};
    if(/INSERT INTO roi_value_applications/.test(sql)||/UPDATE scenarios SET data=/.test(sql)||/INSERT INTO audit_log/.test(sql))return{rows:[],rowCount:1};
    throw new Error('Unexpected SQL: '+sql);
  }};
}

test('one server transaction persists an applied decimal value, provenance, canonical ROI, application, and audit',async()=>{
  const scenario={id:'scenario-1',base_id:'base-1',version:4,is_current:true,outcome:null,governed_outcome:null,data:{modelVersion:28,currency:'USD',downtimeEventsYr:24,downtimeHrsPerEvent:6,downtimeCostPerHr:45,mDowntime:.2,invest:10000,contractMonths:36,fieldStates:{},fieldProvenance:{}}};
  const event={id:'event-1',base_id:'base-1',canonical_input:'downtimeHrsPerEvent',question_id:'q1',event_type:'prospect_submitted',value_text:'.5',normalized_value:'.5',discovery_submission_id:'submission-1',submission_base_id:'base-1',submission_answer_valid:true,created_at:'2026-10-05T00:00:00Z'};
  const client=applicationClient({scenario,event});
  const result=await applyRoiValueEvent({client,scenarioId:scenario.id,authorizedBaseId:scenario.base_id,canonicalInput:'downtimeHrsPerEvent',eventId:event.id,userId:'user-1',ipAddress:'127.0.0.1',idempotencyKey:'one-application'});
  assert.equal(result.ok,true);assert.equal(result.alreadyApplied,false);assert.equal(result.apply.persisted,true);assert.equal(result.apply.value,.5);assert.equal(result.apply.fieldState,'confirmed_prospect');assert.equal(result.apply.scenarioUnchanged,false);
  const update=client.calls.find(call=>/UPDATE scenarios SET data=/.test(call.sql));assert.ok(update);const saved=JSON.parse(update.params[1]);assert.equal(saved.downtimeHrsPerEvent,.5);assert.equal(saved.fieldStates.downtimeHrsPerEvent,'confirmed_prospect');assert.equal(saved.fieldProvenance.downtimeHrsPerEvent.eventId,'event-1');assert.ok(Number.isFinite(saved.annualBenefit));
  assert.equal(client.calls.filter(call=>/INSERT INTO roi_value_applications/.test(call.sql)).length,1);assert.equal(client.calls.filter(call=>/INSERT INTO audit_log/.test(call.sql)).length,1);
});

test('same-value application still persists Prospect provenance and an idempotent replay performs no second write',async()=>{
  const scenario={id:'scenario-1',base_id:'base-1',version:4,is_current:true,outcome:null,governed_outcome:null,data:{modelVersion:28,currency:'USD',downtimeEventsYr:24,invest:10000,contractMonths:36,fieldStates:{downtimeEventsYr:'estimated'},fieldProvenance:{}}};
  const event={id:'event-24',base_id:'base-1',canonical_input:'downtimeEventsYr',question_id:'q1',event_type:'prospect_submitted',value_text:'24',normalized_value:'24',discovery_submission_id:'submission-1',submission_base_id:'base-1',submission_answer_valid:true,created_at:'2026-10-05T00:00:00Z'};
  const firstClient=applicationClient({scenario,event});const first=await applyRoiValueEvent({client:firstClient,scenarioId:scenario.id,authorizedBaseId:scenario.base_id,canonicalInput:'downtimeEventsYr',eventId:event.id,userId:'user-1'});assert.equal(first.ok,true);assert.equal(first.apply.value,24);
  const appliedScenario={...scenario,data:{...scenario.data,fieldStates:{downtimeEventsYr:'confirmed_prospect'},fieldProvenance:{downtimeEventsYr:first.apply.provenance}}};
  const existing={id:first.apply.applicationId,source_value_event_id:event.id,canonical_input:'downtimeEventsYr',applied_stored_value:24,provenance:first.apply.provenance};const replayClient=applicationClient({scenario:appliedScenario,event,existingApplication:existing});const replay=await applyRoiValueEvent({client:replayClient,scenarioId:scenario.id,authorizedBaseId:scenario.base_id,canonicalInput:'downtimeEventsYr',eventId:event.id,userId:'user-1'});assert.equal(replay.ok,true);assert.equal(replay.alreadyApplied,true);assert.equal(replayClient.calls.some(call=>/UPDATE scenarios SET data=/.test(call.sql)),false);assert.equal(replayClient.calls.some(call=>/INSERT INTO audit_log/.test(call.sql)),false);
});

test('an idempotency key cannot silently apply different evidence',async()=>{
  const scenario={id:'scenario-1',base_id:'base-1',version:4,is_current:true,outcome:null,governed_outcome:null,data:{modelVersion:28,invest:10000,contractMonths:36,fieldStates:{},fieldProvenance:{}}};
  const event={id:'event-2',base_id:'base-1',canonical_input:'downtimeEventsYr',question_id:'q2',event_type:'prospect_submitted',normalized_value:'25',discovery_submission_id:'submission-1',submission_base_id:'base-1',submission_answer_valid:true};
  const existing={id:'application-1',source_value_event_id:'different-event',canonical_input:'downtimeHrsPerEvent',idempotency_key:'reused'};
  const client=applicationClient({scenario,event,existingApplication:existing});
  const result=await applyRoiValueEvent({client,scenarioId:scenario.id,authorizedBaseId:scenario.base_id,canonicalInput:'downtimeEventsYr',eventId:event.id,userId:'user-1',idempotencyKey:'reused'});
  assert.equal(result.ok,false);assert.equal(result.code,'IDEMPOTENCY_KEY_REUSED');
  assert.equal(client.calls.some(call=>/UPDATE scenarios SET data=/.test(call.sql)),false);
});

test('authoritative review reports applied state and refuses silent duplicate canonical-input selection',async()=>{
  const submission={id:'submission-1',submission_number:1,submitted_at:'2026-10-05T00:00:00Z'};
  const answers=[{question_id:'q1',question_text:'Hours?',canonical_input:'downtimeHrsPerEvent',answer_text:'.5',normalized_value:'.5'}];
  const event={id:'event-1',question_id:'q1',canonical_input:'downtimeHrsPerEvent',event_type:'prospect_submitted',normalized_value:'.5',discovery_submission_id:'submission-1'};
  const application={id:'application-1',source_value_event_id:'event-1'};let n=0;const client={query:async()=>({rows:[ [submission],answers,[event],[application] ][n++]})};
  const scenario={id:'scenario-1',base_id:'base-1',version:1,is_current:true,data:{downtimeHrsPerEvent:.5,fieldProvenance:{downtimeHrsPerEvent:{eventId:'event-1'}}}};
  const review=await loadProspectEvidenceReview({client,scenario,canEdit:true});assert.equal(review.rows[0].status,'APPLIED');assert.equal(review.rows[0].currentValue,.5);

  n=0;const duplicateAnswers=[...answers,{...answers[0],question_id:'q2',question_text:'Alternate hours?'}];const duplicateClient={query:async()=>({rows:[ [submission],duplicateAnswers,[event],[] ][n++]})};const duplicate=await loadProspectEvidenceReview({client:duplicateClient,scenario:{...scenario,data:{}},canEdit:true});assert.equal(duplicate.rows[0].status,'CONFLICT');assert.equal(duplicate.rows[0].answer,null);assert.equal(duplicate.rows[0].conflictingAnswers.length,2);
});

test('production route delegates application to the transactional authority and review is one endpoint',()=>{
  const route=fs.readFileSync(path.join(__dirname,'..','src','routes','scenarios.js'),'utf8');const discovery=fs.readFileSync(path.join(__dirname,'..','public','discovery.js'),'utf8');
  assert.match(route,/transaction\(client=>applyRoiValueEvent/);assert.match(route,/SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);assert.match(route,/loadProspectEvidenceReview/);
  const loader=discovery.slice(discovery.indexOf('async function loadLatestSubmittedEvidence'),discovery.indexOf('let _answerSaveTimer'));
  assert.match(loader,/prospect-evidence-review/);assert.doesNotMatch(loader,/Promise\.all|discovery-submissions|value-history/);
  assert.doesNotMatch(discovery.slice(discovery.indexOf('async function applySubmittedEvidence'),discovery.indexOf('function clearDiscoveryAnswers')),/closeProspectSyncModal/);
});
