/* ═══════════════════════════════════════════════════════════
   features.js  —  13 Enhancement Modules
   1.  Shareable URL (base64 scenario encoding)
   2.  Side-by-side scenario comparison
   3.  Sensitivity analysis / what-if sliders
   4.  Prospect logo upload + co-branding
   5.  Customer proof points by industry
   6.  Confidence scoring
   7.  Email template generator
   8.  CRM push (Salesforce / HubSpot mailto link)
   9.  Deal stage tracker
   10. Admin benchmark editor (password protected)
   11. Analytics dashboard
   12. Multi-scenario comparison export
   13. Sensitivity tornado chart (visual)
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   1. SHAREABLE URL
   Encodes scenario into URL hash so reps
   can paste a link; receiver auto-loads it.
   ───────────────────────────────────────── */
async function generateShareURL() {
  /* Trackable share links point at a saved scenario, so the server can count
     views and honour revocation. A link built from unsaved calculator state
     would have to carry the data in the URL, which is untrackable and
     un-revokable — so we ask the rep to save first. */
  const id = window._calcScenarioId;
  if (!id) {
    showToast('Save this scenario first — share links are tracked against a saved scenario.');
    return;
  }
  try {
    const v = getVals();
    const resp = await apiFetch('/api/scenario-shares', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: id, company: v.company || '', title: v.name || '' })
    });
    if (!resp || !resp.ok) { showToast('Could not create share link.'); return; }
    const { shareUrl } = await resp.json();
    navigator.clipboard.writeText(shareUrl)
      .then(() => showToast('🔗 Trackable share link copied — you\'ll see when it\'s opened.'))
      .catch(() => showShareModal(shareUrl));
    trackEvent('share_url_generated', { company: v.company, industry: v.industry });
  } catch (e) {
    console.error('share link error:', e.message);
    showToast('Could not create share link — check your connection.');
  }
}
function showShareModal(url) {
  const modal = document.getElementById('shareModal');
  document.getElementById('shareUrlInput').value = url;
  modal.classList.add('open');
}

async function checkShareURL() {
  /* New: tokenized, trackable link — /?share=<token>. The scenario is fetched
     from the server, which counts the view and honours revocation. */
  const params = new URLSearchParams(window.location.search || '');
  const token = params.get('share');
  if (token) {
    try {
      const resp = await apiFetch('/api/scenario-shares/' + encodeURIComponent(token));
      if (resp && resp.ok) {
        const { data } = await resp.json();
        if (data) {
          loadFromObject(data);
          history.replaceState(null, '', window.location.pathname);
          showToast('📋 Shared scenario loaded!');
          return;
        }
      } else if (resp && resp.status === 410) {
        showToast('This share link is no longer active.');
        history.replaceState(null, '', window.location.pathname);
        return;
      } else {
        showToast('Could not open that share link.');
        return;
      }
    } catch (e) { console.warn('share token load failed', e); showToast('Could not open that share link.'); return; }
  }

  /* Legacy: links already sent as #share=<base64 payload>. Still honoured so
     previously distributed links keep working, but these are not trackable. */
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return;
  try {
    const encoded = hash.replace('#share=', '');
    const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    loadFromObject(decoded);
    history.replaceState(null, '', window.location.pathname);
    showToast('📋 Shared scenario loaded!');
  } catch (e) {
    console.warn('Invalid share URL', e);
  }
}

function loadFromObject(i) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('scenarioName', i.name);   set('companyName', i.company);
  set('repName', i.rep);         set('industry', i.industry);
  set('competitor', i.competitor || '');
  if (typeof setCurrency === 'function') setCurrency(i.currency || 'USD');
  set('revenue', i.revenue);     set('userCount', i.users);
  set('laborCost', i.labor);     set('inventoryValue', i.inventory);
  set('itCost', i.itCost);       set('invest', i.invest);
  set('psvcCost', i.psvc);       set('hwCost', i.hw);
  set('trainCost', i.train);     set('discRate', Math.round((i.discRate ?? 0.1) * 100));
  set('m_labor',     Math.round((i.mLabor     || 0) * 100));
  set('m_shrinkage', Math.round((i.mShrinkage || 0) * 100));
  set('m_carrying',  Math.round((i.mCarrying  || 0) * 100));
  set('m_otif',      Math.round((i.mOtif      || 0) * 100));
  set('m_it',        Math.round((i.mIt        || 0) * 100));
  set('m_shrinkRate', ((i.shrinkRate || 0) * 100).toFixed(1));
  set('m_carryRate',  Math.round((i.carryRate || 0) * 100));
  set('m_otifRisk',   ((i.otifRisk || 0) * 100).toFixed(1));
  // restore prospect logo if present
  if (i.prospectLogoDataUrl) {
    prospectLogoDataUrl = i.prospectLogoDataUrl;
    updateLogoPreview();
  }
  // restore confidence flags
  if (i.confidence) confirmedFields = new Set(i.confidence);
  if (i.dealStage) document.getElementById('dealStage') && (document.getElementById('dealStage').value = i.dealStage);
  if (i.execAudience) { const el = document.getElementById('execAudience'); if (el) el.value = i.execAudience; }
  /* Restore Three Whys (saved from the Exec view) into both the textareas and
     the in-memory object, so exec-view narrative edits survive a reload. */
  const _tw = { act: i.threeWhysAct || '', ci: i.threeWhysCi || '', now: i.threeWhysNow || '' };
  ['act','ci','now'].forEach(k => { const el = document.getElementById('why_'+k); if (el) el.value = _tw[k]; });
  if (typeof threeWhys !== 'undefined') { threeWhys.act = _tw.act; threeWhys.ci = _tw.ci; threeWhys.now = _tw.now; }
  // Restore new fields
  // NOTE: ramp1/ramp2/ramp3 are handled separately below — they are stored as
  // decimals (0.40) but the input fields hold percents (40), so they need a
  // ×100 conversion just like the multiplier fields. They must NOT be in this
  // generic pass-through loop (that omission caused a double-division bug where
  // reloading a scenario turned 40% into 0.4%, then 0.004%, etc.).
  ['annualWriteOff','otifBaseline','otifTarget','invTurnsCurrent','invTurnsBenchmark',
   'implMonths','contractMonths',
   'currentAccuracy','ordersPerYr','costPerOrder','costPerError',
   'downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr',
   'expediteSpendYr','countDaysYr','countPeople',
   'fieldInvValue','fieldLeakageRate','fieldLocations','fieldReconcileCost','fieldReconcilePerYr'].forEach(id => {
    const el = document.getElementById(id);
    if (el && i[id] !== undefined) el.value = i[id] ?? '';
  });
  const percentInputMap = {
    laborWastePct:'laborWastePct', pickRateGainPct:'pickRateGainPct',
    m_throughput:'mThroughput', orderErrorPct:'orderErrorPct', m_accuracy:'mAccuracy',
    m_downtime:'mDowntime', m_expedite:'mExpedite', m_count:'mCount',
    mFieldLeakage:'mFieldLeakage', mFieldCount:'mFieldCount'
  };
  Object.entries(percentInputMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && i[key] !== undefined) el.value = Math.round(Number(i[key] || 0) * 10000) / 100;
  });

  /* Ramp: stored as a decimal (0–1), field shows percent (0–100).
     Explicit zero is valid and must remain zero. */
  const normalizeRamp = (val, dflt) => {
    const d = (val === undefined || val === null || val === '') ? dflt : Number(val);
    const bounded = !isFinite(d) ? dflt : Math.max(0, Math.min(1, d));
    return Math.round(bounded * 100);
  };
  set('ramp1', normalizeRamp(i.ramp1, 0.40));
  set('ramp2', normalizeRamp(i.ramp2, 0.75));
  set('ramp3', normalizeRamp(i.ramp3, 1.00));
  // Restore fieldStates (three-state confidence)
  if (i.fieldStates) { fieldStates = { ...i.fieldStates }; }
  else if (i.confidence) {
    // Backwards compat: old saves only had confirmed set
    fieldStates = {};
    (i.confidence || []).forEach(id => { fieldStates[id] = 'confirmed'; confirmedFields.add(id); });
  }
  if (i.industry && IND[i.industry]) document.getElementById('benchBadge').style.display = 'inline-flex';
  /* Auto-expand the collapsed field-service group if this scenario actually
     has field-service data, so a loaded MEP deal shows its entered values. */

  /* Re-apply thousands formatting to the freshly-loaded dollar values so a
     loaded scenario shows "27,000,000" not "27000000". Must run before the
     magnitude checks so they read the grouped display correctly. */
  if (typeof window !== 'undefined' && typeof COMMA_FORMAT_FIELDS !== 'undefined' && typeof applyLiveCommaFormat === 'function') {
    COMMA_FORMAT_FIELDS.forEach(id => { const el = document.getElementById(id); if (el && el.value) applyLiveCommaFormat(el); });
  }

  recalc();
  renderConfidence();
  /* A freshly loaded scenario has no unsaved changes — clear the flag so the
     unsaved-changes guard doesn't nag right after loading. */
  if (typeof clearCalcDirty === 'function') clearCalcDirty();
}

