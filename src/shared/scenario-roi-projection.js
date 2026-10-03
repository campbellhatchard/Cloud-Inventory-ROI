'use strict';

const {calcROI}=require('./roi-engine');

const INPUT_FIELDS=Object.freeze([
  'revenue','users','labor','inventory','itCost','invest','contractMonths','psvc','hw','train',
  'discRate','mLabor','mShrinkage','mCarrying','mOtif','mIt','shrinkRate','carryRate','otifRisk',
  'annualWriteOff','otifBaseline','otifTarget','invTurnsCurrent','invTurnsBenchmark','laborWastePct',
  'currentAccuracy','hasFieldInventory','fieldInvValue','fieldLeakageRate','mFieldLeakage','fieldLocations',
  'fieldReconcileCost','fieldReconcilePerYr','fieldReconcilePersonHours','mFieldCount','ordersPerYr',
  'costPerOrder','pickRateGainPct','mThroughput','orderErrorPct','costPerError','mAccuracy',
  'downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr','mDowntime','expediteSpendYr','mExpedite',
  'servicePenaltyCostYr','mServicePenalty','lostSalesYr','contributionMarginPct','repeatVisitsYr',
  'costPerTruckRoll','mFirstFix','countDaysYr','countPeople','mCount','implMonths','ramp1','ramp2','ramp3'
]);
const PRESENTATION_FIELDS=Object.freeze([
  'name','company','rep','industry','competitor','execAudience','solution','currency','prospectLogoDataUrl',
  'confidence','threeWhysAct','threeWhysCi','threeWhysNow','threeWhysMeta','fieldStates','fieldProvenance',
  'explicitRecoveryInputs'
]);

const pick=(source,fields)=>Object.fromEntries(fields.filter(key=>Object.prototype.hasOwnProperty.call(source,key)).map(key=>[key,source[key]]));
function projectScenarioData(source={}){
  const input=pick(source,INPUT_FIELDS);
  input.modelVersion=28;
  input.otc=(Number(input.psvc)||0)+(Number(input.hw)||0)+(Number(input.train)||0);
  input.effectiveShrinkBase=(Number(input.annualWriteOff)||0)>0?Number(input.annualWriteOff):(Number(input.inventory)||0)*(Number(input.shrinkRate)||0);
  input.explicitRecoveryInputs=Array.isArray(source.explicitRecoveryInputs)?[...new Set(source.explicitRecoveryInputs.map(String))]:[];
  const calculated=calcROI(input);
  if(!calculated||!Number.isFinite(Number(calculated.annualBenefit)))throw new Error('Authoritative ROI calculation did not produce a valid annual benefit.');
  return {...pick(source,PRESENTATION_FIELDS),...input,...calculated};
}

module.exports={INPUT_FIELDS,PRESENTATION_FIELDS,projectScenarioData};
