'use strict';
const {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,Footer,HeadingLevel,WidthType,BorderStyle,ShadingType,TableLayoutType,AlignmentType}=require('docx');
const brand=require('../shared/brand-system');
const economic=require('../../public/economic-availability');
const {customerCommercialTerms}=require('../shared/proposal-output');

const clean=(value,max=1600)=>String(value==null?'':value).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
const items=(value,limit=12)=>Array.isArray(value)?value.slice(0,limit):[];

async function buildProposalDocx({story,proposal,audience='customer',draft=false,logoData}){
 if(!story||!proposal)throw new Error('Canonical Executive Value Story and saved Proposal are required.');
 if(!['customer','internal'].includes(audience)||draft!==(audience==='internal'))throw new Error('Proposal audience does not match governed draft state.');
 const theme=brand.documentTheme(audience),company=clean(story.meta.customer,160)||'Prospect';
 const run=(value,opts={})=>new TextRun({text:clean(value),font:theme.font,size:theme.type.body,...opts});
 const para=(value,opts={})=>new Paragraph({children:[run(value,opts.run||{})],...opts});
 const heading=value=>new Paragraph({text:clean(value),heading:HeadingLevel.HEADING_2,spacing:{before:250,after:90}});
 const bullets=values=>items(values).map(value=>new Paragraph({children:[run(value)],bullet:{level:0},spacing:{after:60}}));
 const table=(values,left,right)=>new Table({rows:items(values).map(row=>new TableRow({children:[
  new TableCell({children:[para(row[left],{run:{bold:true}})],width:{size:4300,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:theme.canvas},borders:{bottom:{style:BorderStyle.SINGLE,size:1,color:theme.border}}}),
  new TableCell({children:[para(row[right])],width:{size:4700,type:WidthType.DXA},borders:{bottom:{style:BorderStyle.SINGLE,size:1,color:theme.border}}})
 ]})),width:{size:9000,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[4300,4700]});
 const money=value=>economic.hasEconomicValue(value)?`${Number(value).toLocaleString()} ${story.meta.currency}`:'Not yet established';
 const meta=[{label:'Prepared for',value:company},{label:'Prepared by',value:clean(proposal.preparedBy,160)||'Cloud Inventory'},{label:'Solution',value:clean(story.meta.solution,180)},{label:'Contract term',value:`${story.economics.contractMonths} months`},{label:'Proposal date',value:clean(proposal.proposalDate,40)},{label:'Valid through',value:clean(proposal.validThrough,40)}];
 const children=[];
 if(logoData)children.push(new Paragraph({children:[new ImageRun({data:logoData,transformation:{width:180,height:Math.round(180*theme.logoAspect)}})],spacing:{after:90}}));
 children.push(
  para('Commercial proposal',{run:{bold:true,size:theme.type.label,color:theme.accent},spacing:{before:160,after:80}}),
  para(clean(proposal.title,220)||`${company} executive proposal`,{run:{bold:true,size:theme.type.display,color:theme.heading},spacing:{after:110}}),
  para(`Prepared for ${company}`,{run:{size:theme.type.sectionHeading,color:theme.muted},spacing:{after:160}}),table(meta,'label','value')
 );
 if(draft)children.push(para('CONFIDENTIAL — INTERNAL USE ONLY',{run:{bold:true,color:theme.danger}}),para('DRAFT — NOT READY FOR CUSTOMER SHARING',{run:{bold:true,color:theme.danger}}));
 children.push(heading('Executive summary'),para(proposal.situation),new Paragraph({text:'Our recommendation',heading:HeadingLevel.HEADING_3}),para(proposal.recommendation),
  heading('Expected outcome'),para(`${money(story.economics.annualBenefit)} annual customer benefit; ${money(story.economics.totalContractBenefit)} total contract benefit; ${money(story.economics.netEconomicBenefit)} net economic benefit; ${economic.percent(story.economics.contractRoi)} contract ROI; ${economic.paybackLabel(story.economics)}.`),
  heading('The value case'),new Paragraph({text:'Why change',heading:HeadingLevel.HEADING_3}),para(story.threeWhys.whyChange.value),new Paragraph({text:'Why Cloud Inventory',heading:HeadingLevel.HEADING_3}),para(story.threeWhys.whyCloudInventory.value),new Paragraph({text:'Why now',heading:HeadingLevel.HEADING_3}),para(story.threeWhys.whyNow.value),
  heading('Solution and investment'),new Paragraph({text:'In scope',heading:HeadingLevel.HEADING_3}),...bullets(items(story.solutionAlignment.priorityWorkflows).map(x=>x.name)),new Paragraph({text:'Modeled Customer Investment',heading:HeadingLevel.HEADING_3}),para(`${money(story.economics.totalContractInvestment)} — read only from the ROI model.`),new Paragraph({text:'Commercial terms',heading:HeadingLevel.HEADING_3}),para(customerCommercialTerms),
  heading('Success and next steps'),...bullets(items(story.nextSteps.items).map(x=>[x.milestone,x.owner,x.dueDate].filter(Boolean).join(' — ')))
 );
 const doc=new Document({sections:[{footers:{default:new Footer({children:[new Paragraph({children:[run(`${theme.footer} · Prepared for ${company} · Story ${story.storyRevision}`,{size:theme.type.caption,color:theme.muted})],alignment:AlignmentType.CENTER})]})},children}]});
 return Packer.toBuffer(doc);
}
module.exports={buildProposalDocx};