/* ─────────────────────────────────────────
   2. SIDE-BY-SIDE COMPARISON
   Select up to 3 saved scenarios and render
   a comparison table.
   ───────────────────────────────────────── */
let compareIds = new Set();

function toggleCompare(id) {
  if (compareIds.has(id)) {
    compareIds.delete(id);
  } else {
    if (compareIds.size >= 3) { showToast('Max 3 scenarios to compare'); return; }
    compareIds.add(id);
  }
  renderList();
  renderComparison();
}

function renderComparison() {
  const el = document.getElementById('comparisonTable');
  if (!el) return;
  const selected = savedScenarios.filter(s => compareIds.has(s.id));
  if (selected.length < 2) {
    el.innerHTML = '<p style="color:#6B7A8D;font-size:13px;padding:1rem 0;">Select 2 or 3 scenarios from the list above to compare them side-by-side.</p>';
    return;
  }
  const rows = [
    { label: 'Company',            fn: s => s.company },
    { label: 'Industry',           fn: s => IND[s.industry] ? IND[s.industry].label : '—' },
    { label: 'Annual benefit',     fn: s => fmtFull(s.annualBenefit), cls: 'pos' },
    { label: 'Year 1 ROI',         fn: s => fmtPct(s.roi), cls: 'blue' },
    { label: '3-yr NPV',           fn: s => fmtFull(s.npv3), cls: s => s.npv3 >= 0 ? 'pos' : 'neg' },
    { label: '5-yr NPV',           fn: s => fmtFull(s.npv5), cls: s => s.npv5 >= 0 ? 'pos' : 'neg' },
    { label: 'Payback period',     fn: s => s.payback === null ? '—' : s.payback >= 60 ? '60+ mo' : s.payback.toFixed(1)+' mo' },
    { label: 'Annual subscription',fn: s => fmtFull(s.inputs.invest) },
    { label: 'One-time costs',     fn: s => fmtFull(s.inputs.otc) },
    { label: 'Revenue',            fn: s => fmtFull(s.inputs.revenue) },
    { label: 'Users',              fn: s => Math.round(s.inputs.users).toLocaleString() },
    { label: 'Deal stage',         fn: s => s.dealStage || '—' },
  ];

  const best = (key, higherIsBetter = true) => {
    const vals = selected.map(s => s[key]);
    const extreme = higherIsBetter ? Math.max(...vals) : Math.min(...vals.filter(v => v !== null));
    return extreme;
  };

  const bestBenefit = best('annualBenefit');
  const bestRoi = best('roi');
  const bestNpv5 = best('npv5');

  el.innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-tbl">
        <thead>
          <tr>
            <th class="left">Metric</th>
            ${selected.map(s => `<th>${s.name}<br/><span style="font-weight:400;font-size:10px;opacity:.7">${s.company}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td class="left row-label">${row.label}</td>
              ${selected.map(s => {
                const val = row.fn(s);
                const cls = typeof row.cls === 'function' ? row.cls(s) : (row.cls || '');
                const isBest = row.label === 'Annual benefit' && s.annualBenefit === bestBenefit
                  || row.label === 'Year 1 ROI' && s.roi === bestRoi
                  || row.label === '5-yr NPV' && s.npv5 === bestNpv5;
                return `<td class="${cls}">${val}${isBest ? ' <span class="best-badge">★ Best</span>' : ''}</td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ─────────────────────────────────────────
   3. SENSITIVITY ANALYSIS
   Varies each assumption ±30% and shows
   how the 5-yr NPV changes.
   ───────────────────────────────────────── */
function renderSensitivity() {
  const el = document.getElementById('sensitivityChart');
  if (!el) return;
  const v = getVals();
  const base = calcROI(v);

  const axes = [
    { key: 'mLabor',     label: 'Labor productivity gain',      delta: 0.30 },
    { key: 'mShrinkage', label: 'Shrinkage reduction',          delta: 0.30 },
    { key: 'mCarrying',  label: 'Carrying cost reduction',      delta: 0.30 },
    { key: 'mOtif',      label: 'OTIF improvement',             delta: 0.30 },
    { key: 'mIt',        label: 'IT cost displaced',            delta: 0.30 },
    { key: 'invest',     label: 'Annual subscription cost',     delta: 0.20, invert: true },
    { key: 'discRate',   label: 'Discount rate',                delta: 0.30, invert: true },
  ];

  const results = axes.map(a => {
    const vLow  = { ...v, [a.key]: v[a.key] * (a.invert ? 1.3 : 0.7) };
    const vHigh = { ...v, [a.key]: v[a.key] * (a.invert ? 0.7 : 1.3) };
    const rLow  = calcROI(vLow).npv5;
    const rHigh = calcROI(vHigh).npv5;
    return { label: a.label, low: rLow, high: rHigh, spread: rHigh - rLow };
  }).sort((a, b) => b.spread - a.spread);

  const maxAbs = Math.max(...results.map(r => Math.max(Math.abs(r.low - base.npv5), Math.abs(r.high - base.npv5))), 1);

  el.innerHTML = `
    <div class="sens-header">
      <div class="sens-title">Sensitivity analysis — impact on 5-yr NPV</div>
      <div class="sens-sub">Bars show NPV impact if each assumption changes ±20–30%. Base NPV: <strong>${fmtFull(base.npv5)}</strong></div>
    </div>
    <div class="sens-chart">
      ${results.map(r => {
        const lowDelta  = r.low  - base.npv5;
        const highDelta = r.high - base.npv5;
        const lowPct  = Math.round((Math.abs(lowDelta)  / maxAbs) * 45);
        const highPct = Math.round((Math.abs(highDelta) / maxAbs) * 45);
        return `
        <div class="sens-row">
          <div class="sens-label">${r.label}</div>
          <div class="sens-bars">
            <div class="sens-bar-left">
              <div class="sens-fill neg-fill" style="width:${lowPct}%"></div>
            </div>
            <div class="sens-center" aria-hidden="true"></div>
            <div class="sens-bar-right">
              <div class="sens-fill pos-fill" style="width:${highPct}%"></div>
            </div>
          </div>
          <div class="sens-vals">
            <span class="neg">${fmtFull(r.low)}</span>
            <span style="color:#6B7A8D">→</span>
            <span class="pos">${fmtFull(r.high)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="sens-legend">
      <span class="neg-dot">▌</span> -30% assumption &nbsp;&nbsp;
      <span class="pos-dot">▌</span> +30% assumption
    </div>`;
}

/* ─────────────────────────────────────────
   4. PROSPECT LOGO UPLOAD
   Stores as base64 dataURL; shown in exec doc
   ───────────────────────────────────────── */
let prospectLogoDataUrl = null;

function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 500000) { showToast('Logo must be under 500KB'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    prospectLogoDataUrl = e.target.result;
    updateLogoPreview();
    showToast('Prospect logo uploaded!');
  };
  reader.readAsDataURL(file);
}

function updateLogoPreview() {
  const preview = document.getElementById('prospectLogoPreview');
  const removeBtn = document.getElementById('removeLogoBtn');
  if (prospectLogoDataUrl && preview) {
    preview.src = prospectLogoDataUrl;
    preview.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else if (preview) {
    preview.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function removeLogo() {
  prospectLogoDataUrl = null;
  const input = document.getElementById('prospectLogoInput');
  if (input) input.value = '';
  updateLogoPreview();
  showToast('Prospect logo removed.');
}

/* ─────────────────────────────────────────
   5. CUSTOMER PROOF POINTS
   By industry — shown in exec view & sidebar
   ───────────────────────────────────────── */
const PROOF_POINTS = {
  telecom: [
    { company: 'Major Telecom Provider', result: '34% reduction in field inventory discrepancies', metric: '$2.1M annual savings' },
    { company: 'Regional Carrier', result: 'Cycle count time reduced from 3 days to 4 hours', metric: '99.2% inventory accuracy' },
    { company: 'Tower Infrastructure Co.', result: 'Eliminated 2 full-time reconciliation roles', metric: '18-month payback' },
  ],
  mfg: [
    { company: 'Industrial Manufacturer', result: '28% reduction in carrying costs through better visibility', metric: '$1.4M freed from working capital' },
    { company: 'Auto Parts Supplier', result: 'OTIF improved from 87% to 97% within 6 months', metric: 'Zero customer chargebacks since go-live' },
    { company: 'Electronics Assembler', result: 'Physical count from 5 days to overnight', metric: '$340K annual labor savings' },
  ],
  construction: [
    { company: 'National Contractor', result: '41% reduction in tool and material losses', metric: '$800K shrinkage savings yr 1' },
    { company: 'Civil Engineering Firm', result: 'Real-time visibility across 12 job sites', metric: '22% reduction in emergency purchases' },
    { company: 'Building Materials Co.', result: 'Eliminated manual spreadsheet tracking for 200 users', metric: '6-month payback achieved' },
  ],
  oil: [
    { company: 'Upstream Operator', result: '45% reduction in critical parts write-offs', metric: '$3.2M annual benefit' },
    { company: 'Midstream Pipeline Co.', result: 'Compliance audit prep time cut by 70%', metric: '99.6% parts traceability' },
    { company: 'Oilfield Services Provider', result: 'Unified inventory across 8 field locations', metric: '$1.1M carrying cost reduction' },
  ],
  mining: [
    { company: 'Open-Pit Mining Operation', result: '38% reduction in spare parts inventory', metric: '$2.8M freed from working capital' },
    { company: 'Minerals Processing Plant', result: 'Eliminated unplanned downtime from stockouts', metric: 'Zero critical parts shortages in 18 months' },
    { company: 'Mining Services Co.', result: 'Consolidated 6 inventory systems into one', metric: '$400K IT cost reduction' },
  ],
  distribution: [
    { company: 'National 3PL Provider', result: '99.8% order accuracy vs. 96.2% before', metric: 'Customer retention rate up 12%' },
    { company: 'Regional Distributor', result: 'Same-day shipping enabled by real-time slotting', metric: '31% throughput improvement' },
    { company: 'Food Distribution Co.', result: 'FEFO compliance automated across all SKUs', metric: '67% reduction in expired product write-offs' },
  ],
  food: [
    { company: 'Food & Beverage Manufacturer', result: 'Full lot traceability in under 2 minutes', metric: 'FDA compliance cost reduced 40%' },
    { company: 'Beverage Distributor', result: '29% reduction in expired inventory', metric: '$650K annual savings' },
    { company: 'Specialty Foods Co.', result: 'Cold chain visibility from receipt to ship', metric: '99.4% temperature-sensitive accuracy' },
  ],
  retail: [
    { company: 'Specialty Retailer', result: 'Inventory accuracy from 91% to 99.3%', metric: '$1.2M in recovered lost sales' },
    { company: 'Home Goods Chain', result: 'Cycle counts completed during business hours', metric: '80% reduction in count labor cost' },
    { company: 'Fashion Retailer', result: 'Real-time omnichannel inventory visibility', metric: '18% improvement in in-stock rate' },
  ],
};

function renderProofPoints(industry) {
  const el = document.getElementById('proofPointsPanel');
  if (!el) return;
  const points = PROOF_POINTS[industry];
  if (!points) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="proof-header">Customer results — ${IND[industry].label}</div>
    ${points.map(p => `
      <div class="proof-card">
        <div class="proof-company">${p.company}</div>
        <div class="proof-result">${p.result}</div>
        <div class="proof-metric">${p.metric}</div>
      </div>`).join('')}`;
}

/* ─────────────────────────────────────────
   6. CONFIDENCE SCORING
   Rep marks which inputs are prospect-confirmed
   vs. estimated; shows a model confidence %
   ───────────────────────────────────────── */
const CONFIDENCE_FIELDS = [
  { id: 'revenue',         label: 'Revenue',            weight: 15, group: 'Prospect inputs' },
  { id: 'userCount',       label: 'User count',         weight: 10, group: 'Prospect inputs' },
  { id: 'inventoryValue',  label: 'Inventory value',    weight: 15, group: 'Prospect inputs' },
  { id: 'annualWriteOff',  label: 'Annual write-off $', weight: 12, group: 'Prospect inputs' },
  { id: 'otifBaseline',    label: 'Current OTIF %',     weight: 10, group: 'Prospect inputs' },
  { id: 'invTurnsCurrent', label: 'Inventory turns',    weight: 8,  group: 'Prospect inputs' },
  { id: 'itCost',          label: 'IT/legacy cost',     weight: 8,  group: 'Prospect inputs' },
  { id: 'm_shrinkRate',    label: 'Shrinkage rate %',   weight: 8,  group: 'Assumptions' },
  { id: 'm_carryRate',     label: 'Carrying rate %',    weight: 7,  group: 'Assumptions' },
  { id: 'm_labor',         label: 'Labor gain %',       weight: 7,  group: 'Assumptions' },
];

let fieldStates = {};
let confirmedFields = new Set();

function autoFlagConfidence() {
  let changed = false;
  CONFIDENCE_FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    const hasValue = el.value && el.value.trim() !== '' && parseFloat(el.value) > 0;
    const current = fieldStates[f.id] || '';
    if (hasValue && current === '') { fieldStates[f.id] = 'estimated'; changed = true; }
    else if (!hasValue && current === 'estimated') { fieldStates[f.id] = ''; changed = true; }
  });
  if (changed) renderConfidence();
}

function toggleConfidence(fieldId) {
  const current = fieldStates[fieldId] || '';
  if (current === 'confirmed_prospect') {
    /* Prospect-verified is authoritative. Allow a rep to override, but only
       with an explicit confirmation, since it erases customer provenance. */
    if (!confirm('This input was verified by the prospect through discovery. Override that status? It will become a rep estimate.')) return;
    fieldStates[fieldId] = 'estimated';
    confirmedFields.delete(fieldId);
  } else if (current === 'confirmed') {
    fieldStates[fieldId] = 'estimated';
    confirmedFields.delete(fieldId);
  } else {
    /* Rep manually confirming (plain 'confirmed' = rep-confirmed) */
    fieldStates[fieldId] = 'confirmed';
    confirmedFields.add(fieldId);
  }
  renderConfidence();
}

function renderConfidence() {
  const el = document.getElementById('confidencePanel');
  if (!el) return;
  let confirmedW = 0, estimatedW = 0, totalW = 0;
  let nProspect = 0, nRep = 0, nEstimated = 0;
  CONFIDENCE_FIELDS.forEach(f => {
    totalW += f.weight;
    const s = fieldStates[f.id] || '';
    if (s === 'confirmed' || s === 'confirmed_prospect') confirmedW += f.weight;  // both full weight
    if (s === 'estimated') estimatedW += f.weight * 0.5;
    if (s === 'confirmed_prospect') nProspect++;
    else if (s === 'confirmed') nRep++;
    else if (s === 'estimated') nEstimated++;
  });
  const pct = Math.round(((confirmedW + estimatedW) / totalW) * 100);
  const color = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#C24A1E' : '#C81E10';
  const label = pct >= 80 ? 'High confidence' : pct >= 50 ? 'Moderate — confirm key inputs' : 'Low — needs discovery';
  const groups = [...new Set(CONFIDENCE_FIELDS.map(f => f.group))];

  /* Provenance summary line */
  const summaryBits = [];
  if (nProspect)  summaryBits.push(`<strong style="color:#12786F;">${nProspect} prospect-verified</strong>`);
  if (nRep)       summaryBits.push(`${nRep} rep-confirmed`);
  if (nEstimated) summaryBits.push(`${nEstimated} rep-estimated`);
  const summary = summaryBits.length ? `<div class="conf-summary">${summaryBits.join(' · ')}</div>` : '';

  el.innerHTML = `
    <div class="conf-header">
      <div class="conf-title">Model confidence</div>
      <div class="conf-score" style="color:${color}">${pct}% — ${label}</div>
    </div>
    <div class="conf-bar-track">
      <div class="conf-bar-fill" style="width:${pct}%;background:${color};transition:width .4s;"></div>
    </div>
    ${summary}
    <div class="conf-legend">
      <span class="conf-legend-item"><span class="conf-dot" style="background:#6B7A8D;"></span>Empty</span>
      <span class="conf-legend-item"><span class="conf-dot" style="background:#C24A1E;"></span>Rep-estimated</span>
      <span class="conf-legend-item"><span class="conf-dot" style="background:#3B9C90;"></span>Rep-confirmed</span>
      <span class="conf-legend-item"><span class="conf-dot" style="background:#12786F;"></span>Prospect-verified</span>
    </div>
    ${groups.map(group => `
      <div class="conf-group-label">${group}</div>
      <div class="conf-fields">
        ${CONFIDENCE_FIELDS.filter(f => f.group === group).map(f => {
          const state = fieldStates[f.id] || '';
          const cls = state === 'confirmed_prospect' ? 'conf-confirmed-prospect'
                    : state === 'confirmed' ? 'conf-confirmed'
                    : state === 'estimated' ? 'conf-estimated' : 'conf-empty';
          const icon = state === 'confirmed_prospect' ? '✓'
                     : state === 'confirmed' ? '✓'
                     : state === 'estimated' ? '~' : '?';
          const badge = state === 'confirmed_prospect' ? '<span class="conf-chip-badge" title="Verified by prospect via discovery">◉</span>' : '';
          const tip = state === 'confirmed_prospect' ? 'Verified by prospect via discovery — click to override'
                    : state === 'confirmed' ? 'Rep-confirmed — click to revert'
                    : state === 'estimated' ? 'Auto-flagged from input — click to confirm'
                    : 'No value entered yet';
          return `<button class="conf-chip ${cls}" onclick="toggleConfidence('${f.id}')" title="${tip}" ${state === '' ? 'disabled' : ''}><span class="conf-chip-icon">${icon}</span>${f.label}${badge}</button>`;
        }).join('')}
      </div>`).join('')}
    <div class="conf-hint">Values auto-flag as rep-estimated when entered. Prospect answers via the discovery link are verified automatically. Click a chip to confirm or override.</div>`;
}

/* ─────────────────────────────────────────
   7. EMAIL TEMPLATE GENERATOR
   Creates a ready-to-send follow-up email
   ───────────────────────────────────────── */
function generateEmail() {
  const v = getVals();
  const r = calcROI(v);
  const indLabel = v.industry && IND[v.industry] ? IND[v.industry].label : 'your industry';
  const paybackStr = r.payback === null ? 'under 12 months' :
    r.payback >= 60 ? 'approximately 5 years' : `approximately ${r.payback.toFixed(0)} months`;

  const subject = `Cloud Inventory ROI Analysis — ${v.company || 'Your Company'}`;
  const body = `Hi [First Name],

Thank you for taking the time to explore Cloud Inventory with us. As promised, I've put together a business case summary based on what we discussed.

EXECUTIVE SUMMARY FOR ${(v.company || 'YOUR COMPANY').toUpperCase()}

Based on your inputs — ${Math.round(v.users)} inventory users, ${fmtFull(v.inventory)} in annual inventory value, and ${fmtFull(v.revenue)} in revenue — here is what Cloud Inventory could deliver for your ${indLabel} operations:

  • Annual benefit:       ${fmtFull(r.annualBenefit)}
  • Year 1 ROI:          ${fmtPct(r.roi)}
  • Payback period:      ${paybackStr}
  • 3-year NPV (${fmtPct(v.discRate*100)} discount rate):  ${fmtFull(r.npv3)}
  • 5-year NPV:          ${fmtFull(r.npv5)}

WHERE THE VALUE COMES FROM

  • Labor & productivity:    ${fmtFull(r.laborSav)}/yr
  • Shrinkage reduction:     ${fmtFull(r.shrinkSav)}/yr
  • Carrying cost reduction: ${fmtFull(r.carrySav)}/yr
  • OTIF improvement:        ${fmtFull(r.otifSav)}/yr
  • IT system displacement:  ${fmtFull(r.itSav)}/yr

TOTAL INVESTMENT

  • One-time (services + hardware + training): ${fmtFull(v.otc)}
  • Annual subscription:                       ${fmtFull(v.invest)}
  • Total year 1 investment:                   ${fmtFull(r.totalInvestY1)}

These figures are based on ${indLabel} industry benchmarks and the inputs you shared with us. I'm happy to refine any assumptions as we learn more about your environment.

SUGGESTED NEXT STEPS

1. Share this analysis with your finance and operations stakeholders
2. Schedule a 30-minute technical discovery call to tighten the assumptions
3. Arrange a live demo focused on your specific workflows

I've attached a full executive presentation for your review. Let me know if you'd like me to adjust any of the assumptions or build out a more detailed ROI model.

Looking forward to our next conversation.

Best regards,
${v.rep || '[Your name]'}
Cloud Inventory — a Nextworld Company
cloudinventory.com`;

  document.getElementById('emailSubject').value = subject;
  document.getElementById('emailBody').value = body;
  document.getElementById('emailModal').classList.add('open');
  trackEvent('email_generated', { company: v.company });
}

/* AI personalize: rewrite the tone/framing of the template for the
   selected audience and any recorded debrief notes, while keeping
   every number in the email exactly as computed — never letting the
   model touch the figures themselves. */
async function aiPersonalizeEmail() {
  const btn = document.getElementById('aiPersonalizeEmailBtn');
  const bodyEl = document.getElementById('emailBody');
  if (!btn || !bodyEl) return;
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = '✨ Personalizing…';

  try {
    const v = getVals();
    const r = calcROI(v);
    const audience = (document.getElementById('execAudience') || {}).value || 'mixed';
    const audienceLabel = { cfo:'CFO', coo:'VP Operations / COO', ceo:'CEO / Executive Sponsor', cio:'CIO / IT', mixed:'a mixed executive audience' }[audience] || 'a mixed executive audience';
    const debriefNotes = (document.getElementById('debriefNotes') || {}).value || '';
    const currentBody = bodyEl.value;

    const prompt = `Rewrite this sales follow-up email to sound natural and personalized for ${audienceLabel}, while keeping every number, dollar figure, and percentage EXACTLY as written — do not change, round, or recalculate any figure. Keep it professional but less templated. ${debriefNotes ? 'The rep noted this from their last conversation with the prospect, weave it in naturally where relevant: "' + debriefNotes.replace(/"/g,"'").slice(0,300) + '"' : ''}

Current email:
${currentBody}

Return ONLY the rewritten email body — no preamble, no explanation, no markdown formatting, no subject line.`;

    const resp = await apiFetch('/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    });
    if (!resp || !resp.ok) throw new Error('AI request failed');
    const data = await resp.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    if (!text) throw new Error('Empty response');

    bodyEl.value = text;
    showToast('✨ Email personalized — review before sending.');
    trackEvent('email_ai_personalized', { company: v.company, audience });
  } catch(e) {
    console.error('aiPersonalizeEmail error:', e.message);
    showToast('Could not personalize — the original template is still in the box.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}
window.aiPersonalizeEmail = aiPersonalizeEmail;

function copyEmail() {
  const subject = document.getElementById('emailSubject').value;
  const body = document.getElementById('emailBody').value;
  const full = 'Subject: ' + subject + '\n\n' + body;
  navigator.clipboard.writeText(full).then(() => showToast('Email copied to clipboard!'));
}

function openMailto() {
  const subject = encodeURIComponent(document.getElementById('emailSubject').value);
  const body    = encodeURIComponent(document.getElementById('emailBody').value);
  window.open(`mailto:?subject=${subject}&body=${body}`);
}

/* ─────────────────────────────────────────
   8. CRM PUSH (Salesforce / HubSpot)
   Generates a pre-formatted note + opens
   the CRM URL in a new tab with data
   ───────────────────────────────────────── */
function pushToCRM(crmType) {
  const v = getVals();
  const r = calcROI(v);
  const note = `Cloud Inventory ROI Analysis — ${v.company}
Annual Benefit: ${fmtFull(r.annualBenefit)} | Year 1 ROI: ${fmtPct(r.roi)} | Payback: ${r.payback ? r.payback.toFixed(1)+' mo' : '—'}
3-yr NPV: ${fmtFull(r.npv3)} | 5-yr NPV: ${fmtFull(r.npv5)}
Investment: ${fmtFull(r.totalInvestY1)} (Y1) | ${fmtFull(v.invest)}/yr recurring
Industry: ${IND[v.industry] ? IND[v.industry].label : '—'} | Users: ${Math.round(v.users)} | Revenue: ${fmtFull(v.revenue)}`;

  navigator.clipboard.writeText(note).then(() => {
    if (crmType === 'salesforce') {
      window.open('https://login.salesforce.com', '_blank');
      showToast('CRM note copied! Paste into your Salesforce opportunity.');
    } else if (crmType === 'hubspot') {
      window.open('https://app.hubspot.com', '_blank');
      showToast('CRM note copied! Paste into your HubSpot deal.');
    }
  });
  trackEvent('crm_push', { crm: crmType, company: v.company });
}

/* ─────────────────────────────────────────
   9. DEAL STAGE TRACKER
   Adds a deal stage field; filters saved list
   ───────────────────────────────────────── */
const DEAL_STAGES = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
let stageFilter     = '';
let ownershipFilter = 'all'; // 'all' | 'mine' | 'shared' — default shows all visible scenarios
let industryFilter  = '';     // '' = all industries, otherwise an IND key
let adminViewAll    = false;  // admin-only: include all users' scenarios

function setIndustryFilter(key) {
  industryFilter = key || '';
  if (typeof renderListVersioned === 'function') renderListVersioned();
  else if (typeof renderList === 'function') renderList();
}

/* Populate the industry dropdown from IND — call once after auth */
function populateIndustryFilter() {
  const sel = document.getElementById('industryFilterSelect');
  if (!sel || typeof IND === 'undefined') return;
  sel.innerHTML = '<option value="">All industries</option>' +
    Object.entries(IND).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join('');
}

/* Admin: toggle between own+shared view and every user's scenarios */
async function toggleAdminViewAll() {
  adminViewAll = !adminViewAll;
  const btn = document.getElementById('adminViewAllBtn');
  if (btn) {
    btn.classList.toggle('active', adminViewAll);
    btn.textContent = adminViewAll ? '👥 Viewing all (team)' : '👥 View all (team)';
  }
  try {
    const url = adminViewAll ? '/api/scenarios?all=true' : '/api/scenarios';
    const resp = await apiFetch(url);
    if (resp && resp.ok) {
      const rows = await resp.json();
      savedScenarios = rows.map(normaliseRow);
      updateSavedBadge();
      if (typeof renderListVersioned === 'function') renderListVersioned();
      else if (typeof renderList === 'function') renderList();
    }
  } catch(e) {
    if (typeof showToast === 'function') showToast('Could not load team scenarios.');
  }
}

/* Show the admin view-all button only for admins — call after auth */
function initAdminScenarioControls() {
  const me = window.ciAuth ? window.ciAuth.getUser() : {};
  const btn = document.getElementById('adminViewAllBtn');
  if (btn && me.role === 'admin') btn.style.display = 'inline-flex';
}

function setOwnershipFilter(filter) {
  ownershipFilter = filter;
  document.querySelectorAll('.ownership-filter').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === filter)
  );
  if (typeof renderListVersioned === 'function') renderListVersioned();
  else if (typeof renderList === 'function') renderList();
}

function setStageFilter(stage) {
  stageFilter = stageFilter === stage ? '' : stage;
  document.querySelectorAll('.stage-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.stage === stageFilter);
  });
  renderList();
}

function renderStageFilters() {
  const el = document.getElementById('stageFilters');
  if (!el) return;
  el.innerHTML = DEAL_STAGES.map(s => {
    const count = savedScenarios.filter(sc => sc.dealStage === s).length;
    return `<button class="stage-filter-btn ${stageFilter === s ? 'active' : ''}"
      data-stage="${s}" onclick="setStageFilter('${s}')">
      ${s} ${count > 0 ? `<span class="stage-count">${count}</span>` : ''}
    </button>`;
  }).join('');
}

/* ─────────────────────────────────────────
   10. ADMIN BENCHMARK EDITOR
   Password-protected panel to update IND defaults
   ───────────────────────────────────────── */
/* Admin password gate removed in Phase 4.
   Access is now controlled by JWT role (role === 'admin')
   verified server-side on every /api/users request. */
let adminUnlocked = true; // kept for backward compat

/* ── Benchmark editor — factory defaults snapshot ── */
const IND_FACTORY_DEFAULTS = (function() {
  const d = {};
  Object.keys(IND).forEach(k => { d[k] = Object.assign({}, IND[k]); });
  return d;
})();

const BM_SECTIONS = [
  { label: 'Improvement levers', fields: [
    { key:'labor',     label:'Labor gain',          unit:'% of labor time recovered',  step:1,   min:0, max:100 },
    { key:'shrinkage', label:'Shrinkage reduction', unit:'% of shrinkage eliminated',  step:1,   min:0, max:100 },
    { key:'carrying',  label:'Carrying reduction',  unit:'% of carrying cost reduced', step:1,   min:0, max:100 },
    { key:'otif',      label:'OTIF improvement',    unit:'percentage point gain',      step:0.5, min:0, max:30  },
    { key:'it',        label:'IT displaced',        unit:'% of legacy IT cost',        step:1,   min:0, max:100 }
  ]},
  { label: 'Industry rates', fields: [
    { key:'shrinkRate', label:'Shrinkage rate', unit:'% of inventory value / yr', step:0.1, min:0, max:20  },
    { key:'carryRate',  label:'Carrying rate',  unit:'% of inventory value / yr', step:0.1, min:0, max:50  },
    { key:'otifRisk',   label:'OTIF risk',      unit:'% of revenue at risk',      step:0.1, min:0, max:10  }
  ]},
  { label: 'OTIF baseline & target', fields: [
    { key:'otifBaseline', label:'OTIF baseline', unit:'current industry OTIF % (0\u2013100)', step:0.5, min:0, max:100 },
    { key:'otifTarget',   label:'OTIF target',   unit:'achievable OTIF % with WMS',           step:0.5, min:0, max:100 }
  ]}
];

let _bmDirty = false;
let _bmCurrentKey = null;

function renderAdminEditor() {
  const el = document.getElementById('adminBenchmarkEditor');
  if (!el) return;
  const options = Object.entries(IND)
    .filter(([k, d]) => d && d.label && k !== 'default')
    .map(([k, d]) => '<option value="' + k + '">' + escapeHtml(d.label) + '</option>')
    .join('');

  el.innerHTML = '<div class="bm-editor">'
    + '<p style="font-size:13px;color:var(--gray-600);margin:0 0 18px;">Select an industry to edit its default values. Changes apply to all reps immediately.</p>'
    + '<div class="bm-top-row">'
    + '<div class="field" style="flex:1;max-width:340px;margin:0;"><label>Industry</label>'
    + '<select id="bmIndSelect" onchange="bmSelectIndustry(this.value)">' + options + '</select></div>'
    + '<span id="bmCustomBadge" class="bm-custom-badge" style="display:none;">Custom values active</span>'
    + '</div>'
    + '<div class="bm-card" style="margin-top:16px;">'
    + '<div class="bm-card-head"><span class="bm-card-title" id="bmCardTitle"></span><span class="bm-card-meta" id="bmCardMeta"></span></div>'
    + '<div id="bmFieldsWrap" class="bm-fields-wrap"></div>'
    + '<div class="bm-card-foot">'
    + '<span class="bm-save-msg" id="bmSaveMsg"></span>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
    + '<button class="btn btn-danger btn-sm" id="bmRevertBtn" onclick="bmRevertToDefaults()" style="display:none;">\u21ba Reset to factory defaults</button>'
    + '<button class="btn btn-ghost btn-sm" id="bmCancelBtn" onclick="bmCancelEdits()" style="display:none;">Cancel</button>'
    + '<button class="btn btn-primary btn-sm" id="bmSaveBtn" onclick="bmSaveIndustry()" style="display:none;">Save changes</button>'
    + '</div></div>'
    + '</div>'
    + '</div>';

  const firstKey = Object.keys(IND).find(k => IND[k] && IND[k].label && k !== 'default');
  if (firstKey) bmSelectIndustry(firstKey);
}

function bmSelectIndustry(key) {
  _bmCurrentKey = key;
  _bmDirty = false;
  const d = IND[key] || {};
  const factory = IND_FACTORY_DEFAULTS[key] || {};
  const selEl = document.getElementById('bmIndSelect');
  if (selEl) selEl.value = key;
  const titleEl = document.getElementById('bmCardTitle');
  if (titleEl) titleEl.textContent = d.label || key;
  const hasCustom = BM_SECTIONS.flatMap(function(s){return s.fields;}).some(function(f){ return d[f.key] !== undefined && factory[f.key] !== undefined && d[f.key] !== factory[f.key]; });
  const badge = document.getElementById('bmCustomBadge');
  if (badge) badge.style.display = hasCustom ? 'inline-flex' : 'none';
  const meta = document.getElementById('bmCardMeta');
  if (meta) meta.textContent = hasCustom ? 'Custom values active' : 'Using factory defaults';

  const wrap = document.getElementById('bmFieldsWrap');
  if (!wrap) return;
  wrap.innerHTML = BM_SECTIONS.map(function(sec) {
    const fieldHtml = sec.fields.map(function(f) {
      const isCustom = d[f.key] !== undefined && factory[f.key] !== undefined && d[f.key] !== factory[f.key];
      return '<div class="bm-field' + (isCustom ? ' bm-field-custom' : '') + '">'
        + '<label class="bm-field-label">' + escapeHtml(f.label) + (isCustom ? ' <span class="bm-custom-dot" title="Custom value">\u25cf</span>' : '') + '</label>'
        + '<input type="number" class="bm-num-input" id="bm-' + f.key + '" value="' + (d[f.key] !== undefined ? d[f.key] : '') + '" step="' + f.step + '" min="' + f.min + '" max="' + f.max + '" oninput="bmMarkDirty()" />'
        + '<span class="bm-field-unit">' + escapeHtml(f.unit) + '</span>'
        + (isCustom ? '<span class="bm-factory-val">Factory: ' + factory[f.key] + '</span>' : '')
        + '</div>';
    }).join('');
    return '<div class="bm-section"><div class="bm-section-label">' + escapeHtml(sec.label) + '</div><div class="bm-field-grid">' + fieldHtml + '</div></div>';
  }).join('');

  bmSetSaveState('idle');
}

function bmMarkDirty() {
  if (!_bmDirty) { _bmDirty = true; bmSetSaveState('dirty'); }
}

function bmSetSaveState(state) {
  var msg    = document.getElementById('bmSaveMsg');
  var saveBtn= document.getElementById('bmSaveBtn');
  var cancelBtn = document.getElementById('bmCancelBtn');
  var revertBtn = document.getElementById('bmRevertBtn');
  if (!msg) return;
  if (state === 'dirty') {
    msg.textContent = 'Unsaved changes'; msg.className = 'bm-save-msg bm-msg-warn';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  } else if (state === 'saved') {
    msg.textContent = 'Saved \u2014 reps will see updated benchmarks on next load'; msg.className = 'bm-save-msg bm-msg-ok';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  } else if (state === 'reset') {
    msg.textContent = 'Reset to factory defaults'; msg.className = 'bm-save-msg bm-msg-ok';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
    msg.textContent = ''; msg.className = 'bm-save-msg';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }
  var d = IND[_bmCurrentKey] || {};
  var factory = IND_FACTORY_DEFAULTS[_bmCurrentKey] || {};
  var hasCustom = BM_SECTIONS.flatMap(function(s){return s.fields;}).some(function(f){ return d[f.key] !== factory[f.key]; });
  if (revertBtn) revertBtn.style.display = (hasCustom || state === 'dirty') ? 'inline-flex' : 'none';
}

function bmCancelEdits() { if (_bmCurrentKey) bmSelectIndustry(_bmCurrentKey); }

async function bmSaveIndustry() {
  if (!_bmCurrentKey) return;
  const updates = {};
  let valid = true;
  BM_SECTIONS.flatMap(function(s){return s.fields;}).forEach(function(f) {
    const el = document.getElementById('bm-' + f.key);
    if (el) { const v = parseFloat(el.value); if (isNaN(v)) { valid = false; } else { updates[f.key] = v; IND[_bmCurrentKey][f.key] = v; } }
  });
  if (!valid) { showToast('Some fields have invalid values.'); return; }
  _bmDirty = false;
  try {
    const resp = await apiFetch('/api/benchmarks', { method: 'PUT', body: JSON.stringify({ benchmarks: { [_bmCurrentKey]: updates } }) });
    if (resp && resp.ok) {
      bmSelectIndustry(_bmCurrentKey);
      bmSetSaveState('saved');
      if (typeof applyDefaults === 'function') applyDefaults();
    } else { showToast('Save failed.'); }
  } catch(e) { showToast('Save failed.'); }
}

async function bmRevertToDefaults() {
  if (!_bmCurrentKey) return;
  const label = (IND[_bmCurrentKey] && IND[_bmCurrentKey].label) || _bmCurrentKey;
  if (!confirm('Reset ' + label + ' to factory defaults? This removes any custom benchmark values for this industry.')) return;
  try {
    const resp = await apiFetch('/api/benchmarks/' + encodeURIComponent(_bmCurrentKey), { method: 'DELETE' });
    if (resp && resp.ok) {
      Object.assign(IND[_bmCurrentKey], IND_FACTORY_DEFAULTS[_bmCurrentKey]);
      bmSelectIndustry(_bmCurrentKey);
      bmSetSaveState('reset');
      if (typeof applyDefaults === 'function') applyDefaults();
    } else { showToast('Reset failed.'); }
  } catch(e) { showToast('Reset failed.'); }
}

async function loadCustomBenchmarks() {
  try {
    const resp = await apiFetch('/api/benchmarks');
    if (resp && resp.ok) {
      const custom = await resp.json();
      Object.keys(custom).forEach(function(k) { if (IND[k]) Object.assign(IND[k], custom[k]); });
      if (typeof applyDefaults === 'function') applyDefaults();
    }
  } catch (e) {}
}

function resetBenchmarks() { if (_bmCurrentKey) bmRevertToDefaults(); }

/* ─────────────────────────────────────────
   11. ANALYTICS DASHBOARD
   Tracks usage events server-side; renders
   a simple usage/insights dashboard
   ───────────────────────────────────────── */
function trackEvent(event, data = {}) {
  /* Fire-and-forget to the server; never blocks or breaks the UI. */
  try {
    apiFetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event, data })
    }).catch(() => {});
  } catch (e) {}
}

