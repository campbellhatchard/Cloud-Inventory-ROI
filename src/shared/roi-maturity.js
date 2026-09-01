/* Authoritative ROI maturity evaluation. This classifies customer ownership of
   the existing economic model; it never changes ROI formulas or stage state. */
const {calcROI}=require('./roi-engine');
const {evaluateEvidenceFreshness,ROI_EVIDENCE_FRESHNESS_DAYS}=require('./evidence-freshness');
const {sameValue,freshness:roiValueFreshness}=require('./value-history');

const CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD=0.50;
const ROI_MATURITY_LEVELS=Object.freeze({
  0:'No Value Case',1:'Seller Hypothesis',2:'Customer Data',
  3:'Customer Validated',4:'Executive Approved'
});
const ROI_VALUE_CASE_VALIDATION='roi_value_case_validation';
const ROI_EXECUTIVE_APPROVAL='roi_executive_approval';
const LEGACY_VALIDATION_IDS=Object.freeze(['roi_customer','business_case']);

const VALUE_DRIVER_PROVENANCE_MAP=Object.freeze({
  laborSav:{label:'Labor productivity',baselineFields:d=>d.modelVersion>=25&&Number(d.laborWastePct)>0?['userCount','laborCost','laborWastePct']:['userCount','laborCost']},
  shrinkSav:{label:'Shrinkage / write-off reduction',baselineFields:d=>Number(d.annualWriteOff)>0?['annualWriteOff']:['inventoryValue','m_shrinkRate']},
  carrySav:{label:'Inventory carrying cost',baselineFields:()=>['inventoryValue']},
  turnsSav:{label:'Inventory turns',baselineFields:()=>['inventoryValue','invTurnsCurrent']},
  otifSav:{label:'Recovered contribution margin',baselineFields:d=>Number(d.modelVersion)>=28?(Number(d.lostSalesYr)>0?['lostSalesYr','contributionMarginPct']:['revenue','otifBaseline','otifTarget','contributionMarginPct']):['revenue','otifBaseline'],evaluateSupport:({scenarioData,fieldSupport})=>{
    if(Number(scenarioData.modelVersion)>=28){const direct=Number(scenarioData.lostSalesYr)>0;const customerSupported=fieldSupport.length>0&&fieldSupport.every(x=>x.supported);return {customerSupported,calculationMode:direct?'direct lost-sales contribution margin':'modeled OTIF-gap contribution margin',supportReason:customerSupported?'The service baseline and contribution margin have customer provenance.':'Customer provenance is required for the service baseline and contribution margin.'};}
    const customerBaselineMode=Number(scenarioData.otifBaseline)>0&&Number(scenarioData.otifTarget)>Number(scenarioData.otifBaseline);
    if(!customerBaselineMode)return {customerSupported:false,calculationMode:'industry-risk fallback',supportReason:'Current customer OTIF/service-performance baseline has not been established. The model is using the industry-risk fallback.'};
    const customerSupported=fieldSupport.every(x=>x.supported);
    return {customerSupported,calculationMode:'customer baseline and target gap',supportReason:customerSupported?'Revenue and the current customer OTIF baseline have customer provenance.':'Customer provenance is required for both revenue and the current OTIF baseline.'};
  }},
  itSav:{label:'IT cost displacement',baselineFields:()=>['itCost']},
  downtimeSav:{label:'Downtime reduction',baselineFields:()=>['downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr']},
  expediteSav:{label:'Expedite spend reduction',baselineFields:()=>['expediteSpendYr']},
  countSav:{label:'Physical-count labor',baselineFields:()=>['countDaysYr','countPeople','laborCost']},
  throughputSav:{label:'Warehouse throughput',baselineFields:()=>['ordersPerYr','costPerOrder']},
  accuracySav:{label:'Order accuracy',baselineFields:()=>['ordersPerYr','orderErrorPct','costPerError']},
  fiLeakageSav:{label:'Field inventory leakage',baselineFields:()=>['fieldInvValue','fieldLeakageRate']},
  fiCarrySav:{label:'Field inventory carrying cost',baselineFields:()=>['fieldInvValue']},
  fiCountSav:{label:'Field reconciliation labor',baselineFields:d=>Number(d.modelVersion)>=28?['fieldLocations','fieldReconcilePerYr','fieldReconcilePersonHours','laborCost']:['fieldLocations','fieldReconcileCost','fieldReconcilePerYr']},
  servicePenaltySav:{label:'Service penalties / credits',baselineFields:()=>['servicePenaltyCostYr']},
  firstFixSav:{label:'First-time-fix / truck rolls',baselineFields:()=>['repeatVisitsYr','costPerTruckRoll']}
});

