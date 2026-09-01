/* Authoritative live BuyCycle readiness service.
   Stage History is deliberately excluded: it is an immutable event snapshot,
   never an input to the current readiness calculation. */
const {query}=require('../db');
const {BUYCYCLE_MIN_STAGE,parseBuyCycleStage,isActiveBuyCycleStage,getNextActiveBuyCycleStage,resolvePersistedBuyCycleStage}=require('./buycycle-stage');
const {evaluateRoiMaturity}=require('./roi-maturity');
const {evaluateBuyerCommitment}=require('./buyer-commitment');
const {evaluateCriterionEvidence}=require('./criterion-evidence');
const {finalValueCase}=require('./opportunity-close');

const commitmentRank={weak:1,moderate:2,strong:3,very_strong:4};
const COMMITMENT_LABELS={weak:'Weak',moderate:'Moderate',strong:'Strong',very_strong:'Very Strong'};
const asArray=value=>Array.isArray(value)?value:[];
const key=value=>String(value);
const companyKey=value=>String(value||'').trim().toLowerCase();
const companyOwnerKey=(company,owner)=>`${companyKey(company)}::${key(owner)}`;
const rowsBy=(rows,field)=>{const map=new Map();for(const row of rows){const k=key(row[field]);map.set(k,[...(map.get(k)||[]),row]);}return map;};

function contextFrom({sc,cfg,governance,people,plan,handoff,prospectInputs=0,history=[],overrides=[]}){
 const persistedStage=resolvePersistedBuyCycleStage({currentStage:governance?.current_stage,repAssessedStage:governance?.rep_assessed_stage,dealStage:sc.deal_stage,dataDealStage:sc.data?.dealStage});
 const gov=governance?{...governance,current_stage:parseBuyCycleStage(governance.current_stage,persistedStage),rep_assessed_stage:parseBuyCycleStage(governance.rep_assessed_stage,persistedStage)}:{current_stage:persistedStage,rep_assessed_stage:persistedStage,evidence:{},certifications:{},opportunity_profile:{},legacy_setup_needed:true};
 return{sc,cfg,gov,people:asArray(people),plan:plan||null,handoff:handoff||null,prospectInputs:Number(prospectInputs)||0,history:asArray(history),overrides:asArray(overrides)};
}

async function loadStageReadinessContexts(scenarios,{includeHistory=false}={}){
 const list=asArray(scenarios);if(!list.length)return new Map();
 const ids=list.map(s=>s.id),baseIds=[...new Set(list.map(s=>s.base_id).filter(Boolean))],companies=[...new Set(list.map(s=>companyKey(s.company)).filter(Boolean))],ownerIds=[...new Set(list.map(s=>s.owner_id).filter(Boolean))],customerIds=[...new Set(list.map(s=>s.customer_id).filter(Boolean))];
 const [cfg,gov,people,plans,handoffs,prospect,history,overrides]=await Promise.all([
  query('SELECT * FROM buycycle_stage_config WHERE is_active=TRUE ORDER BY stage_order'),
  query('SELECT * FROM scenario_stage_governance WHERE scenario_id=ANY($1::uuid[])',[ids]),
  companies.length&&ownerIds.length?query('SELECT * FROM stakeholders WHERE LOWER(company)=ANY($1::text[]) AND owner_id=ANY($2::uuid[])',[companies,ownerIds]):Promise.resolve({rows:[]}),
  query('SELECT * FROM mutual_action_plans WHERE scenario_id=ANY($1::uuid[]) OR (LOWER(company)=ANY($2::text[]) AND owner_id=ANY($3::uuid[])) ORDER BY updated_at DESC',[ids,companies,ownerIds]),
  customerIds.length?query('SELECT * FROM handoffs WHERE customer_id=ANY($1::uuid[])',[customerIds]):Promise.resolve({rows:[]}),
  query(`SELECT d.scenario_id,COUNT(*)::int n FROM discovery_answers a JOIN discovery_sessions d ON d.id=a.session_id WHERE d.scenario_id=ANY($1::uuid[]) AND a.entered_by='prospect' GROUP BY d.scenario_id`,[ids]),
  includeHistory&&baseIds.length?query('SELECT h.*,s.base_id FROM scenario_stage_history h JOIN scenarios s ON s.id=h.scenario_id WHERE s.base_id=ANY($1::uuid[]) ORDER BY h.created_at DESC',[baseIds]):Promise.resolve({rows:[]}),
  includeHistory&&baseIds.length?query('SELECT o.*,u.username manager_name,s.base_id FROM stage_manager_overrides o JOIN users u ON u.id=o.manager_id JOIN scenarios s ON s.id=o.scenario_id WHERE s.base_id=ANY($1::uuid[]) ORDER BY o.created_at DESC',[baseIds]):Promise.resolve({rows:[]})
 ]);
 const govMap=new Map(gov.rows.map(x=>[key(x.scenario_id),x])),peopleMap=new Map(),planScenario=rowsBy(plans.rows.filter(p=>p.scenario_id),'scenario_id'),planCompany=new Map(),handoffMap=new Map(handoffs.rows.map(x=>[key(x.customer_id),x])),prospectMap=new Map(prospect.rows.map(x=>[key(x.scenario_id),x.n])),historyMap=rowsBy(history.rows,'base_id'),overrideMap=rowsBy(overrides.rows,'base_id');
 for(const person of people.rows){const k=companyOwnerKey(person.company,person.owner_id);peopleMap.set(k,[...(peopleMap.get(k)||[]),person]);}
 for(const plan of plans.rows){const k=companyOwnerKey(plan.company,plan.owner_id);if(!planCompany.has(k))planCompany.set(k,plan);}
 const result=new Map();for(const sc of list){const exact=planScenario.get(key(sc.id));result.set(key(sc.id),contextFrom({sc,cfg:cfg.rows,governance:govMap.get(key(sc.id)),people:peopleMap.get(companyOwnerKey(sc.company,sc.owner_id))||[],plan:exact?.[0]||planCompany.get(companyOwnerKey(sc.company,sc.owner_id)),handoff:sc.customer_id?handoffMap.get(key(sc.customer_id)):null,prospectInputs:prospectMap.get(key(sc.id)),history:historyMap.get(key(sc.base_id)),overrides:overrideMap.get(key(sc.base_id))}));}return result;
}