async function renderAnalytics() {
  const el = document.getElementById('analyticsPanel');
  if (!el) return;
  /* Show the natural-language deal query box for admins only */
  const currentUser = window.ciAuth ? window.ciAuth.getUser() : {};
  const queryCard = document.getElementById('dealQueryCard');
  if (queryCard) queryCard.style.display = currentUser.role === 'admin' ? 'block' : 'none';
  /* Team-wide events from the server (admin-gated). Falls back to empty
     if the current user isn't an admin or the call fails. */
  let serverSummary = null;
  try {
    const resp = await apiFetch('/api/analytics/summary');
    if (resp && resp.ok) serverSummary = await resp.json();
  } catch (e) {}
  const recent = serverSummary ? serverSummary.recent : [];

  const total = savedScenarios.length;
  const avgBenefit = total ? savedScenarios.reduce((s,sc) => s + sc.annualBenefit, 0) / total : 0;
  const avgRoi     = total ? savedScenarios.reduce((s,sc) => s + sc.roi, 0) / total : 0;
  const avgNpv5    = total ? savedScenarios.reduce((s,sc) => s + sc.npv5, 0) / total : 0;

  // industry breakdown
  const byInd = {};
  savedScenarios.forEach(s => {
    const label = IND[s.industry] ? IND[s.industry].label : 'Unknown';
    byInd[label] = (byInd[label] || 0) + 1;
  });

  // deal stage breakdown
  const byStage = {};
  savedScenarios.forEach(s => {
    const st = s.dealStage || 'No stage';
    byStage[st] = (byStage[st] || 0) + 1;
  });

  el.innerHTML = `
    <div class="analytics-grid">
      <div class="analytics-card">
        <div class="a-label">Total scenarios</div>
        <div class="a-value">${total}</div>
      </div>
      <div class="analytics-card">
        <div class="a-label">Avg. annual benefit</div>
        <div class="a-value pos">${fmtFull(avgBenefit)}</div>
      </div>
      <div class="analytics-card">
        <div class="a-label">Avg. year 1 ROI</div>
        <div class="a-value blue">${fmtPct(avgRoi)}</div>
      </div>
      <div class="analytics-card">
        <div class="a-label">Avg. 5-yr NPV</div>
        <div class="a-value pos">${fmtFull(avgNpv5)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
      <div class="card" style="margin-bottom:0;">
        <div class="card-title">By industry</div>
        ${Object.entries(byInd).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
          <div class="breakdown-row">
            <span>${k}</span>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar" style="width:${Math.round(v/total*100)}%"></div>
            </div>
            <span class="breakdown-count">${v}</span>
          </div>`).join('') || '<p style="color:#6B7A8D;font-size:13px">No data yet.</p>'}
      </div>
      <div class="card" style="margin-bottom:0;">
        <div class="card-title">By deal stage</div>
        ${Object.entries(byStage).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
          <div class="breakdown-row">
            <span>${k}</span>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar" style="width:${Math.round(v/total*100)}%"></div>
            </div>
            <span class="breakdown-count">${v}</span>
          </div>`).join('') || '<p style="color:#6B7A8D;font-size:13px">No data yet.</p>'}
      </div>
    </div>

    ${(recent && recent.length > 0) ? `
    <div class="card" style="margin-top:1rem;">
      <div class="card-title">Recent activity (team-wide)</div>
      ${recent.map(e => `
        <div class="activity-row">
          <span class="activity-event">${(e.event||'').replace(/_/g,' ')}</span>
          <span class="activity-time">${new Date(e.created_at).toLocaleString()}</span>
        </div>`).join('')}
    </div>` : (serverSummary ? '' : '<p style="color:#6B7A8D;font-size:13px;margin-top:1rem;">Team-wide activity is visible to admins.</p>')}`;

  /* ── Resonance / learning loop section (admin only) ── */
  const user = window.ciAuth ? window.ciAuth.getUser() : {};
  if (user.role === 'admin') {
    const resonanceSection = document.createElement('div');
    resonanceSection.style.marginTop = '2rem';
    resonanceSection.innerHTML = `
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
        <span>📋 Driver resonance — what lands with prospects</span>
        <button class="btn btn-ghost btn-sm" onclick="loadResonanceSummary()">↻ Refresh</button>
      </div>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:14px;">
        Based on post-meeting debrief data from the Executive View. Shows which ROI drivers reps mark as resonating vs questioned, by industry and outcome.
      </p>
      <div id="resonanceSummaryPanel"><div class="empty-state"><p>Click Refresh to load driver resonance data.</p></div></div>`;
    el.appendChild(resonanceSection);
    loadResonanceSummary();
  }
}

