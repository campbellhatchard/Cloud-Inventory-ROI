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
    annualBenefit:      r.annualBenefit,
    roi:                r.roi,
    npv3:               r.npv3,
    npv5:               r.npv5,
    payback:            r.payback,
    paybackFromSigning: r.paybackFromSigning,
    year1Benefit:       r.year1Benefit
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
      <button class="modal-close" onclick="document.getElementById('saveVersionModal').remove()">✕</button>
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
        <button class="btn btn-cta" onclick="
          const note = document.getElementById('versionNoteInput').value;
          document.getElementById('saveVersionModal').remove();
          commitSave(window._pendingV, window._pendingData, '${existing.baseId}', note);
        ">Save as v${nextVersion}</button>
        <button class="btn btn-ghost" onclick="
          document.getElementById('saveVersionModal').remove();
          commitSave(window._pendingV, window._pendingData, '${existing.baseId}', '');
        ">Overwrite current</button>
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
  /* Find any scenario with this baseId to get an id for the versions endpoint */
  const any = savedScenarios.find(s => s.baseId === baseIdOrScenarioId || s.id === baseIdOrScenarioId);
  if (!any) { showToast('Cannot find version history.'); return; }

  try {
    const resp = await apiFetch('/api/scenarios/' + any.id + '/versions');
    if (!resp || !resp.ok) { showToast('Could not load version history.'); return; }
    const versions = await resp.json();
    if (!versions.length) { showToast('No version history found.'); return; }

    /* Normalise if normaliseRow is available */
    const rows = typeof normaliseRow === 'function' ? versions.map(normaliseRow) : versions;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'versionHistoryModal';
    modal.innerHTML = `
      <div class="modal" style="max-width:720px;">
        <button class="modal-close" onclick="document.getElementById('versionHistoryModal').remove()">✕</button>
        <div class="modal-title">Version history — "${rows[0].name}"</div>
        <div class="vh-table-wrap">
          <table class="vh-table">
            <thead><tr>
              <th>Version</th><th>Saved</th><th>Annual benefit</th>
              <th>ROI</th><th>NPV 5yr</th><th>Note</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${rows.map(s => `
                <tr class="${s.isCurrent?'vh-current':''}">
                  <td><span class="vh-ver-badge ${s.isCurrent?'vh-current-badge':''}">v${s.version||1}${s.isCurrent?' ★':''}</span></td>
                  <td style="font-size:12px;">${s.date}</td>
                  <td class="pos">${fmtFull(s.annualBenefit)}</td>
                  <td style="color:var(--blue);font-weight:600;">${fmtPct(s.roi)}</td>
                  <td class="${s.npv5>=0?'pos':'neg'}">${fmtFull(s.npv5)}</td>
                  <td style="color:var(--gray-500);font-size:11px;">${s.versionNote||'—'}</td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn btn-ghost btn-sm" onclick="loadScenario('${s.id}');document.getElementById('versionHistoryModal').remove();">Load</button>
                      ${!s.isCurrent
                        ? `<button class="btn btn-danger btn-sm" onclick="deleteVersion('${s.id}','${rows[0].name}')">Del</button>`
                        : `<span style="font-size:10px;color:var(--green);padding:0 6px;line-height:28px;">Current</span>`
                      }
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="btn-row" style="margin-top:1rem;">
          <button class="btn btn-ghost" onclick="document.getElementById('versionHistoryModal').remove()">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

  } catch(e) {
    console.error('showVersionHistory error:', e.message);
    showToast('Failed to load version history.');
  }
}

/* ─────────────────────────────────────────
   deleteVersion  — delete a non-current version
   ───────────────────────────────────────── */
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

  const filtered = stageFilter ? pool.filter(s => s.dealStage === stageFilter) : pool;

  if (!display.length) {
    el.innerHTML = '<div class="empty-state"><p>No scenarios saved yet. Build one in the Calculator tab.</p></div>';
    renderStageFilters();
    return;
  }

  const initials    = n => n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';
  const payStr      = pb => pb===null?'—':pb>=60?'60+mo':pb.toFixed(1)+'mo';
  const stageColors = { Discovery:'#185FA5', Demo:'#854F0B', Proposal:'#0F6E56', Negotiation:'#3C3489', 'Closed Won':'#2E7D32', 'Closed Lost':'#C62828' };

  el.innerHTML = `<ul class="scenario-list">${filtered.map(s => {
    const versionCount = savedScenarios.filter(x => x.baseId === s.baseId).length;
    const isShared = s.ownerUsername && s.ownerUsername !== me.username;
    return `
    <li class="scenario-item" data-scenario-id="${s.id}">
      <label class="compare-check" title="Add to comparison">
        <input type="checkbox" ${compareIds.has(s.id)?'checked':''} onchange="toggleCompare('${s.id}')"/>
      </label>
      <div class="scenario-avatar">${initials(s.company||s.name)}</div>
      <div class="scenario-info">
        <div class="scenario-name">${s.name}
          <span class="version-badge">v${s.version||1}</span>
          ${isShared ? `<span class="shared-badge">shared by ${s.ownerUsername}</span>` : ''}
          ${versionCount > 1 ? `<button class="version-history-btn" onclick="showVersionHistory('${s.baseId}')" title="View ${versionCount} versions">📋 ${versionCount} versions</button>` : ''}
        </div>
        <div class="scenario-meta">
          ${s.company}${s.industry&&IND[s.industry]?' · '+IND[s.industry].label:''} · ${s.date} · Payback: ${payStr(s.payback)}
        </div>
        ${s.dealStage?`<span class="stage-pill" style="background:${stageColors[s.dealStage]||'#64748B'}20;color:${stageColors[s.dealStage]||'#64748B'};border:1px solid ${stageColors[s.dealStage]||'#64748B'}40">${s.dealStage}</span>`:''}
        ${s.versionNote?`<span class="version-note-inline">${s.versionNote}</span>`:''}
      </div>
      <div class="scenario-kpis">
        <div class="sk-main">${fmtFull(s.annualBenefit)}/yr · ${fmtPct(s.roi)} ROI</div>
        <div class="sk-sub">NPV3: ${fmtFull(s.npv3)} · NPV5: ${fmtFull(s.npv5)}</div>
      </div>
      <div class="scenario-actions">
        <button class="btn btn-ghost btn-sm" onclick="loadScenario('${s.id}')">Load</button>
        <button class="btn btn-ghost btn-sm" onclick="cloneScenario('${s.id}')" title="Duplicate as a new business case">Duplicate</button>
        <button class="btn btn-ghost btn-sm" onclick="generateShareURLFromScenario('${s.id}')" title="Copy share link">🔗</button>
        ${versionCount > 1 ? `<button class="btn btn-ghost btn-sm" onclick="showVersionHistory('${s.baseId}')">History</button>` : ''}
        ${versionCount > 1 ? `<button class="btn btn-ghost btn-sm" onclick="compareVersions('${s.baseId}')" title="See what changed between versions">Compare versions</button>` : ''}
        ${!isShared ? `<button class="btn btn-ghost btn-sm" onclick="openShareModal('${s.id}','${s.name.replace(/'/g,"\\'")}')">Share</button>` : ''}
        ${!isShared ? `<button class="btn btn-danger btn-sm" onclick="deleteScenarioGroup('${s.baseId}')">Delete</button>` : ''}
      </div>
    </li>`;
  }).join('')}</ul>
  ${compareIds.size>=2?`<div class="compare-cta"><button class="btn btn-cta" onclick="switchTab('compare')">Compare ${compareIds.size} scenarios →</button></div>`:''}`;

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
