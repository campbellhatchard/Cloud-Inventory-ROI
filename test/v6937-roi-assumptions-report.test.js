'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {buildRoiAssumptionsReportBundle,buildRoiAssumptionsReportModel}=require('../src/shared/roi-assumptions-report');
const {buildRoiAssumptionsPdf}=require('../src/exports/roi-assumptions-pdf');
const renderer=require('../public/roi-assumptions-report');
const brand=require('../src/shared/brand-system');
const preconditions=require('../public/executive-output-preconditions');
const registry=require('../src/shared/output-registry');
const {buildExecutiveValueStory}=require('../src/shared/executive-value-story');

function fixture(currency='USD',overrides={}){
 const data={name:'North America Inventory Modernization',company:'Atlas Industrial Components',currency,modelVersion:28,contractMonths:36,invest:120000,otc:60000,discRate:.10,implMonths:0,ramp1:.4,ramp2:.75,ramp3:1,users:24,labor:78000,laborWastePct:.18,mLabor:.35,annualWriteOff:240000,effectiveShrinkBase:240000,currentAccuracy:95,mShrinkage:.25,inventory:12500000,carryRate:.2,mCarrying:.12,invTurnsCurrent:2.2,invTurnsBenchmark:4,lostSalesYr:800000,contributionMarginPct:.32,mOtif:.35,servicePenaltyCostYr:90000,mServicePenalty:.4,expediteSpendYr:180000,mExpedite:.3,downtimeEventsYr:24,downtimeHrsPerEvent:.5,downtimeCostPerHr:45000,mDowntime:.4,countDaysYr:20,countPeople:12,mCount:.5,ordersPerYr:160000,costPerOrder:8,pickRateGainPct:.15,mThroughput:.3,orderErrorPct:.025,costPerError:85,mAccuracy:.4,repeatVisitsYr:700,costPerTruckRoll:480,mFirstFix:.25,hasFieldInventory:true,fieldInvValue:2500000,fieldLeakageRate:3,mFieldLeakage:.35,fieldLocations:18,fieldReconcilePerYr:12,fieldReconcilePersonHours:5,mFieldCount:.45,itCost:125000,mIt:.6,threeWhysAct:'Inventory gaps are constraining service and operating performance.',threeWhysNow:'A planned modernization makes the timing material.',threeWhysCi:'Cloud Inventory aligns inventory execution with the system of record.',threeWhysMeta:{whyChange:{source:'customer_validated'},whyNow:{source:'customer_validated'},whyCloudInventory:{source:'customer_validated'}},fieldStates:{userCount:'confirmed_prospect',laborCost:'confirmed',annualWriteOff:'confirmed_customer',lostSalesYr:'estimated'},fieldProvenance:{userCount:{eventId:'event-prospect',value:24,date:'2026-10-01'},laborCost:{eventId:'event-rep',value:78000,date:'2026-10-01'},annualWriteOff:{eventId:'event-customer',value:240000,source:'Finance workshop',date:'2026-10-01'}},...overrides};
 return{scenario:{id:'scenario-saved',base_id:'opportunity-1',version:4,name:data.name,company:data.company,solution:'Cloud Inventory',owner_username:'Avery Rep',data},governance:{evidence:{}},stakeholders:[],discovery:[],solutionFit:{data:{opportunity:{products:['Cloud Inventory']}}},jointProjectPlan:{milestones:[{task:'Review value case',owner:'joint',dueDate:'2026-10-30'}]},valueHistory:[]};
}

