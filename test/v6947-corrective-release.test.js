'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),JSZip=require('jszip');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {persistExecutiveNarrative,resolveExecutiveNarrative}=require('../src/shared/executive-narrative');
const {buildExecutiveValueStory}=require('../src/shared/executive-value-story');
const SF=require('../public/solution-fit-state');
const presentation=require('../public/solution-fit-presentation');
const {buildCustomerROIReportData}=require('../src/shared/customer-roi-report');
const {buildExecutivePdf}=require('../src/exports/executive-pdf');
const {buildExecutiveDocx}=require('../src/exports/executive-docx');
const {buildExecutivePptx}=require('../src/exports/executive-pptx');
const {buildProposalPdf}=require('../src/exports/proposal-pdf');
const {buildProposalDocx}=require('../src/exports/proposal-docx');
const proposalBuilder=require('../public/proposal-output-builder'),economic=require('../public/economic-availability'),brand=require('../src/shared/brand-system');

const values={threeWhysAct:'A — reduce inventory friction',threeWhysNow:'B — act before renewal',threeWhysCi:'C — validated platform alignment'};
const keys={threeWhysAct:'whyChange',threeWhysNow:'whyNow',threeWhysCi:'whyCloudInventory'};
const source=data=>({scenario:{id:'scenario-6947',base_id:'base-6947',version:7,company:'QA Customer',solution:'CIP',data:{modelVersion:28,currency:'USD',...data}},discovery:[{question_id:'ve5',answer:values.threeWhysAct,entered_by:'prospect_submission'},{question_id:'ve2',answer:values.threeWhysNow,entered_by:'prospect_submission'}]});
const allXml=async buffer=>{const zip=await JSZip.loadAsync(buffer),names=Object.keys(zip.files).filter(name=>/\.xml$/.test(name));return(await Promise.all(names.map(name=>zip.file(name).async('string')))).join('\n');};
function executiveWeb(story){const window={CIProposalOutputBuilder:proposalBuilder,CIEconomicAvailability:economic,CIBrand:{logo:()=>'',audience:a=>a==='internal'?'Internal Use Only':'Confidential and Proprietary'}};const context={window,document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),body:{prepend(){}}},Date,Intl,Number,Math,Promise,URL,Blob,setTimeout,clearTimeout,console,showToast(){},showExecutiveValueStoryUnavailable(){}};vm.createContext(context);vm.runInContext(read('public/executive-output-adapters.js'),context);return window.renderExecutiveStoryDocument(story,{audience:'internal',draft:true});}

test('REG-6947-01 absent, populated, cleared and restored narrative states remain independent',()=>{
 let data=persistExecutiveNarrative({},values,{});
 for(const [legacy,canonical] of Object.entries(keys)){
  const cleared=persistExecutiveNarrative(data,{[legacy]:null},{[canonical]:{source:'customer_discovery'}});
  assert.equal(cleared.executiveNarrative.threeWhys[canonical].value,null,`${canonical} canonical clear`);
  assert.equal(cleared[legacy],null,`${legacy} compatibility mirror clear`);
  const withStaleLegacy={...cleared,[legacy]:'STALE LEGACY VALUE'};
  const resolved=resolveExecutiveNarrative(withStaleLegacy);
  assert.equal(resolved[canonical].value,'');assert.equal(resolved[canonical].explicitlyCleared,true);
  const story=buildExecutiveValueStory(source(withStaleLegacy));
  assert.equal(story.threeWhys[canonical].value,'To validate');
  for(const sibling of Object.values(keys).filter(key=>key!==canonical))assert.notEqual(story.threeWhys[sibling].value,'To validate');
  const restored=persistExecutiveNarrative(cleared,{[legacy]:`RESTORED ${canonical}`},{});
  assert.equal(resolveExecutiveNarrative(restored)[canonical].value,`RESTORED ${canonical}`);
 }
 const partial=persistExecutiveNarrative(data,{threeWhysAct:'A2'},{});
 assert.deepEqual([partial.threeWhysAct,partial.threeWhysNow,partial.threeWhysCi],['A2',values.threeWhysNow,values.threeWhysCi]);
 const empty=persistExecutiveNarrative(data,{threeWhysNow:''},{});
 assert.equal(empty.executiveNarrative.threeWhys.whyNow.value,null);
});

