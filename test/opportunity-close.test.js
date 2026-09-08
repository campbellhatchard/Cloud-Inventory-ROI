const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {LOSS_REASONS,WON_CERTIFICATIONS,validateCloseRequest,finalValueCase}=require('../src/shared/opportunity-close');

const now='2026-08-30T12:00:00Z';
const criteria=complete=>['selected','commercial','contract','funding_reconfirmed','signature_date','implementation'].map(id=>({id,name:id,required:true,complete,blockedBy:complete?[]:['Missing exact evidence']}));
const assessment=(stage=6,complete=true)=>({currentStageNumber:stage,stages:[{order:6,ready:complete,readiness:complete?100:0,required:6,done:complete?6:0,criteria:criteria(complete)}]});
const lost={outcome:'lost',closeDate:'2026-08-30',primaryLossReason:'no_decision',customerFeedback:'Customer stopped the buying process.'};
const wonCert=()=>Object.fromEntries(WON_CERTIFICATIONS.map(k=>[k,true]));
const won={outcome:'won',closeDate:'2026-08-30',closeCertifications:wonCert()};
const validate=(body,a=assessment(),overrides=[])=>validateCloseRequest({body,assessment:a,overrides,now});

test('controlled loss taxonomy preserves analytically distinct outcomes',()=>{
  assert.equal(Object.keys(LOSS_REASONS).length,14);for(const id of ['no_decision','status_quo','project_cancelled','budget','price'])assert.ok(LOSS_REASONS[id]);
});
test('Closed Lost is valid from Stage 2 and Stage 6 without readiness',()=>{
  assert.equal(validate(lost,assessment(2,false)).valid,true);assert.equal(validate(lost,assessment(6,false)).valid,true);
});
test('loss reason must be present and controlled',()=>{
  assert.match(validate({...lost,primaryLossReason:''}).error,/valid Primary Loss Reason/);
  assert.match(validate({...lost,primaryLossReason:'random_text'}).error,/valid Primary Loss Reason/);
});
test('competitor and customer feedback are conditionally required',()=>{
  assert.match(validate({...lost,primaryLossReason:'competitor',competitor:''}).error,/Winning Competitor/);
  assert.equal(validate({...lost,primaryLossReason:'competitor',competitor:'Vendor X'}).valid,true);
  assert.match(validate({...lost,customerFeedback:' '}).error,/Customer Feedback/);
});
test('Closed Won requires Stage 6 and complete Stage 6 governance',()=>{
  assert.match(validate(won,assessment(5,true)).error,/requires Stage 6/);
  assert.match(validate(won,assessment(6,false)).error,/readiness is incomplete/);
  assert.equal(validate(won,assessment(6,true)).valid,true);
});
test('all actual Won certifications are required',()=>{
  for(const key of WON_CERTIFICATIONS){const body={...won,closeCertifications:{...won.closeCertifications,[key]:false}};assert.match(validate(body).errors.join(' '),new RegExp(key));}
});
test('manager role is irrelevant; only a current relevant exception can bypass governance',()=>{
  const irrelevant={id:1,manager_id:9,missing_criterion:'unrelated',risk_acknowledged:true,expires_at:'2026-09-30'};
  assert.equal(validate(won,assessment(5,false),[irrelevant]).valid,false);
  const valid={id:2,manager_id:9,missing_criterion:'stage_6',risk_acknowledged:true,expires_at:'2026-09-30'};
  assert.match(validate(won,assessment(5,false),[valid]).error,/Acknowledge/);
  assert.equal(validate({...won,managerExceptionAcknowledged:true},assessment(5,false),[valid]).valid,true);
  assert.equal(validate({...won,managerExceptionAcknowledged:true},assessment(5,false),[{...valid,expires_at:'2026-08-01'}]).valid,false);
});
test('future and malformed close dates are rejected',()=>{
  assert.match(validate({...lost,closeDate:'2026-08-31'}).error,/future/);assert.match(validate({...lost,closeDate:'August 30'}).error,/valid date/);
});
test('final value case ignores fabricated browser metrics and uses authoritative formulas',()=>{
  const data={modelVersion:25,users:10,labor:50000,mLabor:.2,invest:1000,otc:500,contractMonths:36};
  const value=finalValueCase({scenarioData:data,roiMaturityDetails:{level:2,label:'Customer Data',customerSupportedValuePct:60,activeDrivers:[]},annualBenefit:999999999});
  assert.notEqual(value.annualBenefit,999999999);assert.equal(value.totalContractInvestment,3500);assert.equal(value.roiMaturity,2);
});
test('close UI has no native outcome prompts or hard-coded certifications',()=>{
  const ui=fs.readFileSync(path.join(__dirname,'..','public','buyer-readiness.js'),'utf8'),start=ui.indexOf('window.openCloseOpportunity'),end=ui.indexOf('const baseRenderWithCommitment');const closeUi=ui.slice(start,end);
  assert.doesNotMatch(closeUi,/\bconfirm\s*\(/);assert.doesNotMatch(closeUi,/\bprompt\s*\(/);
  assert.match(closeUi,/Continue with Closed Won/);assert.match(closeUi,/Continue with Closed Lost/);assert.match(closeUi,/Close Opportunity as Won/);assert.match(closeUi,/Close Opportunity as Lost/);
  assert.doesNotMatch(closeUi,/agreementExecuted:true|finalInformationAccurate:true|finalRoiSaved:true|handoffReady:true/);assert.match(closeUi,/x\.checked/);
});
test('route derives Stage at Loss and final snapshots on the server',()=>{
  const route=fs.readFileSync(path.join(__dirname,'..','src','routes','stage-readiness.js'),'utf8');
  assert.match(route,/stageAtLoss=outcome==='lost'\?a\.currentStageNumber:null/);assert.match(route,/finalValueCase\(\{scenarioData:x\.sc\.data/);assert.match(route,/evidenceSupportedStage:a\.evidenceStage/);assert.match(route,/opportunity_team_snapshot/);
  assert.doesNotMatch(route,/outcome==='won'&&a\.currentStageNumber!==6&&!hasRole/);
});
test('closed-state UI returns before rendering active controls',()=>{
  const ui=fs.readFileSync(path.join(__dirname,'..','public','buyer-readiness.js'),'utf8');assert.match(ui,/currentStageNumber===7&&model\.outcome\)\{renderClosed\(root\);return;/);assert.match(ui,/Opportunity closed in the ROI application\. Update CRM separately/);
});
