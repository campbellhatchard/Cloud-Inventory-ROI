'use strict';
const fs=require('fs'),path=require('path');
const { Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,Footer,Header,HeadingLevel,WidthType,ShadingType,AlignmentType,PageBreak }=require('docx');
const brand=require('../shared/brand-system'),theme=brand.documentTheme('customer');
const hex=value=>String(value||'').replace('#',''),money=(n,c)=>`${c} ${Math.round(Number(n)||0).toLocaleString('en-US')}`,pct=n=>n==null?'N/A':`${Math.round(Number(n))}%`;
const text=(value,opts={})=>new TextRun({text:String(value==null?'':value),font:theme.font,size:opts.size||theme.type.body,bold:opts.bold,color:hex(opts.color||theme.body),break:opts.break});
const p=(value,opts={})=>new Paragraph({children:Array.isArray(value)?value:[text(value,opts)],heading:opts.heading,spacing:{after:opts.after==null?120:opts.after,line:276},alignment:opts.alignment,keepNext:opts.keepNext});
const heading=value=>p(value,{heading:HeadingLevel.HEADING_1,keepNext:true});
const cell=(value,{shade,bold=false,width}={})=>new TableCell({width:width?{size:width,type:WidthType.DXA}:undefined,shading:shade?{type:ShadingType.CLEAR,fill:hex(shade)}:undefined,margins:{top:80,bottom:80,left:100,right:100},children:[p(value,{bold,color:shade?'FFFFFF':theme.body,after:0})]});
const table=(headers,rows,widths)=>new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({tableHeader:true,children:headers.map((h,i)=>cell(h,{shade:theme.tableHeader,bold:true,width:widths?.[i]}))}),...rows.map(row=>new TableRow({children:row.map((v,i)=>cell(v,{width:widths?.[i]}))}))]});

