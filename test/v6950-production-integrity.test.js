'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {isActiveAttachment,isPendingAttachment,ACTIVE_ATTACHMENT_SQL,activeAttachmentSql}=require('../src/shared/solution-fit-attachments');
const {canEditPlan}=require('../src/shared/jpp-capability');
const {projectSolutionFitReadiness}=require('../src/shared/solution-fit-readiness');

const settle=()=>new Promise(resolve=>setImmediate(resolve));

function createExecutiveWordHarness(){
  let guardCalls=0,fetchCalls=0,downloadClicks=0,fetchMode='pending',resolveFetch;
  const timers=[],toasts=[],errors=[],elements=new Map();
  const control=id=>{
    if(!elements.has(id))elements.set(id,{id,innerHTML:id==='executiveWordBtn'?'Export Word':'',textContent:'',disabled:false,dataset:{},style:{},setAttribute(){},removeAttribute(){},remove(){elements.delete(id);},prepend(){}});
    return elements.get(id);
  };
  const document={
    body:{appendChild(){},prepend(node){elements.set(node.id,node);}},
    getElementById(id){return id==='executiveWordBtn'?control(id):(elements.get(id)||null);},
    querySelector(){return null;},
    createElement(tag){
      if(tag==='a')return{style:{},click(){downloadClicks+=1;},remove(){}};
      const button={onclick:null};
      return{id:'',className:'',innerHTML:'',querySelector(){return button;},remove(){elements.delete(this.id);},_button:button};
    }
  };
  const window={
    _calcScenarioId:'scenario-1',
    CIEconomicAvailability:{hasEconomicValue:()=>false,percent:()=>'N/A',paybackLabel:()=>'N/A'},
    CIBrand:{logo:()=>'',audience:()=>''},
    CIProposalOutputBuilder:{buildProposalOutputHtml:()=>''},
    CIExecutiveOutputPreconditions:{inspectExecutiveOutputState:()=>({ok:true})},
    getExecutiveOutputPersistenceState:()=>({scenarioId:'scenario-1',calculatorDirty:false,narrativeDirty:false,appliedValueDraftCount:0}),
    executiveValueStory:{meta:{customer:'Acme'}},
    URL:{createObjectURL:()=>'blob:test',revokeObjectURL(){}},
    logClientError(){}
  };
  const context={
    window,document,Blob,AbortController,URL:window.URL,URLSearchParams,Promise,Date,CustomEvent:function(){},
    console:{info(){},warn(){},error(event,detail){errors.push({event,message:detail?.message});}},
    showToast(message){toasts.push(message);},
    guardExecutiveOutput(){guardCalls+=1;return Promise.resolve({proceed:true,draft:false,result:{status:'ready'}});},
    setTimeout(callback,delay){const timer={id:timers.length+1,callback,delay,cleared:false};timers.push(timer);return timer.id;},
    clearTimeout(id){const timer=timers.find(item=>item.id===id);if(timer)timer.cleared=true;},
    fetch(){
      fetchCalls+=1;
      if(fetchMode==='pending')return new Promise(resolve=>{resolveFetch=resolve;});
      if(fetchMode==='failure')return Promise.resolve({ok:false,json:async()=>({error:'Document service unavailable.'})});
      return Promise.resolve({ok:true,blob:async()=>new Blob(['PK\u0003\u0004word-document'])});
    }
  };
  window.guardExecutiveOutput=context.guardExecutiveOutput;
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(read('public/executive-output-adapters.js'),context,{filename:'public/executive-output-adapters.js'});
  return{
    window,control,timers,toasts,errors,elements,
    setFetchMode(mode){fetchMode=mode;},
    resolveSuccess(){resolveFetch?.({ok:true,blob:async()=>new Blob(['PK\u0003\u0004word-document'])});},
    get guardCalls(){return guardCalls;},
    get fetchCalls(){return fetchCalls;},
    get downloadClicks(){return downloadClicks;}
  };
}

