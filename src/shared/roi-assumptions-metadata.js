'use strict';

/* Customer-safe presentation metadata for ROI Model v2.8. This file contains
   labels and approved plain-language methodology only. It never calculates an
   economic result. */
const INPUTS=Object.freeze({
 userCount:{label:'Employees Using Inventory Processes',storageKey:'users',format:'number',unit:'people'},
 laborCost:{label:'Average Fully Burdened Labor Cost',storageKey:'labor',format:'money',unit:'per employee per year'},
 laborWastePct:{label:'Time Spent on Avoidable Inventory Work',format:'percent',scale:100,unit:'percentage'},
 mLabor:{label:'Expected Labor Recovery',format:'percent',scale:100,unit:'percentage',assumption:true},
 ordersPerYr:{label:'Annual Orders',format:'number',unit:'orders per year'},
 costPerOrder:{label:'Current Cost per Order',format:'money',unit:'per order'},
 pickRateGainPct:{label:'Expected Pick-Rate Improvement',format:'percent',scale:100,unit:'percentage'},
 mThroughput:{label:'Expected Throughput Realization',format:'percent',scale:100,unit:'percentage',assumption:true},
 annualWriteOff:{label:'Annual Inventory Write-Offs',format:'money',unit:'per year'},
 inventoryValue:{label:'Annual Inventory Value',storageKey:'inventory',format:'money',unit:'inventory value'},
 shrinkRate:{label:'Estimated Inventory Loss Rate',format:'percent',scale:100,unit:'percentage'},
 currentAccuracy:{label:'Current Inventory Accuracy',format:'percent',unit:'percentage'},
 mShrinkage:{label:'Expected Write-Off Recovery',format:'percent',scale:100,unit:'percentage',assumption:true},
 carryRate:{label:'Inventory Carrying Rate',format:'percent',scale:100,unit:'percentage',assumption:true},
 mCarrying:{label:'Expected Carrying-Cost Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 invTurnsCurrent:{label:'Current Inventory Turns',format:'decimal',unit:'turns per year'},
 invTurnsBenchmark:{label:'Target Inventory Turns',format:'decimal',unit:'turns per year',assumption:true},
 lostSalesYr:{label:'Annual Sales Lost to Inventory Availability',format:'money',unit:'per year'},
 revenue:{label:'Annual Revenue',format:'money',unit:'per year'},
 otifBaseline:{label:'Current On-Time, In-Full Performance',format:'percent',unit:'percentage'},
 otifTarget:{label:'Target On-Time, In-Full Performance',format:'percent',unit:'percentage'},
 otifRisk:{label:'Saved Industry Service-Risk Factor',format:'percent',scale:100,unit:'percentage',assumption:true},
 contributionMarginPct:{label:'Contribution Margin',format:'percent',scale:100,unit:'percentage'},
 mOtif:{label:'Expected Service Recovery',format:'percent',scale:100,unit:'percentage',assumption:true},
 servicePenaltyCostYr:{label:'Annual Service Penalties and Credits',format:'money',unit:'per year'},
 mServicePenalty:{label:'Expected Penalty Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 expediteSpendYr:{label:'Annual Emergency and Expedited Procurement Spend',format:'money',unit:'per year'},
 mExpedite:{label:'Expected Expedite-Spend Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 downtimeEventsYr:{label:'Inventory-Related Downtime Events',format:'number',unit:'events per year'},
 downtimeHrsPerEvent:{label:'Average Downtime per Event',format:'decimal',unit:'hours per event'},
 downtimeCostPerHr:{label:'Incremental Downtime Cost',format:'money',unit:'per hour'},
 mDowntime:{label:'Expected Downtime Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 countDaysYr:{label:'Annual Inventory Count Days',format:'number',unit:'days per year'},
 countPeople:{label:'Employees Participating in Counts',format:'number',unit:'people'},
 mCount:{label:'Expected Count-Labor Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 orderErrorPct:{label:'Current Order Error Rate',format:'percent',scale:100,unit:'percentage'},
 costPerError:{label:'Operational Cost per Order Error',format:'money',unit:'per error'},
 mAccuracy:{label:'Expected Order-Error Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 repeatVisitsYr:{label:'Annual Repeat Service Visits',format:'number',unit:'visits per year'},
 costPerTruckRoll:{label:'Cost per Truck Roll',format:'money',unit:'per visit'},
 mFirstFix:{label:'Expected Repeat-Visit Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 fieldInvValue:{label:'Field Inventory Value',format:'money',unit:'inventory value'},
 fieldLeakageRate:{label:'Field Inventory Leakage Rate',format:'percent',unit:'percentage'},
 mFieldLeakage:{label:'Expected Field-Leakage Recovery',format:'percent',scale:100,unit:'percentage',assumption:true},
 fieldLocations:{label:'Field Inventory Locations',format:'number',unit:'locations'},
 fieldReconcilePerYr:{label:'Reconciliations per Location',format:'number',unit:'per year'},
 fieldReconcilePersonHours:{label:'Labor per Reconciliation',format:'decimal',unit:'person-hours'},
 mFieldCount:{label:'Expected Reconciliation-Labor Reduction',format:'percent',scale:100,unit:'percentage',assumption:true},
 itCost:{label:'Annual Cost of Existing Inventory Systems',format:'money',unit:'per year'},
 mIt:{label:'Expected IT Cost Displacement',format:'percent',scale:100,unit:'percentage',assumption:true},
 contractMonths:{label:'Contract Term',format:'number',unit:'months',assumption:true},
 invest:{label:'Annual Modeled Subscription',format:'money',unit:'per year'},
 otc:{label:'One-Time Modeled Implementation Investment',format:'money',unit:'one-time'},
 discRate:{label:'Discount Rate',format:'percent',scale:100,unit:'percentage',assumption:true},
 implMonths:{label:'Modeled Implementation Period',format:'number',unit:'months',assumption:true},
 ramp1:{label:'Benefit Realization — First Month After Go-Live',format:'percent',scale:100,unit:'percentage',assumption:true},
 ramp2:{label:'Benefit Realization — Second Month After Go-Live',format:'percent',scale:100,unit:'percentage',assumption:true},
 ramp3:{label:'Benefit Realization — Ongoing',format:'percent',scale:100,unit:'percentage',assumption:true}
});

const DRIVERS=Object.freeze({
 workforce_productivity:{label:'Workforce Productivity',basis:'Employee population × annual loaded labor cost × measured avoidable-work rate × expected recovery. When measured labor waste is unavailable, the governed throughput method may be used instead.',methods:{labor_waste:['userCount','laborCost','laborWastePct','mLabor'],throughput:['ordersPerYr','costPerOrder','pickRateGainPct','mThroughput']}},
 inventory_writeoff:{label:'Inventory Write-Off Reduction',basis:'Annual inventory write-off baseline × expected recovery. If an annual write-off is unavailable, the baseline is derived from inventory value and the saved loss rate.',inputs:['annualWriteOff','inventoryValue','shrinkRate','currentAccuracy','mShrinkage']},
 inventory_carrying:{label:'Inventory Carrying Benefit',basis:'The model compares carrying-cost improvement and inventory-turns improvement on the same inventory pool and includes the higher governed estimate once.',inputs:['inventoryValue','carryRate','mCarrying','invTurnsCurrent','invTurnsBenchmark']},
 service_revenue_margin:{label:'Recovered Contribution Margin',basis:'Annual sales at risk × contribution margin × expected service recovery. When direct lost-sales data is unavailable, the governed revenue and service-performance gap method is used.',methods:{direct_lost_sales:['lostSalesYr','contributionMarginPct','mOtif'],modeled_otif_margin:['revenue','otifBaseline','otifTarget','contributionMarginPct','mOtif'],legacy_otif_gap:['revenue','otifBaseline','otifTarget','mOtif'],legacy_otif_risk:['revenue','otifRisk','mOtif']}},
 service_penalties:{label:'Service Penalties and Credits',basis:'Annual service penalties and credits × expected reduction.',inputs:['servicePenaltyCostYr','mServicePenalty']},
 expedite_premium:{label:'Expedite Premium',basis:'Annual emergency and expedited procurement spend × expected reduction.',inputs:['expediteSpendYr','mExpedite']},
 downtime:{label:'Downtime Reduction',basis:'Annual events × hours per event × incremental cost per hour × expected reduction.',inputs:['downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr','mDowntime']},
 count_labor:{label:'Inventory Count Labor',basis:'Annual count days × employees involved × daily loaded labor cost × expected reduction.',inputs:['countDaysYr','countPeople','laborCost','mCount']},
 order_error:{label:'Order-Error Operations',basis:'Annual orders × order error rate × operational cost per error × expected reduction.',inputs:['ordersPerYr','orderErrorPct','costPerError','mAccuracy']},
 first_time_fix:{label:'First-Time-Fix and Truck Rolls',basis:'Annual repeat visits × cost per truck roll × expected reduction.',inputs:['repeatVisitsYr','costPerTruckRoll','mFirstFix']},
 field_leakage:{label:'Field Inventory Leakage',basis:'Field inventory value × field leakage rate × expected recovery.',inputs:['fieldInvValue','fieldLeakageRate','mFieldLeakage']},
 field_carrying:{label:'Field Inventory Carrying Benefit',basis:'Field inventory value × inventory carrying rate × expected carrying-cost reduction.',inputs:['fieldInvValue','carryRate','mCarrying']},
 field_reconciliation:{label:'Field Inventory Reconciliation',basis:'Field locations × annual reconciliations × person-hours per reconciliation × loaded hourly labor cost × expected reduction.',inputs:['fieldLocations','fieldReconcilePerYr','fieldReconcilePersonHours','laborCost','mFieldCount']},
 it_displacement:{label:'IT Cost Displacement',basis:'Annual cost of existing inventory systems × expected displacement.',inputs:['itCost','mIt']}
});

function savedModelVersion(data={}){
 const version=Number(data.modelVersion);
 return Number.isFinite(version)&&version>0?version:27;
}
function roiModelLabel(data={}){
 const version=savedModelVersion(data);
 return version>=28?'ROI Model v2.8':`ROI Model v${(version/10).toFixed(1)} (legacy saved scenario)`;
}
function methodForDriver(formulaId,roi,data={}){
 if(formulaId==='workforce_productivity'){
  if(roi.productivityMethodUsed)return roi.productivityMethodUsed;
  return savedModelVersion(data)<28&&Number(roi.laborSav)>0?'labor_waste':null;
 }
 if(formulaId==='service_revenue_margin'){
  if(roi.serviceRevenueMethod)return roi.serviceRevenueMethod;
  if(savedModelVersion(data)>=28||Number(roi.otifSav)<=0)return null;
  const baseline=Number(data.otifBaseline)||0,target=Number(data.otifTarget)||0;
  if(baseline>0&&target>baseline)return'legacy_otif_gap';
  return baseline===0&&target===0&&Number(data.otifRisk)>0?'legacy_otif_risk':null;
 }
 return null;
}
function presentationForDriver(formulaId,roi,data={}){
 const base=DRIVERS[formulaId];
 if(!base)return null;
 if(savedModelVersion(data)>=28)return base;
 if(formulaId==='workforce_productivity'){
  if(methodForDriver(formulaId,roi,data)==='throughput')return{...base,basis:'Annual orders × current cost per order × expected pick-rate improvement × expected throughput realization under the saved legacy model.'};
  const measured=Number(data.modelVersion)>=25&&Number(data.laborWastePct)>0;
  return{...base,basis:measured?'Employee population × annual loaded labor cost × measured avoidable-work rate × expected recovery under the saved legacy model.':'Employee population × annual loaded labor cost × expected recovery under the saved legacy model.'};
 }
 if(formulaId==='service_revenue_margin'){
  const method=methodForDriver(formulaId,roi,data);
  return{...base,label:'Service Revenue Opportunity — Legacy Saved Model',basis:method==='legacy_otif_risk'?'Annual revenue × saved industry service-risk factor × expected recovery. The saved legacy model does not apply contribution margin to this driver.':'Annual revenue × saved service-performance percentage-point improvement × expected recovery. The saved legacy model does not apply contribution margin to this driver.'};
 }
 return base;
}
function inputsForDriver(formulaId,roi,data={}){
 const d=DRIVERS[formulaId];if(!d)return[];
 if(formulaId==='inventory_writeoff')return Number(data.annualWriteOff)>0?['annualWriteOff','currentAccuracy','mShrinkage']:['inventoryValue','shrinkRate','currentAccuracy','mShrinkage'];
 if(formulaId==='inventory_carrying')return Number(roi.turnsSav)>0?d.inputs:d.inputs.filter(key=>!['invTurnsCurrent','invTurnsBenchmark'].includes(key));
 if(d.inputs)return d.inputs;
 if(formulaId==='workforce_productivity'||formulaId==='service_revenue_margin')return d.methods[methodForDriver(formulaId,roi,data)]||[];
 return[];
}
module.exports={INPUTS,DRIVERS,inputsForDriver,methodForDriver,presentationForDriver,savedModelVersion,roiModelLabel};
