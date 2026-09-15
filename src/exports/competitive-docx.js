'use strict';
const {Document,Packer,Paragraph,TextRun,Footer,HeadingLevel,AlignmentType}=require('docx');
const brand=require('../shared/brand-system');

async function buildCompetitiveDocx({competitorName,authorityLabel,findings=[],company='',repName='',logoData}){
 if(!competitorName)throw new Error('Approved Battlecard product is required.');
 const theme=brand.documentTheme('internal'),safe=value=>String(value==null?'':value).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,1600);
 const run=(value,opts={})=>new TextRun({text:safe(value),font:theme.font,size:theme.type.body,...opts});
 const para=(value,opts={})=>new Paragraph({children:[run(value,opts.run||{})],...opts});
 const children=[para('INTERNAL COMPETITIVE INTELLIGENCE',{run:{bold:true,color:theme.danger}}),para(`Competitive Battlecard: ${safe(competitorName)}`,{run:{bold:true,size:theme.type.pageTitle,color:theme.heading}}),para(authorityLabel,{run:{bold:true,color:theme.muted}}),para(`${safe(company)}${repName?' · Prepared by '+safe(repName):''}`)];
 if(logoData)children.unshift(new Paragraph({children:[new (require('docx').ImageRun)({data:logoData,transformation:{width:180,height:Math.round(180*theme.logoAspect)}})]}));
 children.push(new Paragraph({text:'Approved findings',heading:HeadingLevel.HEADING_2}));
 for(const finding of findings)children.push(para(`${safe(finding.category||'Finding')}: ${safe(finding.claim)}`,{bullet:{level:0}}));
 const doc=new Document({sections:[{footers:{default:new Footer({children:[new Paragraph({children:[run(theme.footer,{size:theme.type.caption,color:theme.muted})],alignment:AlignmentType.CENTER})]})},children}]});
 return Packer.toBuffer(doc);
}
module.exports={buildCompetitiveDocx};