/* ─────────────────────────────────────────
   RESONANCE SUMMARY (admin Analytics tab)
   ───────────────────────────────────────── */
const DRIVER_LABELS = {
  labor:'Labor savings', shrinkage:'Shrinkage / write-off',
  carrying:'Carrying cost', turns:'Inventory turns',
  otif:'OTIF / order accuracy', downtime:'Downtime reduction',
  expedite:'Expedite spend', field_inv:'Field inventory',
  it:'IT displacement', counting:'Cycle count labour'
};

async function loadResonanceSummary() {
  const el = document.getElementById('resonanceSummaryPanel');
  if (!el) return;
  el.innerHTML = '<div class="empty-state"><p>Loading\u2026</p></div>';
  try {
    const resp = await apiFetch('/api/scenarios/resonance/summary');
    if (!resp || !resp.ok) {
      el.innerHTML = '<div class="empty-state"><p>No debrief data yet. Reps can log driver resonance from the Executive View after meetings.</p></div>';
      return;
    }
    const rows = await resp.json();
    if (!rows.length) {
      el.innerHTML = '<div class="empty-state"><p>No debrief data yet. Reps can log driver resonance from the Executive View after meetings.</p></div>';
      return;
    }

    /* Aggregate: driver → total resonance count */
    const totals = {};
    rows.forEach(r => {
      totals[r.driver] = (totals[r.driver] || 0) + Number(r.resonance_count);
    });
    const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]);
    const max = sorted[0] ? sorted[0][1] : 1;

    /* By industry */
    const byInd = {};
    rows.forEach(r => {
      if (!byInd[r.industry]) byInd[r.industry] = {};
      byInd[r.industry][r.driver] = (byInd[r.industry][r.driver] || 0) + Number(r.resonance_count);
    });

    const barHtml = sorted.map(([driver, count]) => {
      const pct = Math.round(count / max * 100);
      const label = DRIVER_LABELS[driver] || driver;
      return `<div class="res-bar-row">
        <div class="res-bar-label">${label}</div>
        <div class="res-bar-track"><div class="res-bar-fill" style="width:${pct}%"></div></div>
        <div class="res-bar-count">${count}</div>
      </div>`;
    }).join('');

    const indHtml = Object.entries(byInd).map(([ind, drivers]) => {
      const indLabel = (typeof IND !== 'undefined' && IND[ind]) ? IND[ind].label : ind || 'General';
      const topDrivers = Object.entries(drivers).sort((a,b)=>b[1]-a[1]).slice(0,3)
        .map(([d,c]) => `<span class="res-ind-driver">${DRIVER_LABELS[d]||d} (${c})</span>`).join('');
      return `<div class="res-ind-row"><span class="res-ind-label">${escapeHtml(indLabel)}</span>${topDrivers}</div>`;
    }).join('');

    el.innerHTML = `
      <div id="resonanceAiSummary" class="res-ai-summary">
        <div class="res-ai-loading">✨ Summarizing patterns\u2026</div>
      </div>
      <div class="res-grid">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">Top resonating drivers (all deals)</div>
          <div class="res-bars">${barHtml}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">By industry (top 3 drivers)</div>
          <div>${indHtml || '<p class="sf-muted">Not enough data by industry yet.</p>'}</div>
        </div>
      </div>`;

    /* Load the AI narrative summary separately — chart above is already
       usable; this fills in a moment later without blocking the page. */
    loadResonanceAiSummary();
  } catch(e) {
    el.innerHTML = '<div class="empty-state"><p>Failed to load.</p></div>';
  }
}
window.loadResonanceSummary = loadResonanceSummary;