const present=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
function customerFieldSupport(field,scenarioData){
  const state=(scenarioData.fieldStates||{})[field];
  const provenance=(scenarioData.fieldProvenance||{})[field]||{},hasLineage=!!provenance.eventId;
  if(state==='confirmed_prospect'){
    if(!hasLineage)return {supported:true,state,label:'Prospect Verified',legacy:true,reason:'Legacy scenario provenance; original immutable submission may be unavailable'};
    const f=roiValueFreshness(provenance.date),matches=sameValue(scenarioData[field],provenance.value??scenarioData[field]),supported=matches&&f.customerSupported;
    return {supported,state,label:'Prospect Verified',provenance,freshness:f,reason:!matches?'Current value differs from its prospect event':f.status==='Stale'?'Prospect evidence is stale — revalidate':'Customer-supported lineage is current'};
  }
  if(state==='confirmed_customer'){
    if(!hasLineage){const supported=present(provenance.source)&&present(provenance.date);return {supported,state,label:'Customer Provided',provenance,legacy:true,reason:supported?'Legacy customer provenance':'Source and date are required'};}
    const f=roiValueFreshness(provenance.date),matches=sameValue(scenarioData[field],provenance.value??scenarioData[field]),supported=matches&&f.customerSupported;
    return {supported,state,label:'Customer Revalidated',provenance,freshness:f,reason:!matches?'Current value differs from its customer event':f.status==='Stale'?'Customer evidence is stale — revalidate':f.status==='Aging'?'Revalidation recommended':'Customer-supported lineage is current'};
  }
  return {supported:false,state:state||((scenarioData.confidence||[]).includes(field)?'confirmed':''),label:state==='confirmed'?'Rep Confirmed':'Rep Estimate'};
}
function structuredValidation(item,{legacy=false}={}){
  if(!item||item.customerValidated!==true)return false;
  const complete=present(item.stakeholder)&&present(item.evidenceDate)&&present(item.source)&&present(item.evidence);
  if(!complete)return false;
  return !legacy||['moderate','strong'].includes(String(item.quality||'').toLowerCase());
}
function validationEvidence(evidence,stakeholders,now){
  const current=evidence[ROI_VALUE_CASE_VALIDATION];
  const stakeholder=current&&stakeholders.find(s=>String(s.id)===String(current.stakeholderId));
  const freshness=evaluateEvidenceFreshness({evidenceDate:current&&current.evidenceDate,freshnessDays:ROI_EVIDENCE_FRESHNESS_DAYS[ROI_VALUE_CASE_VALIDATION],now});
  const freshnessValid=['Current','Aging'].includes(freshness.status);
  if(structuredValidation(current)&&stakeholder&&freshnessValid)return {complete:true,legacy:false,evidenceId:ROI_VALUE_CASE_VALIDATION,item:current,freshness,stakeholder:{id:stakeholder.id,name:stakeholder.name,title:stakeholder.title||'',role:stakeholder.role}};
  for(const id of LEGACY_VALIDATION_IDS){const item=evidence[id],legacyFreshness=evaluateEvidenceFreshness({evidenceDate:item&&item.evidenceDate,freshnessDays:ROI_EVIDENCE_FRESHNESS_DAYS[ROI_VALUE_CASE_VALIDATION],now});if(structuredValidation(item,{legacy:true})&&['Current','Aging'].includes(legacyFreshness.status))return {complete:true,legacy:true,evidenceId:id,item,freshness:legacyFreshness};}
  const reason=current&&freshness.status==='Stale'?'Customer value-case validation is stale and should be reconfirmed.':current&&freshness.status==='Needs Review'?'Customer value-case validation needs an Evidence Date.':current&&!stakeholder?'Customer validation must be associated with a mapped stakeholder':'Structured customer validation has not been captured';
  return {complete:false,legacy:false,evidenceId:ROI_VALUE_CASE_VALIDATION,item:current||null,freshness,reason};
}
function approvalEvidence(evidence,stakeholders,now){
  const item=evidence[ROI_EXECUTIVE_APPROVAL]||null;
  const stakeholder=item&&stakeholders.find(s=>String(s.id)===String(item.stakeholderId));
  const freshness=evaluateEvidenceFreshness({evidenceDate:item&&item.evidenceDate,freshnessDays:ROI_EVIDENCE_FRESHNESS_DAYS[ROI_EXECUTIVE_APPROVAL],now}),freshnessValid=['Current','Aging'].includes(freshness.status);
  const complete=structuredValidation(item)&&!!stakeholder&&stakeholder.role==='economic_buyer'&&freshnessValid;
  return {complete,evidenceId:ROI_EXECUTIVE_APPROVAL,item,freshness,stakeholder:stakeholder?{id:stakeholder.id,name:stakeholder.name,title:stakeholder.title||'',role:stakeholder.role}:null,
    reason:complete?'':item&&freshness.status==='Stale'?'Economic Buyer approval is stale and should be reconfirmed.':item&&freshness.status==='Needs Review'?'Economic Buyer approval needs an Evidence Date.':!item?'Executive approval has not been captured':!stakeholder||stakeholder.role!=='economic_buyer'?'Executive approval must be associated with the mapped Economic Buyer':'Approval evidence, source, stakeholder, and date are required'};
}
function evaluateRoiMaturity({scenarioData={},evidence={},stakeholders=[],now=new Date()}={}){
  const metrics=calcROI(scenarioData||{}),annualBenefit=Number(metrics.annualBenefit)||0;
  const activeDrivers=[];
  for(const [key,definition] of Object.entries(VALUE_DRIVER_PROVENANCE_MAP)){
    if(Number(scenarioData.modelVersion)>=28&&key==='throughputSav')continue;
    const annualValue=Number(Number(scenarioData.modelVersion)>=28&&key==='laborSav'?metrics.countedProductivitySav:metrics[key])||0;if(annualValue<=0)continue;
    const baselineFields=definition.baselineFields(scenarioData);
    const fieldSupport=baselineFields.map(field=>({field,...customerFieldSupport(field,scenarioData)}));
    const defaultSupported=fieldSupport.length>0&&fieldSupport.every(x=>x.supported);
    const evaluation=definition.evaluateSupport?definition.evaluateSupport({scenarioData,fieldSupport,annualValue}):{customerSupported:defaultSupported,supportReason:defaultSupported?'All required current-state baselines have customer provenance.':'One or more required current-state baselines lack customer provenance.'};
    const customerSupported=!!evaluation.customerSupported;
    const displayFieldSupport=key==='otifSav'&&evaluation.calculationMode==='industry-risk fallback'?fieldSupport.map(x=>x.field==='otifBaseline'?{...x,sourceField:x.field,field:evaluation.supportReason}:x):fieldSupport;
    activeDrivers.push({key,label:definition.label,annualValue,baselineFields,fieldSupport:displayFieldSupport,customerSupported,supportReason:evaluation.supportReason,calculationMode:evaluation.calculationMode||'standard'});
  }
  const customerSupportedAnnualValue=activeDrivers.filter(x=>x.customerSupported).reduce((sum,x)=>sum+x.annualValue,0);
  const coverageRatio=annualBenefit>0?Math.min(1,customerSupportedAnnualValue/annualBenefit):0;
  const customerSupportedValuePct=Math.round(coverageRatio*100);
  const customerDataComplete=annualBenefit>0&&coverageRatio>=CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD;
  const validation=validationEvidence(evidence||{},stakeholders||[],now),approval=approvalEvidence(evidence||{},stakeholders||[],now);
  let level=annualBenefit>0?1:0;
  if(customerDataComplete)level=2;
  if(level>=2&&validation.complete)level=3;
  if(level>=3&&approval.complete)level=4;
  const next={
    0:[1,'Create a quantified economic value case.'],
    1:[2,`Support at least ${Math.round(CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD*100)}% of modeled annual value with customer-provided baseline data.`],
    2:[3,'Validate the material assumptions and business value with a named customer stakeholder.'],
    3:[4,'Capture explicit value-case approval from the mapped Economic Buyer.'],
    4:[null,'The Economic Buyer has approved the value case.']
  }[level];
  return {level,label:ROI_MATURITY_LEVELS[level],annualBenefit,customerSupportedAnnualValue,customerSupportedValuePct,
    customerDataCoverageThresholdPct:Math.round(CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD*100),
    activeDrivers,customerSupportedDrivers:activeDrivers.filter(x=>x.customerSupported),unsupportedDrivers:activeDrivers.filter(x=>!x.customerSupported),
    customerValidation:{...validation,complete:level>=2&&validation.complete},executiveApproval:{...approval,complete:level>=3&&approval.complete},
    nextLevel:next[0],nextRequirement:next[1],provenanceNeedsReview:annualBenefit>0&&!Object.keys(scenarioData.fieldStates||{}).length};
}

module.exports={CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD,ROI_MATURITY_LEVELS,ROI_VALUE_CASE_VALIDATION,ROI_EXECUTIVE_APPROVAL,LEGACY_VALIDATION_IDS,VALUE_DRIVER_PROVENANCE_MAP,customerFieldSupport,evaluateRoiMaturity};
