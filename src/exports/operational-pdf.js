'use strict';

const {buildTextPdf}=require('./executive-pdf');

const clean=value=>String(value==null?'':value).trim();
const line=(label,value)=>`${label}: ${clean(value)||'Not yet established'}`;
const list=value=>Array.isArray(value)?value:[];

function buildJppPdf(plan,{audience='customer'}={}){
  const milestones=list(plan.milestones).filter(m=>clean(m.title||m.task));
  return buildTextPdf({
    title:clean(plan.title)||'Joint Project Plan',
    subtitle:line('Customer',plan.company),audience,
    sections:[
      {heading:'Why we are sharing this plan',lines:['This joint plan creates a shared path from validation through approval and launch. It makes ownership, dates, dependencies, and decisions visible so both teams can protect time-to-value.']},
      {heading:'Plan summary',lines:[line('Target close date',plan.target_close_date),line('Open milestones',milestones.filter(x=>x.status!=='done').length),line('Completed milestones',milestones.filter(x=>x.status==='done').length)]},
      {heading:'Milestones',lines:milestones.map((m,i)=>`${i+1}. ${clean(m.title||m.task)||'Untitled milestone'} | ${clean(m.owner)||'Owner not assigned'} | ${clean(m.dueDate||m.due_date)||'Date not set'} | ${clean(m.status)||'pending'}`)}
    ]
  });
}

function buildStakeholderPdf({company,stakeholders}){
  const rows=list(stakeholders);
  return buildTextPdf({title:'Stakeholder Map',subtitle:line('Customer',company),audience:'internal',sections:[
    {heading:'Buying committee',lines:rows.map((p,i)=>`${i+1}. ${clean(p.name)||'Unnamed stakeholder'} | ${clean(p.title)||'Title not entered'} | ${clean(p.role).replace(/_/g,' ')||'Role not classified'} | Influence ${p.influence||'—'}/5 | Support ${p.support||'—'}/5 | ${p.engaged?'Engaged':'Not engaged'}`)},
    {heading:'Coverage',lines:[line('Stakeholders mapped',rows.length),line('Economic buyer',rows.some(p=>p.role==='economic_buyer')?'Mapped':'Not mapped'),line('Champion',rows.some(p=>p.role==='champion')?'Mapped':'Not mapped'),line('Technical buyer',rows.some(p=>p.role==='technical_buyer')?'Mapped':'Not mapped')]}
  ]});
}

function solutionLines(data,kind){
  const opportunity=data.opportunity||{},scope=data.solutionScope||{},architecture=data.architecture||{},processes=list(data.processes),gaps=list(data.gaps);
  if(kind==='risk')return gaps.length?gaps.map((g,i)=>`${i+1}. ${clean(g.title||g.gap||g.description)||'Unresolved gap'} | Impact: ${clean(g.impact)||'Not assessed'} | Mitigation: ${clean(g.mitigation)||'Not defined'} | Owner: ${clean(g.owner)||'Not assigned'}`):['No saved Solution Fit gaps are recorded.'];
  if(kind==='handoff')return [line('Solution engineer',opportunity.solutionEngineer),line('Primary product',scope.primaryProduct||list(opportunity.products)[0]),line('ERP / system of record',scope.erp||architecture.erp),line('Problem',opportunity.problem),line('Desired outcome',opportunity.outcome),...processes.map((p,i)=>`${i+1}. ${clean(p.name||p.process)||'Workflow'} | Fit: ${clean(p.fit||p.classification)||'Not assessed'} | Validation: ${clean(p.customerValidation)||'Not recorded'}`),...gaps.map((g,i)=>`Gap ${i+1}: ${clean(g.title||g.gap||g.description)||'Unresolved gap'} | ${clean(g.mitigation)||'Mitigation not defined'}`)];
  return [line('Primary product',scope.primaryProduct||list(opportunity.products)[0]),line('ERP / system of record',scope.erp||architecture.erp),line('Business problem',opportunity.problem),line('Desired outcome',opportunity.outcome),...processes.map((p,i)=>`${i+1}. ${clean(p.name||p.process)||'Workflow'} | ${clean(p.fit||p.classification)||'Fit not assessed'} | ${clean(p.customerValidation)||'Customer validation not recorded'}`)];
}

function buildSolutionFitPdf(data,{kind='summary',customer='Customer'}={}){
  const internal=kind==='handoff';
  const title=kind==='risk'?'Solution Fit Risk Ledger':kind==='handoff'?'Internal Solution Handoff':'Solution Discovery and Demonstration Summary';
  return buildTextPdf({title,subtitle:line('Customer',customer),audience:internal?'internal':'customer',sections:[{heading:kind==='risk'?'Gaps and mitigations':kind==='handoff'?'Saved handoff details':'Shared solution understanding',lines:solutionLines(data,kind)}]});
}

function buildCompetitivePdf({product,version,findings}){
  return buildTextPdf({title:'Competitive Battlecard',subtitle:`${clean(product)} | Approved revision ${clean(version)}`,audience:'internal',sections:list(findings).map(f=>({heading:clean(f.category)||'Finding',lines:[clean(f.claim),f.evidence?`Evidence: ${clean(f.evidence)}`:'',f.confidence?`Confidence: ${clean(f.confidence)}`:''].filter(Boolean)}))});
}

function buildImpactMapPdf(groups){
  return buildTextPdf({title:'Discovery to Calculator Impact Map',subtitle:'ROI Model v2.8 | Authoritative questionnaire and formula registry',audience:'internal',sections:list(groups).map(g=>({heading:clean(g.label||g.industry)||'Question group',lines:list(g.rows).map(r=>`${clean(r.question)} | ${clean(r.classification)} | ${clean(r.canonicalInput)||'No direct ROI input'} | ${clean(r.formula||r.formulaText||r.impact)||'Context only'}`)}))});
}

module.exports={buildJppPdf,buildStakeholderPdf,buildSolutionFitPdf,buildCompetitivePdf,buildImpactMapPdf};
