'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('internal Field Help context is total with and without a focused field',()=>{
  const {buildInternalFieldContext}=require('../public/internal-field-context');
  const emptyDocument={getElementById:()=>null,querySelector:selector=>selector==='.pane.active'?{id:'tab-calc'}:null};
  assert.deepEqual(buildInternalFieldContext('',emptyDocument,{workspaces:{'tab-calc':'roi'},labels:{}}),{
    audience:'Internal User',screen:'roi',section:'',field:'',fieldLabel:'',question:'',description:'',inputType:'',units:'',existingValue:'',relevantPriorInputs:[],allowedContext:'Application usage and field explanation',contextClassification:'Internal'
  });
  const heading={textContent:'Operational drivers'},hint={textContent:'Best supported annual estimate.'};
  const wrap={querySelector:selector=>selector==='label'?{textContent:'Annual write-offs'}:selector==='.field-hint'?hint:null};
  const section={querySelector:()=>heading};
  const field={id:'annualWriteOff',type:'number',value:'125000',getAttribute:()=>'',closest:selector=>selector==='.field'?wrap:section};
  const document={getElementById:id=>id==='annualWriteOff'?field:null,querySelector:selector=>selector==='.pane.active'?{id:'tab-calc'}:null};
  const context=buildInternalFieldContext('annualWriteOff',document,{workspaces:{'tab-calc':'roi'},labels:{annualWriteOff:'Annual write-offs'}});
  assert.equal(context.field,'annualWriteOff');assert.equal(context.section,'Operational drivers');assert.equal(context.units,'Currency');assert.equal(context.existingValue,'125000');
});

