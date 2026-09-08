const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Christie uses only the governed 2–7 stage model and server criteria',()=>{
  const coach=read('public/deal-coach.js');
  assert.doesNotMatch(coach,/Problem Discovery|Problem Recognition|Closed \/ Value Transition/);
  assert.doesNotMatch(coach,/stageExitEvidence|repSelectedDealStage|statedBuyCyclePosition|statedPositionExitEvidence/);
  assert.match(coach,/stageReadiness:g/);
  assert.match(coach,/sourceSummary/);
  assert.match(coach,/blockedBy/);
  assert.match(coach,/roiMaturityDetails/);
  assert.match(coach,/commitmentDetails/);
});

test('Deal Coach presents the authoritative three-stage relationship without CRM terminology',()=>{
  const coach=read('public/deal-coach.js');
  for(const term of ['Current BuyCycle Stage','Rep Assessment','Evidence-Supported Stage'])assert.match(coach,new RegExp(term));
  assert.doesNotMatch(coach,/CRM Selling Stage|Formal opportunity stage|Rep-Selected Deal Stage|Christie Evidence Assessment/);
  for(const field of ['currentBuyCycleStage','repAssessmentStage','evidenceSupportedStage'])assert.match(coach,new RegExp(field));
});

test('Rep Assessment save is minimal, advisory, owner-controlled, and closed-safe',()=>{
  const coach=read('public/deal-coach.js'),route=read('src/routes/stage-readiness.js');
  assert.match(coach,/JSON\.stringify\(\{repAssessedStage:Number\(stage\)\}\)/);
  assert.doesNotMatch(coach,/repAssessedStage:Number\(stage\).*evidence:/);
  assert.match(route,/Rep Assessment is read-only after the opportunity is closed/);
  const start=route.indexOf("router.put('/:id',async");
  const end=route.indexOf("router.post('/:id/advance'",start);
  const put=route.slice(start,end);
  assert.doesNotMatch(put,/UPDATE scenarios SET deal_stage|scenario_stage_history|stage_entered_at=NOW/);
});

test('Christie closed-state fallbacks shift to transition or lessons rather than advancement',()=>{
  const coach=read('public/deal-coach.js');
  assert.match(coach,/CLOSED WON TRANSITION/);
  assert.match(coach,/value-realization baseline/);
  assert.match(coach,/CLOSED LOST REVIEW/);
  assert.match(coach,/Stage at Loss/);
  assert.match(coach,/lessons learned/);
});

test('AI Help and live Help explain governed stage changes and CRM independence',()=>{
  const assistant=read('public/assistant.js'),help=read('public/help-v6.js'),server=read('server.js');
  assert.match(assistant,/\/api\/ai-help/);
  assert.match(server,/applicationKnowledge\.systemPrompt/);
  assert.match(help,/Evidence-Supported Stage/);
  assert.match(help,/CRM-independent workflow|no CRM connection|not connected to an external CRM/);
  assert.doesNotMatch(assistant,/Select the deal stage: use the Customer Workspace header/);
  assert.match(help,/New opportunities begin at Stage 2/);
  assert.match(help,/Current BuyCycle Stage/);
  assert.match(help,/Buyer Evidence &amp; Stage Readiness/);
  assert.match(help,/Rep Assessment/);
  assert.doesNotMatch(help,/Manage the working BuyCycle stage in the Customer Workspace/);
  assert.doesNotMatch(help,/customer, stage, revenue/);
  assert.doesNotMatch(help,/Select the rep-owned BuyCycle stage in the workspace header/);
});
