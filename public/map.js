/* ═══════════════════════════════════════════════════════════════════
   map.js — Joint Project Plan tab (rep view)
   Build a shared close plan, generate milestones with AI, share a live
   link with the prospect, track progress together.
   ═══════════════════════════════════════════════════════════════════ */

let _maps = [];            // list cache
let _mapCurrent = null;    // plan being edited

const MAP_PHASES = ['Evaluate', 'Validate', 'Business Case', 'Legal & Procurement', 'Launch'];
const MAP_OWNERS = { rep: 'Cloud Inventory', prospect: 'Customer', joint: 'Joint' };

function mapUid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function mapDefaultGroups() {
  return MAP_PHASES.map((name, i) => ({ id: 'group-' + (i + 1), name }));
}

function mapNormalizeStructure(map) {
  if (!map) return map;
  map.milestones = Array.isArray(map.milestones) ? map.milestones : [];
  let groups = Array.isArray(map.groups) ? map.groups.filter(g => g && g.id && String(g.name || '').trim()) : [];
  if (!groups.length) {
    const used = [];
    MAP_PHASES.forEach(name => { if (!map.milestones.length || map.milestones.some(m => m.phase === name)) used.push(name); });
    map.milestones.forEach(m => { if (m.phase && !used.includes(m.phase)) used.push(m.phase); });
    groups = (used.length ? used : MAP_PHASES).map((name, i) => ({ id: 'group-' + (i + 1), name }));
  }
  map.groups = groups;
  map.milestones.forEach(m => {
    let group = groups.find(g => g.id === m.groupId) || groups.find(g => g.name === m.phase) || groups[0];
    m.groupId = group.id;
    m.phase = group.name; // backwards compatibility for older exports
  });
  mapRebuildMilestoneOrder(map);
  return map;
}

function mapRebuildMilestoneOrder(map) {
  map = map || _mapCurrent;
  if (!map || !Array.isArray(map.groups)) return;
  const current = map.milestones || [];
  map.milestones = map.groups.flatMap(g => current.filter(m => m.groupId === g.id));
}

function mapGetGroups(map) {
  mapNormalizeStructure(map);
  return map.groups || [];
}

function captureMapHeaderFields() {
  if (!_mapCurrent) return;
  const title = document.getElementById('mapTitle');
  const close = document.getElementById('mapCloseDate');
  const company = document.getElementById('mapCompanyInput');
  if (title) _mapCurrent.title = title.value;
  if (close) _mapCurrent.target_close_date = close.value || null;
  if (company && company.value.trim()) _mapCurrent.company = company.value.trim();
}

async function initMapTab() {
  if (window._authReady) await window._authReady;
  await loadMaps();
}

async function loadMaps() {
  try {
    /* Both admins and reps fetch all=true — reps see all plans but can only
       edit/delete their own. The list is filtered client-side by ownership. */
    const resp = await apiFetch('/api/maps?all=true');
    if (!resp || !resp.ok) return;
    _maps = await resp.json();
    /* Reset filters on fresh load */
    _mapRepFilter = '';
    _mapStatusFilter = '';
    _mapSearchFilter = '';
    renderMapList();
  } catch (e) { console.error('loadMaps:', e.message); }
}

/* ── LIST VIEW ── */
var _mapRepFilter = '';
var _mapStatusFilter = '';
var _mapSearchFilter = '';

