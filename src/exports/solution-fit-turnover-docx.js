'use strict';

const {
  Document,Packer,Paragraph,TextRun,ImageRun,Footer,HeadingLevel,AlignmentType,
  Table,TableRow,TableCell,WidthType,BorderStyle
}=require('docx');
const brand=require('../shared/brand-system');
const SolutionFitState=require('../../public/solution-fit-state');
const {buildPSTurnoverModel,formatBytes,readableTimestamp}=require('../shared/ps-turnover-model');

const clean=(value,max=4000)=>String(value==null?'':value).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);

async function buildSolutionFitTurnoverDocx({model,data,customerName='',accountExecutive='',primarySeName='',logoData,previews=new Map()}){
  const turnoverModel=model||buildPSTurnoverModel({data,customerName,accountExecutive,primarySeName});
  const state=turnoverModel.state;
  customerName=turnoverModel.customerName||customerName;
  accountExecutive=turnoverModel.accountExecutive||accountExecutive;
  primarySeName=turnoverModel.primarySeName||primarySeName;
  const theme=brand.documentTheme('internal');
  const run=(value,opts={})=>new TextRun({text:clean(value),font:theme.font,size:theme.type.body,color:theme.body,...opts});
  const paragraph=(value,opts={})=>new Paragraph({children:[run(value,opts.run||{})],spacing:{after:opts.after??100},...opts});
  const heading=(value)=>new Paragraph({text:clean(value),heading:HeadingLevel.HEADING_2,spacing:{before:260,after:120}});
  const subheading=(value)=>new Paragraph({text:clean(value),heading:HeadingLevel.HEADING_3,spacing:{before:180,after:90},keepNext:true});
  const line=(label,value)=>paragraph(`${label}: ${clean(value)||'Not yet established'}`);
  const cell=(value,bold=false)=>new TableCell({children:[paragraph(value,{run:{bold}})],margins:{top:90,bottom:90,left:110,right:110}});
  const simpleTable=(headers,rows,widths)=>new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    columnWidths:widths,
    borders:{top:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},bottom:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},left:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},right:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'}},
    rows:[new TableRow({tableHeader:true,children:headers.map(value=>cell(value,true))}),...rows.map(row=>new TableRow({children:row.map(value=>cell(value))}))]
  });
  const compactCell=(value,bold=false)=>new TableCell({children:[new Paragraph({children:[run(value,{bold,size:theme.type.caption})],spacing:{after:20}})],margins:{top:45,bottom:45,left:70,right:70}});
  const compactTable=(headers,rows,widths)=>new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    columnWidths:widths,
    borders:{top:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},bottom:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},left:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},right:{style:BorderStyle.SINGLE,size:1,color:'CBD5E1'},insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'}},
    rows:[new TableRow({tableHeader:true,children:headers.map(value=>compactCell(value,true))}),...rows.map(row=>new TableRow({children:row.map(value=>compactCell(value))}))]
  });
  const children=[];
  if(logoData)children.push(new Paragraph({children:[new ImageRun({data:logoData,transformation:{width:190,height:Math.round(190*theme.logoAspect)}})],spacing:{after:160}}));
  children.push(
    paragraph('PROFESSIONAL SERVICES TURNOVER',{run:{bold:true,color:theme.accent,size:theme.type.label}}),
    paragraph('Solution Fit & Sales Turnover',{run:{bold:true,color:theme.heading,size:theme.type.pageTitle},after:60}),
    paragraph(clean(customerName||state.opportunity.customer||'Customer'),{run:{bold:true,color:theme.heading,size:theme.type.sectionTitle}}),
    paragraph(`Generated ${readableTimestamp(turnoverModel.generatedAt)} · CONFIDENTIAL — INTERNAL USE ONLY`,{run:{color:theme.muted,size:theme.type.caption}})
  );

  children.push(heading('Account and business context'));
  children.push(line('Account Executive',accountExecutive),line('Primary Solution Engineer',primarySeName),line('Opportunity stage',state.opportunity.stage));
  children.push(line('Products',(state.opportunity.products||[]).join(', ')),line('Business problem',state.opportunity.problem),line('Desired business outcomes',state.opportunity.outcome));
  children.push(line('Business owner',[state.opportunity.businessOwnerName,state.opportunity.businessOwnerTitle].filter(Boolean).join(' · ')),line('Technical owner',[state.opportunity.technicalOwnerName,state.opportunity.technicalOwnerTitle].filter(Boolean).join(' · ')));
  children.push(line('Users',state.opportunity.users),line('Locations',state.opportunity.locations),line('Target go-live',state.opportunity.goLive));

  children.push(heading('General inventory configuration'));
  children.push(simpleTable(['Requirement','Response','Notes'],SolutionFitState.INVENTORY_ITEMS.map(name=>[name,state.inventoryConfiguration[name]?.answer||'Not answered',state.inventoryConfiguration[name]?.note||'']),[3300,1700,3800]));
  if(state.inventoryConfiguration['LPNs / Handling Units / Packing Units']?.answer==='Yes'){
    children.push(paragraph('LPN / Handling Unit detail',{run:{bold:true},after:60}));
    children.push(compactTable(['Requirement','Response'],SolutionFitState.LPN_ITEMS.map(name=>[name,state.lpnConfiguration[name]||'Not answered']),[5000,4400]));
  }

  const selected=SolutionFitState.activeProcesses(state),activeGaps=SolutionFitState.activeGaps(state);
  children.push(heading('Product and application scope'));
  children.push(line('MEP ERP family',state.solutionScope.erp),line('MEP scope approach',state.solutionScope.packageMode==='standard'?'Standard Package':'Custom scope'));
  children.push(simpleTable(['Product / application','Demo status','Fit','Customer validation','Exceptions and evidence'],selected.map(process=>[[process.product,process.erp,process.name,process.id].filter(Boolean).join(' · '),process.demoStatus,process.fit,process.customerValidation,process.notes]),[2500,1500,1300,1800,3000]));

  children.push(heading('Labels, integrations, and delivery constraints'));
  children.push(simpleTable(['Delivery field','Confirmed value'],[
    ['Sites needing label printing',state.printing.sites],['Number of labels',state.printing.labelCount],['Printing solution',state.printing.solution],['Custom label requirements',state.printing.notes],
    ['System relationship',state.architecture.relationship],['ERP / system of record',state.architecture.erp],['Version',state.architecture.version],['Primary integration method',state.architecture.integrationMethod],['Integration owner',state.architecture.integrationOwner],['Integration notes',state.architecture.integrationNotes]
  ],[3300,6100]));
  if(state.interfaces.length)children.push(simpleTable(['Source','Target','Object / purpose','Method','Owner'],state.interfaces.map(item=>[item.source,item.target,item.object,item.method,item.owner]),[1800,1800,2500,1700,1600]));

  children.push(heading('Gaps, exceptions, and actions'));
  if(activeGaps.length)children.push(simpleTable(['Application / gap','Priority','Impact','Resolution / workaround','Owner / target','Status'],activeGaps.map(gap=>[[gap.id,gap.process,gap.gapDescription||gap.need].filter(Boolean).join(' — '),gap.priority,gap.impact,gap.resolution,[gap.owner,gap.targetDate].filter(Boolean).join(' · '),gap.status]),[2300,1100,1800,2400,1700,1200]));
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

  children.push(heading('Evidence and attachments appendix'));
  const summary=turnoverModel.summary;
  if(!summary.totalEvidenceFiles){
    children.push(paragraph('No supporting evidence attachments were captured.'));
  }else{
    children.push(line('Total evidence files',summary.totalEvidenceFiles),line('Photos',summary.photos),line('Documents',summary.documents));
    children.push(line('Applications with evidence',summary.applicationsWithEvidence),line('Gaps with evidence',summary.gapsWithEvidence));
    for(const group of turnoverModel.groups){
      const label=group.contextType==='GENERAL_SOLUTION_FIT'
        ?'General Solution Fit evidence'
        :group.contextType==='APPLICATION_PROCESS'
          ?[group.product,group.erp,group.functionalGroup,group.application].filter(Boolean).join(' · ')
          :group.contextType==='GAP'
            ?`Gap · ${group.gap?.id||group.contextId} · ${group.gap?.gapDescription||group.gap?.need||'Recorded gap'}`
            :`Integration · ${group.integration?.id||group.contextId} · ${group.integration?.object||'Recorded integration'}`;
      children.push(subheading(label));
      if(group.contextType==='APPLICATION_PROCESS'&&group.application){
        const process=group.attachments[0]?.context?.process;
        children.push(paragraph(`Assessment: ${process?.demoStatus||'Not reviewed'} · ${process?.fit||'Not reviewed'} · ${process?.customerValidation||'Not validated'}`,{run:{color:theme.muted,size:theme.type.caption},keepNext:true}));
      }
      if(group.contextType==='GAP')children.push(paragraph(`Gap status: ${group.gap?.status||'Open'} · Evidence files: ${group.attachments.length}`,{run:{color:theme.muted,size:theme.type.caption}}));
      const selectedPreviews=group.attachments.filter(item=>previews instanceof Map&&previews.has(item.id));
      for(const attachment of selectedPreviews){
        const preview=previews.get(attachment.id);
        const ratio=Math.min(1,450/Math.max(1,preview.width),285/Math.max(1,preview.height));
        const previewContext=group.contextType==='GENERAL_SOLUTION_FIT'?'General Solution Fit':group.contextType==='APPLICATION_PROCESS'?[group.product,group.erp,group.application].filter(Boolean).join(' · '):group.contextType==='GAP'?`Gap ${group.gap?.id||group.contextId}`:`Integration ${group.integration?.id||group.contextId}`;
        children.push(new Paragraph({children:[new ImageRun({data:preview.data,transformation:{width:Math.max(120,Math.round(preview.width*ratio)),height:Math.max(90,Math.round(preview.height*ratio))}})],spacing:{before:90,after:70},keepNext:true}));
        children.push(paragraph(attachment.caption||attachment.originalFilename,{run:{bold:true},after:30}),paragraph(`${previewContext} · ${attachment.originalFilename} · ${formatBytes(attachment.sizeBytes)} · Uploaded by ${attachment.uploadedByName||'Unknown user'} · ${readableTimestamp(attachment.uploadedAt)}`,{run:{color:theme.muted,size:theme.type.caption},after:100}));
      }
      const references=group.attachments.filter(item=>!(previews instanceof Map&&previews.has(item.id)));
      if(references.length)children.push(simpleTable(['Evidence reference','File details','Uploader'],references.map(item=>[
        item.caption||'No caption',`${item.originalFilename} · ${item.contentType||'Unknown type'} · ${formatBytes(item.sizeBytes)}`,[item.uploadedByName||'Unknown user',readableTimestamp(item.uploadedAt)].filter(Boolean).join(' · ')
      ]),[3600,3800,2400]));
      if(group.attachments.length>selectedPreviews.length&&selectedPreviews.length){
        children.push(paragraph(`+ ${group.attachments.length-selectedPreviews.length} additional evidence file${group.attachments.length-selectedPreviews.length===1?'':'s'} included in the turnover package.`,{run:{color:theme.muted,size:theme.type.caption}}));
      }
    }
  }

  children.push(heading('Attachment manifest reference'));
  children.push(paragraph('Attachment-Manifest.csv in the PS Turnover Package is the complete machine-readable list for this saved Solution Fit snapshot. Dates in the manifest use UTC ISO 8601.'));
  if(turnoverModel.attachments.length)children.push(compactTable(['Attachment ID','Context','Original filename','Package path'],turnoverModel.attachments.map(item=>[
    item.id,[item.contextType,item.contextId].filter(Boolean).join(' · '),item.originalFilename,item.packagePath
  ]),[2200,2300,2300,3200]));

  const document=new Document({
    styles:{default:{document:{run:{font:theme.font,size:theme.type.body}}}},
    sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},footers:{default:new Footer({children:[new Paragraph({children:[run('Cloud Inventory · CONFIDENTIAL — INTERNAL USE ONLY',{size:theme.type.caption,color:theme.muted})],alignment:AlignmentType.CENTER})]})},children}]
  });
  return Packer.toBuffer(document);
}

module.exports={buildSolutionFitTurnoverDocx};
