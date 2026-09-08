/* Authoritative Buyer Commitment model. This evaluates substantive customer
   behavior independently from evidence quality, stage, readiness, and seller activity. */
const {evaluateEvidenceFreshness,ROI_EVIDENCE_FRESHNESS_DAYS,parseDateOnly,todayDateOnly}=require('./evidence-freshness');

const COMMITMENT_LEVELS=Object.freeze({weak:{rank:1,label:'Weak'},moderate:{rank:2,label:'Moderate'},strong:{rank:3,label:'Strong'},very_strong:{rank:4,label:'Very Strong'}});
const MODERATE_EVIDENCE_IDS=Object.freeze(['future_state','compelling_event','economic_ack']);
const STRONG_EVIDENCE_IDS=Object.freeze(['funding','budget','funding_timing','procurement_path','criteria','decision_process','decision_timeline','workflows','criteria_addressed','proposal_alignment','preference','roi_value_case_validation','roi_executive_approval','signature_date']);
const VERY_STRONG_EVIDENCE_IDS=Object.freeze(['selected','funding_reconfirmed']);
const SIGNAL_LABELS=Object.freeze({future_state:'Customer defined the desired future state',compelling_event:'Customer confirmed a compelling event',economic_ack:'Customer acknowledged the economic consequence',funding:'Funding status confirmed',budget:'Budget amount or range confirmed',funding_timing:'Funding timing confirmed',procurement_path:'Procurement and funding path confirmed',criteria:'Decision criteria confirmed',decision_process:'Decision process confirmed',decision_timeline:'Decision timeline confirmed',workflows:'Critical workflows validated',criteria_addressed:'Decision criteria addressed',proposal_alignment:'Proposal aligned to customer value and criteria',preference:'Customer provided a preference signal',roi_value_case_validation:'Customer validated the economic value case',roi_executive_approval:'Economic Buyer approved the value case',signature_date:'Customer confirmed a target signature date',selected:'Customer explicitly selected Cloud Inventory',funding_reconfirmed:'Funding reconfirmed for the purchase path'});
const qualityRank={missing:0,weak:1,moderate:2,strong:3};
const lower=v=>String(v||'').toLowerCase();
const present=v=>v!==undefined&&v!==null&&String(v).trim()!=='';

