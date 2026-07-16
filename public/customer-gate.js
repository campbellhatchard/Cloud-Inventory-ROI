/* ═══════════════════════════════════════════════════════════════════
   customer-gate.js — Calculator entry experience (v2.8)

   - Soft customer-selection gate shown before the calculator form
   - Recent customers quick-resume
   - Business-case completeness meter
   - Unsaved-changes guard when switching customer/tab
   Reuses companies.js (loadCompanies/getCompanies/checkCompanyOnEntry/
   promptScenarioForCompany) so behavior matches the other company-centric tabs.
   ═══════════════════════════════════════════════════════════════════ */

let _calcDirty = false;           // unsaved-changes flag
let _gateInitialized = false;

function markCalcDirty() { _calcDirty = true; updateCompletenessMeter(); }
function clearCalcDirty() { _calcDirty = false; }

/* ── Entry point: called when the calc tab initializes ── */
async function initCalcTab() {
  if (!_gateInitialized) {
    _gateInitialized = true;
    if (typeof loadCompanies === 'function') await loadCompanies();
    bindCalcDirtyTracking();
  }
  const company = document.getElementById('companyName');
  const hasActive = company && company.value && company.value.trim();
  if (!hasActive) showCustomerGate(); else showCalcBody();
}

/* ── Gate visibility ── */
function showCustomerGate() {
  if (_calcDirty && !confirmDiscardChanges()) return;
  const gate = document.getElementById('customerGate');
  const body = document.getElementById('calcBody');
  const switchBtn = document.getElementById('calcSwitchCustomerBtn');
  if (gate) gate.style.display = 'block';
  if (body) body.style.display = 'none';
  if (switchBtn) switchBtn.style.display = 'none';
  cgRenderList('');
  cgRenderRecent();
  const s = document.getElementById('cgNewCompany'); if (s) s.focus();
}
function showCalcBody() {
  const gate = document.getElementById('customerGate');
  const body = document.getElementById('calcBody');
  const switchBtn = document.getElementById('calcSwitchCustomerBtn');
  if (gate) gate.style.display = 'none';
  if (body) body.style.display = 'block';
  if (switchBtn) switchBtn.style.display = '';
  updateBreadcrumb();
  updateCompletenessMeter();
}
function skipCustomerGate() { showCalcBody(); }

/* ── New customer ── */
function cgCreateNew() {
  const input = document.getElementById('cgNewCompany');
  const typed = input ? input.value.trim() : '';
  if (!typed) { if (input) input.focus(); return; }
  const proceed = (finalName) => {
    if (!finalName) return;
    if (typeof clearForm === 'function') clearForm();
    const cn = document.getElementById('companyName');
    if (cn) { cn.value = finalName; cn.dispatchEvent(new Event('change')); }
    if (typeof getCompanies === 'function' && !getCompanies().some(c => c.name.toLowerCase() === finalName.toLowerCase())) {
      getCompanies().push({ name: finalName, scenarios: 0, plans: 0, stakeholders: 0 });
    }
    rememberRecentCustomer(finalName);
    clearCalcDirty();
    showCalcBody();
    if (typeof recalc === 'function') recalc();
  };
  if (typeof checkCompanyOnEntry === 'function') checkCompanyOnEntry(typed, proceed);
  else proceed(typed);
}

/* ── Existing customer list ── */
function cgRenderList(term) {
  const host = document.getElementById('cgList');
  if (!host) return;
  const q = (term || '').trim().toLowerCase();
  const list = (typeof getCompanies === 'function' ? getCompanies() : [])
    .filter(c => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) {
    host.innerHTML = `<div class="cg-empty">${q ? 'No matches.' : 'No customers yet — create one to start.'}</div>`;
    return;
  }
  host.innerHTML = list.map(c => {
    const meta = [];
    if (c.scenarios)    meta.push(c.scenarios + ' scenario' + (c.scenarios !== 1 ? 's' : ''));
    if (c.plans)        meta.push(c.plans + ' plan' + (c.plans !== 1 ? 's' : ''));
    if (c.stakeholders) meta.push(c.stakeholders + ' stakeholder' + (c.stakeholders !== 1 ? 's' : ''));
    return `<button class="cg-list-item" onclick="cgSelectExisting('${escapeHtml(c.name).replace(/'/g,"\\'")}')">
      <span class="cg-li-name">${escapeHtml(c.name)}</span>
      <span class="cg-li-meta">${escapeHtml(meta.join(' · ') || 'No records yet')}</span>
    </button>`;
  }).join('');
}
function cgSelectExisting(name) {
  const cn = document.getElementById('companyName');
  if (cn) { cn.value = name; }
  rememberRecentCustomer(name);
  clearCalcDirty();
  showCalcBody();
  if (typeof promptScenarioForCompany === 'function') {
    promptScenarioForCompany(name, () => { if (typeof recalc === 'function') recalc(); });
  } else if (typeof recalc === 'function') recalc();
}

