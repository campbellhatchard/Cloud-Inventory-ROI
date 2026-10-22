'use strict';

const {
  Document,Packer,Paragraph,TextRun,ImageRun,Footer,HeadingLevel,AlignmentType,
  Table,TableRow,TableCell,WidthType,BorderStyle
}=require('docx');
const brand=require('../shared/brand-system');
const SolutionFitState=require('../../public/solution-fit-state');

const clean=(value,max=4000)=>String(value==null?'':value).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);

async function buildSolutionFitTurnoverDocx({data,customerName='',accountExecutive='',logoData}){
  const state=SolutionFitState.migrateState(JSON.parse(JSON.stringify(data||{})));
  const theme=brand.documentTheme('internal');
  const run=(value,opts={})=>new TextRun({text:clean(value),font:theme.font,size:theme.type.body,color:theme.body,...opts});
  const paragraph=(value,opts={})=>new Paragraph({children:[run(value,opts.run||{})],spacing:{after:opts.after??100},...opts});
  const heading=(value)=>new Paragraph({text:clean(value),heading:HeadingLevel.HEADING_2,spacing:{before:260,after:120}});
  const bullet=(value)=>new Paragraph({children:[run(value)],bullet:{level:0},spacing:{after:70}});
  const line=(label,value)=>paragraph(`${label}: ${clean(value)||'Not yet established'}`);
  const cell=(value,bold=false)=>new TableCell({children:[paragraph(value,{run:{bold}})],margins:{top:90,bottom:90,left:110,right:110}});
  const simpleTable=(headers,rows,widths)=>new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    columnWidths:widths,
    borders:{top:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},bottom:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},left:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},right:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'}},
    rows:[new TableRow({tableHeader:true,children:headers.map(value=>cell(value,true))}),...rows.map(row=>new TableRow({children:row.map(value=>cell(value))}))]
  });
  const children=[];
  if(logoData)children.push(new Paragraph({children:[new ImageRun({data:logoData,transformation:{width:190,height:Math.round(190*theme.logoAspect)}})],spacing:{after:160}}));
  children.push(
    paragraph('PROFESSIONAL SERVICES TURNOVER',{run:{bold:true,color:theme.accent,size:theme.type.label}}),
    paragraph('Solution Fit & Sales Turnover',{run:{bold:true,color:theme.heading,size:theme.type.pageTitle},after:60}),
    paragraph(clean(customerName||state.opportunity.customer||'Customer'),{run:{bold:true,color:theme.heading,size:theme.type.sectionTitle}}),
    paragraph(`Generated ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · CONFIDENTIAL — INTERNAL USE ONLY`,{run:{color:theme.muted,size:theme.type.caption}})
  );

  children.push(heading('Account and business context'));
  children.push(line('Account Executive',accountExecutive),line('Solution Engineer',state.opportunity.solutionEngineer),line('Opportunity stage',state.opportunity.stage));
  children.push(line('Products',(state.opportunity.products||[]).join(', ')),line('Business problem',state.opportunity.problem),line('Desired business outcomes',state.opportunity.outcome));
  children.push(line('Business owner',[state.opportunity.businessOwnerName,state.opportunity.businessOwnerTitle].filter(Boolean).join(' · ')),line('Technical owner',[state.opportunity.technicalOwnerName,state.opportunity.technicalOwnerTitle].filter(Boolean).join(' · ')));
  children.push(line('Users',state.opportunity.users),line('Locations',state.opportunity.locations),line('Target go-live',state.opportunity.goLive));

  children.push(heading('General inventory configuration'));
  children.push(simpleTable(['Requirement','Response','Notes'],SolutionFitState.INVENTORY_ITEMS.map(name=>[name,state.inventoryConfiguration[name]?.answer||'Not answered',state.inventoryConfiguration[name]?.note||'']),[3300,1700,3800]));
  if(state.inventoryConfiguration['LPNs / Handling Units / Packing Units']?.answer==='Yes'){
    children.push(paragraph('LPN / Handling Unit detail',{run:{bold:true},after:60}));
    for(const name of SolutionFitState.LPN_ITEMS)children.push(bullet(`${name}: ${state.lpnConfiguration[name]||'Not answered'}`));
  }

  const selected=state.processes.filter(process=>process.selected);
  children.push(heading('Product and application scope'));
  children.push(line('MEP ERP family',state.solutionScope.erp),line('MEP scope approach',state.solutionScope.packageMode==='standard'?'Standard Package':'Custom scope'));
  children.push(simpleTable(['Product / application','Demo status','Fit','Customer validation','Exceptions and evidence'],selected.map(process=>[[process.product,process.name].filter(Boolean).join(' · '),process.demoStatus,process.fit,process.customerValidation,process.notes]),[2500,1500,1300,1800,3000]));

  children.push(heading('Labels, integrations, and delivery constraints'));
  children.push(line('Sites needing label printing',state.printing.sites),line('Number of labels',state.printing.labelCount),line('Printing solution',state.printing.solution),line('Custom label requirements',state.printing.notes));
  children.push(line('System relationship',state.architecture.relationship),line('ERP / system of record',state.architecture.erp),line('Version',state.architecture.version),line('Primary integration method',state.architecture.integrationMethod),line('Integration owner',state.architecture.integrationOwner),line('Integration notes',state.architecture.integrationNotes));
  if(state.interfaces.length)children.push(simpleTable(['Source','Target','Object / purpose','Method','Owner'],state.interfaces.map(item=>[item.source,item.target,item.object,item.method,item.owner]),[1800,1800,2500,1700,1600]));

  children.push(heading('Gaps, exceptions, and actions'));
  if(state.gaps.length)children.push(simpleTable(['Application / gap','Priority','Impact','Resolution / workaround','Owner / target','Status'],state.gaps.map(gap=>[[gap.process,gap.gapDescription||gap.need].filter(Boolean).join(' — '),gap.priority,gap.impact,gap.resolution,[gap.owner,gap.targetDate].filter(Boolean).join(' · '),gap.status]),[2300,1100,1800,2400,1700,1200]));
  else children.push(paragraph('No gaps or exceptions have been recorded.'));

  const t=state.turnover;
  children.push(heading('Professional Services turnover details'));
  const turnoverRows=[
    ['Contract review',t.contractStatus],['Critical success factors',t.successFactors],['Contract considerations',t.contractConsiderations],['Solution Architect',t.solutionArchitect],['Customer ID',t.customerId],['Sales cycle',t.salesCycle],['Relationship history',t.relationshipHistory],
    ['Project Manager',t.projectManager],['Project Manager email',t.projectManagerEmail],['Business SMEs',t.businessSmes],['IT Lead',t.itLead],['System Administrator email',t.systemAdminEmail],['Infrastructure contact',t.infrastructureContact],
    ['Delivery model',t.deliveryModel],['Implementation partner',t.implementationPartner],['Internal delivery contact',t.internalDeliveryContact],['Partner delivery contact',t.partnerDeliveryContact],['Partner responsibilities',t.partnerResponsibilities],['Project start',t.projectStart],['Kickoff date',t.kickoffDate],['Date drivers and dependencies',t.dateDrivers],['Third parties',t.thirdParties],
    ['Customer edition',t.eapEdition],['Number of environments',t.environments],['Authorized languages',t.authorizedLanguages],['Authorized solution definitions',t.authorizedDefinitions],['Customer email domain',t.customerDomain],['Partner implementer email',t.partnerImplementerEmail],['MEP License ID',t.mepLicenseId],['EPP deployment',t.eppDeployment],['EPP License ID',t.eppLicenseId],
    ['Deployment model',t.deploymentModel],['System sizing document',t.sizingDocument],['Current warehouse system',t.currentWarehouse],['Device types planned',t.deviceTypes],['Hardware and device status',t.hardwareStatus],['Device readiness',t.deviceStatus],['Network and infrastructure constraints',t.networkConstraints],['Signed order form and SOW',t.sowLink],['RFP response',t.rfpLink],['Discovery materials',t.discoveryLink],['Onsite visit report',t.onsiteLink],['Demo scripts and presentations',t.demoLink],['Customer reference notes',t.referenceNotes]
  ].filter(([,value])=>clean(value));
  children.push(simpleTable(['Turnover field','Confirmed value'],turnoverRows,[3300,6100]));

  const document=new Document({
    styles:{default:{document:{run:{font:theme.font,size:theme.type.body}}}},
    sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},footers:{default:new Footer({children:[new Paragraph({children:[run('Cloud Inventory · CONFIDENTIAL — INTERNAL USE ONLY',{size:theme.type.caption,color:theme.muted})],alignment:AlignmentType.CENTER})]})},children}]
  });
  return Packer.toBuffer(document);
}

module.exports={buildSolutionFitTurnoverDocx};
