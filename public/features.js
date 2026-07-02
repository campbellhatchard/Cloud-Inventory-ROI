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
function generateShareURL() {
  const v = getVals();
  // Strip large logos from share URL — base64 images >50KB will exceed browser URL limits
  const payload = JSON.stringify({
    ...v,
    prospectLogoDataUrl: (v.prospectLogoDataUrl && v.prospectLogoDataUrl.length > 50000)
      ? null
      : v.prospectLogoDataUrl
  });
  const encoded = btoa(unescape(encodeURIComponent(payload)));
  const url = window.location.origin + window.location.pathname + '#share=' + encoded;
  navigator.clipboard.writeText(url).then(() => {
    showToast('🔗 Share link copied to clipboard!');
  }).catch(() => {
    showShareModal(url);
  });
  trackEvent('share_url_generated', { company: v.company, industry: v.industry });
}

function showShareModal(url) {
  const modal = document.getElementById('shareModal');
  document.getElementById('shareUrlInput').value = url;
  modal.classList.add('open');
}

function checkShareURL() {
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
  set('revenue', i.revenue);     set('userCount', i.users);
  set('laborCost', i.labor);     set('inventoryValue', i.inventory);
  set('itCost', i.itCost);       set('invest', i.invest);
  set('psvcCost', i.psvc);       set('hwCost', i.hw);
  set('trainCost', i.train);     set('discRate', Math.round((i.discRate || 0.1) * 100));
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
  // Restore new fields
  ['annualWriteOff','otifBaseline','otifTarget','invTurnsCurrent','invTurnsBenchmark',
   'implMonths','ramp1','ramp2','ramp3'].forEach(id => {
    const el = document.getElementById(id);
    if (el && i[id] !== undefined) el.value = i[id] || '';
  });
  // Restore fieldStates (three-state confidence)
  if (i.fieldStates) { fieldStates = { ...i.fieldStates }; }
  else if (i.confidence) {
    // Backwards compat: old saves only had confirmed set
    fieldStates = {};
    (i.confidence || []).forEach(id => { fieldStates[id] = 'confirmed'; confirmedFields.add(id); });
  }
  if (i.industry && IND[i.industry]) document.getElementById('benchBadge').style.display = 'inline-flex';
  recalc();
  renderConfidence();
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
    el.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:1rem 0;">Select 2 or 3 scenarios from the list above to compare them side-by-side.</p>';
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
            <div class="sens-center">${fmtFull(base.npv5)}</div>
            <div class="sens-bar-right">
              <div class="sens-fill pos-fill" style="width:${highPct}%"></div>
            </div>
          </div>
          <div class="sens-vals">
            <span class="neg">${fmtFull(r.low)}</span>
            <span style="color:#94A3B8">→</span>
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
  if (current === 'confirmed') {
    fieldStates[fieldId] = 'estimated';
    confirmedFields.delete(fieldId);
  } else {
    fieldStates[fieldId] = 'confirmed';
    confirmedFields.add(fieldId);
  }
  renderConfidence();
}