/* ── Recent customers ── */
let _recentCustomers = [];
function rememberRecentCustomer(name) {
  if (!name) return;
  _recentCustomers = [name, ..._recentCustomers.filter(n => n.toLowerCase() !== name.toLowerCase())].slice(0, 5);
}
function cgRenderRecent() {
  const host = document.getElementById('cgRecent');
  if (!host) return;
  if (!_recentCustomers.length) { host.innerHTML = ''; return; }
  host.innerHTML = `<div class="cg-recent-label">Recent</div>
    <div class="cg-recent-chips">${_recentCustomers.map(n =>
      `<button class="cg-recent-chip" onclick="cgSelectExisting('${escapeHtml(n).replace(/'/g,"\\'")}')">${escapeHtml(n)}</button>`
    ).join('')}</div>`;
}

/* ── Breadcrumb: Company › Scenario ── */
function updateBreadcrumb() {
  const bc = document.getElementById('calcBreadcrumb');
  if (!bc) return;
  const company = (document.getElementById('companyName')?.value || '').trim();
  const scenario = (document.getElementById('scenarioName')?.value || '').trim();
  if (!company) { bc.innerHTML = ''; return; }
  bc.innerHTML = `<span class="bc-home" onclick="showCustomerGate()" title="Switch customer">⌂</span>` +
    `<span class="bc-sep">›</span><span class="bc-company">${escapeHtml(company)}</span>` +
    (scenario ? `<span class="bc-sep">›</span><span class="bc-scenario">${escapeHtml(scenario)}</span>` : '');
}

/* ── Business-case completeness meter ── */
const COMPLETENESS_FIELDS = [
  { id:'userCount',       label:'team size' },
  { id:'annualWriteOff',  label:'write-off value' },
  { id:'inventoryValue',  label:'inventory value' },
  { id:'invTurnsCurrent', label:'inventory turns' },
  { id:'otifBaseline',    label:'OTIF baseline' },
  { id:'itCost',          label:'IT cost' },
  { id:'revenue',         label:'revenue' }
];
function updateCompletenessMeter() {
  const meter = document.getElementById('caseCompleteness');
  if (!meter) return;
  let filled = 0;
  const missing = [];
  COMPLETENESS_FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    const v = el ? parseFloat(el.value) : 0;
    if (v > 0) filled++; else missing.push(f.label);
  });
  const total = COMPLETENESS_FIELDS.length;
  const pct = Math.round(filled / total * 100);
  const tone = pct >= 80 ? 'strong' : pct >= 50 ? 'ok' : 'weak';
  const hint = missing.length
    ? `Add ${missing.slice(0, 2).join(' and ')}${missing.length > 2 ? ` (+${missing.length - 2} more)` : ''} to strengthen the case.`
    : 'All core value drivers captured — a strong, defensible case.';
  meter.innerHTML = `
    <div class="cc-top"><span class="cc-label">Business case strength</span>
      <span class="cc-pct cc-${tone}">${filled} of ${total} drivers · ${pct}%</span></div>
    <div class="cc-track"><div class="cc-fill cc-${tone}" style="width:${pct}%;"></div></div>
    <div class="cc-hint">${hint}</div>`;
}

/* ── Unsaved-changes guard ── */
function confirmDiscardChanges() {
  return confirm('You have unsaved changes to this business case. Switch anyway? Your unsaved edits will be lost.');
}
function bindCalcDirtyTracking() {
  const body = document.getElementById('calcBody');
  if (!body) return;
  body.addEventListener('input', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) markCalcDirty();
  });
  if (typeof window !== 'undefined') {
    const origSave = window.saveScenario;
    if (typeof origSave === 'function' && !origSave._dirtyWrapped) {
      window.saveScenario = function (...args) {
        const r = origSave.apply(this, args);
        clearCalcDirty();
        return r;
      };
      window.saveScenario._dirtyWrapped = true;
    }
  }
}
