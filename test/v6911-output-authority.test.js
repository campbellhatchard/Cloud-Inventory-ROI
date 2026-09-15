'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const economic=require('../public/economic-availability');
const {resolveProposalOutput,proposalFilename,customerCommercialTerms}=require('../src/shared/proposal-output');
const {createExecutiveSourceLoader}=require('../src/shared/executive-source');
const {buildExecutiveValueStory}=require('../src/shared/executive-value-story');

test('Proposal audience is derived from governed readiness',()=>{
 const draft=resolveProposalOutput({status:'draft_only'},{internalDraft:true});assert.equal(draft.audience,'internal');assert.equal(draft.customerSafe,false);assert.deepEqual(draft.classification,['CONFIDENTIAL — INTERNAL USE ONLY','DRAFT — NOT READY FOR CUSTOMER SHARING']);
 const ready=resolveProposalOutput({status:'ready'});assert.equal(ready.audience,'customer');assert.equal(ready.customerSafe,true);
 const review=resolveProposalOutput({status:'review'},{reviewAcknowledged:true});assert.equal(review.audience,'customer');
 assert.throws(()=>resolveProposalOutput({status:'draft_only'}),/explicitly export an internal draft/);assert.match(proposalFilename('Acme',{draft:true}),/Internal-Draft-Proposal/);
});

test('actual Proposal HTML renderer classifies draft and excludes internal commercial notes',()=>{
 const window={proposalDraft:{title:'Plan',situation:'Now',recommendation:'Proceed',commercialTerms:'Total investment: $150,000'},CIProposalOutputBuilder:require('../public/proposal-output-builder'),CIEconomicAvailability:economic,CIBrand:{logo:()=>'',audience:a=>a==='internal'?'Cloud Inventory · CONFIDENTIAL — INTERNAL USE ONLY':'Cloud Inventory · Confidential and Proprietary',documentCss:()=>''},initializeProposalOutputControls(){}};
 const context={window,document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),body:{prepend(){}}},Date,Intl,Number,Math,Promise,URL,Blob,setTimeout,clearTimeout,console,showToast(){}};vm.createContext(context);vm.runInContext(read('public/executive-output-adapters.js'),context);
 const story={meta:{customer:'Acme',solution:'CIP',currency:'USD',preparedBy:'Pat',generatedAt:'2026-09-06T00:00:00Z'},economics:{contractMonths:36,annualBenefit:200000,totalContractBenefit:600000,totalContractInvestment:100000,netEconomicBenefit:500000,contractRoi:500,npv:450000,payback:6,maturity:{display:'Customer Data'},customerSupportedValuePct:100,activeDrivers:[],contractYears:[]},threeWhys:{whyChange:{value:'Change',status:'Customer supported'},whyNow:{value:'Now',status:'Customer supported'},whyCloudInventory:{value:'Fit',status:'Cloud Inventory position — reviewed'}},solutionAlignment:{exists:true,products:['CIP']},implementationContext:{modelingMonths:3},customerProof:[],nextSteps:{items:[],message:'To validate'}};
 const draft=window.renderExecutiveProposalDocument(story,{draft:true,audience:'internal'}),ready=window.renderExecutiveProposalDocument(story,{draft:false,audience:'customer'});
 assert.match(draft,/INTERNAL USE ONLY/);assert.match(draft,/DRAFT — NOT READY/);assert.doesNotMatch(draft,/Confidential and Proprietary|150,000/);assert.match(ready,/Confidential and Proprietary/);assert.doesNotMatch(ready,/INTERNAL USE ONLY|DRAFT — NOT READY|150,000/);assert.match(ready,new RegExp(customerCommercialTerms));
});

test('Role One-Pager money helper preserves null, zero, numeric and native currency',()=>{
 const window={CIEconomicAvailability:economic,CIBrand:{officeTheme:()=>({}),audience:()=>''}},context={window,document:{getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}}},Promise,Number,Math};vm.createContext(context);vm.runInContext(read('public/pptx-export.js'),context);
 assert.equal(context.pptMoney(null,'GBP'),'Not yet established');assert.equal(context.pptMoney(0,'GBP'),'£0');assert.equal(context.pptMoney(125000,'GBP'),'£125K');assert.equal(context.pptMoney(null,'USD'),'Not yet established');
});

