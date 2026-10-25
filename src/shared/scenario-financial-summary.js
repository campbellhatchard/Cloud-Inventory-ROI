'use strict';

const present=value=>value!==null&&value!==undefined&&value!=='';
const first=(source,keys)=>{for(const key of keys){if(!Object.prototype.hasOwnProperty.call(source||{},key))continue;if(!present(source[key]))return null;const value=Number(source[key]);return Number.isFinite(value)?value:null;}return null;};

/* Read-time compatibility only. This never recalculates economics and never
   turns a genuinely missing value into zero. */
function scenarioFinancialSummary(data={},context={}){
 let contractTermMonths=first(data,['contractMonths','contractTermMonths','termMonths','contractTerm']);
 if(contractTermMonths===null){const years=first(data,['contractYearCount','contractYears']);if(years!==null)contractTermMonths=years*12;}
 return Object.freeze({
  currency:String(data.currency||context.currency||'USD').toUpperCase(),
  contractTermMonths,
  annualCustomerBenefit:first(data,['annualBenefit','annualCustomerBenefit']),
  modeledCustomerInvestment:first(data,['totalContractInvestment','modeledCustomerInvestment']),
  totalContractBenefit:first(data,['totalContractBenefit','contractBenefit']),
  netEconomicBenefit:first(data,['totalContractNetBenefit','contractNetBenefit','netEconomicBenefit','netBenefit']),
  contractROI:first(data,['totalContractRoi','contractROI','roi']),
  NPV:first(data,['totalContractNpv','contractNpv','npv5','npv3','npv']),
  paybackMonths:first(data,['contractPayback','paybackFromSigning','payback']),
  annualSubscription:first(data,['invest','annualSubscription']),
  oneTimeCosts:first(data,['otc','oneTimeCosts']),
  revenue:first(data,['revenue']),
  users:first(data,['users','userCount']),
  modelVersion:first(data,['modelVersion']),
  scenarioVersion:present(context.scenarioVersion)?Number(context.scenarioVersion):null
 });
}

module.exports={scenarioFinancialSummary};