function renderMapList() {
  const el = document.getElementById('mapListWrap');
  if (!el) return;
  document.getElementById('mapEditorWrap').style.display = 'none';
  el.style.display = 'block';
  const user = window.ciAuth ? window.ciAuth.getUser() : {};
  const isAdmin = (typeof clientHasRole==='function'&&clientHasRole(user,'admin','Admin')) || (user.roleKeys||[]).includes('sales_manager') || (user.roles||[]).some(r=>r==='Sales Leader'||r==='Sales Manager');
  const me = user.username || '';

  if (!_maps.length) {
    el.innerHTML = '<div class="empty-state"><p>No Joint Project Plans yet. Create one to build a shared path to value with your prospect.</p>'
      + '<button class="btn btn-primary" onclick="newMap()" style="margin-top:.75rem;">+ New Joint Project Plan</button></div>';
    return;
  }

  /* ── Separate my plans vs other reps' plans (rep view) ── */
  const myMaps    = isAdmin ? _maps : _maps.filter(m => m.owner_username === me);
  const otherMaps = isAdmin ? []    : _maps.filter(m => m.owner_username !== me);

  /* ── Stats ── */
  const allOverdue = _maps.reduce(function(acc, m) {
    return acc + (m.milestones||[]).filter(function(x){ return x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date(); }).length;
  }, 0);
  const sharedCount = _maps.filter(function(m){ return !!m.token; }).length;
  const repCount    = isAdmin ? new Set(_maps.map(function(m){ return m.owner_username; }).filter(Boolean)).size : 0;

  /* ── Overdue alert — always on ── */
  const overdueDetails = myMaps.filter(function(m){
    return (m.milestones||[]).some(function(x){ return x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date(); });
  }).map(function(m){
    const ov = (m.milestones||[]).filter(function(x){ return x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date(); }).length;
    return escapeHtml(m.company || m.title) + ' (' + ov + ' overdue)';
  });
  const overdueAlertHtml = overdueDetails.length
    ? '<div class="map-overdue-alert"><i class="ti ti-alert-triangle" aria-hidden="true"></i>'
      + '<span>' + overdueDetails.join(' \xb7 ') + '</span></div>'
    : '';

  /* ── Filters (admin) ── */
  const reps = isAdmin ? [...new Set(_maps.map(function(m){ return m.owner_username; }).filter(Boolean))].sort() : [];
  const filtered = _maps.filter(function(m) {
    if (_mapRepFilter && m.owner_username !== _mapRepFilter) return false;
    if (_mapStatusFilter === 'overdue' && !(m.milestones||[]).some(function(x){ return x.status!=='done'&&x.dueDate&&new Date(x.dueDate)<new Date(); })) return false;
    if (_mapStatusFilter === 'shared' && !m.token) return false;
    if (_mapStatusFilter === 'draft' && m.token) return false;
    if (_mapStatusFilter === 'on-track' && (
      (m.milestones||[]).some(function(x){ return x.status!=='done'&&x.dueDate&&new Date(x.dueDate)<new Date(); }) || !m.token
    )) return false;
    if (_mapSearchFilter && !(m.company||'').toLowerCase().includes(_mapSearchFilter.toLowerCase())
        && !(m.title||'').toLowerCase().includes(_mapSearchFilter.toLowerCase())) return false;
    return true;
  });

  function mapCard(m, showRep, canDelete) {
    const ms = m.milestones || [];
    const done = ms.filter(function(x){ return x.status === 'done'; }).length;
    const pct  = ms.length ? Math.round(done / ms.length * 100) : 0;
    const overdue = ms.filter(function(x){ return x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date(); }).length;
    const progCls = pct >= 60 ? 'map-prog-hi' : pct >= 25 ? 'map-prog-mid' : 'map-prog-low';
    const closeDate = m.target_close_date
      ? new Date(m.target_close_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
      : null;
    const statusPill = overdue
      ? '<span class="map-status-pill map-status-overdue">' + overdue + ' overdue</span>'
      : (ms.length === 0
        ? '<span class="map-status-pill map-status-empty">Empty</span>'
        : '<span class="map-status-pill map-status-ok">On track</span>');
    const shareIndicator = m.token
      ? '<span class="map-share-dot map-share-live" title="Shared with prospect"></span>Shared'
      : '<span class="map-share-dot map-share-draft" title="Not shared"></span>Draft';
    const repBadge = showRep && m.owner_username
      ? '<span class="map-rep-badge">'
        + '<span class="map-rep-av">' + escapeHtml((m.owner_username||'').slice(0,2).toUpperCase()) + '</span>'
        + escapeHtml(m.owner_username)
        + '</span>'
      : '';
    const deleteBtn = canDelete
      ? '<button class="btn btn-danger btn-sm" onclick="deleteMap(\'' + m.id + '\')" title="Delete plan">Delete</button>'
      : '';

    return '<div class="map-card" onclick="openMap(\'' + m.id + '\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')openMap(\'' + m.id + '\')">'
      + '<div class="map-card-body">'
      +   '<div class="map-card-top">'
      +     '<span class="map-card-company">' + escapeHtml(m.company || 'No company') + '</span>'
      +     repBadge
      +     statusPill
      +   '</div>'
      +   '<div class="map-card-title">' + escapeHtml(m.title || 'Untitled plan') + '</div>'
      +   '<div class="map-card-meta">'
      +     '<span class="map-share-info">' + shareIndicator + '</span>'
      +     (closeDate ? '<span>\xb7 Close: ' + closeDate + '</span>' : '<span class="map-no-date">\xb7 No target date</span>')
      +     '<span>\xb7 ' + done + '\xa0/\xa0' + ms.length + ' done</span>'
      +   '</div>'
      +   '<div class="map-prog-wrap"><div class="map-prog-fill ' + progCls + '" style="width:' + pct + '%;"></div></div>'
      + '</div>'
      + '<div class="map-card-actions" onclick="event.stopPropagation()">'
      +   deleteBtn
      + '</div>'
      + '</div>';
  }

  /* ── Stats strip ── */
  const statsHtml = '<div class="map-stats-row">'
    + '<div class="map-stat"><div class="map-stat-n">' + _maps.length + '</div><div class="map-stat-l">' + (isAdmin ? 'Total plans' : 'Your plans') + '</div></div>'
    + (allOverdue ? '<div class="map-stat"><div class="map-stat-n map-stat-warn">' + allOverdue + '</div><div class="map-stat-l">Overdue milestones</div></div>' : '')
    + '<div class="map-stat"><div class="map-stat-n map-stat-ok">' + sharedCount + '</div><div class="map-stat-l">Shared with prospects</div></div>'
    + (isAdmin ? '<div class="map-stat"><div class="map-stat-n">' + repCount + '</div><div class="map-stat-l">Active reps</div></div>' : '')
    + '</div>';

  /* ── Admin filter bar ── */
  const adminFiltersHtml = isAdmin ? '<div class="map-filter-bar">'
    + '<select class="map-filter-sel" onchange="_mapRepFilter=this.value;renderMapList()">'
    + '<option value="">All reps (' + _maps.length + ')</option>'
    + reps.map(function(r){ return '<option value="' + escapeHtml(r) + '"' + (_mapRepFilter===r?' selected':'') + '>' + escapeHtml(r) + ' (' + _maps.filter(function(m){ return m.owner_username===r; }).length + ')</option>'; }).join('')
    + '</select>'
    + '<select class="map-filter-sel" onchange="_mapStatusFilter=this.value;renderMapList()">'
    + '<option value="">All statuses</option>'
    + '<option value="overdue"' + (_mapStatusFilter==='overdue'?' selected':'') + '>Has overdue</option>'
    + '<option value="on-track"' + (_mapStatusFilter==='on-track'?' selected':'') + '>On track</option>'
    + '<option value="shared"' + (_mapStatusFilter==='shared'?' selected':'') + '>Shared</option>'
    + '<option value="draft"' + (_mapStatusFilter==='draft'?' selected':'') + '>Draft</option>'
    + '</select>'
    + '<input type="text" class="map-filter-search" placeholder="Search company\u2026" value="' + escapeHtml(_mapSearchFilter) + '" oninput="_mapSearchFilter=this.value;renderMapList()" />'
    + '<span class="map-filter-count">' + filtered.length + ' of ' + _maps.length + '</span>'
    + '</div>' : '';

  if (isAdmin) {
    /* ── Admin: flat filtered table ── */
    el.innerHTML = '<div class="map-list-head">'
      + '<div><h2 class="map-list-title">Joint Project Plans</h2>'
      + '<p class="map-list-sub">All plans across all reps.</p></div>'
      + '<button class="btn btn-primary" onclick="newMap()">+ New Joint Project Plan</button>'
      + '</div>'
      + statsHtml
      + overdueAlertHtml
      + adminFiltersHtml
      + (filtered.length === 0
        ? '<div class="empty-state"><p>No plans match the current filters.</p></div>'
        : filtered.map(function(m){ return mapCard(m, true, true); }).join(''));
  } else {
    /* ── Rep: my plans + other reps (read-only) ── */
    el.innerHTML = '<div class="map-list-head">'
      + '<div><h2 class="map-list-title">Joint Project Plans</h2>'
      + '<p class="map-list-sub">Your shared plans for validating value and moving the project forward.</p></div>'
      + '<button class="btn btn-primary" onclick="newMap()">+ New Joint Project Plan</button>'
      + '</div>'
      + statsHtml
      + overdueAlertHtml
      + '<div class="map-section">'
      + '<div class="map-section-head"><span class="map-section-title">Your plans</span><span class="map-section-count">' + myMaps.length + '</span></div>'
      + (myMaps.length === 0
        ? '<div class="empty-state"><p>No plans yet. Create your first Joint Project Plan to get started.</p></div>'
        : myMaps.map(function(m){ return mapCard(m, false, true); }).join(''))
      + '</div>'
      + (otherMaps.length ? '<div class="map-section">'
        + '<div class="map-section-head"><span class="map-section-title">All reps\u2019 plans</span><span class="map-section-count">' + otherMaps.length + '</span></div>'
        + '<p class="map-section-sub">Read-only. Open any plan to view details.</p>'
        + otherMaps.map(function(m){ return mapCard(m, true, false); }).join('')
        + '</div>' : '');
  }
}

function newMap() {
  const v = typeof getVals === 'function' ? getVals() : {};
  _mapCurrent = {
    id: null,
    company: v.company && v.company !== 'Prospect' ? v.company : '',
    title: 'Joint Project Plan' + (v.company && v.company !== 'Prospect' ? ' — ' + v.company : ''),
    target_close_date: null,
    token: null,
    milestones: [],
    groups: mapDefaultGroups()
  };
  renderMapEditor();
}

async function openMap(id) {
  const m = _maps.find(x => x.id === id);
  if (!m) return;
  _mapCurrent = mapNormalizeStructure(JSON.parse(JSON.stringify(m)));
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
  mapNormalizeStructure(m);

  const shareBlock = m.id
    ? (m.token
      ? `<div class="map-share-box">
          <div style="font-size:12px;font-weight:600;color:var(--green);">🔗 Live prospect link active</div>
          <div class="map-share-url" id="mapShareUrl">${window.location.origin}/prospect-map.html?token=${m.token}</div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn btn-secondary btn-sm" onclick="copyMapLink()">Copy link</button>
            <button class="btn btn-ghost btn-sm" onclick="emailMapLink()">✉️ Email via my mail client</button>
            <button class="btn btn-ghost btn-sm" onclick="shareMap()">🔄 Rotate</button>
            <button class="btn btn-danger btn-sm" onclick="revokeMapLink()">Revoke</button>
          </div>
          <div class="field-hint" style="margin-top:5px;">The prospect sees a live view and can check off their own items. Updates appear when you reopen the plan.</div>
        </div>`
      : `<button class="btn btn-primary btn-sm" onclick="shareMap()">🔗 Share with prospect</button>`)
    : `<span class="field-hint">Save the plan first to generate a prospect link.</span>`;

  ed.innerHTML = `
    <div class="btn-row" style="margin-bottom:1rem;">
      <button class="btn btn-ghost btn-sm" onclick="renderMapList()">← All plans</button>
    </div>
    <div class="card" style="margin-bottom:1.25rem;">
      <div style="display:grid;grid-template-columns:1.4fr 2fr 1fr;gap:10px;align-items:end;">
        <div class="field" style="margin:0;"><label>Company *</label>
          <div class="cs-input-wrap" style="position:relative;">
            <input type="text" id="mapCompanyInput" placeholder="Search company…"
              value="${escapeHtml(m.company || '')}"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
              oninput="mapCompanySearch(this.value)"
              onfocus="mapCompanySearch(this.value)"
              onblur="setTimeout(()=>{ const d=document.getElementById('mapCompanyResults'); if(d) d.style.display='none'; },180)"/>
            <div id="mapCompanyResults" class="cs-results" style="display:none;"></div>
          </div></div>
        <div class="field" style="margin:0;"><label>Plan title</label>
          <input type="text" id="mapTitle" value="${escapeHtml(m.title)}"/></div>
        <div class="field" style="margin:0;"><label>Target close date</label>
          <input type="date" id="mapCloseDate" value="${m.target_close_date ? String(m.target_close_date).split('T')[0] : ''}"/></div>
      </div>
      <div id="mapCompanyGate" class="field-hint" style="color:var(--amber);display:${m.company ? 'none' : 'block'};margin-top:6px;">Select or create a company before saving this plan.</div>
      <div class="btn-row" style="margin-top:.85rem;align-items:center;flex-wrap:wrap;">
        <button class="btn btn-primary" id="mapSaveBtn" onclick="saveMap()">Save plan</button>
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
      <div class="map-editor-head">
        <div><div class="card-title">Milestones</div><div class="field-hint">Use the arrows to reorder, or change a milestone’s group.</div></div>
        <div class="map-add-controls">
          <select id="mapAddGroup" aria-label="Group for new milestone">${m.groups.map(g => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('')}</select>
          <select id="mapAddPosition" aria-label="Position for new milestone"><option value="end">At end</option><option value="start">At beginning</option></select>
          <button class="btn btn-primary btn-sm" onclick="addMilestone()">+ Add milestone</button>
        </div>
      </div>
      <div class="map-group-create"><input id="mapNewGroupName" type="text" placeholder="New grouping name" maxlength="60" onkeydown="if(event.key==='Enter'){event.preventDefault();addMapGroup();}"/><button class="btn btn-ghost btn-sm" onclick="addMapGroup()">+ Add grouping</button></div>
      <div id="mapMilestones">${renderMilestones()}</div>
    </div>`;

  /* Set initial value and wire the gate */
  const mapInput = document.getElementById('mapCompanyInput');
  if (mapInput) mapInput.value = m.company || '';
  mapUpdateGate();
}

/* Company typeahead for the MAP editor */
function mapCompanySearch(q) {
  const results = document.getElementById('mapCompanyResults');
  if (!results) return;
  const list = typeof getCompanies === 'function' ? getCompanies() : [];
  const term = (q || '').toLowerCase().trim();
  const matches = term ? list.filter(c => c.name.toLowerCase().includes(term)) : list.slice(0, 10);

  const items = matches.slice(0, 12).map(c =>
    `<div class="cs-result" onmousedown="mapSelectCompany('${escapeHtml(c.name).replace(/'/g,"\\'")}')">
      ${escapeHtml(c.name)}
      ${c.scenarios ? `<span style="font-size:11px;color:var(--gray-400);"> (${c.scenarios} scenario${c.scenarios!==1?'s':''})</span>` : ''}
    </div>`
  );
  if (term && !list.some(c => c.name.toLowerCase() === term)) {
    items.push(`<div class="cs-result cs-result-new" onmousedown="mapSelectCompany('${escapeHtml(q).replace(/'/g,"\\'")}',true)">+ Use "${escapeHtml(q)}" as new company</div>`);
  }
  if (!items.length) { results.style.display = 'none'; return; }
  results.innerHTML = items.join('');
  results.style.display = 'block';
}

function mapSelectCompany(name, isNew) {
  const input = document.getElementById('mapCompanyInput');
  const results = document.getElementById('mapCompanyResults');
  if (input) input.value = name;
  if (results) results.style.display = 'none';

  if (isNew) {
    checkCompanyOnEntry(name, finalName => {
      if (!finalName) { if (input) input.value = _mapCurrent.company || ''; return; }
      _mapCurrent.company = finalName;
      if (input) input.value = finalName;
      if (!getCompanies().some(c => c.name.toLowerCase() === finalName.toLowerCase())) {
        getCompanies().push({ name: finalName, scenarios:0, plans:0, stakeholders:0 });
      }
      mapUpdateGate();
      promptScenarioForCompany(finalName, () => {});
    });
  } else {
    _mapCurrent.company = name;
    mapUpdateGate();
    promptScenarioForCompany(name, () => {});
  }
}

function mapCompanyChanged(val) { /* legacy — no longer used */ }

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
  const groups = mapGetGroups(_mapCurrent);
  return groups.map((group, groupIndex) => {
    const groupMs = ms.filter(x => x.groupId === group.id);
    return `<section class="map-group" data-map-group="${escapeHtml(group.id)}">
      <div class="map-group-head">
        <span class="map-group-grip" aria-hidden="true">⋮⋮</span>
        <input class="map-group-name" value="${escapeHtml(group.name)}" aria-label="Grouping name" onchange="renameMapGroup('${group.id}',this.value)"/>
        <span class="map-group-count">${groupMs.length} milestone${groupMs.length===1?'':'s'}</span>
        <div class="map-group-actions">
          <button class="map-icon-btn" onclick="moveMapGroup('${group.id}',-1)" ${groupIndex===0?'disabled':''} title="Move grouping up" aria-label="Move ${escapeHtml(group.name)} up">↑</button>
          <button class="map-icon-btn" onclick="moveMapGroup('${group.id}',1)" ${groupIndex===groups.length-1?'disabled':''} title="Move grouping down" aria-label="Move ${escapeHtml(group.name)} down">↓</button>
          <button class="map-icon-btn map-icon-add" onclick="addMilestone('${group.id}','end')" title="Add milestone here">＋</button>
          <button class="map-icon-btn map-icon-remove" onclick="removeMapGroup('${group.id}')" ${groups.length===1?'disabled':''} title="Remove grouping">×</button>
        </div>
      </div>
      <div class="map-group-body">${groupMs.length ? groupMs.map((x, itemIndex) => {
      const overdue = x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date();
      return `<div class="map-ms-row ${x.status === 'done' ? 'map-ms-done' : ''}">
        <div class="map-ms-move">
          <button onclick="moveMilestone('${x.id}',-1)" ${itemIndex===0?'disabled':''} aria-label="Move milestone up">↑</button>
          <button onclick="moveMilestone('${x.id}',1)" ${itemIndex===groupMs.length-1?'disabled':''} aria-label="Move milestone down">↓</button>
        </div>
        <select class="map-ms-status" onchange="msField('${x.id}','status',this.value)">
          ${['pending','in_progress','done'].map(st => `<option value="${st}" ${x.status===st?'selected':''}>${st==='pending'?'○ Pending':st==='in_progress'?'◐ In progress':'● Done'}</option>`).join('')}
        </select>
        <input type="text" class="map-ms-title" value="${escapeHtml(x.title)}" onchange="msField('${x.id}','title',this.value)"/>
        <select class="map-ms-group" aria-label="Milestone grouping" onchange="moveMilestoneToGroup('${x.id}',this.value)">
          ${groups.map(g => `<option value="${escapeHtml(g.id)}" ${x.groupId===g.id?'selected':''}>${escapeHtml(g.name)}</option>`).join('')}
        </select>
        <select class="map-ms-owner" onchange="msField('${x.id}','owner',this.value)">
          ${Object.entries(MAP_OWNERS).map(([k,l]) => `<option value="${k}" ${x.owner===k?'selected':''}>${l}</option>`).join('')}
        </select>
        <input type="date" class="map-ms-date ${overdue?'map-ms-overdue':''}" value="${x.dueDate||''}" onchange="msField('${x.id}','dueDate',this.value)"/>
        <button class="btn btn-danger btn-sm" onclick="removeMilestone('${x.id}')">✕</button>
      </div>`;
    }).join('') : '<div class="map-group-empty">No milestones in this grouping. Add one here or move an existing milestone into it.</div>'}</div>
    </section>`;
  }).join('');
}

