/* ═══════════════════════════════════════════════════════════════════
   companies.js — shared company registry + selection flows (v2.3)

   One source of truth for company names across Scenarios, Action Plans
   and Stakeholder Maps. Provides:
     - loadCompanies()            fetch + cache the unified list
     - companyExists(name)        case-insensitive lookup → canonical name or null
     - checkCompanyOnEntry(...)   "already exists → use / create unique" prompt
     - promptScenarioForCompany() offer to load a scenario tied to the company
   ═══════════════════════════════════════════════════════════════════ */

let _companies = [];   // [{name, scenarios, plans, stakeholders}]

async function loadCompanies() {
  try {
    const resp = await apiFetch('/api/companies');
    if (resp && resp.ok) _companies = await resp.json();
  } catch (e) { console.error('loadCompanies:', e.message); }
  return _companies;
}

function getCompanies() { return _companies; }

/* Case-insensitive lookup. Returns the canonical stored spelling, or null. */
function companyExists(name) {
  if (!name) return null;
  const hit = _companies.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
  return hit ? hit.name : null;
}

/* Populate a <select> with the company list + a "+ New company…" option.
   selectedName is snapped to canonical spelling if it matches.            */
function fillCompanySelect(sel, selectedName) {
  if (!sel) return;
  const canonical = companyExists(selectedName) || '';
  const opts = ['<option value="">— Select a company —</option>'];
  _companies.forEach(c => {
    const meta = [];
    if (c.scenarios)    meta.push(c.scenarios + ' scenario' + (c.scenarios !== 1 ? 's' : ''));
    if (c.plans)        meta.push(c.plans + ' plan' + (c.plans !== 1 ? 's' : ''));
    if (c.stakeholders) meta.push(c.stakeholders + ' stakeholder' + (c.stakeholders !== 1 ? 's' : ''));
    const label = c.name + (meta.length ? '  (' + meta.join(' · ') + ')' : '');
    opts.push(`<option value="${escapeHtml(c.name)}" ${c.name === canonical ? 'selected' : ''}>${escapeHtml(label)}</option>`);
  });
  opts.push('<option value="__new__">+ New company…</option>');
  sel.innerHTML = opts.join('');
}

/* ── Check-existing-on-entry ──
   Given a typed name, resolve what the caller should use.
   onResolved(finalName) is called with the chosen canonical/new name,
   or is never called if the user cancels.                              */
