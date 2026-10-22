'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scope=require('../public/solution-fit-scope');
const stateModel=require('../public/solution-fit-state');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const baseState=()=>stateModel.migrateState({
  opportunity:{customer:'Customer A',products:['MEP','EPP']},
  solutionScope:{primaryProduct:'MEP',additionalProducts:['EPP'],erp:'JDE',erpVersion:'9.2',selectedApps:['Pick Confirmation'],catalogVersion:'2026-08'},
  architecture:{erp:'JDE',version:'9.2'},
  processes:[
    {id:'P-1',product:'MEP',erp:'JDE',group:'JDE',name:'Pick Confirmation',source:'standard_app',selected:true,demoStatus:'Demonstrated',fit:'Partial fit',customerValidation:'Customer validated',notes:'One-off exception',evidenceId:'EV-1'},
    {id:'P-2',product:'MEP',erp:'JDE',group:'Customer-specific',name:'Custom Putaway',source:'non_standard',selected:true,demoStatus:'Discussed only',fit:'Gap',customerValidation:'Validation pending',notes:'Extension required'}
  ],
  gaps:[{id:'G-1',process:'Custom Putaway',gapDescription:'Extension required',evidenceId:'GE-1'}],
  integrations:[{id:'I-1',source:'JDE',target:'MEP'}],
  privateFutureField:{keep:true}
});

for(const product of scope.PRODUCTS){
  test(`${product} setup dialog renders product scope only`,()=>{
    const state=baseState();
    const draft={...scope.createDraft(state,'edit'),primaryProduct:product,additionalProducts:[]};
    const html=scope.renderDialog({draft,state,customerName:'Customer A'});
    assert.match(html,/Primary Cloud Inventory product/);
    assert.match(html,/Additional products/);
    assert.match(html,/Product scope only/);
    assert.doesNotMatch(html,/name="sfErp"|ERP Version|Applications in scope|data-sfapp=|Non-standard applications/);
  });
}

test('primary product is mandatory and additional products are normalized and preserved',()=>{
  const state=baseState();
  assert.throws(()=>scope.applyProductScope(state,{primaryProduct:'',additionalProducts:['EPP']}),error=>error.code==='PRIMARY_PRODUCT_REQUIRED');
  const result=scope.applyProductScope(state,{primaryProduct:'CIP',additionalProducts:['EPP','CIP','EPP'],removalConfirmed:true});
  assert.equal(result.state.solutionScope.primaryProduct,'CIP');
  assert.deepEqual(result.state.solutionScope.additionalProducts,['EPP']);
  assert.deepEqual(result.state.opportunity.products,['CIP','EPP']);
});

test('Edit Scope with unchanged products preserves all existing MEP operational data exactly',()=>{
  const state=baseState();
  const before=JSON.stringify({scope:state.solutionScope,architecture:state.architecture,processes:state.processes,gaps:state.gaps,integrations:state.integrations});
  const result=scope.applyProductScope(state,{primaryProduct:'MEP',additionalProducts:['EPP'],removalConfirmed:false});
  const after=JSON.stringify({scope:result.state.solutionScope,architecture:result.state.architecture,processes:result.state.processes,gaps:result.state.gaps,integrations:result.state.integrations});
  assert.equal(after,before);
  assert.notEqual(result.state,state,'scope edit creates a server-save candidate without mutating the loaded record');
});

test('product removal requires confirmation, deactivates only scope rows, and preserves history/evidence',()=>{
  const state=baseState();
  const draft={primaryProduct:'CIP',additionalProducts:['EPP'],removalConfirmed:false};
  assert.throws(()=>scope.applyProductScope(state,draft),error=>error.code==='PRODUCT_REMOVAL_CONFIRMATION_REQUIRED'&&error.plan.removed.includes('MEP'));
  draft.removalConfirmed=true;
  const {state:next,plan}=scope.applyProductScope(state,draft,{now:'2026-10-22T00:00:00.000Z'});
  assert.deepEqual(plan.removed,['MEP']);
  assert.ok(next.processes.every(process=>process.product!=='MEP'||process.selected===false));
  assert.equal(next.processes[0].demoStatus,'Demonstrated');
  assert.equal(next.processes[0].customerValidation,'Customer validated');
  assert.equal(next.processes[0].evidenceId,'EV-1');
  assert.equal(next.processes[1].source,'non_standard');
  assert.equal(next.gaps[0].evidenceId,'GE-1');
  assert.equal(next.privateFutureField.keep,true);
  assert.equal(next.scopeHistory.at(-1).reason,'Product removed from active scope; saved assessment records preserved.');
  assert.equal(state.processes[0].selected,true,'loaded state remains unchanged until the server accepts the candidate');
});

test('product-only edits never create duplicate application rows',()=>{
  const state=baseState();
  const once=scope.applyProductScope(state,{primaryProduct:'MEP',additionalProducts:['EPP']}).state;
  const twice=scope.applyProductScope(once,{primaryProduct:'EPP',additionalProducts:['MEP'],removalConfirmed:true}).state;
  assert.equal(twice.processes.length,state.processes.length);
  assert.equal(twice.processes.filter(process=>process.name==='Pick Confirmation').length,1);
  assert.equal(twice.processes.filter(process=>process.source==='non_standard').length,1);
});

