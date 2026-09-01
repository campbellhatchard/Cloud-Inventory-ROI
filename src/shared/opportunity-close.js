/* Governed opportunity-close rules. Pure functions keep the API authoritative
   and make every Won/Lost rule independently testable. */
const {calcROI}=require('./roi-engine');

const LOSS_REASONS=Object.freeze({
  competitor:'Competitor',no_decision:'No Decision',budget:'Budget',timing:'Timing',
  product_fit:'Product Fit',technical_fit:'Technical Fit',implementation_risk:'Implementation Risk',
  price:'Price',internal_build:'Internal Build',status_quo:'Status Quo',executive_decision:'Executive Decision',
  procurement:'Procurement',project_cancelled:'Project Cancelled',other:'Other'
});
const WON_CERTIFICATIONS=Object.freeze(['agreementExecuted','finalInformationAccurate','finalRoiConfirmed','handoffReady','outcomesSoldConfirmed']);
const TECHNICAL_CAPABILITY=Object.freeze(['yes','partially','no','unknown']);
const ROI_FIELD_KEYS=Object.freeze({userCount:'users',laborCost:'labor',inventoryValue:'inventory',m_shrinkRate:'shrinkRate'});
const dateOnly=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):null;
const todayUtc=now=>{const d=new Date(now||Date.now());return d.toISOString().slice(0,10);};
function validateCloseDate(value,now){const closeDate=dateOnly(value),parsed=closeDate&&new Date(`${closeDate}T00:00:00Z`);if(!closeDate||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==closeDate)return {valid:false,error:'Close Date must be a valid date.'};if(closeDate>todayUtc(now))return {valid:false,error:'Close Date cannot be in the future.'};return {valid:true,closeDate};}
function activeException(overrides=[],stage6,now=new Date()){
  const missing=(stage6?.criteria||[]).filter(c=>c.required&&!c.complete),ids=new Set(['stage_6','stage_6_readiness','closed_won',...missing.flatMap(c=>[String(c.id),String(c.name).toLowerCase()])]);
  return (overrides||[]).find(o=>o.id&&o.manager_id&&o.risk_acknowledged===true&&new Date(o.expires_at)>=new Date(now)&&ids.has(String(o.missing_criterion||'').toLowerCase()))||null;
}
function validateCloseRequest({body={},assessment={},overrides=[],now=new Date()}={}){
  const outcome=String(body.outcome||'').toLowerCase(),errors=[];
  if(!['won','lost'].includes(outcome))errors.push('Outcome must be Won or Lost.');
  const date=validateCloseDate(body.closeDate,now);if(!date.valid)errors.push(date.error);
  const stage=Number(assessment.currentStageNumber),stage6=(assessment.stages||[]).find(s=>Number(s.order)===6),exception=activeException(overrides,stage6,now);
  if(outcome==='lost'){
    if(stage<2||stage>6)errors.push('Closed Lost is available only from active BuyCycle Stages 2–6.');
    if(!Object.hasOwn(LOSS_REASONS,body.primaryLossReason))errors.push('Select a valid Primary Loss Reason.');
    if(!String(body.customerFeedback||'').trim())errors.push('Customer Feedback / Why We Lost is required.');
    if(body.primaryLossReason==='competitor'&&!String(body.competitor||'').trim())errors.push('Winning Competitor is required when the Primary Loss Reason is Competitor.');
    if(body.technicalCapability&&!TECHNICAL_CAPABILITY.includes(String(body.technicalCapability).toLowerCase()))errors.push('Technical capability must be Yes, Partially, No, or Unknown.');
  }
  if(outcome==='won'){
    if(!stage6)errors.push('Stage 6 readiness could not be evaluated.');
    const needsException=stage!==6||!stage6?.ready;
    if(needsException&&!exception)errors.push(stage!==6?'Closed Won requires Stage 6 — Select Vendor Solution. Advance through the governed BuyCycle process or use an approved Manager Exception.':'Stage 6 readiness is incomplete and no active Manager Exception covers the readiness gap.');
    for(const key of WON_CERTIFICATIONS)if(body.closeCertifications?.[key]!==true)errors.push(`Closed Won certification is required: ${key}.`);
    if(needsException&&body.managerExceptionAcknowledged!==true)errors.push('Acknowledge the approved Manager Exception before closing Won.');
  }
  return {valid:errors.length===0,errors,error:errors[0]||null,outcome,closeDate:date.closeDate||null,stage6,exception,needsException:outcome==='won'&&(stage!==6||!stage6?.ready)};
}
function finalValueCase({scenarioData={},roiMaturityDetails={}}={}){
  const metrics=calcROI(scenarioData),drivers=(roiMaturityDetails.activeDrivers||[]).map(d=>({key:d.key,label:d.label,annualValue:d.annualValue,customerSupported:!!d.customerSupported,baselines:(d.fieldSupport||[]).map(f=>({field:f.field,value:scenarioData[ROI_FIELD_KEYS[f.field]||f.field],supported:!!f.supported,state:f.state||null,label:f.label||null}))}));
  return {annualBenefit:metrics.annualBenefit,totalContractBenefit:metrics.totalContractBenefit,totalContractInvestment:metrics.totalContractInvestment,totalContractNetBenefit:metrics.totalContractNetBenefit,totalContractRoi:metrics.totalContractRoi,paybackMonths:metrics.contractPayback,totalContractNpv:metrics.totalContractNpv,modelVersion:scenarioData.modelVersion||null,contractMonths:metrics.contractMonths,roiMaturity:roiMaturityDetails.level??null,roiMaturityLabel:roiMaturityDetails.label||null,customerSupportedValuePct:roiMaturityDetails.customerSupportedValuePct??null,valueDrivers:drivers};
}
function stakeholderSnapshot(stakeholders=[]){return (stakeholders||[]).map(s=>({id:s.id,name:s.name,title:s.title||null,role:s.role||null,engaged:!!s.engaged}));}

module.exports={LOSS_REASONS,WON_CERTIFICATIONS,TECHNICAL_CAPABILITY,validateCloseDate,activeException,validateCloseRequest,finalValueCase,stakeholderSnapshot};
