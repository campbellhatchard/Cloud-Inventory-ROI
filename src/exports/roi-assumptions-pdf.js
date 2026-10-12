'use strict';
const {buildTextPdf}=require('./executive-pdf');
const economic=require('../../public/economic-availability');

/* Use the ISO currency code because the dependency-free PDF writer deliberately
   limits text to its embedded WinAnsi-safe character set. This preserves GBP,
   USD, EUR, AUD and NZD identity instead of silently dropping a symbol. */
const money=(value,currency)=>economic.hasEconomicValue(value)?`${currency} ${new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(value))}`:'Not Modeled';
const number=value=>economic.hasEconomicValue(value)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(value)):'Not Available';
function inputValue(row,currency){
 if(row.value===null||row.value===undefined)return'Not Available';
 if(row.format==='money')return money(row.value,currency);
 if(row.format==='percent')return `${number(row.value)}%`;
 return `${number(row.value)}${row.unit?` ${row.unit}`:''}`;
}
function buildRoiAssumptionsPdf(report,{audience='customer',draft=false,review=false}={}){
 if(!report?.identity||!Array.isArray(report.drivers))throw new Error('A governed ROI Assumptions report model is required.');
 const c=report.identity.currency,s=report.summary;
 const sections=[
  {heading:'Report identity',lines:[`Customer: ${report.identity.customer}`,`Scenario: ${report.identity.scenario}`,`Scenario version: ${report.identity.scenarioVersion}`,`Generated: ${String(report.identity.generatedAt).slice(0,10)}`,`Native currency: ${c}`,`Contract term: ${report.identity.contractMonths} months`,`ROI authority: ${report.authority?.roiModel||'Saved authoritative ROI model'}`]},
  {heading:'1. Executive ROI Summary',lines:[`Annual Customer Benefit | ${money(s.annualCustomerBenefit,c)}`,`Total Contract Benefit | ${money(s.totalContractBenefit,c)}`,`Modeled Customer Investment | ${money(s.modeledCustomerInvestment,c)}`,`Net Economic Benefit | ${money(s.netEconomicBenefit,c)}`,`Contract ROI | ${economic.hasEconomicValue(s.contractRoi)?economic.percent(s.contractRoi,{missing:'Not Available'}):'Not Available'}`,`Payback | ${economic.hasEconomicValue(s.paybackMonths)?`${number(s.paybackMonths)} months`:'Not Available'}`,`NPV | ${money(s.npv,c)}`]},
  {heading:'2. Inputs & Assumptions',repeatOnPage:'Inputs & Assumptions - continued | Input | Value | Source | Support | Used in',lines:[`Evidence summary | ${report.sourceSummary.customerSupported} customer-supported | ${report.sourceSummary.needsRevalidation||0} need revalidation | ${report.sourceSummary.repValidated} rep validated | ${report.sourceSummary.repEstimates} rep estimates | ${report.sourceSummary.modelAssumptions} model assumptions`,'INPUT / ASSUMPTION | VALUE USED | SOURCE | SUPPORT | USED IN',...report.inputs.map(row=>`${row.label} | ${inputValue(row,c)} | ${row.source} | ${row.supportStatus} | ${row.usedIn.join(', ')}`)]},
  {heading:'3. Value Driver Calculation Trace',repeatOnPage:'Value Driver Calculation Trace - continued',blocks:report.drivers.map(driver=>({heading:`${driver.label} | Annual modeled benefit: ${money(driver.annualBenefit,c)}`,lines:[`Inputs used: ${driver.inputs.map(row=>`${row.label} (${inputValue(row,c)})`).join('; ')||'No customer-specific inputs available'}`,`Calculation basis: ${driver.calculationBasis}`,`Evidence: ${driver.evidenceSummary.customerSupported} customer-supported; ${driver.evidenceSummary.needsRevalidation||0} need revalidation; ${driver.evidenceSummary.repValidated} rep validated; ${driver.evidenceSummary.repEstimates} rep estimates; ${driver.evidenceSummary.modelAssumptions} model assumptions`,driver.overlapNote?`Overlap treatment: ${driver.overlapNote}`:'Included in the authoritative Annual Customer Benefit.']}))},
  {heading:'4. Methodology & Evidence Notes',keepTogetherHeight:180,lines:report.methodologyNotes.map(note=>`- ${note}`)}
 ];
 return buildTextPdf({title:report.title,subtitle:`${report.subtitle} | ${report.identity.customer} | ${report.identity.scenario} v${report.identity.scenarioVersion}`,sections,audience,draft,review});
}
module.exports={buildRoiAssumptionsPdf,inputValue};
