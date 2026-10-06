'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {prepareProposalExport}=require('../src/exports/proposal-export-service');
const {buildProposalPdf,buildProposalPdfResponse}=require('../src/exports/proposal-pdf');

const root=path.join(__dirname,'..');
const adapterSource=fs.readFileSync(path.join(root,'public','executive-output-adapters.js'),'utf8');

function source({currency='GBP',proposalOverrides={},dataOverrides={}}={}){
 return {
  scenario:{id:'s1',base_id:'b1',version:3,customer_id:'c1',company:'Acme Manufacturing International',industry:'Manufacturing',solution:'cip',owner_username:'Pat',data:{currency,contractMonths:36,invest:100000,users:12,labor:50000,mLabor:.2,threeWhysAct:'Confirmed inventory issue',threeWhysNow:'Confirmed operational deadline',threeWhysCi:'Reviewed Cloud Inventory position',threeWhysMeta:{whyChange:{source:'customer_validated'},whyNow:{source:'customer_validated'},whyCloudInventory:{source:'customer_validated'}},modelVersion:28,...dataOverrides}},
  governance:{evidence:{}},stakeholders:[],discovery:[],solutionFit:null,jointProjectPlan:{milestones:[{title:'Validate case',owner:'joint',dueDate:'2026-11-01',status:'pending'}]},
  proposal:{title:'Acme Executive Proposal',situation:'Current inventory processes create avoidable cost.',recommendation:'Adopt Cloud Inventory.',commercialTerms:'Internal alternate pricing must never render.',...proposalOverrides},valueHistory:[]
 };
}

function createAdapterHarness({fetchMode='success'}={}){
 let guardResolve,guardCalls=0,fetchCalls=0,downloadClicks=0;
 const timers=[],toasts=[],errors=[];
 const controls=new Map();
 const control=id=>{if(!controls.has(id))controls.set(id,{id,innerHTML:id==='proposalPdfBtn'?'Download PDF':'Export Word',textContent:'',disabled:false,dataset:{},setAttribute(){},removeAttribute(){},remove(){}});return controls.get(id);};
 const document={
  body:{appendChild(){},prepend(){}},
  getElementById(id){return ['proposalPdfBtn','proposalWordBtn'].includes(id)?control(id):null;},
  querySelector(){return null;},
  createElement(tag){if(tag==='a')return{style:{},click(){downloadClicks+=1;},remove(){}};const retry={};return{id:'',className:'',innerHTML:'',querySelector(){return retry;},remove(){}};}
 };
 const window={_calcScenarioId:'scenario-1',CIEconomicAvailability:{hasEconomicValue:()=>false,percent:()=>'N/A',paybackLabel:()=>'N/A'},CIBrand:{logo:()=>'',audience:()=>''},CIProposalOutputBuilder:{buildProposalOutputHtml:()=>''},flushProposalSave:async()=>true,getProposalOutputState:()=>({saveFailed:false,conflict:false,dirty:false}),executiveValueStory:{meta:{customer:'Acme'}},URL:{createObjectURL:()=>'blob:test',revokeObjectURL(){}},logClientError(){}};
 const context={window,document,Blob,AbortController,URL:window.URL,Promise,Date,CustomEvent:function(){},console:{info(){},warn(){},error(event,detail){errors.push({event,message:detail?.message});}},showToast(message){toasts.push(message);},guardExecutiveOutput(){guardCalls+=1;return new Promise(resolve=>{guardResolve=resolve;});},setTimeout(callback,delay){const timer={id:timers.length+1,callback,delay,cleared:false};timers.push(timer);return timer.id;},clearTimeout(id){const timer=timers.find(item=>item.id===id);if(timer)timer.cleared=true;},fetch(_url,options={}){fetchCalls+=1;if(fetchMode==='pending')return new Promise(()=>{});if(options.signal?.aborted)return Promise.reject(Object.assign(new Error('aborted'),{name:'AbortError'}));return Promise.resolve({ok:true,blob:async()=>new Blob(['%PDF diagnostic'])});}};
 window.guardExecutiveOutput=context.guardExecutiveOutput;
 context.globalThis=context;
 vm.createContext(context);
 vm.runInContext(adapterSource,context,{filename:'public/executive-output-adapters.js'});
 return{window,control,timers,toasts,errors,get guardCalls(){return guardCalls;},get fetchCalls(){return fetchCalls;},get downloadClicks(){return downloadClicks;},resolveGate(value={proceed:true,draft:true,result:{status:'draft_only'}}){guardResolve(value);}};
}

const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('Internal Draft review time is outside the Proposal file-generation deadline',async()=>{
 const h=createAdapterHarness();
 const first=h.window.proposalPrint();
 const duplicate=h.window.proposalPrint();
 await settle();
 assert.equal(h.guardCalls,1,'rapid repeat must share one governed preflight');
 assert.equal(h.fetchCalls,0,'request must wait for the governed readiness decision');
 assert.equal(h.timers.filter(x=>x.delay===30000).length,0,'human review must not arm the network generation deadline');
 h.resolveGate();
 await Promise.all([first,duplicate]);
 assert.equal(h.fetchCalls,1,'one approved action creates one server request');
 assert.equal(h.downloadClicks,1,'one non-empty artifact is downloaded');
 assert.equal(h.control('proposalPdfBtn').disabled,false,'control is restored after success');
 assert.ok(h.toasts.includes('PDF document created.'));
});

