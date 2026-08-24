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

  const STANDARD_PROCESSES = ['Receiving','Putaway','Inventory Movement','Picking','Packing','Shipping','Cycle Counting','Replenishment','Production Issue / Return','Field Inventory','Returns','Printing / Labeling'];
  const CLASSIFICATIONS = ['UNKNOWN','CONFIGURATION','PROCESS CHANGE','EXTENSION','INTEGRATION','REPORT / PRINT','DATA','NON-FUNCTIONAL','ROADMAP','OUT OF SCOPE'];

  const PRODUCTS = ['MEP','CIP','CPP','Platform'];
  const blankProcess = (name, i) => ({ id:`P-${String(i+1).padStart(3,'0')}`, name, selected:false, demoStatus:'Not reviewed', fit:'Not reviewed', notes:'' });
  const blankState = () => ({
    opportunity:{customer:'',solutionEngineer:'',solutionEngineerId:'',stage:'Discovery',products:[],productsOther:'',goLive:'',users:'',problem:'',outcome:'',
      businessOwnerName:'',businessOwnerTitle:'',businessOwnerEmail:'',businessOwnerPhone:'',
      technicalOwnerName:'',technicalOwnerTitle:'',technicalOwnerEmail:'',technicalOwnerPhone:''},
    architecture:{relationship:'',erp:'',version:'',otherSystems:'',integrationMethod:'',integrationOwner:'',integrationNotes:'',
      hasCustomizations:'',customizations:[]},
    partner:{involved:'',company:'',role:'',contactName:'',email:'',phone:'',title:''},
    processes:STANDARD_PROCESSES.map(blankProcess), gaps:[], interfaces:[],
    drivers:{offline:'Unknown',offlineDuration:'',devices:'',peripherals:'',customOutput:'Unknown',volumeConcern:'Unknown',volume:'',otherConstraint:''},
    handoffType:'internal'
  });
  const blankCustomization = () => ({ module:'', description:'', impact:'None' });

  /* Module state */
  let S = blankState();
  let customerId = null, customerName = '', canWrite = false, exists = false;
  let openGapId = null, activeTab = 'context', saveTimer = null, dirty = false;

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
    if (typeof HandoffReadiness !== 'undefined' && HandoffReadiness.readiness) return HandoffReadiness.readiness(S);
    return { miss:[], done:[], score:0, status:'not_ready' };
  }
  function materialGap(g) {
    if (typeof HandoffReadiness !== 'undefined' && HandoffReadiness.materialGap) return HandoffReadiness.materialGap(g);
    return g.priority==='Must Have' || g.goLive==='Yes';
  }

  /* ── Server load / save ─────────────────────────────────────────── */
  async function loadHandoff(custId) {
    customerId = custId;
    try {
      const resp = await apiFetch('/api/handoffs/' + encodeURIComponent(custId));
      if (!resp || !resp.ok) { renderGate('Could not load the handoff for this customer.'); return false; }
      const data = await resp.json();
      customerName = data.customerName || '';
      exists = !!data.exists;
      S = mergeState(blankState(), data.data || {});
      migrateState(S);
      /* Seed customer name into opportunity if empty. */
      if (!S.opportunity.customer && customerName) S.opportunity.customer = customerName;
      /* Default Solution Engineer to the logged-in user (SE), or the admin. */
      const u = currentUser();
      if (!S.opportunity.solutionEngineer && (u.role === 'se' || u.role === 'admin')) {
        S.opportunity.solutionEngineer = u.username || u.name || '';
        S.opportunity.solutionEngineerId = u.id || '';
      }
      await loadSEList();
      /* Permission: can this user write? (server is authoritative; we mirror for UI). */
      canWrite = await resolveCanWrite();
      return true;
    } catch (e) { console.error('loadHandoff error:', e.message); renderGate('Could not load the handoff — check your connection.'); return false; }
  }

  /* Tolerate handoffs saved under the previous field shapes (no data loss). */
  function migrateState(s) {
    const o = s.opportunity || (s.opportunity = {});
    if (typeof o.products === 'string') { o.products = o.products ? [o.products] : []; }
    if (!Array.isArray(o.products)) o.products = [];
    if (o.productsOther === undefined) o.productsOther = '';
    /* old single owner fields → name */
    if (o.businessOwner && !o.businessOwnerName) o.businessOwnerName = o.businessOwner;
    if (o.technicalOwner && !o.technicalOwnerName) o.technicalOwnerName = o.technicalOwner;
    ['businessOwnerName','businessOwnerTitle','businessOwnerEmail','businessOwnerPhone',
     'technicalOwnerName','technicalOwnerTitle','technicalOwnerEmail','technicalOwnerPhone',
     'solutionEngineerId','productsOther'].forEach(k=>{ if(o[k]===undefined) o[k]=''; });
    const a = s.architecture || (s.architecture = {});
    if (a.hasCustomizations === undefined) a.hasCustomizations = '';
    if (!Array.isArray(a.customizations)) a.customizations = [];
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
  async function resolveCanWrite() {
    /* SEs and admins can write; AEs are read + print. Read the role from the
       app's auth cache (exposed as window.ciAuth.getUser). */
    const u = currentUser();
    return !!u && (u.role === 'se' || u.role === 'admin');
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
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveHandoff, 800);
  }
  async function saveHandoff() {
    if (!canWrite || !customerId) return;
    try {
      const resp = await apiFetch('/api/handoffs/' + encodeURIComponent(customerId), {
        method: 'PUT', body: JSON.stringify({ data: S })
      });
      if (!resp || !resp.ok) { setSaveState('error'); return; }
      const r = await resp.json();
      exists = true; dirty = false;
      setSaveState('saved');
      /* Reflect the server's authoritative readiness. */
      renderReadinessBar(r.readiness, r.status);
    } catch (e) { console.error('saveHandoff error:', e.message); setSaveState('error'); }
  }
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
    if (!custId) { renderGate(); return; }
    $('sfGate').style.display = 'none';
    $('sfApp').style.display = 'block';
    const ok = await loadHandoff(custId);
    if (ok) renderApp();
  }

  /* Resolve the customer to work on: the scenario currently loaded on the
     calculator (its customer_id), else prompt to pick from the customer list. */
  function resolveCurrentCustomerId() {
    /* If a scenario is loaded, use its customer_id. */
    if (typeof currentScenarioCustomerId !== 'undefined' && currentScenarioCustomerId) return currentScenarioCustomerId;
    /* Else, try to match the calculator's company to a known customer. */
    return window._sfSelectedCustomerId || null;
  }

  function renderGate(errMsg) {
    $('sfApp').style.display = 'none';
    const gate = $('sfGate');
    gate.style.display = 'block';
    if (errMsg) { gate.innerHTML = `<div class="sf-gate-card"><p>${esc(errMsg)}</p></div>`; return; }
    /* Show a customer picker so an SE can choose any customer. */
    gate.innerHTML = `<div class="sf-gate-card">
      <h3>Select a customer</h3>
      <p>Solution Fit is tied to a customer. Pick one to begin, or open a scenario on the Calculator first.</p>
      <select id="sfCustomerPick"><option value="">Loading customers…</option></select>
      <button class="btn btn-primary btn-sm" id="sfCustomerGo" disabled>Open handoff</button>
    </div>`;
    loadCustomerPicker();
  }
  async function loadCustomerPicker() {
    try {
      const resp = await apiFetch('/api/customers');
      const customers = (resp && resp.ok) ? await resp.json() : [];
      const sel = $('sfCustomerPick');
      if (!sel) return;
      if (!customers.length) { sel.innerHTML = '<option value="">No customers yet — save a scenario first</option>'; return; }
      sel.innerHTML = '<option value="">— Select a customer —</option>' +
        customers.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.ownerUsername?` · ${esc(c.ownerUsername)}`:''}</option>`).join('');
      const go = $('sfCustomerGo');
      sel.onchange = () => { go.disabled = !sel.value; };
      go.onclick = () => { if (sel.value) { window._sfSelectedCustomerId = sel.value; initSolutionFit(); } };
    } catch (e) { console.error('customer picker error:', e.message); }
  }

  /* ── Main render ────────────────────────────────────────────────── */
  function renderApp() {
    const app = $('sfApp');
    const r = computeReadiness();
    /* Tab labels with gap count badge */
    const gapCount = S.gaps.length;
    const missingCount = r.miss ? r.miss.length : 0;
    const tabs = [
      { k:'context',     l:'Context' },
      { k:'checklist',   l:'Demo &amp; Fit' },
      { k:'gaps',        l:'Gaps',        badge: gapCount || null },
      { k:'integration', l:'Integration' },
      { k:'handoff',     l:'Readiness',   badge: missingCount || null, badgeCls:'sf-tab-badge-warn' }
    ];
    app.innerHTML = `
      <div class="sf-topbar">
        <div class="sf-topbar-left">
          <span class="sf-ctx-name">${esc(customerName || S.opportunity.customer || 'Customer')}</span>
          ${S.opportunity.stage ? `<span class="sf-stage-pill">${esc(S.opportunity.stage)}</span>` : ''}
          ${!canWrite ? '<span class="sf-ro-badge">Read-only</span>' : ''}
        </div>
        <div class="sf-topbar-right" id="sfSaveStateMini"></div>
      </div>
      <div class="sf-readiness-bar" id="sfReadinessBar"></div>
      <div class="sf-tabs">
        ${tabs.map(t=>`<button class="sf-tab ${activeTab===t.k?'active':''}" data-sftab="${t.k}">${t.l}${t.badge?`<span class="sf-tab-badge ${t.badgeCls||''}">${t.badge}</span>`:''}</button>`).join('')}
      </div>
      <div class="sf-panes">
        <div class="sf-pane" data-sfpane="context">${renderContext()}</div>
        <div class="sf-pane" data-sfpane="checklist">${renderChecklist()}</div>
        <div class="sf-pane" data-sfpane="gaps">${renderGaps()}</div>
        <div class="sf-pane" data-sfpane="integration">${renderIntegration()}</div>
        <div class="sf-pane" data-sfpane="handoff">${renderReadinessTab(r)}</div>
      </div>`;
    wireTabs();
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
    const label = status==='ready' ? 'Ready to hand off'
                : status==='conditional' ? 'Conditional — some items still open'
                : 'Not ready — key fields missing';
    const barColor = status==='ready' ? 'var(--green)' : status==='conditional' ? '#D97706' : 'var(--red)';
    const blocker = miss && miss.length
      ? `<span class="sf-rbar-blocker">${miss.length} item${miss.length!==1?'s':''} to resolve</span>`
      : '';
    el.innerHTML = `
      <div class="sf-rbar-inner">
        <div class="sf-rbar-track"><div class="sf-rbar-fill" style="width:${pct}%;background:${barColor};"></div></div>
        <div class="sf-rbar-info">
          <span class="sf-rbar-pct" style="color:${barColor}">${pct}%</span>
          <span class="sf-rbar-label">${esc(label)}</span>
          ${blocker}
        </div>
      </div>`;
    /* Also mirror save state label here */
    const sm = $('sfSaveStateMini');
    if (sm) setSaveState(_lastSaveState || '');
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
  const _openSections = new Set(['opp','arch','partner']);
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
    const f = (label, path, ph='') => `<div class="sf-field"><label>${esc(label)}</label><input data-sfbind="${path}" value="${esc(val(S,path))}" placeholder="${esc(ph)}"></div>`;
    const ta = (label, path, ph='') => `<div class="sf-field"><label>${esc(label)}</label><textarea data-dictate data-sfbind="${path}" placeholder="${esc(ph)}">${esc(val(S,path))}</textarea></div>`;
    const sel = (label, path, opts) => `<div class="sf-field"><label>${esc(label)}</label><select data-sfbind="${path}">${opts.map(x=>`<option ${val(S,path)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;

    /* Solution Engineer dropdown from SE + Admin users. */
    const seOpts = ['<option value="">— Select —</option>'].concat(
      _seList.map(u => `<option value="${esc(u.name)}" ${o.solutionEngineer===u.name?'selected':''}>${esc(u.name)}${u.role==='admin'?' (Admin)':''}</option>`)
    ).join('');
    const seField = `<div class="sf-field"><label>Solution Engineer</label><select data-sfbind="opportunity.solutionEngineer">${seOpts}</select></div>`;

    /* Products checkboxes + Other. */
    const prodChecks = PRODUCTS.map(pr => `<label class="sf-check"><input type="checkbox" data-sfprod="${esc(pr)}" ${o.products.includes(pr)?'checked':''}><span>${esc(pr)}</span></label>`).join('');
    const otherChecked = o.products.includes('Other');
    const productsField = `<div class="sf-field"><label>Cloud Inventory product(s)</label>
      <div class="sf-checks">${prodChecks}<label class="sf-check"><input type="checkbox" data-sfprod="Other" ${otherChecked?'checked':''}><span>Other</span></label></div>
      <div id="sfProductsOther" class="${otherChecked?'':'sf-hidden'}" style="margin-top:8px;"><input data-sfbind="opportunity.productsOther" value="${esc(o.productsOther)}" placeholder="Describe other product(s)"></div>
    </div>`;

    /* Owner blocks: name / title / email / phone. */
    const ownerBlock = (title, k) => `<div class="sf-owner">
      <div class="sf-owner-title">${esc(title)}</div>
      <div class="sf-row2">${f('Name','opportunity.'+k+'Name')}${f('Title','opportunity.'+k+'Title')}</div>
      <div class="sf-row2">${f('Email (optional)','opportunity.'+k+'Email')}${f('Phone (optional)','opportunity.'+k+'Phone')}</div>
    </div>`;

    /* Known customizations rows. */
    const customRows = a.customizations.map((c,i)=>`<div class="sf-custom-row" data-sfcustidx="${i}">
      <input data-sfcustfield="module" data-sfcustidx="${i}" value="${esc(c.module)}" placeholder="Module (e.g. Sales Order)">
      <input data-sfcustfield="description" data-sfcustidx="${i}" value="${esc(c.description)}" placeholder="What was customized">
      <select data-sfcustfield="impact" data-sfcustidx="${i}">${['None','Low','Med','High'].map(x=>`<option ${c.impact===x?'selected':''}>${x}</option>`).join('')}</select>
      <button class="btn btn-danger btn-sm" data-sfcustdel="${i}" title="Remove">×</button>
    </div>`).join('');

    const oppFilled = countFilled(['opportunity.customer','opportunity.solutionEngineer','opportunity.stage','opportunity.goLive','opportunity.problem','opportunity.outcome']);
    const archFilled = countFilled(['architecture.relationship','architecture.erp','architecture.integrationMethod','architecture.integrationOwner']);
    const partFilled = countFilled(['partner.involved','partner.company','partner.contactName']);

    const oppBody = `
      <div class="sf-row3">
        ${sel('Stage','opportunity.stage',['Discovery','Technical validation','Proposal','Closed'])}
        ${f('Target go-live','opportunity.goLive','e.g. Q1 2027')}
        ${f('Estimated users','opportunity.users','e.g. 45')}
      </div>
      ${productsField}
      <div class="sf-row2">
        ${ta('Business problem','opportunity.problem','What is the customer trying to solve?')}
        ${ta('Desired outcome','opportunity.outcome','What does success look like?')}
      </div>
      <div class="sf-row2" style="margin-top:4px;">
        ${seField}
        <div></div>
      </div>
      <div class="sf-subsection-label">Contacts</div>
      <div class="sf-row2">${ownerBlock('Business owner','businessOwner')}${ownerBlock('Technical owner','technicalOwner')}</div>`;

    const archBody = `
      ${sel('Deployment relationship','architecture.relationship',['','Standalone','Integrated to system of record','Hybrid'])}
      <div id="sfIntFields" class="${a.relationship==='Standalone'?'sf-hidden':''}">
        <div class="sf-row2">${f('ERP / system of record','architecture.erp')}${f('Version','architecture.version')}</div>
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

    return sfSection('opp','opp','Opportunity',[oppFilled,6],oppBody)
         + sfSection('arch','arch','System of record & architecture',[archFilled,4],archBody)
         + sfSection('partner','partner','Partner involvement',[partFilled,3],partnerBody);
  }

  /* ── Tab 2: Demo & Fit checklist ────────────────────────────────── */
  function fitBadge(fit) {
    var map = {'Full fit':'sf-badge-green','Partial fit':'sf-badge-amber','Gap':'sf-badge-red','Unknown':'sf-badge-gray','Not reviewed':'sf-badge-gray','Not applicable':'sf-badge-gray'};
    var lbl = {'Full fit':'Full fit','Partial fit':'Partial','Gap':'Gap','Unknown':'Unknown','Not reviewed':'Not reviewed','Not applicable':'N/A'};
    return '<span class="sf-proc-badge ' + (map[fit]||'sf-badge-gray') + '">' + esc(lbl[fit]||fit) + '</span>';
  }
  function demoBadge(status) {
    if (status==='Demonstrated') return '<span class="sf-proc-badge sf-badge-green">&#10003; Demo’d</span>';
    if (status==='Not applicable') return '<span class="sf-proc-badge sf-badge-gray">N/A</span>';
    if (status==='Not reviewed') return '';
    return '<span class="sf-proc-badge sf-badge-amber">' + esc(status) + '</span>';
  }
  function renderChecklist() {
    var selected = S.processes.filter(function(p){return p.selected;}).length;
    var demoed   = S.processes.filter(function(p){return p.selected && p.demoStatus==='Demonstrated';}).length;
    var gaps     = S.processes.filter(function(p){return p.selected && (p.fit==='Gap'||p.fit==='Partial fit');}).length;
    return '<div class="sf-checklist-head">'
      + '<div class="sf-checklist-stats">'
      + '<div class="sf-cstat"><span class="sf-cstat-n">' + selected + '</span><span class="sf-cstat-l">In scope</span></div>'
      + '<div class="sf-cstat"><span class="sf-cstat-n sf-cstat-green">' + demoed + '</span><span class="sf-cstat-l">Demonstrated</span></div>'
      + '<div class="sf-cstat"><span class="sf-cstat-n ' + (gaps?'sf-cstat-red':'') + '">' + gaps + '</span><span class="sf-cstat-l">Gaps / partial</span></div>'
      + '</div>'
      + '<button class="btn btn-accent btn-sm sf-add-process" data-sfaction="addProcess">&#xff0b; Add process</button>'
      + '</div>'
      + '<div class="sf-process-grid">' + S.processes.map(function(p,i){return renderProcessCard(p,i);}).join('') + '</div>';
  }
  function renderProcessCard(p,i) {
    var showNote = p.fit==='Partial fit'||p.fit==='Gap'||p.fit==='Unknown'||p.demoStatus==='Discussed only'||p.demoStatus==='Not demonstrated';
    var hasBadges = p.selected && (p.demoStatus!=='Not reviewed' || p.fit!=='Not reviewed');
    return '<div class="sf-proc ' + (p.selected?'sel':'') + '" data-sfproc="' + i + '">'
      + '<div class="sf-proc-top">'
      + '<label class="sf-proc-head"><input type="checkbox" data-sfpsel="' + i + '" ' + (p.selected?'checked':'') + '><span class="sf-proc-name">' + esc(p.name) + '</span></label>'
      + (hasBadges ? '<div class="sf-proc-badges">' + demoBadge(p.demoStatus) + fitBadge(p.fit) + '</div>' : '')
      + '</div>'
      + (p.selected ? '<div class="sf-proc-detail">'
        + '<div class="sf-row2">'
        + '<div class="sf-field"><label>Demo status</label><select data-sfpdemo="' + i + '">' + ['Not reviewed','Demonstrated','Discussed only','Not demonstrated','Not applicable'].map(function(x){return '<option ' + (p.demoStatus===x?'selected':'') + '>' + esc(x) + '</option>';}).join('') + '</select></div>'
        + '<div class="sf-field"><label>Fit assessment</label><select data-sfpfit="' + i + '">' + ['Not reviewed','Full fit','Partial fit','Gap','Unknown'].map(function(x){return '<option ' + (p.fit===x?'selected':'') + '>' + esc(x) + '</option>';}).join('') + '</select></div>'
        + '</div>'
        + (showNote ? '<div class="sf-field"><label>Note for handoff</label><textarea data-dictate data-sfpnote="' + i + '" placeholder="Evidence, exception, or workaround for Services.">' + esc(p.notes) + '</textarea></div>' : '')
        + '</div>' : '')
      + '</div>';
  }

  /* ── Tab 3: Gap register ────────────────────────────────────────── */
  function nextGapId(){ const max=Math.max(0,...S.gaps.map(g=>Number((g.id||'').replace(/\D/g,''))||0)); return `GAP-${String(max+1).padStart(3,'0')}`; }
  function newGap(v={}){ return {id:nextGapId(),process:'',demoEvidence:'Yes',need:'',classification:'UNKNOWN',priority:'Should Have',goLive:'Unknown',currentProcess:'',standardBehavior:'',gapDescription:'',businessRationale:'',acceptance:'',dependencies:'',assumptions:'',openQuestions:'',...v}; }
  function renderGaps(){
    var mustCount = S.gaps.filter(function(g){return g.priority==='Must Have';}).length;
    var unknownCount = S.gaps.filter(function(g){return g.classification==='UNKNOWN';}).length;
    return '<div class="sf-gap-header">'
      + '<h3 class="sf-gap-title">Gap register</h3>'
      + (S.gaps.length ? '<div class="sf-gap-counts">'
        + (mustCount ? '<span class="sf-gap-count sf-gc-must">&#9679; ' + mustCount + ' Must have</span>' : '')
        + (unknownCount ? '<span class="sf-gap-count sf-gc-unknown">&#9673; ' + unknownCount + ' Unclassified</span>' : '')
        + '</div>' : '')
      + '<button class="btn btn-primary btn-sm" data-sfaction="addGap">+ Capture gap</button>'
      + '</div>'
      + '<div id="sfGapList">' + (S.gaps.length ? S.gaps.map(function(g){return renderGapCard(g);}).join('') : '<div class="sf-empty-state"><p>No gaps captured. If all selected processes are demonstrated and full fit, that is a valid outcome.</p></div>') + '</div>';
  }
  function renderGapCard(g){
    var idx=S.gaps.indexOf(g), deep=materialGap(g), open=openGapId===g.id;
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
      + '<div class="sf-gap-actions">'
      + '<button class="btn btn-ghost btn-sm" data-sfgaptoggle="' + g.id + '">' + (open?'Close':'Details') + '</button>'
      + '<button class="btn btn-danger btn-sm" data-sfgapdel="' + idx + '" title="Delete gap">&#215;</button>'
      + '</div></div>'
      + '<div class="sf-gap-detail ' + (open?'open':'') + '">'
      + (deep?'<div class="sf-callout">Material gap — capture the business rule, evidence, acceptance criteria, and dependencies. Do not design the solution here.</div>':'')
      + '<div class="sf-row3">'
      + '<div class="sf-field"><label>Process</label><select data-sfgfield="process" data-sfgid="' + g.id + '">' + S.processes.map(function(p){return '<option ' + (p.name===g.process?'selected':'') + '>' + esc(p.name) + '</option>';}).join('') + '</select></div>'
      + '<div class="sf-field"><label>Demo evidence</label><select data-sfgfield="demoEvidence" data-sfgid="' + g.id + '">' + ['Yes','Partially','No','Not applicable'].map(function(x){return '<option ' + (g.demoEvidence===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '<div class="sf-field"><label>Classification</label><select data-sfgfield="classification" data-sfgid="' + g.id + '">' + CLASSIFICATIONS.map(function(x){return '<option ' + (x===g.classification?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '</div>'
      + '<div class="sf-field"><label>Customer need / outcome</label><textarea data-dictate data-sfgfield="need" data-sfgid="' + g.id + '">' + esc(g.need) + '</textarea></div>'
      + '<div class="sf-row2">'
      + '<div class="sf-field"><label>Current process (as-is)</label><textarea data-dictate data-sfgfield="currentProcess" data-sfgid="' + g.id + '">' + esc(g.currentProcess) + '</textarea></div>'
      + '<div class="sf-field"><label>Standard behavior demonstrated</label><textarea data-dictate data-sfgfield="standardBehavior" data-sfgid="' + g.id + '">' + esc(g.standardBehavior) + '</textarea></div>'
      + '</div>'
      + '<div class="sf-field"><label>Precise gap / difference</label><textarea data-dictate data-sfgfield="gapDescription" data-sfgid="' + g.id + '">' + esc(g.gapDescription) + '</textarea></div>'
      + '<div class="sf-row2">'
      + '<div class="sf-field"><label>Priority</label><select data-sfgfield="priority" data-sfgid="' + g.id + '">' + ['Must Have','Should Have','Could Have'].map(function(x){return '<option ' + (g.priority===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '<div class="sf-field"><label>Required for go-live?</label><select data-sfgfield="goLive" data-sfgid="' + g.id + '">' + ['Unknown','Yes','No'].map(function(x){return '<option ' + (g.goLive===x?'selected':'') + '>' + x + '</option>';}).join('') + '</select></div>'
      + '</div>'
      + '<div class="sf-field"><label>Acceptance criteria</label><textarea data-dictate data-sfgfield="acceptance" data-sfgid="' + g.id + '">' + esc(g.acceptance) + '</textarea></div>'
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
    var hasInterfaces = S.interfaces.length > 0;
    return '<div class="sf-card">'
      + '<div class="sf-card-head"><h3>Additional interfaces</h3><button class="btn btn-ghost btn-sm" data-sfaction="addInterface">+ Add interface</button></div>'
      + '<div class="sf-table-wrap">'
      + (hasInterfaces
        ? '<table class="sf-table"><thead><tr><th style="width:70px">ID</th><th>Source</th><th>Target</th><th>Object / purpose</th><th style="width:140px">Method</th><th style="width:120px">Owner</th><th style="width:36px"></th></tr></thead>'
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
      + '<td><select class="sf-table-input" data-sfifield="owner">'+['Cloud Inventory','Customer','Partner','Shared','TBD'].map(function(x){return '<option '+(x===it.owner?'selected':'')+'>'+x+'</option>';}).join('')+'</select></td>'
      + '<td><button class="btn btn-danger btn-sm" data-sfintdel="'+idx+'" title="Delete">&#215;</button></td>'
      + '</tr>';
  }

  /* ── Tab 5: Readiness + handoff documents ───────────────────────── */
  function renderReadinessTab(r){
    return `<div class="sf-card">
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
        <button class="btn btn-ghost btn-sm" data-sfaction="copyDoc">Copy text</button>
        <button class="btn btn-ghost btn-sm" onclick="printRiskLedger()" title="Print a prospect-facing risk ledger showing gaps and mitigations — share before procurement asks">📋 Risk ledger</button>
      </div>
      <div class="sf-doc-preview" id="sfDocPreview">${S.handoffType==='customer'?customerDoc():internalDoc()}</div>
    </div>`;
  }

  /* ── Branded handoff documents (ported from prototype) ──────────── */
  function docHeadBrand(title, subtitle, badge) {
    return `<div class="hd-head">
      <div><div class="hd-brand">CLOUD INVENTORY<span class="hd-reg">®</span></div>
        <h1 class="hd-title">${esc(title)}</h1>
        <p class="hd-sub">${subtitle}</p></div>
      <div class="hd-badge">${esc(badge)}</div>
    </div>`;
  }

  function internalDoc(){
    const o=S.opportunity, a=S.architecture, p=S.partner, r=computeReadiness();
    const sel=S.processes.filter(x=>x.selected);
    const demoed=sel.filter(x=>x.demoStatus==='Demonstrated');
    return `${docHeadBrand('Solution Fit, Gap & Services Handoff',
        `${esc(o.customer||'Customer not entered')}`,
        `INTERNAL · ${r.score}% READY`)}
    <div class="hd-summary">
      <div><b>${sel.length}</b><span>Processes in scope</span></div>
      <div><b>${demoed.length}</b><span>Actually demoed</span></div>
      <div><b>${S.gaps.length}</b><span>Gaps / exceptions</span></div>
      <div><b>${S.interfaces.length}</b><span>Additional interfaces</span></div>
    </div>
    <h2 class="hd-h2">Business context</h2>
    <p><strong>Solution Engineer:</strong> ${esc(o.solutionEngineer||'—')} &nbsp;·&nbsp; <strong>Stage:</strong> ${esc(o.stage||'—')}</p>
    <p><strong>Products:</strong> ${esc(fmtProducts(o))} &nbsp;·&nbsp; <strong>Users:</strong> ${esc(o.users||'—')} &nbsp;·&nbsp; <strong>Target go-live:</strong> ${esc(o.goLive||'—')}</p>
    <p><strong>Business owner:</strong> ${esc(fmtOwner(o,'businessOwner'))} &nbsp;·&nbsp; <strong>Technical owner:</strong> ${esc(fmtOwner(o,'technicalOwner'))}</p>
    <p><strong>Business problem:</strong> ${esc(o.problem||'—')}</p>
    <p><strong>Desired outcome:</strong> ${esc(o.outcome||'—')}</p>
    <h2 class="hd-h2">Architecture &amp; delivery ownership</h2>
    <p><strong>Relationship:</strong> ${esc(a.relationship||'—')} &nbsp;·&nbsp; <strong>ERP/SOR:</strong> ${esc(a.erp||'—')} &nbsp;·&nbsp; <strong>Version:</strong> ${esc(a.version||'—')}</p>
    ${a.relationship!=='Standalone'?`<p><strong>Primary integration:</strong> ${esc(a.integrationMethod||'—')} &nbsp;·&nbsp; <strong>Integration delivery:</strong> ${esc(a.integrationOwner||'—')}</p>`:''}
    ${a.hasCustomizations==='Yes' && a.customizations.length ? `<p><strong>Known SOR customizations:</strong></p><ul class="hd-ul">${a.customizations.map(c=>`<li><strong>${esc(c.module||'Module')}</strong> — ${esc(c.description||'—')} <em>(impact: ${esc(c.impact||'None')})</em></li>`).join('')}</ul>` : (a.hasCustomizations==='No'?'<p><strong>Known SOR customizations:</strong> None reported.</p>':'')}
    <p><strong>Partner involved:</strong> ${esc(p.involved||'—')}${p.involved==='Yes'?` &nbsp;·&nbsp; <strong>Partner:</strong> ${esc(p.company||'—')} &nbsp;·&nbsp; <strong>Contact:</strong> ${esc(p.contactName||'—')} (${esc(p.email||'—')})`:''}</p>
    <h2 class="hd-h2">Demo &amp; fit evidence</h2>
    ${sel.length?`<table class="hd-table"><thead><tr><th>Process</th><th>Demo status</th><th>Fit</th><th>Evidence / note</th></tr></thead><tbody>${sel.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.demoStatus)}</td><td>${esc(x.fit)}</td><td>${esc(x.notes||'—')}</td></tr>`).join('')}</tbody></table>`:'<p>No process scope recorded.</p>'}
    <h2 class="hd-h2">Gap register</h2>
    ${S.gaps.length?S.gaps.map(g=>`<div class="hd-gap"><h3 class="hd-h3">${esc(g.id)} · ${esc(g.process||'—')} · ${esc(g.classification)} · ${esc(g.priority)}</h3>
      <p><strong>Required outcome:</strong> ${esc(g.need||'—')}<br>
      <strong>Demo evidence:</strong> ${esc(g.demoEvidence)}${g.gapDescription?`<br><strong>Gap:</strong> ${esc(g.gapDescription)}`:''}${g.acceptance?`<br><strong>Acceptance:</strong> ${esc(g.acceptance)}`:''}${g.dependencies?`<br><strong>Dependencies / assumptions:</strong> ${esc(g.dependencies)}`:''}${g.openQuestions?`<br><strong>Open questions:</strong> ${esc(g.openQuestions)}`:''}</p></div>`).join(''):'<p>No gaps recorded.</p>'}
    <h2 class="hd-h2">Additional integration &amp; delivery drivers</h2>
    ${S.interfaces.length?`<ul class="hd-ul">${S.interfaces.map(i=>`<li><strong>${esc(i.id)}</strong>: ${esc(i.source||'TBD')} → ${esc(i.target||'TBD')} · ${esc(i.object||'Purpose TBD')} · ${esc(i.method)} · Owner: ${esc(i.owner)}</li>`).join('')}</ul>`:'<p>No additional material interfaces recorded.</p>'}
    <p><strong>Offline:</strong> ${esc(S.drivers.offline)} ${S.drivers.offlineDuration?`(${esc(S.drivers.offlineDuration)})`:''} &nbsp;·&nbsp; <strong>Devices:</strong> ${esc(S.drivers.devices||'—')} &nbsp;·&nbsp; <strong>Custom outputs:</strong> ${esc(S.drivers.customOutput)} &nbsp;·&nbsp; <strong>Volume concern:</strong> ${esc(S.drivers.volumeConcern)}</p>
    <h2 class="hd-h2">Readiness</h2>
    ${r.miss.length?`<p><strong>Missing:</strong> ${r.miss.map(x=>esc(x.label)).join(', ')}</p>`:'<p>No automated handoff blockers detected.</p>'}
    <p class="hd-foot">CONFIDENTIAL · Internal use · © 2026 Cloud Inventory</p>`;
  }

  function customerOpenItems(){
    const out=[]; const a=S.architecture;
    if(!a.relationship) out.push('Confirm whether Cloud Inventory will be integrated or standalone.');
    if(!a.version) out.push('Confirm ERP / system-of-record version.');
    if(a.relationship && a.relationship!=='Standalone' && !a.integrationMethod) out.push('Confirm the primary integration method.');
    S.gaps.filter(g=>g.priority==='Must Have' && g.openQuestions).forEach(g=>out.push(`${g.id}: ${g.openQuestions}`));
    return out;
  }

  function customerDoc(){
    const o=S.opportunity, a=S.architecture, p=S.partner;
    const sel=S.processes.filter(x=>x.selected);
    const exceptions=S.gaps.filter(g=>g.classification!=='OUT OF SCOPE');
    return `${docHeadBrand('Solution Discovery & Demonstration Summary', `Prepared for ${esc(o.customer||'Customer')}`, 'CUSTOMER REVIEW COPY')}
    <p class="hd-intro">This document summarizes our current understanding of the business objective, solution architecture, functionality demonstrated, and requirements requiring further validation. It is not a Statement of Work or final solution design.</p>
    <h2 class="hd-h2">Business objectives</h2>
    <p><strong>Current challenge:</strong> ${esc(o.problem||'To be confirmed')}</p>
    <p><strong>Desired outcome:</strong> ${esc(o.outcome||'To be confirmed')}</p>
    <h2 class="hd-h2">Proposed solution context</h2>
    <p><strong>Cloud Inventory product(s):</strong> ${esc(fmtProducts(o) || 'To be confirmed')} &nbsp;·&nbsp; <strong>Estimated users:</strong> ${esc(o.users||'To be confirmed')}</p>
    <p><strong>System relationship:</strong> ${esc(a.relationship||'To be confirmed')} &nbsp;·&nbsp; <strong>System of record:</strong> ${esc(a.erp||'To be confirmed')} &nbsp;·&nbsp; <strong>Version:</strong> ${esc(a.version||'To be confirmed')}</p>
    ${a.relationship!=='Standalone'?`<p><strong>Expected integration approach:</strong> ${esc(a.integrationMethod||'To be confirmed')} &nbsp;·&nbsp; <strong>Expected delivery responsibility:</strong> ${esc(a.integrationOwner||'To be confirmed')}</p>`:''}
    ${p.involved==='Yes'?`<p><strong>Partner participation:</strong> ${esc(p.company||'Partner to be confirmed')} ${p.role?`(${esc(p.role)})`:''}</p>`:''}
    <h2 class="hd-h2">Functionality reviewed</h2>
    ${sel.length?`<table class="hd-table"><thead><tr><th>Business process</th><th>Review status</th><th>Current fit</th></tr></thead><tbody>${sel.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.demoStatus)}</td><td>${esc(x.fit)}</td></tr>`).join('')}</tbody></table>`:'<p>Process scope is still being confirmed.</p>'}
    <h2 class="hd-h2">Requirements requiring validation or extension</h2>
    ${exceptions.length?exceptions.map(g=>`<div class="hd-gap"><h3 class="hd-h3">${esc(g.process||'Requirement')} — ${esc(g.priority)}</h3><p>${esc(g.need||'Requirement to be confirmed')}${g.acceptance?`<br><strong>Expected outcome:</strong> ${esc(g.acceptance)}`:''}</p></div>`).join(''):'<p>No non-standard requirements have been identified at this stage.</p>'}
    <h2 class="hd-h2">Integration &amp; shared responsibilities</h2>
    ${S.interfaces.length?`<ul class="hd-ul">${S.interfaces.map(i=>`<li>${esc(i.source||'Source TBD')} → ${esc(i.target||'Target TBD')}: ${esc(i.object||'Purpose to be confirmed')} · Expected owner: ${esc(i.owner||'TBD')}</li>`).join('')}</ul>`:'<p>No additional material interfaces have been identified beyond the primary architecture above.</p>'}
    <h2 class="hd-h2">Items to confirm together</h2>
    <ul class="hd-ul">${customerOpenItems().map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No customer confirmation items are currently recorded.</li>'}</ul>
    <p class="hd-foot">© 2026 Cloud Inventory · Discovery summary for customer review</p>`;
  }

  /* Branded print window — self-contained so it renders identically to PDF. */
  function printHandoffDoc(){
    const isCustomer = S.handoffType==='customer';
    const body = isCustomer ? customerDoc() : internalDoc();
    const title = isCustomer ? 'Cloud Inventory — Discovery Summary' : 'Cloud Inventory — Solution Handoff';
    const w = window.open('', '_blank');
    if (!w) { if(typeof showToast==='function') showToast('Pop-up blocked — allow pop-ups to print.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      :root{--navy:#1E2931;--cyan:#00A9CC;--ink:#1E2931;--muted:#647681;--line:#dbe5e9;}
      *{box-sizing:border-box}body{margin:0;font-family:Aptos,"Segoe UI",Arial,sans-serif;color:var(--ink);line-height:1.5;padding:44px 52px;}
      .hd-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--cyan);padding-bottom:16px;margin-bottom:22px;}
      .hd-brand{font-weight:700;letter-spacing:.5px;color:var(--navy);font-size:15px;}
      .hd-reg{font-size:9px;vertical-align:super;}
      .hd-title{font-size:24px;margin:6px 0 2px;color:var(--navy);}
      .hd-sub{margin:0;color:var(--muted);font-size:13px;}
      .hd-badge{background:var(--navy);color:#fff;font-size:10px;font-weight:700;letter-spacing:.5px;padding:6px 12px;border-radius:20px;white-space:nowrap;}
      .hd-summary{display:flex;gap:26px;background:#F5F8FA;border:1px solid var(--line);border-radius:12px;padding:16px 20px;margin-bottom:22px;}
      .hd-summary div{text-align:center;}
      .hd-summary b{display:block;font-size:26px;color:var(--cyan);}
      .hd-summary span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
      .hd-intro{background:#F5F8FA;border-left:3px solid var(--cyan);padding:12px 16px;border-radius:6px;font-size:13px;color:#3a4a54;margin-bottom:20px;}
      .hd-h2{font-size:14px;color:var(--navy);border-bottom:1px solid var(--line);padding-bottom:5px;margin:22px 0 10px;}
      .hd-h3{font-size:12.5px;color:var(--cyan);margin:14px 0 4px;}
      p{font-size:12.5px;margin:6px 0;}
      .hd-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}
      .hd-table th{background:#F5F8FA;text-align:left;padding:7px 9px;border:1px solid var(--line);color:var(--navy);}
      .hd-table td{padding:7px 9px;border:1px solid var(--line);vertical-align:top;}
      .hd-ul{font-size:12.5px;padding-left:18px;}
      .hd-gap{margin-bottom:10px;page-break-inside:avoid;}
      .hd-foot{margin-top:28px;font-size:9px;color:#84939a;border-top:1px solid var(--line);padding-top:10px;}
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

  function setDocType(type){
    S.handoffType = type;
    scheduleSave();
    const pane=document.querySelector('[data-sfpane="handoff"]');
    if(pane){ const r=computeReadiness(); pane.innerHTML=renderReadinessTab(r); wireBindings(); if(!canWrite) disableInputs(); }
  }


  /* ── Wiring ─────────────────────────────────────────────────────── */
  function wireTabs(){
    document.querySelectorAll('.sf-tab').forEach(t=>t.onclick=()=>{
      activeTab=t.dataset.sftab;
      document.querySelectorAll('.sf-tab').forEach(x=>x.classList.toggle('active',x===t));
      showActivePane();
      if(activeTab==='handoff'){
        const r=computeReadiness();
        const pane=document.querySelector('[data-sfpane="handoff"]');
        if(pane){ pane.innerHTML=renderReadinessTab(r); wireBindings(); if(!canWrite) disableInputs(); }
      }
    });
  }
  function showActivePane(){ document.querySelectorAll('.sf-pane').forEach(p=>p.style.display = p.dataset.sfpane===activeTab?'block':'none'); }

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
    /* process cards */
    document.querySelectorAll('[data-sfpsel]').forEach(el=>el.addEventListener('change',e=>{ const i=+el.dataset.sfpsel; S.processes[i].selected=e.target.checked; if(!e.target.checked){S.processes[i].demoStatus='Not reviewed';S.processes[i].fit='Not reviewed';} rerenderChecklist(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpdemo]').forEach(el=>el.addEventListener('change',e=>{ S.processes[+el.dataset.sfpdemo].demoStatus=e.target.value; rerenderChecklist(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpfit]').forEach(el=>el.addEventListener('change',e=>{ S.processes[+el.dataset.sfpfit].fit=e.target.value; rerenderChecklist(); scheduleSave(); }));
    document.querySelectorAll('[data-sfpnote]').forEach(el=>el.addEventListener('input',e=>{ S.processes[+el.dataset.sfpnote].notes=e.target.value; scheduleSave(); }));
    /* gaps */
    document.querySelectorAll('[data-sfgaptoggle]').forEach(el=>el.onclick=()=>{ openGapId = openGapId===el.dataset.sfgaptoggle?null:el.dataset.sfgaptoggle; rerenderGaps(); });
    document.querySelectorAll('[data-sfgapdel]').forEach(el=>el.onclick=()=>{ if(confirm('Delete this gap?')){ S.gaps.splice(+el.dataset.sfgapdel,1); rerenderGaps(); scheduleSave(); } });
    document.querySelectorAll('[data-sfgfield]').forEach(el=>el.addEventListener('input',e=>{ const g=S.gaps.find(x=>x.id===el.dataset.sfgid); if(g){ g[el.dataset.sfgfield]=e.target.value; scheduleSave(); if(['priority','goLive','classification'].includes(el.dataset.sfgfield)) rerenderGaps(); } }));
    /* interfaces */
    document.querySelectorAll('[data-sfifield]').forEach(el=>el.addEventListener('input',e=>{ const row=el.closest('[data-sfint]'); const it=S.interfaces[+row.dataset.sfint]; if(it){ it[el.dataset.sfifield]=e.target.value; scheduleSave(); } }));
    document.querySelectorAll('[data-sfintdel]').forEach(el=>el.onclick=()=>{ S.interfaces.splice(+el.dataset.sfintdel,1); rerenderIntegration(); scheduleSave(); });
    /* actions */
    document.querySelectorAll('[data-sfaction]').forEach(el=>el.onclick=()=>handleAction(el.dataset.sfaction));
    /* handoff doc type toggle (allowed read-only too) */
    document.querySelectorAll('[data-sfdoc]').forEach(el=>el.onclick=()=>setDocType(el.dataset.sfdoc));
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
  }
  function onEdit(path){ scheduleSave(); }

  function rerenderChecklist(){ const pane=document.querySelector('[data-sfpane="checklist"]'); if(pane){pane.innerHTML=renderChecklist(); wireBindings(); if(!canWrite)disableInputs();} }
  function rerenderGaps(){ const pane=document.querySelector('[data-sfpane="gaps"]'); if(pane){pane.innerHTML=renderGaps(); wireBindings(); if(!canWrite)disableInputs();} }
  function rerenderIntegration(){ const pane=document.querySelector('[data-sfpane="integration"]'); if(pane){pane.innerHTML=renderIntegration(); wireBindings(); if(!canWrite)disableInputs();} }

  function handleAction(a){
    /* Print and copy are allowed for everyone with read access (AEs included). */
    if(a==='printDoc'){ printHandoffDoc(); return; }
    if(a==='copyDoc'){ copyDocText(); return; }
    /* All other actions mutate state → require write access. */
    if(!canWrite){ if(typeof showToast==='function') showToast('Read-only — a Solution Engineer completes the handoff.'); return; }
    if(a==='addProcess'){ const n=prompt('New process name:'); if(n&&n.trim()){ S.processes.push(blankProcess(n.trim(),S.processes.length)); S.processes.at(-1).selected=true; rerenderChecklist(); scheduleSave(); } }
    else if(a==='addGap'){ S.gaps.push(newGap({})); openGapId=S.gaps.at(-1).id; rerenderGaps(); scheduleSave(); }
    else if(a==='addInterface'){ S.interfaces.push({id:nextIntId(),source:'',target:'',object:'',method:'TBD',direction:'Bidirectional',trigger:'',volume:'',owner:'TBD'}); rerenderIntegration(); scheduleSave(); }
    else if(a==='addCustomization'){ S.architecture.customizations.push(blankCustomization()); const pane=document.querySelector('[data-sfpane="context"]'); if(pane){pane.innerHTML=renderContext(); wireBindings();} scheduleSave(); }
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
      if(a!=='printDoc' && a!=='copyDoc') el.style.display='none';
    });
  }

  /* ── Prospect-facing risk ledger ──────────────────────────────────
     An honest "here's what you need to know before you commit" document.
     Shows gaps with their mitigations — volunteering limitations before
     procurement finds them builds credibility. */
  function printRiskLedger() {
    const company = S.company || 'Prospect';
    const gaps = S.gaps || [];
    const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

    const priOrder = {'Must Have':0,'Should Have':1,'Could Have':2};
    const sorted = gaps.slice().sort((a,b) => (priOrder[a.priority]||99) - (priOrder[b.priority]||99));

    const priColors = {'Must Have':'#C24A1E','Should Have':'#A6791E','Could Have':'#2E7D32'};
    const gapRows = sorted.map(g => {
      const pri = g.priority || 'Could Have';
      const col = priColors[pri] || '#64748B';
      return `<div style="border:1px solid #E2E8F0;border-left:4px solid ${col};border-radius:8px;padding:14px 18px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
          <div style="font-size:14px;font-weight:700;color:#1E2931;">${esc(g.feature||g.id||'Gap')}</div>
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:${col}20;color:${col};white-space:nowrap;">${pri}</span>
        </div>
        ${g.notes ? `<div style="font-size:12.5px;color:#334155;margin-bottom:6px;">${esc(g.notes)}</div>` : ''}
        ${g.mitigation ? `<div style="font-size:12px;color:#2E7D32;font-weight:600;">✓ Mitigation: ${esc(g.mitigation)}</div>` : '<div style="font-size:12px;color:#A6791E;">⚠ Mitigation under discussion</div>'}
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Risk Ledger — ${esc(company)}</title>
    <style>*{box-sizing:border-box}body{font-family:'Inter','Segoe UI',sans-serif;color:#1E2931;padding:44px 52px;max-width:760px;margin:0 auto;line-height:1.5;}
    h1{font-size:24px;margin:0 0 4px;}h2{font-size:16px;color:#0089A6;margin:24px 0 10px;border-bottom:1px solid #E2E8F0;padding-bottom:6px;}
    @media print{body{padding:20px 30px;}}</style>
    </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00A9CC;padding-bottom:14px;margin-bottom:22px;">
      <div><div style="font-size:12px;font-weight:700;color:#1E2931;letter-spacing:.5px;">CLOUD INVENTORY</div>
        <h1>What you should know before you commit</h1>
        <div style="color:#64748B;font-size:13px;">${esc(company)} · ${today}</div>
      </div>
    </div>
    <p style="font-size:13.5px;color:#334155;background:#F0F9FF;border:1px solid #00AECF;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      This document lists every gap or limitation identified during the evaluation of Cloud Inventory for ${esc(company)}, along with the proposed mitigation for each. We share this proactively — if your team or procurement finds these, we want you to hear them from us first.
    </p>
    <h2>${sorted.length} item${sorted.length!==1?'s':''} identified</h2>
    ${sorted.length ? gapRows : '<p style="color:#64748B;font-style:italic;">No gaps were identified during the evaluation. All selected processes demonstrated full fit.</p>'}
    <div style="margin-top:32px;padding-top:14px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;font-style:italic;">
      This document reflects the evaluation status as of ${today}. Items marked "Must Have" require resolution before contract. Contact your Cloud Inventory representative with questions. · cloudinventory.com
    </div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { if(typeof showToast==='function') showToast('Pop-up blocked — allow pop-ups to print.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.print(); } catch(e){} }, 400);
    if (typeof trackEvent === 'function') trackEvent('risk_ledger_printed', { company, gapCount: gaps.length });
  }
  window.printRiskLedger = printRiskLedger;

  /* Expose entry point for the tab switch. */
  window.initSolutionFit = initSolutionFit;
})();
