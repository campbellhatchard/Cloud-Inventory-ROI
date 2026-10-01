'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Prospect Link sends the same active scenario accepted by its gate',()=>{
  const source=read('public/discovery.js');
  assert.match(source,/const scenarioId = discoveryScenarioId \|\| window\._calcScenarioId \|\| null/);
  assert.match(source,/JSON\.stringify\(\{ industry, company, scenarioId \}\)/);
  assert.doesNotMatch(source,/scenarioId: discoveryScenarioId \|\| undefined/);
});

test('Prospect submission flushes all buffered answers before immutable submission',()=>{
  const source=read('public/prospect.html');
  assert.match(source,/const pendingAnswerTimers = new Map\(\)/);
  assert.match(source,/function scheduleAnswerSave\(questionId, answer, delay\)/);
  assert.match(source,/async function flushProspectAnswers\(\)/);
  const submit=source.slice(source.indexOf('async function confirmSubmit()'));
  assert.ok(submit.indexOf('await flushProspectAnswers()') < submit.indexOf("'/submit'"));
});

test('SE-only access cannot create ROI customers or save ROI scenarios',()=>{
  const gate=read('public/customer-gate.js'),routes=read('src/routes/scenarios.js');
  assert.match(gate,/clientHasRole\(user,'rep','Sales Rep'\)/);
  assert.match(gate,/newCard\.hidden = !canCreateRoiCustomer\(\)/);
  assert.match(routes,/!hasRole\(req\.user,'rep'\) && !hasRole\(req\.user,'admin'\)/);
  assert.match(routes,/Sales Rep or Admin role required/);
});

test('governed contract payback is used consistently',()=>{
  const manager=read('src/routes/sales-manager.js'),scenarios=read('src/routes/scenarios.js'),app=read('public/app.js');
  assert.match(manager,/data\.contractPayback \?\? data\.paybackFromSigning \?\? data\.payback/);
  assert.match(scenarios,/data->>'totalContractRoi'/);
  assert.match(scenarios,/data->>'totalContractNpv'/);
  assert.match(scenarios,/data->>'contractPayback'/);
  assert.match(app,/const governedPayback = r\.contractPayback/);
});

test('save double activation, Sales Manager autofill, and stalled PDF requests are guarded',()=>{
  const app=read('public/app.js'),manager=read('public/sales-manager.js'),pdf=read('public/executive-output-adapters.js');
  assert.match(app,/_scenarioSaveInFlight/);
  assert.match(manager,/name="sales-manager-opportunity-search"/);
  assert.match(manager,/readonly onfocus="this\.removeAttribute\('readonly'\)"/);
  assert.match(pdf,/typeof AbortController==='function'\?new AbortController\(\):null/);
  assert.match(pdf,/PDF generation timed out/);
});
