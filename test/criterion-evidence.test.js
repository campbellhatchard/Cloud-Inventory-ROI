const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluateCriterionEvidence}=require('../src/shared/criterion-evidence');

const now='2026-08-30';
const criterion=(id,extra={})=>({id,source:'evidence',minQuality:'moderate',customerValidation:false,freshnessDays:90,...extra});
const record=(id,extra={})=>({[id]:{evidence:`Customer confirmed ${id}`,stakeholder:'Pat Buyer',source:'Customer meeting',evidenceDate:'2026-08-20',quality:'strong',customerValidated:true,...extra}});
const evaluate=(id,extra={},config={})=>evaluateCriterionEvidence({criterion:criterion(id,config),now,...extra});
const process=(id,validation='Customer validated')=>({id,name:`Workflow ${id}`,selected:true,demoStatus:'Demonstrated',fit:'Fit',customerValidation:validation});
const completeFit=processes=>({data:{opportunity:{customer:'Acme',solutionEngineer:'SE',products:['MEP'],locations:'3',users:'20',problem:'Lost time',outcome:'Accuracy'},architecture:{relationship:'Standalone',erp:'ERP',version:'1'},partner:{involved:'No'},processes,gaps:[]}});

test('an unrelated stakeholder or generic status cannot prove stakeholder criteria',()=>{
  const stakeholders=[{id:1,name:'Influencer',role:'influencer',engaged:true}];
  for(const id of ['process_owner','financial_authority','decision_stakeholders'])assert.equal(evaluate(id,{stakeholders,savedEvidence:{[id]:{status:'Complete'}}}).complete,false,id);
});
test('an engaged mapped Economic Buyer proves only financial authority',()=>{
  const stakeholders=[{id:7,name:'Econ Buyer',role:'economic_buyer',engaged:true}];
  assert.equal(evaluate('financial_authority',{stakeholders}).complete,true);
  assert.equal(evaluate('process_owner',{stakeholders}).complete,false);
  assert.equal(evaluate('decision_stakeholders',{stakeholders}).complete,false);
});
test('mapped stakeholder criteria require exact linked evidence when not derived',()=>{
  const stakeholders=[{id:2,name:'Ops Owner',role:'business_owner',engaged:true}];
  assert.equal(evaluate('process_owner',{stakeholders,savedEvidence:record('process_owner',{stakeholderId:2})}).complete,true);
  assert.equal(evaluate('process_owner',{stakeholders,savedEvidence:record('future_state',{stakeholderId:2})}).complete,false);
});
test('Solution Fit must be semantically conditional or ready, not merely present',()=>{
  assert.equal(evaluate('solution_fit',{solutionFit:{data:{processes:[process('a')]}}}).complete,false);
  assert.equal(evaluate('solution_fit',{solutionFit:completeFit([process('a')])}).complete,true);
});
test('workflow validation is all-or-nothing across selected processes',()=>{
  const processes=Array.from({length:10},(_,i)=>process(String(i),i<8?'Customer validated':'Validation pending'));
  const result=evaluate('workflows',{solutionFit:completeFit(processes)},{minQuality:'strong',customerValidation:true});
  assert.equal(result.complete,false);assert.match(result.blockedBy.join(' '),/2 selected workflows require/);
  assert.equal(evaluate('workflows',{solutionFit:completeFit(processes.map(p=>({...p,customerValidation:'Customer validated'})))},{minQuality:'strong',customerValidation:true}).complete,true);
});
test('implementation requires Ready handoff and its own validated evidence',()=>{
  const config={minQuality:'strong',customerValidation:true};
  assert.equal(evaluate('implementation',{solutionFit:completeFit([process('a')])},config).complete,false);
  assert.equal(evaluate('implementation',{solutionFit:completeFit([process('a')]),savedEvidence:record('implementation')},config).complete,true);
});
test('component existence does not prove proposal, competitive, discovery, or contract criteria',()=>{
  assert.equal(evaluate('proposal_alignment',{scenarioData:{proposalDraft:{title:'Proposal'}}},{minQuality:'strong',customerValidation:true}).complete,false);
  assert.equal(evaluate('commercial',{scenarioData:{proposalDraft:{title:'Proposal'}}},{minQuality:'strong',customerValidation:true}).complete,false);
  assert.equal(evaluate('alternatives',{scenarioData:{competitor:'SAP'}},{minQuality:'strong',customerValidation:true}).complete,false);
  assert.equal(evaluate('future_state',{scenarioData:{threeWhysNow:'Generic discovery'}},{customerValidation:true}).complete,false);
  assert.equal(evaluate('contract',{jointPlan:{milestones:[{title:'Demo'}]}},{minQuality:'strong',customerValidation:true}).complete,false);
});
test('exact structured evidence completes only its own evidence-backed criterion',()=>{
  for(const id of ['future_state','funding','budget','funding_timing','procurement_path','criteria','decision_process','decision_timeline','criteria_addressed','alternatives','preference','selected','funding_reconfirmed','signature_date']){
    assert.equal(evaluate(id,{savedEvidence:record(id)},{customerValidation:true}).complete,true,id);
    assert.equal(evaluate(id,{savedEvidence:record('unrelated')},{customerValidation:true}).complete,false,id);
  }
});
test('stale, unvalidated, or empty Complete records cannot bypass governance',()=>{
  assert.equal(evaluate('funding',{savedEvidence:record('funding',{evidenceDate:'2026-01-01'})},{customerValidation:true}).complete,false);
  assert.equal(evaluate('funding',{savedEvidence:record('funding',{customerValidated:false})},{customerValidation:true}).complete,false);
  assert.equal(evaluate('funding',{savedEvidence:{funding:{status:'Complete'}}},{customerValidation:true}).complete,false);
});
test('ROI-derived criteria are independent and require their own inputs',()=>{
  const data={modelVersion:25,users:10,labor:50000,mLabor:.2,laborWastePct:.1,invest:1000,otc:0,contractMonths:36};
  assert.equal(evaluate('economic_impact',{scenarioData:data}).complete,true);
  assert.equal(evaluate('current_baseline',{scenarioData:data}).complete,true);
  assert.equal(evaluate('roi_funding',{scenarioData:data}).complete,true);
  assert.equal(evaluate('economic_impact',{scenarioData:{invest:125000}}).complete,false);
  assert.equal(evaluate('roi_funding',{scenarioData:{users:10,labor:50000,mLabor:.2,invest:0}}).complete,false);
});
test('stage readiness uses the criterion service and contains no broad source matcher',()=>{
  const service=fs.readFileSync(path.join(__dirname,'..','src','shared','stage-readiness-service.js'),'utf8');
  assert.match(service,/evaluateCriterionEvidence/);assert.doesNotMatch(service,/sourceMatch/);assert.doesNotMatch(service,/handoff\.readiness\s*>=\s*50/);
});
test('buyer-readiness UI displays proof summaries and persists mapped stakeholder ids',()=>{
  const ui=fs.readFileSync(path.join(__dirname,'..','public','buyer-readiness.js'),'utf8');
  assert.match(ui,/sourceSummary/);assert.match(ui,/bevStakeholderMap/);assert.match(ui,/stakeholderId:/);
});