test('one authoritative saved report model reuses the exact Executive Value Story calculation',()=>{
 const source=fixture(),bundle=buildRoiAssumptionsReportBundle(source),report=bundle.report,story=buildExecutiveValueStory(source,{includeAuthoritativeCalculation:true}),roi=story.authoritativeRoi;
 assert.equal(report.summary.annualCustomerBenefit,roi.annualBenefit);assert.equal(report.summary.totalContractBenefit,roi.totalContractBenefit);assert.equal(report.summary.modeledCustomerInvestment,roi.totalContractInvestment);assert.equal(report.summary.netEconomicBenefit,roi.totalContractNetBenefit);assert.equal(report.summary.contractRoi,roi.totalContractRoi);assert.equal(report.summary.paybackMonths,roi.contractPayback);assert.equal(report.summary.npv,roi.totalContractNpv);
 assert.equal(report.drivers.reduce((sum,row)=>sum+row.annualBenefit,0),roi.annualBenefit);
 assert.equal(JSON.stringify(bundle.story).includes('authoritativeRoi'),false,'calculation handle must not leak into story JSON');
});

test('report input projection is relevant, customer-safe, provenance-accurate and preserves zero',()=>{
 const report=buildRoiAssumptionsReportModel(fixture()),byLabel=new Map(report.inputs.map(row=>[row.label,row]));
 assert.equal(byLabel.get('Employees Using Inventory Processes').source,'Prospect Submitted');assert.equal(byLabel.get('Employees Using Inventory Processes').supportStatus,'Customer Supported');
 assert.equal(byLabel.get('Average Fully Burdened Labor Cost').source,'Rep Confirmed');assert.equal(byLabel.get('Average Fully Burdened Labor Cost').supportStatus,'Rep Validated');
 assert.equal(byLabel.get('Annual Inventory Write-Offs').source,'Customer Revalidated');assert.equal(byLabel.get('Annual Inventory Write-Offs').supportStatus,'Customer Supported');
 assert.equal(byLabel.get('Annual Sales Lost to Inventory Availability').source,'Rep Estimate');
 assert.equal(byLabel.get('Expected Downtime Reduction').source,'Model Assumption');
 assert.equal(byLabel.get('Modeled Implementation Period').value,0,'authoritative zero must be preserved');
 const stale=buildRoiAssumptionsReportModel(fixture('USD',{fieldProvenance:{userCount:{eventId:'stale-prospect-event',value:24,date:'2020-01-01'}},fieldStates:{userCount:'confirmed_prospect'}}));assert.equal(stale.inputs.find(row=>row.label==='Employees Using Inventory Processes').source,'Prospect Submitted');assert.equal(stale.sourceSummary.needsRevalidation,1);assert.equal(stale.sourceSummary.repEstimates,stale.inputs.filter(row=>row.source==='Rep Estimate').length);
 assert.equal(report.inputs.some(row=>row.label==='Annual Inventory Value'&&row.usedIn.includes('Inventory Write-Off Reduction')),false,'unused alternative write-off input must not be attributed to the driver');
 const serialized=JSON.stringify(report);for(const forbidden of ['canonical_input','base_id','event_type','discovery_submission_id','fieldStates','fieldProvenance','userId'])assert.equal(serialized.includes(forbidden),false,forbidden);
});

test('multiple inputs collectively support a driver without invented per-input benefit allocation',()=>{
 const report=buildRoiAssumptionsReportModel(fixture()),downtime=report.drivers.find(row=>row.label==='Downtime reduction');
 assert.ok(downtime);assert.equal(downtime.inputs.length,4);assert.ok(downtime.annualBenefit>0);
 assert.equal(downtime.inputs.some(row=>Object.hasOwn(row,'annualBenefit')),false);
 assert.ok(downtime.calculationBasis.includes('Annual events'));
});

test('overlap treatment is model-owned, explained and reconciled exactly',()=>{
 const report=buildRoiAssumptionsReportModel(fixture()),carrying=report.drivers.find(row=>row.label==='Inventory carrying benefit'),productivity=report.drivers.find(row=>/Workforce productivity|Throughput capacity/.test(row.label));
 assert.match(carrying.overlapNote,/included only once|Included once/i);assert.match(productivity.overlapNote,/prevent overlap|Included once/i);
 assert.equal(report.authority.reconciledAnnualBenefit,true);
});

