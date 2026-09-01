const {calcROI}=require(process.argv[2]||'../src/shared/roi-engine');
const cases={
 base:{modelVersion:27,users:40,labor:52000,mLabor:.2,effectiveShrinkBase:250000,mShrinkage:.35,inventory:10000000,mCarrying:.18,carryRate:.25,invTurnsCurrent:4,invTurnsBenchmark:8,revenue:80000000,otifBaseline:92,otifTarget:97,mOtif:.1,itCost:180000,mIt:.5,invest:125000,otc:75000,discRate:.09,contractMonths:36,implMonths:3,ramp1:.4,ramp2:.75,ramp3:1},
 operations:{modelVersion:27,labor:60000,downtimeEventsYr:20,downtimeHrsPerEvent:3,downtimeCostPerHr:4000,mDowntime:.3,expediteSpendYr:300000,mExpedite:.25,countDaysYr:12,countPeople:6,mCount:.5,ordersPerYr:200000,costPerOrder:4,pickRateGainPct:.2,mThroughput:.3,orderErrorPct:.02,costPerError:100,mAccuracy:.35,invest:100000,contractMonths:18},
 field:{modelVersion:27,hasFieldInventory:true,labor:52000,fieldInvValue:2000000,fieldLeakageRate:5,mFieldLeakage:.3,fieldLocations:10,fieldReconcileCost:500,fieldReconcilePerYr:4,mFieldCount:.5,carryRate:.25,mCarrying:.2,invest:90000,otc:20000,contractMonths:36}
};
const keys=['annualBenefit','laborSav','shrinkSav','carrySav','turnsSav','otifSav','downtimeSav','expediteSav','countSav','throughputSav','accuracySav','fiLeakageSav','fiCarrySav','fiCountSav','year1Benefit','totalContractBenefit','totalContractInvestment','totalContractRoi','totalContractNpv','contractPayback'];
const out={};for(const [name,input] of Object.entries(cases)){const r=calcROI(input);out[name]={input,expected:Object.fromEntries(keys.map(k=>[k,r[k]]))};}console.log(JSON.stringify(out,null,2));