function msField(id, field, value) {
  const x = (_mapCurrent.milestones || []).find(m => m.id === id);
  if (x) { x[field] = value; if (field === 'status') renderMapEditor(); }
}
function addMilestone(groupId, position) {
  captureMapHeaderFields();
  _mapCurrent.milestones = _mapCurrent.milestones || [];
  const select = document.getElementById('mapAddGroup');
  const posSelect = document.getElementById('mapAddPosition');
  groupId = groupId || (select && select.value) || _mapCurrent.groups[0].id;
  position = position || (posSelect && posSelect.value) || 'end';
  const group = _mapCurrent.groups.find(g => g.id === groupId) || _mapCurrent.groups[0];
  const item = { id: mapUid(), groupId: group.id, phase: group.name, title: '', owner: 'joint', dueDate: '', status: 'pending' };
  const groupItems = _mapCurrent.milestones.filter(m => m.groupId === group.id);
  if (position === 'start' && groupItems.length) {
    const at = _mapCurrent.milestones.findIndex(m => m.id === groupItems[0].id);
    _mapCurrent.milestones.splice(at, 0, item);
  } else {
    const last = groupItems[groupItems.length - 1];
    const at = last ? _mapCurrent.milestones.findIndex(m => m.id === last.id) + 1 : _mapCurrent.milestones.length;
    _mapCurrent.milestones.splice(at, 0, item);
  }
  mapRebuildMilestoneOrder();
  renderMapEditor();
}
function removeMilestone(id) {
  _mapCurrent.milestones = (_mapCurrent.milestones || []).filter(m => m.id !== id);
  renderMapEditor();
}

