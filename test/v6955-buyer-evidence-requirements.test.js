'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {REQUIREMENTS,STAGE_BY_REQUIREMENT,PROOF_TYPES,projectRequirementDefinition}=require('../src/shared/buyer-evidence-requirements');
const {evaluateCriterionEvidence}=require('../src/shared/criterion-evidence');
const drawer=require('../public/buyer-evidence-drawer');

const NOW='2026-10-30';
const ACTIVE={2:['economic_impact','current_baseline','future_state','process_owner','compelling_event','economic_ack'],3:['funding','budget','funding_timing','financial_authority','procurement_path','roi_funding'],4:['criteria','decision_process','decision_stakeholders','decision_timeline','solution_fit'],5:['workflows','criteria_addressed','alternatives','proposal_alignment','preference'],6:['selected','commercial','contract','funding_reconfirmed','signature_date','implementation']};
const config=(id,extra={})=>({id,name:id.replace(/_/g,' '),description:`Governed ${id} requirement`,source:'evidence',minQuality:'strong',customerValidation:true,freshnessDays:90,...extra});
const evidence=(id,extra={})=>({criterionId:id,evidence:`Customer confirmed ${id}`,stakeholder:'Pat Buyer · VP Operations',stakeholderId:null,source:'Customer conversation',evidenceDate:'2026-10-28',quality:'strong',customerValidated:true,amount:'USD 300,000',timing:'Q1 2027',targetDate:'2027-01-31',term:'36 months',...extra});
const evaluate=(id,{criterion={},savedEvidence={},...rest}={})=>evaluateCriterionEvidence({criterion:config(id,criterion),savedEvidence,now:NOW,...rest});
const process=(id,validation='Customer validated')=>({id,name:`Workflow ${id}`,product:'MEP',erp:'JDE',source:'standard_app',selected:true,demoStatus:'Demonstrated',fit:'Full fit',customerValidation:validation});
const inventoryConfiguration=Object.fromEntries(['Lot Numbers','FIFO, LIFO, FEFO, etc.','Serial Numbers','LPNs / Handling Units / Packing Units','Zones','Specialized Storage Areas','Defined Pick Sequence','Job','Ownership','Country of Origin'].map(name=>[name,{answer:'No'}]));
const completeFit=()=>({primary_se_id:'se-1',data:{solutionScope:{primaryProduct:'MEP',additionalProducts:[],erp:'JDE',erpVersion:'1'},opportunity:{customer:'Acme',products:['MEP'],locations:'3',users:'20',problem:'Lost time',outcome:'Accuracy'},architecture:{relationship:'Standalone',erp:'JDE',version:'1'},partner:{involved:'No'},processes:[process('receive')],gaps:[],inventoryConfiguration,turnover:{contractStatus:'Reviewed',projectManager:'Pat PM',systemAdminEmail:'admin@acme.test',deliveryModel:'Cloud',internalDeliveryContact:'Alex AE',projectStart:'2027-02-01',eapEdition:'Standard',environments:'2',authorizedDefinitions:'1',authorizedLanguages:'English',customerDomain:'acme.test',sowLink:'https://example.test/sow',mepLicenseId:'MEP-1'}}});
const projected=(id,evaluated,saved={})=>({...config(id),...saved,...evaluated,id,minimumEvidenceStrength:evaluated.requirement.minimumEvidenceStrength});

test('all 28 active requirements have exactly one authoritative proof type and the configured stage',()=>{
 const active=Object.values(ACTIVE).flat();
 assert.equal(active.length,28);
 assert.deepEqual(Object.keys(REQUIREMENTS).sort(),active.slice().sort());
 for(const [stage,ids] of Object.entries(ACTIVE))for(const id of ids){
  const definition=projectRequirementDefinition(config(id));
  assert.ok(Object.values(PROOF_TYPES).includes(definition.proofType),id);
  assert.equal(STAGE_BY_REQUIREMENT[id],Number(stage),id);
  assert.ok(definition.sourceModule&&definition.navigationTarget&&definition.actionLabel&&definition.proves,id);
 }
});

