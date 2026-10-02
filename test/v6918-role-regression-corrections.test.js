'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {evaluateRoiMaturity}=require('../src/shared/roi-maturity');

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

test('customer administration resolves the scenario API schema and uses the canonical switch path',()=>{
  const customers=read('public/admin-customers.js');
  assert.match(customers,/s\.customer_id \|\| s\.customerId/);
  assert.match(customers,/s\.is_current \?\? s\.isCurrent/);
  assert.match(customers,/selectCustomerContextById\(_selected\.id,\{targetTab:'solfit'\}\)/);
  assert.doesNotMatch(customers,/function acOpenSolutionFit\(\) \{\s*window\._sfSelectedCustomerId/);
});

test('customer switching clears dependent scenario and Prospect evidence state before loading',()=>{
  const switcher=read('public/customer-switcher.js');
  const reset=switcher.slice(switcher.indexOf('function resetCustomerContext'),switcher.indexOf('async function perform'));
  for(const required of ['window._calcScenarioId=null','window.discoveryScenarioId=null','window.latestSubmittedEvidence=null'])assert.ok(reset.includes(required),required);
  assert.match(switcher,/Loaded scenario does not belong to the selected customer/);
});

test('Prospect value application is bound to both opportunity and customer',()=>{
  const routes=read('src/routes/scenarios.js');
  const apply=routes.slice(routes.indexOf("router.post('/:id/value-history/:canonicalInput/apply'"),routes.indexOf('/* ═',routes.indexOf("router.post('/:id/value-history/:canonicalInput/apply'")));
  assert.match(apply,/LEFT JOIN discovery_submissions ds/);
  assert.match(apply,/LEFT JOIN discovery_sessions dss/);
  assert.match(apply,/ds\.base_id=\$2 AND dss\.customer_id=\$4/);
  assert.match(apply,/sc\.customer_id/);
});

test('feature renderers tolerate unavailable economics and optional scenario inputs',()=>{
  const features=read('public/features.js');
  assert.match(features,/s\.inputs\?\.invest/);
  assert.match(features,/if \(!r\) \{ showToast\('ROI economics are not yet established/);
  assert.doesNotMatch(features,/fn: s => fmtFull\(s\.inputs\.invest\)/);
});

test('evidence and revalidation dialogs open visibly with accessible modal structure',()=>{
  const features=read('public/features.js'),css=read('public/style.css');
  assert.match(features,/wrap\.id='valueHistoryModal';wrap\.className='modal-overlay open'/);
  assert.match(features,/wrap\.id='valueHistoryModal';wrap\.className='modal-overlay open'.*Revalidate Value/);
  assert.match(css,/\.modal-card\{[^}]*background:var\(--white\)[^}]*color:var\(--gray-800\)/);
  assert.match(css,/#prospectSyncModal,#submissionHistoryModal,#valueHistoryModal\{z-index:10020;\}/);
});

test('generated downloads use an attached anchor and reject empty artifacts',()=>{
  const outputs=read('public/executive-output-adapters.js'),operational=read('public/deal-export.js');
  assert.match(outputs,/blob instanceof Blob\)\|\|blob\.size===0/);
  assert.match(outputs,/document\.body\.appendChild\(a\);a\.click\(\)/);
  assert.match(outputs,/proposalExportWord=.*downloadBlob\(blob,/s);
  assert.match(operational,/function deDownloadBlob\(blob,fileName\)/);
  assert.match(operational,/document\.body\.appendChild\(a\);a\.click\(\)/);
  assert.match(operational,/deDownloadBlob\(blob,fileName\)/);
});

test('comparison selections survive navigation and use governed contract economics',()=>{
  const features=read('public/features.js'),app=read('public/app.js');
  assert.match(features,/sessionStorage\.getItem\('ciCompareScenarioIds'\)/);
  assert.match(features,/sessionStorage\.setItem\('ciCompareScenarioIds'/);
  for(const label of ['Contract ROI','Contract NPV','Net contract benefit','Payback from signing'])assert.ok(features.includes(label),label);
  assert.doesNotMatch(features,/label: 'Year 1 ROI'/);
  assert.match(app,/totalContractRoi: data\.totalContractRoi/);
});

test('admin user creation resists credential-manager autofill and Prospect Help clears core actions',()=>{
  const index=read('public/index.html'),prospect=read('public/prospect.html');
  assert.match(index,/id="newUsername" name="ci-new-user-account"[^>]*autocomplete="one-time-code"[^>]*readonly/);
  assert.match(prospect,/\.passt-fab\{bottom:88px/);
});

test('Sales Manager deep links preserve the reviewed customer and tolerate timestamp dates',()=>{
  const manager=read('public/sales-manager.js');
  assert.match(manager,/selectCustomerContextById\(deal\.customerId,\{targetTab:tab\}\)/);
  assert.match(manager,/loadScenario\(deal\.id,\{preserveWorkspace:true,targetTab:tab\}\)/);
  assert.match(manager,/const displayDate=v=>/);
  assert.doesNotMatch(manager,/new Date\(a\.due_date\+'T00:00:00'\)/);
});

test('an authorized active customer workspace is restored after a browser reload',()=>{
  const switcher=read('public/customer-switcher.js'),app=read('public/app.js');
  assert.match(switcher,/sessionStorage\.setItem\(activeKey\(\),JSON\.stringify\(\{customerId:item\.id,tab:destination\}\)\)/);
  assert.match(switcher,/async function restoreActive\(\)/);
  assert.match(app,/window\.restoreLastCustomerContext\?\.\(\)/);
});

test('Joint Project Plan milestone titles persist immediately while typing',()=>{
  const map=read('public/map.js');
  assert.match(map,/class="map-ms-title"[^>]*oninput="msField/);
  assert.match(map,/x\[field\] = value; mapMarkDirty\(\)/);
});

test('submitted Prospect values remain explicit and warn until deliberately applied',()=>{
  const discovery=read('public/discovery.js');
  assert.match(discovery,/Customer-submitted values are waiting for review/);
  assert.match(discovery,/h\.valueUsed\?\.origin_event_id/);
  assert.match(discovery,/onclick="applyDiscoveryToCalc\(\)"/);
  assert.match(discovery,/activeProvenance\[q\.sync\]\?\.eventId/);
});

test('saved Prospect Verified canonical and percentage inputs contribute to ROI Maturity',()=>{
  const now=new Date(),date=now.toISOString();
  const supported=(value,id)=>({eventId:id,date,value,source:'prospect_submitted'});
  const scenarioData={modelVersion:28,inventory:1000000,invTurnsCurrent:2,invTurnsBenchmark:5,carryRate:.2,mCarrying:.2,ordersPerYr:100000,orderErrorPct:.05,costPerError:50,mAccuracy:.3,contractMonths:36,invest:100000,
    fieldStates:{inventoryValue:'confirmed_prospect',invTurnsCurrent:'confirmed_prospect',ordersPerYr:'confirmed_prospect',orderErrorPct:'confirmed_prospect',costPerError:'confirmed_prospect'},
    fieldProvenance:{inventoryValue:supported(1000000,'00000000-0000-4000-8000-000000000001'),invTurnsCurrent:supported(2,'00000000-0000-4000-8000-000000000002'),ordersPerYr:supported(100000,'00000000-0000-4000-8000-000000000003'),orderErrorPct:supported(5,'00000000-0000-4000-8000-000000000004'),costPerError:supported(50,'00000000-0000-4000-8000-000000000005')}};
  const result=evaluateRoiMaturity({scenarioData,now});
  assert.equal(result.activeDrivers.find(x=>x.key==='turnsSav').customerSupported,true);
  assert.equal(result.activeDrivers.find(x=>x.key==='accuracySav').customerSupported,true);
  assert.ok(result.customerSupportedValuePct>0);
});

test('CRM copy has an explicit action, failure feedback, and governed contract metrics',()=>{
  const index=read('public/index.html'),features=read('public/features.js');
  assert.match(index,/onclick="pushToCRM\('copy'\)">Copy only/);
  assert.match(features,/Contract ROI:/);
  assert.match(features,/Contract NPV:/);
  assert.match(features,/Clipboard access was blocked/);
  assert.doesNotMatch(features,/Year 1 ROI:/);
});

test('published business-case links open a visible result and report request failures',()=>{
  const exports=read('public/deal-export.js');
  assert.match(exports,/modal\.className = 'modal-overlay open'; modal\.id = 'bcShareModal'/);
  assert.match(exports,/The share link could not be created\. Check your connection and retry\./);
});

test('My Profile displays the complete multi-role assignment',()=>{
  const index=read('public/index.html');
  assert.match(index,/const assignedRoles=\[\.\.\.new Set\(/);
  assert.match(index,/<span class="pil">Assigned roles<\/span>/);
  assert.match(index,/sales_manager:'Sales Leader'/);
});

test('Buyer Evidence uses the local calendar date and requires an explicit evidence strength',()=>{
  const readiness=read('public/buyer-readiness.js');
  assert.match(readiness,/const localDate=\(\)=>/);
  assert.match(readiness,/Select evidence strength…/);
  assert.match(readiness,/quality\.required=true/);
  assert.match(readiness,/date\.max=localDate\(\)/);
});

test('Executive PDF and PowerPoint have bounded client and server recovery paths',()=>{
  const client=read('public/executive-output-adapters.js'),routes=read('src/routes/scenarios.js');
  assert.match(client,/const EXECUTIVE_EXPORT_TIMEOUT_MS=30000/);
  assert.match(client,/withExecutiveExportDeadline\('PDF',async signal=>/);
  assert.match(client,/withExecutiveExportDeadline\('PowerPoint',async signal=>/);
  assert.match(client,/guardExecutiveOutput\('pdf',\{allowDraft:true\}\)/);
  assert.match(client,/guardExecutiveOutput\('pptx',\{allowDraft:true\}\)/);
  assert.match(client,/\.\.\.\(signal\?\{signal\}:\{\}\)/);
  assert.match(client,/finally\{exportButton\('pdf','Preparing PDF…',false\);\}/);
  assert.match(client,/finally\{exportButton\('pptx','Creating PowerPoint…',false\);\}/);
  assert.match(routes,/const EXECUTIVE_EXPORT_SERVER_TIMEOUT_MS=25000/);
  assert.match(routes,/withExecutiveExportTimeout\('PowerPoint'/);
  assert.match(routes,/err\.status===504\?'PowerPoint generation timed out/);
  assert.match(routes,/err\.status===504\?`\$\{kind\.toUpperCase\(\)\} generation timed out/);
});

test('Profile role aliases collapse Sales Engineer into the canonical SE badge',()=>{
  const index=read('public/index.html');
  assert.match(index,/r==='solution_engineer'\|\|r==='sales_engineer'\?'se'/);
});