async function buildExecutiveDocx(report,{internalDraft=false}={}){
 const logo=fs.readFileSync(path.join(__dirname,'../../public',brand.logo(theme.logoRole)));
 const f=report.financials,children=[];
 children.push(new Paragraph({children:[new ImageRun({data:logo,transformation:{width:150,height:Math.round(150*theme.logoAspect)}})],spacing:{after:420}}));
 children.push(p('EXECUTIVE BUSINESS CASE',{bold:true,size:24,color:theme.accessibleAccent,after:180}));
 children.push(p(report.customer.name,{bold:true,size:40,color:theme.heading,after:160}));
 children.push(p(`${report.opportunity.solution} · ${report.contract.months}-month value case`,{size:24,color:theme.muted,after:300}));
 if(internalDraft)children.push(p('DRAFT — NOT READY FOR CUSTOMER SHARING',{bold:true,color:theme.danger,after:300}));
 children.push(p(`Prepared by ${report.opportunity.preparedBy||'Cloud Inventory'} · ${report.generatedAt.slice(0,10)}`,{color:theme.muted}));
 children.push(new Paragraph({children:[new PageBreak()]}));
 children.push(heading('Executive value story'));
 for(const [label,item] of [['Why change',report.executiveSummary.threeWhys.whyChange],['Why now',report.executiveSummary.threeWhys.whyNow],['Why Cloud Inventory',report.executiveSummary.threeWhys.whyCloudInventory]]){children.push(p(label,{bold:true,color:theme.accessibleAccent,keepNext:true}));children.push(p(item.value));children.push(p(item.status,{size:theme.type.small,color:theme.muted}));}
 children.push(heading('Financial summary'));
 children.push(table(['Metric','Value'],[
  ['Annual customer benefit',money(f.annualBenefit,report.currency)],['Total contract benefit',money(f.totalBenefit,report.currency)],['Modeled customer investment',money(f.totalInvestment,report.currency)],['Net economic benefit',money(f.netValue,report.currency)],['Total contract ROI',pct(f.contractRoi)],['NPV',money(f.npv,report.currency)],['Payback',f.paybackMonths==null?'Not achieved within contract term':`${f.paybackMonths.toFixed(1)} months`]
 ],[5500,3500]));
 children.push(heading('Contract value by year'));
 children.push(table(['Year','Benefit','Investment','Net value','Cumulative ROI'],report.years.map(row=>[String(row.year),money(row.benefit,report.currency),money(row.investment,report.currency),money(row.netValue,report.currency),pct(row.cumulativeRoi)]),[900,2100,2100,2100,1800]));
 children.push(p('Cumulative value chart',{bold:true,color:theme.heading,after:80}));
 const max=Math.max(1,...report.chartData.contractTimeline.flatMap(x=>[x.benefit,x.investment,Math.max(0,x.netValue)]));
 const blocks=(value,color)=>Array.from({length:12},(_,i)=>new TableCell({shading:{type:ShadingType.CLEAR,fill:i<Math.round(12*Math.max(0,value)/max)?hex(color):hex(theme.border)},margins:{top:50,bottom:50,left:0,right:0},children:[p('',{after:0})]}));
 const chartRows=[];for(const row of report.chartData.contractTimeline){chartRows.push(new TableRow({children:[cell(`${row.label} benefit`,{width:1700}),...blocks(row.benefit,theme.accent)]}));chartRows.push(new TableRow({children:[cell(`${row.label} investment`,{width:1700}),...blocks(row.investment,theme.warning)]}));chartRows.push(new TableRow({children:[cell(`${row.label} net value`,{width:1700}),...blocks(row.netValue,theme.success)]}));}
 children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:chartRows}));
 children.push(heading('Annual value composition'));
 children.push(table(['Value driver','Annual value','Evidence status'],report.benefits.map(item=>[item.label,money(item.annualValue,report.currency),item.status]),[4400,2200,2400]));
 children.push(heading('Model assumptions'));
 children.push(table(['Assumption','Value'],[['Contract term',`${report.contract.months} months`],['Implementation period',`${report.contract.implementationMonths} months`],['Discount rate',`${(report.assumptions.discountRate*100).toFixed(1)}%`],['ROI model version',String(report.assumptions.modelVersion||'Current')],['Customer-supported value',`${report.assumptions.customerSupportedValuePct}%`]], [5000,4000]));
 children.push(heading('Solution alignment'));
 children.push(p(report.solutionFit.exists?`${report.solutionFit.products.join(', ')||report.opportunity.solution}${report.solutionFit.systemOfRecord?' · System of record: '+report.solutionFit.systemOfRecord:''}`:'Solution alignment remains to be validated.'));
 children.push(heading('Joint next steps'));
 if(report.jointProjectPlan.items.length)for(const item of report.jointProjectPlan.items.slice(0,10))children.push(new Paragraph({bullet:{level:0},children:[text(`${item.milestone} — ${item.owner}${item.dueDate?' — '+item.dueDate:''}`)],spacing:{after:100}}));else children.push(p(report.jointProjectPlan.message));
 if(report.stakeholders.length){children.push(heading('Customer stakeholders'));children.push(table(['Name','Title'],report.stakeholders.map(x=>[x.name,x.title]),[4500,4500]));}
 const doc=new Document({creator:'Cloud Inventory',company:'Cloud Inventory',title:`Executive Business Case — ${report.customer.name}`,description:'Customer-facing ROI business case generated from the authoritative saved scenario.',styles:{default:{document:{run:{font:theme.font,size:theme.type.body,color:hex(theme.body)},paragraph:{spacing:{after:120,line:276}}}},paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:theme.font,size:theme.type.pageTitle,bold:true,color:hex(theme.heading)},paragraph:{spacing:{before:260,after:140},keepNext:true}},{id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:theme.font,size:theme.type.sectionHeading,bold:true,color:hex(theme.accessibleAccent)},paragraph:{spacing:{before:180,after:100},keepNext:true}}]},sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},headers:{default:new Header({children:[new Paragraph({children:[text('CLOUD INVENTORY',{bold:true,size:18,color:theme.heading})],alignment:AlignmentType.RIGHT})]})},footers:{default:new Footer({children:[new Paragraph({children:[text(brand.audience(internalDraft?'internal':'customer'),{size:theme.type.caption,color:theme.muted})],alignment:AlignmentType.CENTER})]})},children}]});
 return Packer.toBuffer(doc);
}
module.exports={buildExecutiveDocx};
