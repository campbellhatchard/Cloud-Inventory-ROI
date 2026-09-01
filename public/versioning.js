/* ═══════════════════════════════════════════════════════════════════
   versioning.js  —  Scenario version control  (DB-backed)

   All mutations call /api/scenarios. savedScenarios (in app.js) is
   kept as a client-side cache and refreshed via fetchScenarios()
   after every operation.
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   saveScenarioWithVersion
   Entry point called by the Save button and window.saveScenario override.
   Validates required fields, then either shows a version dialog (for
   existing scenarios) or saves directly.
   ───────────────────────────────────────── */
function saveScenarioWithVersion(skipDialog) {
  const v = getVals(), r = calcROI(v);

  const missingCompany  = !v.company || !v.company.trim() || v.company.trim() === 'Prospect';
  const missingScenario = !v.name    || !v.name.trim()    || v.name.trim() === 'Unnamed scenario';

  if (missingCompany || missingScenario) {
    const missing = [];
    if (missingCompany)  missing.push('Company name');
    if (missingScenario) missing.push('Scenario name');
    showToast('⚠️ Required: ' + missing.join(' and ') + ' must be entered before saving.');
    if (missingCompany) {
      const el = document.getElementById('companyName');
      if (el) { el.style.borderColor = 'var(--red)'; el.focus(); setTimeout(() => { el.style.borderColor = ''; }, 3000); }
    }
    if (missingScenario) {
      const el = document.getElementById('scenarioName');
      if (el) { el.style.borderColor = 'var(--red)'; if (!missingCompany) el.focus(); setTimeout(() => { el.style.borderColor = ''; }, 3000); }
    }
    return;
  }

  if (!v.revenue && !v.inventory && !v.users) {
    showToast('Add at least one financial input (revenue, inventory value, or user count) before saving.');
    return;
  }

  /* Build data blob with calc results */
  const dataBlob = {
    ...v,
    fieldStates:        typeof fieldStates !== 'undefined' ? { ...fieldStates } : {},
    fieldProvenance:    typeof fieldProvenance !== 'undefined' ? { ...fieldProvenance } : {},
    annualBenefit:      r.annualBenefit,
    roi:                r.roi,
    npv3:               r.npv3,
    npv5:               r.npv5,
    payback:            r.payback,
    paybackFromSigning: r.paybackFromSigning,
    year1Benefit:       r.year1Benefit
    ,contractMonths: r.contractMonths,
    contractYears: r.contractYears,
    totalContractBenefit: r.totalContractBenefit,
    totalContractInvestment: r.totalContractInvestment,
    totalContractNetBenefit: r.totalContractNetBenefit,
    totalContractRoi: r.totalContractRoi,
    totalContractNpv: r.totalContractNpv,
    contractPayback: r.contractPayback
  };

  /* Check for existing scenario to version against */
  const existing = savedScenarios.find(
    s => s.company === v.company && s.name === v.name && s.isCurrent !== false
  );

  if (existing && !skipDialog && !document.getElementById('saveVersionModal')) {
    showSaveVersionDialog(v, r, dataBlob, existing);
    return;
  }

  commitSave(v, dataBlob, existing ? existing.baseId : null, '');
}

/* ─────────────────────────────────────────
   commitSave  — actually posts to the API
   ───────────────────────────────────────── */
async function commitSave(v, dataBlob, baseId, note) {
  return _doSave(v, dataBlob, baseId, note);
}

/* ─────────────────────────────────────────
   showSaveVersionDialog
   Shows a dialog comparing current vs new version before saving.
   ───────────────────────────────────────── */
