const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calcROI}=require('../src/shared/roi-engine');
const {parseOpportunityValue,buildOpportunityProfile,snapshotOpportunityValue}=require('../src/shared/opportunity-value');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const scenarios=read('src/routes/scenarios.js'),authorization=read('src/authorization.js');
const switcherRoute=read('src/routes/customer-switcher.js'),switcherUi=read('public/customer-switcher.js');
const managerRoute=read('src/routes/sales-manager.js'),managerUi=read('public/sales-manager.js');
const closeRoute=read('src/routes/stage-readiness.js'),calculator=read('public/app.js');

test('Opportunity Value validation accepts null and zero but rejects malformed, negative, and non-finite values',()=>{
  assert.equal(parseOpportunityValue(null),null);assert.equal(parseOpportunityValue(''),null);assert.equal(parseOpportunityValue(0),0);assert.equal(parseOpportunityValue('325000'),325000);
  for(const value of [-1,'-1','abc','12,000',Infinity,NaN])assert.throws(()=>parseOpportunityValue(value));
});

test('authoritative opportunity profile carries server audit metadata and native currency',()=>{
  const profile=buildOpportunityProfile({value:325000,currency:'GBP',userId:'rep-1',now:'2026-08-31T12:00:00.000Z'});
  assert.deepEqual(profile,{estimatedOpportunityValue:325000,currency:'GBP',opportunityValueUpdatedAt:'2026-08-31T12:00:00.000Z',opportunityValueUpdatedBy:'rep-1'});
  assert.throws(()=>buildOpportunityProfile({value:1,currency:'CAD',userId:'rep-1'}));
});

test('Opportunity Value is independent of ROI calculations in both directions',()=>{
  const inputs={users:100,labor:50000,mLabor:.1,invest:100000,contractMonths:36,modelVersion:27};
  const before=calcROI(inputs),afterCommercialEdit=calcROI({...inputs,opportunityValue:400000});
  assert.deepEqual(afterCommercialEdit,before,'commercial metadata must not enter ROI formulas');
  const changedInvestment=calcROI({...inputs,invest:120000});
  assert.notEqual(changedInvestment.totalContractInvestment,before.totalContractInvestment);
  const profile=buildOpportunityProfile({value:325000,currency:'USD',userId:'rep'});
  assert.equal(profile.estimatedOpportunityValue,325000,'ROI changes cannot mutate the profile');
});

test('first save and version save persist opportunity profile without adding a database column',()=>{
  assert.match(scenarios,/opportunityValue, opportunityValueCurrency/);
  assert.match(scenarios,/INSERT INTO scenario_stage_governance[\s\S]*opportunity_profile/);
  assert.match(scenarios,/sourceGovernance\?\.opportunity_profile/);
  assert.doesNotMatch(scenarios,/ALTER TABLE/);
});

test('Customer Switcher uses explicit Opportunity Value and never Annual Customer Benefit as value',()=>{
  assert.match(authorization,/opportunity_profile->>'estimatedOpportunityValue'/);
  assert.doesNotMatch(authorization,/annualBenefit'\)::numeric estimated_value/);
  assert.match(switcherRoute,/opportunityValue:r\.opportunity_value/);
  assert.doesNotMatch(switcherRoute,/estimatedValue/);
  assert.match(switcherUi,/Opportunity value \/ close/);
  assert.match(switcherUi,/money\(i\.opportunityValue,i\.currency\)/);
  assert.match(switcherUi,/Not entered/);
});

test('Sales Manager separates commercial and ROI financial fields',()=>{
  assert.match(managerRoute,/commercial:\{opportunityValue:/);
  for(const field of ['annualBenefit','totalContractBenefit','totalContractInvestment','contractNetBenefit','contractRoi','contractNpv','contractMonths'])assert.match(managerRoute,new RegExp(field));
  assert.match(managerUi,/Opportunity Value/);assert.match(managerUi,/Modeled Customer Investment/);assert.match(managerUi,/Annual Customer Benefit/);assert.match(managerUi,/Total Contract Benefit/);assert.match(managerUi,/Net Economic Benefit/);
  assert.doesNotMatch(managerUi,/d\.roi\.investment/);
});

test('portfolio aggregation is currency aware and reports missing values',()=>{
  assert.match(managerUi,/function valueStats/);assert.match(managerUi,/totals\[c\]/);assert.match(managerUi,/missingValueCount/);
  assert.match(managerUi,/Object\.entries\(stats\?\.totals/);assert.match(managerUi,/join\(' · '\)/);
  assert.doesNotMatch(managerUi,/currency:'USD'/);
  assert.match(managerUi,/of known opportunity value/);assert.match(managerUi,/not entered/);
});

test('opportunity value is not a deal-health, readiness, commitment, or ROI-maturity signal',()=>{
  const healthBlock=managerRoute.slice(managerRoute.indexOf('function dealHealth'),managerRoute.indexOf('function priority'));
  assert.doesNotMatch(healthBlock,/opportunityValue|opportunity_profile/);
  for(const file of ['src/shared/roi-maturity.js','src/shared/buyer-commitment.js','src/shared/criterion-evidence.js'])assert.doesNotMatch(read(file),/estimatedOpportunityValue/);
});

test('closed Won and Lost snapshots preserve commercial value separately from ROI value case',()=>{
  assert.deepEqual(snapshotOpportunityValue({estimatedOpportunityValue:325000,currency:'EUR'}),{amount:325000,currency:'EUR'});
  assert.equal(snapshotOpportunityValue({estimatedOpportunityValue:null,currency:'USD'}),null);
  assert.match(closeRoute,/finalOpportunityValue=snapshotOpportunityValue/);
  assert.match(closeRoute,/\?\{outcome[\s\S]*finalOpportunityValue[\s\S]*:\{outcome[\s\S]*finalOpportunityValue/);
  assert.match(closeRoute,/finalValueCase:valueCase/);
});

test('currency changes warn without FX conversion and modeled-investment copy is explicit only',()=>{
  const currency=read('public/currency.js');
  assert.match(currency,/does not convert the amount automatically/);
  assert.doesNotMatch(currency,/exchangeRate|fxRate|fetch\(.+currency/i);
  assert.match(currency,/function useModeledInvestmentForOpportunityValue/);
  assert.match(currency,/Future ROI changes will not update Opportunity Value/);
  assert.match(calculator,/opportunityValueCurrency/);
});