test('Proposal timeout starts only after the production request begins and remains recoverable',async()=>{
 const h=createAdapterHarness({fetchMode:'pending'});
 const operation=h.window.proposalPrint();
 await settle();
 h.resolveGate();
 await settle();
 assert.equal(h.fetchCalls,1);
 const deadline=h.timers.find(x=>x.delay===30000&&!x.cleared);
 assert.ok(deadline,'network generation deadline must be armed after approval');
 deadline.callback();
 await operation;
 assert.equal(h.control('proposalPdfBtn').disabled,false);
 assert.match(h.errors.at(-1).message,/generation timed out/i);
 assert.match(h.toasts.at(-1),/continue working and retry/i);
});

test('production Proposal preparation and HTTP response preserve governed Internal Draft authority',async()=>{
 const prepared=await prepareProposalExport({user:{id:'u1'},scenarioId:'s1',internalDraft:true},{loadExecutiveSource:async()=>source()});
 const response=buildProposalPdfResponse(prepared);
 const body=response.buffer.toString('latin1');
 assert.equal(response.buffer.subarray(0,4).toString(),'%PDF');
 assert.ok(response.buffer.length>1000);
 assert.equal(response.headers['Content-Type'],'application/pdf');
 assert.equal(response.headers['Cache-Control'],'private, no-store');
 assert.equal(response.headers['X-Output-Audience'],'internal');
 assert.equal(response.headers['X-Executive-Readiness'],'draft_only');
 assert.match(response.headers['Content-Disposition'],/Internal-Draft-Proposal.*\.pdf/);
 assert.match(body,/INTERNAL USE ONLY/);
 assert.match(body,/NOT READY FOR CUSTOMER SHARING/);
 assert.match(body,/315 776 Td \(CONFIDENTIAL - INTERNAL USE ONLY\)/);
 assert.match(body,/315 764 Td \(DRAFT - NOT READY FOR CUSTOMER SHARING\)/);
 assert.match(body,/50 757 m 562 757 l S/);
 assert.match(body,/Acme Manufacturing International/);
 assert.match(body,/GBP/);
 assert.doesNotMatch(body,/Internal alternate pricing/);
});

test('long Proposal content, native currencies, null and zero economics remain valid PDF data',()=>{
 const longText='Validated operational narrative '.repeat(180);
 const baseStory={meta:{customer:'Global Customer Name '.repeat(8),solution:'CIP',currency:'USD'},threeWhys:{whyChange:{value:longText},whyNow:{value:longText},whyCloudInventory:{value:longText}},economics:{annualBenefit:0,totalContractBenefit:0,totalContractInvestment:null,netEconomicBenefit:null,contractRoi:null,payback:null},solutionAlignment:{priorityWorkflows:Array.from({length:20},(_,i)=>({name:`Workflow ${i+1} ${longText.slice(0,40)}`}))},nextSteps:{items:Array.from({length:20},(_,i)=>({milestone:`Milestone ${i+1} ${longText.slice(0,60)}`,owner:'Joint team',dueDate:'2026-12-31'}))}};
 const proposal={title:'Stress Proposal',situation:longText,recommendation:longText};
 const usd=buildProposalPdf({story:baseStory,proposal,audience:'internal',draft:true}).toString('latin1');
 assert.match(usd,/0 USD/);
 assert.match(usd,/Not yet established/);
 assert.doesNotMatch(usd,/0 USD modeled customer investment/);
 const gbp=buildProposalPdf({story:{...baseStory,meta:{...baseStory.meta,currency:'GBP'},economics:{...baseStory.economics,annualBenefit:125000,totalContractBenefit:375000,totalContractInvestment:100000,netEconomicBenefit:275000,contractRoi:275,payback:9}},proposal,audience:'internal',draft:true});
 assert.equal(gbp.subarray(0,4).toString(),'%PDF');
 assert.match(gbp.toString('latin1'),/125,000 GBP/);
 assert.ok(gbp.length>1000);
});

test('Proposal PDF endpoint remains authenticated and uses the production response authority',()=>{
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/app\.post\('\/api\/export\/proposal-pdf', requireAuth/);
 assert.match(server,/buildProposalPdfResponse\(prepared\)/);
 assert.doesNotMatch(server.slice(server.indexOf("app.post('/api/export/proposal-pdf'"),server.indexOf("app.post('/api/export/roi-methodology-pdf'")),/buildProposalPdf\(/);
});

test('anonymous Proposal PDF request is rejected at the real HTTP boundary',async()=>{
 const {app}=require('../server');
 const listener=await new Promise(resolve=>{
  const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));
 });
 try{
  const {port}=listener.address();
  const response=await fetch(`http://127.0.0.1:${port}/api/export/proposal-pdf`,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({scenarioId:'unauthorized-test'})
  });
  assert.equal(response.status,401);
 }finally{
  await new Promise((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));
 }
});