function showSaveVersionDialog(v, r, dataBlob, existing) {
  const nextVersion = (existing.version || 1) + 1;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'saveVersionModal';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px;">
      <button class="modal-close" aria-label="Close" onclick="document.getElementById('saveVersionModal').remove()">✕</button>
      <div class="modal-title">Save scenario — version control</div>
      <div class="version-dialog-info">
        <div class="vd-current">
          <div class="vd-label">Current saved version</div>
          <div class="vd-version">v${existing.version||1}</div>
          <div class="vd-meta">${existing.date} · ${fmtFull(existing.annualBenefit)}/yr · ${fmtPct(existing.roi)} ROI</div>
        </div>
        <div class="vd-arrow">→</div>
        <div class="vd-new">
          <div class="vd-label">New version to save</div>
          <div class="vd-version" style="color:var(--cyan-dark);">v${nextVersion}</div>
          <div class="vd-meta">${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${fmtFull(r.annualBenefit)}/yr · ${fmtPct(r.roi)} ROI</div>
        </div>
      </div>
      <div class="field" style="margin-top:1rem;">
        <label>Version note (optional)</label>
        <input type="text" id="versionNoteInput" placeholder="e.g. Updated SOW cost, revised OTIF baseline" style="width:100%;"/>
      </div>
      <div class="btn-row" style="margin-top:1rem;">
        <button class="btn btn-primary" onclick="
          const note = document.getElementById('versionNoteInput').value;
          document.getElementById('saveVersionModal').remove();
          commitSave(window._pendingV, window._pendingData, '${existing.baseId}', note);
        ">Save as v${nextVersion}</button>
        <button class="btn btn-ghost" onclick="document.getElementById('saveVersionModal').remove()">Cancel</button>
      </div>
    </div>`;

  /* Store pending data so the onclick can access it */
  window._pendingV    = v;
  window._pendingData = dataBlob;

  document.body.appendChild(modal);
  document.getElementById('versionNoteInput').focus();
}

/* ─────────────────────────────────────────
   showVersionHistory
   Fetches all versions for a baseId from the API and shows a modal.
   ───────────────────────────────────────── */
async function showVersionHistory(baseIdOrScenarioId) {
  const any = savedScenarios.find(s => s.baseId === baseIdOrScenarioId || s.id === baseIdOrScenarioId);
  if (!any) { showToast('Cannot find version history.'); return; }
  try {
    const resp = await apiFetch('/api/scenarios/' + any.id + '/versions');
    if (!resp || !resp.ok) { showToast('Could not load version history.'); return; }
    const versions = await resp.json();
    if (!versions.length) { showToast('No version history found.'); return; }
    const rows = typeof normaliseRow === 'function' ? versions.map(normaliseRow) : versions;
    const vbtn = document.getElementById('calcVersionsBtn');
    if (vbtn) vbtn.textContent = '\u{1F557} ' + rows.length + ' version' + (rows.length !== 1 ? 's' : '');
    renderVersionHistoryModal(rows);
  } catch(e) {
    console.error('showVersionHistory error:', e.message);
    showToast('Failed to load version history.');
  }
}

function renderVersionHistoryModal(rows) {
  var old = document.getElementById('versionHistoryModal');
  if (old) old.remove();
  var modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'versionHistoryModal';
  var singleVersion = rows.length === 1;
  var hasMulti = rows.length >= 2;
  var scenName = rows.length ? (typeof escapeHtml === 'function' ? escapeHtml(rows[0].name) : rows[0].name) : '';

  var tableRows = rows.map(function(s) {
    var chkCell = hasMulti ? '<td><input type="checkbox" class="vh-diff-chk" data-id="' + s.id + '" data-ver="' + (s.version||1) + '" onchange="vhCheckboxChanged()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--cyan);"/></td>' : '';
    var verBadge = '<span class="vh-ver-badge ' + (s.isCurrent ? 'vh-current-badge' : '') + '">v' + (s.version||1) + (s.isCurrent ? ' \u2605' : '') + '</span>';
    var actions = '<div style="display:flex;gap:4px;">'
      + '<button class="btn btn-ghost btn-sm" onclick="loadScenario(\'' + s.id + '\');document.getElementById(\'versionHistoryModal\').remove();">Load</button>'
      + (!s.isCurrent
          ? '<button class="btn btn-danger btn-sm" onclick="deleteVersion(\'' + s.id + '\',\'' + scenName.replace(/'/g, "\\'") + '\')">Del</button>'
          : '<span style="font-size:10px;color:var(--green);padding:0 6px;line-height:28px;">Current</span>')
      + '</div>';
    return '<tr class="' + (s.isCurrent ? 'vh-current' : '') + '">'
      + chkCell
      + '<td>' + verBadge + '</td>'
      + '<td style="font-size:12px;">' + s.date + '</td>'
      + '<td class="pos">' + fmtFull(s.annualBenefit) + '</td>'
      + '<td style="color:var(--blue);font-weight:600;">' + fmtPct(s.roi) + '</td>'
      + '<td class="' + (s.npv5 >= 0 ? 'pos' : 'neg') + '">' + fmtFull(s.npv5) + '</td>'
      + '<td style="color:var(--gray-500);font-size:11px;">' + (s.versionNote || '\u2014') + '</td>'
      + '<td>' + actions + '</td>'
      + '</tr>';
  }).join('');

  modal.innerHTML = '<div class="modal" style="max-width:780px;">'
    + '<button class="modal-close" aria-label="Close" onclick="document.getElementById(\'versionHistoryModal\').remove()">\u2715</button>'
    + '<div class="modal-title">Version history \u2014 "' + scenName + '"'
    + '<span style="font-size:12px;font-weight:400;color:var(--gray-500);margin-left:8px;">' + rows.length + ' version' + (rows.length !== 1 ? 's' : '') + '</span></div>'
    + (hasMulti ? '<div class="vh-diff-hint" id="vhDiffHint">Select two versions to compare</div>' : '')
    + '<div class="vh-table-wrap"><table class="vh-table"><thead><tr>'
    + (hasMulti ? '<th style="width:28px;"></th>' : '')
    + '<th>Version</th><th>Saved</th><th>Annual benefit</th><th>ROI</th><th>NPV 5yr</th><th>Note</th><th>Actions</th>'
    + '</tr></thead><tbody>' + tableRows + '</tbody></table></div>'
    + '<div class="btn-row" style="margin-top:1rem;">'
    + (hasMulti ? '<button class="btn btn-primary" id="vhDiffBtn" disabled onclick="vhStartDiff()">Compare selected</button>' : '')
    + '<button class="btn btn-ghost" onclick="document.getElementById(\'versionHistoryModal\').remove()">Close</button>'
    + (singleVersion ? '<span style="font-size:12px;color:var(--gray-500);">Save again to create a second version and enable comparison.</span>' : '')
    + '</div></div>';

  modal._vhRows = rows;
  document.body.appendChild(modal);
}

function vhCheckboxChanged() {
  var checked = Array.from(document.querySelectorAll('.vh-diff-chk:checked'));
  var all     = Array.from(document.querySelectorAll('.vh-diff-chk'));
  var btn     = document.getElementById('vhDiffBtn');
  var hint    = document.getElementById('vhDiffHint');
  all.forEach(function(cb) { cb.disabled = checked.length >= 2 && !cb.checked; });
  if (btn) btn.disabled = checked.length !== 2;
  if (hint) {
    if (checked.length === 0)      hint.textContent = 'Select two versions to compare';
    else if (checked.length === 1) hint.textContent = 'Select one more version to compare';
    else hint.textContent = 'Comparing v' + checked[0].dataset.ver + ' and v' + checked[1].dataset.ver + ' \u2014 click Compare selected';
  }
}

async function vhStartDiff() {
  var checked = Array.from(document.querySelectorAll('.vh-diff-chk:checked'));
  if (checked.length !== 2) return;
  var idA = checked[0].dataset.id, idB = checked[1].dataset.id;
  var verA = Number(checked[0].dataset.ver), verB = Number(checked[1].dataset.ver);
  var leftId  = verA < verB ? idA : idB,  rightId  = verA < verB ? idB : idA;
  var leftVer = verA < verB ? verA : verB, rightVer = verA < verB ? verB : verA;
  var modal = document.getElementById('versionHistoryModal');
  var rows  = modal ? modal._vhRows : [];
  var scenName = rows.length ? rows[0].name : 'Scenario';
  var btn = document.getElementById('vhDiffBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading\u2026'; }
  try {
    var results = await Promise.all([apiFetch('/api/scenarios/' + leftId), apiFetch('/api/scenarios/' + rightId)]);
    if (!results[0] || !results[0].ok || !results[1] || !results[1].ok) { showToast('Could not load scenario data.'); return; }
    var datas = await Promise.all([results[0].json(), results[1].json()]);
    if (modal) modal.remove();
    showVersionDiff(datas[0], datas[1], leftVer, rightVer, scenName, rows);
  } catch(e) {
    console.error('vhStartDiff error:', e.message);
    showToast('Failed to load comparison data.');
    if (btn) { btn.disabled = false; btn.textContent = 'Compare selected'; }
  }
}

function showVersionDiff(older, newer, verOld, verNew, scenName, allRows) {
  var old = document.getElementById('versionDiffModal');
  if (old) old.remove();
  var oData = older.data || {};
  var nData = newer.data || {};

  function fmt$(v) { return (v != null && v !== '') ? fmtFull(Number(v)) : '\u2014'; }
  function fmtN(v) { return (v != null && v !== '') ? Number(v).toLocaleString() : '\u2014'; }
  function fmtP(v) { return (v != null && v !== '') ? Math.round(Number(v)) + '%' : '\u2014'; }
  function fmtPD(v){ return (v != null && v !== '') ? (Number(v)*100).toFixed(1) + '%' : '\u2014'; }
  function fmtY(v) { return (v != null && v !== '') ? Number(v).toFixed(1) + 'x' : '\u2014'; }
  function fmtM(v) { return (v != null && v !== '') ? Number(v) + ' mo' : '\u2014'; }

  var GROUPS = [
    { label:'ROI outputs', icon:'\ud83d\udcca', fields:[
      { label:'Annual benefit',    key:'annualBenefit', fmt:fmt$,  higher:true },
      { label:'Year 1 ROI',        key:'roi',           fmt:fmtP,  higher:true },
      { label:'5-yr NPV',          key:'npv5',          fmt:fmt$,  higher:true },
      { label:'Payback',           key:'payback',       fmt:fmtM,  higher:false }
    ]},
    { label:'Core inputs', icon:'\ud83c\udfe2', fields:[
      { label:'Annual revenue',    key:'revenue',       fmt:fmt$, higher:true },
      { label:'Inventory users',   key:'users',         fmt:fmtN, higher:true },
      { label:'Labor cost / user', key:'labor',         fmt:fmt$, higher:false },
      { label:'Inventory value',   key:'inventory',     fmt:fmt$, higher:true },
      { label:'Annual IT cost',    key:'itCost',        fmt:fmt$, higher:true },
      { label:'Annual write-off',  key:'annualWriteOff',fmt:fmt$, higher:true }
    ]},
    { label:'OTIF & inventory turns', icon:'\ud83d\ude9a', fields:[
      { label:'OTIF baseline',     key:'otifBaseline',     fmt:fmtP,  higher:false },
      { label:'OTIF target',       key:'otifTarget',       fmt:fmtP,  higher:true },
      { label:'Inv turns (current)',key:'invTurnsCurrent',  fmt:fmtY,  higher:true },
      { label:'Inv turns (benchmark)',key:'invTurnsBenchmark',fmt:fmtY, higher:true }
    ]},
    { label:'WMS & operations', icon:'\ud83d\udce6', fields:[
      { label:'Orders / yr',           key:'ordersPerYr',       fmt:fmtN, higher:true },
      { label:'Cost per order',        key:'costPerOrder',      fmt:fmt$, higher:false },
      { label:'Order error rate',      key:'orderErrorPct',     fmt:fmtP, higher:false },
      { label:'Cost per error',        key:'costPerError',      fmt:fmt$, higher:false },
      { label:'Downtime events / yr',  key:'downtimeEventsYr',  fmt:fmtN, higher:false },
      { label:'Cost / downtime hour',  key:'downtimeCostPerHr', fmt:fmt$, higher:false },
      { label:'Annual expedite spend', key:'expediteSpendYr',   fmt:fmt$, higher:false },
      { label:'Count days / yr',       key:'countDaysYr',       fmt:fmtN, higher:false }
    ]},
    { label:'Investment & timeline', icon:'\ud83d\udcb0', fields:[
      { label:'Annual subscription', key:'invest',     fmt:fmt$,  higher:false },
      { label:'Implementation',      key:'implMonths', fmt:fmtM,  higher:false },
      { label:'Ramp \u2014 month 1', key:'ramp1',     fmt:fmtPD, higher:true },
      { label:'Ramp \u2014 month 2', key:'ramp2',     fmt:fmtPD, higher:true },
      { label:'Ramp \u2014 steady',  key:'ramp3',     fmt:fmtPD, higher:true }
    ]}
  ];

  var totalChanged = 0;
  var groupHtml = GROUPS.map(function(g) {
    var fieldRows = g.fields.map(function(f) {
      var vOld = oData[f.key], vNew = nData[f.key];
      var sOld = (vOld == null || vOld === '') ? '' : String(Number(vOld).toFixed(6));
      var sNew = (vNew == null || vNew === '') ? '' : String(Number(vNew).toFixed(6));
      if (sOld === sNew) return '';
      var fOld = f.fmt(vOld), fNew = f.fmt(vNew);
      var arrow = '', arrowCls = '';
      if (vOld !== '' && vNew !== '' && vOld != null && vNew != null) {
        var nOld = Number(vOld), nNew = Number(vNew);
        if (!isNaN(nOld) && !isNaN(nNew) && nOld !== nNew) {
          var improved = f.higher ? nNew > nOld : nNew < nOld;
          arrow = improved ? '\u2191' : '\u2193';
          arrowCls = improved ? 'vd-arrow-up' : 'vd-arrow-down';
        }
      }
      totalChanged++;
      return '<tr><td class="vd-field-label">' + f.label + '</td>'
        + '<td class="vd-old">' + fOld + '</td>'
        + '<td class="vd-new vd-changed">' + fNew + (arrow ? ' <span class="' + arrowCls + '">' + arrow + '</span>' : '') + '</td>'
        + '</tr>';
    }).filter(Boolean).join('');
    if (!fieldRows) return '';
    return '<div class="vd-group"><div class="vd-group-head">' + g.icon + ' ' + g.label + '</div>'
      + '<table class="vd-table"><tbody>' + fieldRows + '</tbody></table></div>';
  }).filter(Boolean).join('');

  var noChanges = totalChanged === 0;
  var escapedName = typeof escapeHtml === 'function' ? escapeHtml(scenName) : scenName;
  var olderDate = older.updated_at ? new Date(older.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '\u2014';
  var newerDate = newer.updated_at ? new Date(newer.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '\u2014';

  var modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'versionDiffModal';
  modal.innerHTML = '<div class="modal" style="max-width:680px;">'
    + '<button class="modal-close" aria-label="Close" onclick="document.getElementById(\'versionDiffModal\').remove()">\u2715</button>'
    + '<div class="modal-title">Comparing \u2014 "' + escapedName + '"</div>'
    + '<div class="vd-header">'
    + '<div class="vd-ver vd-ver-old"><div class="vd-ver-label">v' + verOld + '</div><div class="vd-ver-date">' + olderDate + '</div></div>'
    + '<div class="vd-arrow-center">\u2192</div>'
    + '<div class="vd-ver vd-ver-new"><div class="vd-ver-label">v' + verNew + (newer.is_current ? ' \u2605 Current' : '') + '</div><div class="vd-ver-date">' + newerDate + '</div></div>'
    + '</div>'
    + (noChanges
      ? '<div class="empty-state"><p>No differences found between these two versions.</p></div>'
      : '<div class="vd-col-labels"><span></span><span>v' + verOld + '</span><span>v' + verNew + '</span></div>'
        + '<div class="vd-body">' + groupHtml + '</div>')
    + '<div class="btn-row" style="margin-top:1rem;">'
    + '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'versionDiffModal\').remove();renderVersionHistoryModal(window._vhRowsCache);">\u2190 Back to history</button>'
    + '<button class="btn btn-primary btn-sm" onclick="loadScenario(\'' + newer.id + '\');document.getElementById(\'versionDiffModal\').remove();">Load v' + verNew + '</button>'
    + '<button class="btn btn-ghost btn-sm" onclick="loadScenario(\'' + older.id + '\');document.getElementById(\'versionDiffModal\').remove();">Load v' + verOld + '</button>'
    + '<button class="btn btn-ghost" onclick="document.getElementById(\'versionDiffModal\').remove()">Close</button>'
    + '</div></div>';

  window._vhRowsCache = allRows;
  document.body.appendChild(modal);
}

window.vhCheckboxChanged       = vhCheckboxChanged;
window.vhStartDiff             = vhStartDiff;
window.showVersionDiff         = showVersionDiff;
window.renderVersionHistoryModal = renderVersionHistoryModal;


async function deleteVersion(id, name) {
  if (!confirm(`Delete this version of "${name}"? This cannot be undone.`)) return;
  try {
    const resp = await apiFetch('/api/scenarios/' + id, { method: 'DELETE' });
    if (!resp || !resp.ok) { showToast('Delete failed.'); return; }
    document.getElementById('versionHistoryModal')?.remove();
    showToast('Version deleted.');
    await fetchScenarios();
  } catch(e) {
    showToast('Delete failed — check your connection.');
  }
}

/* ─────────────────────────────────────────
   renderListVersioned
   Renders the Saved Scenarios tab with version grouping.
   Uses the savedScenarios cache (populated by fetchScenarios).
   ───────────────────────────────────────── */
function renderListVersioned() {
  const el = document.getElementById('scenarioList');
  if (!el) return;

  /* Migrate any old records without baseId */
  savedScenarios = savedScenarios.map(s => ({
    ...s,
    baseId:    s.baseId    || ('base_' + s.id),
    version:   s.version   || 1,
    isCurrent: s.isCurrent !== undefined ? s.isCurrent : true
  }));

  /* One entry per baseId — show the current (or most-recent) version */
  const seen = new Set();
  const display = [];
  savedScenarios.forEach(s => {
    if (seen.has(s.baseId)) return;
    seen.add(s.baseId);
    const group = savedScenarios.filter(x => x.baseId === s.baseId)
      .sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return (b.version||1) - (a.version||1);
      });
    display.push(group[0]);
  });

  const me = window.ciAuth ? window.ciAuth.getUser() : {};

  /* Apply ownership filter */
  let pool = display;
  if (ownershipFilter === 'mine')   pool = display.filter(s => !s.ownerUsername || s.ownerUsername === me.username);
  if (ownershipFilter === 'shared') pool = display.filter(s => s.ownerUsername && s.ownerUsername !== me.username);

  /* Industry filter — applied on top of ownership filter */
  if (typeof industryFilter !== 'undefined' && industryFilter) {
    pool = pool.filter(s => s.industry === industryFilter);
  }

  const filtered = pool.filter(s => typeof scenarioMatchesStageFilter==='function'?scenarioMatchesStageFilter(s,stageFilter):true);

  if (!display.length) {
    el.innerHTML = '<div class="empty-state"><p>No scenarios saved yet. Build one in the Calculator tab.</p></div>';
    renderStageFilters();
    return;
  }

  /* Show filtered-empty state if filters exclude everything */
  if (!filtered.length) {
    const isFiltered = ownershipFilter !== 'all' || stageFilter || industryFilter;
    el.innerHTML = '<div class="empty-state"><p>'
      + (isFiltered ? 'No scenarios match the current filters. Try clearing a filter above.' : 'No scenarios to show.')
      + '</p></div>';
    renderStageFilters();
    return;
  }

  const initials    = n => n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';
  const payStr      = pb => pb===null?'—':pb>=60?'60+mo':pb.toFixed(1)+'mo';

  el.innerHTML = `<ul class="scenario-list">${filtered.map(s => {
    const versionCount = savedScenarios.filter(x => x.baseId === s.baseId).length;
    const isShared = s.ownerUsername && s.ownerUsername !== me.username;
    const initials2 = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';
    const repAv = isShared ? `<span class="scenario-rep-badge" title="Owned by ${s.ownerUsername}"><span class="scenario-rep-av">${initials2(s.ownerUsername)}</span>${s.ownerUsername}</span>` : '';
    const kpiColor = s.roi > 0 ? 'var(--green)' : 'var(--red,#DC2626)';
    return `
    <li class="scenario-item scenario-item-v2" data-scenario-id="${s.id}">
      <label class="compare-check" title="Add to comparison">
        <input type="checkbox" ${compareIds.has(s.id)?'checked':''} onchange="toggleCompare('${s.id}')"/>
      </label>
      <div class="scenario-avatar">${initials(s.company||s.name)}</div>
      <div class="scenario-info">
        <div class="scenario-name-row">
          <span class="scenario-name">${s.name}</span>
          <span class="version-badge">v${s.version||1}</span>
          ${repAv}
          ${versionCount > 1 ? `<button class="version-history-btn" onclick="showVersionHistory('${s.baseId}')" title="View ${versionCount} versions">📋 ${versionCount}</button>` : ''}
        </div>
        <div class="scenario-meta">
          <span class="scenario-company">${s.company||'—'}</span>
          ${s.industry&&IND[s.industry]?`<span class="scenario-meta-sep">·</span><span>${IND[s.industry].label}</span>`:''}
          <span class="scenario-meta-sep">·</span><span>${s.date}</span>
          <span class="scenario-meta-sep">·</span><span>Payback: ${payStr(s.payback)}</span>
        </div>
        <div class="scenario-pills-row">
          <span class="stage-pill">${typeof scenarioStageDisplay==='function'?scenarioStageDisplay(s):(s.dealStage||'Stage 2')}</span>
          ${s.outcome?`<span class="outcome-pill outcome-${s.outcome}">${outcomeLabel(s.outcome)}${s.outcome==='won'&&s.realizedValue!=null?' · '+fmtFull(s.realizedValue)+'/yr actual':''}</span>`:''}
          ${s.versionNote?`<span class="version-note-inline">${s.versionNote}</span>`:''}
        </div>
      </div>
      <div class="scenario-kpis">
        <div class="sk-main" style="color:${kpiColor}">${fmtFull(s.annualBenefit)}/yr</div>
        <div class="sk-sub">${fmtPct(s.roi)} ROI · NPV5: ${fmtFull(s.npv5)}</div>
        <div class="sk-sub">Payback: ${payStr(s.payback)}</div>
      </div>
      <div class="scenario-actions">
        <button class="btn btn-primary btn-sm" onclick="loadScenario('${s.id}')">Load</button>
        <button class="btn btn-ghost btn-sm" onclick="cloneScenario('${s.id}')" title="Duplicate">Duplicate</button>
        <button class="btn btn-ghost btn-sm" onclick="openScenarioReadiness('${s.id}',${!(s.currentBuyCycleStage===7&&s.outcome)})">${s.currentBuyCycleStage===7&&s.outcome?'View Close Details':'Close Opportunity'}</button>
        ${s.currentBuyCycleStage===7&&s.outcome==='won'?`<button class="btn btn-ghost btn-sm" onclick="openRealizedValueModal('${s.baseId}')">${s.realizedValue==null?'Record':'Update'} Realized Value</button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="generateShareURLFromScenario('${s.id}')" title="Copy share link">🔗</button>
        ${versionCount > 1 ? `<button class="btn btn-ghost btn-sm" onclick="showVersionHistory('${s.baseId}')">History</button>` : ''}
        ${versionCount > 1 ? `<button class="btn btn-ghost btn-sm" onclick="compareVersions('${s.baseId}')">Compare v</button>` : ''}
        ${!isShared ? `<button class="btn btn-ghost btn-sm" onclick="openShareModal('${s.id}','${s.name.replace(/'/g,"\\'")}')">Share</button>` : ''}
        ${!isShared ? `<button class="btn btn-danger btn-sm" onclick="deleteScenarioGroup('${s.baseId}')">Delete</button>` : ''}
      </div>
    </li>`;
  }).join('')}</ul>
  ${compareIds.size>=2?`<div class="compare-cta"><button class="btn btn-primary" onclick="switchTab('compare')">Compare ${compareIds.size} scenarios →</button></div>`:''}`;

  renderStageFilters();
}

/* ─────────────────────────────────────────
   deleteScenarioGroup  — delete all versions
   ───────────────────────────────────────── */
async function deleteScenarioGroup(baseId) {
  const versions = savedScenarios.filter(s => s.baseId === baseId);
  const name = versions[0]?.name || 'this scenario';
  if (!confirm(`Delete "${name}" and all ${versions.length} version(s)? This cannot be undone.`)) return;

  try {
    const resp = await apiFetch('/api/scenarios/group/' + baseId, { method: 'DELETE' });
    if (!resp || !resp.ok) { showToast('Delete failed.'); return; }
    versions.forEach(s => compareIds.delete(s.id));
    showToast('Scenario and all versions deleted.');
    await fetchScenarios();
  } catch(e) {
    console.error('deleteScenarioGroup error:', e.message);
    showToast('Delete failed — check your connection.');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   cloneScenario — duplicate a saved scenario as a NEW business case.
   Loads the source inputs into the calculator but strips the identity
   (base_id/version/scenario id) so the next save starts a fresh group
   rather than a new version of the source. The rep sets a new customer
   / name and saves.
   ═══════════════════════════════════════════════════════════════════ */
async function cloneScenario(id) {
  try {
    let scenario = savedScenarios.find(x => x.id === id);
    let inputs = scenario?.inputs;
    if (!inputs) {
      const resp = await apiFetch('/api/scenarios/' + id);
      if (!resp || !resp.ok) { showToast('Could not load scenario to duplicate.'); return; }
      const full = await resp.json();
      inputs = full.data;
    }
    if (!inputs) { showToast('Scenario data not found.'); return; }

    /* Copy inputs, strip identity so save creates a new base_id (new group). */
    const copy = { ...inputs };
    delete copy.baseId; delete copy.base_id; delete copy.id;
    delete copy.version; delete copy.is_current; delete copy.versionNote;
    copy.name = (inputs.name ? inputs.name + ' (copy)' : 'New scenario');

    if (typeof loadFromObject === 'function') loadFromObject(copy);
    /* A clone is a brand-new business case — detach any discovery session. */
    if (typeof resetDiscoveryForScenario === 'function') resetDiscoveryForScenario(null);
    /* Save matches on company+name; the "(copy)" name + a new customer ensures
       the next Save creates a fresh scenario group rather than a new version. */

    switchTab('calc');
    showToast('Duplicated — set the customer and name, then Save to create a new business case.');
    trackEvent('scenario_cloned', { fromCompany: inputs.company || '' });
  } catch(e) {
    console.error('cloneScenario error:', e.message);
    showToast('Failed to duplicate scenario.');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   compareVersions — side-by-side "what changed" between two versions
   of the same base_id. Purely client-side diff of the stored data JSON.
   ═══════════════════════════════════════════════════════════════════ */
async function compareVersions(baseId) {
  try {
    const resp = await apiFetch('/api/scenarios?base_id=' + encodeURIComponent(baseId));
    if (!resp || !resp.ok) { showToast('Could not load versions.'); return; }
    const versions = await resp.json();
    if (!Array.isArray(versions) || versions.length < 2) { showToast('Need at least two versions to compare.'); return; }
    /* Sort newest first; default compare newest vs previous. */
    versions.sort((a,b) => (b.version||0) - (a.version||0));
    renderVersionCompare(baseId, versions, versions[1].id, versions[0].id);
  } catch(e) {
    console.error('compareVersions error:', e.message);
    showToast('Failed to compare versions.');
  }
}

/* Fields worth diffing (label + how to format). Inputs that drive ROI. */
const DIFF_FIELDS = [
  ['company','Company',null],['name','Scenario name',null],
  ['userCount','Users',null],['annualWriteOff','Write-off $','money'],
  ['inventoryValue','Inventory value','money'],['invTurnsCurrent','Inventory turns',null],
  ['otifBaseline','OTIF baseline','pct'],['otifTarget','OTIF target','pct'],
  ['itCost','IT cost','money'],['revenue','Revenue','money'],
  ['annualBenefit','Annual benefit','money'],['roi','ROI','pct'],
  ['npv3','NPV (3yr)','money'],['npv5','NPV (5yr)','money']
];

async function renderVersionCompare(baseId, versions, idA, idB) {
  /* Fetch full data for both selected versions. */
  const fetchData = async (id) => {
    const r = await apiFetch('/api/scenarios/' + id);
    if (!r || !r.ok) return null;
    const full = await r.json();
    return full.data || {};
  };
  const [dA, dB] = await Promise.all([fetchData(idA), fetchData(idB)]);
  if (!dA || !dB) { showToast('Could not load version data.'); return; }

  const fmtVal = (v, kind) => {
    if (v === undefined || v === null || v === '') return '—';
    if (kind === 'money') return (typeof fmtFull === 'function') ? fmtFull(v) : '$' + v;
    if (kind === 'pct')   return (typeof fmtPct === 'function') ? fmtPct(v) : v + '%';
    return String(v);
  };
  const vLabel = (id) => { const x = versions.find(v => v.id === id); return x ? ('v' + x.version) : '—'; };

  const rows = DIFF_FIELDS.map(([key,label,kind]) => {
    const a = dA[key], b = dB[key];
    const changed = String(a) !== String(b);
    const delta = (kind === 'money' || kind === 'pct') && typeof a === 'number' && typeof b === 'number' && a !== b
      ? `<span class="vc-delta ${b>a?'up':'down'}">${b>a?'▲':'▼'} ${fmtVal(Math.abs(b-a), kind)}</span>` : '';
    return `<tr class="${changed?'vc-changed':''}">
      <td class="vc-label">${label}</td>
      <td>${fmtVal(a,kind)}</td>
      <td>${fmtVal(b,kind)} ${delta}</td>
    </tr>`;
  }).join('');

  const options = versions.map(v => `v${v.version}`).join(', ');
  const selA = versions.map(v => `<option value="${v.id}" ${v.id===idA?'selected':''}>v${v.version}</option>`).join('');
  const selB = versions.map(v => `<option value="${v.id}" ${v.id===idB?'selected':''}>v${v.version}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'versionCompareModal';
  modal.innerHTML = `<div class="modal" style="max-width:620px;">
    <div class="modal-title">What changed between versions</div>
    <div class="vc-selectors">
      <label>From <select onchange="reRenderVersionCompare('${baseId}', this.value, document.getElementById('vcSelB').value)">${selA}</select></label>
      <label>To <select id="vcSelB" onchange="reRenderVersionCompare('${baseId}', document.querySelector('#versionCompareModal select').value, this.value)">${selB}</select></label>
    </div>
    <table class="vc-table"><thead><tr><th>Field</th><th>${vLabel(idA)}</th><th>${vLabel(idB)}</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <div class="vc-hint">Highlighted rows changed between the selected versions.</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="document.getElementById('versionCompareModal').remove()">Close</button>
    </div>
  </div>`;
  const existing = document.getElementById('versionCompareModal');
  if (existing) existing.remove();
  document.body.appendChild(modal);
  window._vcVersions = versions;
}

function reRenderVersionCompare(baseId, idA, idB) {
  const versions = window._vcVersions || [];
  renderVersionCompare(baseId, versions, idA, idB);
}

/* Governed close-state display and separate post-sale value measurement. */
function outcomeLabel(o) {
  return o === 'won' ? '✓ Closed Won' : o === 'lost' ? '✗ Closed Lost' : '';
}

async function openScenarioReadiness(id,openClose=false){
  const loaded=await loadScenario(id);if(loaded===false)return;
  switchTab('readiness');
  if(typeof renderBuyerReadiness==='function')await renderBuyerReadiness();
  if(openClose&&typeof openCloseOpportunity==='function')setTimeout(()=>openCloseOpportunity(),50);
}

function openRealizedValueModal(baseId){
  const s=savedScenarios.find(x=>x.baseId===baseId&&x.isCurrent)||savedScenarios.find(x=>x.baseId===baseId);
  if(!s||s.currentBuyCycleStage!==7||s.outcome!=='won'){showToast('Realized value is available only for a governed Closed Won opportunity.');return;}
  const modal=document.createElement('div');modal.className='modal-overlay';modal.id='realizedValueModal';
  modal.innerHTML=`<div class="modal" style="max-width:480px;"><div class="modal-title">${s.realizedValue==null?'Record':'Update'} Realized Value — ${escapeOutcomeHtml(s.company||s.name)}</div><p style="font-size:12px;color:var(--gray-500);margin-bottom:14px;">Projected annual value: <strong>${fmtFull(s.annualBenefit||0)}</strong>. Record measured annual value without changing the governed Closed Won outcome.</p><label class="oc-field-label">Measured annual value</label><input type="number" min="0" id="realizedValueInput" class="oc-input" value="${s.realizedValue??''}" placeholder="Enter measured annual value"><div class="modal-actions"><button class="btn btn-ghost" onclick="document.getElementById('realizedValueModal').remove()">Cancel</button><button class="btn btn-primary" onclick="saveRealizedValue('${baseId}')">Save realized value</button></div></div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});document.getElementById('realizedValueModal')?.remove();document.body.appendChild(modal);
}

async function saveRealizedValue(baseId){
  const raw=document.getElementById('realizedValueInput')?.value;
  const realizedValue=raw===''?null:Number(raw);
  if(realizedValue!==null&&(!Number.isFinite(realizedValue)||realizedValue<0)){showToast('Enter a non-negative realized value or leave it blank.');return;}
  const response=await apiFetch('/api/scenarios/group/'+encodeURIComponent(baseId)+'/realized-value',{method:'PUT',body:JSON.stringify({realizedValue})});
  const result=response?await response.json().catch(()=>({})):{};if(!response||!response.ok){showToast(result.error||'Could not save realized value.');return;}
  document.getElementById('realizedValueModal')?.remove();showToast('Realized value saved. Closed Won remains unchanged.');await fetchScenarios();
}
function escapeOutcomeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