test('commercial customer evidence completes without proposalDraft and an artifact alone cannot complete it',()=>{
 const commercial=evidence('commercial');
 const positive=evaluate('commercial',{scenarioData:{},savedEvidence:{commercial}});
 assert.equal(positive.complete,true);
 assert.equal(positive.proofType,'CUSTOMER_EVIDENCE');
 const artifactOnly=evaluate('commercial',{scenarioData:{proposalDraft:{title:'Seller proposal'}}});
 assert.equal(artifactOnly.complete,false);
 assert.ok(artifactOnly.blockingReasons.some(reason=>/Customer confirmation|required/.test(reason)));
 const notConfirmed=evaluate('commercial',{scenarioData:{},savedEvidence:{commercial:{...commercial,customerValidated:false}}});
 assert.equal(notConfirmed.complete,false);
 assert.ok(notConfirmed.blockingReasons.some(reason=>/Customer direct confirmation/.test(reason)));
});

test('proposal alignment still completes from qualifying evidence without a Proposal artifact',()=>{
 const item=evidence('proposal_alignment');
 assert.equal(evaluate('proposal_alignment',{savedEvidence:{proposal_alignment:item}}).complete,true);
 assert.equal(evaluate('proposal_alignment',{scenarioData:{proposalDraft:{title:'Seller proposal'}}}).complete,false);
});

test('adaptive field matrix renders only governed criterion fields',()=>{
 const preference=projectRequirementDefinition(config('preference'));
 assert.deepEqual(drawer.visibleFieldIds({requirement:preference}).filter(id=>['amount','timing','targetDate','term'].includes(id)),[]);
 assert.ok(drawer.visibleFieldIds({requirement:projectRequirementDefinition(config('budget'))}).includes('amount'));
 assert.ok(drawer.visibleFieldIds({requirement:projectRequirementDefinition(config('funding_timing'))}).includes('timing'));
 assert.ok(drawer.visibleFieldIds({requirement:projectRequirementDefinition(config('signature_date'))}).includes('targetDate'));
 assert.deepEqual(drawer.visibleFieldIds({requirement:projectRequirementDefinition(config('commercial'))}).filter(id=>['amount','term'].includes(id)),['amount','term']);
});

test('derived requirement drawer has no evidence form and routes to its authoritative source',()=>{
 const result=evaluate('economic_impact',{criterion:{source:'roi',minQuality:'moderate',customerValidation:false},scenarioData:{}}),criterion=projected('economic_impact',result);
 const html=drawer.renderDrawer({criterion});
 assert.match(html,/Derived requirement/);
 assert.match(html,/Automatically evaluated from/);
 assert.match(html,/Open ROI Calculator/);
 assert.match(html,/navigateBuyerEvidenceSource\('calc'\)/);
 assert.doesNotMatch(html,/buyerEvidenceForm|What did the customer confirm\?/);
});

test('Solution Fit derived requirement exposes source state without a redundant evidence form',()=>{
 const result=evaluate('solution_fit',{criterion:{source:'solution_fit',minQuality:'moderate',customerValidation:false},solutionFit:completeFit()}),criterion=projected('solution_fit',result);
 const html=drawer.renderDrawer({criterion});
 assert.equal(result.complete,true);
 assert.match(html,/Open Solution Fit/);
 assert.doesNotMatch(html,/buyerEvidenceForm/);
});

test('hybrid implementation separates complete customer evidence from the exact incomplete prerequisite',()=>{
 const saved=evidence('implementation'),result=evaluate('implementation',{savedEvidence:{implementation:saved},solutionFit:{data:{processes:[process('receive')]}}}),criterion=projected('implementation',result,saved);
 assert.equal(result.evidenceComplete,true);
 assert.equal(result.complete,false);
 assert.equal(result.semanticState,'EVIDENCE_SAVED_PREREQUISITE_BLOCKED');
 assert.equal(result.prerequisites[0].complete,false);
 assert.match(result.prerequisites[0].currentStatus,/Not Ready|Conditional/);
 const html=drawer.renderDrawer({criterion,saved});
 assert.match(html,/EVIDENCE SAVED — PREREQUISITE BLOCKED/);
 assert.match(html,/Solution Fit &amp; Handoff is Ready/);
 assert.match(html,/Solution Fit must be Ready/);
 assert.match(html,/Open Solution Fit/);
});

test('hybrid implementation completes only when both evidence and Solution Fit are complete',()=>{
 const saved=evidence('implementation'),result=evaluate('implementation',{savedEvidence:{implementation:saved},solutionFit:completeFit()}),criterion=projected('implementation',result,saved);
 assert.equal(result.evidenceComplete,true);
 assert.equal(result.prerequisites[0].complete,true);
 assert.equal(result.complete,true);
 assert.match(drawer.renderDrawer({criterion,saved}),/COMPLETE/);
});