test('creation remains an explicit server operation and failure is rendered in the still-open production dialog',()=>{
  const ui=read('public/solution-fit.js');
  assert.match(ui,/method:'POST',body:JSON\.stringify\(\{data:candidate\}\)/);
  assert.match(ui,/if\(!r\|\|!r\.ok\)\{d\.error=.*renderScopeWizard\(\);return;\}/s);
  const html=scope.renderDialog({draft:{primaryProduct:'MEP',additionalProducts:[],mode:'create',removalConfirmed:false,error:'Solution Fit could not be created. Review the selection and retry.'},state:{},customerName:'Customer B'});
  assert.match(html,/role="alert"/);
  assert.match(html,/Solution Fit could not be created/);
  assert.match(html,/Create Solution Fit/);
});

test('dirty switch requires a decision, successful save precedes switch, and failed save blocks it',async()=>{
  let dirty=true,saves=0,clears=0,loads=0,navigations=0,saveOk=false;
  const coordinator=scope.createSwitchCoordinator({isDirty:()=>dirty,save:async()=>{saves++;return saveOk;},discard:async()=>{dirty=false;},clear:()=>{clears++;},navigate:()=>{navigations++;},load:async()=>{loads++;}});
  assert.equal((await coordinator.prepare()).status,'decision-required');
  assert.equal((await coordinator.prepare('save')).status,'blocked');
  assert.equal(saves,1);assert.equal(clears,0);assert.equal(loads,0);
  saveOk=true;dirty=true;
  assert.equal((await coordinator.prepare('save')).status,'ready');
  await coordinator.select('customer-b');
  assert.equal(saves,2);assert.equal(clears,1);assert.equal(navigations,1);assert.equal(loads,1);
});

test('discard and cancel are deterministic and repeated A→B→C→A selection clears before every authoritative load',async()=>{
  let dirty=true;const events=[];
  const coordinator=scope.createSwitchCoordinator({isDirty:()=>dirty,save:async()=>true,discard:async()=>{events.push('discard');dirty=false;},clear:id=>events.push(`clear:${id}`),navigate:id=>events.push(`url:${id}`),load:async id=>events.push(`load:${id}`)});
  assert.equal((await coordinator.prepare('cancel')).status,'cancelled');
  assert.deepEqual(events,[]);
  assert.equal((await coordinator.prepare('discard')).status,'ready');
  for(const id of ['A','B','C','A'])await coordinator.select(id);
  assert.deepEqual(events,['discard','clear:A','url:A','load:A','clear:B','url:B','load:B','clear:C','url:C','load:C','clear:A','url:A','load:A']);
});

test('URL customer identity survives refresh and supports deterministic browser Back state',()=>{
  const b=scope.urlForCustomer('/?view=app','customer-b');
  assert.equal(b,'/?view=app&sfCustomer=customer-b');
  assert.equal(scope.customerIdFromUrl(`https://example.test${b}`),'customer-b');
  const cleared=scope.urlForCustomer(b,'');
  assert.equal(scope.customerIdFromUrl(`https://example.test${cleared}`),'');
});

test('production switch path is visible, stays Solution-Fit-specific, and clears stale state before load',()=>{
  const ui=read('public/solution-fit.js');
  assert.match(ui,/Customer workspace/);
  assert.match(ui,/⇄ Switch Customer/);
  assert.match(ui,/Save &amp; Switch/);
  assert.match(ui,/Discard &amp; Switch/);
  assert.match(ui,/\/api\/solution-fit\/customers/);
  assert.match(ui,/clearWorkspaceForLoad\(custId\)/);
  assert.match(ui,/generation!==workspaceLoadGeneration/);
  assert.doesNotMatch(ui,/currentScenarioCustomerId\s*=\s*id/);
  assert.doesNotMatch(ui,/\b(?:window\.)?(?:localStorage|sessionStorage)\s*\./);
});

test('cross-account discovery stays on the dedicated permission and zero-scenario customers remain eligible',()=>{
  const route=read('src/routes/solution-fit-customers.js');
  assert.match(route,/solution_fit_cross_account/);
  assert.match(route,/COALESCE\(c\.status,'active'\)='active'/);
  assert.match(route,/LEFT JOIN handoffs/);
  assert.doesNotMatch(route,/JOIN scenarios s ON s\.customer_id=c\.id/);
  assert.match(route,/resolveSolutionFitDecision/);
});

test('Christie is hidden for a cross-account Solution Fit rather than receiving stale ROI customer context',()=>{
  const ui=read('public/solution-fit.js');
  assert.match(ui,/canUseSeChristie=String\(window\.currentScenarioCustomerId\|\|''\)===String\(customerId\|\|''\)/);
  assert.match(ui,/openChristieForPerspective\?\.\('se',window\._calcScenarioId\|\|null\)/);
});
