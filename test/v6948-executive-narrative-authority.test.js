'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),JSZip=require('jszip');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {persistExecutiveNarrative}=require('../src/shared/executive-narrative');
const {buildExecutiveOutputModel}=require('../src/shared/executive-output-model');
const {buildCustomerROIReportData}=require('../src/shared/customer-roi-report');
const {buildExecutivePdf}=require('../src/exports/executive-pdf');
const {buildExecutiveDocx}=require('../src/exports/executive-docx');
const {buildExecutivePptx}=require('../src/exports/executive-pptx');
const {buildProposalPdf}=require('../src/exports/proposal-pdf');
const {buildProposalDocx}=require('../src/exports/proposal-docx');
const proposalBuilder=require('../public/proposal-output-builder'),economic=require('../public/economic-availability'),brand=require('../src/shared/brand-system');

const baseValues={threeWhysAct:'A — current-state problem',threeWhysNow:'B — dated trigger',threeWhysCi:'C — solution alignment'};
function source(data={},id='scenario-6948'){
 return {scenario:{id,base_id:'base-6948',version:8,updated_at:'2026-10-25T12:00:00.000Z',company:'Authority QA',solution:'CIP',owner_username:'qa_rep',data:{modelVersion:28,currency:'USD',contractMonths:36,invest:100000,revenue:50000000,...data}},governance:{evidence:{}},stakeholders:[],discovery:[],solutionFit:null,jointProjectPlan:null,proposal:{title:'Authority proposal',situation:'Current state',recommendation:'Proceed'},valueHistory:[]};
}
const allXml=async buffer=>{const zip=await JSZip.loadAsync(buffer),names=Object.keys(zip.files).filter(name=>/\.xml$/.test(name));return(await Promise.all(names.map(name=>zip.file(name).async('string')))).join('\n');};

test('REG-6948-01 server model distinguishes omitted, set, explicit clear, restore and stale legacy in twelve authority cases',()=>{
 const populated=persistExecutiveNarrative({},baseValues,{});
 const cases=[
  ['legacy-only',{...baseValues},['A — current-state problem','B — dated trigger','C — solution alignment'],[false,false,false]],
  ['canonical-populated',populated,['A — current-state problem','B — dated trigger','C — solution alignment'],[false,false,false]],
  ['clear-change',persistExecutiveNarrative(populated,{threeWhysAct:null},{}),[null,'B — dated trigger','C — solution alignment'],[true,false,false]],
  ['clear-now',persistExecutiveNarrative(populated,{threeWhysNow:''},{}),['A — current-state problem',null,'C — solution alignment'],[false,true,false]],
  ['clear-solution',persistExecutiveNarrative(populated,{threeWhysCi:null},{}),['A — current-state problem','B — dated trigger',null],[false,false,true]],
  ['partial-update',persistExecutiveNarrative(populated,{threeWhysAct:'A2'},{}),['A2','B — dated trigger','C — solution alignment'],[false,false,false]],
  ['restore-after-clear',persistExecutiveNarrative(persistExecutiveNarrative(populated,{threeWhysNow:null},{}),{threeWhysNow:'B2'},{}),['A — current-state problem','B2','C — solution alignment'],[false,false,false]],
  ['stale-legacy-after-clear',{...persistExecutiveNarrative(populated,{threeWhysNow:null},{}),threeWhysNow:'STALE B'},['A — current-state problem',null,'C — solution alignment'],[false,true,false]],
  ['canonical-string',{...baseValues,executiveNarrative:{schemaVersion:1,threeWhys:{whyNow:'B3'}}},['A — current-state problem','B3','C — solution alignment'],[false,false,false]],
  ['canonical-null-object',{...baseValues,executiveNarrative:{schemaVersion:1,threeWhys:{whyNow:{value:null,meta:{source:'empty'}}}}},['A — current-state problem',null,'C — solution alignment'],[false,true,false]],
  ['whitespace-clear',persistExecutiveNarrative(populated,{threeWhysCi:'   '},{}),['A — current-state problem','B — dated trigger',null],[false,false,true]],
  ['omitted-sibling',persistExecutiveNarrative(populated,{threeWhysNow:'B4'},{}),['A — current-state problem','B4','C — solution alignment'],[false,false,false]]
 ];
 for(const [name,data,expected,cleared] of cases){const model=buildExecutiveOutputModel(source(data),{outputType:'executive_view'}),items=['whyChange','whyNow','whyCloudInventory'].map(key=>model.canonicalNarrative[key]);assert.deepEqual(items.map(item=>item.value),expected,name);assert.deepEqual(items.map(item=>item.explicitlyCleared),cleared,name);assert.equal(model.revision.scenarioId,'scenario-6948');assert.ok(model.revision.narrativeRevision);assert.ok(model.revision.modelRevision);assert.equal(model.readiness.storyRevision,model.story.storyRevision);}
});