test('stakeholder hybrid exposes the mapped and engaged prerequisite',()=>{
 const saved=evidence('process_owner',{stakeholderId:'owner-1'}),stakeholders=[{id:'owner-1',name:'Pat Buyer',title:'VP Operations',role:'business_owner',engaged:false}],result=evaluate('process_owner',{criterion:{customerValidation:false,minQuality:'moderate',source:'stakeholders'},savedEvidence:{process_owner:saved},stakeholders});
 assert.equal(result.complete,false);
 assert.equal(result.proofType,'HYBRID');
 assert.equal(result.prerequisites[0].complete,false);
 assert.match(result.blockingReasons.join(' '),/engaged stakeholder/);
 stakeholders[0].engaged=true;
 assert.equal(evaluate('process_owner',{criterion:{customerValidation:false,minQuality:'moderate',source:'stakeholders'},savedEvidence:{process_owner:saved},stakeholders}).complete,true);
});

test('new and existing evidence use Save and Update terminology while confirmation remains an independent attribute',()=>{
 const result=evaluate('preference'),criterion=projected('preference',result);
 const fresh=drawer.renderDrawer({criterion,saved:{}});
 assert.match(fresh,/>Save evidence</);
 assert.match(fresh,/Customer directly confirmed this evidence/);
 assert.doesNotMatch(fresh,/>Confirm evidence</);
 assert.doesNotMatch(fresh,/id="bevAmount"|id="bevTiming"/);
 const incomplete=evidence('preference',{quality:'weak',customerValidated:false}),evaluated=evaluate('preference',{savedEvidence:{preference:incomplete}}),editing=drawer.renderDrawer({criterion:projected('preference',evaluated,incomplete),saved:incomplete,editMode:true});
 assert.match(editing,/>Update evidence</);
 assert.doesNotMatch(editing,/id="bevValidated"[^>]*checked/);
});

test('completed evidence opens in compact summary mode and offers deliberate edit and next-incomplete actions',()=>{
 const saved=evidence('preference'),result=evaluate('preference',{savedEvidence:{preference:saved}}),criterion=projected('preference',result,saved),html=drawer.renderDrawer({criterion,saved,hasNext:true});
 assert.doesNotMatch(html,/id="buyerEvidenceForm"/);
 assert.match(html,/Edit evidence/);
 assert.match(html,/Next incomplete requirement/);
 assert.match(html,/Pat Buyer/);
});

test('recent evidence is opportunity-scoped input, excludes the current criterion and only provides prefill choices',()=>{
 const candidates=drawer.recentEvidence({criterion:{id:'preference'},evidence:{preference:evidence('preference'),criteria:evidence('criteria'),empty:{source:'Email'}},criterionLabels:{criteria:'Decision criteria and priorities known'}});
 assert.equal(candidates.length,1);
 assert.equal(candidates[0].id,'criteria');
 assert.equal(candidates[0].criterionLabel,'Decision criteria and priorities known');
 const result=evaluate('preference'),criterion=projected('preference',result),html=drawer.renderDrawer({criterion,evidence:{criteria:evidence('criteria')},criterionLabels:{criteria:'Decision criteria'}});
 assert.match(html,/Use recent evidence/);
 assert.match(html,/only prefills this form/);
 assert.equal(result.complete,false,'listing a candidate must not complete the new criterion');
});

test('historical saved evidence remains readable and is surfaced for repair when current transparent fields are missing',()=>{
 const legacy=evidence('budget',{amount:null}),result=evaluate('budget',{savedEvidence:{budget:legacy}}),criterion=projected('budget',result,legacy),html=drawer.renderDrawer({criterion,saved:legacy});
 assert.equal(result.complete,false);
 assert.match(result.blockingReasons.join(' '),/Budget amount/);
 assert.match(html,/Customer confirmed budget/);
 assert.match(html,/id="bevAmount"/);
 assert.match(html,/Update evidence/);
});

test('production browser consumes server projection and preserves independent stage gates',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'..','public','buyer-readiness.js'),'utf8'),coach=fs.readFileSync(path.join(__dirname,'..','public','deal-coach.js'),'utf8');
 assert.match(ui,/CIBuyerEvidenceDrawer\.renderDrawer/);
 assert.match(ui,/blockingReasons/);
 assert.match(ui,/Evidence criteria complete/);
 assert.match(ui,/Mandatory stage gates complete/);
 assert.match(ui,/Next incomplete requirement|openNextBuyerEvidenceRequirement/);
 assert.doesNotMatch(ui,/>Confirm evidence</);
 assert.match(coach,/c\.blockingReasons\|\|c\.blockedBy/);
 assert.match(coach,/proofType/);
});