test('legacy saved scenarios retain their original economics and expose every active driver input',()=>{
 const source=fixture('USD',{modelVersion:27,revenue:200000000,otifBaseline:96,otifTarget:98,mOtif:.10,lostSalesYr:0,contributionMarginPct:.25}),report=buildRoiAssumptionsReportModel(source),story=buildExecutiveValueStory(source,{includeAuthoritativeCalculation:true}),roi=story.authoritativeRoi;
 assert.equal(report.authority.roiModel,'ROI Model v2.7 (legacy saved scenario)');
 assert.equal(report.identity.modelVersion,27);
 assert.equal(report.drivers.reduce((sum,row)=>sum+row.annualBenefit,0),roi.annualBenefit);
 const labor=report.drivers.find(row=>row.label==='Workforce productivity — labor recovery'),throughput=report.drivers.find(row=>row.label==='Warehouse throughput — legacy saved model'),service=report.drivers.find(row=>row.label==='Service Revenue Opportunity — Legacy Saved Model');
 assert.deepEqual(labor.inputs.map(row=>row.label),['Employees Using Inventory Processes','Average Fully Burdened Labor Cost','Time Spent on Avoidable Inventory Work','Expected Labor Recovery']);
 assert.deepEqual(throughput.inputs.map(row=>row.label),['Annual Orders','Current Cost per Order','Expected Pick-Rate Improvement','Expected Throughput Realization']);
 assert.deepEqual(service.inputs.map(row=>row.label),['Annual Revenue','Current On-Time, In-Full Performance','Target On-Time, In-Full Performance','Expected Service Recovery']);
 assert.match(labor.overlapNote,/separate additive benefit categories/i);assert.match(throughput.overlapNote,/separate additive benefit categories/i);assert.equal(service.overlapNote,'');
 assert.match(service.calculationBasis,/does not apply contribution margin/i);
 assert.ok(report.methodologyNotes.some(note=>/original authoritative economics are preserved/i.test(note)));
 const html=renderer.buildRoiAssumptionsHtml(report,{audience:'internal',draft:true,brand});assert.match(html,/ROI Model v2\.7 \(legacy saved scenario\)/);
 const pdf=buildRoiAssumptionsPdf(report,{audience:'internal',draft:true});assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>3000);
});

test('ROI Assumptions desktop modal rules are not trapped inside the phone media query',()=>{
 const css=read('public/style.css'),phone=css.indexOf('@media (max-width:640px){'),rar=css.indexOf('.rar-modal{');
 assert.ok(phone>=0&&rar>phone,'expected responsive and report rules');
 let depth=0;for(let i=phone;i<rar;i++){if(css[i]==='{')depth++;else if(css[i]==='}')depth--;}
 assert.equal(depth,0,'desktop report modal CSS must be outside the max-width:640px block');
 for(const rule of ['position:fixed','z-index:10000','height:min(92vh,980px)','max-width:170px'])assert.ok(css.slice(rar,css.indexOf('@media(max-width:850px)',rar)).includes(rule),rule);
});

test('null investment remains Not Modeled while explicit values and native currencies are preserved',()=>{
 const missing=fixture('GBP',{invest:undefined,otc:0}),report=buildRoiAssumptionsReportModel(missing),html=renderer.buildRoiAssumptionsHtml(report,{audience:'customer',brand});
 assert.equal(report.summary.modeledCustomerInvestment,null);assert.match(html,/Not Modeled/);assert.match(html,/£/);assert.doesNotMatch(html,/>\$0<|USD/);
 const usd=renderer.buildRoiAssumptionsHtml(buildRoiAssumptionsReportModel(fixture('USD')),{audience:'customer',brand});assert.match(usd,/\$/);
});

