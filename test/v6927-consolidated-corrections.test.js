'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {projectScenarioData,INPUT_FIELDS}=require('../src/shared/scenario-roi-projection');
const {buildProspectPreview}=require('../src/shared/prospect-roi-preview');
const {buildJppPdf}=require('../src/exports/operational-pdf');

test('server scenario projection accepts governed inputs and discards client-derived or unknown fields',()=>{
 const result=projectScenarioData({name:'Case',company:'Acme',currency:'GBP',users:10,labor:50000,laborWastePct:.2,mLabor:.25,invest:10000,contractMonths:36,annualBenefit:999999999,totalContractRoi:999999,untrusted:'discard me'});
 assert.equal(result.modelVersion,28);assert.notEqual(result.annualBenefit,999999999);assert.notEqual(result.totalContractRoi,999999);
 assert.equal(result.currency,'GBP');assert.equal(result.untrusted,undefined);assert.ok(INPUT_FIELDS.includes('contributionMarginPct'));
});

test('server projection recomputes OTC and shrink base rather than trusting derived browser values',()=>{
 const result=projectScenarioData({inventory:100000,shrinkRate:.03,annualWriteOff:0,effectiveShrinkBase:999999,psvc:10,hw:20,train:30,otc:999999,mShrinkage:.3,invest:1000});
 assert.equal(result.otc,60);assert.equal(result.effectiveShrinkBase,3000);
});

test('solution selection is economically neutral and Field Inventory remains explicitly opt-in',()=>{
 const input={revenue:12000000,users:80,labor:72000,laborWastePct:.12,mLabor:.25,inventory:4500000,annualWriteOff:180000,mShrinkage:.2,carryRate:.18,mCarrying:.12,invest:95000,psvc:25000,contractMonths:36,implMonths:3,ramp1:.4,ramp2:.75,ramp3:1,fieldInvValue:750000,fieldLeakageRate:.04,mFieldLeakage:.25,fieldLocations:20,fieldReconcilePerYr:12,fieldReconcilePersonHours:6,mFieldCount:.3};
 const cip=projectScenarioData({...input,solution:'cip',hasFieldInventory:false});
 const mep=projectScenarioData({...input,solution:'mep',hasFieldInventory:false});
 for(const metric of ['annualBenefit','year1Benefit','totalContractBenefit','totalContractInvestment','totalContractNetBenefit','totalContractRoi','totalContractNpv','contractPayback'])assert.equal(cip[metric],mep[metric],metric);
 const field=projectScenarioData({...input,solution:'mep',hasFieldInventory:true});
 assert.ok(field.annualBenefit>mep.annualBenefit);assert.equal(mep.fiLeakageSav,0);assert.equal(mep.fiCarrySav,0);assert.equal(mep.fiCountSav,0);
});

test('prospect preview withholds return and payback when displayed drivers do not explain total benefit',()=>{
 const questions=[{question_id:'u',canonical_input:'userCount',unit:'number'},{question_id:'l',canonical_input:'lostSalesYr',unit:'currency'},{question_id:'m',canonical_input:'contributionMarginPct',unit:'percent'}];
 const answers=[{question_id:'u',answer:'10'},{question_id:'l',answer:'100000'},{question_id:'m',answer:'40'}];
 const preview=buildProspectPreview({questions,answers,scenarioData:{invest:10000,contractMonths:36}});
 assert.match(preview.driverEvidenceState,/More information is needed/);assert.equal(preview.roi,null);assert.equal(preview.payback,null);assert.ok(preview.modeledAnnualBenefit>0);
});

test('JPP output excludes legacy blank milestones',()=>{
 const pdf=buildJppPdf({company:'Acme',milestones:[{title:'',status:'pending'},{title:'Validate baseline',status:'done'}]},{audience:'customer'});
 assert.ok(Buffer.isBuffer(pdf));assert.match(pdf.toString('latin1'),/Validate baseline/);assert.doesNotMatch(pdf.toString('latin1'),/Untitled milestone/);
});

test('prospect value review pauses walkthrough and only reports success after an applied value',()=>{
 const discovery=read('public/discovery.js'),features=read('public/features.js');
 assert.match(discovery,/CITransientOverlays\?\.suspend\('prospect-evidence'\)/);assert.match(discovery,/CITransientOverlays\?\.restore/);assert.match(discovery,/const applied=await applyValueEvent\(input,eventId,\{keepModal:true,silentSuccess:true,idempotencyKey\}\);/);
 assert.match(features,/async function applyValueEvent[\s\S]*a\.persisted!==true[\s\S]*return x;[\s\S]*return false;/);
});

test('all current ROI fields restored with correct decimal-to-percent mapping',()=>{
 const source=read('public/features.js');for(const field of ['servicePenaltyCostYr','lostSalesYr','repeatVisitsYr','costPerTruckRoll'])assert.match(source,new RegExp(`['"]${field}['"]`));
 for(const pair of ["contributionMarginPct:'contributionMarginPct'","m_servicePenalty:'mServicePenalty'","m_firstFix:'mFirstFix'"])assert.ok(source.includes(pair));
});

test('Solution Fit stage, Christie stakeholder context, guided mode and AI stale state are deterministic',()=>{
 const fit=read('public/solution-fit.js'),coach=read('public/deal-coach.js'),gate=read('public/customer-gate.js'),help=read('public/prospect-assistant.js');
 assert.match(fit,/governedChanges=await applyKnownData/);assert.doesNotMatch(fit,/if\(mutate&&String\(S\.opportunity\.stage/);
 assert.match(coach,/await loadStageReadiness\(\);await Promise\.all/);assert.match(coach,/a=governed\.length\?governed:loaded/);
 assert.match(gate,/guidedToggleChk/);assert.match(help,/f\.stale=f\.contextFingerprint!==fp/g);
});

test('authorization, JPP and purge corrections are fail closed',()=>{
 const scenarios=read('src/routes/scenarios.js'),maps=read('src/routes/maps.js'),server=read('server.js'),auth=read('src/middleware/auth.js');
 assert.match(scenarios,/router\.put\('\/:id\/resonance'[\s\S]*authorizedScenario\(req\.user,req\.params\.id,'edit'\)/);
 assert.match(maps,/scenarioAccess\(req\.user,scenarioId,'edit'\)/);assert.match(maps,/validateMilestones\(milestones\)/);
 assert.match(server,/app\.get\('\/api\/admin\/purge\/confirm'[\s\S]*purgeConfirmationPage/);assert.match(server,/app\.post\('\/api\/admin\/purge\/confirm'[\s\S]*FOR UPDATE/);
 assert.match(auth,/NODE_ENV === 'production'[\s\S]*JWT_SECRET must be configured/);
});

test('competitive product identity can be reused across governed Cloud Inventory products',()=>{
 const service=read('src/competitive-intelligence.js'),ui=read('public/competitive-intelligence-v662.js');
 assert.match(service,/array_append\(relevant_ci_products,\$2\)/);assert.match(ui,/is now available for.*research without creating a duplicate/);
});