function moveMilestone(id, delta) {
  captureMapHeaderFields();
  const item = _mapCurrent.milestones.find(m => m.id === id);
  if (!item) return;
  const groupItems = _mapCurrent.milestones.filter(m => m.groupId === item.groupId);
  const from = groupItems.findIndex(m => m.id === id);
  const to = from + delta;
  if (to < 0 || to >= groupItems.length) return;
  [groupItems[from], groupItems[to]] = [groupItems[to], groupItems[from]];
  const byGroup = new Map(_mapCurrent.groups.map(g => [g.id, g.id === item.groupId ? groupItems : _mapCurrent.milestones.filter(m => m.groupId === g.id)]));
  _mapCurrent.milestones = _mapCurrent.groups.flatMap(g => byGroup.get(g.id) || []);
  renderMapEditor();
}

function moveMilestoneToGroup(id, groupId) {
  captureMapHeaderFields();
  const item = _mapCurrent.milestones.find(m => m.id === id);
  const group = _mapCurrent.groups.find(g => g.id === groupId);
  if (!item || !group) return;
  item.groupId = group.id;
  item.phase = group.name;
  mapRebuildMilestoneOrder();
  renderMapEditor();
}

function addMapGroup() {
  captureMapHeaderFields();
  const input = document.getElementById('mapNewGroupName');
  const name = (input && input.value || '').trim();
  if (!name) { showToast('Enter a grouping name.'); return; }
  if (_mapCurrent.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) { showToast('That grouping already exists.'); return; }
  _mapCurrent.groups.push({ id: mapUid(), name: name.slice(0, 60) });
  renderMapEditor();
}

