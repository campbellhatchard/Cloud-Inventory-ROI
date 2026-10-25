'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),JSZip=require('jszip');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {persistExecutiveNarrative,resolveExecutiveNarrative}=require('../src/shared/executive-narrative');
const {buildExecutiveValueStory}=require('../src/shared/executive-value-story');
const {buildCustomerROIReportData}=require('../src/shared/customer-roi-report');
const {buildExecutivePdf}=require('../src/exports/executive-pdf');
const {buildExecutiveDocx}=require('../src/exports/executive-docx');
const {buildExecutivePptx}=require('../src/exports/executive-pptx');
const {buildProposalPdf}=require('../src/exports/proposal-pdf');
const {buildProposalDocx}=require('../src/exports/proposal-docx');
const proposalBuilder=require('../public/proposal-output-builder');
const economic=require('../public/economic-availability'),brand=require('../src/shared/brand-system');
const SF=require('../public/solution-fit-state'),evidence=require('../public/solution-fit-evidence');
const {getQuestionnaire}=require('../src/shared/questionnaire-definitions');
const {scenarioFinancialSummary}=require('../src/shared/scenario-financial-summary');

const WHY_CHANGE='QA WHY CHANGE 6946 — reduce fragmented warehouse execution.';
const WHY_NOW='QA WHY NOW 6946 — operational planning requires action this quarter.';
const WHY_CI='QA WHY CI 6946 — unified inventory execution across existing systems.';
function source(){const data=persistExecutiveNarrative({currency:'USD',modelVersion:28,contractMonths:36,invest:100000,users:10,labor:50000,mLabor:.2},{whyChange:WHY_CHANGE,whyNow:WHY_NOW,whyCloudInventory:WHY_CI},{whyChange:{source:'rep_authored'},whyNow:{source:'rep_authored'},whyCloudInventory:{source:'rep_authored'}});return{scenario:{id:'s6946',base_id:'b6946',version:4,customer_id:'c6946',company:'QA Customer',industry:'Manufacturing',solution:'CIP',owner_username:'QA Rep',data},governance:{evidence:{}},stakeholders:[],discovery:[],solutionFit:null,jointProjectPlan:null,proposal:{title:'QA Proposal',situation:'Current state',recommendation:'Proceed'},valueHistory:[]};}
const allXml=async buffer=>{const zip=await JSZip.loadAsync(buffer),names=Object.keys(zip.files).filter(name=>/\.xml$/.test(name));return (await Promise.all(names.map(name=>zip.file(name).async('string')))).join('\n');};
function web(story){const window={CIProposalOutputBuilder:proposalBuilder,CIEconomicAvailability:economic,CIBrand:{logo:()=>'',audience:a=>a==='internal'?'Internal Use Only':'Confidential and Proprietary'}};const context={window,document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),body:{prepend(){}}},Date,Intl,Number,Math,Promise,URL,Blob,setTimeout,clearTimeout,console,showToast(){},showExecutiveValueStoryUnavailable(){}};vm.createContext(context);vm.runInContext(read('public/executive-output-adapters.js'),context);return window.renderExecutiveStoryDocument(story,{audience:'internal',draft:true});}
function impactQuestionIds(industry,hasFieldInventory){const context={window:{_hasFieldInventory:hasFieldInventory,ROI_FORMULA_REGISTRY:{}},getApplicableQuestionnaire:(key,options)=>getQuestionnaire(key,options).map(section=>({section:section.section,isFieldInventory:section.questions.some(q=>q.id.startsWith('fi')),questions:section.questions})),classifyQuestion:()=>({classification:'context',directRoiImpact:false}),document:{getElementById:()=>null},console};Object.assign(context,context.window);vm.createContext(context);vm.runInContext(read('public/impact-map.js')+`;globalThis.__impact=buildImpactMapModel({hasFieldInventory:${hasFieldInventory}});`,context);return JSON.parse(JSON.stringify(context.__impact.find(group=>group.industry===industry).rows.map(row=>row.questionId)));}
function assertWhys(value,{pdf=false}={}){for(const expected of [WHY_CHANGE,WHY_NOW,WHY_CI]){const semantic=pdf?expected.replace(/—/g,'-'):expected;assert.ok(String(value).includes(semantic),`missing canonical narrative: ${semantic}`);}}

