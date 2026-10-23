'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const JSZip=require('jszip');
const model=require('../public/solution-fit-state');
const {buildSolutionFitTurnoverDocx}=require('../src/exports/solution-fit-turnover-docx');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('v6.9.39 migrates legacy Solution Fit data additively without deleting unknown or historical fields',()=>{
  const legacy={
    opportunity:{customer:'Northstar',products:['MEP'],futureField:'preserve-me'},
    solutionScope:{primaryProduct:'MEP',erp:'JDE'},
    processes:[{id:'P-001',name:'Pick Confirmation',product:'MEP',erp:'JDE',selected:true,demoStatus:'Demonstrated',fit:'Partial fit',customerValidation:'Customer validated',notes:'Anticipated extension',legacyEvidenceId:'EV-9'}],
    gaps:[{id:'GAP-001',gapDescription:'Existing gap',legacyDecision:'preserve-me'}],
    privateExtension:{ownedBy:'future-release'}
  };
  const migrated=model.migrateState(legacy);
  assert.equal(migrated.privateExtension.ownedBy,'future-release');
  assert.equal(migrated.opportunity.futureField,'preserve-me');
  assert.equal(migrated.processes.length,1);
  assert.equal(migrated.processes[0].legacyEvidenceId,'EV-9');
  assert.equal(migrated.processes[0].notes,'Anticipated extension');
  assert.equal(migrated.gaps[0].legacyDecision,'preserve-me');
  assert.ok(migrated.inventoryConfiguration['Lot Numbers']);
  assert.ok(migrated.turnover);
});

test('MEP Standard Package selects package apps while custom scope deselects without erasing assessments',()=>{
  const state=model.migrateState({opportunity:{products:['MEP']},solutionScope:{primaryProduct:'MEP',erp:'JDE'},processes:[]});
  model.applyStandardPackage(state,{erp:'JDE',names:['Pick Confirmation','Pack Confirmation'],catalogVersion:'2026-08'});
  assert.equal(state.solutionScope.packageMode,'standard');
  assert.equal(state.processes.filter(row=>row.selected).length,2);
  state.processes[0].demoStatus='Demonstrated';state.processes[0].fit='Partial fit';state.processes[0].notes='Customer-specific one-off';
  model.startCustomScope(state,{erp:'JDE'});
  assert.equal(state.solutionScope.packageMode,'custom');
  assert.equal(state.processes.filter(row=>row.selected).length,0);
  assert.equal(state.processes[0].demoStatus,'Demonstrated');
  assert.equal(state.processes[0].fit,'Partial fit');
  assert.equal(state.processes[0].notes,'Customer-specific one-off');
  model.applyStandardPackage(state,{erp:'JDE',names:['Pick Confirmation','Pack Confirmation'],catalogVersion:'2026-08'});
  assert.equal(state.processes.length,2,'reapplying the package must reuse saved assessment records');
  assert.equal(state.processes[0].notes,'Customer-specific one-off');
});

test('governed Standard Package lists are unique subsets and SAP Hana matches SAP ECC6',()=>{
  const catalog=JSON.parse(read('config/mep-standard-apps.json'));
  for(const [erp,names] of Object.entries(catalog.standardPackages)){
    assert.ok(names.length>0,`${erp} package must not be empty`);
    assert.equal(new Set(names).size,names.length,`${erp} package must be unique`);
    for(const name of names)assert.ok(catalog.erps[erp].includes(name),`${name} must exist in ${erp} catalog`);
  }
  assert.deepEqual(catalog.standardPackages['SAP Hana'],catalog.standardPackages['SAP ECC6']);
});

test('guided Solution Fit uses server persistence, eight ordered steps, and no browser storage',()=>{
  const source=read('public/solution-fit.js'),state=read('public/solution-fit-state.js'),index=read('public/index.html');
  assert.doesNotMatch(source,/\b(?:window\.)?(?:localStorage|sessionStorage)\s*\./);
  assert.doesNotMatch(state,/\b(?:window\.)?(?:localStorage|sessionStorage)\s*\./);
  assert.match(source,/\['context','Customer and SE'\]/);
  assert.match(source,/\['configuration','Inventory configuration'\]/);
  assert.match(source,/\['scope','Product and application scope'\]/);
  assert.match(source,/\['turnover','PS turnover'\]/);
  assert.match(source,/data-sfappselect/);
  assert.match(source,/data-sfpdemo/);
  assert.match(source,/data-sfpfit/);
  assert.match(source,/data-sfpvalidation/);
  assert.match(source,/Exceptions and notes/);
  assert.ok(index.indexOf('solution-fit-state.js')<index.indexOf('solution-fit.js'));
  assert.match(source,/method:\s*'PUT',\s*body:\s*JSON\.stringify\(\{\s*data:\s*S\s*\}\)/);
});

test('Professional Services turnover Word output is built from saved Solution Fit data',async()=>{
  const data=model.migrateState({
    opportunity:{customer:'Northstar',products:['CIP'],outcome:'Improve inventory accuracy'},
    processes:[{name:'Cycle Count',product:'CIP',group:'Inventory execution',selected:true,demoStatus:'Demonstrated',fit:'Full fit',customerValidation:'Customer validated',notes:'Validated in workshop'}],
    turnover:{contractStatus:'Signed and available',projectManager:'Jordan Lee',systemAdminEmail:'admin@northstar.example',deliveryModel:'Cloud Inventory Professional Services',internalDeliveryContact:'Delivery Lead',projectStart:'2026-11-01',eapEdition:'Enterprise',environments:'2',authorizedDefinitions:'Cloud Inventory',authorizedLanguages:'English',customerDomain:'northstar.example',sowLink:'repository://signed-sow'}
  });
  const logo=fs.readFileSync(path.join(root,'public','ci-logo-full-color.png'));
  const buffer=await buildSolutionFitTurnoverDocx({data,customerName:'Northstar',accountExecutive:'AE User',primarySeName:'SE User',logoData:logo});
  assert.ok(buffer.length>5000);
  const zip=await JSZip.loadAsync(buffer);
  assert.ok(zip.file('[Content_Types].xml'));
  const documentXml=await zip.file('word/document.xml').async('string');
  assert.match(documentXml,/Northstar/);
  assert.match(documentXml,/Cycle Count/);
  assert.match(documentXml,/Jordan Lee/);
  assert.match(documentXml,/CONFIDENTIAL/);
});

test('turnover route reads the saved handoff and fails closed when required fields are missing',()=>{
  const route=read('src/routes/handoffs.js');
  assert.match(route,/router\.get\('\/:customerId\/export-docx'/);
  assert.match(route,/SELECT h\.data,h\.primary_se_id,pse\.username primary_se_name FROM handoffs h/);
  assert.match(route,/SolutionFitState\.turnoverStats\(state\)/);
  assert.match(route,/if\(turnover\.missing\.length\)return res\.status\(409\)/);
  assert.match(route,/buildSolutionFitTurnoverDocx\(\{data:state/);
});
