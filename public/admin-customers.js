/* ═══════════════════════════════════════════════════════════════════
   admin-customers.js — Admin "Customers" command center (Solution Fit v2)
   Admin-only landing: list all customers across the team, search, drill into
   a customer to see their saved scenarios, then load one or start a new one.
   Read/edit follows the admin-on-behalf model (server logs admin edits).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let _customers = [];
  let _selected = null;

  const esc = v => String(v==null?'':v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const app = () => document.getElementById('adminCustomersApp');
  function user(){ try { return (window.ciAuth && window.ciAuth.getUser) ? (window.ciAuth.getUser()||{}) : {}; } catch(e){ return {}; } }

  async function initAdminCustomers() {
    if (!(typeof clientHasRole==='function'&&clientHasRole(user(),'admin','Admin'))) { app().innerHTML = '<div class="empty-state"><p>Admin access required.</p></div>'; return; }
    app().innerHTML = '<div class="ac-loading">Loading customers…</div>';
    try {
      const resp = await apiFetch('/api/customers');   // admin → all customers
      _customers = (resp && resp.ok) ? await resp.json() : [];
      renderList('');
    } catch (e) { app().innerHTML = '<div class="empty-state"><p>Could not load customers.</p></div>'; }
  }

  function renderList(filter) {
    const term = (filter||'').trim().toLowerCase();
    const rows = term ? _customers.filter(c => (c.name||'').toLowerCase().includes(term) || (c.ownerUsername||'').toLowerCase().includes(term)) : _customers;
    app().innerHTML = `
      <div class="ac-searchbar">
        <input id="acSearch" placeholder="Search customers or owner…" value="${esc(filter||'')}" oninput="acSearch(this.value)">
        <span class="ac-count">${rows.length} of ${_customers.length}</span>
      </div>
      ${rows.length ? `<div class="ac-grid">${rows.map(cardHtml).join('')}</div>`
                    : '<div class="empty-state"><p>No customers match your search.</p></div>'}`;
    const s = document.getElementById('acSearch'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }
  function cardHtml(c) {
    return `<button class="ac-card" onclick="acOpen('${esc(c.id)}')">
      <div class="ac-card-name">${esc(c.name)}</div>
      <div class="ac-card-meta">${c.scenarioCount||0} scenario${c.scenarioCount===1?'':'s'}${c.ownerUsername?` · owner: ${esc(c.ownerUsername)}`:''}</div>
    </button>`;
  }

  async function acOpen(customerId) {
    _selected = _customers.find(c => c.id === customerId);
    if (!_selected) return;
    app().innerHTML = `<div class="ac-detail-head">
        <button class="btn btn-ghost btn-sm" onclick="acBack()">‹ All customers</button>
        <h3>${esc(_selected.name)}</h3>
        <span class="ac-owner">${_selected.ownerUsername?`owner: ${esc(_selected.ownerUsername)}`:''}</span>
      </div>
      <div class="ac-loading">Loading scenarios…</div>`;
    try {
      const resp = await apiFetch('/api/scenarios?all=true');
      const list = (resp && resp.ok) ? await resp.json() : [];
      const rows = (Array.isArray(list)?list:(list.scenarios||[])).filter(s => s.customerId === customerId && s.isCurrent);
      rows.sort((a,b)=> new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
      renderDetail(rows);
    } catch (e) { app().querySelector('.ac-loading').textContent = 'Could not load scenarios.'; }
  }

  function renderDetail(rows) {
    app().innerHTML = `<div class="ac-detail-head">
        <button class="btn btn-ghost btn-sm" onclick="acBack()">‹ All customers</button>
        <h3>${esc(_selected.name)}</h3>
        <span class="ac-owner">${_selected.ownerUsername?`owner: ${esc(_selected.ownerUsername)}`:''}</span>
      </div>
      <div class="ac-actions">
        <button class="btn btn-primary btn-sm" onclick="acNewScenario()">＋ New scenario for this customer</button>
        <button class="btn btn-ghost btn-sm" onclick="acOpenSolutionFit()">Open Solution Fit &amp; Handoff</button>
      </div>
      <h4 class="ac-sub">Saved scenarios</h4>
      ${rows.length ? `<div class="ac-scen-list">${rows.map(scenHtml).join('')}</div>`
                    : '<div class="empty-state"><p>No saved scenarios yet. Start a new one above.</p></div>'}`;
  }
  function scenHtml(s) {
    const when = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '';
    const outcome = s.outcome ? `<span class="ac-outcome ac-${s.outcome}">${esc(s.outcome)}</span>` : '';
    return `<button class="ac-scen" onclick="acLoadScenario('${esc(s.id)}')">
      <div class="ac-scen-name">${esc(s.name||'Untitled')} ${outcome}</div>
      <div class="ac-scen-meta">${esc(s.company||'')}${when?` · updated ${esc(when)}`:''}${s.rep?` · ${esc(s.rep)}`:''}</div>
    </button>`;
  }

  async function acLoadScenario(id) {
    if (typeof switchTab === 'function') switchTab('calc');
    if (typeof loadScenario === 'function') await loadScenario(id);
    if (typeof showToast === 'function') showToast('Scenario loaded. Admin edits are recorded in the audit log.');
  }
  function acNewScenario() {
    /* Prefill the calculator with this customer, blank scenario. */
    if (typeof switchTab === 'function') switchTab('calc');
    const cn = document.getElementById('companyName'); if (cn) cn.value = _selected.name;
    window.currentScenarioCustomerId = _selected.id;
    window._sfSelectedCustomerId = _selected.id;
    if (typeof showToast === 'function') showToast(`New scenario for ${_selected.name} — enter values and save.`);
  }
  function acOpenSolutionFit() {
    window._sfSelectedCustomerId = _selected.id;
    window.currentScenarioCustomerId = _selected.id;
    if (typeof switchTab === 'function') switchTab('solfit');
  }
  function acBack() { renderList(''); }
  function acSearch(v) { renderList(v); }

  window.initAdminCustomers = initAdminCustomers;
  window.acOpen = acOpen; window.acBack = acBack; window.acSearch = acSearch;
  window.acLoadScenario = acLoadScenario; window.acNewScenario = acNewScenario; window.acOpenSolutionFit = acOpenSolutionFit;
})();