test('REG-6945-01 canonical saved narrative is identical across editor, Executive and Proposal formats',async()=>{
 const src=source(),resolved=resolveExecutiveNarrative(src.scenario.data),story=buildExecutiveValueStory(src),report=buildCustomerROIReportData(src),proposal=src.proposal;
 assert.equal(resolved.whyChange.value,WHY_CHANGE);assert.equal(resolved.whyNow.value,WHY_NOW);assert.equal(resolved.whyCloudInventory.value,WHY_CI);
 assertWhys(JSON.stringify(story.threeWhys));assertWhys(web(story));assertWhys(proposalBuilder.buildProposalOutputHtml({story,proposal,audience:'internal',draft:true,brand:{logo:()=>'',audience:()=> 'Internal Use Only'},economicAvailability:economic}));
 assertWhys(buildExecutivePdf(report,{internalDraft:true}).toString('latin1'),{pdf:true});
 assertWhys(buildProposalPdf({story,proposal,audience:'internal',draft:true}).toString('latin1'),{pdf:true});
 assertWhys(await allXml(await buildExecutiveDocx(report,{internalDraft:true})));
 assertWhys(await allXml(await buildExecutivePptx(report,{internalDraft:true})));
 assertWhys(await allXml(await buildProposalDocx({story,proposal,audience:'internal',draft:true,logoData:fs.readFileSync(path.join(root,'public',brand.documentTheme('internal').logo))})));
 for(const missing of ['whyChange','whyNow','whyCloudInventory']){const data=persistExecutiveNarrative(src.scenario.data,{whyChange:missing==='whyChange'?'':WHY_CHANGE,whyNow:missing==='whyNow'?'':WHY_NOW,whyCloudInventory:missing==='whyCloudInventory'?'':WHY_CI},{}),partial=buildExecutiveValueStory({...src,scenario:{...src.scenario,data}});assert.equal(partial.threeWhys[missing].value,'To validate');for(const key of ['whyChange','whyNow','whyCloudInventory'].filter(key=>key!==missing))assert.notEqual(partial.threeWhys[key].value,'To validate');}
});

test('REG-6945-02 package catalog identity excludes governed package rows but preserves true custom rows',()=>{
 const descriptor={product:'MEP',erp:'JDE',group:'JDE',name:'Inventory Transfer',source:'standard_app'},saved={...descriptor,id:SF.governedProcessId(descriptor),selected:true};
 assert.equal(SF.catalogIdentity(descriptor),SF.catalogIdentity(saved));
 assert.notEqual(SF.catalogIdentity(descriptor),SF.catalogIdentity({...descriptor,id:'APP-CUSTOM-000001',source:'non_standard'}));
 const packageRows=Array.from({length:15},(_,i)=>({product:'MEP',erp:'JDE',group:'JDE',name:`Package ${i}`,source:'standard_app'}));
 const stored=packageRows.map(row=>({...row,id:SF.governedProcessId(row),selected:true}));
 const catalogKeys=new Set(packageRows.map(SF.catalogIdentity));
 assert.equal(stored.filter(row=>!catalogKeys.has(SF.catalogIdentity(row))).length,0);
 const custom=[1,2].map(i=>({id:`APP-CUSTOM-00000${i}`,product:'MEP',erp:'JDE',group:'Customer-specific',name:`Custom ${i}`,source:'non_standard',selected:true}));
 assert.equal([...stored,...custom].filter(row=>!catalogKeys.has(SF.catalogIdentity(row))).length,2);
 const reloaded=SF.migrateState(JSON.parse(JSON.stringify({opportunity:{products:['MEP']},solutionScope:{primaryProduct:'MEP',additionalProducts:[],erp:'JDE'},architecture:{erp:'JDE'},processes:[...stored,...custom],gaps:[],inventory:{},turnover:{}})));assert.equal(reloaded.processes.filter(row=>!catalogKeys.has(SF.catalogIdentity(row))).length,2);assert.equal(SF.activeProcesses(reloaded).length,17);
});