function renderConfidence() {
  const el = document.getElementById('confidencePanel');
  if (!el) return;
  let confirmedW = 0, estimatedW = 0, totalW = 0;
  CONFIDENCE_FIELDS.forEach(f => {
    totalW += f.weight;
    const s = fieldStates[f.id] || '';
    if (s === 'confirmed') confirmedW += f.weight;
    if (s === 'estimated') estimatedW += f.weight * 0.5;
  });
  const pct = Math.round(((confirmedW + estimatedW) / totalW) * 100);
  const color = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#E65100' : '#C62828';
  const label = pct >= 80 ? 'High confidence' : pct >= 50 ? 'Moderate — confirm key inputs' : 'Low — needs discovery';
  const groups = [...new Set(CONFIDENCE_FIELDS.map(f => f.group))];
  el.innerHTML = `
    <div class="conf-header">
      <div class="conf-title">Model confidence</div>
      <div class="conf-score" style="color:${color}">${pct}% — ${label}</div>
    </div>
    <div class="conf-bar-track">
      <div class="conf-bar-fill" style="width:${pct}%;background:${color};transition:width .4s;"></div>
    </div>
    <div class="conf-legend">
      <span class="conf-legend-item"><span class="conf-dot" style="background:#94A3B8;"></span>Empty</span>
      <span class="conf-legend-item"><span class="conf-dot" style="background:#E65100;"></span>Estimated (auto)</span>
      <span class="conf-legend-item"><span class="conf-dot" style="background:#2E7D32;"></span>Confirmed by prospect</span>
    </div>
    ${groups.map(group => `
      <div class="conf-group-label">${group}</div>
      <div class="conf-fields">
        ${CONFIDENCE_FIELDS.filter(f => f.group === group).map(f => {
          const state = fieldStates[f.id] || '';
          const cls = state === 'confirmed' ? 'conf-confirmed' : state === 'estimated' ? 'conf-estimated' : 'conf-empty';
          const icon = state === 'confirmed' ? '✓' : state === 'estimated' ? '~' : '?';
          const tip = state === 'confirmed' ? 'Prospect-confirmed — click to revert'
                    : state === 'estimated' ? 'Auto-flagged from input — click to confirm'
                    : 'No value entered yet';
          return `<button class="conf-chip ${cls}" onclick="toggleConfidence('${f.id}')" title="${tip}" ${state === '' ? 'disabled' : ''}><span class="conf-chip-icon">${icon}</span>${f.label}</button>`;
        }).join('')}
      </div>`).join('')}
    <div class="conf-hint">Values auto-flag as estimated when entered. Click to mark prospect-confirmed.</div>`;
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
let ownershipFilter = 'all'; // 'all' | 'mine' | 'shared'

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

function renderAdminEditor() {
  const el = document.getElementById('adminBenchmarkEditor');
  if (!el) return;
  const fields = ['labor','shrinkage','carrying','otif','it','shrinkRate','carryRate','otifRisk'];
  const labels = ['Labor gain %','Shrinkage reduction %','Carrying reduction %','OTIF improvement %','IT displaced %','Shrinkage rate %','Carrying rate %','OTIF risk %'];

  el.innerHTML = Object.entries(IND).map(([key, d]) => `
    <div class="admin-industry-card" id="admin-${key}">
      <div class="admin-industry-title">${d.label}</div>
      <div class="admin-fields-grid">
        ${fields.map((f, i) => `
          <div class="admin-field">
            <label>${labels[i]}</label>
            <input type="number" step="0.1" value="${d[f]}"
              onchange="updateBenchmark('${key}','${f}',this.value)" />
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function updateBenchmark(industryKey, field, value) {
  const num = parseFloat(value);
  if (!isNaN(num)) {
    IND[industryKey][field] = num;
    // persist to localStorage
    try { localStorage.setItem('ci_custom_benchmarks', JSON.stringify(IND)); } catch(e) {}
    showToast(`Updated ${industryKey} → ${field} = ${num}`);
    applyDefaults(); // refresh if same industry is selected
  }
}

function loadCustomBenchmarks() {
  try {
    const raw = localStorage.getItem('ci_custom_benchmarks');
    if (raw) {
      const custom = JSON.parse(raw);
      Object.keys(custom).forEach(k => { if (IND[k]) Object.assign(IND[k], custom[k]); });
    }
  } catch (e) {}
}

function resetBenchmarks() {
  if (!confirm('Reset all benchmarks to factory defaults?')) return;
  localStorage.removeItem('ci_custom_benchmarks');
  location.reload();
}

/* ─────────────────────────────────────────
   11. ANALYTICS DASHBOARD
   Tracks events in localStorage; renders
   a simple usage/insights dashboard
   ───────────────────────────────────────── */
const ANALYTICS_KEY = 'ci_analytics';

function trackEvent(event, data = {}) {
  try {
    const log = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    log.push({ event, data, ts: Date.now() });
    // keep last 500 events
    if (log.length > 500) log.splice(0, log.length - 500);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(log));
  } catch (e) {}
}

function renderAnalytics() {
  const el = document.getElementById('analyticsPanel');
  if (!el) return;
  let log = [];
  try { log = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]'); } catch(e) {}

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

  // recent events
  const recent = log.slice(-10).reverse();

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
          </div>`).join('') || '<p style="color:#94A3B8;font-size:13px">No data yet.</p>'}
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
          </div>`).join('') || '<p style="color:#94A3B8;font-size:13px">No data yet.</p>'}
      </div>
    </div>

    ${log.length > 0 ? `
    <div class="card" style="margin-top:1rem;">
      <div class="card-title">Recent activity</div>
      ${recent.map(e => `
        <div class="activity-row">
          <span class="activity-event">${e.event.replace(/_/g,' ')}</span>
          <span class="activity-detail">${e.data.company || e.data.crm || ''}</span>
          <span class="activity-time">${new Date(e.ts).toLocaleTimeString()}</span>
        </div>`).join('')}
    </div>` : ''}`;
}

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