function checkCompanyOnEntry(typedName, onResolved) {
  const name = (typedName || '').trim();
  if (!name) { onResolved(''); return; }

  const canonical = companyExists(name);
  if (!canonical) { onResolved(name); return; }        // brand new — just use it
  if (canonical === name) { onResolved(name); return; } // exact canonical match

  /* Near-duplicate (different casing/spacing) — ask */
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'companyExistsModal';
  modal.innerHTML = `<div class="modal" style="max-width:460px;">
    <div class="modal-title">Company already exists</div>
    <p style="font-size:13px;color:var(--gray-600);line-height:1.6;margin-bottom:1rem;">
      A company named <strong>${escapeHtml(canonical)}</strong> already exists.
      Use the existing company, or create a separate one with a unique name?
    </p>
    <div id="companyNewNameWrap" style="display:none;margin-bottom:1rem;">
      <div class="field" style="margin:0;">
        <label>Unique company name</label>
        <input type="text" id="companyNewName" value="${escapeHtml(name)}" placeholder="e.g. ${escapeHtml(canonical)} — EU Division"/>
      </div>
      <div id="companyNewErr" class="field-hint" style="color:var(--red);display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-cta" id="companyUseExisting" onclick="_companyUseExisting('${escapeHtml(canonical).replace(/'/g,"\\'")}')">Use existing</button>
      <button class="btn btn-ghost" id="companyCreateNew" onclick="_companyShowNewName()">Create separate company</button>
      <button class="btn btn-ghost" onclick="_companyCancel()">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  window._companyResolver = onResolved;
}

function _companyUseExisting(canonical) {
  const cb = window._companyResolver; _companyCleanup();
  if (cb) cb(canonical);
}
function _companyShowNewName() {
  document.getElementById('companyNewNameWrap').style.display = 'block';
  const btn = document.getElementById('companyCreateNew');
  btn.textContent = 'Confirm new company';
  btn.onclick = _companyConfirmNew;
  document.getElementById('companyNewName').focus();
}
function _companyConfirmNew() {
  const val = document.getElementById('companyNewName').value.trim();
  const err = document.getElementById('companyNewErr');
  if (!val) { err.textContent = 'Enter a name.'; err.style.display = 'block'; return; }
  if (companyExists(val)) { err.textContent = 'That name also exists — choose something unique.'; err.style.display = 'block'; return; }
  const cb = window._companyResolver; _companyCleanup();
  if (cb) cb(val);
}
function _companyCancel() { _companyCleanup(); }
function _companyCleanup() {
  const m = document.getElementById('companyExistsModal');
  if (m) m.remove();
  window._companyResolver = null;
}

/* ── Scenario prompt for a company ──
   Offers to load one of the company's scenarios, create a new one, or
   continue. Uses the in-memory savedScenarios cache — no API call.
   onContinue() is called when the user chooses to stay put.            */
function promptScenarioForCompany(company, onContinue) {
  const matches = (typeof savedScenarios !== 'undefined' ? savedScenarios : [])
    .filter(s => s.company && s.company.toLowerCase() === company.toLowerCase()
                 && s.isCurrent !== false);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'scenarioPromptModal';

  if (!matches.length) {
    modal.innerHTML = `<div class="modal" style="max-width:440px;">
      <div class="modal-title">No scenarios for ${escapeHtml(company)} yet</div>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:1rem;">
        Start a new ROI scenario for this company, or continue building here.
      </p>
      <div class="btn-row">
        <button class="btn btn-cta" onclick="_scenPromptCreateNew('${escapeHtml(company).replace(/'/g,"\\'")}')">Create new scenario</button>
        <button class="btn btn-ghost" onclick="_scenPromptContinue()">Continue without loading</button>
      </div>
    </div>`;
  } else {
    const user    = window.ciAuth ? window.ciAuth.getUser() : {};
    const isAdmin = user.role === 'admin';
    const rows = matches.map(s => {
      const roi = (s.roi !== undefined && s.roi !== null) ? Math.round(s.roi) + '% ROI' : '';
      const ben = (s.annualBenefit) ? '$' + (Math.abs(s.annualBenefit) >= 1e6
        ? (s.annualBenefit/1e6).toFixed(1) + 'M' : Math.round(s.annualBenefit/1e3) + 'K') + '/yr' : '';
      const rep = (isAdmin && s.ownerUsername) ? s.ownerUsername : '';
      const meta = [s.version ? 'v' + s.version : '', ben, roi, rep ? '(' + rep + ')' : ''].filter(Boolean).join(' · ');
      return `<label class="scenario-pick-row">
        <input type="radio" name="scenPick" value="${s.id}"/>
        <div><div class="scenario-pick-name">${escapeHtml(s.name)}</div>
        <div class="scenario-pick-meta">${escapeHtml(meta)}</div></div>
      </label>`;
    }).join('');
    modal.innerHTML = `<div class="modal" style="max-width:480px;">
      <div class="modal-title">${escapeHtml(company)} has ${matches.length} scenario${matches.length !== 1 ? 's' : ''}</div>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:.75rem;">
        Load one to keep your ROI figures aligned with this plan, or continue.
      </p>
      <div class="scenario-pick-list">${rows}</div>
      <div class="btn-row" style="margin-top:1rem;">
        <button class="btn btn-cta" onclick="_scenPromptLoad()">Load selected</button>
        <button class="btn btn-ghost" onclick="_scenPromptCreateNew('${escapeHtml(company).replace(/'/g,"\\'")}')">Create new scenario</button>
        <button class="btn btn-ghost" onclick="_scenPromptContinue()">Continue without loading</button>
      </div>
    </div>`;
  }
  document.body.appendChild(modal);
  window._scenPromptContinueCb = onContinue;
}

function _scenPromptLoad() {
  const sel = document.querySelector('#scenarioPromptModal input[name=scenPick]:checked');
  if (!sel) { showToast('Select a scenario or choose Continue.'); return; }
  const id = sel.value;
  _scenPromptClose();
  if (typeof loadScenario === 'function') loadScenario(id);
  showToast('Scenario loaded — ROI figures updated.');
}
function _scenPromptCreateNew(company) {
  _scenPromptClose();
  if (typeof switchTab === 'function') switchTab('calc');
  const el = document.getElementById('companyName');
  if (el) { el.value = company; el.dispatchEvent(new Event('change')); }
  showToast('Build the new scenario, then return to your plan.');
}
function _scenPromptContinue() {
  const cb = window._scenPromptContinueCb;
  _scenPromptClose();
  if (cb) cb();
}
function _scenPromptClose() {
  const m = document.getElementById('scenarioPromptModal');
  if (m) m.remove();
  window._scenPromptContinueCb = null;
}
