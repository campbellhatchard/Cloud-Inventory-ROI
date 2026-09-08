'use strict';
const {buildExecutiveValueStory}=require('./executive-value-story');
const {evaluateExecutiveOutputReadiness}=require('./executive-output-readiness');
const str=v=>String(v??'');
const arr=v=>Array.isArray(v)?v:[];
// Explicit projection: no raw scenario, evidence, proposal or internal findings.
function customerPayload(story,readiness,publishedAt){
 const e=story.economics;
 return {schemaVersion:1,customer:str(story.meta.customer),currency:str(story.meta.currency),scenarioVersion:story.meta.scenarioVersion,storyRevision:story.storyRevision,modelVersion:story.meta.modelVersion,publishedAt,
  readiness:{status:readiness.status,label:readiness.label},
  threeWhys:Object.fromEntries(['whyChange','whyNow','whyCloudInventory'].map(k=>[k,str(story.threeWhys[k]?.value)])),
  economics:Object.fromEntries(['annualBenefit','totalContractBenefit','totalContractInvestment','netEconomicBenefit','contractRoi','npv','payback','contractMonths'].map(k=>[k,e[k]])),
  drivers:arr(e.activeDrivers).map(d=>({label:str(d.label),annualValue:d.annualValue,status:d.customerSupported?'Customer provided':'Cloud Inventory model assumption — validate'})),
  nextSteps:arr(story.nextSteps?.items).map(s=>({milestone:str(s.milestone),owner:str(s.owner),dueDate:str(s.dueDate)}))};
}
async function preparePublication({user,scenarioId,reviewAcknowledged,loadSource,customerAccess}){
 const source=await loadSource(user,scenarioId);
 if(source.error)throw Object.assign(new Error(source.error),{status:source.status});
 if(!source.scenario.customer_id)throw Object.assign(new Error('An authorized customer is required before publishing.'),{status:409});
 const access=await customerAccess(user,source.scenario.customer_id,'view');
 if(!access.exists||!access.allowed)throw Object.assign(new Error('Customer access denied.'),{status:403});
 const story=buildExecutiveValueStory(source),readiness=evaluateExecutiveOutputReadiness(story,{outputType:'share'});
 if(readiness.status==='draft_only'||(readiness.status==='review'&&reviewAcknowledged!==true))throw Object.assign(new Error(readiness.status==='draft_only'?'Draft Only business cases cannot be published.':'Review acknowledgement is required before publication.'),{status:409,readiness});
 const publishedAt=new Date().toISOString();
 return {scenario:source.scenario,story,readiness,publishedAt,payload:customerPayload(story,readiness,publishedAt)};
}
module.exports={customerPayload,preparePublication};