async function loadResonanceAiSummary() {
  const el = document.getElementById('resonanceAiSummary');
  if (!el) return;
  try {
    const resp = await apiFetch('/api/scenarios/resonance/summary/ai');
    if (!resp || !resp.ok) { el.style.display = 'none'; return; }
    const { summary } = await resp.json();
    if (!summary) { el.style.display = 'none'; return; }
    el.innerHTML = `<div class="res-ai-icon">✨</div><div class="res-ai-text">${escapeHtml(summary)}</div>`;
  } catch(e) {
    el.style.display = 'none';  /* AI summary is a bonus — never show an error for it */
  }
}
window.loadResonanceAiSummary = loadResonanceAiSummary;

/* Natural-language deal data question — Admin Analytics only.
   Two-step server flow: AI picks from a fixed query catalog (never writes
   SQL), server runs the exact query, AI phrases the result. */
async function askDealQuestion() {
  const input = document.getElementById('dealQueryInput');
  const answerEl = document.getElementById('dealQueryAnswer');
  if (!input || !answerEl) return;
  const question = input.value.trim();
  if (!question) return;

  answerEl.style.display = 'block';
  answerEl.className = 'deal-query-loading';
  answerEl.innerHTML = '✨ Checking your deal data\u2026';

  try {
    const resp = await apiFetch('/api/analytics/ask', {
      method: 'POST',
      body: JSON.stringify({ question })
    });
    if (!resp || !resp.ok) throw new Error('request failed');
    const data = await resp.json();

    answerEl.className = 'deal-query-answer';
    const queriesNote = (data.queriesUsed && data.queriesUsed.length)
      ? `<div class="deal-query-source">Based on: ${data.queriesUsed.join(', ')}</div>`
      : '';
    answerEl.innerHTML = `<div class="deal-query-icon">✨</div><div><div class="deal-query-text">${escapeHtml(data.answer || 'No answer returned.')}</div>${queriesNote}</div>`;
  } catch(e) {
    console.error('askDealQuestion error:', e.message);
    answerEl.className = 'deal-query-answer';
    answerEl.innerHTML = '<div class="deal-query-text">Could not process that question right now. Try again in a moment.</div>';
  }
}
window.askDealQuestion = askDealQuestion;

/* ─────────────────────────────────────────
   MODAL HELPERS (shared)
   ───────────────────────────────────────── */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeAllModals();
});

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});