test('Web and PDF render the same governed report model with ready, review and draft classification',()=>{
 const report=buildRoiAssumptionsReportModel(fixture()),ready=renderer.buildRoiAssumptionsHtml(report,{audience:'customer',brand}),review=renderer.buildRoiAssumptionsHtml(report,{audience:'customer',review:true,brand}),draft=renderer.buildRoiAssumptionsHtml(report,{audience:'internal',draft:true,brand});
 assert.match(ready,/ROI Assumptions &amp; Results Summary/);assert.match(ready,/Confidential and Proprietary/);assert.doesNotMatch(ready,/INTERNAL USE ONLY/);
 assert.match(review,/REVIEW BEFORE SHARING/);assert.match(draft,/CONFIDENTIAL — INTERNAL USE ONLY/);assert.match(draft,/DRAFT — NOT READY FOR CUSTOMER SHARING/);
 for(const [options,expected] of [[{audience:'customer'},'Confidential and Proprietary'],[{audience:'customer',review:true},'REVIEW BEFORE SHARING'],[{audience:'internal',draft:true},'DRAFT - NOT READY FOR CUSTOMER SHARING']]){const pdf=buildRoiAssumptionsPdf(report,options);assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>3000);assert.match(pdf.toString('latin1'),new RegExp(expected));}
});

test('long-content PDF remains valid and contains the authoritative report sections',()=>{
 const source=fixture('GBP',{name:'A very long global inventory modernization scenario name for customer review and transparent value engineering governance'}),report=buildRoiAssumptionsReportModel(source),pdf=buildRoiAssumptionsPdf(report,{audience:'customer'}),text=pdf.toString('latin1');
 assert.equal(pdf.subarray(0,4).toString(),'%PDF');for(const heading of ['Executive ROI Summary','Inputs & Assumptions','Value Driver Calculation Trace','Methodology & Evidence Notes'])assert.match(text,new RegExp(heading.replace('&','\\&')));assert.match(text,/GBP/);assert.match(text,/Page 2|Page 3/);
});

test('saved scenario and dirty-state rules fail closed with the required instruction',()=>{
 assert.throws(()=>buildRoiAssumptionsReportModel({}),/saved scenario/i);
 const dirty=preconditions.inspectExecutiveOutputState({scenarioId:'saved',calculatorDirty:true},{outputType:'roi_assumptions'});assert.equal(dirty.ok,false);assert.equal(dirty.message,'Save the current scenario before generating the ROI Assumptions & Results Summary.');
 assert.equal(preconditions.inspectExecutiveOutputState({scenarioId:'saved',calculatorDirty:false},{outputType:'roi_assumptions'}).ok,true);
});

test('registered Web and PDF production owners, routes and browser control are active',()=>{
 const web=registry.getOutput('roi-assumptions-web'),pdf=registry.getOutput('roi-assumptions-pdf');assert.equal(web.ownerModule,'public/roi-assumptions-report.js');assert.equal(pdf.ownerModule,'src/exports/roi-assumptions-pdf.js');assert.equal(web.readinessOutputType,'roi_assumptions');assert.equal(pdf.readinessOutputType,'roi_assumptions');assert.equal(registry.validateRegistry(),true);
 const routes=read('src/routes/scenarios.js'),index=read('public/index.html');assert.match(routes,/loadExecutiveSource\(req\.user,req\.params\.id\)/);assert.match(routes,/roi-assumptions-report/);assert.match(routes,/export-roi-assumptions-pdf/);assert.match(index,/openRoiAssumptionsReport\(\)/);assert.match(index,/data-context-action="output"/);
});

test('new report modules contain presentation and reconciliation only, not a second ROI engine',()=>{
 const reportSource=read('src/shared/roi-assumptions-report.js'),pdfSource=read('src/exports/roi-assumptions-pdf.js'),webSource=read('public/roi-assumptions-report.js');
 assert.doesNotMatch(reportSource,/function\s+calcROI|Math\.pow|monthlyProfile|paybackFromSigning/);assert.doesNotMatch(pdfSource,/calcROI|Math\.pow|totalContractBenefit\s*=/);assert.doesNotMatch(webSource,/calcROI|Math\.pow|totalContractBenefit\s*=/);
 assert.match(reportSource,/buildExecutiveValueStory\(source,\{includeAuthoritativeCalculation:true\}\)/);
});