test('one active attachment definition excludes pending, failed and removed evidence',()=>{
  assert.equal(ACTIVE_ATTACHMENT_SQL,"status='ACTIVE' AND removed_at IS NULL");
  assert.equal(activeAttachmentSql('a'),"a.status='ACTIVE' AND a.removed_at IS NULL");
  assert.equal(isActiveAttachment({status:'ACTIVE',removed_at:null}),true);
  for(const row of [{status:'PENDING'},{status:'FAILED'},{status:'REMOVED'},{status:'ACTIVE',removed_at:'2026-10-26'}])assert.equal(isActiveAttachment(row),false);
  assert.equal(isPendingAttachment({status:'PENDING',removed_at:null}),true);
  for(const file of ['src/routes/solution-fit-attachments.js','src/services/ps-turnover-service.js','src/routes/admin-cleanup.js'])assert.match(read(file),/solution-fit-attachments/);
});

test('ROI integration fixture declares the authoritative v2.8 model',()=>{
  const source=read('test/routes.test.js');
  assert.match(source,/modelVersion:\s*27/);
  assert.match(source,/headcount\/labor without a measured driver must not create benefit/);
  assert.match(source,/laborWastePct:0\.20/);
  assert.match(source,/server must project ROI Model v2\.8 authority/);
  assert.match(read('config/application-knowledge.json'),/"roiModel"\s*:\s*\{"version"\s*:\s*"2\.8","modelVersion"\s*:\s*28/);
});

test('JPP edit capability is server-owned and direct mutations check it',()=>{
  assert.equal(canEditPlan({id:'owner'},{owner_id:'owner'}),true);
  assert.equal(canEditPlan({id:'owner',roleKeys:['rep','se','sales_manager']},{owner_id:'owner'}),true);
  assert.equal(canEditPlan({id:'rep',roleKeys:['rep']},{owner_id:'owner'}),false);
  assert.equal(canEditPlan({id:'se',roleKeys:['se']},{owner_id:'owner'}),false);
  assert.equal(canEditPlan({id:'leader',roleKeys:['sales_manager']},{owner_id:'owner'}),false);
  assert.equal(canEditPlan({id:'admin',roleKeys:['admin']},{owner_id:'owner'}),false);
  const route=read('src/routes/maps.js'),ui=read('public/map.js');
  assert.match(route,/canEditPlan:canEditPlan\(user,plan\)/);
  assert.match(route,/Read-only plan — only the owner can make changes/);
  assert.ok((route.match(/if\(!await editablePlan\(req,res\)\)return;/g)||[]).length>=4);
  assert.match(ui,/_mapCanEditPlan=newPlan\|\|plan\?\.canEditPlan===true/);
  assert.match(ui,/_mapReadOnly=!_mapCanEditPlan/);
  assert.match(ui,/mapCanManageProspectLink\(\)\{return _mapCanEditPlan&&mapOutputReady\(\);\}/);
  assert.doesNotMatch(ui,/_mapReadOnly=String\(m\.owner_id/);
});

test('Sensitivity fails closed without an authorized saved scenario',()=>{
  const source=read('public/features.js'),start=source.indexOf('function renderSensitivity()'),end=source.indexOf('/* ─────────────────────────────────────────\n   4.',start),body=source.slice(start,end);
  assert.match(body,/No Business Case/);
  assert.match(body,/Select or save an authorized customer scenario/);
  assert.ok(body.indexOf('if(!scenarioId)')<body.indexOf('const v = getVals()'));
});

test('Solution Fit selector and opened record use the same readiness projection',()=>{
  const empty=projectSolutionFitReadiness({},{});
  assert.ok(empty.readiness>=0&&empty.readiness<100);
  assert.equal(empty.status,'not_ready');
  for(const file of ['src/routes/handoffs.js','src/routes/solution-fit-customers.js','src/routes/customer-switcher.js'])assert.match(read(file),/projectSolutionFitReadiness/);
  assert.match(read('src/routes/solution-fit-customers.js'),/solution_fit_data/);
  assert.match(read('src/authorization.js'),/h\.data solution_fit_data/);
});

test('Buyer Evidence separates percentage meaning from mandatory stage gates',()=>{
  const source=read('public/buyer-readiness.js');
  assert.match(source,/Evidence criteria complete/);
  assert.match(source,/Mandatory stage gates complete/);
  assert.match(source,/Stage gates: \$\{gateBlocks\} incomplete/);
  assert.match(source,/commitmentBlockingReason/);
});

test('Executive Word uses the shared deadline and restores the button in finally',()=>{
  const source=read('public/executive-output-adapters.js'),start=source.indexOf('window.exportExecutiveWord='),end=source.indexOf('function showOutputRetry',start),body=source.slice(start,end);
  assert.match(body,/withExecutiveExportDeadline\('Word document'/);
  assert.match(body,/signal/);
  assert.match(body,/Word document generation timed out\. Please retry\./);
  assert.match(body,/if\(executiveWordInFlight\)return executiveWordInFlight/);
  assert.match(body,/finally/);
  const server=read('src/routes/scenarios.js');
  assert.match(server,/executive_\$\{kind\}\.source_ready/);
  assert.match(server,/executive_\$\{kind\}\.generation_started/);
  assert.match(server,/withExecutiveExportTimeout\(kind\.toUpperCase\(\),\(\)=>kind==='pdf'/);
});

test('Executive Word production adapter succeeds once under rapid repeat and restores its control',async()=>{
  const h=createExecutiveWordHarness();
  const first=h.window.exportExecutiveWord(),second=h.window.exportExecutiveWord();
  await settle();
  assert.equal(h.guardCalls,1,'rapid repeat must share one governed preflight');
  assert.equal(h.fetchCalls,1,'rapid repeat must start only one production request');
  assert.equal(h.control('executiveWordBtn').disabled,true);
  h.resolveSuccess();
  assert.deepEqual(await Promise.all([first,second]),[true,true]);
  assert.equal(h.downloadClicks,1);
  assert.equal(h.control('executiveWordBtn').disabled,false);
  assert.equal(h.control('executiveWordBtn').innerHTML,'Export Word');
  assert.ok(h.toasts.includes('Word document created.'));
});

test('Executive Word production adapter handles server failure and permits a clean retry',async()=>{
  const h=createExecutiveWordHarness();
  h.setFetchMode('failure');
  assert.equal(await h.window.exportExecutiveWord(),false);
  assert.equal(h.control('executiveWordBtn').disabled,false);
  assert.match(h.errors.at(-1).message,/Document service unavailable/);
  const retry=h.elements.get('executiveWordRetry');
  assert.ok(retry?._button?.onclick,'a failed request must expose the production retry action');
  h.setFetchMode('success');
  assert.equal(await retry._button.onclick(),true);
  assert.equal(h.fetchCalls,2);
  assert.equal(h.downloadClicks,1);
  assert.equal(h.elements.has('executiveWordRetry'),false);
  assert.equal(h.control('executiveWordBtn').disabled,false);
});

test('Executive Word hung request times out, restores its control and remains retryable',async()=>{
  const h=createExecutiveWordHarness();
  const operation=h.window.exportExecutiveWord();
  await settle();
  const deadline=h.timers.find(timer=>timer.delay===30000&&!timer.cleared);
  assert.ok(deadline,'the production Word request must arm the shared deadline');
  deadline.callback();
  assert.equal(await operation,false);
  assert.equal(h.control('executiveWordBtn').disabled,false);
  assert.match(h.errors.at(-1).message,/timed out/i);
  assert.match(h.toasts.at(-1),/timed out/i);
  const retry=h.elements.get('executiveWordRetry');
  assert.ok(retry?._button?.onclick);
  h.setFetchMode('success');
  assert.equal(await retry._button.onclick(),true);
  assert.equal(h.downloadClicks,1);
  assert.equal(h.control('executiveWordBtn').disabled,false);
});

test('opportunity ownership label consumes explicit server ownership and supports multi-role users',()=>{
  assert.match(read('src/routes/customer-switcher.js'),/isOwnedByCurrentUser:r\.is_owner===true/);
  const ui=read('public/ux-enhancements.js');
  assert.match(ui,/meta\.isOwnedByCurrentUser===true/);
  assert.match(ui,/!ownedByCurrentUser/);
});

test('blocked Stakeholder export raises a warning rather than success feedback',()=>{
  const source=read('public/deal-export.js'),start=source.indexOf('function requireSavedStakeholderMapForOutput()'),end=source.indexOf('async function printStakeholderMap',start),body=source.slice(start,end);
  assert.match(body,/AppAlerts\?\.warning|AppAlerts\.warning/);
  assert.doesNotMatch(body,/AppAlerts\?\.success|AppAlerts\.success/);
});
