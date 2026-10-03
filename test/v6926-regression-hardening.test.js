'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {calcROI}=require('../src/shared/roi-engine');

const INPUT={modelVersion:28,contractMonths:36,users:40,labor:65000,laborWastePct:.2,mLabor:.3,
  inventory:9000000,effectiveShrinkBase:180000,mShrinkage:.35,carryRate:.22,mCarrying:.18,
  invTurnsCurrent:4,invTurnsBenchmark:6,revenue:45000000,otifBaseline:91,otifTarget:96,
  contributionMarginPct:.38,mOtif:.25,itCost:140000,mIt:.5,invest:90000,otc:120000,
  implMonths:3,ramp1:.4,ramp2:.75,ramp3:1,discRate:.1};

test('ROI v2.8 is product-neutral for identical economic inputs',()=>{
  const cip=calcROI({...INPUT,solution:'cip'}),mep=calcROI({...INPUT,solution:'mep'}),epp=calcROI({...INPUT,solution:'epp'});
  for(const key of ['annualBenefit','year1Benefit','totalContractBenefit','totalContractInvestment','totalContractNetBenefit','totalContractRoi','totalContractNpv','contractPayback']){
    assert.equal(cip[key],mep[key],key+' changed when solution changed to MEP');
    assert.equal(cip[key],epp[key],key+' changed when solution changed to EPP');
  }
});

test('Field Inventory changes only explicit field drivers and contract rollups',()=>{
  const fieldInputs={fieldInvValue:1200000,fieldLeakageRate:3,mFieldLeakage:.4,fieldLocations:12,
    fieldReconcilePerYr:6,fieldReconcilePersonHours:5,mFieldCount:.5};
  const off=calcROI({...INPUT,...fieldInputs,hasFieldInventory:false});
  const on=calcROI({...INPUT,...fieldInputs,hasFieldInventory:true});
  assert.equal(off.fieldInvSav,0);assert.ok(on.fieldInvSav>0);
  for(const key of ['laborSav','shrinkSav','inventoryCarrySav','otifSav','itSav'])assert.equal(on[key],off[key],key+' was altered by the field flag');
  assert.equal(on.annualBenefit-off.annualBenefit,on.fieldInvSav);
  assert.ok(on.totalContractBenefit>off.totalContractBenefit);
});

test('contract economics use implementation and monthly ramp rather than annual times years',()=>{
  const result=calcROI(INPUT),monthly=result.monthlyProfile.slice(0,36).reduce((sum,row)=>sum+row.benefit,0);
  assert.ok(Math.abs(result.totalContractBenefit-monthly)<0.01);
  assert.notEqual(result.totalContractBenefit,result.annualBenefit*3);
  assert.equal(result.totalContractInvestment,INPUT.otc+INPUT.invest*3);
  assert.equal(result.totalContractRoi,result.totalContractNetBenefit/result.totalContractInvestment*100);
});

test('missing investment keeps ROI and payback unavailable while true zero benefit remains zero',()=>{
  const result=calcROI({...INPUT,invest:0,otc:0});
  assert.equal(result.totalContractInvestment,0);assert.equal(result.totalContractRoi,null);assert.equal(result.contractPayback,null);
  assert.equal(calcROI({modelVersion:28,contractMonths:36}).annualBenefit,0);
});

test('field-inventory authority, dirty-state separation, and Prospect warning remain wired',()=>{
  const route=read('src/routes/scenarios.js'),migration=read('migrations/039_sync_customer_field_inventory.sql');
  const gate=read('public/customer-gate.js'),discovery=read('public/discovery.js'),switcher=read('public/customer-switcher.js');
  assert.match(route,/UPDATE customers SET has_field_inventory=\$1/);
  assert.match(migration,/has_field_inventory = ranked\.has_field_inventory/);
  assert.match(gate,/_narrativeDirty/);assert.match(gate,/_appliedValueDrafts/);
  assert.match(discovery,/Customer-submitted values are waiting for review/);
  assert.match(switcher,/clearAllWorkingDirty/);
});

test('Three Whys flush before Executive outputs and failures reach the Admin Error Log',()=>{
  const narrative=read('public/narrative.js'),story=read('public/executive-story.js'),adapters=read('public/executive-output-adapters.js');
  assert.match(narrative,/executive_three_whys_save\.failed/);assert.match(narrative,/executive_three_whys_ai\.failed/);
  assert.match(story,/await window\.persistThreeWhys/);assert.match(adapters,/await window\.persistThreeWhys/);
  assert.match(narrative,/do\{[\s\S]*while\(threeWhysSaveQueued\)/);
});

test('customer switch and picker clear stale identity and label historical records',()=>{
  const app=read('public/app.js'),html=read('public/index.html'),switcher=read('public/customer-switcher.js');
  assert.match(switcher,/_workspaceLoading=true/);assert.match(switcher,/_calcLoadedScenarioMeta=null/);
  assert.match(switcher,/if\(!narrativeSaved\)/);
  assert.match(html,/Historical/);assert.match(html,/clearCalcScenarioPicker/);
  assert.match(app,/if\s*\(window\._workspaceLoading\)/);
});

test('AI and role/UI corrections use governed deterministic behavior',()=>{
  const server=read('server.js'),knowledge=read('src/shared/application-knowledge.js'),api=read('public/src/client/api.js'),coach=read('src/shared/christie-context.js'),comp=read('public/comp-research.js');
  assert.match(server,/deterministicFormulaAnswer\(question\)/);assert.match(knowledge,/Total Contract Benefit/);
  assert.match(api,/sales_rep.*rep/);assert.match(api,/solution_engineer.*se/);
  assert.match(coach,/deterministicCustomerFollowUp/);assert.match(coach,/Do not sign .*Christie/i);
  assert.match(comp,/_cr\.running\s*=\s*false/);
});

test('Joint Project Plan mutation is disabled for non-owners and map owner id is returned',()=>{
  const client=read('public/map.js'),route=read('src/routes/maps.js');
  assert.match(client,/_mapReadOnly/);assert.match(client,/mapCanMutate/);assert.match(client,/input,select,textarea/);
  assert.match(route,/owner_id/);
});