async function loadStageReadinessContext(id){
 const {rows}=await query(`SELECT s.id,s.base_id,s.owner_id,s.deal_stage,s.data,s.customer_id,s.company,u.username rep FROM scenarios s JOIN users u ON u.id=s.owner_id WHERE s.id=$1 AND s.deleted_at IS NULL`,[id]);
 if(!rows.length)return null;const map=await loadStageReadinessContexts(rows,{includeHistory:true});return map.get(key(id))||null;
}

function deriveStageReadiness(x,{now=new Date()}={}){const data=x.sc.data||{},e=x.gov.evidence||{},people=x.people,plan=x.plan,econ=people.some(p=>p.role==='economic_buyer'&&p.engaged),tech=people.some(p=>p.role==='technical_buyer'&&p.engaged),champ=people.some(p=>p.role==='champion'&&p.engaged);
 const maturityResult=evaluateRoiMaturity({scenarioData:data,evidence:e,stakeholders:people,now}),maturity=maturityResult.level;
 const commitmentResult=evaluateBuyerCommitment({evidence:e,stakeholders:people,plan,stageConfig:x.cfg,outcome:x.gov.outcome,now}),commitment=commitmentResult.level;
 const stages=x.cfg.map(stage=>{const criteria=(stage.criteria||[]).map(c=>{const saved=e[c.id]||{},evaluated=evaluateCriterionEvidence({criterion:c,scenarioData:data,roiMaturityDetails:maturityResult,stakeholders:people,solutionFit:x.handoff,jointPlan:plan,proposal:data.proposalDraft,competitive:{competitor:data.competitor},discovery:{prospectInputs:x.prospectInputs,threeWhysAct:data.threeWhysAct,threeWhysNow:data.threeWhysNow},savedEvidence:e,now});return{...c,...saved,...evaluated,criterionId:c.id,confidence:saved.confidence||(!evaluated.matched?'Low':evaluated.quality==='strong'?'High':'Medium')};}),required=criteria.filter(c=>c.required),done=required.filter(c=>c.complete).length;return{order:stage.stage_order,name:stage.stage_name,minimumRoiMaturity:stage.minimum_roi_maturity,minimumCommitment:stage.minimum_commitment,criteria,required:required.length,done,readiness:required.length?Math.round(done/required.length*100):100,ready:done===required.length&&maturity>=stage.minimum_roi_maturity&&(commitmentRank[commitment]||0)>=(commitmentRank[stage.minimum_commitment]||0)};});
 let supported=BUYCYCLE_MIN_STAGE;for(const st of stages.filter(s=>isActiveBuyCycleStage(s.order))){if(st.ready)supported=st.order;else break;}const official=resolvePersistedBuyCycleStage({currentStage:x.gov.current_stage,repAssessedStage:x.gov.rep_assessed_stage,dealStage:x.sc.deal_stage,dataDealStage:x.sc.data?.dealStage}),repAssessed=parseBuyCycleStage(x.gov.rep_assessed_stage,official),current=stages.find(s=>s.order===official)||stages.find(s=>s.order===BUYCYCLE_MIN_STAGE)||stages[0],gap=official-supported,nextStage=getNextActiveBuyCycleStage(official);
 const maturityBlockingReason=current&&maturity<current.minimumRoiMaturity?`ROI Maturity is Level ${maturity}. Stage ${official} requires Level ${current.minimumRoiMaturity} — ${['No Value Case','Seller Hypothesis','Customer Data','Customer Validated','Executive Approved'][current.minimumRoiMaturity]}.`:null;
 const commitmentBlockingReason=current&&(commitmentRank[commitment]||0)<(commitmentRank[current.minimumCommitment]||0)?`Buyer Commitment is ${commitmentResult.label}. Stage ${official} requires ${COMMITMENT_LABELS[current.minimumCommitment]||current.minimumCommitment}. ${commitmentResult.nextRequirement}`:null;
 const mandatoryCriteria=(current?.criteria||[]).filter(c=>c.required),blockingCriteria=mandatoryCriteria.filter(c=>!c.complete).map(c=>({id:c.criterionId,name:c.name,blockedBy:c.blockedBy||[],freshness:c.freshness||null,evidenceAgeDays:c.evidenceAgeDays??null,sourceSummary:c.sourceSummary||''}));
 const freshnessSummary=mandatoryCriteria.reduce((a,c)=>{if(c.freshness==='Aging')a.aging++;else if(c.freshness==='Stale')a.stale++;else if(c.freshness==='Needs Review')a.needsReview++;return a;},{aging:0,stale:0,needsReview:0});
 const dated=Object.values(e).map(v=>v&&v.evidenceDate).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))).sort();
 return{scenarioId:x.sc.id,company:x.sc.company,rep:x.sc.rep,currentStageNumber:official,repStage:repAssessed,evidenceStage:supported,stageGap:gap,alignmentRisk:gap>=2?'Red':gap===1?'Yellow':'Green',readiness:current?.readiness??null,readyToAdvance:nextStage!==null&&!!current?.ready&&supported>=official,roiMaturity:maturity,roiMaturityDetails:maturityResult,closePreview:finalValueCase({scenarioData:data,roiMaturityDetails:maturityResult}),maturityBlockingReason,commitmentStrength:commitment,commitmentDetails:commitmentResult,commitmentBlockingReason,stakeholderCoverage:{identified:people.length,required:official>=4?4:3,economicBuyer:econ,technicalOwner:tech,champion:champ},stakeholderOptions:people.map(p=>({id:p.id,name:p.name,title:p.title||'',role:p.role,engaged:!!p.engaged})),currentStage:current,mandatoryCriteria,blockingCriteria,freshnessSummary,latestBuyerEvidenceDate:dated.at(-1)||null,stages,history:x.history,overrides:x.overrides,evidence:e,meetingNotes:x.gov.meeting_notes||'',certifications:x.gov.certifications||{},opportunityProfile:x.gov.opportunity_profile||{},outcome:x.gov.outcome||null,stageAtLoss:x.gov.stage_at_loss||null,outcomeDetails:x.gov.outcome_details||{},setupNeeded:!!x.gov.legacy_setup_needed,daysInStage:Math.max(0,Math.floor((now-new Date(x.gov.stage_entered_at||now))/86400000))};}

