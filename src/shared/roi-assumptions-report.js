'use strict';
const {buildExecutiveValueStory}=require('./executive-value-story');
const {customerFieldSupport}=require('./roi-maturity');
const {normalizeExternalNumber}=require('./scenario-input-storage');
const {INPUTS,DRIVERS,inputsForDriver,presentationForDriver,savedModelVersion,roiModelLabel}=require('./roi-assumptions-metadata');

const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const strictValue=(data,key,definition)=>{
 const storageKey=definition.storageKey||key;
 if(!hasOwn(data,storageKey))return null;
 const value=normalizeExternalNumber(data[storageKey]);
 return value===null?null:value*(definition.scale||1);
};
function provenanceFor(data,key,definition){
 if(definition.assumption)return{source:'Model Assumption',supportStatus:'Model Assumption',customerSupported:false};
 const state=(data.fieldStates||{})[key]||'',support=customerFieldSupport(key,data);
 if(state==='confirmed_prospect')return{source:'Prospect Submitted',supportStatus:support.supported?'Customer Supported':'Needs Revalidation',customerSupported:!!support.supported};
 if(state==='confirmed_customer')return{source:'Customer Revalidated',supportStatus:support.supported?'Customer Supported':'Needs Revalidation',customerSupported:!!support.supported};
 if(state==='confirmed')return{source:'Rep Confirmed',supportStatus:'Rep Validated',customerSupported:false};
 return{source:'Rep Estimate',supportStatus:'Not Yet Customer-Supported',customerSupported:false};
}
function overlapNote(formulaId,roi,modelVersion=28){
 if(modelVersion<28&&formulaId==='workforce_productivity')return'The saved legacy model treats labor recovery and warehouse throughput as separate additive benefit categories. This report preserves that saved methodology without changing the calculation.';
 if(modelVersion<28&&formulaId==='service_revenue_margin')return'';
 const pool={inventory_carrying:'inventory_carrying',workforce_productivity:'workforce_productivity',service_revenue_margin:'service_revenue'}[formulaId];
 const adjustment=(roi.overlapAdjustments||[]).find(x=>x.pool===pool);
 if(!adjustment)return'';
 if(Number(adjustment.removedValue)>0)return formulaId==='inventory_carrying'
  ?'Overlapping carrying-cost and inventory-turns estimates are included only once in total modeled benefit.'
  :formulaId==='workforce_productivity'?'The governed productivity method is included once to prevent overlap between labor-recovery and throughput-capacity estimates.'
  :'The governed service-revenue method is included once to prevent overlap between direct lost-sales and service-gap estimates.';
 return'Included once in total modeled benefit under the ROI Model v2.8 overlap controls.';
}
function buildInput(data,key,driver,roi){
 const baseDefinition=INPUTS[key];if(!baseDefinition)return null;
 const explicitRecovery=key==='mShrinkage'?(data.mShrinkageExplicit===true||data.explicitRecoveryInputs?.includes('mShrinkage')):key==='mCarrying'?(data.mCarryingExplicit===true||data.explicitRecoveryInputs?.includes('mCarrying')):false;
 const definition=explicitRecovery?{...baseDefinition,assumption:false}:baseDefinition;
 let value=strictValue(data,key,definition);
 if(key==='mShrinkage'&&!explicitRecovery)value=roi.effectiveShrinkRecovery*100;
 if(key==='mCarrying'&&!explicitRecovery)value=roi.effectiveCarryingRecovery*100;
 if(value===null)return null;
 const provenance=provenanceFor(data,key,definition);
 return{label:definition.label,value,format:definition.format,unit:definition.unit,source:provenance.source,supportStatus:provenance.supportStatus,customerSupported:provenance.customerSupported,usedIn:driver.label,calculationBasis:driver.basis};
}
function buildRoiAssumptionsReportBundle(source={}){
 if(!source.scenario?.id)throw Object.assign(new Error('A saved scenario is required.'),{status:400});
 const story=buildExecutiveValueStory(source,{includeAuthoritativeCalculation:true}),roi=story.authoritativeRoi,data=source.scenario.data||{};
 if(!roi||!Array.isArray(roi.activeValueDrivers))throw new Error('Authoritative ROI results are unavailable.');
 const modelVersion=savedModelVersion(data),modelLabel=roiModelLabel(data),activeResults=roi.activeValueDrivers.slice();
 /* v2.6/v2.7 counted throughput separately from labor but did not expose it
    in activeValueDrivers. Use the engine-owned result so a legacy report can
    reconcile without reproducing or changing the calculation. */
 if(modelVersion<28&&Number(roi.throughputSav)>0)activeResults.push({formulaId:'workforce_productivity',label:'Warehouse throughput — legacy saved model',annualValue:Number(roi.throughputSav),economicClass:'capacity_value',counted:true,reportMethod:'throughput'});
 const drivers=activeResults.map(result=>{
  const inputRoi=result.reportMethod?{...roi,productivityMethodUsed:result.reportMethod}:roi;
  const metadata=presentationForDriver(result.formulaId,inputRoi,data);
  if(!metadata)throw new Error(`Customer-safe methodology metadata is unavailable for ${result.formulaId}.`);
  const inputs=inputsForDriver(result.formulaId,inputRoi,data).map(key=>buildInput(data,key,metadata,roi)).filter(Boolean);
  const counts=inputs.reduce((out,row)=>{if(row.customerSupported)out.customerSupported++;else if(row.source==='Model Assumption')out.modelAssumptions++;else if(row.source==='Rep Confirmed')out.repValidated++;else if(row.source==='Rep Estimate')out.repEstimates++;else out.needsRevalidation++;return out;},{customerSupported:0,repValidated:0,repEstimates:0,modelAssumptions:0,needsRevalidation:0});
  const label=modelVersion<28&&result.formulaId==='service_revenue_margin'?metadata.label:(result.label||metadata.label);
  return{label,calculationBasis:metadata.basis,annualBenefit:result.annualValue,economicClass:result.economicClass,includedInTotal:result.counted===true,inputs,evidenceSummary:counts,overlapNote:overlapNote(result.formulaId,roi,modelVersion)};
 });
 const displayedTotal=drivers.filter(x=>x.includedInTotal).reduce((sum,x)=>sum+Number(x.annualBenefit),0),tolerance=Math.max(.01,Math.abs(Number(roi.annualBenefit))*.000000001);
 if(Math.abs(displayedTotal-Number(roi.annualBenefit))>tolerance)throw new Error('Displayed value drivers do not reconcile to the authoritative Annual Customer Benefit.');
 const inputs=[];for(const driver of drivers)for(const row of driver.inputs){const signature=[row.label,row.value,row.source].join('|');const existing=inputs.find(x=>x._signature===signature);if(existing){if(!existing.usedIn.includes(driver.label))existing.usedIn.push(driver.label);}else inputs.push({...row,usedIn:[driver.label],_signature:signature});}
 const contractDriver={label:'Contract Economics',basis:'Saved commercial assumptions and benefit-realization timing are applied by ROI Model v2.8 to the authoritative annual benefits.'};
 for(const key of ['contractMonths','invest','otc','discRate','implMonths','ramp1','ramp2','ramp3']){const row=buildInput(data,key,contractDriver,roi);if(row)inputs.push({...row,usedIn:[contractDriver.label],_signature:`contract|${key}`});}
 const safeInputs=inputs.map(({_signature,...row})=>row);
 const summary={annualCustomerBenefit:roi.annualBenefit,totalContractBenefit:roi.totalContractBenefit,modeledCustomerInvestment:story.economics.investmentEstablished?roi.totalContractInvestment:null,netEconomicBenefit:roi.totalContractNetBenefit,contractRoi:roi.totalContractRoi,paybackMonths:roi.contractPayback,npv:roi.totalContractNpv,contractMonths:roi.contractMonths,currency:story.meta.currency};
 const sourceCounts=safeInputs.reduce((out,row)=>{out[row.source]=(out[row.source]||0)+1;return out;},{}),needsRevalidation=safeInputs.filter(x=>!x.customerSupported&&['Prospect Submitted','Customer Revalidated'].includes(x.source)).length;
 const modelNote=modelVersion>=28?'Benefits are calculated using Cloud Inventory ROI Model v2.8.':`This saved scenario uses ${modelLabel}. Its original authoritative economics are preserved; upgrading to ROI Model v2.8 requires a new scenario version.`;
 const report={title:'ROI Assumptions & Results Summary',subtitle:'Business Case Transparency',identity:{customer:story.meta.customer,scenario:String(source.scenario.name||data.name||'Saved scenario'),scenarioVersion:story.meta.scenarioVersion,generatedAt:story.meta.generatedAt,currency:story.meta.currency,contractMonths:roi.contractMonths,modelVersion},summary,sourceSummary:{totalInputs:safeInputs.length,customerSupported:safeInputs.filter(x=>x.customerSupported).length,needsRevalidation,repValidated:safeInputs.filter(x=>x.source==='Rep Confirmed').length,repEstimates:safeInputs.filter(x=>x.source==='Rep Estimate').length,modelAssumptions:safeInputs.filter(x=>x.source==='Model Assumption').length,bySource:sourceCounts},inputs:safeInputs,drivers,methodologyNotes:['Customer-supported values reflect information provided or revalidated through the business-case process.','Prospect-submitted or customer-revalidated values marked Needs Revalidation retain their customer source but are not counted as currently customer-supported.','Rep Confirmed values have been reviewed internally but do not represent customer validation.','Model Assumptions are Cloud Inventory modeling assumptions used where customer-specific data is unavailable.',modelNote,'Overlapping benefit categories are controlled to avoid double counting.','Modeled results are estimates based on the saved inputs and assumptions shown in this report.'],authority:{roiModel:modelLabel,reconciledAnnualBenefit:true}};
 return{report,story};
}
function buildRoiAssumptionsReportModel(source){return buildRoiAssumptionsReportBundle(source).report;}
module.exports={buildRoiAssumptionsReportBundle,buildRoiAssumptionsReportModel,provenanceFor};
