const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluateRoiMaturity,CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD,VALUE_DRIVER_PROVENANCE_MAP}=require('../src/shared/roi-maturity');
const {calcROI}=require('../src/shared/roi-engine');

const base=(extra={})=>({modelVersion:27,users:7,labor:100000,mLabor:1,itCost:300000,mIt:1,contractMonths:36,...extra});
const prospectStates={userCount:'confirmed_prospect',laborCost:'confirmed_prospect'};
const manualProvenance={userCount:{source:'Customer spreadsheet',date:'2026-08-30'},laborCost:{source:'Discovery meeting',date:'2026-08-30'}};
const validation={criterionId:'roi_value_case_validation',customerValidated:true,stakeholder:'VP Operations',stakeholderId:'val-1',evidenceDate:'2026-08-30',source:'ROI review meeting',evidence:'The customer reviewed the material assumptions and agreed the annual opportunity is credible.',quality:'strong'};
const executive={criterionId:'roi_executive_approval',customerValidated:true,stakeholder:'Chris Morgan, CFO',stakeholderId:'eb-1',evidenceDate:'2026-08-30',source:'CFO approval email',evidence:'The CFO approved use of the value case for the investment request.',quality:'strong'};
const stakeholders=[{id:'eb-1',name:'Chris Morgan',title:'CFO',role:'economic_buyer',engaged:true},{id:'val-1',name:'Jordan Patel',title:'VP Operations',role:'business_owner',engaged:true},{id:'inf-1',name:'Taylor Lee',role:'influencer',engaged:true}];

test('ROI maturity has five authoritative levels and a centralized 50% threshold',()=>{
  assert.equal(CUSTOMER_DATA_VALUE_COVERAGE_THRESHOLD,.5);
  assert.equal(Object.keys(VALUE_DRIVER_PROVENANCE_MAP).length,16);
  assert.equal(evaluateRoiMaturity({scenarioData:{}}).level,0);
  assert.equal(evaluateRoiMaturity({scenarioData:{}}).label,'No Value Case');
});

test('seller assumptions and unrelated discovery activity remain Level 1',()=>{
  const result=evaluateRoiMaturity({scenarioData:base(),evidence:{unrelated_discovery:{customerValidated:true}}});
  assert.equal(result.annualBenefit,1000000);
  assert.equal(result.level,1);
  assert.equal(result.label,'Seller Hypothesis');
  assert.equal(result.customerSupportedValuePct,0);
});

test('customer-supported value coverage is weighted by annual driver value',()=>{
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:prospectStates})});
  assert.equal(result.customerSupportedAnnualValue,700000);
  assert.equal(result.customerSupportedValuePct,70);
  assert.equal(result.level,2);
  assert.equal(result.customerSupportedDrivers[0].key,'laborSav');
  assert.equal(result.unsupportedDrivers[0].key,'itSav');
});

test('small customer-supported value does not elevate the overall case',()=>{
  const result=evaluateRoiMaturity({scenarioData:base({users:1,itCost:900000,fieldStates:prospectStates})});
  assert.equal(result.customerSupportedValuePct,10);
  assert.equal(result.level,1);
});

test('manual customer-provided fields require source and date provenance',()=>{
  const states={userCount:'confirmed_customer',laborCost:'confirmed_customer'};
  assert.equal(evaluateRoiMaturity({scenarioData:base({fieldStates:states})}).level,1);
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:states,fieldProvenance:manualProvenance})});
  assert.equal(result.level,2);
  assert.equal(result.customerSupportedValuePct,70);
});

test('rep-confirmed fields improve confidence but never count as customer data',()=>{
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:{userCount:'confirmed',laborCost:'confirmed'}})});
  assert.equal(result.level,1);
  assert.equal(result.customerSupportedAnnualValue,0);
});

test('OTIF industry-risk fallback remains seller-supported even with customer revenue',()=>{
  const scenarioData={
    modelVersion:27,revenue:10000000,otifBaseline:0,otifTarget:0,
    otifRisk:.03,mOtif:.5,contractMonths:36,
    fieldStates:{revenue:'confirmed_prospect'}
  };
  const result=evaluateRoiMaturity({scenarioData});
  assert.equal(result.annualBenefit,150000);
  assert.equal(result.annualBenefit,calcROI(scenarioData).annualBenefit);
  assert.equal(result.customerSupportedAnnualValue,0);
  assert.equal(result.customerSupportedValuePct,0);
  assert.equal(result.level,1);
  const otif=result.activeDrivers.find(x=>x.key==='otifSav');
  assert.equal(otif.customerSupported,false);
  assert.equal(otif.calculationMode,'industry-risk fallback');
  assert.match(otif.supportReason,/Current customer OTIF/);
  assert.match(otif.fieldSupport.find(x=>x.sourceField==='otifBaseline').field,/industry-risk fallback/);
});