function liveReadinessSummary(a){return{currentStage:a.currentStageNumber,currentStageName:a.currentStage?.name||'',repAssessmentStage:a.repStage,evidenceStage:a.evidenceStage,stageGap:a.stageGap,alignmentRisk:a.alignmentRisk,readiness:a.readiness,readyToAdvance:a.readyToAdvance,roiMaturity:a.roiMaturity,roiMaturityBlockingReason:a.maturityBlockingReason,buyerCommitment:a.commitmentStrength,buyerCommitmentLabel:a.commitmentDetails?.label||a.commitmentStrength,buyerCommitmentBlockingReason:a.commitmentBlockingReason,stakeholderCoverage:a.stakeholderCoverage,daysInStage:a.daysInStage,mandatoryCriteria:a.mandatoryCriteria?.map(c=>({id:c.criterionId,name:c.name,complete:!!c.complete,freshness:c.freshness||null}))||[],blockingCriteria:a.blockingCriteria||[],freshnessSummary:a.freshnessSummary,latestBuyerEvidenceDate:a.latestBuyerEvidenceDate,setupNeeded:a.setupNeeded,outcome:a.outcome,stageAtLoss:a.stageAtLoss,outcomeDetails:a.outcomeDetails};}

async function evaluateLiveStageReadinessBatch(scenarios,options={}){const contexts=await loadStageReadinessContexts(scenarios,options),out=new Map();for(const [id,ctx] of contexts)out.set(id,deriveStageReadiness(ctx,options));return out;}

module.exports={loadStageReadinessContext,loadStageReadinessContexts,deriveStageReadiness,evaluateLiveStageReadinessBatch,liveReadinessSummary};
