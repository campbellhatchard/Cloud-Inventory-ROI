/* ═══════════════════════════════════════════════════════════════════
   stakeholders.js — Stakeholder Map tab
   Influence × Support quadrant, role coverage, AI gap analysis.
   ═══════════════════════════════════════════════════════════════════ */

let _stakeholders = [];
let _stakeCompany = '';

const STAKE_ROLES = {
  champion:        { label: 'Champion',        color: '#2E7D32' },
  economic_buyer:  { label: 'Economic Buyer',  color: '#45688A' },
  technical_buyer: { label: 'Technical Buyer', color: '#00A9CC' },
  influencer:      { label: 'Influencer',      color: '#A6791E' },
  blocker:         { label: 'Blocker',         color: '#C81E10' },
  end_user:        { label: 'End User',        color: '#64748B' }
};

async function initStakeTab() {
  if (window._authReady) await window._authReady;
  await loadCompanies();
  populateStakeCompanySelect();
  await loadStakeholders();
}

function populateStakeCompanySelect() {
  const sel = document.getElementById('stakeCompanySel');
  if (!sel) return;
  const list = getCompanies();
  const opts = ['<option value="">— Select a company —</option>'];
  list.forEach(c => {
    opts.push(`<option value="${escapeHtml(c.name)}" ${c.name === _stakeCompany ? 'selected' : ''}>${escapeHtml(c.name)}${c.stakeholders ? '  (' + c.stakeholders + ')' : ''}</option>`);
  });
  opts.push('<option value="__new__">+ New company…</option>');
  sel.innerHTML = opts.join('');
  updateStakeGate();
}

function updateStakeGate() {
  const has = !!(_stakeCompany && _stakeCompany.trim());
  const addBtn = document.getElementById('stakeAddBtn');
  const gate   = document.getElementById('stakeCompanyGate');
  if (addBtn) addBtn.disabled = !has;
  if (gate)   gate.style.display = has ? 'none' : 'block';
}

async function loadStakeCompanies() {
  await loadCompanies();
  populateStakeCompanySelect();
}

async function loadStakeholders() {
  try {
    const url = '/api/stakeholders' + (_stakeCompany ? '?company=' + encodeURIComponent(_stakeCompany) : '');
    const resp = await apiFetch(url);
    if (!resp || !resp.ok) return;
    _stakeholders = await resp.json();
    renderStakeTab();
  } catch (e) { console.error('loadStakeholders:', e.message); }
}

function setStakeCompany(c) {
  if (c === '__new__') {
    const typed = prompt('New company name:');
    if (!typed || !typed.trim()) { populateStakeCompanySelect(); return; }
    checkCompanyOnEntry(typed, (finalName) => {
      if (!finalName) { populateStakeCompanySelect(); return; }
      _stakeCompany = finalName;
      if (!getCompanies().some(x => x.name.toLowerCase() === finalName.toLowerCase())) {
        getCompanies().push({ name: finalName, scenarios: 0, plans: 0, stakeholders: 0 });
      }
      populateStakeCompanySelect();
      updateStakeGate();
      loadStakeholders();
      promptScenarioForCompany(finalName, () => {});
    });
    return;
  }
  _stakeCompany = c;
  updateStakeGate();
  loadStakeholders();
  if (c) promptScenarioForCompany(c, () => {});
}

/* ── RENDER ── */
function renderStakeTab() {
  renderStakeQuadrant();
  renderStakeCoverage();
  renderStakeList();
}

