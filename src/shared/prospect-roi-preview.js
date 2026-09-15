'use strict';
/* Server authority for the Prospect Link economic preview. The public route
   receives only the allow-listed projection returned by buildProspectPreview. */
const {calcROI}=require('./roi-engine');
const DEFAULTS=Object.freeze({
 distribution:{labor:52000,mLabor:.20,mShrinkage:.30,mCarrying:.20,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:10,discRate:.10},
 construction:{labor:65000,mLabor:.22,mShrinkage:.35,mCarrying:.20,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:8,discRate:.10},
 mfg:{labor:58000,mLabor:.20,mShrinkage:.30,mCarrying:.20,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:12,discRate:.10},
 telecom:{labor:72000,mLabor:.20,mShrinkage:.30,mCarrying:.20,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:8,discRate:.10},
 oil:{labor:85000,mLabor:.20,mShrinkage:.28,mCarrying:.22,carryRate:.28,mOtif:.10,mIt:.50,invTurnsBenchmark:6,discRate:.12},
 food:{labor:48000,mLabor:.20,mShrinkage:.35,mCarrying:.18,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:15,discRate:.10},
 retail:{labor:42000,mLabor:.18,mShrinkage:.35,mCarrying:.18,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:10,discRate:.10},
 default:{labor:52000,mLabor:.20,mShrinkage:.30,mCarrying:.20,carryRate:.25,mOtif:.10,mIt:.50,invTurnsBenchmark:10,discRate:.10}
});
const DRIVER_FIELDS=Object.freeze({labor:['users'],shrinkage:['annualWriteOff','inventory'],carrying:['inventory'],otif:['revenue','otifBaseline','otifTarget'],expedite:['expediteSpendYr'],downtime:['downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr'],it:['itCost'],counting:['countDaysYr','countPeople'],throughput:['ordersPerYr','costPerOrder','pickRateGainPct'],accuracy:['ordersPerYr','orderErrorPct','costPerError'],field_inventory:['fieldInvValue','fieldLocations']});
const DRIVER_RESULTS=Object.freeze({labor:'laborSav',shrinkage:'shrinkSav',carrying:'inventoryCarrySav',otif:'otifSav',expedite:'expediteSav',downtime:'downtimeSav',it:'itSav',counting:'countSav',throughput:'throughputSav',accuracy:'accuracySav',field_inventory:'fieldInvSav'});
const LABELS=Object.freeze({labor:'Labor productivity',shrinkage:'Shrinkage reduction',carrying:'Inventory carrying / turns',otif:'OTIF / order accuracy',expedite:'Expedite spend',downtime:'Downtime reduction',it:'IT cost displacement',counting:'Count and reconciliation labor',throughput:'Warehouse throughput',accuracy:'Order-error reduction',field_inventory:'Field inventory control'});
const cleanNumber=v=>{const n=Number(String(v??'').replace(/[$,%\s,]/g,''));return Number.isFinite(n)&&n>=0?n:null;};
function buildProspectPreview({industry='default',currency='USD',questions=[],answers=[],scenarioData={}}={}){
 const def=DEFAULTS[industry]||DEFAULTS.default,byQuestion=new Map(answers.map(a=>[String(a.question_id||a.questionId),a.answer])),input={},supported=new Set();
 for(const q of questions){if(!q.canonical_input)continue;let n=cleanNumber(byQuestion.get(String(q.question_id)));if(n===null)continue;if(q.conversion==='hoursPerWeek')n=Math.min(100,(n/40)*100);input[q.canonical_input==='userCount'?'users':q.canonical_input==='inventoryValue'?'inventory':q.canonical_input==='laborCost'?'labor':q.canonical_input]=q.unit==='percent'?n/100:n;supported.add(q.canonical_input==='userCount'?'users':q.canonical_input==='inventoryValue'?'inventory':q.canonical_input==='laborCost'?'labor':q.canonical_input);}
 Object.assign(input,{modelVersion:28,labor:input.labor||def.labor,mLabor:def.mLabor,mShrinkage:def.mShrinkage,mCarrying:def.mCarrying,carryRate:def.carryRate,mOtif:def.mOtif,mIt:def.mIt,invTurnsBenchmark:def.invTurnsBenchmark,discRate:input.discRate||def.discRate,shrinkRate:.03,mDowntime:.30,mExpedite:.25,mServicePenalty:.25,mFirstFix:.30,mCount:.50,mThroughput:.30,mAccuracy:.35,mFieldLeakage:.30,mFieldCount:.50,otifRisk:0,implMonths:3,ramp1:.40,ramp2:.75,ramp3:1,hasFieldInventory:!!scenarioData.hasFieldInventory,invest:Number(scenarioData.invest)||0,otc:Number(scenarioData.otc)||0,contractMonths:Number(scenarioData.contractMonths)||36});
 input.effectiveShrinkBase=input.annualWriteOff>0?input.annualWriteOff:(input.inventory||0)*.03;
 const roi=calcROI(input),activeDrivers=[];for(const [key,fields] of Object.entries(DRIVER_FIELDS)){const sufficient=key==='shrinkage'?fields.some(f=>supported.has(f)):fields.every(f=>supported.has(f));const amount=Number(roi[DRIVER_RESULTS[key]])||0;if(sufficient&&amount>0)activeDrivers.push({key,label:LABELS[key],modeledAnnualBenefit:amount,evidenceState:'Prospect-entered baseline with documented model assumptions'});}
 const investmentDefined=(Number(input.invest)||0)+(Number(input.otc)||0)>0;
 return Object.freeze({currency:String(currency||'USD').toUpperCase(),modeledAnnualBenefit:activeDrivers.reduce((sum,d)=>sum+d.modeledAnnualBenefit,0),activeDrivers,driverEvidenceState:activeDrivers.length?'Supported by information entered so far':'More information is needed',modelVersion:28,investmentDefined,roi:investmentDefined?roi.totalContractRoi:null,payback:investmentDefined?roi.contractPayback:null,previewDisclaimer:'Illustrative modeled value based on the information entered so far and documented Cloud Inventory model assumptions. This is not yet a customer-validated business case.'});
}
module.exports={buildProspectPreview,DEFAULTS,DRIVER_FIELDS};
