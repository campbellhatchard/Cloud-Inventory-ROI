'use strict';
const fs=require('fs'),path=require('path');
const {buildCustomerROIReportData}=require('../src/shared/customer-roi-report');
const {buildExecutivePdf}=require('../src/exports/executive-pdf');
const {buildExecutivePptx}=require('../src/exports/executive-pptx');
const {buildExecutiveDocx}=require('../src/exports/executive-docx');
const {buildJppPptx,buildStakeholderPptx}=require('../src/exports/operational-pptx');
const source={scenario:{id:'qa-scenario',base_id:'qa-base',version:1,customer_id:'qa-customer',company:'Acme Distribution',industry:'Wholesale Distribution',solution:'Cloud Inventory Platform',owner_username:'Jordan Lee',data:{currency:'USD',contractMonths:36,modelVersion:28,users:60,labor:65000,laborWastePct:.12,mLabor:.35,effectiveShrinkBase:900000,mShrinkage:.4,inventory:18000000,carryRate:.22,mCarrying:.3,invTurnsCurrent:3,invTurnsBenchmark:5,revenue:250000000,otifBaseline:91,otifTarget:97,contributionMarginPct:.34,mOtif:.35,invest:175000,otc:225000,discRate:.09,implMonths:4,ramp1:.4,ramp2:.75,ramp3:1,threeWhysAct:'Inventory uncertainty increases operating cost, consumes capacity, and creates avoidable customer service risk.',threeWhysNow:'A dated modernization program creates the opportunity to validate the value case and align stakeholders before the next planning cycle.',threeWhysCi:'Cloud Inventory provides governed inventory execution across existing systems while improving visibility, accuracy, and operating control.'}},governance:{evidence:{}},stakeholders:[{name:'Alex Morgan',title:'Chief Operations Officer',role:'Economic buyer',engaged:true},{name:'Sam Patel',title:'VP Distribution',role:'Business owner',engaged:true}],discovery:[],solutionFit:{data:{opportunity:{products:['CIP'],users:'60',goLive:'Q1 2027'},architecture:{erp:'ERP platform',integrationMethod:'API'}}},jointProjectPlan:{milestones:[{task:'Validate value drivers and assumptions',owner:'joint',dueDate:'2026-10-15',status:'pending'},{task:'Confirm implementation scope',owner:'prospect',dueDate:'2026-10-30',status:'pending'}]},proposal:null,valueHistory:[]};
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
(async()=>{for(const currency of ['USD','GBP']){
const s=structuredClone(source);s.scenario.data.currency=currency;s.scenario.company='Northstar International Distribution and Field Operations Group';
for(const k of ['threeWhysAct','threeWhysNow','threeWhysCi'])s.scenario.data[k]=(s.scenario.data[k]+' ').repeat(5);
const report=buildCustomerROIReportData(s);
fs.writeFileSync(path.join(out,currency+'-executive.pdf'),buildExecutivePdf(report));
fs.writeFileSync(path.join(out,currency+'-executive.pptx'),await buildExecutivePptx(report));
fs.writeFileSync(path.join(out,currency+'-executive.docx'),await buildExecutiveDocx(report));
fs.writeFileSync(path.join(out,currency+'-jpp.pptx'),await buildJppPptx({company:s.scenario.company,title:'Joint Project Plan',milestones:s.jointProjectPlan.milestones.map(m=>({...m,title:m.task}))},{audience:currency==='USD'?'customer':'internal'}));
fs.writeFileSync(path.join(out,currency+'-stakeholders.pptx'),await buildStakeholderPptx({company:s.scenario.company,stakeholders:s.stakeholders}));
}console.log(out);})().catch(e=>{console.error(e);process.exitCode=1;});