test('REG-6945-03 governed question IDs reconcile for Field Inventory on and off',()=>{
 for(const industry of ['mfg','default'])for(const hasFieldInventory of [false,true]){
  const canonical=getQuestionnaire(industry,{hasFieldInventory}).flatMap(section=>section.questions.map(q=>q.id));
  const prospect=[...canonical],discovery=[...canonical],impact=impactQuestionIds(industry,hasFieldInventory);
  assert.deepEqual(discovery,prospect);assert.deepEqual(impact,prospect);
  assert.equal(canonical.some(id=>id.startsWith('fi')),hasFieldInventory);
 }
 assert.equal(getQuestionnaire('mfg',{hasFieldInventory:true}).flatMap(s=>s.questions).length,39);
 const discoverySource=read('public/discovery.js'),impactSource=read('public/impact-map.js');
 assert.match(discoverySource,/renderDiscoveryTab[\s\S]*getApplicableQuestionnaire\(industry, \{hasFieldInventory/);
 assert.match(impactSource,/getApplicableQuestionnaire\(ind,\{hasFieldInventory\}\)/);
});

test('REG-6945-04 completed evidence leaves the local queue and cannot be uploaded again',()=>{
 const revoked=[],browser=require('../public/solution-fit-evidence').createForRoot({URL:{revokeObjectURL:url=>revoked.push(url)}}),queue=[{state:'Complete',previewUrl:'a'},{state:'Failed',previewUrl:'b'},{state:'Complete',previewUrl:'c'}];
 const remaining=browser.reconcileCompletedQueue(queue);
 assert.deepEqual(remaining.map(x=>x.state),['Failed']);assert.deepEqual(revoked,['a','c']);assert.equal(browser.hasUploadableQueue(remaining),true);assert.equal(browser.hasUploadableQueue([]),false);
 const item={state:'Uploading'},attachments=[],payload={attachment:{id:'active-1',status:'ACTIVE',originalFilename:'proof.png'}};browser.acceptCompletedAttachment(item,payload,attachments);browser.acceptCompletedAttachment(item,payload,attachments);assert.equal(item.state,'Complete');assert.equal(attachments.length,1);assert.equal(browser.hasUploadableQueue([item]),false);
 const route=read('src/routes/solution-fit-attachments.js');assert.match(route,/row\.status === 'ACTIVE'[\s\S]*idempotent: true/);assert.match(route,/status='ACTIVE'.*removed_at IS NULL/);
});

test('REG-6945-05 legacy scenario financial summary preserves authoritative values and null semantics',()=>{
 const legacy=scenarioFinancialSummary({currency:'USD',annualBenefit:21200000,contractTermMonths:36,roi:810,npv5:40348000,netBenefit:31800000,paybackFromSigning:8,invest:900000},{scenarioVersion:2});
 assert.deepEqual({term:legacy.contractTermMonths,roi:legacy.contractROI,npv:legacy.NPV,net:legacy.netEconomicBenefit,payback:legacy.paybackMonths},{term:36,roi:810,npv:40348000,net:31800000,payback:8});
 const absent=scenarioFinancialSummary({annualBenefit:0});assert.equal(absent.annualCustomerBenefit,0);assert.equal(absent.contractROI,null);assert.equal(absent.NPV,null);assert.equal(absent.paybackMonths,null);
 const routes=read('src/routes/scenarios.js'),app=read('public/app.js');assert.match(routes,/scenarioFinancialSummary\(financialSource/);assert.doesNotMatch(app,/annualBenefit:\s*parseFloat\(r\.annual_benefit\)\s*\|\|\s*0/);
});

test('canonical null economics remain unavailable even when legacy aliases have values',()=>{
 const {projectScenarioData}=require('../src/shared/scenario-roi-projection');
 const data=projectScenarioData({users:10,labor:50000,laborWastePct:.5,mLabor:.4,invest:20000,psvc:100000,contractMonths:12,implMonths:6});
 assert.equal(data.contractPayback,null);
 assert.equal(data.paybackFromSigning,24);
 assert.equal(scenarioFinancialSummary(data).paybackMonths,null);
 const summary=scenarioFinancialSummary({totalContractRoi:null,roi:100,totalContractNpv:null,npv5:1000,annualBenefit:null,annualCustomerBenefit:100});
 assert.equal(summary.contractROI,null);assert.equal(summary.NPV,null);assert.equal(summary.annualCustomerBenefit,null);
 assert.equal(scenarioFinancialSummary({paybackFromSigning:24}).paybackMonths,24);
});

test('REG-6945-06 structured application labels remove only duplicate semantic tokens',()=>{
 assert.equal(SF.formatApplicationContext({product:'MEP',erp:'JDE',group:'JDE',name:'Inventory Transfer'}),'MEP · JDE · Inventory Transfer');
 assert.equal(SF.formatApplicationContext({product:'MEP',erp:'SAP',group:'Standard Package',name:'Inventory Transfer'}),'MEP · SAP · Standard Package · Inventory Transfer');
 assert.equal(SF.formatApplicationContext({product:'MEP',erp:'Oracle EBS',group:'Customer-specific',name:'Oracle EBS Transfer'}),'MEP · Oracle EBS · Customer-specific · Oracle EBS Transfer');
 assert.equal(SF.formatApplicationContext({product:'CIP',group:'Mobile inventory',name:'Inventory Transfer'}),'CIP · Mobile inventory · Inventory Transfer');
 assert.equal(SF.formatApplicationContext({product:'EPP',group:'Templates',name:'Label templates'}),'EPP · Templates · Label templates');
});

test('REG-6945-D1 Deal Coach timeout keeps deterministic fallback and always exits loading',async()=>{
 const elements={
  christieQuestion:{value:''},
  christieResponse:{innerHTML:''},
  christieAskBtn:{disabled:false,textContent:'Ask Christie'},
  why_act:{value:'Why change'},why_ci:{value:'Why Cloud Inventory'},why_now:{value:'Why now'}
 },saved={history:[],lastResponse:''};
 const window={_calcScenarioId:'scenario-6946',_calcLoadedScenarioMeta:{baseId:'base-6946'},proposalDraft:null,CIAIState:{load:()=>saved,save:(_kind,value)=>Object.assign(saved,value)},CIWorkspaceContext:{capture:()=>({id:'workspace'}),isCurrent:()=>true}};
 const context={window,document:{getElementById:id=>elements[id]||null,querySelector:()=>null,body:{insertAdjacentHTML(){}}},localStorage:{getItem:()=>null},navigator:{clipboard:{writeText:async()=>{}}},AbortController,Date,Intl,Number,Math,Promise,JSON,console:{error(){},warn(){},log(){}},getVals:()=>({company:'QA Customer',contractMonths:36}),calcROI:()=>({contractMonths:36,totalContractBenefit:0,totalContractInvestment:0,totalContractNetBenefit:0,totalContractNpv:0,totalContractRoi:null,contractPayback:null}),apiFetch:async(_path,options)=>{const error=new Error('timed out');error.name=options.signal?.aborted?'AbortError':'Error';throw error;},showToast(){},switchTab(){},openProposal(){},setTimeout:callback=>{callback();return 1;},clearTimeout(){}};
 Object.assign(context,window);vm.createContext(context);vm.runInContext(read('public/deal-coach.js'),context);
 await window.askChristie('Assess this opportunity');
 assert.equal(elements.christieAskBtn.disabled,false);assert.equal(elements.christieAskBtn.textContent,'Ask Christie');
 assert.match(elements.christieResponse.innerHTML,/Live AI coaching timed out/);assert.match(elements.christieResponse.innerHTML,/governed evidence assessment/);
 assert.equal(saved.lastResponse,'Save this ROI scenario to activate the evidence-based assessment.');
});
