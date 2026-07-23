/* ═══════════════════════════════════════════════════════════════════
   map.js — Mutual Action Plan tab (rep view)
   Build a shared close plan, generate milestones with AI, share a live
   link with the prospect, track progress together.
   ═══════════════════════════════════════════════════════════════════ */

let _maps = [];            // list cache
let _mapCurrent = null;    // plan being edited

const MAP_PHASES = ['Evaluate', 'Validate', 'Business Case', 'Legal & Procurement', 'Launch'];
const MAP_OWNERS = { rep: 'Cloud Inventory', prospect: 'Customer', joint: 'Joint' };

function mapUid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

async function initMapTab() {
  if (window._authReady) await window._authReady;
  await loadMaps();
}

async function loadMaps() {
  try {
    const resp = await apiFetch('/api/maps');
    if (!resp || !resp.ok) return;
    _maps = await resp.json();
    renderMapList();
  } catch (e) { console.error('loadMaps:', e.message); }
}

/* ── LIST VIEW ── */
function renderMapList() {
  const el = document.getElementById('mapListWrap');
  if (!el) return;
  document.getElementById('mapEditorWrap').style.display = 'none';
  el.style.display = 'block';

  if (!_maps.length) {
    el.innerHTML = `<div class="empty-state"><p>No action plans yet. Create one to build a shared close plan with your prospect.</p>
      <button class="btn btn-cta" onclick="newMap()" style="margin-top:.75rem;">+ New action plan</button></div>`;
    return;
  }
  el.innerHTML = `
    <div class="btn-row" style="margin-bottom:1rem;"><button class="btn btn-cta" onclick="newMap()">+ New action plan</button></div>
    <ul class="scenario-list">${_maps.map(m => {
      const ms = m.milestones || [];
      const done = ms.filter(x => x.status === 'done').length;
      const pct = ms.length ? Math.round(done / ms.length * 100) : 0;
      const overdue = ms.filter(x => x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date()).length;
      return `<li class="scenario-item">
        <div class="scenario-info">
          <div class="scenario-name">${escapeHtml(m.title)} ${m.token ? '<span class="shared-badge">🔗 shared with prospect</span>' : ''}</div>
          <div class="scenario-meta">${escapeHtml(m.company || 'No company')} ·
            ${m.target_close_date ? 'Target close: ' + new Date(m.target_close_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : 'No target date'} ·
            ${done}/${ms.length} done${overdue ? ` · <span style="color:var(--red);font-weight:600;">${overdue} overdue</span>` : ''}</div>
          <div class="map-progress"><div class="map-progress-fill" style="width:${pct}%;"></div></div>
        </div>
        <div class="scenario-actions">
          <button class="btn btn-ghost btn-sm" onclick="openMap('${m.id}')">Open</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMap('${m.id}')">Delete</button>
        </div>
      </li>`;
    }).join('')}</ul>`;
}

function newMap() {
  const v = typeof getVals === 'function' ? getVals() : {};
  _mapCurrent = {
    id: null,
    company: v.company && v.company !== 'Prospect' ? v.company : '',
    title: 'Mutual Action Plan' + (v.company && v.company !== 'Prospect' ? ' — ' + v.company : ''),
    target_close_date: null,
    token: null,
    milestones: []
  };
  renderMapEditor();
}

async function openMap(id) {
  const m = _maps.find(x => x.id === id);
  if (!m) return;
  _mapCurrent = JSON.parse(JSON.stringify(m));
  renderMapEditor();
}

async function deleteMap(id) {
  const m = _maps.find(x => x.id === id);
  if (!m || !confirm(`Delete "${m.title}"? The prospect link (if shared) will stop working.`)) return;
  const resp = await apiFetch('/api/maps/' + id, { method: 'DELETE' });
  if (resp && resp.ok) { showToast('Plan deleted.'); loadMaps(); }
}

/* ── EDITOR VIEW ── */
function renderMapEditor() {
  const list = document.getElementById('mapListWrap');
  const ed   = document.getElementById('mapEditorWrap');
  if (!ed) return;
  list.style.display = 'none';
  ed.style.display = 'block';
  const m = _mapCurrent;

  const shareBlock = m.id
    ? (m.token
      ? `<div class="map-share-box">
          <div style="font-size:12px;font-weight:600;color:var(--green);">🔗 Live prospect link active</div>
          <div class="map-share-url" id="mapShareUrl">${window.location.origin}/prospect-map.html?token=${m.token}</div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn btn-cta btn-sm" onclick="copyMapLink()">Copy link</button>
            <button class="btn btn-ghost btn-sm" onclick="emailMapLink()">✉️ Email via my mail client</button>
            <button class="btn btn-ghost btn-sm" onclick="shareMap()">🔄 Rotate</button>
            <button class="btn btn-danger btn-sm" onclick="revokeMapLink()">Revoke</button>
          </div>
          <div class="field-hint" style="margin-top:5px;">The prospect sees a live view and can check off their own items. Updates appear when you reopen the plan.</div>
        </div>`
      : `<button class="btn btn-cta btn-sm" onclick="shareMap()">🔗 Share with prospect</button>`)
    : `<span class="field-hint">Save the plan first to generate a prospect link.</span>`;

  ed.innerHTML = `
    <div class="btn-row" style="margin-bottom:1rem;">
      <button class="btn btn-ghost btn-sm" onclick="renderMapList()">← All plans</button>
    </div>
    <div class="card" style="margin-bottom:1.25rem;">
      <div style="display:grid;grid-template-columns:1.4fr 2fr 1fr;gap:10px;align-items:end;">
        <div class="field" style="margin:0;"><label>Company *</label>
          <select id="mapCompanySel" onchange="mapCompanyChanged(this.value)"></select></div>
        <div class="field" style="margin:0;"><label>Plan title</label>
          <input type="text" id="mapTitle" value="${escapeHtml(m.title)}"/></div>
        <div class="field" style="margin:0;"><label>Target close date</label>
          <input type="date" id="mapCloseDate" value="${m.target_close_date ? String(m.target_close_date).split('T')[0] : ''}"/></div>
      </div>
      <div id="mapCompanyGate" class="field-hint" style="color:var(--amber);display:${m.company ? 'none' : 'block'};margin-top:6px;">Select or create a company before saving this plan.</div>
      <div class="btn-row" style="margin-top:.85rem;align-items:center;flex-wrap:wrap;">
        <button class="btn btn-cta" id="mapSaveBtn" onclick="saveMap()">Save plan</button>
        <button class="btn btn-primary" onclick="aiGenerateMap()" id="mapAiBtn">✨ Generate milestones with AI</button>
        <span class="export-divider"></span>
        <button class="btn btn-ghost btn-sm" onclick="printActionPlan('internal')" title="Print / save internal PDF">🖨 PDF (internal)</button>
        <button class="btn btn-ghost btn-sm" onclick="printActionPlan('customer')" title="Print / save customer PDF">🖨 PDF (customer)</button>
        <button class="btn btn-ghost btn-sm" id="mapPptIntBtn" onclick="pptActionPlan('internal')" title="Export internal PowerPoint">📊 PPT (internal)</button>
        <button class="btn btn-ghost btn-sm" id="mapPptCustBtn" onclick="pptActionPlan('customer')" title="Export customer PowerPoint">📊 PPT (customer)</button>
        ${shareBlock}
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;">Milestones
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="addMilestone()">+ Add milestone</button>
      </div>
      <div id="mapMilestones">${renderMilestones()}</div>
    </div>`;

  /* Populate the company selector and enforce the gate */
  fillCompanySelect(document.getElementById('mapCompanySel'), m.company);
  mapUpdateGate();
}

/* Company selector change — handle "+ New company…", check-existing, scenario prompt */
function mapCompanyChanged(val) {
  if (val === '__new__') {
    const typed = prompt('New company name:');
    if (!typed || !typed.trim()) { fillCompanySelect(document.getElementById('mapCompanySel'), _mapCurrent.company); return; }
    checkCompanyOnEntry(typed, (finalName) => {
      if (!finalName) { fillCompanySelect(document.getElementById('mapCompanySel'), _mapCurrent.company); return; }
      _mapCurrent.company = finalName;
      if (!_companies.some(c => c.name.toLowerCase() === finalName.toLowerCase())) {
        _companies.push({ name: finalName, scenarios: 0, plans: 0, stakeholders: 0 });
      }
      fillCompanySelect(document.getElementById('mapCompanySel'), finalName);
      mapUpdateGate();
      promptScenarioForCompany(finalName, () => {});
    });
    return;
  }
  _mapCurrent.company = val;
  mapUpdateGate();
  if (val) promptScenarioForCompany(val, () => {});
}

function mapUpdateGate() {
  const has = !!(_mapCurrent.company && _mapCurrent.company.trim());
  const gate = document.getElementById('mapCompanyGate');
  const save = document.getElementById('mapSaveBtn');
  const ai   = document.getElementById('mapAiBtn');
  if (gate) gate.style.display = has ? 'none' : 'block';
  if (save) save.disabled = !has;
  if (ai)   ai.disabled = !has;
}

function renderMilestones() {
  const ms = _mapCurrent.milestones || [];
  if (!ms.length) return '<div class="empty-state"><p>No milestones yet. Add them manually or generate a draft with AI.</p></div>';

  return MAP_PHASES.filter(p => ms.some(x => x.phase === p)).map(phase => `
    <div class="map-phase-label">${phase}</div>
    ${ms.filter(x => x.phase === phase).map(x => {
      const overdue = x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date();
      return `<div class="map-ms-row ${x.status === 'done' ? 'map-ms-done' : ''}">
        <select class="map-ms-status" onchange="msField('${x.id}','status',this.value)">
          ${['pending','in_progress','done'].map(st => `<option value="${st}" ${x.status===st?'selected':''}>${st==='pending'?'○ Pending':st==='in_progress'?'◐ In progress':'● Done'}</option>`).join('')}
        </select>
        <input type="text" class="map-ms-title" value="${escapeHtml(x.title)}" onchange="msField('${x.id}','title',this.value)"/>
        <select class="map-ms-owner" onchange="msField('${x.id}','owner',this.value)">
          ${Object.entries(MAP_OWNERS).map(([k,l]) => `<option value="${k}" ${x.owner===k?'selected':''}>${l}</option>`).join('')}
        </select>
        <input type="date" class="map-ms-date ${overdue?'map-ms-overdue':''}" value="${x.dueDate||''}" onchange="msField('${x.id}','dueDate',this.value)"/>
        <button class="btn btn-danger btn-sm" onclick="removeMilestone('${x.id}')">✕</button>
      </div>`;
    }).join('')}`).join('');
}

function msField(id, field, value) {
  const x = (_mapCurrent.milestones || []).find(m => m.id === id);
  if (x) { x[field] = value; if (field === 'status') renderMapEditor(); }
}
function addMilestone() {
  _mapCurrent.milestones = _mapCurrent.milestones || [];
  _mapCurrent.milestones.push({ id: mapUid(), phase: MAP_PHASES[0], title: '', owner: 'joint', dueDate: '', status: 'pending' });
  renderMapEditor();
}
function removeMilestone(id) {
  _mapCurrent.milestones = (_mapCurrent.milestones || []).filter(m => m.id !== id);
  renderMapEditor();
}

/* ── Persistence ── */
async function saveMap() {
  if (!_mapCurrent.company || !_mapCurrent.company.trim()) {
    showToast('Select a company before saving.');
    mapUpdateGate();
    return;
  }
  const body = {
    title:           document.getElementById('mapTitle').value.trim() || 'Mutual Action Plan',
    company:         _mapCurrent.company.trim(),
    targetCloseDate: document.getElementById('mapCloseDate').value || null,
    milestones:      _mapCurrent.milestones || []
  };
  const url    = _mapCurrent.id ? '/api/maps/' + _mapCurrent.id : '/api/maps';
  const method = _mapCurrent.id ? 'PUT' : 'POST';
  const resp = await apiFetch(url, { method, body: JSON.stringify(body) });
  if (!resp || !resp.ok) { showToast('Save failed.'); return; }
  const saved = await resp.json();
  _mapCurrent.id = saved.id;
  _mapCurrent.token = saved.token || _mapCurrent.token;
  Object.assign(_mapCurrent, { title: saved.title, company: saved.company, target_close_date: saved.target_close_date });
  showToast('Action plan saved.');
  await loadMaps();
  const fresh = _maps.find(x => x.id === saved.id);
  if (fresh) { _mapCurrent = JSON.parse(JSON.stringify(fresh)); }
  renderMapEditor();
}

async function shareMap() {
  if (!_mapCurrent.id) { showToast('Save the plan first.'); return; }
  const resp = await apiFetch('/api/maps/' + _mapCurrent.id + '/share', { method: 'POST' });
  if (!resp || !resp.ok) { showToast('Could not generate link.'); return; }
  const data = await resp.json();
  _mapCurrent.token = data.token;
  renderMapEditor();
  showToast('Prospect link ready — copy or email it.');
}

async function revokeMapLink() {
  if (!confirm('Revoke the prospect link? Their view will stop working immediately.')) return;
  const resp = await apiFetch('/api/maps/' + _mapCurrent.id + '/share', { method: 'DELETE' });
  if (resp && resp.ok) { _mapCurrent.token = null; renderMapEditor(); showToast('Link revoked.'); }
}

function mapUrl() { return window.location.origin + '/prospect-map.html?token=' + _mapCurrent.token; }
function copyMapLink() { navigator.clipboard.writeText(mapUrl()).then(() => showToast('Link copied!')); }

function emailMapLink() {
  const subject = 'Our mutual action plan — ' + (_mapCurrent.company || 'next steps');
  const body = `Hi,

Here's the live link to our shared action plan for ${_mapCurrent.company || 'your evaluation'}:

${mapUrl()}

It shows every step to ${_mapCurrent.target_close_date ? 'our target date of ' + new Date(_mapCurrent.target_close_date).toLocaleDateString('en-US',{month:'long',day:'numeric'}) : 'go-live'}, who owns each one, and where we are. You can check off items on your side as they complete — it updates in real time for both of us.

Looking forward to working through this together.
`;
  window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

/* ── AI milestone generation ── */
async function aiGenerateMap() {
  const btn = document.getElementById('mapAiBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.textContent = '✨ Drafting…';
  try {
    const v = typeof getVals === 'function' ? getVals() : {};
    const company   = (_mapCurrent.company || '').trim() || v.company || 'the prospect';
    const closeDate = document.getElementById('mapCloseDate').value || '';
    const industry  = (typeof IND !== 'undefined' && IND[v.industry]) ? IND[v.industry].label : 'general';
    const stage     = v.dealStage || 'Discovery';
    const impl      = v.implMonths || 3;

    const prompt = `You are a B2B enterprise sales strategist. Create a mutual action plan for closing a Cloud Inventory (inventory management SaaS) deal with ${company}, a ${industry} company. Current deal stage: ${stage}. ${closeDate ? 'Target close date: ' + closeDate + '.' : ''} Implementation takes ~${impl} months after signature.

Respond ONLY with a JSON array (no markdown fences, no preamble). Each element: {"phase": one of ${JSON.stringify(MAP_PHASES)}, "title": "specific actionable milestone under 12 words", "owner": "rep"|"prospect"|"joint", "weeksFromNow": number}. Create 10-14 milestones across all 5 phases covering: technical validation, business case sign-off, security review, legal/MSA redlines, procurement, executive alignment, and kickoff. Make prospect-owned items explicit (e.g. "Provide security questionnaire", "Confirm budget holder sign-off").`;

    const resp = await apiFetch('/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    if (!resp || !resp.ok) throw new Error('AI request failed');
    const data = await resp.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const items = JSON.parse(clean);
    if (!Array.isArray(items) || !items.length) throw new Error('No milestones returned');

    _mapCurrent.milestones = items.map(it => {
      const due = new Date(); due.setDate(due.getDate() + Math.round((it.weeksFromNow || 1) * 7));
      return {
        id: mapUid(),
        phase: MAP_PHASES.includes(it.phase) ? it.phase : MAP_PHASES[0],
        title: String(it.title || '').slice(0, 120),
        owner: ['rep','prospect','joint'].includes(it.owner) ? it.owner : 'joint',
        dueDate: due.toISOString().split('T')[0],
        status: 'pending'
      };
    });
    renderMapEditor();
    showToast(`AI drafted ${_mapCurrent.milestones.length} milestones — review, adjust dates, and save.`);
  } catch (e) {
    console.error('aiGenerateMap:', e.message);
    showToast('AI generation failed — ' + (e.message.includes('JSON') ? 'could not parse response, try again.' : e.message));
  } finally {
    btn.disabled = false; btn.innerHTML = orig;
  }
}