test('REG-6947-02 real narrative route preserves omitted siblings and returns authoritative canonical state',()=>{
 const route=read('src/routes/scenarios.js'),client=read('public/narrative.js'),scenarioSave=read('public/app.js');
 assert.match(route,/hasOwnProperty\.call\(body,field\)/);
 assert.match(route,/SELECT id,base_id,data FROM scenarios/);
 assert.match(route,/persistExecutiveNarrative\(target\.rows\[0\]\.data\|\|\{\},narrative/);
 assert.match(route,/RETURNING s\.id, s\.updated_at, s\.data/);
 assert.match(route,/executiveNarrative:rows\[0\]\.data\?\.executiveNarrative/);
 assert.match(client,/threeWhys\.now=clean\(result\.threeWhysNow\)/);
 assert.doesNotMatch(scenarioSave,/why_now'\)\?\.value\s*\|\|/);
});

test('REG-6947-02A cleared narrative has identical semantics in every Executive and Proposal format',async()=>{
 const cleared=persistExecutiveNarrative({},values,{}),data=persistExecutiveNarrative(cleared,{threeWhysNow:null},{}),src={...source(data),governance:{evidence:{}},stakeholders:[],solutionFit:null,jointProjectPlan:null,proposal:{title:'QA Proposal',situation:'Current state',recommendation:'Proceed'},valueHistory:[]};
 const story=buildExecutiveValueStory(src),report=buildCustomerROIReportData(src),proposal=src.proposal;
 assert.equal(story.threeWhys.whyChange.value,values.threeWhysAct);assert.equal(story.threeWhys.whyNow.value,'To validate');assert.equal(story.threeWhys.whyCloudInventory.value,values.threeWhysCi);
 const textOutputs=[executiveWeb(story),proposalBuilder.buildProposalOutputHtml({story,proposal,audience:'internal',draft:true,brand:{logo:()=>'',audience:()=> 'Internal Use Only'},economicAvailability:economic}),buildExecutivePdf(report,{internalDraft:true}).toString('latin1'),buildProposalPdf({story,proposal,audience:'internal',draft:true}).toString('latin1')];
 for(const output of textOutputs){assert.match(output,/To validate/);assert.match(output,/reduce inventory friction/);assert.match(output,/validated platform alignment/);assert.doesNotMatch(output,/act before renewal/);}
 const xmlOutputs=[await allXml(await buildExecutiveDocx(report,{internalDraft:true})),await allXml(await buildExecutivePptx(report,{internalDraft:true})),await allXml(await buildProposalDocx({story,proposal,audience:'internal',draft:true,logoData:fs.readFileSync(path.join(root,'public',brand.documentTheme('internal').logo))}))];
 for(const output of xmlOutputs){assert.match(output,/To validate/);assert.match(output,/reduce inventory friction/);assert.match(output,/validated platform alignment/);assert.doesNotMatch(output,/act before renewal/);}
});

test('REG-6947-03 custom application modal replaces prompt and preserves stable non-standard identity',()=>{
 const ui=read('public/solution-fit.js');
 assert.doesNotMatch(ui,/\bprompt\s*\(/);
 assert.match(ui,/overlay\.id='sfCustomApplicationDialog'/);
 assert.match(ui,/Application name is required/);
 assert.match(ui,/customApplicationSubmitting/);
 assert.match(ui,/source:'non_standard'/);
 assert.match(ui,/const saved=await saveHandoff\(\)/);
 const state={opportunity:{products:['MEP']},solutionScope:{primaryProduct:'MEP',additionalProducts:[],erp:'JDE'},architecture:{erp:'JDE'},processes:[],gaps:[],inventoryConfiguration:{},turnover:{}};
 const standard=Array.from({length:15},(_,index)=>({product:'MEP',erp:'JDE',group:'JDE',name:`Package ${index+1}`,source:'standard_app'}));
 standard.forEach(item=>SF.setSelected(state,item,true));
 const one=SF.createCustomProcess(state,{product:'MEP',erp:'JDE',name:' QA Custom Application One ',selected:true});
 const two=SF.createCustomProcess(state,{product:'MEP',erp:'JDE',name:'QA Custom Application Two',selected:true});
 one.demoStatus='Demonstrated';one.fit='Full fit';one.customerValidation='Customer validated';one.notes='Validated with customer.';
 const reloaded=SF.migrateState(JSON.parse(JSON.stringify(state)));
 assert.equal(SF.activeProcesses(reloaded).length,17);
 assert.equal(new Set(SF.activeProcesses(reloaded).map(item=>item.id)).size,17);
 assert.equal(reloaded.processes.filter(item=>item.source==='standard_app').length,15);
 assert.equal(reloaded.processes.filter(item=>item.source==='non_standard').length,2);
 assert.equal(reloaded.processes.find(item=>item.id===one.id).notes,'Validated with customer.');
 assert.notEqual(one.id,two.id);
 assert.equal(presentation.normalizeCustomApplicationName('  Custom App  '),'Custom App');
});

test('REG-6947-04 assigned Primary SE remains visible when absent from viewer-selectable options',()=>{
 const candidates=[{id:'se-a',name:'SE-A'},{id:'se-b',name:'SE-B'}];
 const isolated=presentation.primarySePresentation({candidates,primarySeId:'se-a',primarySeName:'SE-A',viewerId:'se-b',canAssignOthers:false});
 assert.deepEqual(isolated.assignable,[candidates[1]]);assert.equal(isolated.includeCurrentAssignment,true);assert.equal(isolated.assignmentLocked,true);assert.equal(isolated.assignedName,'SE-A');
 const self=presentation.primarySePresentation({candidates,primarySeId:'se-a',primarySeName:'SE-A',viewerId:'se-a',canAssignOthers:false});
 assert.equal(self.includeCurrentAssignment,false);assert.equal(self.assignmentLocked,false);
 const admin=presentation.primarySePresentation({candidates,primarySeId:'se-a',primarySeName:'SE-A',viewerId:'admin',canAssignOthers:true});
 assert.equal(admin.includeCurrentAssignment,false);assert.equal(admin.assignmentLocked,false);
 const unassigned=presentation.primarySePresentation({candidates,primarySeId:null,primarySeName:'',viewerId:'se-b',canAssignOthers:false});
 assert.equal(unassigned.includeCurrentAssignment,false);assert.equal(unassigned.assignedId,'');
 const inactive=presentation.primarySePresentation({candidates:[candidates[1]],primarySeId:'se-a',primarySeName:'SE-A',viewerId:'se-b',canAssignOthers:false});
 assert.equal(inactive.includeCurrentAssignment,true);assert.equal(inactive.assignedName,'SE-A');
 const ui=read('public/solution-fit.js'),route=read('src/routes/handoffs.js');
 assert.match(ui,/primarySeName\|\|'Assigned user unavailable'/);assert.match(route,/LEFT JOIN users pse ON pse\.id=h\.primary_se_id/);
 assert.match(route,/primarySeName:h\.primary_se_name\|\|''/);
});

test('REG-6947-05 corrective scope preserves ROI, evidence and authorization authorities',()=>{
 const pkg=require('../package.json');assert.equal(pkg.version,'6.9.47');
 assert.equal(require('../release-lineage.json').roiModelVersion,28);
 const handoffRoutes=read('src/routes/handoffs.js'),solution=read('public/solution-fit.js');
 assert.match(handoffRoutes,/solutionFitAccess\(user,customerId,mode==='write'\?'edit':'view'\)/);
 assert.doesNotMatch(solution,/localStorage\s*\./);
});
