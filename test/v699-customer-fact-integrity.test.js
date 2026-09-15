'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const economic=require('../public/economic-availability');
const email=require('../public/customer-email');
const {evaluateExecutiveOutputReadiness}=require('../src/shared/executive-output-readiness');

test('economic availability distinguishes missing, zero, numeric and payback states',()=>{
 for(const value of [null,undefined,''])assert.equal(economic.hasEconomicValue(value),false);
 assert.equal(economic.hasEconomicValue(0),true);assert.equal(economic.percent(0),'0%');assert.equal(economic.percent(125.4),'125%');assert.equal(economic.percent(null),'Not yet established');
 assert.equal(economic.paybackLabel({totalContractInvestment:null,payback:null}),'Payback not yet established');
 assert.equal(economic.paybackLabel({totalContractInvestment:100,payback:null}),'Payback not achieved within contract term');
 assert.equal(economic.paybackLabel({totalContractInvestment:100,payback:0}),'0.0 months');
});

test('formal customer output is draft-only when investment or ROI is not established',()=>{
 const story={meta:{scenarioId:'s1',customer:'Acme'},threeWhys:{whyChange:{value:'A',source:'customer_discovery'},whyNow:{value:'B',source:'customer_discovery'},whyCloudInventory:{value:'C',source:'customer_validated'}},economics:{annualBenefit:100,totalContractBenefit:300,totalContractInvestment:null,netEconomicBenefit:null,contractRoi:null,npv:null,payback:null,maturity:{level:2},activeDrivers:[]},solutionAlignment:{exists:true},implementationContext:{modelingMonths:0},nextSteps:{items:[{}]},unavailableProofIds:[]};
 const result=evaluateExecutiveOutputReadiness(story,{outputType:'pdf'});assert.equal(result.status,'draft_only');assert.ok(result.blockers.some(x=>x.id==='financial_validity'));
});

test('customer email composes immutable governed facts with seller-editable wrappers',()=>{
 const story={storyRevision:'rev-1',meta:{customer:'Acme'},economics:{currency:'USD',annualBenefit:50000,totalContractBenefit:150000,totalContractInvestment:75000,netEconomicBenefit:75000,contractRoi:100,payback:18},threeWhys:{whyChange:{value:'Reduce inventory effort'},whyNow:{value:'Before renewal'},whyCloudInventory:{value:'Validated fit'}},activeDrivers:[]};
 const built=email.buildCustomerEmail(story);const composed=email.compose(built,{greeting:'Hello Pat,',intro:'Seller introduction',closing:'Regards, James'});
 assert.match(composed.body,/Hello Pat/);assert.match(composed.body,/Seller introduction/);assert.match(composed.body,/100%/);assert.match(composed.body,/Reduce inventory effort/);
 const styled=email.mergePersonalization(built,{intro:'Invented customer promise',introStyle:'unsupported',closingStyle:'unsupported'});assert.doesNotMatch(styled.intro,/Invented customer promise/);assert.equal(styled.styles.introStyle,'consultative');assert.equal(styled.styles.closingStyle,'validation');
});

test('proposal and email architecture reject client and AI rewrites of governed facts',()=>{
 const proposal=read('public/proposal.js'),features=read('public/features.js'),state=read('src/shared/proposal-state.js');
 assert.match(proposal,/renderGovernedProposalDocument/);assert.match(proposal,/situation[\s\S]*recommendation/);assert.doesNotMatch(proposal,/Return JSON only with keys[^\n]*(?:outcome|whyAct|whyCloud|whyNow)/);
 assert.doesNotMatch(state,/['"]company['"]|['"]scope['"]|['"]whyAct['"]/);
 assert.match(features,/storyRevision/);assert.match(features,/composeCurrentGovernedEmail/);assert.doesNotMatch(read('public/index.html'),/id="emailBody"/);
});

test('all registered customer economic formatters use the canonical availability helper',()=>{
 const files=['public/executive-output-adapters.js','public/proposal.js','public/customer-email.js','public/business-case.js','src/exports/executive-pdf.js','src/exports/executive-docx.js','src/exports/executive-pptx.js','server.js'];
 for(const file of files)assert.match(read(file),/economic|CIEconomicAvailability/,file);
 assert.doesNotMatch(read('src/email.js'),/Nextworld Company/);
 assert.match(read('BUILD_GOVERNANCE_CONTRACT.md'),/NULL IS NOT ZERO INVARIANT/);
});
