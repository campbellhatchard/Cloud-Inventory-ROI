const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {deriveStageReadiness,liveReadinessSummary}=require('../src/shared/stage-readiness-service');

function context({date='2026-01-01',stageEnteredAt='2026-08-08'}={}){
 const names={2:'Define Economic Consequences',3:'Commit Funding',4:'Define Decision Criteria',5:'Evaluate Alternatives'};
 const cfg=[2,3,4,5].map(n=>({stage_order:n,stage_name:names[n],minimum_roi_maturity:0,minimum_commitment:'weak',criteria:[{id:`proof_${n}`,name:`Stage ${n} buyer proof`,required:true,minQuality:'weak',freshnessDays:60,customerValidation:false}]}));
 const evidence=Object.fromEntries(cfg.map(s=>[`proof_${s.stage_order}`,{evidence:'Customer confirmed',stakeholder:'Buyer',source:'Meeting',evidenceDate:date,quality:'strong'}]));
 return{sc:{id:'scenario-1',company:'Acme',rep:'Rep',deal_stage:'Stage 5',data:{}},cfg,gov:{current_stage:5,rep_assessed_stage:5,evidence,stage_entered_at:stageEnteredAt},people:[],plan:null,handoff:null,prospectInputs:0,history:[{evidence_supported_stage:5,readiness:100,roi_maturity:4,commitment_strength:'strong'}],overrides:[]};
}

test('live readiness ignores a now-stale historical stage snapshot',()=>{
 const ctx=context(),history=structuredClone(ctx.history);
 const live=deriveStageReadiness(ctx,{now:new Date('2026-08-31T12:00:00Z')});
 assert.ok(live.evidenceStage<5);assert.ok(live.readiness<100);assert.equal(live.freshnessSummary.stale,1);assert.deepEqual(ctx.history,history);
});

test('new buyer evidence changes live support without a stage event',()=>{
 const before=deriveStageReadiness(context(),{now:new Date('2026-08-31T12:00:00Z')});
 const afterCtx=context({date:'2026-08-20'}),history=structuredClone(afterCtx.history);
 const after=deriveStageReadiness(afterCtx,{now:new Date('2026-08-31T12:00:00Z')});
 assert.equal(before.currentStageNumber,after.currentStageNumber);assert.ok(after.readiness>before.readiness);assert.ok(after.evidenceStage>before.evidenceStage);assert.deepEqual(afterCtx.history,history);
});

test('days in stage uses governance time, not scenario edit time',()=>{
 const ctx=context({date:'2026-08-20',stageEnteredAt:'2026-08-08T12:00:00Z'});ctx.sc.updated_at='2026-08-31T11:59:00Z';
 const live=deriveStageReadiness(ctx,{now:new Date('2026-08-31T12:00:00Z')});assert.equal(live.daysInStage,23);
});

test('live summary exposes explainable management fields and exact blockers',()=>{
 const live=liveReadinessSummary(deriveStageReadiness(context(),{now:new Date('2026-08-31T12:00:00Z')}));
 for(const key of ['currentStage','repAssessmentStage','evidenceStage','stageGap','alignmentRisk','readiness','roiMaturity','buyerCommitment','stakeholderCoverage','daysInStage','mandatoryCriteria','blockingCriteria','freshnessSummary','setupNeeded','outcome'])assert.ok(Object.hasOwn(live,key),key);
 assert.match(live.blockingCriteria[0].blockedBy.join(' '),/stale/i);
});

test('Sales Manager and switcher consume batched live readiness, never Stage History',()=>{
 const manager=read('src/routes/sales-manager.js'),auth=read('src/authorization.js'),service=read('src/shared/stage-readiness-service.js'),ui=read('public/sales-manager.js');
 assert.match(manager,/evaluateLiveStageReadinessBatch/);assert.doesNotMatch(manager,/FROM scenario_stage_history|historyByScenario|latestStage/);
 const search=auth.slice(auth.indexOf('async function searchAuthorizedCustomers'),auth.indexOf('async function getTeamUsers'));
 assert.match(search,/evaluateLiveStageReadinessBatch/);assert.doesNotMatch(search,/FROM scenario_stage_history|JOIN LATERAL \(SELECT evidence_supported_stage/);
 assert.match(service,/Stage History is deliberately excluded/);assert.doesNotMatch(ui,/\/api\/stage-readiness\//);
});

test('manager UI is governed, exception-first, and has grounded navigation',()=>{
 const ui=read('public/sales-manager.js');
 assert.doesNotMatch(ui,/Selected by rep|Rep-selected stage|Customer activity<\/span><strong>Not tracked|Days in stage<\/span><strong>Not tracked/);
 for(const term of ['Current BuyCycle Stage','Rep Assessment','Evidence-Supported Stage','Current Stage Readiness','ROI Maturity','Buyer Commitment','Latest buyer evidence','What is blocking this stage?','Open Buyer Readiness'])assert.match(ui,new RegExp(term));
 assert.match(ui,/>Active<\/option>.*>Closed<\/option>.*>All<\/option>/s);
});

test('management GET is read-only and closed opportunities leave active readiness queue',()=>{
 const route=read('src/routes/sales-manager.js'),ui=read('public/sales-manager.js');
 const get=route.slice(route.indexOf("router.get('/dashboard'"),route.indexOf("router.post('/actions'"));
 assert.doesNotMatch(get,/INSERT INTO scenario_stage_history|UPDATE scenario_stage_history|UPDATE scenario_stage_governance|UPDATE scenarios/);
 assert.match(ui,/filters\.state==='closed'.*stageGovernance\?\.outcome/s);assert.match(route,/if\(g\.outcome\)return\{level:'No Intervention Needed'/);
});

test('Help distinguishes live readiness from immutable Stage History',()=>{
 const help=read('public/help-v6.js');assert.match(help,/live Buyer Readiness/);assert.match(help,/Stage History is historical/);assert.match(help,/Manager actions remain internal and are not buyer evidence/);
});
