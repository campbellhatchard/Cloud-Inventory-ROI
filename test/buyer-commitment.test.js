const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluateBuyerCommitment}=require('../src/shared/buyer-commitment');

const now='2026-08-30';
const ids=['economic_ack','funding','criteria','decision_process','roi_value_case_validation','roi_executive_approval','preference','selected','funding_reconfirmed','signature_date'];
const stageConfig=[{criteria:ids.map(id=>({id,minQuality:'strong',customerValidation:true,freshnessDays:60}))}];
const evidence=(id,date='2026-08-20',extra={})=>({[id]:{evidence:`Customer confirmed ${id}`,stakeholder:'Customer owner',source:'Customer meeting',evidenceDate:date,quality:'strong',customerValidated:true,...extra}});
const plan=(owner='prospect',dueDate='2026-09-06',status='pending',title='Customer will attend solution review')=>({milestones:[{owner,dueDate,status,title}]});
const evaluate=extra=>evaluateBuyerCommitment({stageConfig,now,...extra});

test('engaged Economic Buyer plus one dated customer milestone is Moderate, not Very Strong',()=>{
  const result=evaluate({stakeholders:[{role:'economic_buyer',engaged:true}],plan:plan()});
  assert.equal(result.level,'moderate');assert.equal(result.economicBuyerEngaged,true);
});
test('Economic Buyer engagement alone remains Weak',()=>assert.equal(evaluate({stakeholders:[{role:'economic_buyer',engaged:true}]}).level,'weak'));
test('a generic dated customer or joint milestone is capped at Moderate',()=>{
  assert.equal(evaluate({plan:plan('prospect')}).level,'moderate');assert.equal(evaluate({plan:plan('joint')}).level,'moderate');
});
test('seller-owned milestone does not increase Buyer Commitment',()=>assert.equal(evaluate({plan:plan('cloud_inventory')}).level,'weak'));
test('overdue customer milestone is a risk signal rather than positive commitment',()=>{
  const result=evaluate({plan:plan('prospect','2026-07-31')});assert.equal(result.level,'weak');assert.equal(result.planSignals.overdueCustomerCommitments,1);assert.equal(result.planSignals.activeCustomerCommitments,0);
});
test('completed and undated customer milestones support context but do not bypass substantive evidence',()=>{
  const result=evaluate({plan:{milestones:[...plan('customer','2026-08-20','done','Completed workshop').milestones,...plan('joint','', 'pending','Plan security review').milestones]}});
  assert.equal(result.level,'weak');assert.equal(result.planSignals.completedCustomerCommitments,1);assert.equal(result.planSignals.undatedCustomerCommitments,1);
});
test('early validated economic evidence supports Moderate independent of evidence quality terminology',()=>assert.equal(evaluate({evidence:evidence('economic_ack')}).level,'moderate'));
for(const id of ['funding','criteria','decision_process','roi_value_case_validation','roi_executive_approval','preference'])test(`${id} supports Strong but not Very Strong`,()=>assert.equal(evaluate({evidence:evidence(id)}).level,'strong'));
test('explicit selection supports Very Strong without requiring a JPP',()=>assert.equal(evaluate({evidence:evidence('selected')}).level,'very_strong'));
test('funding reconfirmation supports Very Strong',()=>assert.equal(evaluate({evidence:evidence('funding_reconfirmed')}).level,'very_strong'));
test('signature target alone is Strong, while selection plus signature remains Very Strong',()=>{
  assert.equal(evaluate({evidence:evidence('signature_date')}).level,'strong');
  assert.equal(evaluate({evidence:{...evidence('signature_date'),...evidence('selected')}}).level,'very_strong');
});
test('Stale substantive evidence cannot establish current commitment',()=>{
  const result=evaluate({evidence:evidence('funding','2026-05-01')});assert.equal(result.level,'weak');assert.equal(result.staleOrUnusableSignals[0].freshness,'Stale');
});
test('Aging substantive evidence remains valid and visible',()=>{
  const result=evaluate({evidence:evidence('funding','2026-07-12')});assert.equal(result.level,'strong');assert.equal(result.supportingSignals[0].freshness,'Aging');
});
test('Closed Won is Very Strong, while Stage 7 or Closed Lost cannot manufacture commitment',()=>{
  assert.equal(evaluate({outcome:'won'}).level,'very_strong');assert.equal(evaluate({outcome:'lost',currentStage:7}).level,'weak');assert.equal(evaluate({currentStage:7}).level,'weak');
});
test('Stage 6 and readiness do not affect an independently Moderate assessment',()=>assert.equal(evaluate({currentStage:6,readiness:100,plan:plan()}).level,'moderate'));
test('every result is explainable and non-Weak levels have a supporting signal',()=>{
  for(const result of [evaluate({}),evaluate({plan:plan()}),evaluate({evidence:evidence('funding')}),evaluate({evidence:evidence('selected')})]){
    assert.ok(Object.hasOwn(result,'nextLevel'));assert.ok(result.nextRequirement);if(result.level!=='weak')assert.ok(result.strongestSignal);
  }
});
test('stage readiness consumes the shared service and returns detail and a blocker without the old shortcut',()=>{
  const service=fs.readFileSync(path.join(__dirname,'..','src','shared','stage-readiness-service.js'),'utf8');
  assert.match(service,/evaluateBuyerCommitment/);assert.match(service,/commitmentDetails:commitmentResult/);assert.match(service,/commitmentBlockingReason/);
  assert.doesNotMatch(service,/customerOpen\.some/);assert.doesNotMatch(service,/econ\?'very_strong':'strong'/);
});
test('existing stage minimum commitment thresholds remain unchanged',()=>{
  const migration=fs.readFileSync(path.join(__dirname,'..','migrations','026_buycycle_stages_2_7.sql'),'utf8');
  for(const [stage,level] of [[2,'moderate'],[3,'strong'],[4,'strong'],[5,'strong'],[6,'very_strong'],[7,'very_strong']])assert.match(migration,new RegExp(`\\(${stage},[^\\n]+,'${level}'`));
});
