'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {buildProposalPdf}=require('../src/exports/proposal-pdf');
const {buildRoiMethodologyPdf}=require('../src/exports/roi-methodology-pdf');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const story={meta:{customer:'Acme',solution:'CIP',currency:'GBP'},threeWhys:{whyChange:{value:'Reduce inventory loss'},whyNow:{value:'Before the ERP transition'},whyCloudInventory:{value:'Validated operational fit'}},economics:{annualBenefit:125000,totalContractBenefit:375000,totalContractInvestment:100000,netEconomicBenefit:275000,contractRoi:275,payback:9,priorityWorkflows:[]},solutionAlignment:{priorityWorkflows:[{name:'Cycle counting'}]},nextSteps:{items:[{milestone:'Validate case',owner:'Joint team',dueDate:'2026-10-15'}]}};
const proposal={title:'Acme Executive Proposal',situation:'Current inventory processes create avoidable cost.',recommendation:'Adopt Cloud Inventory.'};
const report={customer:{name:'Acme'},currency:'GBP',financials:{annualBenefit:125000,totalBenefit:375000,totalInvestment:100000,netValue:275000,contractRoi:275,npv:240000,paybackMonths:9,investmentEstablished:true},benefits:[{label:'Inventory reduction',annualValue:125000}],contract:{months:36,implementationMonths:6},assumptions:{discountRate:.08,customerSupportedValuePct:80}};

test('Proposal PDF is a real governed file for Ready, Review, and Draft',()=>{
 const ready=buildProposalPdf({story,proposal,audience:'customer',draft:false}),review=buildProposalPdf({story,proposal,audience:'customer',draft:false,review:true}),draft=buildProposalPdf({story,proposal,audience:'internal',draft:true});
 for(const pdf of [ready,review,draft])assert.equal(pdf.subarray(0,4).toString(),'%PDF');
 assert.match(ready.toString('latin1'),/Confidential and Proprietary/);assert.doesNotMatch(ready.toString('latin1'),/INTERNAL USE ONLY/);
 assert.match(review.toString('latin1'),/REVIEW BEFORE SHARING/);
 assert.match(draft.toString('latin1'),/INTERNAL USE ONLY/);assert.match(draft.toString('latin1'),/NOT READY FOR CUSTOMER SHARING/);assert.doesNotMatch(draft.toString('latin1'),/Confidential and Proprietary/);
 for(const pdf of [ready,review,draft])assert.doesNotMatch(pdf.toString('latin1'),/Alternate £150,000|commercialTerms/);
});

test('ROI Methodology PDF is generated from canonical report values',()=>{const pdf=buildRoiMethodologyPdf(report),body=pdf.toString('latin1');assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.match(body,/ROI Model v2\.8/);assert.match(body,/125,000 GBP/);assert.match(body,/INTERNAL USE ONLY/);});

test('Proposal and methodology client exports use bounded server file downloads',()=>{const adapter=read('public/executive-output-adapters.js'),deal=read('public/deal-export.js'),server=read('server.js');assert.match(adapter,/withExecutiveExportDeadline/);assert.match(adapter,/api\/export\/proposal-pdf/);assert.match(adapter,/api\/export\/proposal-docx/);assert.match(adapter,/credentials:'same-origin'/);assert.doesNotMatch(adapter.slice(adapter.indexOf('async function proposalFileExport'),adapter.indexOf("if(typeof window.shareBusinessCase")),/window\.open|\.print\(/);assert.match(deal.slice(deal.indexOf('async function roiMethodologyPDF'),deal.indexOf('const m = buildRoiMethodology')),/api\/export\/roi-methodology-pdf/);assert.match(server,/prepareProposalExport/);});

test('active output audit executes successfully after the proposal service refactor',()=>{const result=spawnSync(process.execPath,['scripts/audit-active-output-paths.js'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.stdout);assert.match(result.stdout,/Active output prohibited-pattern audit passed/);});