test('all Executive formats use one saved-state precondition and ignore narrative-only dirty state',()=>{
  const {inspectExecutiveOutputState}=require('../public/executive-output-preconditions');
  const saved=inspectExecutiveOutputState({scenarioId:'scenario-1',calculatorDirty:false,narrativeDirty:true,appliedValueDraftCount:0});
  assert.equal(saved.ok,true);
  const dirty=inspectExecutiveOutputState({scenarioId:'scenario-1',calculatorDirty:true,narrativeDirty:false,appliedValueDraftCount:0});
  assert.equal(dirty.ok,false);assert.match(dirty.message,/Save the updated ROI/);
  const adapters=read('public/executive-output-adapters.js');
  assert.equal((adapters.match(/prepareExecutiveOutput\('/g)||[]).length,3);
  assert.doesNotMatch(adapters,/hasUnsavedChanges\(\)/);
});

test('Prospect Evidence suspends and restores active transient overlays',()=>{
  const {createTransientOverlayManager}=require('../public/transient-overlays');
  const tour={hidden:false,style:{display:'flex'},getAttribute:()=>null,setAttribute(){},removeAttribute(){}};
  const coach={hidden:false,style:{display:''},getAttribute:()=>null,setAttribute(){},removeAttribute(){}};
  const manager=createTransientOverlayManager({querySelectorAll:()=>[tour,coach]});
  const token=manager.suspend('prospect-evidence');
  assert.equal(tour.hidden,true);assert.equal(tour.style.display,'none');assert.equal(coach.hidden,true);
  manager.restore(token);
  assert.equal(tour.hidden,false);assert.equal(tour.style.display,'flex');assert.equal(coach.hidden,false);
  const discovery=read('public/discovery.js');
  assert.match(discovery,/CITransientOverlays\?\.suspend\('prospect-evidence'\)/);
  assert.match(discovery,/CITransientOverlays\?\.restore/);
});

test('stakeholder outputs share the same saved-map precondition',()=>{
  const {stakeholderOutputContext}=require('../public/operational-output-preconditions');
  assert.deepEqual(stakeholderOutputContext({company:'Orion Steel',stakeholders:[]}),{ok:false,message:'Select a saved customer stakeholder map before exporting PowerPoint or PDF.'});
  const ready=stakeholderOutputContext({company:'Orion Steel',stakeholders:[{id:'stake-1'}]});
  assert.equal(ready.ok,true);assert.equal(ready.company,'Orion Steel');
  const source=read('public/deal-export.js');
  assert.ok((source.match(/requireSavedStakeholderMapForOutput\(\)/g)||[]).length>=2);
});

test('competitive research readiness cannot be true for an unapproved browser fallback',()=>{
  const {evaluateCompetitiveResearchReadiness}=require('../public/competitive-research-readiness');
  const fallback=evaluateCompetitiveResearchReadiness({serverKnowledgeReady:false,ciSource:{type:'battlecard'},competitorReady:true});
  assert.equal(fallback.ready,false);assert.match(fallback.message,/Admin/);
  const canonical=evaluateCompetitiveResearchReadiness({serverKnowledgeReady:true,ciSource:{type:'canonical'},competitorReady:true});
  assert.equal(canonical.ready,true);
  const override=evaluateCompetitiveResearchReadiness({serverKnowledgeReady:false,ciSource:{type:'file',text:'approved session source'},competitorReady:true});
  assert.equal(override.ready,true);
});

test('competitive readiness and execution resolve the same governed product source',async()=>{
  const {loadConfiguredProductKnowledge,resolveProductKnowledge}=require('../src/shared/competitive-research-source');
  const row={id:'source-1',source_type:'text',source_name:'Approved CIP brief',source_url:null,content_text:'Approved product knowledge',created_at:'2026-10-03'};
  const query=async(sql,params)=>{assert.match(sql,/ci_product_sources/);assert.deepEqual(params,['cip']);return{rows:[row]};};
  const readiness=await loadConfiguredProductKnowledge(query,'cip');
  const execution=await resolveProductKnowledge({query,ciProductKey:'cip'});
  assert.equal(readiness.ready,true);assert.equal(readiness.source.id,'source-1');
  assert.equal(execution.ready,true);assert.equal(execution.content,'Approved product knowledge');assert.equal(execution.label,'Approved CIP brief');
  const server=read('server.js');
  assert.match(server,/research-readiness[\s\S]{0,700}loadConfiguredProductKnowledge/);
  assert.match(server,/POST \/api\/competitive\/research[\s\S]{0,2200}resolveProductKnowledge/);
});

test('Sales Manager deals are deterministically de-duplicated by opportunity',()=>{
  const {dedupeCurrentScenarioRows}=require('../src/shared/sales-manager-deals');
  const rows=[
    {id:'old',base_id:'base-1',version:2,updated_at:'2026-01-01'},
    {id:'new',base_id:'base-1',version:3,updated_at:'2026-02-01'},
    {id:'other',base_id:'base-2',version:1,updated_at:'2026-01-15'}
  ];
  assert.deepEqual(dedupeCurrentScenarioRows(rows).map(x=>x.id),['new','other']);
  const migration=read('migrations/041_single_current_scenario.sql');
  assert.match(migration,/ROW_NUMBER\(\) OVER/);assert.match(migration,/CREATE UNIQUE INDEX[\s\S]*WHERE is_current = TRUE AND deleted_at IS NULL/);
});

test('Prospect value authority uses immutable opportunity identity and never fabricates evidence',async()=>{
  const {loadApplicableValueEvent}=require('../src/shared/prospect-value-authority');
  const event={id:'event-1',base_id:'base-1',canonical_input:'annualWriteOff',event_type:'prospect_submitted',discovery_submission_id:'submission-1',submission_base_id:'base-1',session_customer_id:'legacy-customer'};
  const found=await loadApplicableValueEvent({query:async()=>({rows:[event]}),eventId:event.id,baseId:'base-1',canonicalInput:'annualWriteOff'});
  assert.equal(found.ok,true);assert.equal(found.event.id,'event-1');
  const missing=await loadApplicableValueEvent({query:async()=>({rows:[]}),eventId:'missing',baseId:'base-1',canonicalInput:'annualWriteOff'});
  assert.equal(missing.ok,false);assert.equal(missing.status,404);assert.equal(missing.code,'VALUE_EVENT_NOT_FOUND');
  const corrupt=await loadApplicableValueEvent({query:async()=>({rows:[{...event,submission_base_id:'base-2'}]}),eventId:event.id,baseId:'base-1',canonicalInput:'annualWriteOff'});
  assert.equal(corrupt.ok,false);assert.equal(corrupt.status,409);assert.equal(corrupt.code,'PROSPECT_EVIDENCE_MISMATCH');
});

test('Prospect apply UI preserves safe server reason instead of replacing it with a generic error',()=>{
  const source=read('public/features.js');
  assert.match(source,/const detail=await r\.json\(\)\.catch/);
  assert.match(source,/detail\.error\|\|'This value cannot be applied here\.'/);
});

test('governed output layouts wrap long payback text and reserve the one-pager footer',()=>{
  const executivePdf=read('src/exports/executive-pdf.js');
  assert.match(executivePdf,/valueLines=wrap\(display/);
  assert.match(executivePdf,/valueLines\.forEach/);
  const dealExport=read('public/deal-export.js');
  assert.match(dealExport,/value-case brief`[,]\{x:\.45,y:\.82,w:9\.0,h:\.55,fontSize:24/);
  assert.match(dealExport,/x:5\.25,y:4\.68,w:4\.2,h:\.32/);
});
