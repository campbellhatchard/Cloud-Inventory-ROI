'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {buildExecutiveValueStory}=require('../src/shared/executive-value-story');
const {evaluateExecutiveOutputReadiness}=require('../src/shared/executive-output-readiness');
const scenario=data=>({id:'s1',base_id:'b1',version:1,company:'Acme',data:{modelVersion:28,currency:'USD',...data}});

test('blank opportunity remains To validate and semantically valid prospect Discovery maps only to supported fields',()=>{
 const blank=buildExecutiveValueStory({scenario:scenario({}),discovery:[]});
 for(const why of Object.values(blank.threeWhys)){assert.equal(why.value,'To validate');assert.equal(why.status,'To validate');}
 const evidence=(question_id,answer)=>({question_id,answer,entered_by:'prospect_submission',submission_id:'sub1',submission_number:1,submitted_at:'2026-09-05T12:00:00.000Z',source_scenario_id:'s1',source_scenario_version:1,is_latest:true});
 const story=buildExecutiveValueStory({scenario:scenario({threeWhysAct:'Customer stated impact',threeWhysNow:'Contract renewal date',threeWhysMeta:{whyChange:{source:'customer_discovery',discoverySubmissionId:'sub1',submissionNumber:1,questionId:'ve5',submittedAt:'2026-09-05T12:00:00.000Z',sourceScenarioId:'s1',sourceScenarioVersion:1},whyNow:{source:'customer_discovery',discoverySubmissionId:'sub1',submissionNumber:1,questionId:'ve2',submittedAt:'2026-09-05T12:00:00.000Z',sourceScenarioId:'s1',sourceScenarioVersion:1}}}),discovery:[evidence('ve5','Customer stated impact'),evidence('ve2','Contract renewal date'),evidence('ve13','Unrelated success metric')]});
 assert.equal(story.threeWhys.whyChange.value,'Customer stated impact');assert.equal(story.threeWhys.whyNow.value,'Contract renewal date');assert.equal(story.threeWhys.whyCloudInventory.value,'To validate');assert.equal(story.threeWhys.whyChange.source,'customer_discovery');
});

test('saved Three Whys preserve rep, AI, historical, customer and reviewed vendor provenance',()=>{
 const cases=[['rep_authored','Rep authored — validate'],['ai_draft','AI draft — review and validate'],['historical_unknown','Needs validation'],['customer_validated','Customer supported']];
 for(const [source,status] of cases){const s=buildExecutiveValueStory({scenario:scenario({threeWhysAct:'Text',threeWhysMeta:{whyChange:{source}}})});assert.equal(s.threeWhys.whyChange.status,status);}
 const vendor=buildExecutiveValueStory({scenario:scenario({threeWhysCi:'Reviewed position',threeWhysMeta:{whyCloudInventory:{source:'rep_authored',validationStatus:'Cloud Inventory position — reviewed'}}})});assert.equal(vendor.threeWhys.whyCloudInventory.status,'Cloud Inventory position — reviewed');
});

test('readiness blocks missing narrative and warns for rep, AI and historical content without promoting it',()=>{
 const blank=buildExecutiveValueStory({scenario:scenario({})}),blocked=evaluateExecutiveOutputReadiness(blank);assert.equal(blocked.blockers.filter(x=>/is missing/.test(x.title)).length,3);
 for(const source of ['rep_authored','ai_draft','historical_unknown']){const story=buildExecutiveValueStory({scenario:scenario({threeWhysAct:'A',threeWhysNow:'B',threeWhysCi:'C',threeWhysMeta:{whyChange:{source},whyNow:{source},whyCloudInventory:{source}}})});const r=evaluateExecutiveOutputReadiness(story);assert.equal(r.warnings.filter(x=>x.title==='Narrative requires validation').length,3);}
});

test('editor behavior restores only supported evidence and marks rep/AI/historical provenance',()=>{
 const values={why_act:'',why_ci:'',why_now:''},status={whyStatus_act:'',whyStatus_ci:'',whyStatus_now:''};const elements=id=>({value:values[id]||'',set value(v){values[id]=v;},get value(){return values[id]||'';},textContent:status[id]||'',set textContent(v){status[id]=v;}});
 const context={window:{},document:{getElementById:elements},latestSubmittedEvidence:{byQuestion:{ve5:{answer_text:'Supported impact'},ve2:{answer_text:'Supported date'},ve13:{answer_text:'Ignore me'}}},discoveryAnswers:{ve5:'Unsubmitted draft must not be used'},setTimeout,clearTimeout,fetch:async()=>({json:async()=>({content:[{text:'{"act":"AI A","ci":"AI C","now":"AI N"}'}]})}),apiFetch:async()=>({ok:true,json:async()=>({id:'s1'})}),showToast(){},saveScenario(){},console};context.window=context;vm.runInNewContext(read('public/narrative.js'),context);
 context.initializeThreeWhysFromEvidence();assert.equal(values.why_act,'Supported impact');assert.equal(values.why_now,'Supported date');assert.equal(values.why_ci,'');assert.equal(status.whyStatus_ci,'To validate');
 values.why_act='Rep edit';context.markRepAuthored('act');context.saveThreeWhys({persist:false});assert.equal(context.getThreeWhysMeta().whyChange.source,'rep_authored');
});

test('authoritative adapter failure executes governed unavailable state and never a legacy renderer',async()=>{
 let unavailable=0;const context={window:{_calcScenarioId:'s1'},document:{getElementById:()=>null},loadExecutiveValueStory:async()=>{throw Error('down');},showExecutiveValueStoryUnavailable:()=>{unavailable++;},console,setTimeout,URL,fetch};context.window.window=context.window;vm.runInNewContext(read('public/executive-output-adapters.js'),context);context.window.renderExec();await new Promise(r=>setTimeout(r,0));assert.equal(unavailable,1);assert.doesNotMatch(read('public/app.js'),/function\s+renderExec\s*\(/);assert.doesNotMatch(read('public/app.js'),/buildPreviewScenarioTable/);
});

test('production dependency registry covers Executive and customer-output modules and prohibited audit passes',()=>{const files=require('../scripts/production-output-dependencies');for(const f of ['public/app.js','public/narrative.js','public/executive-story.js','public/executive-output-adapters.js','public/pptx-export.js','public/deal-export.js','public/business-case.js','public/proposal.js','src/shared/executive-value-story.js','src/shared/executive-output-readiness.js','src/exports/executive-pdf.js','src/exports/executive-pptx.js','src/exports/executive-docx.js'])assert.ok(files.includes(f),f);assert.doesNotMatch(read('public/narrative.js'),/THREE_WHYS_LIBRARY|buildNarrativeSections|calcRiskOfInaction/);});
