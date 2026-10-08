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
  let _selectedScenarios = [];
  let _eligibleOwners = [];
  let _transferPreview = null;
  let _lastTransfer = null;
  let _transferReturnFocus = null;

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
      <div class="ac-card-meta">${c.opportunityCount??c.scenarioCount??0} opportunit${(c.opportunityCount??c.scenarioCount)===1?'y':'ies'} · ${c.versionCount||0} saved version${c.versionCount===1?'':'s'}${c.ownerUsername?` · owner: ${esc(c.ownerUsername)}`:''}</div>
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
      const rows = (Array.isArray(list)?list:(list.scenarios||[])).filter(s =>
        String(s.customer_id || s.customerId || '') === String(customerId) &&
        Boolean(s.is_current ?? s.isCurrent)
      );
      rows.sort((a,b)=> new Date(b.updated_at||b.updatedAt||0) - new Date(a.updated_at||a.updatedAt||0));
      _selectedScenarios = rows;
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
        <button class="btn btn-ghost btn-sm" onclick="acOpenTransfer()">Transfer Ownership</button>
      </div>
      ${_lastTransfer&&String(_lastTransfer.customerId)===String(_selected.id)?`<div class="ac-transfer-success" role="status"><b>Ownership transferred from ${esc(_lastTransfer.oldOwner)} to ${esc(_lastTransfer.newOwner)}.</b><span>${esc(new Date(_lastTransfer.transferredAt).toLocaleString())} · Audit reference ${esc(_lastTransfer.transferId)}</span></div>`:''}
      <h4 class="ac-sub">Saved scenarios</h4>
      ${rows.length ? `<div class="ac-scen-list">${rows.map(scenHtml).join('')}</div>`
                    : '<div class="empty-state"><p>No saved scenarios yet. Start a new one above.</p></div>'}`;
  }
  function scenHtml(s) {
    const updated = s.updated_at || s.updatedAt;
    const when = updated ? new Date(updated).toLocaleDateString() : '';
    const outcome = s.outcome ? `<span class="ac-outcome ac-${s.outcome}">${esc(s.outcome)}</span>` : '';
    return `<button class="ac-scen" onclick="acLoadScenario('${esc(s.id)}')">
      <div class="ac-scen-name">${esc(s.name||'Untitled')} ${outcome}</div>
      <div class="ac-scen-meta">${esc(s.company||'')}${when?` · updated ${esc(when)}`:''}${(s.owner_username||s.rep)?` · ${esc(s.owner_username||s.rep)}`:''}</div>
    </button>`;
  }

  async function acLoadScenario(id) {
    if (typeof switchTab === 'function') switchTab('calc');
    if (typeof loadScenario === 'function') await loadScenario(id);
    if (typeof showToast === 'function') showToast('Scenario loaded. Admin edits are recorded in the audit log.');
  }
  function acNewScenario() {
    /* Start from an intentionally blank, ID-bound customer context. */
    window.clearForm?.();
    window._calcScenarioId = null;
    window._activeCustomerMeta = { id:_selected.id, name:_selected.name, owner:_selected.ownerUsername, canEditCustomer:true };
    if (typeof switchTab === 'function') switchTab('calc');
    const cn = document.getElementById('companyName'); if (cn) cn.value = _selected.name;
    window.currentScenarioCustomerId = _selected.id;
    window._sfSelectedCustomerId = _selected.id;
    if (typeof showToast === 'function') showToast(`New scenario for ${_selected.name} — enter values and save.`);
  }
  async function acOpenSolutionFit() {
    /* Use the canonical switcher path so customer and scenario identity change atomically. */
    if (typeof window.selectCustomerContextById === 'function') {
      await window.selectCustomerContextById(_selected.id,{targetTab:'solfit'});
      return;
    }
    window.showToast?.('Customer context could not be verified. Please use Switch customer.');
  }
  function transferMessage(message, severity='error') {
    const node=document.getElementById('acTransferMessage');
    if(node){node.textContent=message||'';node.className=`ac-transfer-message ${severity}`;node.hidden=!message;}
    if(message&&window.AppAlerts?.notify)window.AppAlerts.notify(severity,message,{key:'customer-owner-transfer',persist:severity==='error'||severity==='warning'});
  }
  function closeTransferDialog(){document.getElementById('acTransferOverlay')?.remove();_transferPreview=null;const target=_transferReturnFocus;_transferReturnFocus=null;if(target&&document.contains(target))target.focus();}
  function invalidateTransferPreview(){_transferPreview=null;const area=document.getElementById('acTransferImpact');if(area)area.innerHTML='<p class="ac-transfer-help">Select an eligible Sales Rep, then preview the transfer before confirming.</p>';const button=document.getElementById('acTransferConfirm');if(button)button.disabled=true;transferMessage('','info');}
  async function loadEligibleOwners(){
    if(_eligibleOwners.length)return _eligibleOwners;
    const response=await apiFetch('/api/customers/ownership-eligible-users');
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||'Eligible Sales Reps could not be loaded.');
    _eligibleOwners=Array.isArray(body.owners)?body.owners:[];
    return _eligibleOwners;
  }
  async function acOpenTransfer(){
    if(!_selected)return;
    _transferReturnFocus=document.activeElement;
    _transferPreview=null;
    try{await loadEligibleOwners();}catch(error){window.AppAlerts?.error?.(error.message,{persist:true});return;}
    const overlay=document.createElement('div');overlay.id='acTransferOverlay';overlay.className='modal-overlay open ac-transfer-overlay';
    const options=_eligibleOwners.map(owner=>`<option value="${esc(owner.id)}" ${String(owner.id)===String(_selected.ownerId)?'disabled':''}>${esc(owner.name)}${String(owner.id)===String(_selected.ownerId)?' — current owner':''}</option>`).join('');
    overlay.innerHTML=`<div class="modal ac-transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="acTransferTitle">
      <header><div><span class="ac-transfer-kicker">Admin · Customer ownership</span><h2 id="acTransferTitle">Transfer Ownership</h2><p>Transfer current operational responsibility without rewriting historical authorship.</p></div><button class="modal-close" type="button" onclick="closeTransferDialog()" aria-label="Close">×</button></header>
      <div class="ac-transfer-body">
        <div class="ac-transfer-facts"><div><span>Customer</span><b>${esc(_selected.name)}</b></div><div><span>Current owner</span><b>${esc(_selected.ownerUsername||'Unknown')}</b></div><div><span>Effective</span><b>${esc(new Date().toLocaleString())}</b></div></div>
        <label>New owner<select id="acTransferOwner"><option value="">Select eligible Sales Rep…</option>${options}</select></label>
        <label>Reason for transfer <span aria-hidden="true">*</span><textarea id="acTransferReason" rows="3" maxlength="1000" placeholder="For example: territory reassignment, employee departure, or account coverage change"></textarea></label>
        <div id="acTransferMessage" class="ac-transfer-message" role="alert" hidden></div>
        <div class="ac-transfer-preview-actions"><button id="acTransferPreviewButton" class="btn btn-ghost" type="button" onclick="acPreviewTransfer()">Preview impact</button></div>
        <section id="acTransferImpact" class="ac-transfer-impact" aria-live="polite"><p class="ac-transfer-help">Select an eligible Sales Rep, then preview the transfer before confirming.</p></section>
      </div>
      <footer><button class="btn btn-ghost" type="button" onclick="closeTransferDialog()">Cancel</button><button id="acTransferConfirm" class="btn btn-primary" type="button" onclick="acConfirmTransfer()" disabled>Transfer Ownership</button></footer>
    </div>`;
    document.body.appendChild(overlay);
    const owner=overlay.querySelector('#acTransferOwner'),reason=overlay.querySelector('#acTransferReason');owner.onchange=invalidateTransferPreview;reason.oninput=()=>{transferMessage('','info');};
    overlay.addEventListener('keydown',event=>{
      if(event.key==='Escape'){closeTransferDialog();return;}
      if(event.key!=='Tab')return;
      const focusable=[...overlay.querySelectorAll('button:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hidden&&node.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });owner.focus();
  }
  function countRows(counts){
    const labels={customer:'Customer',opportunities:'Opportunities',scenarioVersions:'Scenario versions',activeProspectLinks:'Active Prospect Links',prospectSubmissions:'Prospect submissions',stakeholders:'Stakeholders',solutionFits:'Solution Fits',jointProjectPlans:'Joint Project Plans',proposals:'Proposals',publishedRecords:'Executive / published records',valueHistory:'Value History events',repConfirmedEvents:'Rep Confirmed events',buyerEvidenceRecords:'Buyer Evidence records',driverResonanceRecords:'Driver Resonance records',notificationHistory:'Notification history',auditHistory:'Audit history'};
    return Object.entries(labels).map(([key,label])=>`<div><span>${esc(label)}</span><b>${Number(counts?.[key]||0).toLocaleString()}</b></div>`).join('');
  }
  function renderTransferPreview(preview){
    const area=document.getElementById('acTransferImpact');if(!area)return;
    area.innerHTML=`<h3>Impact preview</h3><div class="ac-transfer-counts">${countRows(preview.counts)}</div><div class="ac-transfer-columns"><section><h4>Will change</h4><ul>${preview.willChange.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section><section><h4>Will be preserved</h4><ul>${preview.willPreserve.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section></div><p class="ac-transfer-confirmation">Review the impact, then select <b>Transfer Ownership</b> to confirm. No transfer occurs during preview.</p>`;
  }
  async function acPreviewTransfer(){
    const newOwnerId=document.getElementById('acTransferOwner')?.value;
    if(!newOwnerId){transferMessage('Select a new Sales Rep.','warning');return;}
    const button=document.getElementById('acTransferPreviewButton');button.disabled=true;button.textContent='Loading impact…';
    try{
      const response=await apiFetch(`/api/customers/${encodeURIComponent(_selected.id)}/ownership-transfer-preview?newOwnerId=${encodeURIComponent(newOwnerId)}`),body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Ownership impact could not be prepared.');
      _transferPreview=body;renderTransferPreview(body);document.getElementById('acTransferConfirm').disabled=false;transferMessage('Impact preview is current. Confirm only after reviewing what changes and what remains preserved.','info');
    }catch(error){_transferPreview=null;document.getElementById('acTransferConfirm').disabled=true;transferMessage(error.message,'error');}
    finally{button.disabled=false;button.textContent='Preview impact';}
  }
  async function refreshSelectedCustomer(){
    const customerId=_selected.id,customersResponse=await apiFetch('/api/customers');
    if(customersResponse.ok)_customers=await customersResponse.json();
    _selected=_customers.find(customer=>String(customer.id)===String(customerId))||_selected;
    const scenarioResponse=await apiFetch('/api/scenarios?all=true'),list=scenarioResponse.ok?await scenarioResponse.json():[];
    _selectedScenarios=(Array.isArray(list)?list:(list.scenarios||[])).filter(s=>String(s.customer_id||s.customerId||'')===String(customerId)&&Boolean(s.is_current??s.isCurrent));
    _selectedScenarios.sort((a,b)=>new Date(b.updated_at||b.updatedAt||0)-new Date(a.updated_at||a.updatedAt||0));renderDetail(_selectedScenarios);
  }
  async function acConfirmTransfer(){
    if(!_transferPreview){transferMessage('Preview the impact before confirming the transfer.','warning');return;}
    const reason=String(document.getElementById('acTransferReason')?.value||'').trim();
    if(!reason){transferMessage('A reason for transfer is required.','warning');document.getElementById('acTransferReason')?.focus();return;}
    const button=document.getElementById('acTransferConfirm');button.disabled=true;button.textContent='Transferring…';
    try{
      const response=await apiFetch(`/api/customers/${encodeURIComponent(_selected.id)}/ownership-transfer`,{method:'POST',body:JSON.stringify({newOwnerId:_transferPreview.newOwner.id,expectedCurrentOwnerId:_transferPreview.expectedCurrentOwnerId,reason})}),body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Ownership could not be transferred. No changes were made.');
      _lastTransfer={customerId:body.customer.id,oldOwner:body.oldOwner.name,newOwner:body.newOwner.name,transferredAt:body.transferredAt,transferId:body.transferId};closeTransferDialog();await refreshSelectedCustomer();window.AppAlerts?.success?.(`Ownership transferred from ${body.oldOwner.name} to ${body.newOwner.name}.`,{key:'customer-owner-transfer-success'});
    }catch(error){button.disabled=false;button.textContent='Transfer Ownership';transferMessage(error.message,'error');}
  }
  function acBack() { renderList(''); }
  function acSearch(v) { renderList(v); }

  window.initAdminCustomers = initAdminCustomers;
  window.acOpen = acOpen; window.acBack = acBack; window.acSearch = acSearch;
  window.acLoadScenario = acLoadScenario; window.acNewScenario = acNewScenario; window.acOpenSolutionFit = acOpenSolutionFit;
  window.acOpenTransfer=acOpenTransfer;window.acPreviewTransfer=acPreviewTransfer;window.acConfirmTransfer=acConfirmTransfer;window.closeTransferDialog=closeTransferDialog;window.invalidateTransferPreview=invalidateTransferPreview;
})();