test('customer revenue and current OTIF baseline support gap-mode OTIF value',()=>{
  const scenarioData={
    modelVersion:27,revenue:10000000,otifBaseline:90,otifTarget:95,
    mOtif:.3,contractMonths:36,
    fieldStates:{revenue:'confirmed_prospect',otifBaseline:'confirmed_customer'},
    fieldProvenance:{otifBaseline:{source:'Operations review',date:'2026-08-30'}}
  };
  const result=evaluateRoiMaturity({scenarioData});
  assert.equal(result.annualBenefit,150000);
  assert.equal(result.annualBenefit,calcROI(scenarioData).annualBenefit);
  assert.equal(result.customerSupportedAnnualValue,150000);
  assert.equal(result.customerSupportedValuePct,100);
  assert.equal(result.level,2);
  const otif=result.activeDrivers.find(x=>x.key==='otifSav');
  assert.equal(otif.customerSupported,true);
  assert.equal(otif.calculationMode,'customer baseline and target gap');
  assert.match(otif.supportReason,/Revenue and the current customer OTIF baseline/);
});

test('Level 3 requires complete structured customer validation',()=>{
  const scenarioData=base({fieldStates:prospectStates});
  assert.equal(evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:{customerValidated:true}}}).level,2);
  const result=evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:validation},stakeholders});
  assert.equal(result.level,3);
  assert.equal(result.customerValidation.complete,true);
});

test('credible legacy ROI validation remains recognized',()=>{
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:prospectStates}),evidence:{business_case:{...validation,criterionId:'business_case',stakeholderId:null}}});
  assert.equal(result.level,3);
  assert.equal(result.customerValidation.legacy,true);
});

test('engaged Economic Buyer alone does not award Level 4',()=>{
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:prospectStates}),evidence:{roi_value_case_validation:validation},stakeholders});
  assert.equal(result.level,3);
  assert.equal(result.executiveApproval.complete,false);
});

test('Level 4 requires explicit approval from the mapped Economic Buyer',()=>{
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:prospectStates}),evidence:{roi_value_case_validation:validation,roi_executive_approval:executive},stakeholders});
  assert.equal(result.level,4);
  assert.equal(result.label,'Executive Approved');
  assert.equal(result.executiveApproval.stakeholder.role,'economic_buyer');
});

test('approval from a non-economic-buyer remains Level 3 with a clear reason',()=>{
  const approval={...executive,stakeholder:'Taylor Lee',stakeholderId:'inf-1'};
  const result=evaluateRoiMaturity({scenarioData:base({fieldStates:prospectStates}),evidence:{roi_value_case_validation:validation,roi_executive_approval:approval},stakeholders});
  assert.equal(result.level,3);
  assert.match(result.executiveApproval.reason,/Economic Buyer/);
});

test('current and Aging ROI validation remain valid while stale validation falls to Level 2',()=>{
  const scenarioData=base({fieldStates:prospectStates}),now='2026-08-30';
  const current={...validation,evidenceDate:'2026-08-20'};
  const aging={...validation,evidenceDate:'2026-06-16'};
  const stale={...validation,evidenceDate:'2026-05-01',updatedAt:'2026-08-30T12:00:00Z'};
  assert.equal(evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:current},stakeholders,now}).level,3);
  const agingResult=evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:aging},stakeholders,now});
  assert.equal(agingResult.level,3);assert.equal(agingResult.customerValidation.freshness.status,'Aging');
  const staleResult=evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:stale},stakeholders,now});
  assert.equal(staleResult.level,2);assert.match(staleResult.customerValidation.reason,/stale/);
});

test('current and Aging executive approval remain Level 4 while stale approval falls to Level 3',()=>{
  const scenarioData=base({fieldStates:prospectStates}),now='2026-08-30',currentValidation={...validation,evidenceDate:'2026-08-20'};
  const current={...executive,evidenceDate:'2026-08-20'},aging={...executive,evidenceDate:'2026-06-16'},stale={...executive,evidenceDate:'2026-05-01',updatedAt:'2026-08-30T12:00:00Z'};
  assert.equal(evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:currentValidation,roi_executive_approval:current},stakeholders,now}).level,4);
  const agingResult=evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:currentValidation,roi_executive_approval:aging},stakeholders,now});
  assert.equal(agingResult.level,4);assert.equal(agingResult.executiveApproval.freshness.status,'Aging');
  const staleResult=evaluateRoiMaturity({scenarioData,evidence:{roi_value_case_validation:currentValidation,roi_executive_approval:stale},stakeholders,now});
  assert.equal(staleResult.level,3);assert.match(staleResult.executiveApproval.reason,/stale/);
});

test('provenance and maturity details are persisted and consumed across application layers',()=>{
  const root=path.join(__dirname,'..');
  const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
  const versioning=fs.readFileSync(path.join(root,'public','versioning.js'),'utf8');
  const features=fs.readFileSync(path.join(root,'public','features.js'),'utf8');
  const readiness=fs.readFileSync(path.join(root,'public','buyer-readiness.js'),'utf8');
  const service=fs.readFileSync(path.join(root,'src','shared','stage-readiness-service.js'),'utf8');
  assert.match(app,/fieldProvenance:\s+typeof fieldProvenance/);
  assert.match(versioning,/fieldProvenance:\s+typeof fieldProvenance/);
  assert.match(features,/fieldProvenance = i\.fieldProvenance/);
  assert.match(features,/confirmed_customer/);
  assert.match(features,/Customer Provided requires a source and date/);
  assert.match(readiness,/openRoiMaturityDrawer/);
  assert.match(readiness,/roi_value_case_validation/);
  assert.match(readiness,/roi_executive_approval/);
  assert.match(service,/roiMaturityDetails:maturityResult/);
  assert.doesNotMatch(service,/if\(roi&&x\.prospectInputs>0\)maturity=2/);
});
