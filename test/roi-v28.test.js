const test=require('node:test');
const assert=require('node:assert/strict');
const {calcROI}=require('../src/shared/roi-engine');

test('v28 service revenue uses contribution margin, never full revenue',()=>{
  const r=calcROI({modelVersion:28,revenue:1000000,otifBaseline:90,otifTarget:95,contributionMarginPct:.4,mOtif:.5});
  assert.equal(r.otifSav,10000);
  assert.equal(r.serviceRevenueMethod,'modeled_otif_margin');
});
test('direct lost sales is preferred and alternatives are not additive',()=>{
  const r=calcROI({modelVersion:28,revenue:1000000,otifBaseline:90,otifTarget:95,lostSalesYr:50000,contributionMarginPct:.4,mOtif:.5});
  assert.equal(r.otifSav,10000);assert.equal(r.serviceRevenueMethod,'direct_lost_sales');
});
test('accuracy derives bounded recovery unless explicitly overridden',()=>{
  const derived=calcROI({modelVersion:28,currentAccuracy:90,effectiveShrinkBase:100000,mShrinkage:.2});
  assert.equal(derived.accuracyDerivedRecovery,.475);assert.equal(derived.shrinkSav,47500);
  const explicit=calcROI({modelVersion:28,currentAccuracy:90,effectiveShrinkBase:100000,mShrinkage:.2,explicitRecoveryInputs:['mShrinkage']});
  assert.equal(explicit.shrinkSav,20000);
});
test('accuracy alone does not fabricate dollars',()=>assert.equal(calcROI({modelVersion:28,currentAccuracy:90}).annualBenefit,0));
test('productivity methods are alternatives',()=>{
  const r=calcROI({modelVersion:28,users:10,labor:50000,laborWastePct:.2,mLabor:.5,ordersPerYr:100000,costPerOrder:2,pickRateGainPct:.2,mThroughput:.5});
  assert.equal(r.countedProductivitySav,50000);assert.equal(r.productivityMethodUsed,'labor_waste');assert.ok(r.productivityOverlapRemoved>0);
});
test('service penalty, first-time-fix, and field reconciliation formulas',()=>{
  const r=calcROI({modelVersion:28,servicePenaltyCostYr:100000,mServicePenalty:.25,repeatVisitsYr:100,costPerTruckRoll:300,mFirstFix:.2,hasFieldInventory:true,fieldLocations:10,fieldReconcilePerYr:4,fieldReconcilePersonHours:8,labor:52000,mFieldCount:.5});
  assert.equal(r.servicePenaltySav,25000);assert.equal(r.firstFixSav,6000);assert.equal(r.fiCountSav,4000);
});
test('v27 remains version gated',()=>{
  const r=calcROI({modelVersion:27,servicePenaltyCostYr:100000,mServicePenalty:.25,repeatVisitsYr:100,costPerTruckRoll:300,mFirstFix:.2});
  assert.equal(r.servicePenaltySav,0);assert.equal(r.firstFixSav,0);
});
