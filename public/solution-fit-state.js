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
  const LEGACY_GENERIC_NAMES=Object.freeze([
    'Receiving','Putaway','Inventory Movement','Picking','Packing','Shipping','Cycle Counting','Replenishment',
    'Production Issue / Return','Field Inventory','Returns','Printing / Labeling'
  ]);

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
  const text=value=>String(value==null?'':value).trim();
  function hash32(value,seed=2166136261){let hash=seed>>>0;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}return hash.toString(16).padStart(8,'0');}
  function descriptorKey(process){
    const p=process||{};
    return [text(p.product).toUpperCase(),text(p.erp).toUpperCase(),text(p.group).toUpperCase(),text(p.name).toUpperCase()].join('\u001f');
  }
  function governedProcessId(process){
    const key=descriptorKey(process);
    return `APP-GOV-${hash32(key)}${hash32([...key].reverse().join(''),3335557771)}`;
  }
  function nextSequence(items,prefix){
    const used=new Set((items||[]).map(item=>text(item&&item.id)));
    let number=1,id='';
    do{id=`${prefix}-${String(number++).padStart(6,'0')}`;}while(used.has(id));
    return id;
  }
  function nextSequenceFromSet(used,prefix){
    let number=1,id='';
    do{id=`${prefix}-${String(number++).padStart(6,'0')}`;}while(used.has(id));
    return id;
  }
  function nextCustomProcessId(state){return nextSequence(state&&state.processes,'APP-CUSTOM');}
  function nextLegacyProcessId(state){return nextSequence(state&&state.processes,'APP-LEGACY');}
  function nextGapId(state){return nextSequence(state&&state.gaps,'GAP');}
  function hasAssessment(process){
    const p=process||{};
    return p.selected===true
      || !['','Not reviewed'].includes(text(p.demoStatus))
      || !['','Not reviewed'].includes(text(p.fit))
      || !['','Not validated'].includes(text(p.customerValidation))
      || !!text(p.notes||p.reason);
  }
  function isLegacyProcess(process){return process&&process.source==='legacy_process';}
  function hasUnresolvedLegacy(state){return (state&&state.processes||[]).some(process=>isLegacyProcess(process)&&process.historical!==true);}
  function activeProducts(state){
    const scope=state&&state.solutionScope||{},products=[];
    if(text(scope.primaryProduct))products.push(scope.primaryProduct);
    if(Array.isArray(scope.additionalProducts))products.push(...scope.additionalProducts);
    if(!products.length&&Array.isArray(state&&state.opportunity&&state.opportunity.products))products.push(...state.opportunity.products);
    return [...new Set(products.filter(Boolean))];
  }
  function hasActiveProduct(state,product){return activeProducts(state).includes(product);}
  function processIsActive(state,process){
    if(!process||process.selected!==true||process.historical===true||isLegacyProcess(process))return false;
    if(!activeProducts(state).includes(process.product))return false;
    if(process.product==='MEP'&&text(process.erp)!==text(state&&state.solutionScope&&state.solutionScope.erp))return false;
    return true;
  }
  function activeProcesses(state){return (state&&state.processes||[]).filter(process=>processIsActive(state,process));}
  function activeGaps(state){
    const ids=new Set(activeProcesses(state).map(process=>process.id));
    return (state&&state.gaps||[]).filter(gap=>!gap.historical&&(gap.processId?ids.has(gap.processId):true));
  }
  function fillMissing(target,defaults){
    if(!isObject(target))target={};
    for(const [key,value] of Object.entries(defaults))if(target[key]===undefined)target[key]=Array.isArray(value)?value.slice():isObject(value)?fillMissing({},value):value;
    return target;
  }
  function blankProcess(name,index,extra={}){
    const process={name,selected:false,demoStatus:'Not reviewed',fit:'Not reviewed',customerValidation:'Not validated',notes:'',source:'product_app',...extra};
    process.id=extra.id||(process.source==='non_standard'?`APP-CUSTOM-${String(index+1).padStart(6,'0')}`:governedProcessId(process));
    return process;
  }
  function processKey(process){
    const p=process||{};
    return p.id?`id:${p.id}`:`descriptor:${descriptorKey(p)}`;
  }
  function catalogIdentity(process){
    const p=process||{};
    return p.source==='non_standard'||p.source==='legacy_process'?processKey(p):`governed:${governedProcessId(p)}`;
  }
  function formatApplicationContext(process){
    const p=process||{},tokens=[p.product,p.erp,p.group,p.name],seen=new Set(),out=[];
    for(const token of tokens){const value=text(token);if(!value)continue;const semantic=value.toLocaleLowerCase();if(seen.has(semantic))continue;seen.add(semantic);out.push(value);}
    return out.join(' · ')||text(p.name);
  }
  function findProcess(state,descriptor){
    const rows=state&&state.processes||[],wantedId=descriptor&&descriptor.id||(descriptor&&descriptor.source!=='non_standard'?governedProcessId(descriptor):'');
    return (wantedId&&rows.find(item=>item.id===wantedId))||rows.find(item=>descriptorKey(item)===descriptorKey(descriptor)&&item.source!=='legacy_process');
  }
  function ensureProcess(state,{product,name,group='',erp='',source='product_app',catalogVersion='',selected=false}){
    const candidate={product,name,group,erp,source,catalogVersion};
    let process=findProcess(state,candidate);
    if(!process){
      process=blankProcess(name,(state.processes||[]).length,{id:governedProcessId(candidate),product,group,erp,source,catalogVersion,selected});
      state.processes.push(process);
    }else{
      if(process.product===undefined)process.product=product;
      if(group&&!process.group)process.group=group;
      if(erp&&process.erp===undefined)process.erp=erp;
      if(source&&process.source===undefined)process.source=source;
      if(catalogVersion&&process.catalogVersion===undefined)process.catalogVersion=catalogVersion;
      if(selected){process.selected=true;process.historical=false;delete process.inactiveReason;}
    }
    return process;
  }
  function createCustomProcess(state,{product,name,group='Customer-specific',erp='',selected=true}={}){
    const process=blankProcess(name,(state.processes||[]).length,{id:nextCustomProcessId(state),product,group,erp,source:'non_standard',selected});
    state.processes.push(process);return process;
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
  function synchronizeAuthority(state){
    const scope=state.solutionScope||{},architecture=state.architecture||{};
    if(hasActiveProduct(state,'MEP')){
      architecture.erp=text(scope.erp);
      architecture.version=text(scope.erpVersion);
    }
    state.architecture=architecture;
    return state;
  }
  function changeMepErpFamily(state,nextErp,{changedAt}={}){
    state.solutionScope=state.solutionScope||{};state.architecture=state.architecture||{};state.processes=state.processes||[];
    const prior=text(state.solutionScope.erp),next=text(nextErp);
    if(prior===next)return {state,changed:false,prior,next,archivedProcessIds:[]};
    const priorRows=state.processes.filter(process=>process.product==='MEP'&&text(process.erp)===prior),archivedProcessIds=priorRows.map(process=>process.id).filter(Boolean);
    if(prior){
      state.scopeHistory=state.scopeHistory||[];
      state.scopeHistory.push({changedAt:changedAt||new Date().toISOString(),scope:{...state.solutionScope},processIds:archivedProcessIds,reason:'ERP family changed explicitly; prior ERP/version and application assessments retained as inactive history.'});
    }
    priorRows.forEach(process=>{process.selected=false;process.historical=true;process.inactiveReason=`ERP changed from ${prior} to ${next}`;});
    state.solutionScope.erp=next;state.solutionScope.erpVersion='';state.architecture.erp=next;state.architecture.version='';
    return {state,changed:true,prior,next,archivedProcessIds};
  }
  function canUseCustomerContext(solutionFitCustomerId,roiCustomerId){
    return !!text(solutionFitCustomerId)&&text(solutionFitCustomerId)===text(roiCustomerId);
  }
  function applyGapProcessMetadata(gap,process){
    gap.processId=process.id;gap.process=process.name||'';gap.product=process.product||'';gap.erp=process.erp||'';gap.group=process.group||'';gap.mappingStatus='mapped';
    return gap;
  }
  function migrateGaps(state){
    const seen=new Set();
    for(const gap of state.gaps){
      if(!isObject(gap))continue;
      if(!text(gap.id)||seen.has(gap.id))gap.id=nextSequenceFromSet(seen,'GAP');
      seen.add(gap.id);
      for(const [key,value] of Object.entries({processId:'',product:'',erp:'',group:'',process:'',mappingStatus:'unassigned',impact:'',resolution:'',owner:'',targetDate:'',status:'Open'}))if(gap[key]===undefined)gap[key]=value;
      const byId=gap.processId&&state.processes.find(process=>process.id===gap.processId);
      if(byId){applyGapProcessMetadata(gap,byId);continue;}
      gap.processId='';
      if(!text(gap.process)){gap.mappingStatus='unassigned';continue;}
      const matches=state.processes.filter(process=>text(process.name)===text(gap.process));
      if(matches.length===1)applyGapProcessMetadata(gap,matches[0]);
      else if(matches.length>1)gap.mappingStatus='Needs Review / Ambiguous Legacy Mapping';
      else gap.mappingStatus='Needs Review / Unresolved Legacy Mapping';
    }
  }
  function migrateState(state){
    if(!isObject(state))state={};
    state.opportunity=fillMissing(state.opportunity||{}, {customer:'',stage:'',products:[],productsOther:'',goLive:'',users:'',locations:'',problem:'',outcome:'',businessOwnerName:'',businessOwnerTitle:'',businessOwnerEmail:'',businessOwnerPhone:'',technicalOwnerName:'',technicalOwnerTitle:'',technicalOwnerEmail:'',technicalOwnerPhone:''});
    if(text(state.opportunity.solutionEngineer)&&!text(state.opportunity.legacySolutionEngineerDisplay))state.opportunity.legacySolutionEngineerDisplay=text(state.opportunity.solutionEngineer);
    delete state.opportunity.solutionEngineer;
    delete state.opportunity.solutionEngineerId;
    if(typeof state.opportunity.products==='string')state.opportunity.products=state.opportunity.products?[state.opportunity.products]:[];
    if(!Array.isArray(state.opportunity.products))state.opportunity.products=[];
    state.architecture=fillMissing(state.architecture||{}, {relationship:'',erp:'',version:'',otherSystems:'',integrationMethod:'',integrationOwner:'',integrationNotes:'',hasCustomizations:'',customizations:[]});
    if(!Array.isArray(state.architecture.customizations))state.architecture.customizations=[];
    state.partner=fillMissing(state.partner||{}, {involved:'',company:'',role:'',contactName:'',email:'',phone:'',title:''});
    state.solutionScope=fillMissing(state.solutionScope||{}, {primaryProduct:'',additionalProducts:[],erp:'',erpVersion:'',catalogId:'',catalogVersion:'',catalogSource:'',selectedApps:[],selectedAppIds:[],packageMode:'custom'});
    if(!Array.isArray(state.solutionScope.additionalProducts))state.solutionScope.additionalProducts=[];
    if(!Array.isArray(state.solutionScope.selectedApps))state.solutionScope.selectedApps=[];
    if(!Array.isArray(state.solutionScope.selectedAppIds))state.solutionScope.selectedAppIds=[];
    if(!state.solutionScope.primaryProduct&&state.opportunity.products.length){state.solutionScope.primaryProduct=state.opportunity.products[0];state.solutionScope.additionalProducts=state.opportunity.products.slice(1);}
    const scopedProducts=activeProducts(state);
    if(scopedProducts.length)state.opportunity.products=scopedProducts;
    if(scopedProducts.includes('MEP')){
      if(!text(state.solutionScope.erp)&&text(state.architecture.erp))state.solutionScope.erp=text(state.architecture.erp);
      if(!text(state.solutionScope.erpVersion)&&text(state.architecture.version))state.solutionScope.erpVersion=text(state.architecture.version);
    }
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
    state.ui=fillMissing(state.ui||{}, {solutionFitLayoutVersion:'6.9.41'});
    const referencedLegacyNames=new Set(state.gaps.map(gap=>text(gap&&gap.process)).filter(Boolean));
    state.processes=state.processes.filter(process=>{
      if(!isObject(process))return false;
      const legacy=process.source==='legacy_process'||(!process.source&&!process.product&&LEGACY_GENERIC_NAMES.includes(process.name));
      return !(legacy&&LEGACY_GENERIC_NAMES.includes(process.name)&&!hasAssessment(process)&&!referencedLegacyNames.has(text(process.name)));
    });
    const usedIds=new Set();
    state.processes.forEach(process=>{
      if(!isObject(process))return;
      if(process.selected===undefined)process.selected=false;
      if(process.demoStatus===undefined)process.demoStatus='Not reviewed';
      if(process.fit===undefined)process.fit='Not reviewed';
      if(process.customerValidation===undefined)process.customerValidation='Not validated';
      if(process.notes===undefined)process.notes='';
      if(process.source===undefined)process.source=process.product?'product_app':'legacy_process';
      if(process.source==='legacy_process'){
        process.product='';process.erp='';process.group=process.group||'LEGACY / UNCLASSIFIED HISTORICAL PROCESS';process.legacyUnclassified=true;
      }
      if(!text(process.id)||usedIds.has(process.id))process.id=process.source==='legacy_process'?nextSequenceFromSet(usedIds,'APP-LEGACY'):process.source==='non_standard'?nextSequenceFromSet(usedIds,'APP-CUSTOM'):governedProcessId(process);
      if(usedIds.has(process.id))process.id=nextSequenceFromSet(usedIds,process.source==='legacy_process'?'APP-LEGACY':process.source==='non_standard'?'APP-CUSTOM':'APP-GOV-COLLISION');
      usedIds.add(process.id);
    });
    migrateGaps(state);
    state.interfaces.forEach(item=>{if(item.direction===undefined)item.direction='Bidirectional';if(item.trigger===undefined)item.trigger='Near real time';});
    if(hasUnresolvedLegacy(state))state.legacy=fillMissing(state.legacy||{}, {status:'needs_review',label:'LEGACY / UNCLASSIFIED HISTORICAL PROCESS'});
    else if(state.legacy&&state.legacy.status==='needs_review')state.legacy.status='historical';
    synchronizeAuthority(state);
    state.solutionScope.selectedAppIds=activeProcesses(state).filter(process=>process.product==='MEP').map(process=>process.id);
    state.solutionScope.selectedApps=activeProcesses(state).filter(process=>process.product==='MEP').map(process=>process.name);
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

  return {INVENTORY_ITEMS,LPN_ITEMS,ANSWERS,DEMO_STATUSES,FIT_STATUSES,VALIDATION_STATUSES,LEGACY_GENERIC_NAMES,CIP_CATALOG,EPP_CATALOG,TURNOVER_DEFAULTS,TURNOVER_REQUIRED,migrateState,migrateGaps,ensureProcess,createCustomProcess,setSelected,applyStandardPackage,startCustomScope,processKey,catalogIdentity,formatApplicationContext,findProcess,governedProcessId,nextCustomProcessId,nextGapId,applyGapProcessMetadata,activeProducts,hasActiveProduct,activeProcesses,activeGaps,hasUnresolvedLegacy,synchronizeAuthority,changeMepErpFamily,canUseCustomerContext,inventoryStats,turnoverStats};
});
