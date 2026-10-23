/* ═══════════════════════════════════════════════════════════════════
   solution-fit.js — SE Solution Fit & Handoff tab (Phase 3)
   Ported from the prototype, rebuilt in-app: server-persisted (no
   localStorage), tied to the selected customer, permission-aware
   (SE read/write, AE read+print), using the shared readiness engine.

   Everything is namespaced (sf* ids/classes, SF* globals) to avoid
   collisions with the main app which also uses .tab/.pane/state/etc.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CLASSIFICATIONS = ['UNKNOWN','CONFIGURATION','PROCESS CHANGE','EXTENSION','INTEGRATION','REPORT / PRINT','DATA','NON-FUNCTIONAL','ROADMAP','OUT OF SCOPE'];

  const PRODUCTS = ['MEP','CIP','EPP'];
  const PRODUCT_LABELS = {MEP:'Mobile Enterprise Platform (MEP)',CIP:'Cloud Inventory Platform',EPP:'Enterprise Printing Platform (EPP)'};
  const SF_MODEL = window.SolutionFitState;
  if (!SF_MODEL) throw new Error('Solution Fit state contract is unavailable.');
  const SF_SCOPE = window.SolutionFitScope;
  if (!SF_SCOPE) throw new Error('Solution Fit scope contract is unavailable.');
  const WORKFLOW = [
    ['context','Customer and SE'],['configuration','Inventory configuration'],['scope','Product and application scope'],
    ['labels','Labels and printing'],['integration','Integrations'],['gaps','Gaps and exceptions'],
    ['turnover','PS turnover'],['handoff','Readiness and document']
  ];
  const blankState = () => ({
    opportunity:{customer:'',stage:'Stage 2 — Define Economic Consequences',products:[],productsOther:'',goLive:'',users:'',locations:'',problem:'',outcome:'',
      businessOwnerName:'',businessOwnerTitle:'',businessOwnerEmail:'',businessOwnerPhone:'',
      technicalOwnerName:'',technicalOwnerTitle:'',technicalOwnerEmail:'',technicalOwnerPhone:''},
    architecture:{relationship:'',erp:'',version:'',otherSystems:'',integrationMethod:'',integrationOwner:'',integrationNotes:'',
      hasCustomizations:'',customizations:[]},
    partner:{involved:'',company:'',role:'',contactName:'',email:'',phone:'',title:''},
    solutionScope:{primaryProduct:'',additionalProducts:[],erp:'',erpVersion:'',catalogId:'',catalogVersion:'',catalogSource:'',selectedApps:[],selectedAppIds:[]},
    processes:[], gaps:[], interfaces:[],
    drivers:{offline:'Unknown',offlineDuration:'',devices:'',peripherals:'',customOutput:'Unknown',volumeConcern:'Unknown',volume:'',otherConstraint:''},
    inventoryConfiguration:{},lpnConfiguration:{},printing:{sites:'',labelCount:'',solution:'',notes:''},turnover:{},ui:{solutionFitLayoutVersion:'6.9.41'},
    handoffType:'internal'
  });
  const blankCustomization = () => ({ module:'', description:'', impact:'None' });

  /* Module state */
  let S = blankState();
  let customerId = null, customerName = '', canWrite = false, exists = false;
  let primarySeId = null, primarySeName = '', additionalSeIds = [];
  let capabilities={canView:false,canEdit:false,canCreate:false,canRestore:false},mepCatalog=null,loadState='idle';
  let openGapId = null, activeTab = 'context', saveTimer = null, dirty = false;
  let activeScopeProduct='MEP',scopeSearch='',scopeFilter='all';
  let showMissingOnly = false, activeTemplate = 'field', knownStakeholders = [];
  let knownSources = {}, sfKeyboardBound = false, sfActionsDelegated = false;
  let lastEditedByName = '', lastEditedAt = '';
  let pendingCreate = false, customerSearchTimer = null, customerPickerController = null;
  let workspaceLoadGeneration = 0, customerSwitchCoordinator = null;

  const SOLUTION_TEMPLATES = {
    field: {
      label:'Field inventory deployment', products:['MEP','CIP'],
      relationship:'Hybrid', integrationMethod:'Cloud Inventory REST API', integrationOwner:'Shared', partner:'No', offline:'Yes'
    },
    warehouse: {
      label:'Warehouse modernization', products:['CIP'],
      relationship:'Integrated to system of record', integrationMethod:'Cloud Inventory REST API', integrationOwner:'Shared', partner:'No', offline:'No'
    },
    erp: {
      label:'ERP inventory extension', products:['CIP'],
      relationship:'Integrated to system of record', integrationMethod:'Cloud Inventory REST API', integrationOwner:'Shared', partner:'No', offline:'Unknown'
    }
  };

  const esc = v => String(v==null?'':v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* Format the products list for documents (includes Other free-text). */
  function fmtProducts(o) {
    const list = Array.isArray(o.products) ? o.products.slice() : [];
    const out = list.filter(p => p !== 'Other');
    if (list.includes('Other') && o.productsOther) out.push(o.productsOther);
    return out.length ? out.join(', ') : '—';
  }
  /* Format an owner block: "Name, Title (email · phone)". */
  function fmtOwner(o, k) {
    const name = o[k+'Name'], title = o[k+'Title'], email = o[k+'Email'], phone = o[k+'Phone'];
    if (!name && !title) return '—';
    let s = name || '';
    if (title) s += (s?', ':'') + title;
    const contact = [email, phone].filter(Boolean).join(' · ');
    if (contact) s += ` (${contact})`;
    return s || '—';
  }
  const $ = s => document.getElementById(s);
  const val = (obj, path) => path.split('.').reduce((a,k)=>a?.[k], obj);
  const setVal = (obj, path, v) => { const p=path.split('.'); let o=obj; while(p.length>1) o=o[p.shift()]; o[p[0]]=v; };

  /* ── Readiness via shared engine (served at /handoff-readiness.js) ── */
  function computeReadiness() {
    if (typeof HandoffReadiness !== 'undefined' && HandoffReadiness.readiness) return HandoffReadiness.readiness(S,{primarySeId});
    return { miss:[], done:[], score:0, status:'not_ready' };
  }
  function materialGap(g) {
    if (typeof HandoffReadiness !== 'undefined' && HandoffReadiness.materialGap) return HandoffReadiness.materialGap(g);
    return g.priority==='Must Have' || g.goLive==='Yes';
  }

  /* ── Server load / save ─────────────────────────────────────────── */
  function clearWorkspaceForLoad(custId){
    clearTimeout(saveTimer);
    document.getElementById('sfScopeWizard')?.remove();
    document.getElementById('sfCustomerSwitchDialog')?.remove();
    S=blankState();customerId=custId||null;customerName='';canWrite=false;exists=false;dirty=false;
    primarySeId=null;primarySeName='';additionalSeIds=[];
    capabilities={canView:false,canEdit:false,canCreate:false,canRestore:false};
    knownSources={};knownStakeholders=[];lastEditedByName='';lastEditedAt='';openGapId=null;
    activeTab='context';activeScopeProduct='MEP';scopeSearch='';scopeFilter='all';loadState='idle';
  }
  async function loadHandoff(custId) {
    const generation=++workspaceLoadGeneration;
    clearWorkspaceForLoad(custId);
    renderGateState('loading');
    try {
      const resp = await apiFetch('/api/handoffs/' + encodeURIComponent(custId));
      if(generation!==workspaceLoadGeneration)return false;
      if (!resp || !resp.ok) {
        if(resp&&resp.status===403)renderGateState('permission');
        else renderGateState('error',await safeError(resp));
        return false;
      }
      const data = await resp.json();
      if(generation!==workspaceLoadGeneration)return false;
      lastEditedByName = data.lastEditedByName || '';
      lastEditedAt = data.updatedAt || '';
      customerName = data.customerName || '';
      exists = !!data.exists;
      capabilities=data.capabilities||{};
      canWrite=!!capabilities.canEdit;
      primarySeId=data.primarySeId||null;primarySeName=data.primarySeName||'';additionalSeIds=Array.isArray(data.additionalSeIds)?data.additionalSeIds:[];
      knownSources = {};
      activeTemplate = inferTemplate();
      S = mergeState(blankState(), data.data || {});
      migrateState(S);
      /* Seed customer name into opportunity if empty. */
      if (!S.opportunity.customer && customerName) S.opportunity.customer = customerName;
      await loadSEList();
      if(generation!==workspaceLoadGeneration)return false;
      await ensureMepCatalog();
      if(generation!==workspaceLoadGeneration)return false;
      /* Permission: can this user write? (server is authoritative; we mirror for UI). */
      await loadKnownStakeholders();
      if(generation!==workspaceLoadGeneration)return false;
      if(!exists){renderGateState(data.removedRecoverable?'removed':'not-created',data);return false;}
      await applyKnownData({ mutate:false, save:false });
      if(generation!==workspaceLoadGeneration)return false;
      loadState='ready';
      return true;
    } catch (e) { if(generation!==workspaceLoadGeneration)return false;console.error('loadHandoff error:', e.message); renderGateState('error','Check your connection and try again.'); return false; }
  }

  async function safeError(resp){try{const b=await resp.json();return b&&b.error?b.error:'';}catch(_){return '';}}

  /* Tolerate handoffs saved under the previous field shapes (no data loss). */
  function migrateState(s) {
    SF_MODEL.migrateState(s);
    const o = s.opportunity || (s.opportunity = {});
    if (typeof o.products === 'string') { o.products = o.products ? [o.products] : []; }
    if (!Array.isArray(o.products)) o.products = [];
    if (o.productsOther === undefined) o.productsOther = '';
    /* old single owner fields → name */
    if (o.businessOwner && !o.businessOwnerName) o.businessOwnerName = o.businessOwner;
    if (o.technicalOwner && !o.technicalOwnerName) o.technicalOwnerName = o.technicalOwner;
    ['businessOwnerName','businessOwnerTitle','businessOwnerEmail','businessOwnerPhone',
     'technicalOwnerName','technicalOwnerTitle','technicalOwnerEmail','technicalOwnerPhone',
     'productsOther','locations'].forEach(k=>{ if(o[k]===undefined) o[k]=''; });
    const a = s.architecture || (s.architecture = {});
    if (a.hasCustomizations === undefined) a.hasCustomizations = '';
    if (!Array.isArray(a.customizations)) a.customizations = [];
    if (!Array.isArray(s.interfaces)) s.interfaces = [];
    if(!s.solutionScope||typeof s.solutionScope!=='object')s.solutionScope={primaryProduct:'',additionalProducts:[],erp:'',erpVersion:'',catalogId:'',catalogVersion:'',catalogSource:'',selectedApps:[],selectedAppIds:[]};
    const scope=s.solutionScope;
    if(!scope.primaryProduct){const first=o.products[0];scope.primaryProduct=first==='MEP'?'MEP':first==='CIP'?'CIP':first==='CPP'?'LEGACY_CPP':first==='Platform'?'LEGACY_PLATFORM':first||'';}
    if(!Array.isArray(scope.additionalProducts))scope.additionalProducts=[];
    if(!Array.isArray(scope.selectedApps))scope.selectedApps=[];
    if(scope.erp&&!a.erp)a.erp=scope.erp;if(a.erp&&!scope.erp)scope.erp=a.erp;
    if(scope.erpVersion&&!a.version)a.version=scope.erpVersion;if(a.version&&!scope.erpVersion)scope.erpVersion=a.version;
    s.processes.forEach(p=>{if(p.customerValidation===undefined)p.customerValidation='Not validated';});
    s.interfaces.forEach(it=>{
      if (it.direction === undefined) it.direction = 'Bidirectional';
      if (it.trigger === undefined) it.trigger = 'Near real time';
    });
  }

  let _seList = [];
  async function loadSEList() {
    try {
      const resp = await apiFetch('/api/solution-engineers');
      _seList = (resp && resp.ok) ? await resp.json() : [];
    } catch (e) { _seList = []; }
  }

  function currentUser() {
    try { return (window.ciAuth && window.ciAuth.getUser) ? (window.ciAuth.getUser() || {}) : {}; }
    catch (e) { return {}; }
  }

  function inferTemplate() {
    if(!SF_MODEL.canUseCustomerContext(customerId,window.currentScenarioCustomerId))return 'warehouse';
    try {
      const v = typeof getVals === 'function' ? getVals() : {};
      if (v.hasFieldInventory || String(v.solution || '').toLowerCase() === 'mep') return 'field';
      if (String(v.competitor || '').toLowerCase().includes('erp')) return 'erp';
    } catch (e) {}
    return 'warehouse';
  }
  function recommendedQuarter(monthsAhead) {
    const d = new Date();
    d.setMonth(d.getMonth() + (monthsAhead || 6));
    return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + ' ' + d.getFullYear();
  }
  function isBlank(v) { return v === undefined || v === null || (Array.isArray(v) ? !v.length : !String(v).trim()); }
  function sourceTag(path) {
    return knownSources[path] ? `<span class="sf-field-source">${esc(knownSources[path])}</span>` : '';
  }
  function setKnown(path, value, source, mutate) {
    if (isBlank(value)) return false;
    const current = val(S, path);
    if (!isBlank(current)) {
      if (String(current) === String(value)) knownSources[path] = source;
      return false;
    }
    if (!mutate) return false;
    setVal(S, path, value);
    knownSources[path] = source;
    return true;
  }
  async function loadKnownStakeholders() {
    knownStakeholders = [];
    if (!customerName || !SF_MODEL.canUseCustomerContext(customerId,window.currentScenarioCustomerId)) return;
    try {
      const resp = await apiFetch('/api/stakeholders?company=' + encodeURIComponent(customerName));
      if (resp && resp.ok) knownStakeholders = await resp.json();
    } catch (e) { console.warn('Solution Fit stakeholder prefill unavailable:', e.message); }
  }
  async function applyKnownData(options) {
    options = options || {};
    const mutate = options.mutate !== false;
    const save = options.save === true;
    let changed = 0;
    const sameScenarioCustomer=SF_MODEL.canUseCustomerContext(customerId,window.currentScenarioCustomerId);
    let v = {};
    if(sameScenarioCustomer)try { v = typeof getVals === 'function' ? getVals() : {}; } catch (e) {}
    const da = sameScenarioCustomer&&typeof discoveryAnswers !== 'undefined' ? discoveryAnswers : {};
    const solution = String(v.solution || '').toLowerCase();
    const product = solution === 'mep' ? 'MEP' : solution === 'cip' ? 'CIP' : '';
    const whyAct = sameScenarioCustomer?(document.getElementById('why_act')?.value?.trim() || ''):'';
    const add = (path, value, source) => { if (setKnown(path, value, source, mutate)) changed++; };
    add('opportunity.customer', customerName || v.company, 'Customer');
    add('opportunity.users', v.users > 0 ? String(v.users) : '', 'Calculator');
    if(sameScenarioCustomer){
      const governedStage=window.getCurrentBuyCycleStageLabel?.() || 'Stage 2 — Define Economic Consequences';
      /* The BuyCycle stage is governed application state, not optional prefill. */
      if(String(S.opportunity.stage||'')===String(governedStage))knownSources['opportunity.stage']='Buyer Evidence';
      else if(mutate){setVal(S,'opportunity.stage',governedStage);knownSources['opportunity.stage']='Buyer Evidence';changed++;}
    }
    add('opportunity.locations', v.fieldLocations > 0 ? `${v.fieldLocations} field location${v.fieldLocations===1?'':'s'}` : '', 'Calculator');
    add('opportunity.problem', whyAct, 'Executive narrative');
    add('opportunity.outcome', da.ve13 || '', 'Discovery');
    /* MEP ERP family/version are selected deliberately in Product and application
       scope. Discovery can prefill the generic architecture field only when MEP
       is not part of the active product scope. */
    if(!hasActiveProduct('MEP'))add('architecture.erp', da.ic_d2 || da.dq12 || '', 'Discovery');
    if (product && !S.opportunity.products.length && mutate) {
      S.opportunity.products = [product]; knownSources['opportunity.products'] = 'Calculator'; changed++;
    } else if (product && S.opportunity.products.includes(product)) knownSources['opportunity.products'] = 'Calculator';

    if (sameScenarioCustomer&&!knownStakeholders.length) await loadKnownStakeholders();
    const business = knownStakeholders.find(x=>x.role==='economic_buyer') || knownStakeholders.find(x=>x.role==='champion');
    const technical = knownStakeholders.find(x=>x.role==='technical_buyer');
    if (business) {
      add('opportunity.businessOwnerName', business.name, 'Stakeholders');
      add('opportunity.businessOwnerTitle', business.title, 'Stakeholders');
    }
    if (technical) {
      add('opportunity.technicalOwnerName', technical.name, 'Stakeholders');
      add('opportunity.technicalOwnerTitle', technical.title, 'Stakeholders');
    }
    if (save && changed) scheduleSave();
    return changed;
  }

  function templateDefaultCount() {
    const t = SOLUTION_TEMPLATES[activeTemplate];
    if (!t) return 0;
    let n = 0;
    if (isBlank(S.opportunity.goLive)) n++;
    if (!S.opportunity.products.length) n++;
    if (isBlank(S.architecture.relationship)) n++;
    if (isBlank(S.architecture.integrationMethod)) n++;
    if (isBlank(S.architecture.integrationOwner)) n++;
    if (isBlank(S.partner.involved)) n++;
    if (isBlank(S.drivers.offline) || S.drivers.offline==='Unknown') n++;
    return n;
  }
  function applyTemplateDefaults() {
    const t = SOLUTION_TEMPLATES[activeTemplate];
    if (!t) return 0;
    let changed = 0;
    const apply = (path, value) => {
      if (!isBlank(val(S,path))) return;
      setVal(S,path,value); knownSources[path] = 'Recommended'; changed++;
    };
    apply('opportunity.goLive', recommendedQuarter(6));
    if (!S.opportunity.products.length) { S.opportunity.products = t.products.slice(); knownSources['opportunity.products'] = 'Template'; changed++; }
    apply('architecture.relationship', t.relationship);
    apply('architecture.integrationMethod', t.integrationMethod);
    apply('architecture.integrationOwner', t.integrationOwner);
    apply('partner.involved', t.partner);
    if (isBlank(S.drivers.offline) || S.drivers.offline==='Unknown') { S.drivers.offline=t.offline; knownSources['drivers.offline']='Template'; changed++; }
    return changed;
  }

  async function resolveCanWrite() {
    /* SEs and admins can write; AEs are read + print. Read the role from the
       app's auth cache (exposed as window.ciAuth.getUser). */
    const u = currentUser();
    const roles=u&&(u.roleKeys||u.roles||[u.role])||[];
    return roles.includes('se') || roles.includes('admin');
  }

  function mergeState(base, extra) {
    if (Array.isArray(base)) return Array.isArray(extra) ? extra : base;
    if (base && typeof base === 'object') {
      for (const k of Object.keys(extra || {})) {
        base[k] = (base[k] && typeof base[k]==='object' && !Array.isArray(base[k])) ? mergeState(base[k], extra[k]) : extra[k];
      }
      return base;
    }
    return extra ?? base;
  }

  function scheduleSave() {
    if (!canWrite) return;
    dirty = true;
    setSaveState('saving');
    refreshSolutionFitProgress();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveHandoff, 800);
  }
  async function saveHandoff() {
    if (!canWrite) return true;
    if (!customerId) return false;
    try {
      const resp = await apiFetch('/api/handoffs/' + encodeURIComponent(customerId), {
        method: 'PUT', body: JSON.stringify({ data: S })
      });
      if (!resp || !resp.ok) { setSaveState('error'); return false; }
      const r = await resp.json();
      exists = true; dirty = false;
      setSaveState('saved');
      /* Reflect the server's authoritative readiness and saved-state status. */
      renderReadinessBar(r.readiness, r.status);
      refreshSolutionFitProgress();
      return true;
    } catch (e) { console.error('saveHandoff error:', e.message); setSaveState('error'); return false; }
  }
  async function flushSolutionFitSave(){clearTimeout(saveTimer);if(!canWrite)return true;if(!dirty)return true;const ok=await saveHandoff();if(!ok&&typeof showToast==='function')showToast('Solution Fit changes could not be saved. Resolve the save issue before creating customer output.');return ok;}
  function setSaveState(state) {
    const el = $('sfSaveState');
    if (!el) return;
    if (!canWrite) { el.innerHTML = '<span class="sf-ro">Read-only</span>'; return; }
    el.innerHTML = state==='saving' ? '<span class="sf-saving">Saving…</span>'
      : state==='saved' ? '<span class="sf-saved">✓ Saved to server</span>'
      : state==='error' ? '<span class="sf-err">⚠ Save failed — retrying on next edit</span>' : '';
  }

  /* ── Entry point: called on tab switch ──────────────────────────── */
  async function initSolutionFit() {
    const custId = resolveCurrentCustomerId();
    if (!custId) { clearWorkspaceForLoad(null);renderGate(); return; }
    if(String(customerId||'')===String(custId)&&dirty&&loadState==='ready'){
      $('sfGate').style.display='none';$('sfApp').style.display='block';renderApp();return;
    }
    await loadSolutionFitCustomer(custId);
  }
  async function loadSolutionFitCustomer(custId){
    $('sfGate').style.display = 'block';
    $('sfApp').style.display = 'none';
    const ok = await loadHandoff(custId);
    if (ok) {$('sfGate').style.display='none';$('sfApp').style.display='block';renderApp();}
    else if(pendingCreate&&loadState==='not-created'&&capabilities.canCreate){pendingCreate=false;openScopeWizard('create');}
    return ok;
  }

  /* Resolve the customer to work on: the scenario currently loaded on the
     calculator (its customer_id), else prompt to pick from the customer list. */
  function resolveCurrentCustomerId() {
    const fromUrl=SF_SCOPE.customerIdFromUrl(window.location.href);
    if(fromUrl){window._sfSelectedCustomerId=fromUrl;return fromUrl;}
    /* An explicit Solution Fit selection takes precedence within this workspace. */
    if (window._sfSelectedCustomerId) return window._sfSelectedCustomerId;
    /* If a scenario is loaded, use its customer_id. */
    if (typeof currentScenarioCustomerId !== 'undefined' && currentScenarioCustomerId) return currentScenarioCustomerId;
    return null;
  }

  function renderGate(errMsg) {
    $('sfApp').style.display = 'none';
    const gate = $('sfGate');
    gate.style.display = 'block';
    if (errMsg) { gate.innerHTML = `<div class="sf-gate-card"><p>${esc(errMsg)}</p></div>`; return; }
    /* Dedicated Solution Fit discovery: never widens the global customer switcher. */
    gate.innerHTML = `<div class="sf-gate-card">
      <div class="sf-gate-kicker">Solution Fit workspace</div>
      <h3>${customerId?'Switch Customer':'Find a customer'}</h3>
      <p>Search any active customer to create or continue a Solution Fit.</p>
      ${customerId&&customerName?`<div class="sf-picker-current"><span>Current customer workspace</span><strong>${esc(customerName)}</strong><button class="btn btn-ghost btn-sm" data-sfgate="cancel-switch">Cancel switching</button></div>`:''}
      <label class="sf-customer-search-label" for="sfCustomerSearch">Customer or sales rep</label>
      <input id="sfCustomerSearch" class="sf-customer-search" type="search" placeholder="Search customer or sales rep" autocomplete="off" aria-controls="sfCustomerResults">
      <div id="sfCustomerResults" class="sf-customer-results" role="listbox" aria-live="polite"><div class="sf-customer-loading">Loading active customers…</div></div>
      <button class="btn btn-ghost btn-sm sf-load-more" id="sfCustomerMore" hidden>Load more</button>
    </div>`;
    bindCustomerSearch();
    bindGateActions();
  }

  function gateActions(primary=''){
    return `<div class="sf-gate-actions">${primary}<button class="btn btn-ghost" data-sfgate="switch">Switch Customer</button><button class="btn btn-ghost" data-sfgate="return">Return to ROI Calculator</button></div>`;
  }
  function bindGateActions(){
    document.querySelector('[data-sfgate="retry"]')?.addEventListener('click',()=>initSolutionFit());
    document.querySelector('[data-sfgate="switch"]')?.addEventListener('click',()=>requestCustomerSwitch());
    document.querySelector('[data-sfgate="cancel-switch"]')?.addEventListener('click',()=>{if(exists){$('sfGate').style.display='none';$('sfApp').style.display='block';renderApp();}else initSolutionFit();});
    document.querySelector('[data-sfgate="return"]')?.addEventListener('click',()=>window.switchTab?.('calc'));
    document.querySelector('[data-sfgate="create"]')?.addEventListener('click',()=>openScopeWizard('create'));
    document.querySelector('[data-sfgate="restore"]')?.addEventListener('click',()=>restoreSolutionFit());
  }
  function renderGateState(state,detail){
    loadState=state;$('sfApp').style.display='none';const gate=$('sfGate');gate.style.display='block';
    if(state==='loading')gate.innerHTML='<div class="sf-gate-card" role="status"><div class="sf-gate-kicker">Solution Fit</div><h3>Loading Solution Fit…</h3><p>Retrieving the latest governed assessment for this customer.</p></div>';
    else if(state==='permission')gate.innerHTML=`<div class="sf-gate-card" role="alert"><div class="sf-gate-kicker">Access</div><h3>You do not have permission to view this Solution Fit.</h3><p>Your customer access remains available.</p>${gateActions()}</div>`;
    else if(state==='error')gate.innerHTML=`<div class="sf-gate-card" role="alert"><div class="sf-gate-kicker">Unable to load</div><h3>Solution Fit could not be loaded.</h3><p>${esc(detail||'The service did not return the assessment. Try again.')}</p>${gateActions('<button class="btn btn-primary" data-sfgate="retry">Retry</button>')}</div>`;
    else if(state==='removed')gate.innerHTML=`<div class="sf-gate-card"><div class="sf-gate-kicker">Removed assessment</div><h3>A previously removed Solution Fit exists.</h3><p>It is not treated as the active assessment.${capabilities.canRestore?' Restore it to continue with its history.':''}</p>${gateActions(capabilities.canRestore?'<button class="btn btn-primary" data-sfgate="restore">Restore Solution Fit</button>':'')}</div>`;
    else if(state==='not-created')gate.innerHTML=`<div class="sf-gate-card"><div class="sf-gate-kicker">Not started</div><h3>${capabilities.canCreate?'No Solution Fit has been created for this customer.':'No Solution Fit has been created yet.'}</h3><p>${capabilities.canCreate?'Set the product scope intentionally, then begin the governed assessment.':'A Sales Engineer or Admin can create the assessment.'}</p>${gateActions(capabilities.canCreate?'<button class="btn btn-primary" data-sfgate="create">Create Solution Fit</button>':'')}</div>`;
    bindGateActions();
  }
  async function restoreSolutionFit(){const r=await apiFetch('/api/handoffs/'+encodeURIComponent(customerId)+'/restore',{method:'POST',body:'{}'});if(r&&r.ok){window.showToast?.('Solution Fit restored.');initSolutionFit();}else window.showToast?.((await safeError(r))||'Solution Fit could not be restored.');}
  function bindCustomerSearch(){
    const input=$('sfCustomerSearch');
    input?.addEventListener('input',()=>{clearTimeout(customerSearchTimer);customerSearchTimer=setTimeout(()=>loadCustomerPicker(input.value,false),250);});
    input?.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';loadCustomerPicker('',false);}});
    $('sfCustomerMore')?.addEventListener('click',()=>loadCustomerPicker(input?.value||'',true));
    customerPickerController=SolutionFitCustomerPicker.createController({
      request:async({search,limit,offset})=>{
        const resp=await apiFetch('/api/solution-fit/customers?search='+encodeURIComponent(search)+'&limit='+limit+'&offset='+offset);
        if(!resp||!resp.ok)throw new Error((await safeError(resp))||'Solution Fit customers could not be searched.');
        return resp.json();
      },
      view:{
        loading:({append})=>{const results=$('sfCustomerResults'),more=$('sfCustomerMore');if(!append&&results)results.innerHTML='<div class="sf-customer-loading">Loading active customers…</div>';if(more){more.disabled=!!append;more.textContent=append?'Loading…':'Load more';}},
        results:({html,append})=>{const results=$('sfCustomerResults');if(!results)return;if(append)results.insertAdjacentHTML('beforeend',html);else results.innerHTML=html;bindCustomerResultActions();},
        empty:({kind})=>{const results=$('sfCustomerResults');if(results)results.innerHTML=`<div class="sf-customer-empty">${kind==='search'?'No customers match your search.':'No active customers are currently available.'}</div>`;},
        error:({retry})=>{const results=$('sfCustomerResults');if(!results)return;results.innerHTML='<div class="sf-customer-error" role="alert"><strong>Customers could not be loaded</strong><span>We couldn\'t load the Solution Fit customer list.</span><button class="btn btn-primary btn-sm" id="sfCustomerRetry">Retry</button></div>';$('sfCustomerRetry')?.addEventListener('click',retry);},
        pagination:({visible})=>{const more=$('sfCustomerMore');if(more){more.hidden=!visible;more.disabled=false;more.textContent='Load more';}}
      }
    });
    loadCustomerPicker('',false);
  }
  function bindCustomerResultActions(){
    const results=$('sfCustomerResults');
    results?.querySelectorAll('[data-sfcustomer-open]').forEach(x=>x.onclick=()=>chooseSolutionFitCustomer(x.dataset.sfcustomerOpen,'open'));
    results?.querySelectorAll('[data-sfcustomer-create]').forEach(x=>x.onclick=()=>chooseSolutionFitCustomer(x.dataset.sfcustomerCreate,'create'));
  }
  async function chooseSolutionFitCustomer(id,intent) {
    pendingCreate=intent==='create';
    const result=await getCustomerSwitchCoordinator().select(id);
    return result;
  }
  async function loadCustomerPicker(search,append) {
    return customerPickerController?.load(search||'',!!append);
  }

  function updateSolutionFitLocation(id,replace=false){
    window._sfSelectedCustomerId=id||null;
    const next=SF_SCOPE.urlForCustomer(window.location.href,id||'');
    const current=window.location.pathname+window.location.search+window.location.hash;
    if(next!==current)window.history[replace?'replaceState':'pushState']({solutionFitCustomer:id||null},'',next);
  }
  function getCustomerSwitchCoordinator(){
    if(customerSwitchCoordinator)return customerSwitchCoordinator;
    customerSwitchCoordinator=SF_SCOPE.createSwitchCoordinator({
      isDirty:()=>dirty,
      save:async()=>{clearTimeout(saveTimer);return saveHandoff();},
      discard:async()=>{const id=customerId;clearTimeout(saveTimer);dirty=false;if(id)await loadHandoff(id);},
      clear:id=>{workspaceLoadGeneration++;clearWorkspaceForLoad(id);},
      navigate:id=>updateSolutionFitLocation(id),
      load:id=>loadSolutionFitCustomer(id)
    });
    return customerSwitchCoordinator;
  }
  async function requestCustomerSwitch(decision){
    const result=await getCustomerSwitchCoordinator().prepare(decision);
    if(result.status==='decision-required'){renderCustomerSwitchDecision();return;}
    if(result.status==='blocked'){
      const error=$('sfSwitchError');if(error)error.textContent='Your changes could not be saved. You are still in this customer workspace. Retry the save or cancel.';
      setSaveState('error');return;
    }
    if(result.status!=='ready')return;
    document.getElementById('sfCustomerSwitchDialog')?.remove();
    $('sfApp').style.display='none';renderGate();
  }
  function renderCustomerSwitchDecision(){
    document.getElementById('sfCustomerSwitchDialog')?.remove();
    const overlay=document.createElement('div');overlay.id='sfCustomerSwitchDialog';overlay.className='sf-scope-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','sfSwitchTitle');
    overlay.innerHTML=`<section class="sf-switch-dialog"><header><div><div class="sf-gate-kicker">Switch Customer</div><h2 id="sfSwitchTitle">Unsaved Solution Fit changes</h2></div><button class="sf-scope-close" data-sfswitch="cancel" aria-label="Close">×</button></header><div class="sf-switch-body"><p>You have unsaved Solution Fit changes for <strong>${esc(customerName||'this customer')}</strong>.</p><p>Save them before switching, discard only the unsaved edits, or stay in the current workspace.</p><div id="sfSwitchError" class="sf-scope-error" role="alert"></div></div><footer><button class="btn btn-ghost" data-sfswitch="cancel">Cancel</button><button class="btn btn-danger" data-sfswitch="discard">Discard &amp; Switch</button><button class="btn btn-primary" data-sfswitch="save">Save &amp; Switch</button></footer></section>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-sfswitch="cancel"]').forEach(button=>button.onclick=()=>overlay.remove());
    overlay.querySelector('[data-sfswitch="discard"]').onclick=()=>requestCustomerSwitch('discard');
    overlay.querySelector('[data-sfswitch="save"]').onclick=async event=>{event.currentTarget.disabled=true;await requestCustomerSwitch('save');if(document.body.contains(overlay))event.currentTarget.disabled=false;};
  }

  let scopeDraft=null;
  async function ensureMepCatalog(){
    if(mepCatalog)return mepCatalog;
    const r=await apiFetch('/api/solution-fit/catalog/mep-standard-apps');
    if(!r||!r.ok)throw new Error('The governed MEP application catalog could not be loaded.');
    mepCatalog=await r.json();return mepCatalog;
  }
  function currentScope(){return S.solutionScope||{};}
  function scopeProduct(){const p=currentScope().primaryProduct;return PRODUCTS.includes(p)?p:'';}
  function productLabel(p){return PRODUCT_LABELS[p]||({LEGACY_CPP:'Legacy CPP — review classification',LEGACY_PLATFORM:'Legacy Platform — review classification'}[p]||p||'Product not selected');}
  function scopeSummary(){const x=currentScope(),count=(x.selectedApps||[]).length;return hasActiveProduct('MEP')?`${productLabel(x.primaryProduct)} · MEP ${x.erp||'ERP not selected'} · ${count} app${count===1?'':'s'} in scope`:productLabel(x.primaryProduct);}
  async function openScopeWizard(mode){
    if(mode==='edit'&&dirty&&!await flushSolutionFitSave())return;
    scopeDraft=SF_SCOPE.createDraft(S,mode);
    renderScopeWizard();
  }
  function renderScopeWizard(){
    document.getElementById('sfScopeWizard')?.remove();const d=scopeDraft;
    const overlay=document.createElement('div');overlay.id='sfScopeWizard';overlay.className='sf-scope-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','sfScopeTitle');
    overlay.innerHTML=SF_SCOPE.renderDialog({draft:d,state:S,customerName});
    document.body.appendChild(overlay);bindScopeWizard();
  }
  function bindScopeWizard(){
    const root=document.getElementById('sfScopeWizard');root.querySelector('.sf-scope-close').onclick=closeScopeWizard;root.querySelector('[data-sfscope="cancel"]').onclick=closeScopeWizard;root.onclick=e=>{if(e.target===root)closeScopeWizard();};
    root.querySelectorAll('[name="sfPrimaryProduct"]').forEach(x=>x.onchange=()=>{const previousPrimary=scopeDraft.primaryProduct;scopeDraft.primaryProduct=x.value;scopeDraft.additionalProducts=scopeDraft.additionalProducts.filter(p=>p!==x.value);if(previousPrimary&&previousPrimary!==x.value&&!scopeDraft.additionalProducts.includes(previousPrimary))scopeDraft.additionalProducts.push(previousPrimary);scopeDraft.removalConfirmed=false;scopeDraft.error='';renderScopeWizard();});
    root.querySelectorAll('[data-sfadditional]').forEach(x=>x.onchange=()=>{const p=x.dataset.sfadditional;scopeDraft.additionalProducts=x.checked?[...new Set([...scopeDraft.additionalProducts,p])]:scopeDraft.additionalProducts.filter(v=>v!==p);scopeDraft.removalConfirmed=false;scopeDraft.error='';renderScopeWizard();});
    root.querySelector('[data-sfscope-confirm-removal]')?.addEventListener('change',e=>{scopeDraft.removalConfirmed=e.target.checked;scopeDraft.error='';});
    root.querySelector('[data-sfscope="save"]').onclick=commitScope;
  }
  function closeScopeWizard(){document.getElementById('sfScopeWizard')?.remove();scopeDraft=null;document.querySelector('[data-sfaction="editScope"],[data-sfgate="create"]')?.focus();}
  async function commitScope(){
    const d=scopeDraft;let candidate;
    try{candidate=SF_SCOPE.applyProductScope(S,d).state;}catch(error){d.error=error.message;renderScopeWizard();return;}
    if(d.mode==='create'){
      if(!candidate.opportunity.customer)candidate.opportunity.customer=customerName;
      const r=await apiFetch('/api/handoffs/'+encodeURIComponent(customerId),{method:'POST',body:JSON.stringify({data:candidate})});
      if(!r||!r.ok){d.error=(await safeError(r))||'Solution Fit could not be created. Review the selection and retry.';renderScopeWizard();return;}
      closeScopeWizard();window.showToast?.('Solution Fit created.');await initSolutionFit();return;
    }
    const r=await apiFetch('/api/handoffs/'+encodeURIComponent(customerId),{method:'PUT',body:JSON.stringify({data:candidate})});
    if(!r||!r.ok){d.error=(await safeError(r))||'Product scope could not be saved. Your existing Solution Fit is unchanged; retry when the connection is restored.';renderScopeWizard();return;}
    dirty=false;closeScopeWizard();window.showToast?.('Product scope saved. Existing ERP, application, demo, gap, and evidence records were preserved.');await initSolutionFit();
  }

  /* ── Main render ────────────────────────────────────────────────── */
  function selectedProducts(){
    return SF_MODEL.activeProducts(S).filter(product=>PRODUCTS.includes(product));
  }
  function hasActiveProduct(product){return SF_MODEL.hasActiveProduct(S,product);}
  function activeProcesses(){return SF_MODEL.activeProcesses(S);}
  function activeGaps(){return SF_MODEL.activeGaps(S);}
  function applicationAssessmentComplete(process){
    return process.selected&&process.demoStatus!=='Not reviewed'&&process.fit!=='Not reviewed'&&process.customerValidation!=='Not validated'&&process.customerValidation!=='Validation pending'&&(!['Partial fit','Gap'].includes(process.fit)||String(process.notes||'').trim());
  }
  function workflowState(key){
    const selected=activeProcesses(),inventory=SF_MODEL.inventoryStats(S),turnover=SF_MODEL.turnoverStats(S),readiness=computeReadiness();
    if(key==='context')return!!(S.opportunity.customer&&primarySeId);
    if(key==='configuration')return inventory.pct===100;
    if(key==='scope')return selected.length>0&&selected.every(applicationAssessmentComplete);
    if(key==='labels')return!Number(S.printing.sites||0)||!!S.printing.solution;
    if(key==='integration')return!!S.architecture.relationship&&(S.architecture.relationship==='Standalone'||!!S.architecture.integrationMethod);
    if(key==='gaps')return activeGaps().every(g=>!materialGap(g)||(String(g.need||'').trim()&&String(g.gapDescription||'').trim()));
    if(key==='turnover')return turnover.complete===turnover.total;
    return readiness.status==='ready'&&turnover.complete===turnover.total&&!dirty;
  }
  function renderApp() {
    const app = $('sfApp');
    const r = computeReadiness();
    const defaultCount = templateDefaultCount();
    const productsSummary = scopeSummary();
    const legacyFit=SF_MODEL.hasUnresolvedLegacy(S);
    const user=window.ciAuth?.getUser?.()||{},roleKeys=[user.role,...(user.roles||[]),...(user.roleKeys||[])].map(x=>String(x||'').toLowerCase()),canUseSeChristie=String(window.currentScenarioCustomerId||'')===String(customerId||'')&&roleKeys.some(x=>['admin','se','solution_engineer','solution engineer','value_engineering','value engineering'].includes(x));
    const products=selectedProducts();if(!products.includes(activeScopeProduct))activeScopeProduct=products[0]||'MEP';
    app.innerHTML = `
      ${legacyFit?'<div class="sf-legacy-banner"><div><strong>LEGACY / UNCLASSIFIED HISTORICAL PROCESS records need review.</strong><span>Configure governed product applications, then intentionally complete the legacy upgrade. Historical assessments will be preserved.</span></div>'+(canWrite?'<button class="btn btn-primary btn-sm" data-sfaction="upgradeLegacy">Configure governed application scope</button>':'')+'</div>':''}
      <div class="sf-topbar">
        <div class="sf-topbar-left">
          <span class="sf-customer-workspace-label">Customer workspace</span>
          <span class="sf-ctx-name">${esc(customerName || S.opportunity.customer || 'Customer')}</span>
          ${S.opportunity.stage ? `<span class="sf-stage-pill">${esc(S.opportunity.stage)}</span>` : ''}
          ${productsSummary ? `<span class="sf-stage-pill">${esc(productsSummary)}</span>` : ''}
          ${!canWrite ? '<span class="sf-ro-badge">Read-only</span>' : ''}
          ${lastEditedByName ? `<span class="sf-last-edit">Last updated by ${esc(lastEditedByName)}${lastEditedAt?' · '+new Date(lastEditedAt).toLocaleString():''}</span>` : ''}
        </div>
        <div class="sf-topbar-actions">
          <button class="btn btn-ghost btn-sm sf-topbar-btn" data-sfaction="switchCustomer">⇄ Switch Customer</button>
          ${canUseSeChristie?'<button class="btn btn-ghost btn-sm sf-topbar-btn" data-sfaction="askChristie">Ask Christie</button>':''}
          ${canWrite?'<button class="btn btn-ghost btn-sm sf-topbar-btn" data-sfaction="editScope">Edit Scope</button>':''}
          ${canWrite ? '<button class="btn btn-ghost btn-sm sf-topbar-btn" data-sfaction="refreshKnown">Refresh known data</button>' : ''}
          ${canWrite && defaultCount ? `<button class="btn btn-primary btn-sm" data-sfaction="applyDefaults">Apply ${defaultCount} recommended default${defaultCount===1?'':'s'}</button>` : ''}
          <div class="sf-topbar-right" id="sfSaveStateMini"></div>
        </div>
      </div>
      <div class="sf-readiness-bar" id="sfReadinessBar"></div>
      <nav class="sf-workflow-strip" aria-label="Guided Solution Fit workflow">
        <div class="sf-workflow-head"><strong>Guided workflow</strong><span>Work left to right. Select a step to jump directly to it.</span></div>
        <div class="sf-workflow-nav" role="tablist">
          ${WORKFLOW.map(([key,label],index)=>`<button class="sf-workflow-step ${activeTab===key?'active':''} ${workflowState(key)?'complete':'attention'}" role="tab" aria-selected="${activeTab===key?'true':'false'}" data-sftab="${key}"><span class="sf-workflow-number">${index+1}</span><span>${esc(label)}</span><span class="sf-workflow-state">${workflowState(key)?'✓':'!'}</span></button>`).join('')}
        </div>
      </nav>
      <div class="sf-guided-layout">
      <main class="sf-guided-main">
      <div class="sf-panes">
        <div class="sf-pane" data-sfpane="context">${renderContext()}</div>
        <div class="sf-pane" data-sfpane="configuration">${renderInventoryConfiguration()}</div>
        <div class="sf-pane" data-sfpane="scope">${renderProductScope()}</div>
        <div class="sf-pane" data-sfpane="labels">${renderLabels()}</div>
        <div class="sf-pane" data-sfpane="integration">${renderIntegration()}</div>
        <div class="sf-pane" data-sfpane="gaps">${renderGaps()}</div>
        <div class="sf-pane" data-sfpane="turnover">${renderTurnover()}</div>
        <div class="sf-pane" data-sfpane="handoff">${renderReadinessTab(r)}</div>
      </div>
      <div class="sf-next-row"><button class="btn btn-primary" id="sfNextSection">${activeTab==='handoff'?'Review handoff':'Next step →'}</button></div>
      </main>
      ${renderProgressSummary(r)}
      </div>`;
    wireTabs();
    app.querySelector('[data-sfaction="askChristie"]')?.addEventListener('click',()=>window.openChristieForPerspective?.('se',window._calcScenarioId||null));
    wireBindings();
    showActivePane();
    renderReadinessBar(r.score, r.status, r.miss);
    setSaveState('');
    if (!canWrite) disableInputs();
  }

  function renderReadinessBar(score, status, miss) {
    const el = $('sfReadinessBar');
    if (!el) return;
    const pct = score || 0;
    const current = computeReadiness();
    const missing = Array.isArray(miss) ? miss : current.miss;
    const completed = current.done.length;
    const total = completed + current.miss.length;
    const effectiveStatus=dirty&&status==='ready'?'not_ready':status;
    const label = dirty ? 'Not ready — unsaved changes'
                : effectiveStatus==='ready' ? 'Ready to hand off'
                : effectiveStatus==='conditional' ? 'Conditional — some items still open'
                : 'Not ready — key fields missing';
    const barColor = effectiveStatus==='ready' ? 'var(--green)' : effectiveStatus==='conditional' ? '#D97706' : 'var(--red)';
    const blocker = missing && missing.length
      ? `<span class="sf-rbar-blocker">${missing.length} item${missing.length!==1?'s':''} to resolve</span>`
      : '';
    el.innerHTML = `
      <div class="sf-rbar-inner">
        <div class="sf-rbar-track"><div class="sf-rbar-fill" style="width:${pct}%;background:${barColor};"></div></div>
        <div class="sf-rbar-info">
          <span class="sf-rbar-summary"><strong>${completed} of ${total} required checks complete</strong> · ${esc(label)}</span>
          ${blocker}
          <span class="sf-rbar-pct" style="color:${barColor}">${pct}%</span>
        </div>
      </div>`;
    /* Also mirror save state label here */
    const sm = $('sfSaveStateMini');
    if (sm) setSaveState(_lastSaveState || '');
  }

  function refreshSolutionFitProgress(){
    const app=$('sfApp');if(!app||loadState!=='ready')return;
    const r=computeReadiness();
    renderReadinessBar(r.score,r.status,r.miss);
    const current=app.querySelector('.sf-progress-summary');
    if(current){const shell=document.createElement('div');shell.innerHTML=renderProgressSummary(r);current.replaceWith(shell.firstElementChild);}
    WORKFLOW.forEach(([key])=>{const button=app.querySelector(`[data-sftab="${key}"]`);if(!button)return;const complete=workflowState(key);button.classList.toggle('complete',complete);button.classList.toggle('attention',!complete);const state=button.querySelector('.sf-workflow-state');if(state)state.textContent=complete?'✓':'!';});
  }

  let _lastSaveState = '';
  function setSaveState(state) {
    _lastSaveState = state;
    /* Update the page-header savestate element */
    const el = $('sfSaveState');
    /* Also update the mini bar */
    const mini = $('sfSaveStateMini');
    const html = !canWrite ? '<span class="sf-ro">Read-only</span>'
      : state==='saving' ? '<span class="sf-saving">Saving…</span>'
      : state==='saved'  ? '<span class="sf-saved">✓ Saved</span>'
      : state==='error'  ? '<span class="sf-err">⚠ Save failed</span>' : '';
    if (el) el.innerHTML = html;
    if (mini) mini.innerHTML = html;
  }

  /* ── Tab 1: Context (opportunity / architecture / partner) ──────── */
  /* Section accordion helper — tracks open state in openSections set */
  const _openSections = new Set(['opp']);
  function sfSection(id, icon, title, filledOf, content) {
    const open = _openSections.has(id);
    const pct = filledOf ? filledOf[0] + '/' + filledOf[1] : null;
    const complete = filledOf && filledOf[0] === filledOf[1] && filledOf[1] > 0;
    const statusCls = complete ? 'sf-sec-status-done' : (filledOf && filledOf[0] > 0 ? 'sf-sec-status-part' : '');
    return `<div class="sf-section ${open?'sf-section-open':''}" id="sfsec-${id}">
      <button class="sf-section-head" data-sftoggle="${id}" type="button">
        <span class="sf-section-icon sf-icon-${icon}">${sfIcon(icon)}</span>
        <span class="sf-section-title">${esc(title)}</span>
        ${pct ? `<span class="sf-sec-status ${statusCls}">${complete?'✓ Complete':pct+' filled'}</span>` : ''}
        <span class="sf-section-chevron">${open?'▲':'▼'}</span>
      </button>
      <div class="sf-section-body">${open ? content : ''}</div>
    </div>`;
  }
  function sfIcon(t) {
    return t==='opp'?'🎯':t==='arch'?'🔗':t==='partner'?'🤝':'📋';
  }
  function countFilled(paths) {
    return paths.filter(p => { const v = val(S,p); return v && String(v).trim(); }).length;
  }
  function renderContext() {
    const o=S.opportunity, a=S.architecture, p=S.partner;
    const f = (label, path, ph='') => `<div class="sf-field" data-sfmissing="${isBlank(val(S,path))}"><label>${esc(label)}${sourceTag(path)}</label><input data-sfbind="${path}" value="${esc(val(S,path))}" placeholder="${esc(ph)}"></div>`;
    const ta = (label, path, ph='') => `<div class="sf-field" data-sfmissing="${isBlank(val(S,path))}"><label>${esc(label)}${sourceTag(path)}</label><textarea data-dictate data-sfbind="${path}" placeholder="${esc(ph)}">${esc(val(S,path))}</textarea></div>`;
    const sel = (label, path, opts) => `<div class="sf-field" data-sfmissing="${isBlank(val(S,path))}"><label>${esc(label)}${sourceTag(path)}</label><select data-sfbind="${path}">${opts.map(x=>`<option ${val(S,path)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;

    /* Primary SE is the governed handoffs.primary_se_id assignment, never a JSON display string. */
    const user=currentUser(),selfId=String(user.id||''),canAssignOthers=!!capabilities.canAssign;
    const assignable=canAssignOthers?_seList:_seList.filter(candidate=>String(candidate.id)===selfId);
    const currentSeMissing=primarySeId&&!_seList.some(candidate=>String(candidate.id)===String(primarySeId));
    const seOpts = ['<option value="">Not Assigned</option>',...(currentSeMissing?[`<option value="${esc(primarySeId)}" selected>${esc(primarySeName||'Assigned user unavailable')} (current)</option>`]:[])].concat(
      assignable.map(candidate => `<option value="${esc(candidate.id)}" ${String(primarySeId||'')===String(candidate.id)?'selected':''}>${esc(candidate.name)}</option>`)
    ).join('');
    const assignmentLocked=!canAssignOthers&&!!primarySeId&&String(primarySeId)!==selfId;
    const seField = `<div class="sf-field" data-sfmissing="${!primarySeId}"><label>Primary Solution Engineer <span class="sf-field-source">Governed assignment</span></label><select data-sfassignment="primary" ${assignmentLocked?'disabled':''}>${seOpts}</select>${assignmentLocked?'<small>Only an Admin can reassign another Solution Engineer.</small>':''}</div>`;

    /* Products checkboxes + Other. */
    const productsField = `<div class="sf-field sf-current-scope" data-sfmissing="${!currentScope().primaryProduct}"><label>Primary Cloud Inventory product</label><div><strong>${esc(productLabel(currentScope().primaryProduct))}</strong>${hasActiveProduct('MEP')?`<span>MEP: ${esc(currentScope().erp||'ERP not selected')} ${currentScope().erpVersion?'· '+esc(currentScope().erpVersion):''} · ${(currentScope().selectedAppIds||[]).length} application${(currentScope().selectedAppIds||[]).length===1?'':'s'} · Catalog ${esc(currentScope().catalogVersion||'Not configured')}</span>`:''}${canWrite?'<button class="btn btn-ghost btn-sm" type="button" data-sfaction="editScope">Edit scope</button>':''}</div></div>`;

    /* Owners reuse Stakeholder Map entries; optional contact details stay collapsed. */
    const ownerBlock = (title, k) => {
      const currentName = o[k+'Name'];
      const stakeholderOptions = ['<option value="">Enter manually</option>'].concat(knownStakeholders.map(s=>`<option value="${esc(s.id)}" ${s.name===currentName?'selected':''}>${esc(s.name)}${s.title?' · '+esc(s.title):''}</option>`)).join('');
      return `<div class="sf-owner" data-sfmissing="${isBlank(currentName)}">
      <div class="sf-owner-title">${esc(title)}</div>
      ${knownStakeholders.length ? `<div class="sf-field sf-owner-picker"><label>Choose from Stakeholders${sourceTag('opportunity.'+k+'Name')}</label><select data-sfownerselect="${k}">${stakeholderOptions}</select></div>` : ''}
      <div class="sf-row2">${f('Name','opportunity.'+k+'Name')}${f('Title','opportunity.'+k+'Title')}</div>
      <details class="sf-owner-optional"><summary>Optional email and phone</summary><div class="sf-row2">${f('Email','opportunity.'+k+'Email')}${f('Phone','opportunity.'+k+'Phone')}</div></details>
    </div>`;
    };

    /* Known customizations rows. */
    const customRows = a.customizations.map((c,i)=>`<div class="sf-custom-row" data-sfcustidx="${i}">
      <input data-sfcustfield="module" data-sfcustidx="${i}" value="${esc(c.module)}" placeholder="Module (e.g. Sales Order)">
      <input data-sfcustfield="description" data-sfcustidx="${i}" value="${esc(c.description)}" placeholder="What was customized">
      <select data-sfcustfield="impact" data-sfcustidx="${i}">${['None','Low','Med','High'].map(x=>`<option ${c.impact===x?'selected':''}>${x}</option>`).join('')}</select>
      <button class="btn btn-danger btn-sm" data-sfcustdel="${i}" title="Remove">×</button>
    </div>`).join('');

    const oppFilled = countFilled(['opportunity.customer','opportunity.stage','opportunity.goLive','opportunity.users','opportunity.locations','opportunity.problem','opportunity.outcome']) + (primarySeId?1:0) + (o.products.length?1:0);
    const archFilled = countFilled(['architecture.relationship','architecture.erp','architecture.integrationMethod','architecture.integrationOwner']);
    const partFilled = countFilled(['partner.involved','partner.company','partner.contactName']);

    const oppBody = `
      <div class="sf-grid4">
        <div class="sf-field"><label>Current BuyCycle Stage${sourceTag('opportunity.stage')}</label><input value="${esc(o.stage||window.getCurrentBuyCycleStageLabel?.()||'Stage 2 — Define Economic Consequences')}" readonly></div>
        ${f('Target go-live','opportunity.goLive','e.g. Q1 2027')}
        ${f('Estimated users','opportunity.users','e.g. 45')}
        ${f('Locations / operating scope','opportunity.locations','e.g. 3 warehouses + 18 field sites')}
      </div>
      <div class="sf-row2">
        ${ta('Business problem','opportunity.problem','What is the customer trying to solve?')}
        ${ta('Desired outcome','opportunity.outcome','What does success look like?')}
      </div>
      <div class="sf-row2 sf-se-row">${seField}<div class="sf-entry-note">Known customer data is filled automatically. Review sourced and recommended values before handoff.</div></div>
      <div class="sf-subsection-label">Contacts</div>
      <div class="sf-row2">${ownerBlock('Business owner','businessOwner')}${ownerBlock('Technical owner','technicalOwner')}</div>`;

    const archBody = `
      ${sel('Deployment relationship','architecture.relationship',['','Standalone','Integrated to system of record','Hybrid'])}
      <div id="sfIntFields" class="${a.relationship==='Standalone'?'sf-hidden':''}">
        <div class="sf-row2">${hasActiveProduct('MEP')?`<div class="sf-field"><label>MEP ERP / system of record</label><input value="${esc(currentScope().erp||'Not selected')}" readonly></div><div class="sf-field"><label>MEP ERP version</label><input value="${esc(currentScope().erpVersion||'Not selected')}" readonly></div>`:f('ERP / system of record','architecture.erp')+f('ERP version','architecture.version')}</div>
        <div class="sf-row2">
          ${sel('Primary integration method','architecture.integrationMethod',['','Cloud Inventory REST API','SOAP / web service','File','Middleware / iPaaS','Connector','Other'])}
          ${sel('Integration delivery owner','architecture.integrationOwner',['','Cloud Inventory','Customer','Partner','Shared'])}
        </div>
        ${ta('Integration notes','architecture.integrationNotes','Frequency, volumes, error handling…')}
      </div>
      <div id="sfStandaloneNote" class="sf-note ${a.relationship==='Standalone'?'':'sf-hidden'}">Standalone — no system-of-record integration in scope.</div>
      <div class="sf-subsection-label" style="margin-top:14px;">Known customizations</div>
      ${sel('System of record has known customizations?','architecture.hasCustomizations',['','No','Yes'])}
      <div id="sfCustomizations" class="${a.hasCustomizations==='Yes'?'':'sf-hidden'}">
        <div class="sf-custom-head"><span>Module</span><span>What was customized</span><span>Impact</span><span></span></div>
        <div id="sfCustomRows">${customRows || '<div class="sf-muted" style="padding:4px 0;">No customizations added yet.</div>'}</div>
        <button class="btn btn-ghost btn-sm" data-sfaction="addCustomization" style="margin-top:6px;">＋ Add customization</button>
      </div>`;

    const partnerBody = `
      ${sel('Partner involved?','partner.involved',['','No','Yes'])}
      <div id="sfPartnerFields" class="${p.involved==='Yes'?'':'sf-hidden'}">
        <div class="sf-row2">${f('Partner company','partner.company')}${f('Role','partner.role','e.g. ERP / integration partner')}</div>
        <div class="sf-row2">${f('Contact name','partner.contactName')}${f('Email','partner.email')}</div>
      </div>`;

    return `<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 1</span><h2>Customer and Solution Engineering</h2><p>Customer identity and governed ROI workspace values are reused. Assign an active Solution Engineer and add only delivery context that is not already known.</p></div></div>`
         + sfSection('opp','opp','Customer and opportunity context',[oppFilled,9],oppBody);
  }

  const LPN_INVENTORY_LABEL='LPNs / Handling Units / Packing Units';
  function inventoryAnswerToken(answer){
    return ({'Yes':'yes','No':'no','Unknown / To confirm':'unknown','Not applicable':'not-applicable'})[answer]||'not-answered';
  }
  function renderLpnConfiguration(){
    if(S.inventoryConfiguration[LPN_INVENTORY_LABEL]?.answer!=='Yes')return'';
    return `<section class="sf-lpn-details" aria-labelledby="sfLpnDetailsTitle">
      <div class="sf-lpn-details-head"><div><span class="sf-lpn-kicker">Conditional detail</span><h3 id="sfLpnDetailsTitle">LPN / Handling Unit details</h3><p>Shown because LPNs / Handling Units / Packing Units is answered Yes.</p></div></div>
      <div class="sf-lpn-grid">${SF_MODEL.LPN_ITEMS.map((name,index)=>`<div class="sf-lpn-field"><label for="sfLpnAnswer${index}">${esc(name)}</label><select id="sfLpnAnswer${index}" data-sflpn="${esc(name)}">${SF_MODEL.ANSWERS.map(answer=>`<option value="${esc(answer)}" ${S.lpnConfiguration[name]===answer?'selected':''}>${esc(answer)}</option>`).join('')}</select></div>`).join('')}</div>
    </section>`;
  }
  function renderInventoryConfiguration(){
    const stats=SF_MODEL.inventoryStats(S),products=selectedProducts(),applies=products.includes('CIP')||products.includes('MEP');
    const rows=SF_MODEL.INVENTORY_ITEMS.map((name,index)=>{
      const record=S.inventoryConfiguration[name],answerId=`sfInventoryAnswer${index}`,noteId=`sfInventoryNote${index}`;
      return `<article class="sf-config-item" data-answer-state="${inventoryAnswerToken(record.answer)}">
        <div class="sf-config-head">
          <label class="sf-config-question" for="${answerId}">${esc(name)}</label>
          <div class="sf-config-answer"><span>Answer</span><select id="${answerId}" data-sfinventory="${index}">${SF_MODEL.ANSWERS.map(answer=>`<option value="${esc(answer)}" ${record.answer===answer?'selected':''}>${esc(answer)}</option>`).join('')}</select></div>
        </div>
        <details class="sf-config-note" ${record.note?'open':''}>
          <summary aria-controls="${noteId}"><span>${record.note?'Edit note':'+ Add note'}</span></summary>
          <div class="sf-config-note-editor"><label for="${noteId}">Design or handoff note</label><textarea id="${noteId}" data-dictate data-sfinventory-note="${index}" placeholder="Optional comments or design detail">${esc(record.note)}</textarea></div>
        </details>
      </article>`;
    }).join('');
    return `<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 2</span><h2>General inventory configuration</h2><p>Shared CIP and MEP inventory requirements are answered once for the overall solution.</p></div><span class="sf-step-count" data-sfinventory-count="heading" aria-live="polite">${stats.applicable?`${stats.answered} of ${stats.total} answered`:'Not applicable'}</span></div>
      ${applies?`<div class="sf-config-callout" role="note"><span aria-hidden="true">i</span><p>Use <strong>Unknown / To confirm</strong> when the customer has not decided.<br>Add notes only where they improve the design or handoff.</p></div><div class="sf-config-grid">${rows}</div><div data-sflpn-region>${renderLpnConfiguration()}</div>`:'<div class="sf-empty-state"><p>General inventory configuration applies when CIP or MEP is in scope.</p></div>'}`;
  }

  function productCatalog(product){
    if(product==='MEP'){
      const erp=currentScope().erp||'';
      if(!erp)return[];
      const packageApps=new Set(mepCatalog?.standardPackages?.[erp]||[]);
      return (mepCatalog?.erps?.[erp]||[]).map(name=>({name,group:erp,erp,standardPackage:packageApps.has(name),source:'standard_app'}));
    }
    const groups=product==='CIP'?SF_MODEL.CIP_CATALOG:SF_MODEL.EPP_CATALOG;
    return groups.flatMap(group=>group.apps.map(name=>({name,group:group.group,erp:'',standardPackage:false,source:'product_app'})));
  }
  function descriptorFor(product,item){return{product,name:item.name,group:item.group||'',erp:item.erp||'',source:item.source||'product_app',catalogVersion:product==='MEP'?(mepCatalog?.catalogVersion||''):''};}
  function findProcess(product,item){return SF_MODEL.findProcess(S,descriptorFor(product,item));}
  function renderApplicationCard(product,item){
    const process=findProcess(product,item),selected=!!process?.selected,index=process?S.processes.indexOf(process):-1;
    const locked=product==='MEP'&&currentScope().packageMode==='standard'&&item.standardPackage;
    const gapCount=process?S.gaps.filter(gap=>gap.processId===process.id).length:0;
    const assessment=selected?`<div class="sf-inline-assessment">
      <div class="sf-field"><label>Demo status</label><select data-sfpdemo="${index}">${SF_MODEL.DEMO_STATUSES.map(value=>`<option ${process.demoStatus===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div>
      <div class="sf-field"><label>Fit</label><select data-sfpfit="${index}">${SF_MODEL.FIT_STATUSES.map(value=>`<option ${process.fit===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div>
      <div class="sf-field"><label>Customer validation</label><select data-sfpvalidation="${index}">${SF_MODEL.VALIDATION_STATUSES.map(value=>`<option ${process.customerValidation===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div>
      <div class="sf-field sf-assessment-note"><label>Exceptions and notes</label><input data-sfpnote="${index}" value="${esc(process.notes)}" class="${['Partial fit','Gap'].includes(process.fit)&&!String(process.notes||'').trim()?'sf-required-input':''}" placeholder="${['Partial fit','Gap'].includes(process.fit)?'Describe the anticipated change, exception, or workaround (required)':'Evidence, exception, or customer note'}"></div>
      <div class="sf-assessment-status"><span class="${applicationAssessmentComplete(process)?'complete':''}">${applicationAssessmentComplete(process)?'Assessment complete':'Assessment needs attention'}</span>${gapCount?`<span>${gapCount} linked gap${gapCount===1?'':'s'}</span>`:''}${['Partial fit','Gap'].includes(process.fit)?`<button type="button" class="btn btn-ghost btn-sm" data-sfaction="gapFromProcess" data-process-index="${index}">Manage gap action</button>`:''}</div>
    </div>`:'';
    return `<article class="sf-application-card ${selected?'selected':''} ${item.standardPackage?'package':''}"><label class="sf-application-choice"><input type="checkbox" data-sfappselect="1" data-product="${product}" data-name="${esc(item.name)}" data-group="${esc(item.group||'')}" data-erp="${esc(item.erp||'')}" data-source="${esc(item.source||'product_app')}" ${selected?'checked':''} ${locked?'disabled':''}><span><strong>${esc(item.name)}</strong><small>${esc(item.group||product)}</small>${locked?'<em>Package baseline · remains selected</em>':''}</span>${product==='MEP'?`<span class="sf-app-kind ${item.standardPackage?'standard':'custom'}">${item.standardPackage?'Standard Package':'Additional'}</span>`:''}</label>${assessment}</article>`;
  }
  function renderStoredProcessCard(process){
    const index=S.processes.indexOf(process),selected=!!process.selected;
    const legacy=process.source==='legacy_process';
    return `<article class="sf-application-card ${selected?'selected':''}"><label class="sf-application-choice"><input type="checkbox" data-sfpsel="${index}" ${selected?'checked':''}><span><strong>${esc(process.name)}</strong><small>${esc(process.group||'Existing Solution Fit record')}</small><em>Preserved from the saved record · ID ${esc(process.id)}</em></span><span class="sf-app-kind custom">${legacy?'LEGACY / UNCLASSIFIED HISTORICAL PROCESS':'Customer-specific'}</span></label>${selected?`<div class="sf-inline-assessment"><div class="sf-field"><label>Demo status</label><select data-sfpdemo="${index}">${SF_MODEL.DEMO_STATUSES.map(value=>`<option ${process.demoStatus===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div><div class="sf-field"><label>Fit</label><select data-sfpfit="${index}">${SF_MODEL.FIT_STATUSES.map(value=>`<option ${process.fit===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div><div class="sf-field"><label>Customer validation</label><select data-sfpvalidation="${index}">${SF_MODEL.VALIDATION_STATUSES.map(value=>`<option ${process.customerValidation===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div><div class="sf-field sf-assessment-note"><label>Exceptions and notes</label><input data-sfpnote="${index}" value="${esc(process.notes)}" placeholder="Evidence, exception, or customer note"></div>${['Partial fit','Gap'].includes(process.fit)?`<button type="button" class="btn btn-ghost btn-sm" data-sfaction="gapFromProcess" data-process-index="${index}">Manage gap action</button>`:''}</div>`:''}</article>`;
  }
  function renderProductScope(){
    const products=selectedProducts(),catalog=productCatalog(activeScopeProduct),query=scopeSearch.trim().toLowerCase();
    let visible=catalog.filter(item=>!query||`${item.name} ${item.group}`.toLowerCase().includes(query));
    if(activeScopeProduct==='MEP'&&scopeFilter==='standard')visible=visible.filter(item=>item.standardPackage);
    if(activeScopeProduct==='MEP'&&scopeFilter==='additional')visible=visible.filter(item=>!item.standardPackage);
    if(scopeFilter==='selected')visible=visible.filter(item=>findProcess(activeScopeProduct,item)?.selected);
    if(scopeFilter==='missing')visible=visible.filter(item=>{const process=findProcess(activeScopeProduct,item);return process?.selected&&!applicationAssessmentComplete(process);});
    const groups=[...new Set(visible.map(item=>item.group))];
    const selectedCount=activeProcesses().filter(p=>p.product===activeScopeProduct).length;
    const standardMode=activeScopeProduct==='MEP'&&currentScope().packageMode==='standard';
    const catalogKeys=new Set(catalog.map(item=>SF_MODEL.processKey(descriptorFor(activeScopeProduct,item))));
    const preserved=S.processes.filter(process=>process.product===activeScopeProduct&&!catalogKeys.has(SF_MODEL.processKey(process))&&process.historical!==true).filter(process=>!query||`${process.name} ${process.group||''}`.toLowerCase().includes(query)).filter(process=>scopeFilter!=='selected'||process.selected).filter(process=>scopeFilter!=='missing'||(process.selected&&!applicationAssessmentComplete(process)));
    const legacy=S.processes.filter(process=>process.source==='legacy_process'&&process.historical!==true);
    return `<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 3</span><h2>Product and application scope</h2><p>Select the applications included in the solution, then capture demo status, fit, customer validation, and exceptions directly on each selected application.</p></div><span class="sf-step-count">${activeProcesses().length} selected</span></div>
      <div class="sf-product-grid">${products.map((product,index)=>`<article class="sf-product-choice active"><span><strong>${product} · ${esc(PRODUCT_LABELS[product])}</strong><small>${index===0?'Primary product':'Additional product'} · ${product==='MEP'?'Mobile workflows connected to the customer ERP.':product==='CIP'?'Cloud-native inventory execution and visibility.':'Managed label and document printing.'}</small></span></article>`).join('')}</div>
      ${products.length?`<div class="sf-product-tabs">${products.map(product=>`<button class="${activeScopeProduct===product?'active':''}" data-sfproducttab="${product}">${esc(productLabel(product))}</button>`).join('')}</div>`:'<div class="sf-empty-state"><p>Select at least one product to define application scope.</p></div>'}
      ${products.includes(activeScopeProduct)?`${activeScopeProduct==='MEP'?renderMepScopeSetup(standardMode):''}<div class="sf-scope-tools"><input id="sfScopeSearch" value="${esc(scopeSearch)}" placeholder="Search ${activeScopeProduct} applications"><button class="btn btn-ghost btn-sm ${scopeFilter==='all'?'active':''}" data-sfscopefilter="all">All</button>${activeScopeProduct==='MEP'?`<button class="btn btn-ghost btn-sm ${scopeFilter==='standard'?'active':''}" data-sfscopefilter="standard">Package apps</button><button class="btn btn-ghost btn-sm ${scopeFilter==='additional'?'active':''}" data-sfscopefilter="additional">Additional</button>`:''}<button class="btn btn-ghost btn-sm ${scopeFilter==='selected'?'active':''}" data-sfscopefilter="selected">Selected</button><button class="btn btn-ghost btn-sm ${scopeFilter==='missing'?'active':''}" data-sfscopefilter="missing">Show missing only</button><span>${selectedCount} selected</span><button class="btn btn-ghost btn-sm" data-sfaction="addProcess">+ Add customer-specific application</button></div>${groups.map(group=>`<details class="sf-catalog-group" open><summary>${esc(group)} (${visible.filter(item=>item.group===group).length})</summary><div class="sf-application-grid">${visible.filter(item=>item.group===group).map(item=>renderApplicationCard(activeScopeProduct,item)).join('')}</div></details>`).join('')}${preserved.length?`<details class="sf-catalog-group" open><summary>Saved customer-specific applications (${preserved.length})</summary><div class="sf-application-grid">${preserved.map(renderStoredProcessCard).join('')}</div></details>`:''}${legacy.length?`<details class="sf-catalog-group" open><summary>LEGACY / UNCLASSIFIED HISTORICAL PROCESS (${legacy.length})</summary><div class="sf-application-grid">${legacy.map(renderStoredProcessCard).join('')}</div></details>`:''}${!groups.length&&!preserved.length&&!legacy.length?'<div class="sf-empty-state"><p>No applications match the current filter.</p></div>':''}`:''}`;
  }
  function renderMepScopeSetup(standardMode){
    const erp=currentScope().erp||'',packageApps=mepCatalog?.standardPackages?.[erp]||[],selectedPackage=packageApps.filter(name=>{const item=productCatalog('MEP').find(row=>row.name===name);return item&&findProcess('MEP',item)?.selected;}).length;
    return `<div class="sf-mep-setup"><div class="sf-card"><h3>ERP family and version</h3><p>SAP Hana uses the same approved Standard Package list as SAP ECC6. Choose the family first, then enter the customer version here.</p><div class="sf-erp-buttons">${Object.keys(mepCatalog?.erps||{}).map(name=>`<button class="btn btn-ghost ${erp===name?'active':''}" data-sferp="${esc(name)}">${esc(name)}</button>`).join('')}</div><div class="sf-field"><label>ERP Version</label><input data-sferpversion value="${esc(currentScope().erpVersion||'')}" placeholder="Version or Unknown / To Be Confirmed" ${erp?'':'disabled'}></div></div><div class="sf-card"><h3>Scope approach</h3><p>Use the approved package as the baseline, or start a fully custom selection.</p><div class="sf-erp-buttons"><button class="btn btn-ghost ${standardMode?'active':''}" data-sfpackagemode="standard">Use Standard Package</button><button class="btn btn-ghost ${!standardMode?'active':''}" data-sfpackagemode="custom">Start Custom Scope</button></div></div></div>
      <div class="sf-package-banner ${standardMode?'':'custom'}"><strong>${standardMode?`${esc(erp||'MEP')} Standard Package active`:'Custom scope'}</strong><span>${standardMode?`All ${packageApps.length} approved package applications remain selected. Record any anticipated change as an application exception; the rest of the package remains unchanged.`:'Applications are not selected automatically. Choose only the applications required for this customer.'}</span><b>${standardMode?`${selectedPackage}/${packageApps.length} package apps`:''}</b></div>`;
  }

  function renderLabels(){
    const p=S.printing;
    return `<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 4</span><h2>Labels and printing</h2><p>Capture the compact printing context only when it applies. Detailed EPP application fit remains in Product and application scope.</p></div></div><div class="sf-card"><div class="sf-grid4"><div class="sf-field"><label>Sites needing label printing</label><input type="number" min="0" data-sfprinting="sites" value="${esc(p.sites)}"></div><div class="sf-field"><label>Number of labels</label><input type="number" min="0" data-sfprinting="labelCount" value="${esc(p.labelCount)}"></div><div class="sf-field"><label>Printing solution</label><select data-sfprinting="solution">${['','EPP','Third-party printing solution','Not required'].map(value=>`<option value="${esc(value)}" ${p.solution===value?'selected':''}>${esc(value||'Not selected')}</option>`).join('')}</select></div></div><div class="sf-field"><label>Custom label requirements</label><textarea data-dictate data-sfprinting="notes" placeholder="Only document customer-specific label formats or constraints">${esc(p.notes)}</textarea></div></div>`;
  }

  function renderTurnover(){
    const t=S.turnover,stats=SF_MODEL.turnoverStats(S),field=(label,key,placeholder='',type='text')=>`<div class="sf-field"><label>${esc(label)}</label><input type="${type}" data-sfturnover="${key}" value="${esc(t[key])}" placeholder="${esc(placeholder)}"></div>`,area=(label,key,placeholder='')=>`<div class="sf-field sf-wide"><label>${esc(label)}</label><textarea data-dictate data-sfturnover="${key}" placeholder="${esc(placeholder)}">${esc(t[key])}</textarea></div>`,select=(label,key,values)=>`<div class="sf-field"><label>${esc(label)}</label><select data-sfturnover="${key}">${['',...values].map(value=>`<option value="${esc(value)}" ${t[key]===value?'selected':''}>${esc(value||'Select')}</option>`).join('')}</select></div>`;
    const sourced=(label,value,source)=>`<div class="sf-field"><label>${esc(label)} <span class="sf-source-tag">${esc(source)}</span></label><input value="${esc(value||'Not yet established')}" readonly></div>`;
    return `<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 7</span><h2>Professional Services turnover</h2><p>Scope, configuration, application evidence, integrations, printing, and gaps carry forward automatically. Enter only the delivery information not already captured elsewhere.</p></div><span class="sf-step-count">${stats.complete} of ${stats.total}</span></div>
      <div class="sf-source-cards"><div><strong>Solution Fit</strong><span>Scope and assessment carry forward.</span></div><div><strong>ROI workspace</strong><span>Customer, outcomes, stakeholders, users, locations, and go-live are reused.</span></div><div><strong>Turnover input</strong><span>Commercial and delivery details are entered once.</span></div></div>
      <details class="sf-turnover-group" open><summary>Business and commercial context</summary><div class="sf-turnover-grid">${sourced('Customer',S.opportunity.customer,'Customer workspace')}${sourced('Business outcomes',S.opportunity.outcome,'Solution Fit context')}${area('Critical success factors','successFactors','What must be true for the implementation to succeed?')}${select('Contract review','contractStatus',['Signed and available','Exceptions documented','Not applicable'])}${area('Special contractual considerations','contractConsiderations','Major SOW changes, scope conditions, or commercial commitments')}${field('Solution Architect','solutionArchitect','Name and involvement')}${field('Customer ID','customerId','Nextworld or NetSuite ID')}${field('Sales cycle duration','salesCycle','Example: 8 months')}${area('Relationship history','relationshipHistory','Important relationship and account context')}</div></details>
      <details class="sf-turnover-group"><summary>Customer project contacts</summary><div class="sf-turnover-grid">${sourced('Project Sponsor / Business owner',[S.opportunity.businessOwnerName,S.opportunity.businessOwnerTitle].filter(Boolean).join(' · '),'Stakeholder Map')}${field('Project Manager','projectManager','Name')}${field('Project Manager email','projectManagerEmail','name@customer.com','email')}${field('Business SMEs','businessSmes','Names and domains')}${field('IT Lead','itLead','Name and role')}${field('System Administrator email','systemAdminEmail','Used for provisioning and maintenance notices','email')}${area('Infrastructure contact','infrastructureContact','Name, email, and responsibility')}</div></details>
      <details class="sf-turnover-group"><summary>Delivery ownership and timeline</summary><div class="sf-turnover-grid">${select('Delivery model','deliveryModel',['Cloud Inventory Professional Services','Implementation partner','Joint delivery'])}${field('Implementation partner','implementationPartner','Partner name or N/A')}${field('Internal delivery contact','internalDeliveryContact','Name and email')}${field('Partner delivery contact','partnerDeliveryContact','Name and email or N/A')}${area('Partner responsibilities','partnerResponsibilities','Scope and environment handoff boundaries')}${field('Project start','projectStart','', 'date')}${field('Kickoff date','kickoffDate','', 'date')}${sourced('Target go live',S.opportunity.goLive,'Solution Fit context')}${area('Date drivers and dependencies','dateDrivers','Hard dates, business drivers, or dependent projects')}${field('Third parties','thirdParties','Organizations and involvement')}</div></details>
      <details class="sf-turnover-group"><summary>EAP and license provisioning</summary><div class="sf-turnover-grid">${select('Customer edition','eapEdition',['Standard','Premium','Enterprise'])}${field('Number of environments','environments','1','number')}${field('Authorized languages','authorizedLanguages','English, French, German')}${area('Authorized solution definitions','authorizedDefinitions','Exact EAP solution definition names')}${field('Customer email domain','customerDomain','@customer.com')}${field('Partner implementer email','partnerImplementerEmail','Required for partner delivery','email')}${selectedProducts().includes('MEP')?field('MEP License ID','mepLicenseId','From contract or Contracts'):''}${selectedProducts().includes('EPP')?select('EPP deployment','eppDeployment',['Cloud EPP','On-premise EPP'])+field('EPP License ID','eppLicenseId','From contract or Contracts'):''}</div></details>
      <details class="sf-turnover-group"><summary>Physical environment and supporting documents</summary><div class="sf-turnover-grid">${select('Deployment model','deploymentModel',['Cloud','Customer hosted','Unknown / To confirm'])}${field('System sizing document','sizingDocument','Link or N/A')}${field('Current warehouse system','currentWarehouse','System and version')}${sourced('Locations',S.opportunity.locations,'ROI workspace')}${sourced('Number of users',S.opportunity.users,'ROI workspace')}${field('Device types planned','deviceTypes','Handhelds, printers, scanners')}${field('Hardware and device status','hardwareStatus','Ordered, available, or to confirm')}${field('Device readiness','deviceStatus','Configuration and staging status')}${area('Network and infrastructure constraints','networkConstraints','Connectivity, security, hosting, or device constraints')}${field('Signed order form and SOW','sowLink','Document link or repository location')}${field('RFP response','rfpLink','Link or N/A')}${field('Discovery materials','discoveryLink','Link or N/A')}${field('Onsite visit report','onsiteLink','Link or N/A')}${field('Demo scripts and presentations','demoLink','Link or N/A')}${area('Customer reference notes','referenceNotes','References discussed and follow-up')}</div></details>`;
  }

  function renderProgressSummary(r){
    const selected=activeProcesses(),complete=selected.filter(applicationAssessmentComplete).length,inventory=SF_MODEL.inventoryStats(S),turnover=SF_MODEL.turnoverStats(S),openGaps=activeGaps().filter(g=>String(g.status||'Open')!=='Resolved'&&String(g.status||'Open')!=='Accepted exception').length;
    return `<aside class="sf-progress-summary"><h3>Solution Fit progress</h3><div class="sf-summary-score">${r.score}%</div><div class="sf-progress"><div class="sf-progress-fill" style="width:${r.score}%"></div></div><dl><div><dt>Selected applications</dt><dd>${selected.length}</dd></div><div><dt>Complete assessments</dt><dd>${complete}</dd></div><div><dt>Configuration answered</dt><dd data-sfinventory-count="summary" aria-live="polite">${inventory.applicable?`${inventory.answered}/${inventory.total}`:'N/A'}</dd></div><div><dt>Open gaps</dt><dd>${openGaps}</dd></div><div><dt>Turnover fields</dt><dd>${turnover.complete}/${turnover.total}</dd></div></dl><p class="${dirty?'warn':''}">${dirty?'Unsaved changes are being sent to the server.':'Current browser state matches the last successful server save.'}</p></aside>`;
  }

  /* ── Gap register ───────────────────────────────────────────────── */
  function newGap(v={}){ return {id:SF_MODEL.nextGapId(S),processId:'',product:'',erp:'',group:'',process:'',mappingStatus:'unassigned',demoEvidence:'Yes',need:'',classification:'UNKNOWN',priority:'Should Have',goLive:'Unknown',currentProcess:'',standardBehavior:'',gapDescription:'',businessRationale:'',acceptance:'',dependencies:'',assumptions:'',openQuestions:'',impact:'',resolution:'',owner:'',targetDate:'',status:'Open',...v}; }
  function renderGaps(){
    var currentGaps=activeGaps();
    var historicalGaps=S.gaps.filter(function(g){return !currentGaps.includes(g);});
    var mustCount = currentGaps.filter(function(g){return g.priority==='Must Have';}).length;
    var unknownCount = currentGaps.filter(function(g){return g.classification==='UNKNOWN';}).length;
    return '<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 6</span><h2>Gaps and exceptions</h2><p>Application gaps originate in Product and application scope. Add impact, resolution, owner, target date, and status here without re-entering the assessment.</p></div></div><div class="sf-gap-header">'
      + '<h3 class="sf-gap-title">Gap register</h3>'
      + (currentGaps.length ? '<div class="sf-gap-counts">'
        + (mustCount ? '<span class="sf-gap-count sf-gc-must">&#9679; ' + mustCount + ' Must have</span>' : '')
        + (unknownCount ? '<span class="sf-gap-count sf-gc-unknown">&#9673; ' + unknownCount + ' Unclassified</span>' : '')
        + '</div>' : '')
      + '<button class="btn btn-primary btn-sm" data-sfaction="addGap">+ Capture gap</button>'
      + '</div>'
      + '<div id="sfGapList">' + (currentGaps.length ? currentGaps.map(function(g){return renderGapCard(g);}).join('') : '<div class="sf-empty-state"><p>No gaps captured. If all selected processes are demonstrated and full fit, that is a valid outcome.</p></div>') + '</div>'
      + (historicalGaps.length?'<details class="sf-catalog-group"><summary>Historical / inactive gaps ('+historicalGaps.length+')</summary><div class="sf-muted">Preserved for history and excluded from current readiness and outputs.</div>'+historicalGaps.map(function(g){return '<div class="sf-history-row"><strong>'+esc(g.id)+'</strong> · '+esc(g.process||'Unassigned application')+' · '+esc(g.gapDescription||g.need||'No description')+'</div>';}).join('')+'</details>':'');
  }
  function renderGapCard(g){
    var deep=materialGap(g), open=openGapId===g.id;
    var priCls = g.priority==='Must Have' ? 'sf-gap-must' : g.priority==='Should Have' ? 'sf-gap-should' : 'sf-gap-could';
    var classCls = g.classification==='UNKNOWN'?'sf-pill warn':g.classification==='OUT OF SCOPE'?'sf-pill bad':'sf-pill blue';
    var priLabel = g.priority==='Must Have' ? '<span class="sf-gap-pri sf-gp-must">Must have</span>'
                 : g.priority==='Should Have' ? '<span class="sf-gap-pri sf-gp-should">Should have</span>'
                 : '<span class="sf-gap-pri sf-gp-could">Could have</span>';
    return '<div class="sf-gap ' + priCls + '" data-sfgap="' + g.id + '">'
      + '<div class="sf-gap-sum">'
      + '<span class="sf-gap-id">' + esc(g.id) + '</span>'
      + '<span class="' + classCls + '">' + esc(g.classification) + '</span>'
      + priLabel
      + '<span class="sf-gap-need">' + esc(g.need||'Requirement not entered') + '</span>'
      + '<span class="sf-gap-owner">' + esc(g.owner?`Owner: ${g.owner}`:'Owner not assigned') + '</span>'
      + '<div class="sf-gap-actions">'
      + '<button class="btn btn-ghost btn-sm" data-sfgaptoggle="' + g.id + '">' + (open?'Close':'Details') + '</button>'
      + '<button class="btn btn-danger btn-sm" data-sfgapdel="' + esc(g.id) + '" title="Delete gap">&#215;</button>'
      + '</div></div>'
      + '<div class="sf-gap-detail ' + (open?'open':'') + '">'
      + (g.mappingStatus&&g.mappingStatus!=='mapped'&&g.mappingStatus!=='unassigned'?'<div class="sf-callout">'+esc(g.mappingStatus)+' — select the exact product application below. The system will not guess from a duplicate display name.</div>':'')
      + (deep?'<div class="sf-callout">Material gap — capture the business rule, evidence, acceptance criteria, and dependencies. Do not design the solution here.</div>':'')
      + '<div class="sf-row3">'
      + '<div class="sf-field"><label>Application / Process</label><select data-sfgfield="processId" data-sfgid="' + g.id + '"><option value="">Select exact application</option>' + S.processes.filter(p=>p.historical!==true).map(function(p){const label=[p.product,p.erp,p.group,p.name].filter(Boolean).join(' · ')||p.name;return '<option value="'+esc(p.id)+'" ' + (p.id===g.processId?'selected':'') + '>' + esc(label) + '</option>';}).join('') + '</select></div>'
      + '<div class="sf-field"><label>Demo evidence</label><select data-sfgfield="demoEvidence" data-sfgid="' + g.id + '">' + ['Yes','Partially','No','Not applicable'].map(function(x){return '<option ' + (g.demoEvidence===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '<div class="sf-field"><label>Classification</label><select data-sfgfield="classification" data-sfgid="' + g.id + '">' + CLASSIFICATIONS.map(function(x){return '<option ' + (x===g.classification?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '</div>'
      + '<div class="sf-field"><label>Customer need / outcome</label><textarea data-dictate data-sfgfield="need" data-sfgid="' + g.id + '">' + esc(g.need) + '</textarea></div>'
      + '<div class="sf-row2">'
      + '<div class="sf-field"><label>Current process (as-is)</label><textarea data-dictate data-sfgfield="currentProcess" data-sfgid="' + g.id + '">' + esc(g.currentProcess) + '</textarea></div>'
      + '<div class="sf-field"><label>Standard behavior demonstrated</label><textarea data-dictate data-sfgfield="standardBehavior" data-sfgid="' + g.id + '">' + esc(g.standardBehavior) + '</textarea></div>'
      + '</div>'
      + '<div class="sf-field"><label>Precise gap / difference</label><textarea data-dictate data-sfgfield="gapDescription" data-sfgid="' + g.id + '">' + esc(g.gapDescription) + '</textarea></div>'
      + '<div class="sf-row2"><div class="sf-field"><label>Business or operational impact</label><textarea data-dictate data-sfgfield="impact" data-sfgid="' + g.id + '">' + esc(g.impact||'') + '</textarea></div><div class="sf-field"><label>Workaround or proposed resolution</label><textarea data-dictate data-sfgfield="resolution" data-sfgid="' + g.id + '">' + esc(g.resolution||'') + '</textarea></div></div>'
      + '<div class="sf-row2">'
      + '<div class="sf-field"><label>Priority</label><select data-sfgfield="priority" data-sfgid="' + g.id + '">' + ['Must Have','Should Have','Could Have'].map(function(x){return '<option ' + (g.priority===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '<div class="sf-field"><label>Required for go-live?</label><select data-sfgfield="goLive" data-sfgid="' + g.id + '">' + ['Unknown','Yes','No'].map(function(x){return '<option ' + (g.goLive===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '</div>'
      + '<div class="sf-field"><label>Acceptance criteria</label><textarea data-dictate data-sfgfield="acceptance" data-sfgid="' + g.id + '">' + esc(g.acceptance) + '</textarea></div>'
      + '<div class="sf-row3"><div class="sf-field"><label>Owner name or role</label><input data-sfgfield="owner" data-sfgid="' + g.id + '" value="' + esc(g.owner||'') + '"></div><div class="sf-field"><label>Target date</label><input type="date" data-sfgfield="targetDate" data-sfgid="' + g.id + '" value="' + esc(g.targetDate||'') + '"></div><div class="sf-field"><label>Status</label><select data-sfgfield="status" data-sfgid="' + g.id + '">' + ['Open','In review','Resolved','Accepted exception'].map(function(x){return '<option ' + (g.status===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div></div>'
      + '<div class="sf-row2">'
      + '<div class="sf-field"><label>Dependencies / assumptions</label><textarea data-dictate data-sfgfield="dependencies" data-sfgid="' + g.id + '">' + esc(g.dependencies) + '</textarea></div>'
      + '<div class="sf-field"><label>Open questions</label><textarea data-dictate data-sfgfield="openQuestions" data-sfgid="' + g.id + '">' + esc(g.openQuestions) + '</textarea></div>'
      + '</div>'
      + '</div></div>';
  }

  /* ── Tab 4: Integration & drivers ───────────────────────────────── */
  function nextIntId(){ var max=Math.max(0,...S.interfaces.map(function(i){return Number((i.id||'').replace(/\D/g,''))||0;})); return 'INT-'+String(max+1).padStart(3,'0'); }
  function renderIntegration(){
    var sel=function(label,path,opts){return '<div class="sf-field"><label>'+esc(label)+'</label><select data-sfbind="'+path+'">'+opts.map(function(x){return '<option '+(val(S,path)===x?'selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></div>';};
    var f=function(label,path,ph){ph=ph||'';return '<div class="sf-field"><label>'+esc(label)+'</label><input data-sfbind="'+path+'" value="'+esc(val(S,path))+'" placeholder="'+esc(ph)+'"></div>';};
    var ta=function(label,path,ph){ph=ph||'';return '<div class="sf-field sf-wide"><label>'+esc(label)+'</label><textarea data-dictate data-sfbind="'+path+'" placeholder="'+esc(ph)+'">'+esc(val(S,path))+'</textarea></div>';};
    var hasInterfaces = S.interfaces.length > 0;
    return '<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 5</span><h2>Integrations</h2><p>Keep the primary integration record short and product-neutral. Add an interface only when a distinct data exchange must be handed to delivery.</p></div></div>'
      + '<div class="sf-card"><h3>Primary architecture</h3><div class="sf-row3">'
      + sel('Deployment relationship','architecture.relationship',['','Standalone','Integrated to system of record','Hybrid'])
      + (hasActiveProduct('MEP')?'<div class="sf-field"><label>MEP ERP / system of record</label><input value="'+esc(currentScope().erp||'Not selected')+'" readonly></div><div class="sf-field"><label>MEP ERP version</label><input value="'+esc(currentScope().erpVersion||'Not selected')+'" readonly></div>':f('ERP / system of record','architecture.erp')+f('ERP version','architecture.version'))+'</div>'
      + '<div class="sf-row2">'+sel('Primary integration method','architecture.integrationMethod',['','Cloud Inventory REST API','SOAP / web service','File','Middleware / iPaaS','Connector','Other'])+sel('Integration delivery owner','architecture.integrationOwner',['','Cloud Inventory','Customer','Partner','Shared'])+'</div>'
      + ta('Integration notes','architecture.integrationNotes','Frequency, volumes, error handling, or material constraints')+'</div>'
      + '<div class="sf-card">'
      + '<div class="sf-card-head"><h3>Additional interfaces</h3><button class="btn btn-ghost btn-sm" data-sfaction="addInterface">+ Add interface</button></div>'
      + '<div class="sf-table-wrap">'
      + (hasInterfaces
        ? '<table class="sf-table"><thead><tr><th style="width:70px">ID</th><th>Source</th><th>Target</th><th>Object / purpose</th><th style="width:140px">Method</th><th style="width:130px">Direction</th><th style="width:130px">Frequency</th><th style="width:120px">Owner</th><th style="width:36px"></th></tr></thead>'
          + '<tbody id="sfIntBody">' + S.interfaces.map(function(it,idx){return renderIntRow(it,idx);}).join('') + '</tbody></table>'
        : '<div class="sf-empty-state" id="sfIntBody"><p>No additional interfaces recorded. The primary integration is captured in Context &rarr; Architecture.</p></div>')
      + '</div></div>'
      + '<div class="sf-card"><h3>Mobility, outputs &amp; constraints</h3>'
      + '<div class="sf-drivers-grid">'
      + sel('Offline required?','drivers.offline',['Unknown','Yes','No'])
      + f('Offline duration','drivers.offlineDuration','e.g. up to 10 hours')
      + f('Devices','drivers.devices','e.g. Zebra Android handhelds, iOS')
      + sel('Custom outputs / labels?','drivers.customOutput',['Unknown','Yes','No'])
      + sel('Volume concern?','drivers.volumeConcern',['Unknown','Yes','No'])
      + f('Volume detail','drivers.volume','e.g. ~4,500 picks / day')
      + '</div></div>';
  }
  function renderIntRow(it,idx){
    return '<tr data-sfint="'+idx+'">'
      + '<td><span class="sf-int-id">'+esc(it.id)+'</span></td>'
      + '<td><input class="sf-table-input" data-sfifield="source" value="'+esc(it.source)+'" placeholder="Source system"></td>'
      + '<td><input class="sf-table-input" data-sfifield="target" value="'+esc(it.target)+'" placeholder="Target system"></td>'
      + '<td><input class="sf-table-input" data-sfifield="object" value="'+esc(it.object)+'" placeholder="What is being exchanged?"></td>'
      + '<td><select class="sf-table-input" data-sfifield="method">'+['REST API','SOAP / web service','File','Database','Middleware / iPaaS','Connector','Other','TBD'].map(function(x){return '<option '+(x===it.method?'selected':'')+'>'+x+'</option>';}).join('')+'</select></td>'
      + '<td><select class="sf-table-input" data-sfifield="direction">'+['Bidirectional','Inbound to CI','Outbound from CI','TBD'].map(function(x){return '<option '+(x===it.direction?'selected':'')+'>'+x+'</option>';}).join('')+'</select></td>'
      + '<td><select class="sf-table-input" data-sfifield="trigger">'+['Near real time','Scheduled batch','On demand','TBD'].map(function(x){return '<option '+(x===it.trigger?'selected':'')+'>'+x+'</option>';}).join('')+'</select></td>'
      + '<td><select class="sf-table-input" data-sfifield="owner">'+['Cloud Inventory','Customer','Partner','Shared','TBD'].map(function(x){return '<option '+(x===it.owner?'selected':'')+'>'+x+'</option>';}).join('')+'</select></td>'
      + '<td><button class="btn btn-danger btn-sm" data-sfintdel="'+idx+'" title="Delete">&#215;</button></td>'
      + '</tr>';
  }

  /* ── Tab 5: Readiness + handoff documents ───────────────────────── */
  function renderReadinessTab(r){
    const turnover=SF_MODEL.turnoverStats(S),turnoverReady=turnover.complete===turnover.total;
    return `<div class="sf-step-intro"><div><span class="sf-step-kicker">Step 8</span><h2>Readiness and documents</h2><p>Generate outputs only from the successfully saved server record. The Professional Services turnover document also requires all turnover fields.</p></div></div><div class="sf-card">
      <div class="sf-readiness-head">
        <div class="sf-score-big">${r.score}%</div>
        <div>
          <div class="sf-score-status sf-${r.status}">${r.status==='ready'?'Ready':r.status==='conditional'?'Conditional':'Not ready'}</div>
          <div class="sf-muted">${r.status==='ready'?'Core SE handoff fields complete. Services can validate and estimate.':r.status==='conditional'?'Most info present; the items below can still change scope.':'Material discovery information is still missing.'}</div>
        </div>
      </div>
      <div class="sf-progress"><div class="sf-progress-fill" style="width:${r.score}%"></div></div>
      <div class="sf-row2" style="margin-top:16px;align-items:start;">
        <div><h4>Missing before handoff</h4>${r.miss.length?r.miss.map(x=>`<div class="sf-miss">⚠ <strong>${esc(x.label)}</strong> ${esc(x.msg)}</div>`).join(''):'<div class="sf-done-item">✓ No automated blockers detected.</div>'}</div>
        <div><h4>Completed checks</h4>${r.done.slice(0,14).map(x=>`<div class="sf-done-item">✓ ${esc(x.label)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="sf-card">
      <div class="sf-card-head"><h3>Handoff documents</h3></div>
      <div class="sf-doc-toggle">
        <button class="sf-doc-btn ${S.handoffType!=='customer'?'active':''}" data-sfdoc="internal">Internal handoff</button>
        <button class="sf-doc-btn ${S.handoffType==='customer'?'active':''}" data-sfdoc="customer">Customer-facing summary</button>
      </div>
      <p class="sf-doc-note" id="sfDocNote">${S.handoffType==='customer'
        ? 'Customer-facing summary — internal scoping language removed; focuses on shared understanding, demonstrated functionality, requirements, responsibilities, and items to confirm.'
        : 'Internal handoff — includes fit classification, gaps, ownership, assumptions, and unresolved readiness items for Services scoping.'}</p>
      <div class="btn-row" style="margin-top:0;">
        <button class="btn btn-primary btn-sm" data-sfaction="printDoc">🖨 Print / Save as PDF</button>
        <button class="btn btn-primary btn-sm" data-sfaction="turnoverDoc" ${turnoverReady?'':'disabled'}>Generate PS Turnover Word</button>
        <button class="btn btn-ghost btn-sm" data-sfaction="copyDoc">Copy text</button>
        <button class="btn btn-ghost btn-sm" onclick="printRiskLedger()" title="Print a prospect-facing risk ledger showing gaps and mitigations — share before procurement asks">📋 Risk ledger</button>
      </div>
      ${turnoverReady?'':`<p class="sf-doc-note">Complete ${turnover.missing.length} required turnover field${turnover.missing.length===1?'':'s'} before generating the Word document: ${esc(turnover.missing.slice(0,4).join(', '))}${turnover.missing.length>4?'…':''}</p>`}
      <div class="sf-doc-preview" id="sfDocPreview">${S.handoffType==='customer'?customerDoc():internalDoc()}</div>
    </div>`;
  }

  /* ── Branded handoff documents (ported from prototype) ──────────── */
  function docHeadBrand(title, subtitle, badge) {
    return `<div class="hd-head">
      <div><img class="hd-logo" src="${window.location.origin}/${window.CIBrand.logo('logoColor')}" alt="Cloud Inventory" onerror="this.style.display='none'"/>
        <h1 class="hd-title">${esc(title)}</h1>
        <p class="hd-sub">${subtitle}</p></div>
      <div class="hd-badge">${esc(badge)}</div>
    </div>`;
  }

  function internalDoc(){
    const o=S.opportunity, a=S.architecture, p=S.partner, r=computeReadiness();
    const sel=activeProcesses(),gaps=activeGaps();
    const standardCount=sel.filter(x=>x.source==='standard_app').length,nonStandardCount=sel.filter(x=>x.source==='non_standard').length;
    const demoed=sel.filter(x=>x.demoStatus==='Demonstrated');
    return `${docHeadBrand('Solution Fit, Gap & Services Handoff',
        `${esc(o.customer||'Customer not entered')}`,
        `INTERNAL · ${r.score}% READY`)}
    <div class="hd-summary">
      <div><b>${sel.length}</b><span>Applications in scope${standardCount||nonStandardCount?` · ${standardCount} standard${nonStandardCount?` + ${nonStandardCount} non-standard`:''}`:''}</span></div>
      <div><b>${demoed.length}</b><span>Actually demoed</span></div>
      <div><b>${gaps.length}</b><span>Gaps / exceptions</span></div>
      <div><b>${S.interfaces.length}</b><span>Additional interfaces</span></div>
    </div>
    <h2 class="hd-h2">Business context</h2>
    <p><strong>Primary Solution Engineer:</strong> ${esc(primarySeName||'Not Assigned')} &nbsp;·&nbsp; <strong>Stage:</strong> ${esc(o.stage||'—')}</p>
    <p><strong>Products:</strong> ${esc(fmtProducts(o))} &nbsp;·&nbsp; <strong>Users:</strong> ${esc(o.users||'—')} &nbsp;·&nbsp; <strong>Locations:</strong> ${esc(o.locations||'—')} &nbsp;·&nbsp; <strong>Target go-live:</strong> ${esc(o.goLive||'—')}</p>
    <p><strong>Primary Product:</strong> ${esc(productLabel(currentScope().primaryProduct))} &nbsp;·&nbsp; <strong>ERP:</strong> ${esc(currentScope().erp||'—')} &nbsp;·&nbsp; <strong>ERP Version:</strong> ${esc(currentScope().erpVersion||'—')} &nbsp;·&nbsp; <strong>Catalog Version:</strong> ${esc(currentScope().catalogVersion||'Legacy')}</p>
    <p><strong>Business owner:</strong> ${esc(fmtOwner(o,'businessOwner'))} &nbsp;·&nbsp; <strong>Technical owner:</strong> ${esc(fmtOwner(o,'technicalOwner'))}</p>
    <p><strong>Business problem:</strong> ${esc(o.problem||'—')}</p>
    <p><strong>Desired outcome:</strong> ${esc(o.outcome||'—')}</p>
    <h2 class="hd-h2">Architecture &amp; delivery ownership</h2>
    <p><strong>Relationship:</strong> ${esc(a.relationship||'—')} &nbsp;·&nbsp; <strong>ERP/SOR:</strong> ${esc(a.erp||'—')} &nbsp;·&nbsp; <strong>Version:</strong> ${esc(a.version||'—')}</p>
    ${a.relationship!=='Standalone'?`<p><strong>Primary integration:</strong> ${esc(a.integrationMethod||'—')} &nbsp;·&nbsp; <strong>Integration delivery:</strong> ${esc(a.integrationOwner||'—')}</p>`:''}
    ${a.hasCustomizations==='Yes' && a.customizations.length ? `<p><strong>Known SOR customizations:</strong></p><ul class="hd-ul">${a.customizations.map(c=>`<li><strong>${esc(c.module||'Module')}</strong> — ${esc(c.description||'—')} <em>(impact: ${esc(c.impact||'None')})</em></li>`).join('')}</ul>` : (a.hasCustomizations==='No'?'<p><strong>Known SOR customizations:</strong> None reported.</p>':'')}
    <p><strong>Partner involved:</strong> ${esc(p.involved||'—')}${p.involved==='Yes'?` &nbsp;·&nbsp; <strong>Partner:</strong> ${esc(p.company||'—')} &nbsp;·&nbsp; <strong>Contact:</strong> ${esc(p.contactName||'—')} (${esc(p.email||'—')})`:''}</p>
    <h2 class="hd-h2">Demo &amp; fit evidence</h2>
    ${sel.length?`<table class="hd-table"><thead><tr><th>Application / Process</th><th>Type</th><th>Demo status</th><th>Fit</th><th>Customer validation</th><th>Evidence / note</th></tr></thead><tbody>${sel.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${x.source==='standard_app'?'Standard':x.source==='non_standard'?'Non-standard':'Legacy'}</td><td>${esc(x.demoStatus)}</td><td>${esc(x.fit)}</td><td>${esc(x.customerValidation||'Not validated')}</td><td>${esc(x.notes||'—')}</td></tr>`).join('')}</tbody></table>`:'<p>No application scope recorded.</p>'}
    <h2 class="hd-h2">Gap register</h2>
    ${gaps.length?gaps.map(g=>`<div class="hd-gap"><h3 class="hd-h3">${esc(g.id)} · ${esc(g.process||'—')} · ${esc(g.classification)} · ${esc(g.priority)}</h3>
      <p><strong>Required outcome:</strong> ${esc(g.need||'—')}<br>
      <strong>Demo evidence:</strong> ${esc(g.demoEvidence)}${g.gapDescription?`<br><strong>Gap:</strong> ${esc(g.gapDescription)}`:''}${g.acceptance?`<br><strong>Acceptance:</strong> ${esc(g.acceptance)}`:''}${g.dependencies?`<br><strong>Dependencies / assumptions:</strong> ${esc(g.dependencies)}`:''}${g.openQuestions?`<br><strong>Open questions:</strong> ${esc(g.openQuestions)}`:''}</p></div>`).join(''):'<p>No gaps recorded.</p>'}
    <h2 class="hd-h2">Additional integration &amp; delivery drivers</h2>
    ${S.interfaces.length?`<ul class="hd-ul">${S.interfaces.map(i=>`<li><strong>${esc(i.id)}</strong>: ${esc(i.source||'TBD')} → ${esc(i.target||'TBD')} · ${esc(i.object||'Purpose TBD')} · ${esc(i.method)} · Owner: ${esc(i.owner)}</li>`).join('')}</ul>`:'<p>No additional material interfaces recorded.</p>'}
    <p><strong>Offline:</strong> ${esc(S.drivers.offline)} ${S.drivers.offlineDuration?`(${esc(S.drivers.offlineDuration)})`:''} &nbsp;·&nbsp; <strong>Devices:</strong> ${esc(S.drivers.devices||'—')} &nbsp;·&nbsp; <strong>Custom outputs:</strong> ${esc(S.drivers.customOutput)} &nbsp;·&nbsp; <strong>Volume concern:</strong> ${esc(S.drivers.volumeConcern)}</p>
    <h2 class="hd-h2">Readiness</h2>
    ${r.miss.length?`<p><strong>Missing:</strong> ${r.miss.map(x=>esc(x.label)).join(', ')}</p>`:'<p>No automated handoff blockers detected.</p>'}
    <p class="hd-foot">${window.CIBrand.audience('internal')}</p>`;
  }

  function customerOpenItems(){
    const out=[]; const a=S.architecture;
    if(!a.relationship) out.push('Confirm whether Cloud Inventory will be integrated or standalone.');
    if(hasActiveProduct('MEP')&&!currentScope().erpVersion)out.push('Confirm the MEP ERP version.');
    else if(!hasActiveProduct('MEP')&&!a.version) out.push('Confirm ERP / system-of-record version.');
    if(a.relationship && a.relationship!=='Standalone' && !a.integrationMethod) out.push('Confirm the primary integration method.');
    activeGaps().filter(g=>g.priority==='Must Have' && g.openQuestions).forEach(g=>out.push(`${g.id}: ${g.openQuestions}`));
    return out;
  }

  function customerDoc(){
    const o=S.opportunity, a=S.architecture, p=S.partner;
    const sel=activeProcesses();
    const exceptions=activeGaps().filter(g=>g.classification!=='OUT OF SCOPE');
    return `${docHeadBrand('Solution Discovery & Demonstration Summary', `Prepared for ${esc(o.customer||'Customer')}`, 'CUSTOMER REVIEW COPY')}
    <p class="hd-intro">This document summarizes our current understanding of the business objective, solution architecture, functionality demonstrated, and requirements requiring further validation. It is not a Statement of Work or final solution design.</p>
    <h2 class="hd-h2">Business objectives</h2>
    <p><strong>Current challenge:</strong> ${esc(o.problem||'To be confirmed')}</p>
    <p><strong>Desired outcome:</strong> ${esc(o.outcome||'To be confirmed')}</p>
    <h2 class="hd-h2">Proposed solution context</h2>
    <p><strong>Cloud Inventory product(s):</strong> ${esc(fmtProducts(o) || 'To be confirmed')} &nbsp;·&nbsp; <strong>Estimated users:</strong> ${esc(o.users||'To be confirmed')} &nbsp;·&nbsp; <strong>Operating scope:</strong> ${esc(o.locations||'To be confirmed')}</p>
    <p><strong>Primary Product:</strong> ${esc(productLabel(currentScope().primaryProduct))} &nbsp;·&nbsp; <strong>ERP:</strong> ${esc(currentScope().erp||'To be confirmed')} &nbsp;·&nbsp; <strong>ERP Version:</strong> ${esc(currentScope().erpVersion||'To be confirmed')} &nbsp;·&nbsp; <strong>Catalog Version:</strong> ${esc(currentScope().catalogVersion||'Legacy')}</p>
    <p><strong>System relationship:</strong> ${esc(a.relationship||'To be confirmed')} &nbsp;·&nbsp; <strong>System of record:</strong> ${esc(a.erp||'To be confirmed')} &nbsp;·&nbsp; <strong>Version:</strong> ${esc(a.version||'To be confirmed')}</p>
    ${a.relationship!=='Standalone'?`<p><strong>Expected integration approach:</strong> ${esc(a.integrationMethod||'To be confirmed')} &nbsp;·&nbsp; <strong>Expected delivery responsibility:</strong> ${esc(a.integrationOwner||'To be confirmed')}</p>`:''}
    ${p.involved==='Yes'?`<p><strong>Partner participation:</strong> ${esc(p.company||'Partner to be confirmed')} ${p.role?`(${esc(p.role)})`:''}</p>`:''}
    <h2 class="hd-h2">Functionality reviewed</h2>
    ${sel.length?`<table class="hd-table"><thead><tr><th>Application / process</th><th>Type</th><th>Review status</th><th>Current fit</th><th>Customer validation</th></tr></thead><tbody>${sel.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${x.source==='standard_app'?'Standard':x.source==='non_standard'?'Non-standard':'Legacy'}</td><td>${esc(x.demoStatus)}</td><td>${esc(x.fit)}</td><td>${esc(x.customerValidation||'Not validated')}</td></tr>`).join('')}</tbody></table>`:'<p>Application scope is still being confirmed.</p>'}
    <h2 class="hd-h2">Requirements requiring validation or extension</h2>
    ${exceptions.length?exceptions.map(g=>`<div class="hd-gap"><h3 class="hd-h3">${esc(g.process||'Requirement')} — ${esc(g.priority)}</h3><p>${esc(g.need||'Requirement to be confirmed')}${g.acceptance?`<br><strong>Expected outcome:</strong> ${esc(g.acceptance)}`:''}</p></div>`).join(''):'<p>No non-standard requirements have been identified at this stage.</p>'}
    <h2 class="hd-h2">Integration &amp; shared responsibilities</h2>
    ${S.interfaces.length?`<ul class="hd-ul">${S.interfaces.map(i=>`<li>${esc(i.source||'Source TBD')} → ${esc(i.target||'Target TBD')}: ${esc(i.object||'Purpose to be confirmed')} · Expected owner: ${esc(i.owner||'TBD')}</li>`).join('')}</ul>`:'<p>No additional material interfaces have been identified beyond the primary architecture above.</p>'}
    <h2 class="hd-h2">Items to confirm together</h2>
    <ul class="hd-ul">${customerOpenItems().map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No customer confirmation items are currently recorded.</li>'}</ul>
    <p class="hd-foot">${window.CIBrand.audience('customer')} · Discovery summary for customer review</p>`;
  }

  /* Branded print window — self-contained so it renders identically to PDF. */
  async function printHandoffDoc(){
    if(!await flushSolutionFitSave())return;
    if(!customerId||!window.deServerDownload){showToast?.('Solution Fit PDF service is unavailable.');return;}
    const kind=S.handoffType==='customer'?'summary':'handoff';
    return window.deServerDownload(`/api/handoffs/${encodeURIComponent(customerId)}/export-pdf?kind=${kind}`,`Cloud-Inventory-${kind==='summary'?'Solution-Discovery-Summary':'Internal-Solution-Handoff'}.pdf`,kind==='summary'?'Solution Discovery Summary':'Internal Solution Handoff');
    const isCustomer = S.handoffType==='customer';
    const body = isCustomer ? customerDoc() : internalDoc();
    const title = isCustomer ? 'Cloud Inventory — Discovery Summary' : 'Cloud Inventory — Solution Handoff';
    const w = window.open('', '_blank');
    if (!w) { if(typeof showToast==='function') showToast('Pop-up blocked — allow pop-ups to print.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      ${window.CIBrand.documentCss(isCustomer?'customer':'internal')}
      *{box-sizing:border-box}body{margin:0;font-family:var(--doc-font);color:var(--doc-body);line-height:1.5;padding:44px 52px;}
      .hd-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--doc-accent);padding-bottom:16px;margin-bottom:22px;}
      .hd-brand{font-weight:700;letter-spacing:.5px;color:var(--doc-heading);font-size:15px;}
      .hd-logo{width:118px;height:auto;display:block;margin-bottom:7px;}
      .hd-reg{font-size:9px;vertical-align:super;}
      .hd-title{font-size:24px;margin:6px 0 2px;color:var(--doc-heading);}
      .hd-sub{margin:0;color:var(--doc-muted);font-size:13px;}
      .hd-badge{background:var(--doc-heading);color:var(--doc-bg);font-size:10px;font-weight:700;letter-spacing:.5px;padding:6px 12px;border-radius:20px;white-space:nowrap;}
      .hd-summary{display:flex;gap:26px;background:var(--doc-canvas);border:1px solid var(--doc-border);border-radius:12px;padding:16px 20px;margin-bottom:22px;}
      .hd-summary div{text-align:center;}
      .hd-summary b{display:block;font-size:26px;color:var(--doc-accent);}
      .hd-summary span{font-size:10px;color:var(--doc-muted);text-transform:uppercase;letter-spacing:.5px;}
      .hd-intro{background:var(--doc-info);border-left:3px solid var(--doc-accent);padding:12px 16px;border-radius:6px;font-size:13px;color:var(--doc-body);margin-bottom:20px;}
      .hd-h2{font-size:14px;color:var(--doc-heading);border-bottom:1px solid var(--doc-border);padding-bottom:5px;margin:22px 0 10px;}
      .hd-h3{font-size:12.5px;color:var(--doc-accent-accessible);margin:14px 0 4px;}
      p{font-size:12.5px;margin:6px 0;}
      .hd-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}
      .hd-table th{background:var(--doc-canvas);text-align:left;padding:7px 9px;border:1px solid var(--doc-border);color:var(--doc-heading);}
      .hd-table td{padding:7px 9px;border:1px solid var(--doc-border);vertical-align:top;}
      .hd-ul{font-size:12.5px;padding-left:18px;}
      .hd-gap{margin-bottom:10px;page-break-inside:avoid;}
      .hd-foot{margin-top:28px;font-size:9px;color:var(--doc-muted);border-top:1px solid var(--doc-border);padding-top:10px;}
      @media print{body{padding:0;}@page{margin:16mm;}}
    </style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print();},250);}<\/script></body></html>`);
    w.document.close();
  }

  function copyDocText(){
    const el=$('sfDocPreview');
    if(!el) return;
    const txt = el.innerText;
    if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(()=>{ if(typeof showToast==='function') showToast('Document text copied.'); }).catch(()=>{ if(typeof showToast==='function') showToast('Copy not available in this browser.'); }); }
  }

  async function downloadTurnoverDoc(){
    if(!await flushSolutionFitSave())return;
    const stats=SF_MODEL.turnoverStats(S);
    if(stats.missing.length){window.showToast?.(`Complete the required turnover fields first: ${stats.missing.join(', ')}.`);return;}
    if(!customerId||!window.deServerDownload){window.showToast?.('Professional Services turnover Word service is unavailable.');return;}
    return window.deServerDownload(`/api/handoffs/${encodeURIComponent(customerId)}/export-docx?kind=turnover`,'Cloud-Inventory-PS-Turnover.docx','Professional Services Turnover');
  }

  function setDocType(type){
    S.handoffType = type;
    scheduleSave();
    const pane=document.querySelector('[data-sfpane="handoff"]');
    if(pane){ const r=computeReadiness(); pane.innerHTML=renderReadinessTab(r); wireBindings(); if(!canWrite) disableInputs(); }
  }

  async function updatePrimarySe(nextId){
    const previousId=primarySeId,previousName=primarySeName;
    const response=await apiFetch('/api/handoffs/'+encodeURIComponent(customerId)+'/assignment',{method:'PUT',body:JSON.stringify({primarySeId:nextId||null,additionalSeIds})});
    if(!response||!response.ok){window.showToast?.((await safeError(response))||'Primary Solution Engineer could not be assigned.');primarySeId=previousId;primarySeName=previousName;renderApp();return false;}
    const result=await response.json();
    primarySeId=result.primary_se_id||null;primarySeName=result.primarySeName||'';additionalSeIds=result.additional_se_ids||additionalSeIds;
    window.showToast?.(primarySeId?`Primary Solution Engineer assigned to ${primarySeName}.`:'Primary Solution Engineer is now Not Assigned.');
    renderApp();return true;
  }


  /* ── Wiring ─────────────────────────────────────────────────────── */
  function wireTabs(){
    document.querySelectorAll('#sfApp [data-sftab]').forEach(t=>t.onclick=()=>{
      activeTab=t.dataset.sftab;
      document.querySelectorAll('#sfApp [data-sftab]').forEach(x=>{
        x.classList.toggle('active',x===t);
        x.setAttribute('aria-selected', x===t ? 'true' : 'false');
      });
      showActivePane();
      if(activeTab==='handoff'){
        const r=computeReadiness();
        const pane=document.querySelector('[data-sfpane="handoff"]');
        if(pane){ pane.innerHTML=renderReadinessTab(r); wireBindings(); if(!canWrite) disableInputs(); }
      }
    });
  }
  function showActivePane(){ document.querySelectorAll('.sf-pane').forEach(p=>p.style.display = p.dataset.sfpane===activeTab?'block':'none'); }
  function syncSolutionScope(){
    const products=selectedProducts();
    S.solutionScope.primaryProduct=products[0]||'';
    S.solutionScope.additionalProducts=products.slice(1);
    const mepActive=activeProcesses().filter(process=>process.product==='MEP');
    S.solutionScope.selectedAppIds=mepActive.map(process=>process.id);
    S.solutionScope.selectedApps=mepActive.map(process=>process.name);
    SF_MODEL.synchronizeAuthority(S);
  }
  function changeMepErp(erp){
    const prior=currentScope().erp;
    if(prior===erp)return;
    const priorRows=S.processes.filter(process=>process.product==='MEP'&&process.erp===prior),hasPriorEvidence=prior&&((currentScope().erpVersion)||priorRows.some(process=>process.selected||applicationAssessmentComplete(process)||String(process.notes||'').trim()));
    if(hasPriorEvidence&&!confirm(`Change MEP ERP from ${prior} to ${erp}? The active ERP version will reset. Prior ${prior} application assessments, validation, notes, and gaps will remain preserved as history.`))return;
    SF_MODEL.changeMepErpFamily(S,erp);
    S.solutionScope.catalogId=mepCatalog.catalogId;S.solutionScope.catalogVersion=mepCatalog.catalogVersion;S.solutionScope.catalogSource=mepCatalog.source;
    if(S.solutionScope.packageMode==='standard')applyMepPackageBaseline();
    syncSolutionScope();rerenderScope();scheduleSave();
  }
  function changeMepErpVersion(value){S.solutionScope.erpVersion=value;S.architecture.version=value;syncSolutionScope();scheduleSave();}
  function applyMepPackageBaseline(){
    const erp=currentScope().erp;if(!erp)return;
    const packageNames=mepCatalog?.standardPackages?.[erp]||[];
    SF_MODEL.applyStandardPackage(S,{erp,names:packageNames,catalogVersion:mepCatalog?.catalogVersion||''});
  }
  function setMepPackageMode(mode){
    if(!currentScope().erp){window.showToast?.('Select the ERP family first.');return;}
    if(mode==='standard')applyMepPackageBaseline();
    else SF_MODEL.startCustomScope(S,{erp:currentScope().erp});
    syncSolutionScope();rerenderScope();scheduleSave();
  }
  function toggleApplication(el){
    const descriptor={product:el.dataset.product,name:el.dataset.name,group:el.dataset.group||'',erp:el.dataset.erp||'',source:el.dataset.source||'product_app',catalogVersion:el.dataset.product==='MEP'?(mepCatalog?.catalogVersion||''):''};
    SF_MODEL.setSelected(S,descriptor,el.checked);syncSolutionScope();rerenderScope();scheduleSave();
  }
  function goNextSection(){
    const order = WORKFLOW.map(row=>row[0]);
    const next = order[Math.min(order.indexOf(activeTab) + 1, order.length - 1)];
    const tab = document.querySelector(`[data-sftab="${next}"]`);
    if (tab) tab.click();
  }

  function wireBindings(){
    /* Section accordions (context tab) */
    document.querySelectorAll('[data-sftoggle]').forEach(function(el) {
      el.addEventListener('click', function() {
        var id = el.dataset.sftoggle;
        var sec = document.getElementById('sfsec-' + id);
        if (!sec) return;
        var isOpen = _openSections.has(id);
        if (isOpen) { _openSections.delete(id); } else { _openSections.add(id); }
        /* Re-render context pane to reflect open state */
        var pane = document.querySelector('[data-sfpane="context"]');
        if (pane) { pane.innerHTML = renderContext(); wireBindings(); if (!canWrite) disableInputs(); }
      });
    });
    /* data-sfbind text/select/textarea → state path */
    document.querySelectorAll('[data-sfbind]').forEach(el=>{
      el.addEventListener('input', ()=>{ setVal(S, el.dataset.sfbind, el.value); onEdit(el.dataset.sfbind); });
    });
    document.querySelectorAll('[data-sfassignment="primary"]').forEach(el=>el.addEventListener('change',()=>updatePrimarySe(el.value)));
    document.querySelectorAll('[data-sfinventory]').forEach(el=>{el.onchange=()=>{
      const name=SF_MODEL.INVENTORY_ITEMS[Number(el.dataset.sfinventory)];
      if(!name)return;
      S.inventoryConfiguration[name].answer=el.value;
      refreshInventoryPresentation(el);
      if(name===LPN_INVENTORY_LABEL)rerenderLpnConfiguration();
      scheduleSave();
    };});
    document.querySelectorAll('[data-sfinventory-note]').forEach(el=>{el.oninput=()=>{
      const name=SF_MODEL.INVENTORY_ITEMS[Number(el.dataset.sfinventoryNote)];
      if(!name)return;
      S.inventoryConfiguration[name].note=el.value;
      const summary=el.closest('.sf-config-note')?.querySelector('summary span');
      if(summary)summary.textContent=el.value.trim()?'Edit note':'+ Add note';
      scheduleSave();
    };});
    wireLpnBindings(document);
    document.querySelectorAll('[data-sfprinting]').forEach(el=>el.addEventListener('input',()=>{S.printing[el.dataset.sfprinting]=el.value;scheduleSave();}));
    document.querySelectorAll('[data-sfturnover]').forEach(el=>el.addEventListener('input',()=>{S.turnover[el.dataset.sfturnover]=el.value;scheduleSave();}));
    document.querySelectorAll('[data-sfownerselect]').forEach(el=>el.addEventListener('change',()=>{
      const person = knownStakeholders.find(x=>String(x.id)===String(el.value));
      if (!person) return;
      const k = el.dataset.sfownerselect;
      S.opportunity[k+'Name'] = person.name || '';
      S.opportunity[k+'Title'] = person.title || '';
      knownSources['opportunity.'+k+'Name'] = 'Stakeholders';
      knownSources['opportunity.'+k+'Title'] = 'Stakeholders';
      const pane=document.querySelector('[data-sfpane="context"]');
      if(pane){ pane.innerHTML=renderContext(); wireBindings(); }
      scheduleSave();
    }));
    /* process cards */
    document.querySelectorAll('[data-sfpsel]').forEach(el=>el.addEventListener('change',e=>{ const i=+el.dataset.sfpsel; S.processes[i].selected=e.target.checked; if(e.target.checked)S.processes[i].historical=false;syncSolutionScope();rerenderScope(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpdemo]').forEach(el=>el.addEventListener('change',e=>{ S.processes[+el.dataset.sfpdemo].demoStatus=e.target.value; rerenderScope(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpfit]').forEach(el=>el.addEventListener('change',e=>{ S.processes[+el.dataset.sfpfit].fit=e.target.value; rerenderScope(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpvalidation]').forEach(el=>el.addEventListener('change',e=>{ S.processes[+el.dataset.sfpvalidation].customerValidation=e.target.value; rerenderScope(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpnote]').forEach(el=>el.addEventListener('input',e=>{ S.processes[+el.dataset.sfpnote].notes=e.target.value; scheduleSave(); }));
    document.querySelectorAll('[data-sfproducttab]').forEach(el=>el.addEventListener('click',()=>{activeScopeProduct=el.dataset.sfproducttab;scopeFilter='all';rerenderScope();}));
    document.querySelectorAll('[data-sfscopefilter]').forEach(el=>el.addEventListener('click',()=>{scopeFilter=el.dataset.sfscopefilter;rerenderScope();}));
    const scopeSearchEl=$('sfScopeSearch');if(scopeSearchEl)scopeSearchEl.addEventListener('input',()=>{scopeSearch=scopeSearchEl.value;rerenderScope();});
    document.querySelectorAll('[data-sferp]').forEach(el=>el.addEventListener('click',()=>changeMepErp(el.dataset.sferp)));
    document.querySelectorAll('[data-sferpversion]').forEach(el=>el.addEventListener('input',()=>changeMepErpVersion(el.value)));
    document.querySelectorAll('[data-sfpackagemode]').forEach(el=>el.addEventListener('click',()=>setMepPackageMode(el.dataset.sfpackagemode)));
    document.querySelectorAll('[data-sfappselect]').forEach(el=>el.addEventListener('change',()=>toggleApplication(el)));
    /* gaps */
    document.querySelectorAll('[data-sfgaptoggle]').forEach(el=>el.onclick=()=>{ openGapId = openGapId===el.dataset.sfgaptoggle?null:el.dataset.sfgaptoggle; rerenderGaps(); });
    document.querySelectorAll('[data-sfgapdel]').forEach(el=>el.onclick=()=>{ if(confirm('Delete this gap?')){ const index=S.gaps.findIndex(gap=>gap.id===el.dataset.sfgapdel);if(index>=0)S.gaps.splice(index,1); rerenderGaps(); scheduleSave(); } });
    document.querySelectorAll('[data-sfgfield]').forEach(el=>el.addEventListener('input',e=>{ const g=S.gaps.find(x=>x.id===el.dataset.sfgid); if(g){
      if(el.dataset.sfgfield==='processId'){
        const process=S.processes.find(item=>item.id===e.target.value);
        if(process)SF_MODEL.applyGapProcessMetadata(g,process);else{g.processId='';g.process='';g.product='';g.erp='';g.group='';g.mappingStatus='unassigned';}
      }else g[el.dataset.sfgfield]=e.target.value;
      scheduleSave(); if(['processId','priority','goLive','classification'].includes(el.dataset.sfgfield)) rerenderGaps();
    } }));
    /* interfaces */
    document.querySelectorAll('[data-sfifield]').forEach(el=>el.addEventListener('input',e=>{ const row=el.closest('[data-sfint]'); const it=S.interfaces[+row.dataset.sfint]; if(it){ it[el.dataset.sfifield]=e.target.value; scheduleSave(); } }));
    document.querySelectorAll('[data-sfintdel]').forEach(el=>el.onclick=()=>{ S.interfaces.splice(+el.dataset.sfintdel,1); rerenderIntegration(); scheduleSave(); });
    /* actions */
    if (!sfActionsDelegated) {
      sfActionsDelegated = true;
      document.addEventListener('click', e=>{
        const actionEl = e.target.closest('#sfApp [data-sfaction]');
        if (actionEl) handleAction(actionEl.dataset.sfaction,actionEl);
      });
    }
    /* handoff doc type toggle (allowed read-only too) */
    document.querySelectorAll('[data-sfdoc]').forEach(el=>el.onclick=()=>setDocType(el.dataset.sfdoc));
    const templateSelect = $('sfTemplateSelect');
    if (templateSelect) templateSelect.onchange = ()=>{ activeTemplate=templateSelect.value; renderApp(); };
    const missingToggle = $('sfMissingToggle');
    if (missingToggle) missingToggle.onclick = ()=>{ showMissingOnly=!showMissingOnly; renderApp(); };
    const nextSection = $('sfNextSection');
    if (nextSection) nextSection.onclick = goNextSection;
    /* conditional UI on context selects */
    const reRenderContext = () => { const pane=document.querySelector('[data-sfpane="context"]'); if(pane){pane.innerHTML=renderContext(); wireBindings();} };
    const rel=document.querySelector('[data-sfbind="architecture.relationship"]');
    if(rel) rel.addEventListener('change',reRenderContext);
    const inv=document.querySelector('[data-sfbind="partner.involved"]');
    if(inv) inv.addEventListener('change',reRenderContext);
    const custToggle=document.querySelector('[data-sfbind="architecture.hasCustomizations"]');
    if(custToggle) custToggle.addEventListener('change',(e)=>{ S.architecture.hasCustomizations=e.target.value; scheduleSave(); reRenderContext(); });
    /* product checkboxes */
    document.querySelectorAll('[data-sfprod]').forEach(el=>el.addEventListener('change',(e)=>{
      const pr=el.dataset.sfprod; const arr=S.opportunity.products;
      if(e.target.checked){ if(!arr.includes(pr)) arr.push(pr); } else { const i=arr.indexOf(pr); if(i>-1) arr.splice(i,1); if(pr==='Other') S.opportunity.productsOther=''; }
      scheduleSave();
      if(pr==='Other') reRenderContext();   // toggle the Other text field
    }));
    /* customization rows */
    document.querySelectorAll('[data-sfcustfield]').forEach(el=>el.addEventListener('input',(e)=>{
      const i=+el.dataset.sfcustidx; const row=S.architecture.customizations[i];
      if(row){ row[el.dataset.sfcustfield]=e.target.value; scheduleSave(); }
    }));
    document.querySelectorAll('[data-sfcustdel]').forEach(el=>el.onclick=()=>{ S.architecture.customizations.splice(+el.dataset.sfcustdel,1); reRenderContext(); scheduleSave(); });
    if(!canWrite) disableInputs();
    if(typeof SFDictation!=='undefined' && SFDictation.supported && canWrite) SFDictation.enhanceAll(document.getElementById('sfApp'));
    if (!sfKeyboardBound) {
      sfKeyboardBound = true;
      document.addEventListener('keydown', e=>{
        if(e.key==='Escape'&&document.getElementById('sfScopeWizard')){e.preventDefault();closeScopeWizard();return;}
        const sfTab = document.getElementById('tab-solfit');
        if (!sfTab || sfTab.style.display==='none') return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s') { e.preventDefault(); clearTimeout(saveTimer); saveHandoff(); }
        if ((e.ctrlKey || e.metaKey) && e.key==='Enter') { e.preventDefault(); goNextSection(); }
      });
    }
  }
  function onEdit(){scheduleSave();}

  function refreshInventoryPresentation(answerSelect){
    const card=answerSelect?.closest('.sf-config-item');
    if(card)card.dataset.answerState=inventoryAnswerToken(answerSelect.value);
    const stats=SF_MODEL.inventoryStats(S);
    document.querySelectorAll('[data-sfinventory-count]').forEach(el=>{
      el.textContent=el.dataset.sfinventoryCount==='heading'
        ?(stats.applicable?`${stats.answered} of ${stats.total} answered`:'Not applicable')
        :(stats.applicable?`${stats.answered}/${stats.total}`:'N/A');
    });
    refreshSolutionFitProgress();
  }
  function wireLpnBindings(root){
    root.querySelectorAll('[data-sflpn]').forEach(el=>{el.onchange=()=>{
      S.lpnConfiguration[el.dataset.sflpn]=el.value;
      scheduleSave();
    };});
  }
  function rerenderLpnConfiguration(){
    const region=document.querySelector('[data-sflpn-region]');
    if(!region)return;
    region.innerHTML=renderLpnConfiguration();
    wireLpnBindings(region);
    if(!canWrite)disableInputs();
  }

  function rerenderScope(){ const pane=document.querySelector('[data-sfpane="scope"]'); if(pane){pane.innerHTML=renderProductScope(); wireBindings(); if(!canWrite)disableInputs();} refreshSolutionFitProgress(); }
  function rerenderConfiguration(){ const pane=document.querySelector('[data-sfpane="configuration"]'); if(pane){pane.innerHTML=renderInventoryConfiguration(); wireBindings(); if(!canWrite)disableInputs();} refreshSolutionFitProgress(); }
  function rerenderGaps(){ const pane=document.querySelector('[data-sfpane="gaps"]'); if(pane){pane.innerHTML=renderGaps(); wireBindings(); if(!canWrite)disableInputs();} refreshSolutionFitProgress(); }
  function rerenderIntegration(){ const pane=document.querySelector('[data-sfpane="integration"]'); if(pane){pane.innerHTML=renderIntegration(); wireBindings(); if(!canWrite)disableInputs();} refreshSolutionFitProgress(); }

  async function handleAction(a,sourceEl){
    /* Print and copy are allowed for everyone with read access (AEs included). */
    if(a==='printDoc'){ await printHandoffDoc(); return; }
    if(a==='turnoverDoc'){ await downloadTurnoverDoc(); return; }
    if(a==='copyDoc'){ copyDocText(); return; }
    if(a==='switchCustomer'){await requestCustomerSwitch();return;}
    /* All other actions mutate state → require write access. */
    if(!canWrite){ if(typeof showToast==='function') showToast('Read-only — a Solution Engineer completes the handoff.'); return; }
    if(a==='editScope'){await openScopeWizard('edit');return;}
    if(a==='upgradeLegacy'){
      activeTab='scope';activeScopeProduct=hasActiveProduct('MEP')?'MEP':selectedProducts()[0]||'MEP';
      const governed=activeProcesses();
      if(!governed.length){renderApp();window.showToast?.('Configure and assess governed applications before completing the legacy upgrade.');return;}
      if(!confirm('Complete the legacy upgrade? Legacy rows will become inactive historical records. Governed application assessments and all legacy history will remain saved.')){renderApp();return;}
      const ids=[];S.processes.forEach(process=>{if(process.source==='legacy_process'&&process.historical!==true){process.selected=false;process.historical=true;process.inactiveReason='Governed application scope adopted';ids.push(process.id);}});
      S.legacy={status:'historical',upgradedAt:new Date().toISOString(),processIds:ids};S.scopeHistory=S.scopeHistory||[];S.scopeHistory.push({changedAt:S.legacy.upgradedAt,reason:'Legacy unclassified rows moved to inactive history after governed application scope was adopted.',processIds:ids});
      scheduleSave();renderApp();return;
    }
    if(a==='gapFromProcess'){
      const p=S.processes[Number(sourceEl?.dataset.processIndex)];if(!p)return;
      const existing=S.gaps.find(g=>g.processId===p.id);if(existing){openGapId=existing.id;activeTab='gaps';renderApp();return;}
      const gap=newGap({demoEvidence:p.demoStatus==='Demonstrated'?'Yes':p.demoStatus==='Discussed only'?'Partially':'No',need:p.reason||'',standardBehavior:p.notes||'',gapDescription:p.fit==='Gap'?'Customer requirement is not met by the demonstrated standard application.':'Customer requirement is only partially met by the demonstrated standard application.'});
      SF_MODEL.applyGapProcessMetadata(gap,p);S.gaps.push(gap);
      openGapId=S.gaps.at(-1).id;activeTab='gaps';scheduleSave();renderApp();return;
    }
    if(a==='addProcess'){ const n=prompt('Customer-specific application or process name:'); if(n&&n.trim()){ SF_MODEL.createCustomProcess(S,{name:n.trim(),product:activeScopeProduct,erp:activeScopeProduct==='MEP'?currentScope().erp:'',group:'Customer-specific',selected:true}); syncSolutionScope();rerenderScope(); scheduleSave(); } }
    else if(a==='addGap'){ S.gaps.push(newGap({})); openGapId=S.gaps.at(-1).id; rerenderGaps(); scheduleSave(); }
    else if(a==='addInterface'){ S.interfaces.push({id:nextIntId(),source:'',target:'',object:'',method:'TBD',direction:'Bidirectional',trigger:'Near real time',volume:'',owner:'TBD'}); rerenderIntegration(); scheduleSave(); }
    else if(a==='addCustomization'){ S.architecture.customizations.push(blankCustomization()); const pane=document.querySelector('[data-sfpane="context"]'); if(pane){pane.innerHTML=renderContext(); wireBindings();} scheduleSave(); }
    else if(a==='refreshKnown'){
      const changed = await applyKnownData({mutate:true,save:false});
      if (changed) { scheduleSave(); renderApp(); if(typeof showToast==='function') showToast(`${changed} known value${changed===1?'':'s'} added.`); }
      else if(typeof showToast==='function') showToast('Known customer data is already up to date.');
    }
    else if(a==='applyDefaults'){
      const changed = applyTemplateDefaults();
      if (changed) { scheduleSave(); renderApp(); if(typeof showToast==='function') showToast(`${changed} recommended default${changed===1?'':'s'} applied — review before handoff.`); }
    }
    else if(a==='printDoc'){ printHandoffDoc(); }
    else if(a==='copyDoc'){ copyDocText(); }
  }
  function disableInputs(){
    document.querySelectorAll('#sfApp input, #sfApp select, #sfApp textarea').forEach(el=>{ el.setAttribute('disabled','disabled'); });
    /* Hide only the mutating controls. Print, copy, and the doc-type toggle
       stay usable so an AE can read + print the handoff. */
    document.querySelectorAll('#sfApp [data-sfgapdel], #sfApp [data-sfintdel]').forEach(el=>{ el.style.display='none'; });
    document.querySelectorAll('#sfApp [data-sfaction]').forEach(el=>{
      const a=el.dataset.sfaction;
      if(a!=='printDoc' && a!=='copyDoc' && a!=='turnoverDoc' && a!=='switchCustomer') el.style.display='none';
    });
  }

  /* ── Prospect-facing risk ledger ──────────────────────────────────
     An honest "here's what you need to know before you commit" document.
     Shows gaps with their mitigations — volunteering limitations before
     procurement finds them builds credibility. */
  async function printRiskLedger() {
    if(!await flushSolutionFitSave())return;
    if(!customerId||!window.deServerDownload){showToast?.('Solution Fit PDF service is unavailable.');return;}
    return window.deServerDownload(`/api/handoffs/${encodeURIComponent(customerId)}/export-pdf?kind=risk`,'Cloud-Inventory-Solution-Fit-Risk-Ledger.pdf','Solution Fit Risk Ledger');
    const company = S.company || 'Prospect';
    const gaps = S.gaps || [];
    const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

    const priOrder = {'Must Have':0,'Should Have':1,'Could Have':2};
    const sorted = gaps.slice().sort((a,b) => (priOrder[a.priority]||99) - (priOrder[b.priority]||99));

    const theme = window.CIBrand.documentTheme('customer');
    const priColors = {'Must Have':theme.warning,'Should Have':window.CIBrand.charts.categorical[3],'Could Have':theme.success};
    const gapRows = sorted.map(g => {
      const pri = g.priority || 'Could Have';
      const col = priColors[pri] || theme.muted;
      return `<div style="border:1px solid var(--doc-border);border-left:4px solid ${col};border-radius:8px;padding:14px 18px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
          <div style="font-size:14px;font-weight:700;color:var(--doc-heading);">${esc(g.feature||g.id||'Gap')}</div>
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:${col}20;color:${col};white-space:nowrap;">${pri}</span>
        </div>
        ${g.notes ? `<div style="font-size:12.5px;color:var(--doc-body);margin-bottom:6px;">${esc(g.notes)}</div>` : ''}
        ${g.mitigation ? `<div style="font-size:12px;color:var(--doc-success);font-weight:600;">✓ Mitigation: ${esc(g.mitigation)}</div>` : '<div style="font-size:12px;color:var(--doc-warning);">⚠ Mitigation under discussion</div>'}
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Risk Ledger — ${esc(company)}</title>
    <style>${window.CIBrand.documentCss('customer')}*{box-sizing:border-box}body{font-family:var(--doc-font);color:var(--doc-body);padding:44px 52px;max-width:760px;margin:0 auto;line-height:1.5;}
    h1{font-size:24px;margin:0 0 4px;}h2{font-size:16px;color:var(--doc-accent-accessible);margin:24px 0 10px;border-bottom:1px solid var(--doc-border);padding-bottom:6px;}
    @media print{body{padding:20px 30px;}}</style>
    </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--doc-accent);padding-bottom:14px;margin-bottom:22px;">
      <div><img src="${window.location.origin}/${window.CIBrand.logo('logoColor')}" alt="Cloud Inventory" onerror="this.style.display='none'" style="width:118px;height:auto;display:block;margin-bottom:7px;">
        <h1>What you should know before you commit</h1>
        <div style="color:var(--doc-muted);font-size:13px;">${esc(company)} · ${today}</div>
      </div>
    </div>
    <p style="font-size:13.5px;color:var(--doc-body);background:var(--doc-info);border:1px solid var(--doc-accent);border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      This document lists every gap or limitation identified during the evaluation of Cloud Inventory for ${esc(company)}, along with the proposed mitigation for each. We share this proactively — if your team or procurement finds these, we want you to hear them from us first.
    </p>
    <h2>${sorted.length} item${sorted.length!==1?'s':''} identified</h2>
    ${sorted.length ? gapRows : '<p style="color:var(--doc-muted);font-style:italic;">No gaps were identified during the evaluation. All selected processes demonstrated full fit.</p>'}
    <div style="margin-top:32px;padding-top:14px;border-top:1px solid var(--doc-border);font-size:11px;color:var(--doc-muted);font-style:italic;">
      This document reflects the evaluation status as of ${today}. Items marked "Must Have" require resolution before contract. Contact your Cloud Inventory representative with questions. · cloudinventory.com · ${window.CIBrand.audience('customer')}
    </div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { if(typeof showToast==='function') showToast('Pop-up blocked — allow pop-ups to print.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.print(); } catch(e){} }, 400);
    if (typeof trackEvent === 'function') trackEvent('risk_ledger_printed', { company, gapCount: gaps.length });
  }
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(document.getElementById('sfScopeWizard')){e.preventDefault();closeScopeWizard();return;}
    document.getElementById('sfCustomerSwitchDialog')?.remove();
  });
  window.addEventListener('popstate',()=>{
    const fromUrl=SF_SCOPE.customerIdFromUrl(window.location.href);
    window._sfSelectedCustomerId=fromUrl||null;
    customerSwitchCoordinator?.invalidate();workspaceLoadGeneration++;
    if(document.getElementById('tab-solfit')?.classList.contains('active'))initSolutionFit();
  });
  document.addEventListener('DOMContentLoaded',async()=>{
    const fromUrl=SF_SCOPE.customerIdFromUrl(window.location.href);
    if(!fromUrl)return;
    window._sfSelectedCustomerId=fromUrl;
    if(window._authReady)await window._authReady;
    window.switchTab?.('solfit');
  });
  window.printRiskLedger = printRiskLedger;
  window.flushSolutionFitSave = flushSolutionFitSave;

  /* Expose entry point for the tab switch. */
  window.initSolutionFit = initSolutionFit;
})();