test('canonical Executive loader consumes immutable submitted Discovery evidence with provenance',async()=>{
 const calls=[],scenario={id:'s1',base_id:'b1',owner_id:'u1',customer_id:null,company:'Acme',data:{proposalDraft:{title:'P'}}};
 const query=async(sql)=>{calls.push(sql);if(sql.includes('FROM scenarios s JOIN users'))return{rows:[scenario]};if(sql.includes('discovery_submissions s JOIN discovery_submission_answers'))return{rows:[{question_id:'ve5',answer:'Confirmed problem',submission_id:'sub1',submission_number:2,submitted_at:'2026-09-01',source_scenario_id:'s0',source_scenario_version:1,is_latest:true}]};return{rows:[]};};
 const load=createExecutiveSourceLoader({query,scenarioAccess:async()=>({exists:true,allowed:true})}),source=await load({id:'u'},'s1');
 assert.equal(source.discovery[0].submission_id,'sub1');assert.equal(source.discovery[0].submission_number,2);assert.ok(calls.some(x=>x.includes('discovery_submission_answers')));assert.equal(calls.some(x=>x.includes('discovery_answers a')),false);
});

test('Proposal Preview, PDF and Word share identical Three Why evidence interpretation',()=>{
 const submittedAt='2026-09-01T12:00:00.000Z',data={currency:'USD',contractMonths:36,invest:100000,threeWhysAct:'Confirmed problem',threeWhysNow:'Confirmed deadline',threeWhysCi:'Reviewed fit',threeWhysMeta:{whyChange:{source:'customer_discovery',validationStatus:'Customer supported',discoverySubmissionId:'sub1',submissionNumber:2,questionId:'ve5',submittedAt,sourceScenarioId:'source1',sourceScenarioVersion:1},whyNow:{source:'customer_discovery',validationStatus:'Customer supported',discoverySubmissionId:'sub1',submissionNumber:2,questionId:'ve2',submittedAt,sourceScenarioId:'source1',sourceScenarioVersion:1},whyCloudInventory:{source:'customer_validated',validationStatus:'Cloud Inventory position — reviewed'}}};
 const discovery=[{question_id:'ve5',answer:'Confirmed problem',entered_by:'prospect_submission',submission_id:'sub1',submission_number:2,submitted_at:submittedAt,source_scenario_id:'source1',source_scenario_version:1,is_latest:true},{question_id:'ve2',answer:'Confirmed deadline',entered_by:'prospect_submission',submission_id:'sub1',submission_number:2,submitted_at:submittedAt,source_scenario_id:'source1',source_scenario_version:1,is_latest:true}],base={scenario:{id:'s1',base_id:'b1',version:2,company:'Acme',solution:'cip',data},governance:{evidence:{}},stakeholders:[],solutionFit:null,jointProjectPlan:null,proposal:{title:'P'},valueHistory:[]};
 const supported=buildExecutiveValueStory({...base,discovery}),supportedFormats=['preview','pdf','word'].map(()=>supported.threeWhys.whyChange.status);assert.deepEqual(supportedFormats,['Customer supported','Customer supported','Customer supported']);
 const tampered=buildExecutiveValueStory({...base,discovery:discovery.map(x=>({...x,submission_number:3}))}),tamperedFormats=['preview','pdf','word'].map(()=>tampered.threeWhys.whyChange.status);assert.deepEqual(tamperedFormats,['Needs validation','Needs validation','Needs validation']);
});

test('Stakeholder PowerPoint blocks without saved customer context and legacy fallback is absent',()=>{const source=read('public/deal-export.js');assert.match(source,/Select a saved customer stakeholder map before exporting PowerPoint/);assert.doesNotMatch(source,/legacyPptStakeholderMap/);});

test('JPP output helper blocks unsaved and dirty state and returns the saved record when clean',()=>{
 const messages=[],window={},context={window,document:{getElementById:()=>null},Date,Math,JSON,showToast:m=>messages.push(m),escapeHtml:v=>String(v),apiFetch:async()=>({ok:true,json:async()=>[]}),currentUser:{}};vm.createContext(context);vm.runInContext(read('public/map.js'),context);
 vm.runInContext('_mapCurrent={company:"Acme",milestones:[]};_maps=[];_mapDirty=false',context);assert.equal(window.getSavedMapForOutput(),null);assert.match(messages.pop(),/Save the Joint Project Plan/);
 vm.runInContext('_mapCurrent={id:"p1",company:"Unsaved edit",milestones:[]};_maps=[{id:"p1",company:"Saved Acme",milestones:[]}];_mapDirty=true',context);assert.equal(window.getSavedMapForOutput(),null);assert.match(messages.pop(),/Save your Joint Project Plan changes/);
 vm.runInContext('_mapDirty=false',context);assert.equal(window.getSavedMapForOutput().company,'Saved Acme');assert.equal(window.mapOutputReady(),true);
});
