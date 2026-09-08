const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const stages=require(path.join(root,'src','shared','buycycle-stage.js'));

test('authoritative BuyCycle model exposes only governed stages 2 through 7',()=>{
  assert.equal(stages.BUYCYCLE_MIN_STAGE,2);
  assert.equal(stages.BUYCYCLE_MAX_ACTIVE_STAGE,6);
  assert.equal(stages.BUYCYCLE_CLOSED_STAGE,7);
  assert.deepEqual(stages.BUYCYCLE_STAGE_NAMES,{
    2:'Define Economic Consequences',3:'Commit Funding',4:'Define Decision Criteria',
    5:'Evaluate Alternatives',6:'Select Vendor Solution',7:'Closed'
  });
});

test('stage parsing accepts persisted numbers and labels without inventing stages',()=>{
  for(let stage=2;stage<=7;stage++){
    assert.equal(stages.parseBuyCycleStage(stage,null),stage);
    assert.equal(stages.parseBuyCycleStage(String(stage),null),stage);
    assert.equal(stages.parseBuyCycleStage(`Stage ${stage} — ${stages.BUYCYCLE_STAGE_NAMES[stage]}`,null),stage);
    assert.equal(stages.isValidBuyCycleStage(stage),true);
  }
  for(const value of [null,undefined,'','Stage 1','Stage 8','foo','account 4']){
    assert.equal(stages.parseBuyCycleStage(value,null),null);
    assert.equal(stages.isValidBuyCycleStage(value),false);
  }
  assert.equal(stages.parseBuyCycleStage('bad'),2);
});

test('active progression stops at Stage 6 and closure is exclusively Stage 7',()=>{
  assert.deepEqual([2,3,4,5,6].map(stages.isActiveBuyCycleStage),[true,true,true,true,true]);
  assert.equal(stages.isActiveBuyCycleStage(7),false);
  assert.equal(stages.isClosedBuyCycleStage(7),true);
  assert.deepEqual([2,3,4,5,6].map(stages.getNextActiveBuyCycleStage),[3,4,5,6,null]);
  assert.equal(stages.getNextActiveBuyCycleStage(7),null);
  assert.equal(stages.getBuyCycleStageLabel(3),'Stage 3 — Commit Funding');
  assert.equal(stages.getBuyCycleStageLabel(7),'Stage 7 — Closed');
});

test('persisted Stage 6 and Stage 7 data win over older fallback fields',()=>{
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:6,repAssessedStage:4,dealStage:'Stage 3 — Commit Funding'}),6);
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:7,repAssessedStage:6,dealStage:'Stage 6 — Select Vendor Solution'}),7);
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:null,repAssessedStage:null,dealStage:'Stage 7 — Closed'}),7);
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:null,repAssessedStage:null,dealStage:null,dataDealStage:'Stage 6 — Select Vendor Solution'}),6);
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:1,repAssessedStage:1,dealStage:'Stage 1'}),2);
});

test('rep assessment can never resolve or overwrite official stage',()=>{
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:4,repAssessedStage:5,dealStage:'Stage 4 — Define Decision Criteria'}),4);
  assert.equal(stages.resolvePersistedBuyCycleStage({currentStage:null,repAssessedStage:6,dealStage:'Proposal'}),2);
  const route=fs.readFileSync(path.join(root,'src','routes','stage-readiness.js'),'utf8');
  const putStart=route.indexOf("router.put('/:id',async");
  const put=route.slice(putStart,route.indexOf("router.post('/:id/advance'",putStart));
  assert.doesNotMatch(put,/UPDATE scenarios SET deal_stage/);
  assert.doesNotMatch(put,/scenario_stage_history/);
});

test('R7 scenario save is server-owned and versions preserve governance',()=>{
  const route=fs.readFileSync(path.join(root,'src','routes','scenarios.js'),'utf8');
  assert.doesNotMatch(route,/const \{ name, company, data, industry, dealStage,/);
  assert.match(route,/sourceGovernance\.stage_entered_at/);
  assert.match(route,/sourceGovernance\.evidence/);
  assert.match(route,/sourceGovernance\.outcome/);
  assert.match(route,/dealStage:officialLabel/);
  assert.match(route,/currentBuyCycleStageLabel/);
});

test('R7 removes editable seller-stage taxonomy and template defaults',()=>{
  const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
  const templates=fs.readFileSync(path.join(root,'public','scenario-templates.js'),'utf8');
  const sf=fs.readFileSync(path.join(root,'public','solution-fit.js'),'utf8');
  assert.doesNotMatch(html,/id="dealStage"/);
  assert.match(html,/Current BuyCycle Stage/);
  assert.doesNotMatch(app,/dealStage:\s*gs\('dealStage'\)/);
  assert.doesNotMatch(templates,/dealStage:\s*['"]Discovery/);
  assert.doesNotMatch(sf,/const stageMap/);
});

test('stage readiness uses the shared model and retires the mutating legacy endpoint',()=>{
  const route=fs.readFileSync(path.join(root,'src','routes','stage-readiness.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'public','buyer-readiness.js'),'utf8');
  assert.match(route,/require\('\.\.\/shared\/buycycle-stage'\)/);
  assert.doesNotMatch(route,/function stageNumber|Math\.min\(5/);
  assert.match(route,/router\.post\('\/:id\/advance',\(_req,res\)=>res\.status\(410\)/);
  assert.match(route,/target=getNextActiveBuyCycleStage\(a\.currentStageNumber\)/);
  assert.match(route,/Stage 7 can only be entered through Close Opportunity/);
  assert.match(ui,/\/advance-stage/);
  assert.doesNotMatch(ui,/stage-readiness\/\$\{[^}]+\}\/advance[`'\"]/);
});
