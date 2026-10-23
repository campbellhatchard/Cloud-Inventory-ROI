'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../public/solution-fit-state');
const {readiness}=require('../src/shared/handoff-readiness');
const {buildSolutionFitPdf}=require('../src/exports/operational-pdf');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const base=(primaryProduct='CIP',additionalProducts=[])=>model.migrateState({
  opportunity:{customer:'Acme',products:[primaryProduct,...additionalProducts],locations:'2',users:'10',problem:'Manual work',outcome:'Accurate inventory'},
  solutionScope:{primaryProduct,additionalProducts,erp:additionalProducts.includes('MEP')||primaryProduct==='MEP'?'JDE':'',erpVersion:additionalProducts.includes('MEP')||primaryProduct==='MEP'?'9.2':''},
  architecture:{relationship:'Standalone',erp:primaryProduct==='MEP'?'JDE':'SAP',version:primaryProduct==='MEP'?'9.2':'S/4'},
  partner:{involved:'No'},processes:[],gaps:[]
});
const assessed=(descriptor,extra={})=>({
  ...descriptor,selected:true,demoStatus:'Demonstrated',fit:'Full fit',customerValidation:'Customer validated',notes:'',...extra
});

test('new MEP, CIP and EPP fits start without generic legacy processes or legacy status',()=>{
  for(const product of ['MEP','CIP','EPP']){
    const state=base(product);
    assert.deepEqual(state.processes,[],product);
    assert.equal(model.hasUnresolvedLegacy(state),false,product);
    assert.notEqual(state.legacy?.status,'needs_review',product);
  }
  const ui=read('public/solution-fit.js');
  assert.doesNotMatch(ui,/STANDARD_PROCESSES/);
  assert.doesNotMatch(ui,/processes:\s*\[\s*['"]Receiving/);
});

test('meaningful legacy rows are preserved and classified without fabricated product provenance',()=>{
  const state=model.migrateState({
    opportunity:{products:['CIP']},solutionScope:{primaryProduct:'CIP'},
    processes:[{name:'Receiving',selected:true,demoStatus:'Demonstrated',fit:'Partial fit',customerValidation:'Validation pending',notes:'Historic workshop'}],gaps:[]
  });
  assert.equal(state.processes.length,1);
  assert.equal(state.processes[0].source,'legacy_process');
  assert.equal(state.processes[0].product,'');
  assert.equal(state.processes[0].group,'LEGACY / UNCLASSIFIED HISTORICAL PROCESS');
  assert.match(state.processes[0].id,/^APP-LEGACY-/);
  assert.equal(state.legacy.status,'needs_review');
  assert.equal(model.hasUnresolvedLegacy(state),true);
});

test('pristine placeholder legacy rows disappear but referenced or assessed history remains',()=>{
  const pristine=model.migrateState({solutionScope:{primaryProduct:'CIP'},opportunity:{products:['CIP']},processes:[{name:'Receiving'}],gaps:[]});
  assert.equal(pristine.processes.length,0);
  const referenced=model.migrateState({solutionScope:{primaryProduct:'CIP'},opportunity:{products:['CIP']},processes:[{name:'Receiving'}],gaps:[{process:'Receiving',need:'Historic requirement'}]});
  assert.equal(referenced.processes.length,1);
  assert.equal(referenced.gaps[0].processId,referenced.processes[0].id);
});

test('governed and custom application IDs are stable across save/reload and rename',()=>{
  const state=base('CIP');
  const governed=model.ensureProcess(state,{product:'CIP',group:'Mobile inventory',name:'Cycle Count',source:'product_app',selected:true});
  const custom=model.createCustomProcess(state,{product:'CIP',group:'Customer-specific',name:'Legacy scanner flow'});
  const ids=[governed.id,custom.id];
  const reloaded=model.migrateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(reloaded.processes.map(row=>row.id),ids);
  reloaded.processes[1].name='Renamed scanner flow';
  assert.equal(reloaded.processes[1].id,custom.id);
  assert.match(governed.id,/^APP-GOV-/);
  assert.match(custom.id,/^APP-CUSTOM-/);
});

test('gaps have stable identity and link by processId across rename and reload',()=>{
  const state=base('CIP');
  const process=model.ensureProcess(state,{product:'CIP',group:'Mobile inventory',name:'Cycle Count',selected:true});
  const gap={id:model.nextGapId(state),need:'Blind count',gapDescription:'Requires confirmation'};
  model.applyGapProcessMetadata(gap,process);state.gaps.push(gap);
  process.name='Cycle Count — renamed label';
  const reloaded=model.migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(reloaded.gaps[0].id,gap.id);
  assert.equal(reloaded.gaps[0].processId,process.id);
  assert.equal(reloaded.gaps[0].process,'Cycle Count — renamed label');
});

test('duplicate application names across product, ERP and group retain independent gap relationships',()=>{
  const state=base('CIP',['MEP']);
  const cipA=model.ensureProcess(state,{product:'CIP',group:'Mobile inventory',name:'Cycle Count',selected:true});
  const cipB=model.ensureProcess(state,{product:'CIP',group:'Inventory execution',name:'Cycle Count',selected:true});
  const mep=model.ensureProcess(state,{product:'MEP',erp:'JDE',group:'JDE',name:'Cycle Count',selected:true});
  assert.equal(new Set([cipA.id,cipB.id,mep.id]).size,3);
  const mepGap={id:model.nextGapId(state),need:'MEP gap'};model.applyGapProcessMetadata(mepGap,mep);state.gaps.push(mepGap);
  assert.equal(state.gaps.filter(gap=>gap.processId===mep.id).length,1);
  assert.equal(state.gaps.filter(gap=>gap.processId===cipA.id||gap.processId===cipB.id).length,0);
  const cipGap={id:model.nextGapId(state),need:'CIP gap'};model.applyGapProcessMetadata(cipGap,cipB);state.gaps.push(cipGap);
  assert.equal(new Set(state.gaps.map(gap=>gap.processId)).size,2);
});

test('legacy name-only gaps backfill only on a unique match and ambiguous names are never guessed',()=>{
  const unique=base('CIP');
  const only=model.ensureProcess(unique,{product:'CIP',group:'Mobile inventory',name:'Cycle Count',selected:true});
  unique.gaps=[{process:'Cycle Count',need:'Unique'}];model.migrateGaps(unique);
  assert.equal(unique.gaps[0].processId,only.id);
  assert.equal(unique.gaps[0].mappingStatus,'mapped');
  const ambiguous=base('CIP',['MEP']);
  model.ensureProcess(ambiguous,{product:'CIP',group:'Mobile inventory',name:'Cycle Count',selected:true});
  model.ensureProcess(ambiguous,{product:'MEP',erp:'JDE',group:'JDE',name:'Cycle Count',selected:true});
  ambiguous.gaps=[{process:'Cycle Count',need:'Ambiguous'}];model.migrateGaps(ambiguous);
  assert.equal(ambiguous.gaps[0].processId,'');
  assert.equal(ambiguous.gaps[0].mappingStatus,'Needs Review / Ambiguous Legacy Mapping');
});

test('authoritative Primary SE is server assignment only and typed legacy names cannot satisfy readiness',()=>{
  const state=base('CIP');
  state.opportunity.solutionEngineer='Typed Admin Name';
  const process=model.ensureProcess(state,{product:'CIP',group:'Inbound',name:'Inbound Orders',selected:true});Object.assign(process,assessed({}));
  const migrated=model.migrateState(state);
  assert.equal(Object.hasOwn(migrated.opportunity,'solutionEngineer'),false);
  assert.equal(migrated.opportunity.legacySolutionEngineerDisplay,'Typed Admin Name');
  assert.ok(readiness(migrated,{primarySeId:null}).miss.some(item=>item.label==='Primary Solution Engineer'));
  assert.ok(!readiness(migrated,{primarySeId:'11111111-1111-4111-8111-111111111111'}).miss.some(item=>item.label==='Primary Solution Engineer'));
  const route=read('src/routes/handoffs.js'),ui=read('public/solution-fit.js'),server=read('server.js');
  assert.match(ui,/data-sfassignment="primary"/);
  assert.match(ui,/\/assignment'.*method:'PUT'/s);
  assert.match(route,/role='se' OR 'se'=ANY/);
  assert.match(route,/isSe=userRoles\.includes\('se'\)&&!userRoles\.includes\('admin'\)/);
  assert.match(route,/created_by/);
  assert.match(server,/is_active=TRUE AND \(role='se' OR 'se'=ANY/);
});

test('MEP ERP family/version share one edit surface and compatibility fields remain synchronized',()=>{
  const ui=read('public/solution-fit.js');
  const mepSection=ui.slice(ui.indexOf('function renderMepScopeSetup'),ui.indexOf('function selectedCatalogItems'));
  const integration=ui.slice(ui.indexOf('function renderIntegration'),ui.indexOf('function renderIntRow'));
  assert.match(mepSection,/ERP family and version/);
  assert.match(mepSection,/data-sferpversion/);
  assert.doesNotMatch(integration,/data-sfbind="architecture\.version"/);
  const state=base('MEP');state.solutionScope.erpVersion='9.2';model.synchronizeAuthority(state);
  assert.equal(state.architecture.erp,'JDE');assert.equal(state.architecture.version,'9.2');
  const reloaded=model.migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(reloaded.solutionScope.erpVersion,'9.2');assert.equal(reloaded.architecture.version,'9.2');
});

test('explicit ERP change archives prior evidence and creates clean same-name identity for the new ERP',()=>{
  const state=base('MEP');
  const jde=model.ensureProcess(state,{product:'MEP',erp:'JDE',group:'JDE',name:'Pick Confirmation',source:'standard_app',selected:true});
  Object.assign(jde,{demoStatus:'Demonstrated',fit:'Full fit',customerValidation:'Customer validated',notes:'JDE validation'});
  const result=model.changeMepErpFamily(state,'SAP ECC6',{changedAt:'2026-10-22T12:00:00.000Z'});
  assert.equal(result.changed,true);assert.equal(state.solutionScope.erpVersion,'');
  assert.equal(jde.historical,true);assert.equal(jde.selected,false);assert.equal(jde.notes,'JDE validation');
  const sap=model.ensureProcess(state,{product:'MEP',erp:'SAP ECC6',group:'SAP ECC6',name:'Pick Confirmation',source:'standard_app',selected:true});
  assert.notEqual(sap.id,jde.id);
  assert.equal(sap.demoStatus,'Not reviewed');assert.equal(sap.fit,'Not reviewed');assert.equal(sap.customerValidation,'Not validated');assert.equal(sap.notes,'');
  assert.equal(state.scopeHistory[0].scope.erp,'JDE');assert.equal(state.scopeHistory[0].scope.erpVersion,'9.2');
});

test('MEP requirements work when MEP is primary or additional and do not leak to non-MEP scope',()=>{
  for(const state of [base('MEP',['CIP']),base('CIP',['MEP']),base('MEP',['EPP'])]){
    const descriptor={product:'MEP',erp:'JDE',group:'JDE',name:'Pick Confirmation',source:'standard_app',selected:true};
    Object.assign(model.ensureProcess(state,descriptor),assessed({}));
    const result=readiness(state,{primarySeId:'11111111-1111-4111-8111-111111111111'});
    assert.ok(!result.miss.some(item=>item.label==='MEP ERP family'||item.label==='MEP ERP version'||item.label==='MEP application scope'));
  }
  for(const state of [base('CIP',['EPP']),base('EPP',['CIP'])]){
    Object.assign(model.ensureProcess(state,{product:state.solutionScope.primaryProduct,group:'Core',name:'Core App',selected:true}),assessed({}));
    const result=readiness(state,{primarySeId:'11111111-1111-4111-8111-111111111111'});
    assert.ok(!result.miss.some(item=>item.label.startsWith('MEP ')));
  }
});

test('ROI recommendations are allowed only for an exact Solution Fit customer identity match',()=>{
  assert.equal(model.canUseCustomerContext('customer-b','customer-a'),false);
  assert.equal(model.canUseCustomerContext('customer-b','customer-c'),false);
  assert.equal(model.canUseCustomerContext('customer-b','customer-b'),true);
  assert.equal(model.canUseCustomerContext('customer-b',null),false);
  const ui=read('public/solution-fit.js');
  assert.match(ui,/SF_MODEL\.canUseCustomerContext\(customerId,window\.currentScenarioCustomerId\)/);
});

test('only the current application assessment workflow is active and legacy checklist/bulk paths are absent',()=>{
  const ui=read('public/solution-fit.js');
  for(const dead of ['renderChecklist','rerenderChecklist','bulkDemo','bulkFit','sfBulk'])assert.doesNotMatch(ui,new RegExp(dead));
  assert.match(ui,/data-sfpdemo/);assert.match(ui,/data-sfpfit/);assert.match(ui,/data-sfpvalidation/);
  assert.match(ui,/data-sfaction="gapFromProcess"/);
});

test('customer and PS outputs use active scope, stable IDs, active gaps and authoritative SE display',()=>{
  const state=base('MEP',['CIP']);
  const active=model.ensureProcess(state,{product:'MEP',erp:'JDE',group:'JDE',name:'Pick Confirmation',source:'standard_app',selected:true});Object.assign(active,assessed({}));
  const old=model.ensureProcess(state,{product:'MEP',erp:'SAP ECC6',group:'SAP ECC6',name:'Pick Confirmation',source:'standard_app',selected:false});Object.assign(old,{historical:true,demoStatus:'Demonstrated',fit:'Gap',customerValidation:'Customer validated',notes:'Old SAP evidence'});
  const gap={id:model.nextGapId(state),need:'Current requirement',gapDescription:'Current gap'};model.applyGapProcessMetadata(gap,active);state.gaps.push(gap);
  const oldGap={id:model.nextGapId(state),need:'Old requirement',gapDescription:'Old gap',historical:true};model.applyGapProcessMetadata(oldGap,old);state.gaps.push(oldGap);
  const pdf=buildSolutionFitPdf(state,{kind:'handoff',customer:'Acme',primarySeName:'Assigned SE'}).toString('latin1');
  assert.match(pdf,/Assigned SE/);assert.match(pdf,new RegExp(active.id));assert.match(pdf,new RegExp(gap.id));
  assert.doesNotMatch(pdf,/Old SAP evidence|Old gap/);
});

test('no attachment or browser-storage feature is introduced in the stabilization build',()=>{
  const ui=read('public/solution-fit.js');
  assert.doesNotMatch(ui,/\b(?:window\.)?(?:localStorage|sessionStorage)\s*\.|attachment gallery|upload attachment/i);
});
