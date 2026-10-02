'use strict';
const {buildTextPdf}=require('./executive-pdf');
const economic=require('../../public/economic-availability');
const {customerCommercialTerms}=require('../shared/proposal-output');

function buildProposalPdf({story,proposal,audience='customer',draft=false,review=false}){
 if(!story||!proposal)throw new Error('Canonical Executive Value Story and saved Proposal are required.');
 if(!['customer','internal'].includes(audience)||draft!==(audience==='internal'))throw new Error('Proposal audience does not match governed draft state.');
 const money=value=>economic.hasEconomicValue(value)?`${Number(value).toLocaleString()} ${story.meta.currency}`:'Not yet established';
 const whys=story.threeWhys||{},economics=story.economics||{},steps=story.nextSteps?.items||[],workflows=story.solutionAlignment?.priorityWorkflows||[];
 return buildTextPdf({
  title:proposal.title||`${story.meta.customer||'Customer'} Executive Proposal`,
  subtitle:`Prepared for ${story.meta.customer||'Customer'} | ${story.meta.solution||'Cloud Inventory'}`,
  audience,draft,review,
  sections:[
   {heading:'Executive summary',lines:[proposal.situation||'To be completed.',`Our recommendation: ${proposal.recommendation||'To be completed.'}`]},
   {heading:'Expected outcome',lines:[`${money(economics.annualBenefit)} annual customer benefit`,`${money(economics.totalContractBenefit)} total contract benefit`,`${money(economics.totalContractInvestment)} modeled customer investment`,`${money(economics.netEconomicBenefit)} net economic benefit`,`${economic.percent(economics.contractRoi)} contract ROI`,economic.paybackLabel(economics)]},
   {heading:'The value case',lines:[`Why change: ${whys.whyChange?.value||'To validate'}`,`Why Cloud Inventory: ${whys.whyCloudInventory?.value||'To validate'}`,`Why now: ${whys.whyNow?.value||'To validate'}`]},
   {heading:'Solution and investment',lines:[...(workflows.length?workflows.map(x=>x.name||x):['Solution scope remains to be validated.']),`Modeled Customer Investment: ${money(economics.totalContractInvestment)} - read only from the ROI model.`,`Commercial terms: ${customerCommercialTerms}`]},
   {heading:'Success and next steps',lines:steps.length?steps.map(x=>[x.milestone,x.owner,x.dueDate].filter(Boolean).join(' - ')):['Joint next steps remain to be agreed.']}
  ]
 });
}
module.exports={buildProposalPdf};