function renameMapGroup(id, value) {
  const group = _mapCurrent.groups.find(g => g.id === id);
  const name = String(value || '').trim();
  if (!group || !name) { renderMapEditor(); return; }
  group.name = name.slice(0, 60);
  _mapCurrent.milestones.filter(m => m.groupId === id).forEach(m => { m.phase = group.name; });
}

function moveMapGroup(id, delta) {
  captureMapHeaderFields();
  const from = _mapCurrent.groups.findIndex(g => g.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= _mapCurrent.groups.length) return;
  [_mapCurrent.groups[from], _mapCurrent.groups[to]] = [_mapCurrent.groups[to], _mapCurrent.groups[from]];
  mapRebuildMilestoneOrder();
  renderMapEditor();
}

function removeMapGroup(id) {
  const groups = _mapCurrent.groups;
  if (groups.length <= 1) { showToast('A plan needs at least one grouping.'); return; }
  const at = groups.findIndex(g => g.id === id);
  if (at < 0) return;
  const group = groups[at];
  const target = groups[at + 1] || groups[at - 1];
  const count = _mapCurrent.milestones.filter(m => m.groupId === id).length;
  const msg = count ? `Remove "${group.name}" and move its ${count} milestone${count===1?'':'s'} to "${target.name}"?` : `Remove the empty "${group.name}" grouping?`;
  if (!confirm(msg)) return;
  captureMapHeaderFields();
  _mapCurrent.milestones.filter(m => m.groupId === id).forEach(m => { m.groupId = target.id; m.phase = target.name; });
  groups.splice(at, 1);
  mapRebuildMilestoneOrder();
  renderMapEditor();
}

