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

  const blankProcess = (name, i) => ({ id:`P-${String(i+1).padStart(3,'0')}`, name, selected:false, demoStatus:'Not reviewed', fit:'Not reviewed', notes:'' });
  const blankState = () => ({
    opportunity:{customer:'',opportunityId:'',solutionEngineer:'',stage:'Discovery',products:'',goLive:'',locations:'',users:'',problem:'',outcome:'',businessOwner:'',technicalOwner:''},
    architecture:{relationship:'',erp:'',version:'',otherSystems:'',integrationMethod:'',integrationOwner:'',integrationNotes:''},
    partner:{involved:'',company:'',role:'',contactName:'',email:'',phone:'',title:''},
    processes:STANDARD_PROCESSES.map(blankProcess), gaps:[], interfaces:[],
    drivers:{offline:'Unknown',offlineDuration:'',devices:'',peripherals:'',customOutput:'Unknown',volumeConcern:'Unknown',volume:'',otherConstraint:''},
    handoffType:'internal'
  });

  /* Module state */
  let S = blankState();
  let customerId = null, customerName = '', canWrite = false, exists = false;
  let openGapId = null, activeTab = 'context', saveTimer = null, dirty = false;

  const esc = v => String(v==null?'':v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
      /* Seed customer name into opportunity if empty. */
      if (!S.opportunity.customer && customerName) S.opportunity.customer = customerName;
      /* Permission: can this user write? (server is authoritative; we mirror for UI). */
      canWrite = await resolveCanWrite();
      return true;
    } catch (e) { console.error('loadHandoff error:', e.message); renderGate('Could not load the handoff — check your connection.'); return false; }
  }

  async function resolveCanWrite() {
    /* A cheap probe: SEs/admins can write. We read the user role from the app. */
    try {
      const u = (typeof getUser === 'function') ? getUser() : null;
      return !!u && (u.role === 'se' || u.role === 'admin');
    } catch (e) { return false; }
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
    app.innerHTML = `
      <div class="sf-context-bar">
        <span class="sf-ctx-name">🏢 ${esc(customerName || S.opportunity.customer || 'Customer')}</span>
        ${!canWrite ? '<span class="sf-ro-badge">Read + print (Solution Engineer edits)</span>' : ''}
        <span class="sf-readiness" id="sfReadinessMini"></span>
      </div>
      <div class="sf-tabs">
        ${['context|Context','checklist|Demo &amp; Fit','gaps|Gaps','integration|Integration','handoff|Readiness'].map(t=>{
          const [k,l]=t.split('|'); return `<button class="sf-tab ${activeTab===k?'active':''}" data-sftab="${k}">${l}</button>`;
        }).join('')}
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
    renderReadinessBar(r.score, r.status);
    if (!canWrite) disableInputs();
  }

  function renderReadinessBar(score, status) {
    const el = $('sfReadinessMini');
    if (!el) return;
    const cls = status==='ready'?'sf-r-ready':status==='conditional'?'sf-r-cond':'sf-r-block';
    el.innerHTML = `<span class="sf-r-chip ${cls}">${score}% ${status==='ready'?'Ready':status==='conditional'?'Conditional':'Not ready'}</span>`;
  }

  /* ── Tab 1: Context (opportunity / architecture / partner) ──────── */
  function renderContext() {
    const o=S.opportunity, a=S.architecture, p=S.partner;
    const f = (label, path, ph='') => `<div class="sf-field"><label>${esc(label)}</label><input data-sfbind="${path}" value="${esc(val(S,path))}" placeholder="${esc(ph)}"></div>`;
    const ta = (label, path, ph='') => `<div class="sf-field"><label>${esc(label)}</label><textarea data-sfbind="${path}" placeholder="${esc(ph)}">${esc(val(S,path))}</textarea></div>`;
    const sel = (label, path, opts) => `<div class="sf-field"><label>${esc(label)}</label><select data-sfbind="${path}">${opts.map(x=>`<option ${val(S,path)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;
    return `
      <div class="sf-card"><h3>Opportunity</h3>
        <div class="sf-row2">${f('Customer / prospect','opportunity.customer')}${f('Opportunity ID','opportunity.opportunityId','OPP-…')}</div>
        <div class="sf-row2">${f('Solution Engineer','opportunity.solutionEngineer')}${sel('Stage','opportunity.stage',['Discovery','Technical validation','Proposal','Closed'])}</div>
        <div class="sf-row2">${f('Cloud Inventory product(s)','opportunity.products','e.g. CIP + MEP')}${f('Target go-live','opportunity.goLive','e.g. Q1 2027')}</div>
        <div class="sf-row2">${f('Locations / operating scope','opportunity.locations')}${f('Estimated users','opportunity.users')}</div>
        ${ta('Business problem','opportunity.problem','What is the customer trying to solve?')}
        ${ta('Desired outcome','opportunity.outcome','What does success look like?')}
        <div class="sf-row2">${f('Business owner','opportunity.businessOwner')}${f('Technical owner','opportunity.technicalOwner')}</div>
      </div>
      <div class="sf-card"><h3>System of record &amp; solution relationship</h3>
        ${sel('Deployment relationship','architecture.relationship',['','Standalone','Integrated to system of record','Hybrid'])}
        <div id="sfIntFields" class="${a.relationship==='Standalone'?'sf-hidden':''}">
          <div class="sf-row2">${f('ERP / system of record','architecture.erp')}${f('Version','architecture.version')}</div>
          <div class="sf-row2">${sel('Primary integration method','architecture.integrationMethod',['','Cloud Inventory REST API','SOAP / web service','File','Middleware / iPaaS','Connector','Other'])}${sel('Integration delivery owner','architecture.integrationOwner',['','Cloud Inventory','Customer','Partner','Shared'])}</div>
          ${ta('Integration notes','architecture.integrationNotes')}
        </div>
        <div id="sfStandaloneNote" class="sf-note ${a.relationship==='Standalone'?'':'sf-hidden'}">Standalone deployment — no system-of-record integration in scope.</div>
      </div>
      <div class="sf-card"><h3>Partner involvement</h3>
        ${sel('Partner involved?','partner.involved',['','No','Yes'])}
        <div id="sfPartnerFields" class="${p.involved==='Yes'?'':'sf-hidden'}">
          <div class="sf-row2">${f('Partner company','partner.company')}${f('Role','partner.role','e.g. ERP / integration partner')}</div>
          <div class="sf-row2">${f('Contact name','partner.contactName')}${f('Email','partner.email')}</div>
        </div>
      </div>`;
  }

  /* ── Tab 2: Demo & Fit checklist ────────────────────────────────── */
  function renderChecklist() {
    return `<div class="sf-card">
      <div class="sf-card-head"><h3>Business processes</h3><button class="btn btn-ghost btn-sm" data-sfaction="addProcess">+ Add process</button></div>
      <div class="sf-process-grid">${S.processes.map((p,i)=>renderProcessCard(p,i)).join('')}</div>
    </div>`;
  }
  function renderProcessCard(p,i){
    const showNote = p.fit==='Partial fit'||p.fit==='Gap'||p.fit==='Unknown'||p.demoStatus==='Discussed only'||p.demoStatus==='Not demonstrated';
    return `<div class="sf-proc ${p.selected?'sel':''}" data-sfproc="${i}">
      <label class="sf-proc-head"><input type="checkbox" data-sfpsel="${i}" ${p.selected?'checked':''}><span>${esc(p.name)}</span><small>${p.id}</small></label>
      ${p.selected?`
        <div class="sf-row2">
          <div class="sf-field"><label>Demo status</label><select data-sfpdemo="${i}">${['Not reviewed','Demonstrated','Discussed only','Not demonstrated','Not applicable'].map(x=>`<option ${p.demoStatus===x?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="sf-field"><label>Fit</label><select data-sfpfit="${i}">${['Not reviewed','Full fit','Partial fit','Gap','Unknown'].map(x=>`<option ${p.fit===x?'selected':''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="sf-demo-flag ${p.demoStatus==='Demonstrated'?'yes':'no'}">${p.demoStatus==='Demonstrated'?'✓ Demonstrated':'! Demo evidence not confirmed'}</div>
        ${showNote?`<div class="sf-field"><label>Short note</label><textarea data-sfpnote="${i}" placeholder="Evidence or exception for handoff.">${esc(p.notes)}</textarea></div>`:''}
      `:''}
    </div>`;
  }

  /* ── Tab 3: Gap register ────────────────────────────────────────── */
  function nextGapId(){ const max=Math.max(0,...S.gaps.map(g=>Number((g.id||'').replace(/\D/g,''))||0)); return `GAP-${String(max+1).padStart(3,'0')}`; }
  function newGap(v={}){ return {id:nextGapId(),process:'',demoEvidence:'Yes',need:'',classification:'UNKNOWN',priority:'Should Have',goLive:'Unknown',currentProcess:'',standardBehavior:'',gapDescription:'',businessRationale:'',acceptance:'',dependencies:'',assumptions:'',openQuestions:'',...v}; }
  function renderGaps(){
    return `<div class="sf-card">
      <div class="sf-card-head"><h3>Gap register</h3><button class="btn btn-primary btn-sm" data-sfaction="addGap">+ Capture gap</button></div>
      <div id="sfGapList">${S.gaps.length?S.gaps.map((g)=>renderGapCard(g)).join(''):'<p class="sf-muted">No gaps captured. If all selected processes are demonstrated and Full fit, that is a valid outcome.</p>'}</div>
    </div>`;
  }
  function renderGapCard(g){
    const idx=S.gaps.indexOf(g), deep=materialGap(g), open=openGapId===g.id;
    return `<div class="sf-gap ${g.priority==='Must Have'?'must':''}" data-sfgap="${g.id}">
      <div class="sf-gap-sum">
        <span class="sf-gap-id">${esc(g.id)}</span>
        <span class="sf-pill ${g.classification==='UNKNOWN'?'warn':g.classification==='OUT OF SCOPE'?'bad':'blue'}">${esc(g.classification)}</span>
        <span class="sf-gap-need">${esc(g.need||'Requirement not entered')}</span>
        <span>${esc(g.priority)}</span>
        <button class="btn btn-ghost btn-sm" data-sfgaptoggle="${g.id}">${open?'Close':'Details'}</button>
        <button class="btn btn-danger btn-sm" data-sfgapdel="${idx}">×</button>
      </div>
      <div class="sf-gap-detail ${open?'open':''}">
        ${deep?'<div class="sf-callout">Material gap — capture the business rule, evidence, acceptance, and dependencies (do not design the solution).</div>':''}
        <div class="sf-row3">
          <div class="sf-field"><label>Process</label><select data-sfgfield="process" data-sfgid="${g.id}">${S.processes.map(p=>`<option ${p.name===g.process?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
          <div class="sf-field"><label>Demo evidence</label><select data-sfgfield="demoEvidence" data-sfgid="${g.id}">${['Yes','Partially','No','Not applicable'].map(x=>`<option ${g.demoEvidence===x?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="sf-field"><label>Classification</label><select data-sfgfield="classification" data-sfgid="${g.id}">${CLASSIFICATIONS.map(x=>`<option ${x===g.classification?'selected':''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="sf-field"><label>Customer need / outcome</label><textarea data-sfgfield="need" data-sfgid="${g.id}">${esc(g.need)}</textarea></div>
        <div class="sf-row2">
          <div class="sf-field"><label>Current process</label><textarea data-sfgfield="currentProcess" data-sfgid="${g.id}">${esc(g.currentProcess)}</textarea></div>
          <div class="sf-field"><label>Standard behavior demonstrated</label><textarea data-sfgfield="standardBehavior" data-sfgid="${g.id}">${esc(g.standardBehavior)}</textarea></div>
        </div>
        <div class="sf-field"><label>Precise gap / difference</label><textarea data-sfgfield="gapDescription" data-sfgid="${g.id}">${esc(g.gapDescription)}</textarea></div>
        <div class="sf-row2">
          <div class="sf-field"><label>Priority</label><select data-sfgfield="priority" data-sfgid="${g.id}">${['Must Have','Should Have','Could Have'].map(x=>`<option ${g.priority===x?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="sf-field"><label>Required for go-live?</label><select data-sfgfield="goLive" data-sfgid="${g.id}">${['Unknown','Yes','No'].map(x=>`<option ${g.goLive===x?'selected':''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="sf-field"><label>Acceptance criteria</label><textarea data-sfgfield="acceptance" data-sfgid="${g.id}">${esc(g.acceptance)}</textarea></div>
        <div class="sf-field"><label>Dependencies / assumptions</label><textarea data-sfgfield="dependencies" data-sfgid="${g.id}">${esc(g.dependencies)}</textarea></div>
        <div class="sf-field"><label>Open questions</label><textarea data-sfgfield="openQuestions" data-sfgid="${g.id}">${esc(g.openQuestions)}</textarea></div>
      </div>
    </div>`;
  }

  /* ── Tab 4: Integration & drivers ───────────────────────────────── */
  function nextIntId(){ const max=Math.max(0,...S.interfaces.map(i=>Number((i.id||'').replace(/\D/g,''))||0)); return `INT-${String(max+1).padStart(3,'0')}`; }
  function renderIntegration(){
    const d=S.drivers;
    const sel=(label,path,opts)=>`<div class="sf-field"><label>${esc(label)}</label><select data-sfbind="${path}">${opts.map(x=>`<option ${val(S,path)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;
    const f=(label,path,ph='')=>`<div class="sf-field"><label>${esc(label)}</label><input data-sfbind="${path}" value="${esc(val(S,path))}" placeholder="${esc(ph)}"></div>`;
    return `<div class="sf-card">
      <div class="sf-card-head"><h3>Additional interfaces</h3><button class="btn btn-ghost btn-sm" data-sfaction="addInterface">+ Add interface</button></div>
      <div class="sf-table-wrap"><table class="sf-table"><thead><tr><th>ID</th><th>Source</th><th>Target</th><th>Object</th><th>Method</th><th>Owner</th><th></th></tr></thead>
      <tbody id="sfIntBody">${S.interfaces.length?S.interfaces.map((it,idx)=>renderIntRow(it,idx)).join(''):'<tr><td colspan="7" class="sf-muted">No additional interfaces recorded.</td></tr>'}</tbody></table></div>
    </div>
    <div class="sf-card"><h3>Mobility, outputs &amp; constraints</h3>
      <div class="sf-row2">${sel('Offline required?','drivers.offline',['Unknown','Yes','No'])}${f('Offline duration','drivers.offlineDuration','e.g. up to 10 hours')}</div>
      <div class="sf-row2">${f('Devices','drivers.devices','e.g. Zebra Android handhelds')}${sel('Custom outputs / labels?','drivers.customOutput',['Unknown','Yes','No'])}</div>
      <div class="sf-row2">${sel('Volume concern?','drivers.volumeConcern',['Unknown','Yes','No'])}${f('Volume','drivers.volume','e.g. ~4,500/day')}</div>
    </div>`;
  }
  function renderIntRow(it,idx){
    return `<tr data-sfint="${idx}">
      <td><b>${esc(it.id)}</b></td>
      <td><input data-sfifield="source" value="${esc(it.source)}"></td>
      <td><input data-sfifield="target" value="${esc(it.target)}"></td>
      <td><input data-sfifield="object" value="${esc(it.object)}"></td>
      <td><select data-sfifield="method">${['REST API','SOAP / web service','File','Database','Middleware / iPaaS','Connector','Other','TBD'].map(x=>`<option ${x===it.method?'selected':''}>${x}</option>`).join('')}</select></td>
      <td><select data-sfifield="owner">${['Cloud Inventory','Customer','Partner','Shared','TBD'].map(x=>`<option ${x===it.owner?'selected':''}>${x}</option>`).join('')}</select></td>
      <td><button class="btn btn-danger btn-sm" data-sfintdel="${idx}">×</button></td>
    </tr>`;
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
        `${esc(o.customer||'Customer not entered')}${o.opportunityId?` · ${esc(o.opportunityId)}`:''}`,
        `INTERNAL · ${r.score}% READY`)}
    <div class="hd-summary">
      <div><b>${sel.length}</b><span>Processes in scope</span></div>
      <div><b>${demoed.length}</b><span>Actually demoed</span></div>
      <div><b>${S.gaps.length}</b><span>Gaps / exceptions</span></div>
      <div><b>${S.interfaces.length}</b><span>Additional interfaces</span></div>
    </div>
    <h2 class="hd-h2">Business context</h2>
    <p><strong>Products:</strong> ${esc(o.products||'—')} &nbsp;·&nbsp; <strong>Locations:</strong> ${esc(o.locations||'—')} &nbsp;·&nbsp; <strong>Users:</strong> ${esc(o.users||'—')} &nbsp;·&nbsp; <strong>Target go-live:</strong> ${esc(o.goLive||'—')}</p>
    <p><strong>Business problem:</strong> ${esc(o.problem||'—')}</p>
    <p><strong>Desired outcome:</strong> ${esc(o.outcome||'—')}</p>
    <h2 class="hd-h2">Architecture &amp; delivery ownership</h2>
    <p><strong>Relationship:</strong> ${esc(a.relationship||'—')} &nbsp;·&nbsp; <strong>ERP/SOR:</strong> ${esc(a.erp||'—')} &nbsp;·&nbsp; <strong>Version:</strong> ${esc(a.version||'—')}</p>
    ${a.relationship!=='Standalone'?`<p><strong>Primary integration:</strong> ${esc(a.integrationMethod||'—')} &nbsp;·&nbsp; <strong>Integration delivery:</strong> ${esc(a.integrationOwner||'—')}</p>`:''}
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
    <p><strong>Cloud Inventory product(s):</strong> ${esc(o.products||'To be confirmed')} &nbsp;·&nbsp; <strong>Operating scope:</strong> ${esc(o.locations||'To be confirmed')} &nbsp;·&nbsp; <strong>Estimated users:</strong> ${esc(o.users||'To be confirmed')}</p>
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
      .hd-brand{font-weight:800;letter-spacing:.5px;color:var(--navy);font-size:15px;}
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
    document.querySelectorAll('.sf-tab').forEach(t=>t.onclick=()=>{ activeTab=t.dataset.sftab; document.querySelectorAll('.sf-tab').forEach(x=>x.classList.toggle('active',x===t)); showActivePane(); if(activeTab==='handoff'){ const r=computeReadiness(); const pane=document.querySelector('[data-sfpane="handoff"]'); if(pane) pane.innerHTML=renderReadinessTab(r);} });
  }
  function showActivePane(){ document.querySelectorAll('.sf-pane').forEach(p=>p.style.display = p.dataset.sfpane===activeTab?'block':'none'); }

  function wireBindings(){
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
    const rel=document.querySelector('[data-sfbind="architecture.relationship"]');
    if(rel) rel.addEventListener('change',()=>{ const pane=document.querySelector('[data-sfpane="context"]'); if(pane){pane.innerHTML=renderContext(); wireBindings();} });
    const inv=document.querySelector('[data-sfbind="partner.involved"]');
    if(inv) inv.addEventListener('change',()=>{ const pane=document.querySelector('[data-sfpane="context"]'); if(pane){pane.innerHTML=renderContext(); wireBindings();} });
    if(!canWrite) disableInputs();
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

  /* Expose entry point for the tab switch. */
  window.initSolutionFit = initSolutionFit;
})();