/* Influence (y) × Support (x) quadrant */
function renderStakeQuadrant() {
  const el = document.getElementById('stakeQuadrant');
  if (!el) return;
  const W = 100, H = 100; // percentage coordinates
  const dots = _stakeholders.map(s => {
    const x = ((s.support - 1) / 4) * 86 + 7;   // 1..5 → 7..93%
    const y = 93 - ((s.influence - 1) / 4) * 86; // high influence at top
    const c = (STAKE_ROLES[s.role] || STAKE_ROLES.influencer).color;
    const initials = s.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<div class="stake-dot" style="left:${x}%;top:${y}%;background:${c};${s.engaged ? '' : 'opacity:.45;'}"
      title="${escapeHtml(s.name)} — ${escapeHtml(s.title || '')} (${STAKE_ROLES[s.role]?.label || s.role}${s.engaged ? '' : ', not engaged'})"
      onclick="editStakeholder('${s.id}')">${initials}</div>`;
  }).join('');

  el.innerHTML = `
    <div class="stake-quad-grid">
      <div class="stake-quad-cell" style="background:rgba(198,40,40,.05);"><span>Manage closely<br/><small>High influence · Low support</small></span></div>
      <div class="stake-quad-cell" style="background:rgba(46,125,50,.06);"><span>Leverage<br/><small>High influence · High support</small></span></div>
      <div class="stake-quad-cell"><span>Monitor<br/><small>Low influence · Low support</small></span></div>
      <div class="stake-quad-cell" style="background:rgba(0,167,207,.05);"><span>Keep informed<br/><small>Low influence · High support</small></span></div>
      ${dots}
    </div>
    <div class="stake-axis-x">Support →</div>
    <div class="stake-axis-y">Influence →</div>`;
}

/* Role coverage strip — flags missing critical roles */
function renderStakeCoverage() {
  const el = document.getElementById('stakeCoverage');
  if (!el) return;
  const critical = ['champion', 'economic_buyer', 'technical_buyer'];
  el.innerHTML = Object.entries(STAKE_ROLES).map(([k, r]) => {
    const list = _stakeholders.filter(s => s.role === k);
    const missing = critical.includes(k) && !list.length;
    const unengaged = list.length && list.every(s => !s.engaged);
    return `<div class="stake-cov ${missing ? 'stake-cov-missing' : ''}">
      <span class="stake-cov-dot" style="background:${r.color};"></span>
      <span>${r.label}</span>
      <strong>${list.length}</strong>
      ${missing ? '<span class="stake-cov-flag">⚠ missing</span>' : unengaged ? '<span class="stake-cov-flag" style="color:var(--amber);">not engaged</span>' : ''}
    </div>`;
  }).join('');
}

function renderStakeList() {
  const el = document.getElementById('stakeList');
  if (!el) return;
  if (!_stakeholders.length) {
    el.innerHTML = '<div class="empty-state"><p>No stakeholders mapped yet. Add the people who will decide this deal.</p></div>';
    return;
  }
  el.innerHTML = `<div class="user-table-wrap"><table class="user-table">
    <thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Influence</th><th>Support</th><th>Engaged</th><th></th></tr></thead>
    <tbody>${_stakeholders.map(s => {
      const r = STAKE_ROLES[s.role] || STAKE_ROLES.influencer;
      const bar = (n, color) => `<div class="stake-bar"><div style="width:${n * 20}%;background:${color};"></div></div>`;
      return `<tr>
        <td><strong>${escapeHtml(s.name)}</strong>${s.notes ? `<div style="font-size:11px;color:var(--gray-400);max-width:220px;">${escapeHtml(s.notes.slice(0, 80))}</div>` : ''}</td>
        <td style="font-size:12px;color:var(--gray-500);">${escapeHtml(s.title || '—')}</td>
        <td><span class="role-badge" style="background:${r.color}20;color:${r.color};">${r.label}</span></td>
        <td>${bar(s.influence, 'var(--navy)')}</td>
        <td>${bar(s.support, s.support >= 4 ? 'var(--green)' : s.support <= 2 ? 'var(--red)' : 'var(--amber)')}</td>
        <td>${s.engaged ? '<span class="status-badge active">Yes</span>' : '<span class="status-badge inactive">No</span>'}</td>
        <td><div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm" onclick="editStakeholder('${s.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStakeholder('${s.id}')">✕</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

/* ── ADD / EDIT MODAL ── */
function stakeholderModal(s) {
  const isEdit = !!s;
  s = s || { name: '', title: '', role: 'influencer', influence: 3, support: 3, engaged: false, notes: '', company: _stakeCompany || '' };
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'stakeModal';
  modal.innerHTML = `<div class="modal" style="max-width:520px;">
    <button class="modal-close" onclick="document.getElementById('stakeModal').remove()">✕</button>
    <div class="modal-title">${isEdit ? 'Edit' : 'Add'} stakeholder</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="field" style="margin:0;"><label>Name *</label><input type="text" id="skName" value="${escapeHtml(s.name)}"/></div>
      <div class="field" style="margin:0;"><label>Title</label><input type="text" id="skTitle" value="${escapeHtml(s.title || '')}" placeholder="e.g. VP Operations"/></div>
      <div class="field" style="margin:0;"><label>Company</label><input type="text" id="skCompany" value="${escapeHtml(s.company || '')}"/></div>
      <div class="field" style="margin:0;"><label>Role</label>
        <select id="skRole">${Object.entries(STAKE_ROLES).map(([k, r]) => `<option value="${k}" ${s.role === k ? 'selected' : ''}>${r.label}</option>`).join('')}</select></div>
      <div class="field" style="margin:0;"><label>Influence: <span id="skInfVal">${s.influence}</span>/5</label>
        <input type="range" min="1" max="5" value="${s.influence}" id="skInfluence" oninput="document.getElementById('skInfVal').textContent=this.value"/></div>
      <div class="field" style="margin:0;"><label>Support: <span id="skSupVal">${s.support}</span>/5</label>
        <input type="range" min="1" max="5" value="${s.support}" id="skSupport" oninput="document.getElementById('skSupVal').textContent=this.value"/></div>
    </div>
    <div class="field" style="margin-top:10px;"><label><input type="checkbox" id="skEngaged" ${s.engaged ? 'checked' : ''}/> We have directly engaged this person</label></div>
    <div class="field"><label>Notes / win strategy</label><textarea id="skNotes" rows="3" style="width:100%;font-family:var(--font);font-size:13px;padding:8px;border:1.5px solid var(--gray-200);border-radius:7px;">${escapeHtml(s.notes || '')}</textarea></div>
    <div id="skErr" class="field-hint" style="color:var(--red);display:none;"></div>
    <div class="btn-row" style="margin-top:1rem;">
      <button class="btn btn-cta" onclick="saveStakeholder('${s.id || ''}')">${isEdit ? 'Save changes' : 'Add stakeholder'}</button>
      <button class="btn btn-ghost" onclick="document.getElementById('stakeModal').remove()">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('skName').focus();
}

function addStakeholder() {
  if (!_stakeCompany || !_stakeCompany.trim()) {
    showToast('Select a company first.');
    updateStakeGate();
    return;
  }
  stakeholderModal(null);
}

/* ── Pre-populate stakeholders from value-engineering discovery answers ──
   Reads ve8 (sponsor), ve9 (others impacted), ve10 (blocker) and offers
   them as draft entries the rep can accept into the map. Non-destructive:
   the rep confirms each; nothing is auto-created. */
function suggestStakeholdersFromDiscovery() {
  if (!_stakeCompany || !_stakeCompany.trim()) { showToast('Select a company first.'); return; }
  const da = (typeof discoveryAnswers !== 'undefined') ? discoveryAnswers : {};
  const suggestions = [];
  if (da['ve8'])  suggestions.push({ role:'economic_buyer', text:da['ve8'],  hint:'Executive sponsor (from discovery)' });
  if (da['ve9'])  suggestions.push({ role:'influencer',     text:da['ve9'],  hint:'Impacted stakeholder (from discovery)' });
  if (da['ve10']) suggestions.push({ role:'blocker',        text:da['ve10'], hint:'Potential blocker (from discovery)' });
  if (!suggestions.length) {
    showToast('No stakeholder answers captured in discovery yet (questions ve8–ve10).');
    return;
  }
  const rows = suggestions.map((s, i) => `
    <div class="sug-row">
      <label class="sug-check"><input type="checkbox" id="sug-${i}" checked/> Import</label>
      <div class="sug-body">
        <div class="sug-hint">${escapeHtml(s.hint)} · role: <strong>${STAKE_ROLES[s.role].label}</strong></div>
        <input type="text" id="sug-name-${i}" class="sug-name" value="${escapeHtml(s.text.slice(0,60))}" placeholder="Name / title"/>
        <input type="hidden" id="sug-role-${i}" value="${s.role}"/>
      </div>
    </div>`).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'sugModal';
  modal.innerHTML = `<div class="modal" style="max-width:520px;">
    <div class="modal-title">Suggested stakeholders from discovery</div>
    <p style="font-size:12px;color:var(--gray-500);margin-bottom:12px;">These are drawn from your value-engineering answers. Edit the names, uncheck any to skip, then import. You can refine roles and influence after.</p>
    ${rows}
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="document.getElementById('sugModal').remove()">Cancel</button>
      <button class="btn btn-cta" onclick="importSuggestedStakeholders(${suggestions.length})">Import selected</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

async function importSuggestedStakeholders(count) {
  let imported = 0;
  for (let i = 0; i < count; i++) {
    const chk = document.getElementById('sug-'+i);
    if (!chk || !chk.checked) continue;
    const name = document.getElementById('sug-name-'+i).value.trim();
    if (!name) continue;
    const role = document.getElementById('sug-role-'+i).value;
    const resp = await apiFetch('/api/stakeholders', {
      method: 'POST',
      body: JSON.stringify({
        name, title:'', company:_stakeCompany, role,
        influence: role === 'economic_buyer' ? 5 : 3,
        support: 3, engaged: false,
        notes: 'Imported from value-engineering discovery.'
      })
    });
    if (resp && resp.ok) imported++;
  }
  document.getElementById('sugModal')?.remove();
  showToast(imported ? `Imported ${imported} stakeholder${imported!==1?'s':''}.` : 'Nothing imported.');
  if (imported) { await loadCompanies(); populateStakeCompanySelect(); await loadStakeholders(); }
}
function editStakeholder(id) { const s = _stakeholders.find(x => x.id === id); if (s) stakeholderModal(s); }

async function saveStakeholder(id) {
  const body = {
    name:      document.getElementById('skName').value.trim(),
    title:     document.getElementById('skTitle').value.trim(),
    company:   document.getElementById('skCompany').value.trim(),
    role:      document.getElementById('skRole').value,
    influence: parseInt(document.getElementById('skInfluence').value),
    support:   parseInt(document.getElementById('skSupport').value),
    engaged:   document.getElementById('skEngaged').checked,
    notes:     document.getElementById('skNotes').value.trim()
  };
  const err = document.getElementById('skErr');
  if (!body.name) { err.textContent = 'Name is required.'; err.style.display = 'block'; return; }
  const resp = await apiFetch(id ? '/api/stakeholders/' + id : '/api/stakeholders',
    { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
  if (!resp || !resp.ok) { const d = resp ? await resp.json() : {}; err.textContent = d.error || 'Save failed.'; err.style.display = 'block'; return; }
  document.getElementById('stakeModal').remove();
  showToast(id ? 'Stakeholder updated.' : 'Stakeholder added.');
  await loadCompanies();
  populateStakeCompanySelect();
  await loadStakeholders();
}

async function deleteStakeholder(id) {
  const s = _stakeholders.find(x => x.id === id);
  if (!s) return;
  const doDelete = async () => {
    const resp = await apiFetch('/api/stakeholders/' + id, { method: 'DELETE' });
    if (resp && resp.ok) loadStakeholders(); else { showToast('Remove failed.'); loadStakeholders(); }
  };
  if (typeof undoableAction === 'function') {
    undoableAction(`Removed ${s.name} from the map`, doDelete, () => loadStakeholders());
  } else {
    if (!confirm(`Remove ${s.name} from the map?`)) return;
    await doDelete();
  }
}

/* ── AI GAP ANALYSIS ── */
async function aiAnalyzeStakeholders() {
  if (!_stakeholders.length) { showToast('Add stakeholders first.'); return; }
  const btn = document.getElementById('stakeAiBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.textContent = '✨ Analyzing…';
  const out = document.getElementById('stakeAiResult');
  out.style.display = 'block';
  out.innerHTML = '<div class="empty-state"><p>Analyzing your stakeholder coverage…</p></div>';
  try {
    const v = typeof getVals === 'function' ? getVals() : {};
    const summary = _stakeholders.map(s =>
      `${s.name} (${s.title || 'title unknown'}) — role: ${s.role}, influence ${s.influence}/5, support ${s.support}/5, ${s.engaged ? 'engaged' : 'NOT engaged'}${s.notes ? ', notes: ' + s.notes.slice(0, 100) : ''}`
    ).join('\n');

    const prompt = `You are an enterprise sales coach analyzing a stakeholder map for a Cloud Inventory (inventory SaaS) deal${_stakeCompany ? ' at ' + _stakeCompany : ''}${v.dealStage ? ' at ' + v.dealStage + ' stage' : ''}.

Stakeholders:
${summary}

Respond ONLY with JSON (no fences): {"risk": "one-sentence overall deal risk assessment", "gaps": ["gap 1", "gap 2", ...], "actions": [{"who": "stakeholder name or NEW", "action": "specific next move under 20 words"}]}. Identify: missing critical roles (champion/economic buyer/technical buyer), unengaged high-influence people, blockers needing mitigation, single-threaded risk. Max 4 gaps, max 5 actions. Be blunt and specific.`;

    const resp = await apiFetch('/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!resp || !resp.ok) throw new Error('AI request failed');
    const data = await resp.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const a = JSON.parse(text.replace(/```json|```/g, '').trim());

    out.innerHTML = `
      <div class="stake-ai-risk">⚡ ${escapeHtml(a.risk || '')}</div>
      ${(a.gaps || []).length ? `<div class="stake-ai-head">Coverage gaps</div>
        <ul class="stake-ai-list">${a.gaps.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>` : ''}
      ${(a.actions || []).length ? `<div class="stake-ai-head">Recommended moves</div>
        <ul class="stake-ai-list">${a.actions.map(x => `<li><strong>${escapeHtml(x.who)}:</strong> ${escapeHtml(x.action)}</li>`).join('')}</ul>` : ''}`;
  } catch (e) {
    console.error('aiAnalyzeStakeholders:', e.message);
    out.innerHTML = '<div class="empty-state"><p>Analysis failed — try again.</p></div>';
  } finally {
    btn.disabled = false; btn.innerHTML = orig;
  }
}
