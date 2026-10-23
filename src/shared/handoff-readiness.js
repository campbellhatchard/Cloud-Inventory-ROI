/* ═══════════════════════════════════════════════════════════════════
   src/shared/handoff-readiness.js — shared readiness scoring (UMD)
   Ported faithfully from the SE Solution Fit prototype's readiness() so
   client and server agree on the score. Pure function of the handoff
   state; no I/O. Loadable in Node (require) and the browser (global).
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HandoffReadiness = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  /* Which gaps are "material" (need full detail to be estimable). */
  function materialGap(g) {
    return g.priority === 'Must Have'
      || g.goLive === 'Yes'
      || ['EXTENSION', 'INTEGRATION', 'DATA', 'NON-FUNCTIONAL', 'REPORT / PRINT'].includes(g.classification);
  }

  /* Compute readiness. Returns { miss:[{label,msg}], done:[{label}], score, status }. */
  function activeProducts(state) {
    const scope=state.solutionScope||{},values=[];
    if(scope.primaryProduct)values.push(scope.primaryProduct);
    if(Array.isArray(scope.additionalProducts))values.push(...scope.additionalProducts);
    if(!values.length&&Array.isArray(state.opportunity?.products))values.push(...state.opportunity.products);
    return [...new Set(values.filter(Boolean))];
  }

  function processIsActive(state,process,products) {
    if(!process||process.selected!==true||process.historical===true||process.source==='legacy_process')return false;
    if(!products.includes(process.product))return false;
    if(process.product==='MEP'&&String(process.erp||'')!==String(state.solutionScope?.erp||''))return false;
    return true;
  }

  const INVENTORY_ITEMS=Object.freeze([
    'Lot Numbers','FIFO, LIFO, FEFO, etc.','Serial Numbers','LPNs / Handling Units / Packing Units',
    'Zones','Specialized Storage Areas','Defined Pick Sequence','Job','Ownership','Country of Origin'
  ]);
  const TURNOVER_REQUIRED=Object.freeze([
    ['contractStatus','Contract review'],['projectManager','Project Manager'],['systemAdminEmail','System Administrator email'],
    ['deliveryModel','Delivery model'],['internalDeliveryContact','Internal delivery contact'],['projectStart','Project start'],
    ['eapEdition','Customer edition'],['environments','Number of environments'],['authorizedDefinitions','Authorized solution definitions'],
    ['authorizedLanguages','Authorized languages'],['customerDomain','Customer email domain'],['sowLink','Signed order form and SOW']
  ]);
  const present=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
  function inventoryStats(state,products){
    const applicable=products.some(product=>product==='CIP'||product==='MEP');
    if(!applicable)return{applicable:false,total:0,answered:0};
    const answered=INVENTORY_ITEMS.filter(name=>{
      const answer=state.inventoryConfiguration?.[name]?.answer;
      return present(answer)&&answer!=='Not answered';
    }).length;
    return{applicable:true,total:INVENTORY_ITEMS.length,answered};
  }
  function turnoverStats(state,products){
    const required=TURNOVER_REQUIRED.slice();
    if(products.includes('MEP'))required.push(['mepLicenseId','MEP License ID']);
    if(products.includes('EPP'))required.push(['eppDeployment','EPP deployment'],['eppLicenseId','EPP License ID']);
    const missing=required.filter(([key])=>!present(state.turnover?.[key]));
    return{total:required.length,complete:required.length-missing.length,missing};
  }

  function readiness(state, options = {}) {
    state = state || {};
    const o = state.opportunity || {};
    const a = state.architecture || {};
    const p = state.partner || {};
    const processes = Array.isArray(state.processes) ? state.processes : [];
    const products=activeProducts(state);
    const selected = processes.filter(process=>processIsActive(state,process,products));
    const selectedIds=new Set(selected.map(process=>process.id).filter(Boolean));
    const gaps = (Array.isArray(state.gaps) ? state.gaps : []).filter(gap=>!gap.historical&&(!gap.processId||selectedIds.has(gap.processId)));

    const miss = [], done = [];
    const req = (ok, label, msg = 'is missing.') => { (ok ? done : miss).push({ label, msg }); };

    /* Business context */
    req(!!o.customer, 'Customer / prospect');
    req(!!options.primarySeId, 'Primary Solution Engineer', 'is not assigned through the governed Solution Fit assignment.');
    req(products.length > 0, 'Cloud Inventory product(s)');
    req(!!o.locations, 'Locations / operating scope');
    req(!!o.users, 'Estimated users');
    req(!!o.problem, 'Business problem');
    req(!!o.outcome, 'Desired outcome');

    /* Architecture */
    req(!!a.relationship, 'Deployment relationship');
    const mepScope=products.includes('MEP');
    if(mepScope){
      const scope=state.solutionScope||{};
      req(!!scope.erp, 'MEP ERP family');
      req(!!scope.erpVersion, 'MEP ERP version', 'is required; use Unknown / To Be Confirmed when the customer has not confirmed it.');
      req(selected.some(process=>process.product==='MEP'), 'MEP application scope', 'has no active governed MEP applications.');
    }else{
      req(!!a.erp, 'System of record / ERP');
      req(!!a.version, 'ERP / system version');
    }
    const standalone = a.relationship === 'Standalone';
    if (!standalone) {
      req(!!a.integrationMethod, 'Primary integration method');
      req(!!a.integrationOwner, 'Integration delivery owner');
    }

    /* Partner */
    req(!!p.involved, 'Partner involvement answer');
    if (p.involved === 'Yes') {
      req(!!p.company, 'Partner company');
      req(!!p.contactName, 'Partner contact');
      req(!!p.email, 'Partner email');
    }

    /* Process scope + demo/fit capture */
    req(selected.length > 0, 'Process scope', 'has not been selected.');
    const notDemo = selected.filter(x => x.demoStatus === 'Not reviewed');
    req(notDemo.length === 0, 'Demo status', notDemo.length ? `is not captured for ${notDemo.map(x => x.name).join(', ')}.` : '');
    const noFit = selected.filter(x => x.fit === 'Not reviewed');
    req(noFit.length === 0, 'Fit status', noFit.length ? `is not captured for ${noFit.map(x => x.name).join(', ')}.` : '');
    const noValidation=selected.filter(x=>!x.customerValidation||x.customerValidation==='Not validated'||x.customerValidation==='Validation pending');
    req(noValidation.length===0,'Customer validation',noValidation.length?`is not complete for ${noValidation.map(x=>x.name).join(', ')}.`:'');
    const legacy=processes.filter(process=>process.source==='legacy_process'&&process.historical!==true);
    req(legacy.length===0,'Legacy application mapping',legacy.length?'contains unclassified historical processes that must be intentionally upgraded to governed application scope.':'');
    const ambiguous=gaps.filter(gap=>gap.mappingStatus==='Needs Review / Ambiguous Legacy Mapping');
    req(ambiguous.length===0,'Legacy gap mapping',ambiguous.length?'contains ambiguous name-only gaps that require an explicit application selection.':'');
    const inventory=inventoryStats(state,products);
    req(!inventory.applicable||inventory.answered===inventory.total,'General inventory configuration',inventory.applicable?`has ${inventory.total-inventory.answered} unanswered item${inventory.total-inventory.answered===1?'':'s'}.`:'');
    const turnover=turnoverStats(state,products);
    req(turnover.complete===turnover.total,'Professional Services turnover',turnover.missing.length?`is missing ${turnover.missing.map(item=>item[1]).join(', ')}.`:'');
    const unresolved=gaps.filter(gap=>!['Resolved','Accepted exception'].includes(String(gap.status||'Open')));
    req(unresolved.length===0,'Gap disposition',unresolved.length?`has ${unresolved.length} unresolved gap${unresolved.length===1?'':'s'}.`:'');

    /* Material gaps need enough detail to be estimable */
    const must = gaps.filter(materialGap);
    for (const g of must) {
      req(!!g.need, `${g.id} customer need`);
      req(!!g.gapDescription || ['CONFIGURATION', 'PROCESS CHANGE', 'OUT OF SCOPE'].includes(g.classification),
        `${g.id} precise gap`, 'needs enough detail to explain the difference from standard behavior.');
      if (g.priority === 'Must Have' || g.goLive === 'Yes') {
        req(!!g.acceptance, `${g.id} acceptance criteria`, 'is missing for a go-live critical gap.');
        req(!!g.dependencies || !!g.assumptions, `${g.id} dependencies / assumptions`, 'is missing for a material gap.');
      }
    }

    /* Partner-owned integration implies partner involvement */
    if (a.integrationOwner === 'Partner') {
      req(p.involved === 'Yes', 'Partner involvement', 'must be Yes because the Partner owns integration.');
      if (p.involved === 'Yes') req(!!p.company, 'Partner company');
    }

    const total = miss.length + done.length;
    const score = total ? Math.round(done.length / total * 100) : 0;
    const status = miss.length === 0 ? 'ready' : score >= 75 ? 'conditional' : 'not_ready';
    return { miss, done, score, status };
  }

  return { readiness, materialGap, activeProducts, processIsActive, inventoryStats, turnoverStats };
});