/* ── Persistence ── */
async function saveMap() {
  /* If the user typed a company name without clicking a suggestion, capture it now */
  const mapInput = document.getElementById('mapCompanyInput');
  if (mapInput && mapInput.value.trim() && !_mapCurrent.company) {
    _mapCurrent.company = mapInput.value.trim();
  }
  if (!_mapCurrent.company || !_mapCurrent.company.trim()) {
    showToast('Select a company before saving.');
    mapUpdateGate();
    return;
  }
  const body = {
    title:           document.getElementById('mapTitle').value.trim() || 'Joint Project Plan',
    company:         _mapCurrent.company.trim(),
    targetCloseDate: document.getElementById('mapCloseDate').value || null,
    milestones:      _mapCurrent.milestones || [],
    groups:          _mapCurrent.groups || []
  };
  const url    = _mapCurrent.id ? '/api/maps/' + _mapCurrent.id : '/api/maps';
  const method = _mapCurrent.id ? 'PUT' : 'POST';
  const resp = await apiFetch(url, { method, body: JSON.stringify(body) });
  if (!resp || !resp.ok) { showToast('Save failed.'); return; }
  const saved = await resp.json();
  _mapCurrent.id = saved.id;
  _mapCurrent.token = saved.token || _mapCurrent.token;
  Object.assign(_mapCurrent, { title: saved.title, company: saved.company, target_close_date: saved.target_close_date });
  showToast('Joint Project Plan saved.');
  await loadMaps();
  const fresh = _maps.find(x => x.id === saved.id);
  if (fresh) { _mapCurrent = mapNormalizeStructure(JSON.parse(JSON.stringify(fresh))); }
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
  const subject = 'Our Joint Project Plan — ' + (_mapCurrent.company || 'next steps');
  const body = `Hi,

Here's the live link to our shared Joint Project Plan for ${_mapCurrent.company || 'your evaluation'}:

${mapUrl()}

It shows every step to ${_mapCurrent.target_close_date ? 'our target date of ' + new Date(_mapCurrent.target_close_date).toLocaleDateString('en-US',{month:'long',day:'numeric'}) : 'go-live'}, who owns each one, and where we are. It helps us validate the value case, remove dependencies early, and keep the evaluation focused on measurable operational improvement. You can check off items on your side as they complete — it updates in real time for both of us.

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
    const stage     = window.getCurrentBuyCycleStageLabel?.() || 'Stage 2 — Define Economic Consequences';
    const impl      = v.implMonths || 3;
    mapNormalizeStructure(_mapCurrent);
    const groupNames = _mapCurrent.groups.map(g => g.name);

    const prompt = `You are a B2B enterprise sales strategist. Create a Joint Project Plan for closing a Cloud Inventory (inventory management SaaS) deal with ${company}, a ${industry} company. Current deal stage: ${stage}. ${closeDate ? 'Target close date: ' + closeDate + '.' : ''} Implementation takes ~${impl} months after signature.

Respond ONLY with a JSON array (no markdown fences, no preamble). Each element: {"phase": one of ${JSON.stringify(groupNames)}, "title": "specific actionable milestone under 12 words", "owner": "rep"|"prospect"|"joint", "weeksFromNow": number}. Create 10-14 milestones distributed across these groupings, covering: technical validation, business case sign-off, security review, legal/MSA redlines, procurement, executive alignment, and kickoff. Make prospect-owned items explicit (e.g. "Provide security questionnaire", "Confirm budget holder sign-off").`;

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
      const group = _mapCurrent.groups.find(g => g.name === it.phase) || _mapCurrent.groups[0];
      return {
        id: mapUid(),
        groupId: group.id,
        phase: group.name,
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
