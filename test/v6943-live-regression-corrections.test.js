'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const model=require('../public/solution-fit-state');
const {readiness}=require('../src/shared/handoff-readiness');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function readyFit(){
  const state=model.migrateState({
    opportunity:{customer:'Acme',products:['CIP'],locations:'2',users:'20',problem:'Manual reconciliation',outcome:'Accurate inventory'},
    solutionScope:{primaryProduct:'CIP',additionalProducts:[]},
    architecture:{relationship:'Standalone',erp:'SAP',version:'S/4'},
    partner:{involved:'No'},
    processes:[{id:'APP-GOV-CIP-INBOUND',product:'CIP',group:'Inbound',name:'Inbound Orders',selected:true,demoStatus:'Demonstrated',fit:'Full fit',customerValidation:'Customer validated'}],
    gaps:[],
    turnover:{
      contractStatus:'Signed and available',projectManager:'Pat PM',systemAdminEmail:'admin@example.com',
      deliveryModel:'Cloud Inventory Professional Services',internalDeliveryContact:'Dana Delivery',projectStart:'2026-11-01',
      eapEdition:'Enterprise',environments:'2',authorizedDefinitions:'CIP',authorizedLanguages:'English',
      customerDomain:'example.com',sowLink:'repository://signed-sow'
    }
  });
  for(const item of model.INVENTORY_ITEMS)state.inventoryConfiguration[item].answer='No';
  return state;
}

test('workspace generations reject every response started before a customer switch',()=>{
  const context={window:{}};context.window=context;vm.createContext(context);
  vm.runInContext(read('public/workspace-context.js'),context);
  const first=context.CIWorkspaceContext.begin({customerId:'customer-a',scenarioId:'scenario-a'});
  assert.equal(context.CIWorkspaceContext.isCurrent(first),true);
  const second=context.CIWorkspaceContext.begin({customerId:'customer-b',scenarioId:'scenario-b'});
  assert.equal(context.CIWorkspaceContext.isCurrent(first),false);
  assert.equal(context.CIWorkspaceContext.isCurrent(second),true);
  assert.equal(context.CIWorkspaceContext.commit(second,{customerId:'customer-b',scenarioId:'scenario-b'}),true);
  assert.equal(context.CIWorkspaceContext.belongs({customerId:'customer-b',scenarioId:'scenario-b'}),true);
  assert.equal(context.CIWorkspaceContext.belongs({customerId:'customer-a'}),false);
});