function criterionLookup(stageConfig=[]){
  const map={};
  for(const stage of stageConfig||[])for(const criterion of stage.criteria||[])map[criterion.id]=criterion;
  map.roi_value_case_validation={id:'roi_value_case_validation',minQuality:'strong',customerValidation:true,freshnessDays:ROI_EVIDENCE_FRESHNESS_DAYS.roi_value_case_validation};
  map.roi_executive_approval={id:'roi_executive_approval',minQuality:'strong',customerValidation:true,freshnessDays:ROI_EVIDENCE_FRESHNESS_DAYS.roi_executive_approval};
  return map;
}
function evidenceSignal(id,item,config,now){
  if(!item||!present(item.evidence)||!present(item.stakeholder)||!present(item.source))return null;
  const freshness=evaluateEvidenceFreshness({evidenceDate:item.evidenceDate,freshnessDays:config.freshnessDays||90,now});
  const quality=lower(item.quality||'missing'),qualityOk=qualityRank[quality]>=qualityRank[lower(config.minQuality||'strong')];
  const validationOk=!config.customerValidation||item.customerValidated===true;
  return {type:id,label:SIGNAL_LABELS[id]||config.name||id,evidenceDate:item.evidenceDate||null,quality,freshness:freshness.status,ageDays:freshness.ageDays,valid:qualityOk&&validationOk&&['Current','Aging'].includes(freshness.status),qualityOk,validationOk};
}
function evaluateBuyerCommitment({evidence={},stakeholders=[],plan=null,stageConfig=[],outcome=null,now=new Date()}={}){
  const today=todayDateOnly(now),milestones=plan&&Array.isArray(plan.milestones)?plan.milestones:[],customerOwners=new Set(['prospect','customer','joint']);
  const customerMilestones=milestones.filter(m=>customerOwners.has(lower(m.owner))&&present(m.title));
  const completed=customerMilestones.filter(m=>lower(m.status)==='done'||lower(m.status)==='complete'||lower(m.status)==='completed');
  const open=customerMilestones.filter(m=>!completed.includes(m));
  const overdue=open.filter(m=>{const due=parseDateOnly(m.dueDate);return !!(due&&today&&due.epoch<today.epoch);});
  const active=open.filter(m=>{const due=parseDateOnly(m.dueDate);return !!(due&&today&&due.epoch>=today.epoch);});
  const undated=open.filter(m=>!parseDateOnly(m.dueDate));
  const planSignals={activeCustomerCommitments:active.length,completedCustomerCommitments:completed.length,overdueCustomerCommitments:overdue.length,undatedCustomerCommitments:undated.length};
  const configs=criterionLookup(stageConfig),evidenceSignals=[],staleSignals=[];
  for(const id of [...MODERATE_EVIDENCE_IDS,...STRONG_EVIDENCE_IDS,...VERY_STRONG_EVIDENCE_IDS]){
    const signal=evidenceSignal(id,evidence[id],configs[id]||{id,minQuality:id==='future_state'||id==='compelling_event'?'moderate':'strong',customerValidation:true,freshnessDays:90},now);
    if(signal)(signal.valid?evidenceSignals:staleSignals).push(signal);
  }
  const support=[];let level='weak';
  if(lower(outcome)==='won'){level='very_strong';support.push({type:'closed_won',label:'Customer completed the purchase'});}
  else {
    const veryStrong=evidenceSignals.filter(s=>VERY_STRONG_EVIDENCE_IDS.includes(s.type));
    const strong=evidenceSignals.filter(s=>STRONG_EVIDENCE_IDS.includes(s.type));
    const moderate=evidenceSignals.filter(s=>MODERATE_EVIDENCE_IDS.includes(s.type));
    if(veryStrong.length){level='very_strong';support.push(...veryStrong,...strong,...moderate);}
    else if(strong.length){level='strong';support.push(...strong,...moderate);}
    else if(moderate.length||active.length){level='moderate';support.push(...moderate,...active.map(m=>({type:'active_customer_milestone',label:m.title,evidenceDate:m.dueDate})));}
  }
  if(completed.length)support.push(...completed.map(m=>({type:'completed_customer_milestone',label:`Completed: ${m.title}`,evidenceDate:m.dueDate||null,supportingOnly:true})));
  if(undated.length)support.push(...undated.map(m=>({type:'undated_customer_milestone',label:m.title,supportingOnly:true})));
  const next={weak:['moderate','Secure a dated customer-owned or joint next step, or capture current validated early buyer evidence.'],moderate:['strong','Obtain a substantive buyer commitment such as confirmed funding, decision process, evaluation criteria, workflow validation, or customer ROI validation.'],strong:['very_strong','Capture explicit Cloud Inventory selection or current funding reconfirmation for the purchase path.'],very_strong:[null,'The customer has demonstrated high-intent purchase commitment.']}[level];
  return {level,rank:COMMITMENT_LEVELS[level].rank,label:COMMITMENT_LEVELS[level].label,strongestSignal:support.find(s=>!s.supportingOnly)||null,supportingSignals:support,staleOrUnusableSignals:staleSignals,planSignals,economicBuyerEngaged:(stakeholders||[]).some(s=>s.role==='economic_buyer'&&s.engaged===true),nextLevel:next[0],nextRequirement:next[1]};
}

module.exports={COMMITMENT_LEVELS,MODERATE_EVIDENCE_IDS,STRONG_EVIDENCE_IDS,VERY_STRONG_EVIDENCE_IDS,SIGNAL_LABELS,criterionLookup,evidenceSignal,evaluateBuyerCommitment};