test('REG-6948-02 Executive Web has one server-model request and no browser narrative authority',()=>{
 const adapter=read('public/executive-output-adapters.js'),story=read('public/executive-story.js'),narrative=read('public/narrative.js'),index=read('public/index.html');
 assert.match(adapter,/loadExecutiveOutputModel\('executive_view'\)/);
 assert.doesNotMatch(adapter,/persistThreeWhys/);
 assert.doesNotMatch(adapter,/Promise\.all\(\[window\.loadExecutiveValueStory/);
 assert.match(story,/cache:'no-store'/);assert.match(story,/requestNumber!==requestGeneration/);assert.match(story,/activeController\?\.abort/);
 assert.doesNotMatch(narrative,/initializeThreeWhysFromEvidence/);
 const wrapper=index.slice(index.indexOf('window.switchTab = function'),index.indexOf('function _showUnsavedBanner'));
 assert.doesNotMatch(wrapper,/initializeThreeWhysFromEvidence/);assert.doesNotMatch(wrapper,/window\.renderExec/);
 assert.match(narrative,/saveGeneration===threeWhysEditGeneration/);assert.match(narrative,/notifyExecutiveNarrativeSaved/);
});

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function browserModel(scenarioId,value,revision){return{revision:{scenarioId,scenarioVersion:8,narrativeRevision:'n-'+revision,modelRevision:'m-'+revision,storyRevision:'s-'+revision},canonicalNarrative:{},story:{meta:{scenarioId},storyRevision:'s-'+revision,threeWhys:{whyNow:{value}}},readiness:{status:'ready',label:'Ready to Share',blockers:[],warnings:[],strengths:[],storyRevision:'s-'+revision}};}
function executiveBrowserRuntime(responses=[]){
 const listeners={},document={visibilityState:'visible',getElementById:()=>null,addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const context={document,console,setTimeout,clearTimeout,AbortController,Date,Promise,Error,String,encodeURIComponent,apiFetch:()=>{const next=responses.shift();if(next instanceof Error)return Promise.reject(next);return next?.promise||Promise.resolve(next);},showToast(){}};
 context.window=context;context._calcScenarioId='A';context.addEventListener=(name,fn)=>{listeners[name]=fn;};context.CIWorkspaceContext={capture:()=>({scenarioId:context._calcScenarioId}),isCurrent:token=>token.scenarioId===context._calcScenarioId};vm.createContext(context);vm.runInContext(read('public/executive-story.js'),context);return{context,listeners};
}
const response=model=>({ok:true,json:async()=>model});

test('REG-6948-03 same-scenario out-of-order response is discarded and cannot overwrite the accepted model',async()=>{
 const old=deferred(),fresh=deferred(),{context}=executiveBrowserRuntime([old,fresh]);
 const oldLoad=context.loadExecutiveOutputModel('executive_view');const oldHandled=oldLoad.catch(error=>error);
 const freshLoad=context.loadExecutiveOutputModel('executive_view');fresh.resolve(response(browserModel('A','NEW',2)));const accepted=await freshLoad;old.resolve(response(browserModel('A','OLD',1)));const discarded=await oldHandled;
 assert.equal(accepted.story.threeWhys.whyNow.value,'NEW');assert.equal(context.executiveValueStory.threeWhys.whyNow.value,'NEW');assert.equal(discarded.code,'STALE_WORKSPACE');
});

test('REG-6948-04 scenario switch, network failure, BFCache and multi-tab invalidation fail closed',async()=>{
 const switched=deferred(),runtime=executiveBrowserRuntime([switched]),pending=runtime.context.loadExecutiveOutputModel('executive_view').catch(error=>error);runtime.context._calcScenarioId='B';switched.resolve(response(browserModel('A','WRONG CUSTOMER',1)));assert.equal((await pending).code,'STALE_WORKSPACE');assert.equal(runtime.context.executiveValueStory,null);
 const failed=executiveBrowserRuntime([new Error('offline')]);await assert.rejects(failed.context.loadExecutiveOutputModel('executive_view'),/offline/);assert.equal(failed.context.executiveValueStory,null);
 let renders=0;failed.context._calcScenarioId='A';failed.context.document.getElementById=id=>id==='tab-exec'?{classList:{contains:()=>true}}:null;failed.context.renderExec=()=>{renders++;};failed.listeners.pageshow({persisted:true});assert.equal(renders,1,'BFCache revalidates');
 const channels=[];class FakeChannel{constructor(){channels.push(this);}postMessage(){} }const notifyContext={...failed.context,BroadcastChannel:FakeChannel};notifyContext.window=notifyContext;vm.createContext(notifyContext);vm.runInContext(read('public/executive-story.js'),notifyContext);notifyContext.renderExec=()=>{renders++;};channels.at(-1).onmessage({data:{scenarioId:'A',narrativeRevision:'different'}});assert.equal(renders,2,'cross-tab revision revalidates');
});

test('REG-6948-05 cleared canonical narrative is identical in Web, PDF, DOCX, PPTX and Proposal outputs',async()=>{
 const data=persistExecutiveNarrative(persistExecutiveNarrative({},baseValues,{}),{threeWhysNow:null},{}),src=source(data),model=buildExecutiveOutputModel(src,{outputType:'executive_view'}),story=model.story,report=buildCustomerROIReportData(src,{story}),proposal=src.proposal;
 const web=proposalBuilder.buildProposalOutputHtml({story,proposal,audience:'internal',draft:true,brand:{logo:()=>'',audience:()=> 'Internal Use Only'},economicAvailability:economic});
 const text=[web,buildExecutivePdf(report,{internalDraft:true}).toString('latin1'),buildProposalPdf({story,proposal,audience:'internal',draft:true}).toString('latin1')];
 const xml=[await allXml(await buildExecutiveDocx(report,{internalDraft:true})),await allXml(await buildExecutivePptx(report,{internalDraft:true})),await allXml(await buildProposalDocx({story,proposal,audience:'internal',draft:true,logoData:fs.readFileSync(path.join(root,'public',brand.documentTheme('internal').logo))}))];
 for(const output of [...text,...xml]){assert.match(output,/To validate/);assert.doesNotMatch(output,/dated trigger/);assert.match(output,/current-state problem/);assert.match(output,/solution alignment/);}
});

test('REG-6948-05B restored canonical narrative is identical in Web, PDF, DOCX, PPTX and Proposal outputs',async()=>{
 const cleared=persistExecutiveNarrative(persistExecutiveNarrative({},baseValues,{}),{threeWhysNow:null},{}),data=persistExecutiveNarrative(cleared,{threeWhysNow:'B2 — restored dated trigger'},{}),src=source(data),model=buildExecutiveOutputModel(src,{outputType:'executive_view'}),story=model.story,report=buildCustomerROIReportData(src,{story}),proposal=src.proposal;
 const web=proposalBuilder.buildProposalOutputHtml({story,proposal,audience:'internal',draft:true,brand:{logo:()=>'',audience:()=> 'Internal Use Only'},economicAvailability:economic});
 const text=[web,buildExecutivePdf(report,{internalDraft:true}).toString('latin1'),buildProposalPdf({story,proposal,audience:'internal',draft:true}).toString('latin1')];
 const xml=[await allXml(await buildExecutiveDocx(report,{internalDraft:true})),await allXml(await buildExecutivePptx(report,{internalDraft:true})),await allXml(await buildProposalDocx({story,proposal,audience:'internal',draft:true,logoData:fs.readFileSync(path.join(root,'public',brand.documentTheme('internal').logo))}))];
 for(const output of [...text,...xml]){assert.match(output,/B2 (?:—|-) restored dated trigger/);assert.doesNotMatch(output,/B (?:—|-) dated trigger/);}
});

test('REG-6948-06 endpoint, save reconciliation and compatibility contracts are permanent',()=>{
 const routes=read('src/routes/scenarios.js'),sourceLoader=read('src/shared/executive-source.js'),proposal=read('src/exports/proposal-export-service.js');
 assert.match(routes,/router\.get\('\/:id\/executive-output-model'/);assert.match(routes,/private, no-store, max-age=0/);assert.match(routes,/X-Executive-Model-Revision/);
 assert.match(routes,/modelRevision:outputModel\.revision\.modelRevision/);assert.match(routes,/canonicalNarrative:outputModel\.canonicalNarrative/);
 assert.match(sourceLoader,/buildExecutiveOutputModel/);assert.match(sourceLoader,/buildCustomerROIReportData\(source,\{story:outputModel\.story\}\)/);assert.match(proposal,/buildExecutiveOutputModel/);
 assert.equal(require('../package.json').version,'6.9.48');assert.equal(require('../release-lineage.json').roiModelVersion,28);
});
