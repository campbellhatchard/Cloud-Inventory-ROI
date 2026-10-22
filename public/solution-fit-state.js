/* Solution Fit state contract — additive, server-persisted and browser/Node compatible. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SolutionFitState=api;
})(typeof self!=='undefined'?self:this,function(){
  'use strict';

  const INVENTORY_ITEMS=Object.freeze([
    'Lot Numbers','FIFO, LIFO, FEFO, etc.','Serial Numbers','LPNs / Handling Units / Packing Units',
    'Zones','Specialized Storage Areas','Defined Pick Sequence','Job','Ownership','Country of Origin'
  ]);
  const LPN_ITEMS=Object.freeze(['Inbound','Internal','Outbound','Nested']);
  const ANSWERS=Object.freeze(['Not answered','Yes','No','Unknown / To confirm','Not applicable']);
  const DEMO_STATUSES=Object.freeze(['Not reviewed','Planned','Demonstrated','Partially demonstrated','Discussed only','Not demonstrated','Not applicable']);
  const FIT_STATUSES=Object.freeze(['Not reviewed','Full fit','Partial fit','Gap','Unknown','Not applicable']);
  const VALIDATION_STATUSES=Object.freeze(['Not validated','Validation pending','Customer validated','Customer rejected','Customer declined','Not applicable']);

  const CIP_CATALOG=Object.freeze([
    {group:'Dashboards',apps:['Inbound Insights','Inventory Insights','Outbound Insights','Wave Insights']},
    {group:'Inbound',apps:['Inbound Orders','Inbound Orders Receipt','Inspections Review','Inbound Shipments/ASNs','Customer Returns','Inbound Inquiries and Reports','Inbound Allocations Report','Inspections Inquiry']},
    {group:'Inventory execution',apps:['Create Cycle Counts','Cycle Count Inquiry','Cycle Count Review and Approve','Cloud Inventory Adjustment','Cloud Inventory Transfer','IHU Pack/Unpack','Replenishments to Pick','Ownership Transfer','Job Transfer','Inventory Requests','Inventory Requests Execution','Kit Work Orders Management','Inventory Inquiries and Reports','Cloud Inventory Overview','Cloud Inventory Balance Inquiry','Allocation Inquiry','Transaction Inquiry','Serial Inquiry','Lots Expired','Lots Expiring Today','Lots Expiring Next Week','Replenishments Inquiry','Field Inventory Transactions']},
    {group:'Outbound execution',apps:['Outbound Orders','Wave Manager','Single Order Pick','Order Pack','Shipment Management','Outbound Packing Unit Nest/Unnest','Supplier Return','Outbound Inquiries and Reports','Shipment Inquiry','Outbound Allocations Report','Outbound Setup','Wave Templates']},
    {group:'Mobile inbound',apps:['Inbound Receipt','Inspection Review','Putaway']},
    {group:'Mobile inventory',apps:['Item Inquiry','Location Inquiry','IHU Inquiry','Cycle Count','Inventory Adjustment','Inventory Transfer','IHU Pack/Unpack','IHU Nest/Unnest','IHU Transfer','Kit Work Order Pick','Kit Work Order Complete','Miscellaneous Issue','Miscellaneous Receipt','Replenishments to Pick']},
    {group:'Mobile outbound',apps:['Single Order Pick','Wave Pick','Zone Pick','Order Pack','Load Truck','Ship Outbound Shipment','Order Unpick','Order Unpack','OPU Nest/Unnest']}
  ]);
  const EPP_CATALOG=Object.freeze([
    {group:'Output orchestration',apps:['Print job intake','Rules-based output routing','Print queue management','Retry and exception handling']},
    {group:'Templates and content',apps:['Label templates','Document templates','Variable data mapping','Barcode and QR output','RFID encoding']},
    {group:'Devices and operations',apps:['Printer discovery','Printer status monitoring','Device failover','Site and device assignment']},
    {group:'Governance',apps:['Template version control','Role-based access','Audit history','Environment promotion']}
  ]);

  const TURNOVER_DEFAULTS=Object.freeze({
    solutionArchitect:'',customerId:'',salesCycle:'',relationshipHistory:'',successFactors:'',contractStatus:'',contractConsiderations:'',
    projectManager:'',projectManagerEmail:'',businessSmes:'',itLead:'',systemAdminEmail:'',infrastructureContact:'',
    deliveryModel:'',implementationPartner:'',internalDeliveryContact:'',partnerDeliveryContact:'',partnerResponsibilities:'',projectStart:'',kickoffDate:'',dateDrivers:'',thirdParties:'',
    eapEdition:'',environments:'',authorizedLanguages:'',authorizedDefinitions:'',customerDomain:'',partnerImplementerEmail:'',mepLicenseId:'',eppDeployment:'',eppLicenseId:'',
    deploymentModel:'',sizingDocument:'',currentWarehouse:'',deviceTypes:'',hardwareStatus:'',deviceStatus:'',networkConstraints:'',
    sowLink:'',rfpLink:'',discoveryLink:'',onsiteLink:'',demoLink:'',referenceNotes:'',lastGeneratedAt:''
  });
  const TURNOVER_REQUIRED=Object.freeze([
    ['contractStatus','Contract review'],['projectManager','Project Manager'],['systemAdminEmail','System Administrator email'],
    ['deliveryModel','Delivery model'],['internalDeliveryContact','Internal delivery contact'],['projectStart','Project start'],
    ['eapEdition','Customer edition'],['environments','Number of environments'],['authorizedDefinitions','Authorized solution definitions'],
    ['authorizedLanguages','Authorized languages'],['customerDomain','Customer email domain'],['sowLink','Signed order form and SOW']
  ]);

  const isObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
  function fillMissing(target,defaults){
    if(!isObject(target))target={};
    for(const [key,value] of Object.entries(defaults))if(target[key]===undefined)target[key]=Array.isArray(value)?value.slice():isObject(value)?fillMissing({},value):value;
    return target;
  }
  function blankProcess(name,index,extra={}){
    return {id:`P-${String(index+1).padStart(3,'0')}`,name,selected:false,demoStatus:'Not reviewed',fit:'Not reviewed',customerValidation:'Not validated',notes:'',source:'product_app',...extra};
  }
  function processKey(process){
    const p=process||{};
    return [String(p.product||''),String(p.erp||''),String(p.group||''),String(p.name||'')].join('::').toLowerCase();
  }
  function ensureProcess(state,{product,name,group='',erp='',source='product_app',catalogVersion='',selected=false}){
    const candidate={product,name,group,erp};
    let process=(state.processes||[]).find(item=>processKey(item)===processKey(candidate));
    if(!process&&erp)process=(state.processes||[]).find(item=>String(item.product||'')===String(product||'')&&String(item.name||'')===String(name||'')&&String(item.erp||'')===String(erp||''));
    if(!process){
      process=blankProcess(name,(state.processes||[]).length,{product,group,erp,source,catalogVersion,selected});
      state.processes.push(process);
    }else{
      if(process.product===undefined)process.product=product;
      if(group&&!process.group)process.group=group;
      if(erp&&process.erp===undefined)process.erp=erp;
      if(source&&process.source===undefined)process.source=source;
      if(catalogVersion&&process.catalogVersion===undefined)process.catalogVersion=catalogVersion;
      if(selected)process.selected=true;
    }
    return process;
  }
  function setSelected(state,descriptor,selected){
    const process=ensureProcess(state,{...descriptor,selected:false});
    process.selected=!!selected;
    return process;
  }
  function applyStandardPackage(state,{erp,names=[],catalogVersion=''}){
    state.solutionScope=state.solutionScope||{};
    state.solutionScope.packageMode='standard';
    for(const name of names)ensureProcess(state,{product:'MEP',name,group:erp,erp,source:'standard_app',catalogVersion,selected:true});
    return state;
  }
  function startCustomScope(state,{erp}){
    state.solutionScope=state.solutionScope||{};
    state.solutionScope.packageMode='custom';
    for(const process of state.processes||[])if(process.product==='MEP'&&process.erp===erp)process.selected=false;
    return state;
  }
  function migrateState(state){
    if(!isObject(state))state={};
    state.opportunity=fillMissing(state.opportunity||{}, {customer:'',solutionEngineer:'',solutionEngineerId:'',stage:'',products:[],productsOther:'',goLive:'',users:'',locations:'',problem:'',outcome:'',businessOwnerName:'',businessOwnerTitle:'',businessOwnerEmail:'',businessOwnerPhone:'',technicalOwnerName:'',technicalOwnerTitle:'',technicalOwnerEmail:'',technicalOwnerPhone:''});
    if(typeof state.opportunity.products==='string')state.opportunity.products=state.opportunity.products?[state.opportunity.products]:[];
    if(!Array.isArray(state.opportunity.products))state.opportunity.products=[];
    state.architecture=fillMissing(state.architecture||{}, {relationship:'',erp:'',version:'',otherSystems:'',integrationMethod:'',integrationOwner:'',integrationNotes:'',hasCustomizations:'',customizations:[]});
    if(!Array.isArray(state.architecture.customizations))state.architecture.customizations=[];
    state.partner=fillMissing(state.partner||{}, {involved:'',company:'',role:'',contactName:'',email:'',phone:'',title:''});
    state.solutionScope=fillMissing(state.solutionScope||{}, {primaryProduct:'',additionalProducts:[],erp:'',erpVersion:'',catalogId:'',catalogVersion:'',catalogSource:'',selectedApps:[],packageMode:'custom'});
    if(!Array.isArray(state.solutionScope.additionalProducts))state.solutionScope.additionalProducts=[];
    if(!Array.isArray(state.solutionScope.selectedApps))state.solutionScope.selectedApps=[];
    if(!Array.isArray(state.processes))state.processes=[];
    if(!Array.isArray(state.gaps))state.gaps=[];
    if(!Array.isArray(state.interfaces))state.interfaces=[];
    state.drivers=fillMissing(state.drivers||{}, {offline:'Unknown',offlineDuration:'',devices:'',peripherals:'',customOutput:'Unknown',volumeConcern:'Unknown',volume:'',otherConstraint:''});
    state.inventoryConfiguration=fillMissing(state.inventoryConfiguration||{}, {});
    for(const name of INVENTORY_ITEMS)state.inventoryConfiguration[name]=fillMissing(state.inventoryConfiguration[name]||{}, {answer:'Not answered',note:''});
    state.lpnConfiguration=fillMissing(state.lpnConfiguration||{}, {});
    for(const name of LPN_ITEMS)if(state.lpnConfiguration[name]===undefined)state.lpnConfiguration[name]='Not answered';
    state.printing=fillMissing(state.printing||{}, {sites:'',labelCount:'',solution:'',notes:''});
    state.turnover=fillMissing(state.turnover||{}, TURNOVER_DEFAULTS);
    state.ui=fillMissing(state.ui||{}, {solutionFitLayoutVersion:'6.9.39'});
    const primary=state.solutionScope.primaryProduct||state.opportunity.products[0]||'';
    state.processes.forEach((process,index)=>{
      if(!isObject(process))return;
      if(process.id===undefined)process.id=`P-${String(index+1).padStart(3,'0')}`;
      if(process.selected===undefined)process.selected=false;
      if(process.demoStatus===undefined)process.demoStatus='Not reviewed';
      if(process.fit===undefined)process.fit='Not reviewed';
      if(process.customerValidation===undefined)process.customerValidation='Not validated';
      if(process.notes===undefined)process.notes='';
      if(process.source===undefined)process.source='legacy_process';
      if(process.product===undefined)process.product=process.source==='standard_app'?'MEP':primary;
    });
    state.gaps.forEach(gap=>{
      if(!isObject(gap))return;
      for(const [key,value] of Object.entries({impact:'',resolution:'',owner:'',targetDate:'',status:'Open'}))if(gap[key]===undefined)gap[key]=value;
    });
    state.interfaces.forEach(item=>{if(item.direction===undefined)item.direction='Bidirectional';if(item.trigger===undefined)item.trigger='Near real time';});
    return state;
  }
  function inventoryStats(state){
    const applicable=(state.opportunity?.products||[]).some(product=>product==='CIP'||product==='MEP');
    if(!applicable)return{applicable:false,total:0,answered:0,pct:100};
    const values=INVENTORY_ITEMS.map(name=>state.inventoryConfiguration?.[name]?.answer||'Not answered');
    const answered=values.filter(value=>value!=='Not answered').length;
    return{applicable:true,total:values.length,answered,pct:Math.round(answered/values.length*100)};
  }
  function turnoverStats(state){
    const required=TURNOVER_REQUIRED.slice();
    const products=state.opportunity?.products||[];
    const t=state.turnover||{};
    if(products.includes('MEP'))required.push(['mepLicenseId','MEP License ID']);
    if(products.includes('EPP'))required.push(['eppDeployment','EPP deployment'],['eppLicenseId','EPP License ID']);
    if(['Implementation partner','Joint delivery'].includes(t.deliveryModel))required.push(['implementationPartner','Implementation partner'],['partnerDeliveryContact','Partner delivery contact'],['partnerImplementerEmail','Partner implementer email']);
    const present=([key])=>key==='environments'?Number(t[key])>0:String(t[key]||'').trim().length>0;
    const missing=required.filter(item=>!present(item));
    return{total:required.length,complete:required.length-missing.length,missing:missing.map(item=>item[1])};
  }

  return {INVENTORY_ITEMS,LPN_ITEMS,ANSWERS,DEMO_STATUSES,FIT_STATUSES,VALIDATION_STATUSES,CIP_CATALOG,EPP_CATALOG,TURNOVER_DEFAULTS,TURNOVER_REQUIRED,migrateState,ensureProcess,setSelected,applyStandardPackage,startCustomScope,processKey,inventoryStats,turnoverStats};
});
