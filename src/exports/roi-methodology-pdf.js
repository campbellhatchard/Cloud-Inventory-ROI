'use strict';
const {buildTextPdf}=require('./executive-pdf');
const economic=require('../../public/economic-availability');

function buildRoiMethodologyPdf(report){
 if(!report?.customer||!report?.financials)throw new Error('Canonical ROI report is required.');
 const money=value=>economic.hasEconomicValue(value)?`${Number(value).toLocaleString()} ${report.currency}`:'Not yet established';
 const drivers=(report.benefits||[]).map(x=>`${x.label}: ${money(x.annualValue)} per year`);
 return buildTextPdf({title:'ROI Methodology & Calculation Detail',subtitle:`${report.customer.name} | ROI Model v2.8`,audience:'internal',draft:true,sections:[
  {heading:'Model authority',lines:['ROI Model v2.8 / modelVersion 28 is the sole calculation authority. This document reports saved model results and does not independently recalculate ROI.']},
  {heading:'Governed economic summary',lines:[`Annual benefit: ${money(report.financials.annualBenefit)}`,`Contract benefit: ${money(report.financials.totalBenefit)}`,`Modeled customer investment: ${money(report.financials.totalInvestment)}`,`Net value: ${money(report.financials.netValue)}`,`Contract ROI: ${economic.percent(report.financials.contractRoi)}`,`NPV: ${money(report.financials.npv)}`,`Payback: ${economic.paybackLabel({paybackMonths:report.financials.paybackMonths,investmentEstablished:report.financials.investmentEstablished})}`]},
  {heading:'Counted annual value drivers',lines:drivers.length?drivers:['No positive value driver is currently active.']},
  {heading:'Model assumptions',lines:[`Contract term: ${report.contract.months} months`,`Implementation period: ${report.contract.implementationMonths} months`,`Discount rate: ${(Number(report.assumptions.discountRate||0)*100).toFixed(1)}%`,`Customer-supported value: ${report.assumptions.customerSupportedValuePct}%`,'Overlap controls, contribution-margin treatment, ramp, and economic classifications remain governed by the canonical ROI engine.']}
 ]});
}
module.exports={buildRoiMethodologyPdf};