test('customer switching, Executive, Proposal and AI consumers all enforce the active workspace generation',()=>{
  const index=read('public/index.html'),switcher=read('public/customer-switcher.js'),app=read('public/app.js');
  const executive=read('public/executive-story.js')+read('public/executive-output-adapters.js');
  const proposal=read('public/proposal.js'),assistant=read('public/assistant.js'),coach=read('public/deal-coach.js');
  assert.ok(index.indexOf('workspace-context.js')<index.indexOf('app.js'));
  assert.match(switcher,/CIWorkspaceContext\?\.begin\(\{customerId:item\.id,scenarioId:item\.scenarioId\|\|null\}\)/);
  assert.match(switcher,/loadScenario\(item\.scenarioId,\{[^}]*workspaceToken/);
  assert.match(app,/const workspaceToken = options\.workspaceToken \|\| window\.CIWorkspaceContext\?\.begin/);
  assert.match(executive,/CIWorkspaceContext\?\.capture/);
  assert.match(executive,/STALE_WORKSPACE/);
  assert.match(executive,/const sid=id\(\),token=window\.CIWorkspaceContext\?\.capture\(\),isCurrent=/);
  assert.match(proposal,/CIWorkspaceContext\?\.capture/);
  assert.match(proposal,/STALE_WORKSPACE/);
  assert.match(proposal,/async function save[^\n]+CIWorkspaceContext\?\.capture/);
  assert.match(assistant,/AbortController/);assert.match(assistant,/20000/);assert.match(assistant,/_calcScenarioId/);assert.match(assistant,/requestGeneration/);
  assert.match(coach,/AbortController/);assert.match(coach,/20000/);assert.match(coach,/coachWorkspaceKey/);
});

test('scenario save returns and adopts the exact server-authoritative ROI projection',()=>{
  const route=read('src/routes/scenarios.js'),app=read('public/app.js'),versioning=read('public/versioning.js');
  assert.match(route,/rows\[0\]\.data=dataWithMetrics/);
  assert.match(app,/if \(saved\.data && typeof loadFromObject === 'function'\)/);
  assert.match(app,/loadFromObject\(saved\.data\)/);
  assert.match(app,/window\._roiModelVersion = Number\(saved\.data\.modelVersion\) \|\| 28/);
  assert.match(versioning,/Number\(v\.modelVersion \|\| window\._roiModelVersion \|\| 27\) < 28/);
  assert.match(versioning,/previewRoiModelUpgrade\(\)/);
});

test('Solution Fit readiness requires inventory, turnover and resolved gaps in addition to assessed apps',()=>{
  const state=readyFit(),se='11111111-1111-4111-8111-111111111111';
  const complete=readiness(state,{primarySeId:se});
  assert.equal(complete.status,'ready');
  state.inventoryConfiguration['Lot Numbers'].answer='Not answered';
  let result=readiness(state,{primarySeId:se});
  assert.ok(result.miss.some(item=>item.label==='General inventory configuration'));
  state.inventoryConfiguration['Lot Numbers'].answer='No';
  state.turnover.projectManager='';
  result=readiness(state,{primarySeId:se});
  assert.ok(result.miss.some(item=>item.label==='Professional Services turnover'));
  state.turnover.projectManager='Pat PM';
  state.gaps.push({id:'GAP-1',need:'Offline flow',gapDescription:'Requires confirmation',status:'Open',priority:'Should Have',businessImpact:'Operations risk',resolution:'Workshop',owner:'SE',targetDate:'2026-12-01'});
  result=readiness(state,{primarySeId:se});
  assert.ok(result.miss.some(item=>item.label==='Gap disposition'));
  state.gaps[0].status='Resolved';
  assert.equal(readiness(state,{primarySeId:se}).status,'ready');
});

test('opening a Solution Fit is side-effect free and progress refreshes from current saved-state inputs',()=>{
  const source=read('public/solution-fit.js');
  const load=source.slice(source.indexOf('async function loadHandoff'),source.indexOf('async function safeError'));
  assert.match(load,/applyKnownData\(\{ mutate:false, save:false \}\)/);
  assert.doesNotMatch(load,/scheduleSave\(\)/);
  assert.match(source,/else if\(mutate\)\{setVal\(S,'opportunity\.stage'/);
  assert.match(source,/function refreshSolutionFitProgress\(\)/);
  assert.match(source,/renderProgressSummary\(r\)/);
  assert.match(source,/refreshInventoryPresentation[\s\S]*refreshSolutionFitProgress\(\)/);
  assert.match(source,/Not ready — unsaved changes/);
});

test('Three Whys expose one dictation control per field and no duplicate explicit microphone controls',()=>{
  const html=read('public/index.html');
  const fields=['why_act','why_now','why_ci'];
  for(const id of fields){
    assert.equal((html.match(new RegExp(`id="${id}" data-dictate`,'g'))||[]).length,1,id);
    assert.equal((html.match(new RegExp(`id="whyMic_${id}"`,'g'))||[]).length,0,id);
  }
});

test('Sales Manager makes legitimate same-name opportunities visibly distinct',()=>{
  const source=read('public/sales-manager.js');
  assert.match(source,/const opportunityRef=d=>/);
  assert.ok((source.match(/Opportunity \$\{opportunityRef\(d\)\}/g)||[]).length>=3);
});

test('release remains correction-only with no v6.9.43 attachment feature or migration',()=>{
  const migrations=fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql'));
  assert.equal(migrations.length,44);
  assert.equal(fs.existsSync(path.join(root,'test','v6943-solution-fit-evidence-attachments.test.js')),false);
  assert.doesNotMatch(read('public/solution-fit.js'),/type="file"|upload attachment|attachment gallery/i);
});
