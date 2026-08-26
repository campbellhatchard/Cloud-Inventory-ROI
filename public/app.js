/* ═══════════════════════════════════════════════════
   Cloud Inventory ROI Builder — app.js v5
   Core engine + integration of all 13 features
   ═══════════════════════════════════════════════════ */

/* ── Industry benchmark data ── */
/* IND (industry defaults) and COMP (competitor data) now live in
   industry-data.js, loaded before app.js — shared with the PDF print page. */

/* ════════════════════════════════════════
   Storage
   ════════════════════════════════════════ */
/* OVERLAP_DEDUCTION + calcROI now provided by shared roi-engine.js */

/* ── Scenario in-memory cache ──────────────────────────────────────
   savedScenarios is populated from /api/scenarios on page load and
   after every save/delete. Features that read it (analytics, compare)
   always see a current snapshot.
   ────────────────────────────────────────────────────────────────── */
let savedScenarios = [];
let _scenariosLoading = false;

async function fetchScenarios() {
  if (_scenariosLoading) return;
  _scenariosLoading = true;
  try {
    /* Admins see all users' scenarios so the customer → scenario lookup
       works across the whole team, not just their own deals. */
    const user    = window.ciAuth ? window.ciAuth.getUser() : {};
    const isAdmin = user.role === 'admin';
    const url     = isAdmin ? '/api/scenarios?all=true' : '/api/scenarios';
    const resp = await apiFetch(url);
    if (!resp || !resp.ok) return;
    const rows = await resp.json();
    /* Normalise DB row shape to match the legacy shape used by features.js */
    savedScenarios = rows.map(normaliseRow);
    updateSavedBadge();
    if (typeof renderListVersioned === 'function') renderListVersioned();
    else renderList();
    if (typeof refreshCalcScenarioPicker === 'function') refreshCalcScenarioPicker();
  } catch(e) {
    console.error('fetchScenarios error:', e.message);
  } finally {
    _scenariosLoading = false;
  }
}

/* Map DB column_case → camelCase used by the rest of the app */
function normaliseRow(r) {
  return {
    id:            r.id,
    baseId:        r.base_id,
    version:       r.version       || 1,
    isCurrent:     r.is_current    !== false,
    versionNote:   r.version_note  || '',
    name:          r.name,
    company:       r.company,
    industry:      r.industry,
    dealStage:     r.deal_stage,
    execAudience:  r.exec_audience || 'mixed',
    solution:      r.solution || 'cip',
    ownerUsername: r.owner_username,
    sharedWith:    r.shared_with   || [],
    date:          r.updated_at
      ? new Date(r.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : '—',
    dateISO:       r.updated_at,
    annualBenefit: parseFloat(r.annual_benefit) || 0,
    roi:           parseFloat(r.roi)            || 0,
    npv3:          parseFloat(r.npv3)           || 0,
    npv5:          parseFloat(r.npv5)           || 0,
    payback:       r.payback !== null ? parseFloat(r.payback) : null,
    outcome:       r.outcome || '',
    outcomeReason: r.outcome_reason || '',
    realizedValue: r.realized_value !== null && r.realized_value !== undefined ? parseFloat(r.realized_value) : null,
    outcomeAt:     r.outcome_at || null,
    customerId:    r.customer_id || null,
    /* inputs come from GET /api/scenarios/:id — not included in list */
    inputs:        r.data || null
  };
}

/* No-op stubs — keep callers working without errors */
function loadSaved()         { return []; }
function persistSaved(arr)   { savedScenarios = arr; updateSavedBadge(); }

/* ════════════════════════════════════════
   Navigation
   ════════════════════════════════════════ */
const ALL_TABS = ['calc','disc','comp','exec','saved','compare','sensitivity','analytics','map','stake','solfit','admincustomers','admin','help','impact','profile'];

function switchTab(name) {
  ALL_TABS.forEach(n => {
    const tab = document.getElementById('tab-' + n);
    const nav = document.getElementById('nav-' + n);
    if (tab) tab.classList.toggle('active', n === name);
    if (nav) nav.classList.toggle('active', n === name);
  });
  document.body.classList.toggle('impact-active', name === 'impact');
  if (name === 'comp')        { syncCompDropdowns(); renderCompFilter(); }
  if (name === 'exec')        renderExec();
  if (name === 'saved')       { renderList(); renderStageFilters(); }
  if (name === 'compare')     renderComparison();
  if (name === 'sensitivity') renderSensitivity();
  if (name === 'analytics')   renderAnalytics();
  if (name === 'admin')       adminUnlocked && renderAdminEditor();
  if (name === 'disc' && typeof clearDiscNotif === 'function') clearDiscNotif();
  if (window.innerWidth <= 900) closeSidebar();
  trackEvent('tab_view', { tab: name });
}

function syncCompDropdowns() {
  const cv = document.getElementById('competitor').value;
  const cs = document.getElementById('compSelect');
  if (cv && cs) cs.value = cv;
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
function toggleAcc(btn) {
  btn.classList.toggle('open');
  btn.nextElementSibling.classList.toggle('closed');
}

function expandAllCalcSections() {
  /* Open all closed accordions and hide the expand toggle */
  document.querySelectorAll('.accordion .acc-head:not(.open)').forEach(h => {
    h.classList.add('open');
    if (h.nextElementSibling) h.nextElementSibling.classList.remove('closed');
  });
  const row = document.getElementById('showAllSectionsRow');
  if (row) row.style.display = 'none';
}

/* ════════════════════════════════════════
   Toast
   ════════════════════════════════════════ */
function showToast(msg) {
  document.getElementById('toastMsg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function updateSavedBadge() {
  const b = document.getElementById('savedCount');
  if (b) b.textContent = savedScenarios.length;
}

/* ════════════════════════════════════════
   Industry defaults
   ════════════════════════════════════════ */
function applyDefaults() {
  const ind = document.getElementById('industry').value;
  if (typeof updateBenchmarkBanner === 'function') updateBenchmarkBanner();
  if (!ind) return;
  const d = IND[ind];

  // Industry selection updates benchmark labels and reference baseline/target
  // fields (otifTarget, invTurnsBenchmark — these are research data points a
  // rep would otherwise have to look up, not improvement-assumption inputs).
  // It does NOT pre-populate any improvement assumption field, including the
  // rate fields below — blank assumption inputs are treated as industry-
  // estimated in the model via metricPct() until rep/prospect data confirms
  // them, and the "Avg: X%" badge shows the benchmark as guidance only.
  const fallbackMap = {
    otifTarget:d.otifTarget,
    invTurnsBenchmark:d.invTurns
  };
  Object.entries(fallbackMap).forEach(([id,v]) => {
    const el=document.getElementById(id);
    if(el && !el.value) el.value=v;
  });

  const bmap = {
    b_labor:d.labor+'%', b_shrinkage:d.shrinkage+'%', b_carrying:d.carrying+'%',
    b_otif:d.otif+'%', b_it:d.it+'%', b_shrinkRate:d.shrinkRate+'%',
    b_carryRate:d.carryRate+'%', b_otifRisk:d.otifRisk+'%',
    b_otifBaseline:d.otifBaseline+'%', b_invTurns:d.invTurns+'x',
    b_downtime:(d.downtime||0)+'%', b_expedite:(d.expedite||0)+'%', b_count:(d.count||0)+'%',
    b_throughput:(d.throughput||0)+'%', b_accuracy:(d.accuracy||0)+'%',
    b_firstfix:(d.firstFix||0)+'%', b_utilization:(d.utilization||0)+'%', b_leakage:(d.leakage||0)+'%'
  };
  /* Map bench span IDs to BENCHMARK_CITATIONS keys so tooltips show source */
  const citMap = {
    b_shrinkRate:'shrinkRate', b_shrinkage:'mShrinkage', b_carryRate:'carryRate',
    b_carrying:'mCarrying', b_otifRisk:'otifRisk', b_otif:'mOtif',
    b_labor:'mLabor', b_invTurns:'invTurns'
  };
  Object.entries(bmap).forEach(([id,v]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = 'Avg: ' + v;
    const citKey = citMap[id];
    const cite = (typeof BENCHMARK_CITATIONS !== 'undefined') ? BENCHMARK_CITATIONS[citKey] : null;
    if (cite) {
      el.title = cite.note + '\nSource: ' + cite.source + ' (' + cite.year + ')';
      el.style.cursor = 'help';
      el.style.textDecoration = 'underline dotted';
    }
  });
  const badge = document.getElementById('benchBadge');
  if (badge) badge.style.display = 'inline-flex';
  renderProofPoints(ind);
  if (typeof renderCalcIndustryQuestions === 'function') renderCalcIndustryQuestions();
  if (typeof autoFlagIndustryEstimates === 'function') autoFlagIndustryEstimates();
  recalc();
  autoFlagConfidence();
}

/* ════════════════════════════════════════
   Discovery sync
   ════════════════════════════════════════ */
function syncDisc(discId, calcId) {
  const raw = document.getElementById(discId).value;
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!isNaN(num) && num > 0) document.getElementById(calcId).value = num;
  recalc();
}

/* ════════════════════════════════════════
   Form values
   ════════════════════════════════════════ */
function g(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  /* Strip commas (from live thousands-formatting) and $ before parsing, so a
     displayed "27,000,000" reads as 27000000, not 27. */
  const raw = String(el.value).replace(/[$,\s]/g, '');
  return Math.max(0, parseFloat(raw) || 0);
}
function gs(id) { return document.getElementById(id)?.value || ''; }

function metricPct(id, industryKey) {
  const el = document.getElementById(id);
  const raw = el?.value;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') return Math.max(0, parseFloat(raw) || 0) / 100;
  const ind = gs('industry');
  const d = ind && IND[ind] ? IND[ind] : null;
  return d && d[industryKey] !== undefined ? d[industryKey] / 100 : 0;
}

function metricVal(id, industryKey) {
  const el = document.getElementById(id);
  const raw = el?.value;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') return Math.max(0, parseFloat(raw) || 0);
  const ind = gs('industry');
  const d = ind && IND[ind] ? IND[ind] : null;
  return d && d[industryKey] !== undefined ? d[industryKey] : 0;
}

function getVals() {
  const psvc = g('psvcCost'), hw = g('hwCost'), train = g('trainCost');
  const writeOffDollars = g('annualWriteOff');
  const inventoryVal    = g('inventoryValue');
  const shrinkRate      = metricPct('m_shrinkRate', 'shrinkRate');
  const effectiveShrinkBase = writeOffDollars > 0 ? writeOffDollars : inventoryVal * shrinkRate;
  const otifBaseline = g('otifBaseline');
  const otifTarget   = g('otifTarget');
  const invTurnsCurrent   = g('invTurnsCurrent');
  const invTurnsBenchmark = g('invTurnsBenchmark');
  // Implementation timeline & ramp
  const implMonths = Math.max(0, Math.min(18, g('implMonths') || 3));
  const ramp1 = Math.min(100, g('ramp1') || 40) / 100;
  const ramp2 = Math.min(100, g('ramp2') || 75) / 100;
  const ramp3 = Math.min(100, g('ramp3') || 100) / 100;

  return {
    name: gs('scenarioName') || 'Unnamed scenario',
    company: gs('companyName') || 'Prospect',
    rep: gs('repName'),
    industry: gs('industry'),
    competitor: gs('competitor') || gs('compSelect'),
    dealStage: gs('dealStage'),
    execAudience: gs('execAudience') || 'mixed',
    solution: gs('solution') || 'cip',
    currency: (typeof getCurrency === 'function') ? getCurrency() : 'USD',
    revenue: g('revenue'), users: g('userCount'), labor: g('laborCost'),
    inventory: inventoryVal, itCost: g('itCost'), invest: g('invest'),
    psvc, hw, train, otc: psvc+hw+train,
    discRate: g('discRate')/100,
    mLabor: metricPct('m_labor','labor'), mShrinkage: metricPct('m_shrinkage','shrinkage'),
    mCarrying: metricPct('m_carrying','carrying'), mOtif: metricPct('m_otif','otif'), mIt: metricPct('m_it','it'),
    shrinkRate, carryRate: metricPct('m_carryRate','carryRate'), otifRisk: metricPct('m_otifRisk','otifRisk'),
    annualWriteOff: writeOffDollars, effectiveShrinkBase,
    otifBaseline, otifTarget,
    invTurnsCurrent, invTurnsBenchmark,
    /* ── v2.5 new calculation levers ── */
    modelVersion: 27,
    laborWastePct:       g('laborWastePct') / 100,  // measured productivity waste (Option B)
    currentAccuracy:     g('currentAccuracy'),        // measured inventory accuracy % (Option A)
    /* ── Field inventory levers (opt-in) ── */
    hasFieldInventory:   window._hasFieldInventory || false,
    fieldInvValue:       g('fieldInvValue'),
    fieldLeakageRate:    g('fieldLeakageRate'),
    mFieldLeakage:       0.30,                        // default 30% recovery — no override UI yet
    fieldLocations:      g('fieldLocations'),
    fieldReconcileCost:  g('fieldReconcileCost'),
    fieldReconcilePerYr: g('fieldReconcilePerYr') || 1,
    /* ── v2.6 WMS levers ── */
    ordersPerYr:         g('ordersPerYr'),
    costPerOrder:        g('costPerOrder'),
    pickRateGainPct:     g('pickRateGainPct') / 100,
    mThroughput:         metricPct('m_throughput', 'throughput'),
    orderErrorPct:       g('orderErrorPct') / 100,
    costPerError:        g('costPerError'),
    mAccuracy:           metricPct('m_accuracy', 'accuracy'),
    downtimeEventsYr:    g('downtimeEventsYr'),
    downtimeHrsPerEvent: g('downtimeHrsPerEvent'),
    downtimeCostPerHr:   g('downtimeCostPerHr'),
    mDowntime:           metricPct('m_downtime', 'downtime'),
    expediteSpendYr:     g('expediteSpendYr'),
    mExpedite:           metricPct('m_expedite', 'expedite'),
    countDaysYr:         g('countDaysYr'),
    countPeople:         g('countPeople'),
    mCount:              metricPct('m_count', 'count'),
    implMonths, ramp1, ramp2, ramp3,
    prospectLogoDataUrl: (typeof prospectLogoDataUrl !== 'undefined') ? prospectLogoDataUrl : null,
    confidence: (typeof confirmedFields !== 'undefined') ? [...confirmedFields] : []
  };
}

/* ════════════════════════════════════════
   ROI + NPV Engine
   ════════════════════════════════════════ */
/* calcROI is defined in src/shared/roi-engine.js (loaded before app.js) */

/* ════════════════════════════════════════
   Formatters
   ════════════════════════════════════════ */
/* fmt, fmtFull, fmtPct now live in format-utils.js (loaded before app.js),
   shared with narrative.js and the PDF print page. */
function rClass(n) { if (!n&&n!==0) return 'r-neu'; return n>0?'r-pos':n<0?'r-neg':'r-neu'; }
function lbClass(n) { return n>=0?'pos':'neg'; }

/* ════════════════════════════════════════
   Recalculate
   ════════════════════════════════════════ */
function recalc() {
  const v=getVals(), r=calcROI(v);
  const el=id=>document.getElementById(id);

  if (typeof updateCompletenessMeter === 'function') updateCompletenessMeter();
  if (typeof renderAccuracySuggestion === 'function') renderAccuracySuggestion(v);

  el('totalOTC').textContent = fmtFull(v.otc);

  // Write-off baseline hint
  const woHint = el('writeOffHint');
  if (woHint) {
    if (v.annualWriteOff > 0) {
      woHint.textContent = `Using $${v.annualWriteOff.toLocaleString()} — prospect-supplied figure`;
      woHint.style.color = 'var(--green)';
    } else if (v.inventory > 0) {
      woHint.textContent = `Derived: ${fmtFull(v.inventory)} × ${fmtPct(v.shrinkRate*100)} = ${fmtFull(v.effectiveShrinkBase)} — enter actual figure to improve accuracy`;
      woHint.style.color = 'var(--amber)';
    } else { woHint.textContent = ''; }
  }

  // Write-off savings live preview
  const shrinkPrev = el('shrinkSavPreview');
  if (shrinkPrev) shrinkPrev.textContent = r.shrinkSav > 0 ? `= ${fmtFull(r.shrinkSav)}/yr` : '';

  // OTIF gap preview
  const otifGap = el('otifGapPreview');
  if (otifGap) {
    if (v.otifBaseline > 0 && v.otifTarget > 0 && v.otifTarget > v.otifBaseline) {
      const gap = (v.otifTarget - v.otifBaseline).toFixed(1);
      otifGap.textContent = `+${gap} pp gap — using baseline/target method (${fmtFull(r.otifSav)}/yr)`;
    } else if (v.otifBaseline > 0) {
      otifGap.textContent = 'Enter target OTIF % to use gap method';
      otifGap.style.color = 'var(--amber)';
    } else {
      if (otifGap) otifGap.textContent = '';
    }
  }

  // Inventory turns insight panel
  const turnsPanel = el('turnsInsightPanel');
  if (turnsPanel) {
    if (v.invTurnsCurrent > 0 && v.invTurnsBenchmark > 0) {
      if (v.invTurnsCurrent < v.invTurnsBenchmark) {
        const dioProspect = Math.round(365 / v.invTurnsCurrent);
        const dioBenchmark = Math.round(365 / v.invTurnsBenchmark);
        turnsPanel.innerHTML = `
          <div class="turns-insight">
            <div class="turns-insight-icon">📦</div>
            <div>
              <div class="turns-insight-title">Working capital opportunity identified</div>
              <div class="turns-insight-body">At <strong>${v.invTurnsCurrent}× turns</strong> vs industry benchmark of <strong>${v.invTurnsBenchmark}×</strong>, the prospect holds <strong>${fmtFull(r.capitalFreed)}</strong> in excess inventory (${dioProspect} days on hand vs ${dioBenchmark}-day benchmark). Carrying cost on that excess: <strong>${fmtFull(r.turnsSav)}/yr</strong>. Improving velocity and visibility through Cloud Inventory can free this capital.</div>
            </div>
          </div>`;
      } else if (v.invTurnsCurrent >= v.invTurnsBenchmark) {
        turnsPanel.innerHTML = `<div class="turns-insight turns-insight-ok"><div class="turns-insight-icon">✓</div><div><strong>Turns at or above benchmark</strong> — no excess working capital identified from velocity gap. Strong operational baseline.</div></div>`;
      }
    } else { turnsPanel.innerHTML = ''; }
  }

  const lb=(id,val,cls)=>{ const e=el(id); if(!e)return; e.textContent=val; e.className='lb-value '+cls; };
  /* Gate the headline KPIs: they read $0 / 0% until a customer is selected AND
     meaningful inputs have been entered (or a saved scenario is loaded). This
     avoids showing live numbers for an empty, customer-less exploratory form. */
  const _companySelected = !!(v.company && v.company.trim() && v.company.trim() !== 'Prospect');
  const _hasInputs = (v.revenue>0 || v.users>0 || v.inventory>0 || v.labor>0 || v.invest>0 || v.otc>0);
  const _kpiLive = window._scenarioLoaded === true || (_companySelected && _hasInputs);
  if (!_kpiLive) {
    lb('lb-benefit', fmt(0), lbClass(0));
    lb('lb-roi',     '0%', lbClass(0));
    lb('lb-npv3',    fmt(0), lbClass(0));
    lb('lb-npv5',    fmt(0), lbClass(0));
  } else {
    lb('lb-benefit', fmt(r.annualBenefit), lbClass(r.annualBenefit));
    lb('lb-roi',     r.roi?fmtPct(r.roi):'—', lbClass(r.roi));
    lb('lb-npv3',    fmt(r.npv3), lbClass(r.npv3));
    lb('lb-npv5',    fmt(r.npv5), lbClass(r.npv5));
  }

  const paySignStr  = r.paybackFromSigning  === null ? '—' : r.paybackFromSigning  >= 60 ? '60+ mo' : r.paybackFromSigning.toFixed(1)  + ' mo';
  const payLiveStr  = r.paybackFromGoLive   === null ? '—' : r.paybackFromGoLive   >= 60 ? '60+ mo' : r.paybackFromGoLive.toFixed(1)   + ' mo';
  const year1Pct    = Math.round(r.year1Factor * 100);
  const rampNote    = v.implMonths > 0
    ? `Incl. ${v.implMonths}mo impl + ramp (${year1Pct}% of full year)`
    : year1Pct < 99 ? `Ramp-up applied (${year1Pct}% of full year)` : '';

  if (el('roiGrid')) el('roiGrid').innerHTML = `
    <div class="result-card r-hero"><div class="r-label">Annual benefit (steady-state)</div><div class="r-value">${fmtFull(r.annualBenefit)}</div></div>
    <div class="result-card ${rClass(r.netY1)}"><div class="r-label">Net benefit year 1${rampNote ? '<br><span style="font-size:10px;font-weight:400;opacity:.8">'+rampNote+'</span>' : ''}</div><div class="r-value">${fmtFull(r.netY1)}</div></div>
    <div class="result-card r-blue"><div class="r-label">Year 1 ROI</div><div class="r-value">${fmtPct(r.roi)}</div></div>
    <div class="result-card r-neu"><div class="r-label">Payback from signing<br><span style="font-size:10px;font-weight:400;color:var(--gray-400)">From go-live: ${payLiveStr}</span></div><div class="r-value">${paySignStr}</div></div>
    <div class="result-card ${rClass(r.npv3)}"><div class="r-label">3-yr NPV (${fmtPct(v.discRate*100)})</div><div class="r-value">${fmtFull(r.npv3)}</div></div>
    <div class="result-card ${rClass(r.npv5)}"><div class="r-label">5-yr NPV (${fmtPct(v.discRate*100)})</div><div class="r-value">${fmtFull(r.npv5)}</div></div>
    <div class="result-card r-pos" title="Users × labor cost × productivity gain %"><div class="r-label">Labor savings</div><div class="r-value">${fmtFull(r.laborSav)}</div></div>
    <div class="result-card r-pos" title="Write-off baseline (${fmtFull(v.effectiveShrinkBase)}) × ${fmtPct(v.mShrinkage*100)} reduction"><div class="r-label">Write-off reduction</div><div class="r-value">${fmtFull(r.shrinkSav)}</div></div>
    <div class="result-card r-pos" title="Overlap-corrected carry base × ${fmtPct(v.mCarrying*100)}${r.overlapAdj > 100 ? ' (adj. -'+fmtFull(r.overlapAdj)+' overlap)' : ''}"><div class="r-label">Carrying cost savings</div><div class="r-value">${fmtFull(r.carrySav)}</div></div>
    ${r.turnsSav > 0 ? `<div class="result-card r-pos" title="Freed capital (${fmtFull(r.capitalFreed)}) × carry rate — overlap-corrected"><div class="r-label">Turns: capital freed</div><div class="r-value">${fmtFull(r.turnsSav)}</div></div>` : ''}
    <div class="result-card r-blue" title="${v.otifBaseline > 0 && v.otifTarget > 0 ? 'OTIF gap '+v.otifBaseline+'%→'+v.otifTarget+'% × revenue × improvement' : 'Revenue × at-risk % assumption'}"><div class="r-label">OTIF protection</div><div class="r-value">${fmtFull(r.otifSav)}</div></div>
    <div class="result-card r-pos"><div class="r-label">IT displaced</div><div class="r-value">${fmtFull(r.itSav)}</div></div>`;

  // Implementation hint — always show
  const implHint = el('implHint');
  if (implHint) {
    if (v.implMonths > 0) {
      const goLiveMonth = v.implMonths + 1;
      implHint.textContent = `Go-live month ${goLiveMonth}. Months 1–${v.implMonths}: $0 benefit. Payback from signing: ${r.paybackFromSigning ? r.paybackFromSigning.toFixed(1)+' mo' : '—'} (${r.paybackFromGoLive ? r.paybackFromGoLive.toFixed(1)+' mo from go-live' : '—'}).`;
      implHint.style.color = 'var(--blue)';
    } else {
      implHint.textContent = 'Set delivery months above 0 to account for implementation time before ROI begins.';
      implHint.style.color = 'var(--gray-400)';
    }
  }

  // Ramp preview bar
  const rampEl = el('rampPreview');
  if (rampEl && r.monthlyProfile) {
    const months = r.monthlyProfile.slice(0,12);
    rampEl.innerHTML = `
      <div class="ramp-bar-wrap">
        ${months.map(m => {
          const isPre = m.postGoLive <= 0;
          const pct   = Math.round(m.eff * 100);
          return `<div class="ramp-month" title="Month ${m.month}: ${isPre ? 'Implementation ($0)' : pct+'% efficiency → '+fmtFull(m.benefit)+''}">
            <div class="ramp-fill" style="height:${isPre ? 0 : pct}%;background:${isPre ? '#E2E8F0' : pct===100 ? 'var(--green)' : 'var(--cyan)'}"></div>
            <div class="ramp-month-label">${m.month}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="ramp-legend">
        <span style="color:var(--gray-400)">■ Implementation</span>
        <span style="color:var(--cyan)">■ Ramp-up</span>
        <span style="color:var(--green)">■ Full efficiency</span>
        <span style="margin-left:auto;font-weight:600;color:var(--navy)">Year 1 benefit: ${fmtFull(r.year1Benefit)} (${Math.round(r.year1Factor*100)}% of ${fmtFull(r.annualBenefit)})</span>
      </div>`;
  }

  if (typeof autoFlagConfidence === 'function') autoFlagConfidence();
  if (typeof renderConfidence  === 'function') renderConfidence();
  /* roiGrid was just rebuilt via innerHTML, which drops the guided number
     badge — restamp it if guided mode is active. */
  if (typeof isGuidedOn === 'function' && isGuidedOn() && typeof stampSectionNumbers === 'function') {
    stampSectionNumbers(true);
  }
}

/* ════════════════════════════════════════
   Competitive tab
   ════════════════════════════════════════ */
function renderCompFilter() {
  /* Rebuild the competitor dropdown based on selected solution */
  const sol = (document.getElementById('compSolutionFilter') || {}).value || 'cip';
  const sel = document.getElementById('compSelect');
  if (!sel || typeof COMP === 'undefined') return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">\u2014 Select competitor \u2014</option>';
  Object.entries(COMP).forEach(function([key, c]) {
    if (!c.solution || c.solution === sol) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = c.name;
      sel.appendChild(opt);
    }
  });
  /* Restore previous selection if still valid */
  if (prev && sel.querySelector('option[value="' + prev + '"]')) {
    sel.value = prev;
  } else {
    sel.value = '';
  }
  renderComp();
}

function renderComp() {
  const key = (document.getElementById('compSelect') || {}).value || gs('compSelect') || gs('competitor');
  const el  = document.getElementById('compContent');
  const pdfBtn  = document.getElementById('compPdfBtn');
  const docxBtn = document.getElementById('compDocxBtn');

  if (!key) {
    if (el) el.innerHTML = '<div class="empty-state"><p>Select a competing solution above to load the battlecard and talking points.</p></div>';
    if (pdfBtn)  pdfBtn.style.display  = 'none';
    if (docxBtn) docxBtn.style.display = 'none';
    return;
  }

  const c = COMP[key];
  if (!c) return;
  /* Sync hidden competitor field used by exec view */
  const compHidden = document.getElementById('competitor');
  if (compHidden && gs('competitor') !== key) compHidden.value = key;
  if (pdfBtn)  pdfBtn.style.display  = 'inline-flex';
  if (docxBtn) docxBtn.style.display = 'inline-flex';

  const TALK_TRACKS = {
    sap:        '\u201cMost SAP shops we talk to are spending 20%+ of their WMS budget just keeping the system running \u2014 consultants, customizations, and upgrade projects that never quite end. Cloud Inventory gives you the same inventory control with zero ABAP and a fraction of the maintenance cost. Our last SAP displacement went live in 11 weeks.\u201d',
    rf:         '\u201cRF-gun systems were built for a world where warehouses didn\u2019t move. Your team is managing field inventory on clipboards and radio calls, which means your shrinkage numbers are really just guesses. We give you real-time visibility across every truck, van, and job site \u2014 same platform as the warehouse.\u201d',
    oracle:     '\u201cOracle WMS is a serious product, but it\u2019s engineered for Oracle shops. The moment you\u2019re connecting to a non-Oracle ERP or you want your field teams on mobile, the integration cost explodes. We\u2019re ERP-agnostic, API-first, and we deploy in months, not years.\u201d',
    excel:      '\u201cSpreadsheets are really a hidden cost center \u2014 we typically find $80K to $200K a year in labor waste just from reconciliation, write-offs, and the time it takes to answer \u2018where is this inventory right now?\u2019 The ROI math is usually under six months, which is why this tends to be an easy buy-in.\u201d',
    erp:        '\u201cERP inventory modules are great at recording transactions, but they\u2019re not designed for execution \u2014 no directed put-away, limited scanning, and zero support for field inventory. We sit on top of your ERP and handle the execution layer it was never built for.\u201d',
    mep_lowcode:'\u201cLow-code platforms give you a blank canvas \u2014 which sounds good until you realize someone has to build and maintain every single workflow. MEP is purpose-built for governed enterprise workflow mobilization. No-code configuration, offline-first, and ERP-connected out of the box. Most of our customers are live in weeks, not quarters.\u201d',
    mep_rfgen:  '\u201cRF-SMART and RFgen are solid scanning tools, but they\u2019re built around one ERP and one use case. If your frontline work spans multiple systems, offline environments, or workflows beyond basic scanning, they hit a wall fast. MEP connects to any ERP, handles offline execution natively, and lets your team change workflows without a dev cycle.\u201d',
    other:      '\u201cMost WMS platforms were built to be configured once and frozen. If your business changes \u2014 new sites, new workflows, new ERP \u2014 you\u2019re back in a services engagement. We\u2019re no-code and cloud-native, so your team can adapt the system without calling us.\u201d'
  };
  const talk = TALK_TRACKS[key] || '';

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function listItems(arr) {
    return (arr||[]).map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('');
  }

  /* Determine product label */
  const isMEP = c.solution === 'mep';
  const productLabel = isMEP ? 'Mobile Enterprise Platform (MEP)' : 'Cloud Inventory Platform (CIP)';

  el.innerHTML =
    '<div class="comp-card">'
    + '<div class="comp-card-head">'
    +   '<div>'
    +     '<span class="comp-card-name">' + esc(c.name) + '</span>'
    +     '<span class="comp-product-tag">' + esc(productLabel) + '</span>'
    +   '</div>'
    +   '<span class="comp-current-tag">Current solution</span>'
    + '</div>'
    + '<div class="comp-meta-strip">'
    +   '<div class="comp-meta-cell"><div class="comp-meta-lbl">Typical cost</div><div class="comp-meta-val">' + esc(c.cost) + '</div></div>'
    +   '<div class="comp-meta-cell"><div class="comp-meta-lbl">Time to value</div><div class="comp-meta-val">' + esc(c.time) + '</div></div>'
    +   '<div class="comp-meta-cell"><div class="comp-meta-lbl">Ongoing maintenance</div><div class="comp-meta-val">' + esc(c.maint) + '</div></div>'
    + '</div>'
    + '<div class="comp-battle-grid">'
    +   '<div class="comp-battle-col comp-pain-col">'
    +     '<div class="comp-battle-head">'
    +       '<div class="comp-battle-icon comp-battle-icon-pain">!</div>'
    +       '<div><div class="comp-battle-title">Pain points with ' + esc(c.name) + '</div>'
    +       '<div class="comp-battle-sub">What the prospect is living with today</div></div>'
    +     '</div>'
    +     c.pain.map(function(p){ return '<div class="comp-item"><div class="comp-dot comp-dot-pain">\u2715</div><div class="comp-item-text">' + esc(p) + '</div></div>'; }).join('')
    +   '</div>'
    +   '<div class="comp-battle-col comp-adv-col">'
    +     '<div class="comp-battle-head">'
    +       '<div class="comp-battle-icon comp-battle-icon-adv">\u2713</div>'
    +       '<div><div class="comp-battle-title">Why Cloud Inventory wins</div>'
    +       '<div class="comp-battle-sub">How we win this displacement</div></div>'
    +     '</div>'
    +     c.adv.map(function(a){ return '<div class="comp-item"><div class="comp-dot comp-dot-adv">\u2713</div><div class="comp-item-text">' + esc(a) + '</div></div>'; }).join('')
    +   '</div>'
    + '</div>'
    + '</div>'

    /* Discovery + context detail strip */
    + '<div class="comp-detail-grid">'
    +   (c.targetProfile ? '<div class="comp-detail-card"><div class="comp-detail-lbl">Target account profile</div><p class="comp-detail-text">' + esc(c.targetProfile) + '</p></div>' : '')
    +   (c.targetBuyers  ? '<div class="comp-detail-card"><div class="comp-detail-lbl">Target buyers</div><p class="comp-detail-text">' + esc(c.targetBuyers) + '</p></div>' : '')
    +   (c.compLandscape ? '<div class="comp-detail-card"><div class="comp-detail-lbl">Competitive landscape</div><p class="comp-detail-text">' + esc(c.compLandscape) + '</p></div>' : '')
    +   (c.compReframe   ? '<div class="comp-detail-card"><div class="comp-detail-lbl">Competitive reframe</div><p class="comp-detail-text">' + esc(c.compReframe) + '</p></div>' : '')
    + '</div>'

    /* Discovery questions */
    + ((c.discPrequalify||[]).length || (c.discQualify||[]).length ? '<div class="comp-disc-grid">'
    +   (c.discPrequalify ? '<div class="comp-disc-col"><div class="comp-disc-head">Discovery \u2014 prequalify</div><ul class="comp-disc-list">' + listItems(c.discPrequalify) + '</ul></div>' : '')
    +   (c.discQualify    ? '<div class="comp-disc-col"><div class="comp-disc-head">Discovery \u2014 qualify</div><ul class="comp-disc-list">' + listItems(c.discQualify) + '</ul></div>' : '')
    + '</div>' : '')

    /* Talk track */
    + (talk
      ? '<div class="comp-talk-track">'
        + '<div class="comp-talk-label">Talk track</div>'
        + '<div class="comp-talk-text" id="compTalkText">' + esc(talk) + '</div>'
        + '<button class="btn btn-ghost btn-sm" id="compTalkCopyBtn" onclick="_copyCompTalk()">Copy talk track</button>'
        + '</div>'
      : '');
}


function _copyCompTalk() {
  const el = document.getElementById('compTalkCopyBtn');
  const text = (document.getElementById('compTalkText') || {}).textContent || '';
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function(){});
  if (el) {
    el.textContent = 'Copied!';
    el.style.color = 'var(--green)';
    setTimeout(function(){ el.textContent = 'Copy talk track'; el.style.color = ''; }, 2000);
  }
}

/* ════════════════════════════════════════
   Executive presentation
   ════════════════════════════════════════ */
/* ── Scenario comparison table helper ── */
function buildPreviewScenarioTable(baseV) {
  const scales = { conservative: 0.70, base: 1.00, aggressive: 1.30 };
  const scenarios = ['conservative','base','aggressive'].map(mode => {
    const sc = scales[mode];
    const sv = sc === 1 ? baseV : {
      ...baseV,
      mLabor: Math.min(baseV.mLabor*sc,0.95), mShrinkage: Math.min(baseV.mShrinkage*sc,0.95),
      mCarrying: Math.min(baseV.mCarrying*sc,0.95), mOtif: Math.min(baseV.mOtif*sc,0.95),
      mIt: Math.min(baseV.mIt*sc,0.95),
      effectiveShrinkBase: baseV.annualWriteOff > 0 ? baseV.annualWriteOff : baseV.inventory * Math.min(baseV.shrinkRate*sc,0.20)
    };
    const r = calcROI(sv);
    return { mode, r };
  });
  const payStr = pb => pb===null?'—':pb>=60?'60+mo':pb.toFixed(1)+'mo';
  return `
    <div class="e-section">
      <div class="e-h2">Scenario range — conservative / base / aggressive</div>
      <table class="e-tbl" style="margin-bottom:.5rem;">
        <thead><tr>
          <th class="left">Metric</th>
          <th style="background:#A6791E;">Conservative (70%)</th>
          <th style="background:#0089A6;">Base (100%)</th>
          <th style="background:#2E7D32;">Aggressive (130%)</th>
        </tr></thead>
        <tbody>
          <tr><td class="left">Annual benefit</td>${scenarios.map(s=>`<td class="pos">${fmtFull(s.r.annualBenefit)}</td>`).join('')}</tr>
          <tr><td class="left">Year 1 ROI</td>${scenarios.map(s=>`<td style="font-weight:600;color:#0089A6;">${fmtPct(s.r.roi)}</td>`).join('')}</tr>
          <tr><td class="left">Payback period</td>${scenarios.map(s=>`<td>${payStr(s.r.payback)}</td>`).join('')}</tr>
          <tr><td class="left">3-yr NPV</td>${scenarios.map(s=>`<td class="${s.r.npv3>=0?'pos':'neg'}">${fmtFull(s.r.npv3)}</td>`).join('')}</tr>
          <tr><td class="left">5-yr NPV</td>${scenarios.map(s=>`<td class="${s.r.npv5>=0?'pos':'neg'}">${fmtFull(s.r.npv5)}</td>`).join('')}</tr>
        </tbody>
      </table>
      <p class="e-footnote">Conservative = 70% of base improvement %; Aggressive = 130%. Investment costs are fixed across all three scenarios.</p>
    </div>`;
}

/* ── Three Whys UI helpers (v5.5.1) ── */

function setExecAudience(chip, val) {
  /* Sync pill chips with the hidden select */
  document.querySelectorAll('.whys-aud-chip').forEach(function(c){ c.classList.remove('active'); });
  if (chip) chip.classList.add('active');
  const sel = document.getElementById('execAudience');
  if (sel) { sel.value = val; }
  if (typeof refreshExec === 'function') refreshExec();
}

function _whysUpdateComp() {
  const ids = ['why_act','why_ci','why_now'];
  const filled = ids.filter(function(id){
    const el = document.getElementById(id);
    return el && el.value.trim().length > 15;
  }).length;
  const pct = Math.round(filled / ids.length * 100);
  const fill = document.getElementById('whysCompFill');
  const pctEl = document.getElementById('whysCompPct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

function _whysMicToggle(fieldId, btnId) {
  /* Use existing SFDictation if available; otherwise degrade gracefully */
  const field = document.getElementById(fieldId);
  const btn   = document.getElementById(btnId);
  if (!field || !btn) return;
  if (typeof SFDictation !== 'undefined' && SFDictation.supported) {
    /* Ensure the field is enhanced (idempotent) then trigger click on its dictate-btn */
    SFDictation.enhance(field);
    const dictBtn = field.closest('.dictate-wrap') && field.closest('.dictate-wrap').querySelector('.dictate-btn');
    if (dictBtn) { dictBtn.click(); return; }
  }
  /* Fallback: toggle the visual state and show a toast */
  if (btn.classList.contains('dictating')) {
    btn.classList.remove('dictating');
  } else {
    btn.classList.add('dictating');
    if (typeof showToast === 'function') showToast('Voice input requires Chrome or Edge with microphone permission.');
    setTimeout(function(){ btn.classList.remove('dictating'); }, 2000);
  }
}

function _execPopulateSidebar(valueRows, annualBenefit, monthlyInaction) {
  /* Value breakdown sidebar card */
  const bodyEl   = document.getElementById('execSideBreakdown');
  const totalEl  = document.getElementById('execSideTotal');
  const totalVal = document.getElementById('execSideTotalVal');
  if (bodyEl && valueRows && valueRows.length > 0) {
    const maxVal = Math.max.apply(null, valueRows.map(function(r){ return r.val; }).concat([1]));
    const colors = ['#0089A6','#2E7D32','#12786F','#A6791E','#6A4C93','#45688A'];
    bodyEl.innerHTML = valueRows.map(function(row, i) {
      return '<div class="exec-side-bar-row">'
        + '<span class="exec-side-bar-lbl">' + (row.label.length > 16 ? row.label.slice(0,16) + '…' : row.label) + '</span>'
        + '<div class="exec-side-bar-track"><div class="exec-side-bar-fill" style="width:' + Math.round(row.val/maxVal*100) + '%;background:' + (colors[i]||colors[0]) + ';"></div></div>'
        + '<span class="exec-side-bar-val">' + (typeof fmtFull === 'function' ? fmtFull(row.val) : '$-') + '</span>'
        + '</div>';
    }).join('');
    if (totalEl) totalEl.style.display = 'flex';
    if (totalVal) totalVal.textContent = typeof fmtFull === 'function' ? fmtFull(annualBenefit) : '';
  }

  /* Cost of inaction sidebar card */
  const inEl = document.getElementById('execSideInaction');
  const inCard = document.getElementById('execInactionCard');
  if (inEl && inCard && monthlyInaction > 0) {
    const fmt = typeof fmtFull === 'function' ? fmtFull : function(v){ return '$' + Math.round(v/1000) + 'K'; };
    inEl.innerHTML = '<div class="exec-ia-cell"><div class="exec-ia-period">Per month</div>'
      + '<div class="exec-ia-cost">' + fmt(monthlyInaction) + '</div>'
      + '<div class="exec-ia-note">foregone value</div></div>'
      + '<div class="exec-ia-cell hi"><div class="exec-ia-period">6-month delay</div>'
      + '<div class="exec-ia-cost">' + fmt(monthlyInaction * 6) + '</div>'
      + '<div class="exec-ia-note">typical eval</div></div>'
      + '<div class="exec-ia-cell"><div class="exec-ia-period">12 months</div>'
      + '<div class="exec-ia-cost">' + fmt(annualBenefit) + '</div>'
      + '<div class="exec-ia-note">full year lost</div></div>';
    inCard.style.display = 'block';
  }

  /* Sync completeness bar on render */
  _whysUpdateComp();
}

function renderExec() {
  // Apply Conservative / Base / Aggressive scaling
  const mode = (typeof currentScenarioMode !== 'undefined') ? currentScenarioMode : 'base';
  const scales = { conservative: 0.70, base: 1.00, aggressive: 1.30 };
  const scale = scales[mode] || 1.0;

  const rawV = getVals();

  // Scale improvement assumptions (not inputs or investment costs)
  const v = scale === 1 ? rawV : {
    ...rawV,
    mLabor:     Math.min(rawV.mLabor    * scale, 0.95),
    mShrinkage: Math.min(rawV.mShrinkage * scale, 0.95),
    mCarrying:  Math.min(rawV.mCarrying  * scale, 0.95),
    mOtif:      Math.min(rawV.mOtif      * scale, 0.95),
    mIt:        Math.min(rawV.mIt        * scale, 0.95),
    effectiveShrinkBase: rawV.annualWriteOff > 0
      ? rawV.annualWriteOff
      : rawV.inventory * Math.min(rawV.shrinkRate * scale, 0.20)
  };

  const r = calcROI(v);
  const indLabel = v.industry&&IND[v.industry] ? IND[v.industry].label : '—';
  const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const comp = v.competitor ? COMP[v.competitor] : null;

  const DC = (typeof DRIVER_CHART_COLORS !== 'undefined') ? DRIVER_CHART_COLORS : ['#0089A6','#2E7D32','#12786F','#A6791E','#6A4C93','#45688A'];
  const valueRows=[
    {label:'Labor & productivity savings',  val:r.laborSav,  color:DC[0]},
    {label:'Shrinkage / write-off reduction',val:r.shrinkSav,color:DC[1]},
    {label:'Inventory carrying cost reduction',val:r.carrySav,color:DC[2]},
    {label:'OTIF / order accuracy improvement',val:r.otifSav, color:DC[3]},
    {label:'Inventory turns — capital freed', val:r.turnsSav, color:DC[4]},
    {label:'IT & legacy system displacement', val:r.itSav,   color:DC[5]}
  ].filter(row => row.val > 0).sort((a,b) => b.val - a.val);
  const maxVal=Math.max(...valueRows.map(x=>x.val),1);

  const totalVal = valueRows.reduce((s,row) => s + row.val, 0) || 1;
  const bars=valueRows.map(row=>`
    <div class="e-bar-row">
      <span class="e-bar-lbl">${row.label}</span>
      <div class="e-bar-track"><div class="e-bar-fill" style="width:${Math.round((row.val/maxVal)*100)}%;background:${row.color};"></div></div>
      <span class="e-bar-pct" style="color:${row.color};">${Math.round(row.val/totalVal*100)}%</span>
      <span class="e-bar-val">${fmtFull(row.val)}</span>
    </div>`).join('');

  const paySignStr = r.paybackFromSigning===null?'—':r.paybackFromSigning>=60?'60+ mo':r.paybackFromSigning.toFixed(1)+' mo';
  const payLiveStr = r.paybackFromGoLive===null?'—':r.paybackFromGoLive>=60?'60+ mo':r.paybackFromGoLive.toFixed(1)+' mo';
  const year1Pct   = Math.round(r.year1Factor*100);

  /* ── Provenance: count prospect-verified vs rep-entered answers ── */
  const da = (typeof discoveryAnswers !== 'undefined') ? discoveryAnswers : {};
  const daKeys = Object.keys(da).filter(k => !k.endsWith('_by'));
  const daAnswered = daKeys.filter(k => da[k] && String(da[k]).trim());
  const daProspect = daKeys.filter(k => da[k + '_by'] === 'prospect' && da[k]);
  const daRep      = daKeys.filter(k => da[k + '_by'] === 'rep' && da[k]);
  const prospectPct = daAnswered.length ? Math.round(daProspect.length / daAnswered.length * 100) : 0;
  const hasProvenanceData = daAnswered.length > 0;

  const provenanceBanner = hasProvenanceData ? `
    <div class="e-provenance-banner">
      <div class="e-prov-icon">🔍</div>
      <div class="e-prov-body">
        <div class="e-prov-headline">
          <strong>${daProspect.length} of ${daAnswered.length} inputs supplied directly by ${v.company || 'the prospect'}</strong>
          — not vendor estimates.
        </div>
        <div class="e-prov-sub">
          ${daProspect.length > 0 ? `${prospectPct}% of answered inputs were provided by the prospect's own team. ` : ''}${daRep.length > 0 ? `${daRep.length} figure${daRep.length !== 1 ? 's' : ''} entered by the Cloud Inventory rep. ` : ''}Industry benchmarks apply only where no prospect figure was provided.
          <span class="e-prov-link" onclick="switchTab('disc')">View sources →</span>
        </div>
      </div>
      <div class="e-prov-chip ${prospectPct >= 50 ? 'e-prov-chip-high' : prospectPct >= 25 ? 'e-prov-chip-med' : 'e-prov-chip-low'}">
        ${prospectPct}% prospect data
      </div>
    </div>` : '';

  /* ── Cost of inaction ── */
  const monthlyInaction = r.annualBenefit > 0 ? r.annualBenefit / 12 : 0;
  const inactionBlock = r.annualBenefit > 0 ? `
    <div class="e-section e-inaction-section">
      <div class="e-h2">Cost of delayed action</div>
      <div class="e-inaction-lede">Every month without Cloud Inventory is a month these losses continue.</div>
      <div class="e-inaction-grid">
        <div class="e-inaction-card">
          <div class="e-inaction-period">Per month</div>
          <div class="e-inaction-cost">${fmtFull(monthlyInaction)}</div>
          <div class="e-inaction-note">in recoverable value foregone</div>
        </div>
        <div class="e-inaction-card e-inaction-card-hi">
          <div class="e-inaction-period">6-month delay</div>
          <div class="e-inaction-cost">${fmtFull(monthlyInaction * 6)}</div>
          <div class="e-inaction-note">typical evaluation-to-go-live cycle</div>
        </div>
        <div class="e-inaction-card">
          <div class="e-inaction-period">12-month delay</div>
          <div class="e-inaction-cost">${fmtFull(r.annualBenefit)}</div>
          <div class="e-inaction-note">equivalent to a full year's benefit</div>
        </div>
      </div>
      <div class="e-inaction-note-foot">Based on steady-state annual benefit of ${fmtFull(r.annualBenefit)}. Excludes compounding effects of improved inventory turns and reduced write-offs.</div>
    </div>` : '';

  // Implementation proviso section for exec doc
  const implProvisoSection = v.implMonths > 0 || r.year1Factor < 0.99 ? `
    <div class="e-section e-proviso-section">
      <div class="e-h2">Implementation timeline &amp; assumptions</div>
      <div class="e-proviso-grid">
        <div class="e-proviso-card" style="border-left:4px solid #0089A6;">
          <div class="e-proviso-icon">📅</div>
          <div>
            <div class="e-proviso-label">Implementation period</div>
            <div class="e-proviso-value">${v.implMonths} month${v.implMonths!==1?'s':''}</div>
            <div class="e-proviso-detail">No benefit accrues during implementation. Go-live in month ${v.implMonths+1}.</div>
          </div>
        </div>
        <div class="e-proviso-card" style="border-left:4px solid #A6791E;">
          <div class="e-proviso-icon">📈</div>
          <div>
            <div class="e-proviso-label">Ramp-up to full efficiency</div>
            <div class="e-proviso-value">${Math.round(v.ramp1*100)}% / ${Math.round(v.ramp2*100)}% / ${Math.round(v.ramp3*100)}%</div>
            <div class="e-proviso-detail">Months 1 / 2 / 3+ post go-live. Year 1 captures ${year1Pct}% of steady-state annual benefit.</div>
          </div>
        </div>
        <div class="e-proviso-card" style="border-left:4px solid #2E7D32;">
          <div class="e-proviso-icon">💰</div>
          <div>
            <div class="e-proviso-label">Break-even from contract signing</div>
            <div class="e-proviso-value">${paySignStr}</div>
            <div class="e-proviso-detail">From go-live: ${payLiveStr}. Includes ${v.implMonths}-month implementation and efficiency ramp.</div>
          </div>
        </div>
      </div>
      <div class="e-footnote" style="margin-top:.75rem;">All ROI, payback, and NPV figures account for the implementation period and post-go-live efficiency ramp. Year 1 benefit of ${fmtFull(r.year1Benefit)} reflects ${year1Pct}% of the ${fmtFull(r.annualBenefit)} steady-state annual benefit.</div>
    </div>` : '';

  // Overlap disclosure footnote
  const overlapNote = r.overlapAdj > 100
    ? `A ${Math.round(OVERLAP_DEDUCTION*100)}% overlap deduction (${fmtFull(r.overlapAdj)}) has been applied to carrying cost savings to account for partial overlap with write-off reduction and inventory turns improvements. `
    : '';

  const cfRows=r.cashflows.map(c=>`
    <tr>
      <td class="left">Year ${c.yr}${c.isRamped ? ' <span style="font-size:9px;color:#A6791E;font-weight:600">(ramp-adjusted)</span>' : ''}</td>
      <td>${fmtFull(c.benefit)}</td>
      <td class="neg">(${fmtFull(c.invest)})</td>
      <td class="${c.net>=0?'pos':'neg'}">${fmtFull(c.net)}</td>
      <td>${fmtFull(c.pv)}</td>
      <td class="${c.cumPV>=0?'pos':'neg'}">${fmtFull(c.cumPV)}</td>
    </tr>`).join('');

  const compSection = comp?`
    <div class="e-section">
      <div class="e-h2">Competitive displacement: ${comp.name}</div>
      <table class="e-comp-tbl">
        <thead><tr><th>Category</th><th>${comp.name}</th><th>Cloud Inventory</th></tr></thead>
        <tbody>
          <tr><td class="left">Investment</td><td>${comp.cost}</td><td>${fmtFull(v.invest)}/yr + ${fmtFull(v.otc)} one-time</td></tr>
          <tr><td class="left">Time to value</td><td>${comp.time}</td><td>Weeks, not months</td></tr>
          <tr><td class="left">Maintenance</td><td>${comp.maint}</td><td>Included in SaaS</td></tr>
        </tbody>
      </table>
      <div class="e-comp-grid">
        <div><div class="e-comp-col-title bad">Pain points</div>${comp.pain.map(p=>`<div class="e-comp-item"><span class="e-comp-x">✗</span>${p}</div>`).join('')}</div>
        <div><div class="e-comp-col-title good">CI advantages</div>${comp.adv.map(a=>`<div class="e-comp-item"><span class="e-comp-check">✓</span>${a}</div>`).join('')}</div>
      </div>
    </div>`:'';

  // Proof points for exec doc
  const proofPoints = (typeof PROOF_POINTS !== 'undefined' ? PROOF_POINTS[v.industry] : null) || [];
  const proofSection = proofPoints.length?`
    <div class="e-section">
      <div class="e-h2">Customer results — ${indLabel}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;">
        ${proofPoints.map(p=>`
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:.85rem;">
            <div style="font-size:10px;font-weight:700;color:#1E2931;margin-bottom:4px;">${p.company}</div>
            <div style="font-size:11px;color:#334155;margin-bottom:4px;">${p.result}</div>
            <div style="font-size:11px;font-weight:700;color:#2E7D32;">${p.metric}</div>
          </div>`).join('')}
      </div>
    </div>`:'';

  const modeLabels = { conservative:'Conservative case — 70%', base:'Base case — 100%', aggressive:'Aggressive case — 130%' };
  const modeBadge = mode !== 'base'
    ? `<div style="display:inline-flex;align-items:center;gap:5px;background:${mode==='conservative'?'rgba(230,81,0,.25)':'rgba(46,125,50,.25)'};color:${mode==='conservative'?'#FFCC80':'#A5D6A7'};border-radius:12px;padding:3px 10px;font-size:10px;font-weight:700;margin-top:8px;letter-spacing:.04em;">${modeLabels[mode]}</div>`
    : '';

  // Scenario comparison table for preview
  const scenarioCompTable = buildPreviewScenarioTable(rawV);
  const prospectLogoHtml = v.prospectLogoDataUrl
    ? `<div style="margin-top:1rem;display:flex;align-items:center;gap:12px;">
        <img src="${v.prospectLogoDataUrl}" style="height:32px;object-fit:contain;background:#fff;border-radius:4px;padding:2px 8px;" alt="Prospect logo"/>
        <span style="color:rgba(255,255,255,.4);font-size:14px;">×</span>
        <img src="ci-logo-negative.png" style="height:28px;object-fit:contain;" alt="Cloud Inventory" onerror="this.style.display='none'"/>
      </div>` : '';

  // Confidence indicator
  const confEl = document.getElementById('confidencePanel');
  const confPct = confEl ? parseInt(confEl.querySelector('.conf-score')?.textContent) : null;
  const confNote = confPct!==null ? `<div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:8px;">Model confidence: ${confPct}% of inputs confirmed with prospect</div>` : '';

  // Build narrative sections from narrative.js
  const narrative = (typeof buildNarrativeSections === 'function')
    ? buildNarrativeSections(v, r)
    : { headlineSection:'', whysSection:'', roiSection:'', timelineSection:'', criteriaSection:'', nextSection:'' };

  document.getElementById('execDoc').innerHTML = `
  <div id="execPrintTarget">
    <div class="e-cover">
      <img class="e-cover-logo" src="ci-logo-negative.png" alt="Cloud Inventory" onerror="this.style.display='none'"/>
      <div class="e-tagline">Business Value Assessment</div>
      <div class="e-company">${v.company||'Your Company'}</div>
      <div class="e-sub">Cloud Inventory Platform &nbsp;·&nbsp; ${indLabel} &nbsp;·&nbsp; ${today}${v.rep?' &nbsp;·&nbsp; '+v.rep:''}</div>
      ${modeBadge}${prospectLogoHtml}${confNote}
    </div>
    <div class="e-kpis">
      <div class="e-kpi"><div class="e-kv g">${fmtFull(r.annualBenefit)}</div><div class="e-kl">Annual benefit (steady-state)</div></div>
      <div class="e-kpi"><div class="e-kv b">${fmtPct(r.roi)}</div><div class="e-kl">Year 1 ROI (ramp-adjusted)</div></div>
      <div class="e-kpi"><div class="e-kv ${r.npv3>=0?'g':'r'}">${fmtFull(r.npv3)}</div><div class="e-kl">3-yr NPV (${fmtPct(v.discRate*100)})</div></div>
      <div class="e-kpi"><div class="e-kv">${paySignStr}</div><div class="e-kl">Payback from signing (${payLiveStr} from go-live)</div></div>
    </div>
    ${provenanceBanner}
    ${inactionBlock}
    <div class="e-body">
      <div class="e-section e-approach">
        <div class="e-approach-head">
          <div class="e-approach-title">A data-driven business case</div>
          <div class="e-approach-lede">Every figure in this assessment was built from <strong>${v.company||'your'} operational data</strong> — not vendor assumptions — using a structured, transparent method engineered to withstand financial scrutiny.</div>
        </div>
        <div class="e-approach-pillars">
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#0089A6;">◆</div>
            <div class="e-approach-pt">Your data, not assumptions</div>
            <div class="e-approach-pd">Inputs captured through structured discovery of your actual metrics.</div>
          </div>
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#12786F;">◆</div>
            <div class="e-approach-pt">Decomposed value drivers</div>
            <div class="e-approach-pd">Benefit broken into independently-quantified drivers, each traceable to a metric.</div>
          </div>
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#A6791E;">◆</div>
            <div class="e-approach-pt">Conservatively modeled</div>
            <div class="e-approach-pd">Ramp-up, benchmark grounding, and overlap adjustments applied throughout.</div>
          </div>
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#2E7D32;">◆</div>
            <div class="e-approach-pt">Independently verifiable</div>
            <div class="e-approach-pd">Full calculation methodology available on request for finance review.</div>
          </div>
        </div>
      </div>
      ${narrative.headlineSection}
      ${narrative.whysSection}
      ${implProvisoSection}
      ${narrative.roiSection}
      ${scenarioCompTable}
      <div class="e-section"><div class="e-h2">Annual value by category</div>
        <div class="e-driver-lede">Your value is decomposed into independently-quantified drivers, each traceable to a metric you provided and modeled conservatively.</div>
        ${bars}
        <div class="e-bar-total"><span>Total annual value</span><div></div><span style="color:var(--navy);">100%</span><span>${fmtFull(r.annualBenefit)}</span></div>
      </div>
      ${typeof buildExecInfographics === 'function' ? buildExecInfographics(r, v) : ''}
      <div class="e-section">
        <div class="e-h2">5-year cash flow & NPV (discount rate: ${fmtPct(v.discRate*100)})</div>
        <table class="e-tbl">
          <thead><tr><th class="left">Year</th><th>Annual benefit</th><th>Total investment</th><th>Net cash flow</th><th>Present value</th><th>Cumulative NPV</th></tr></thead>
          <tbody>
            <tr class="otc-note"><td class="left">Year 0 — one-time costs</td><td></td><td class="neg">(${fmtFull(v.otc)})</td><td></td><td></td><td></td></tr>
            ${cfRows}
          </tbody>
          <tfoot>
            <tr class="tfoot-row"><td class="left">3-year total</td><td>${fmtFull(r.totalBenefit3)}</td><td class="neg">(${fmtFull(r.totalCost3)})</td><td class="${r.totalBenefit3-r.totalCost3>=0?'pos':'neg'}">${fmtFull(r.totalBenefit3-r.totalCost3)}</td><td></td><td class="${r.npv3>=0?'pos':'neg'}">${fmtFull(r.npv3)}</td></tr>
            <tr class="tfoot-row"><td class="left">5-year total</td><td>${fmtFull(r.totalBenefit5)}</td><td class="neg">(${fmtFull(r.totalCost5)})</td><td class="${r.totalBenefit5-r.totalCost5>=0?'pos':'neg'}">${fmtFull(r.totalBenefit5-r.totalCost5)}</td><td></td><td class="${r.npv5>=0?'pos':'neg'}">${fmtFull(r.npv5)}</td></tr>
          </tfoot>
        </table>
        <p class="e-footnote">${overlapNote}NPV discounts at ${fmtPct(v.discRate*100)}/yr. One-time costs (services: ${fmtFull(v.psvc)}, hardware: ${fmtFull(v.hw)}, training: ${fmtFull(v.train)}) are year-0 outflows. Year 1 benefit reflects ${year1Pct}% of steady-state due to ${v.implMonths}-month implementation and efficiency ramp.</p>
      </div>
      <div class="e-section">
        <div class="e-h2">Investment summary</div>
        <table class="e-invest-tbl">
          <thead><tr><th>Cost component</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Professional services / implementation</td><td>One-time</td><td>${fmtFull(v.psvc)}</td></tr>
            <tr><td>Hardware (scanners, devices, printers)</td><td>One-time</td><td>${fmtFull(v.hw)}</td></tr>
            <tr><td>Training & change management</td><td>One-time</td><td>${fmtFull(v.train)}</td></tr>
            <tr><td>Cloud Inventory annual subscription</td><td>Recurring/yr</td><td>${fmtFull(v.invest)}</td></tr>
          </tbody>
          <tfoot><tr><td>Total year 1 investment</td><td></td><td>${fmtFull(r.totalInvestY1)}</td></tr></tfoot>
        </table>
      </div>
      ${compSection}${proofSection}
      ${narrative.timelineSection}
      ${narrative.criteriaSection}
      <div class="e-section">
        <div class="e-h2">Input assumptions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <table class="e-assump-tbl">
            <thead><tr><th colspan="2">Prospect profile</th></tr></thead>
            <tbody>
              <tr><td>Annual revenue</td><td>${fmtFull(v.revenue)}</td></tr>
              <tr><td>Inventory users</td><td>${Math.round(v.users).toLocaleString()}</td></tr>
              <tr><td>Avg. labor cost/user/yr</td><td>${fmtFull(v.labor)}</td></tr>
              <tr><td>Annual inventory value</td><td>${fmtFull(v.inventory)}</td></tr>
              <tr><td>Current IT / legacy cost</td><td>${fmtFull(v.itCost)}</td></tr>
              <tr><td>Discount rate</td><td>${fmtPct(v.discRate*100)}</td></tr>
            </tbody>
          </table>
          <table class="e-assump-tbl">
            <thead><tr><th colspan="2">Benchmarks (${indLabel})</th></tr></thead>
            <tbody>
              <tr><td>Labor productivity gain</td><td>${fmtPct(v.mLabor*100)}</td></tr>
              <tr><td>Shrinkage reduction</td><td>${fmtPct(v.mShrinkage*100)}</td></tr>
              <tr><td>Carrying cost reduction</td><td>${fmtPct(v.mCarrying*100)}</td></tr>
              <tr><td>OTIF improvement</td><td>${fmtPct(v.mOtif*100)}</td></tr>
              <tr><td>IT cost displaced</td><td>${fmtPct(v.mIt*100)}</td></tr>
              <tr><td>Shrinkage rate (baseline)</td><td>${fmtPct(v.shrinkRate*100)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      ${narrative.nextSection}
      <div class="e-footer">
        <img class="e-footer-logo" src="ci-logo-full-color.png" alt="Cloud Inventory" onerror="this.style.display='none'"/>
        <span class="e-footer-txt">Analysis uses industry benchmarks and prospect-supplied inputs. Actual results may vary. · cloudinventory.com</span>
      </div>
    </div>
  </div>`;
  trackEvent('exec_view', { company: v.company });

  /* ── Populate the Three Whys sidebar cards ── */
  _execPopulateSidebar(valueRows, r.annualBenefit, r.annualBenefit > 0 ? r.annualBenefit / 12 : 0);

  /* ── Re-run SFDictation on the new textareas ── */
  if (typeof SFDictation !== 'undefined' && SFDictation.supported) {
    SFDictation.enhanceAll(document.getElementById('tab-exec'));
  }
  _whysUpdateComp();
}

/* ════════════════════════════════════════
   Save / Load / Delete  —  DB-backed
   ════════════════════════════════════════ */
async function saveScenario() {
  const v = getVals(), r = calcROI(v);

  const missingCompany  = !v.company || !v.company.trim() || v.company.trim() === 'Prospect';
  const missingScenario = !v.name    || !v.name.trim()    || v.name.trim() === 'Unnamed scenario';
  if (missingCompany || missingScenario) {
    const missing = [];
    if (missingCompany)  missing.push('Company name');
    if (missingScenario) missing.push('Scenario name');
    showToast('⚠️ Required: ' + missing.join(' and ') + ' must be entered before saving.');
    if (missingCompany)  { const el=document.getElementById('companyName');  if(el){el.style.borderColor='var(--red)';el.focus();setTimeout(()=>{el.style.borderColor='';},3000);} }
    if (missingScenario) { const el=document.getElementById('scenarioName'); if(el){el.style.borderColor='var(--red)';if(!missingCompany)el.focus();setTimeout(()=>{el.style.borderColor='';},3000);} }
    return;
  }
  if (!v.revenue && !v.inventory && !v.users) { showToast('Add some inputs before saving.'); return; }

  const dataBlob = {
    ...v,
    /* Three Whys are edited on the Exec view but aren't part of getVals(), so
       capture them here — otherwise Save (incl. the Exec view's Save button)
       would silently drop exec-view narrative edits. */
    threeWhysAct: document.getElementById('why_act')?.value || '',
    threeWhysCi:  document.getElementById('why_ci')?.value  || '',
    threeWhysNow: document.getElementById('why_now')?.value || '',
    fieldStates:        typeof fieldStates !== 'undefined' ? { ...fieldStates } : {},
    annualBenefit:      r.annualBenefit,
    roi:                r.roi,
    npv3:               r.npv3,
    npv5:               r.npv5,
    payback:            r.payback,
    paybackFromSigning: r.paybackFromSigning,
    year1Benefit:       r.year1Benefit
  };

  const existing = savedScenarios.find(s => s.company === v.company && s.name === v.name && s.isCurrent);
  if (existing && !document.getElementById('saveVersionModal')) {
    showSaveVersionDialog(v, r, existing.baseId, (existing.version || 1) + 1);
    return;
  }

  await _doSave(v, dataBlob, existing ? existing.baseId : null, '');
}

async function _doSave(v, dataBlob, baseId, note) {
  try {
    const resp = await apiFetch('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify({
        name:         v.name,
        company:      v.company,
        data:         dataBlob,
        industry:     v.industry     || null,
        dealStage:    v.dealStage    || null,
        execAudience: v.execAudience || 'mixed',
        solution:     v.solution     || 'cip',
        versionNote:  note           || null,
        baseId:       baseId         || null
      })
    });
    if (!resp || !resp.ok) {
      const err = resp ? await resp.json() : { error: 'Network error' };
      showToast('Save failed: ' + (err.error || 'Unknown error'));
      return;
    }
    const saved = await resp.json();
    showToast(`Saved v${saved.version} — "${saved.name}"`);
    /* Only now — after a confirmed successful save — is the form clean. */
    if (typeof clearCalcDirty === 'function') clearCalcDirty();
    trackEvent('scenario_saved', { company: v.company, version: saved.version });
    await fetchScenarios();
  } catch(e) {
    console.error('_doSave error:', e.message);
    showToast('Save failed — check your connection.');
  }
}

async function loadScenario(id) {
  try {
    let scenario = savedScenarios.find(x => x.id === id);
    let inputs   = scenario?.inputs;
    let fullData = null;
    if (!inputs) {
      const resp = await apiFetch('/api/scenarios/' + id);
      if (!resp || !resp.ok) { showToast('Could not load scenario.'); return; }
      fullData = await resp.json();
      inputs = fullData.data;
      if (scenario) scenario.inputs = inputs;
    }
    if (!inputs) { showToast('Scenario data not found.'); return; }
    if (typeof loadFromObject === 'function') loadFromObject(inputs);
    window._scenarioLoaded = true;
    window._calcScenarioId = id;
    if (typeof refreshCalcScenarioPicker === 'function') refreshCalcScenarioPicker();
    /* Load the field inventory flag — check both the cache (scenario.customerId)
       and the full API response (fullData.customer_id). The cache path is taken
       when inputs were already in savedScenarios; fullData is only set when we
       fetched from the API. Either way we need the customer_id. */
    if (typeof loadFieldInventoryFlag === 'function') {
      const cid = (scenario && scenario.customerId)
               || (fullData && fullData.customer_id)
               || (inputs && inputs.customerId)
               || null;
      loadFieldInventoryFlag(cid);
    }
    /* Remember which customer this scenario belongs to, so the Solution Fit
       tab can attach to it. */
    window.currentScenarioCustomerId = (scenario && scenario.customerId) || null;
    /* Reset + reattach discovery session to THIS scenario — prevents a
       prospect link from a previously-loaded customer being reused.    */
    if (typeof resetDiscoveryForScenario === 'function') await resetDiscoveryForScenario(id);
    showToast('Loaded — "' + (scenario?.name || inputs.name || 'scenario') + '"');
    switchTab('calc');
    trackEvent('scenario_loaded', { company: inputs.company || '' });
  } catch(e) {
    console.error('loadScenario error:', e.message);
    showToast('Failed to load scenario.');
  }
}

async function deleteScenario(id) {
  const s = savedScenarios.find(x => x.id === id);
  if (!s) return;
  /* Optimistic: hide from the list now, defer the real delete for the undo window. */
  const doDelete = async () => {
    try {
      const resp = await apiFetch('/api/scenarios/' + id, { method: 'DELETE' });
      if (!resp || !resp.ok) { showToast('Delete failed.'); await fetchScenarios(); return; }
      compareIds.delete(id);
      await fetchScenarios();
    } catch(e) { showToast('Delete failed — check your connection.'); await fetchScenarios(); }
  };
  if (typeof undoableAction === 'function') {
    /* Visually remove the row immediately; restore on undo. */
    const row = document.querySelector(`[data-scenario-id="${id}"]`);
    if (row) row.style.display = 'none';
    undoableAction(`Deleted "${s.name}"`, doDelete, () => { if (row) row.style.display = ''; });
  } else {
    if (!confirm('Delete "' + s.name + '"?')) return;
    await doDelete(); showToast('Deleted.');
  }
}

/* ════════════════════════════════════════
   Scenario list render (base version)
   Full version with grouping is in versioning.js
   ════════════════════════════════════════ */
function renderList() {
  const el = document.getElementById('scenarioList');
  if (!el) return;
  const current = savedScenarios.filter(s => s.isCurrent !== false);
  const filtered = stageFilter ? current.filter(s => s.dealStage === stageFilter) : current;

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><p>No scenarios saved yet. Build one in the Calculator.</p></div>';
    renderStageFilters();
    return;
  }

  const initials    = n => n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';
  const payStr      = pb => pb===null?'—':pb>=60?'60+mo':pb.toFixed(1)+'mo';
  const stageColors = (typeof STAGE_COLORS !== 'undefined') ? STAGE_COLORS : { Discovery:'#0089A6', Demo:'#A6791E', Proposal:'#12786F', Negotiation:'#6A4C93', 'Closed Won':'#2E7D32', 'Closed Lost':'#C81E10' };
  const me          = window.ciAuth ? window.ciAuth.getUser() : {};

  el.innerHTML = `<ul class="scenario-list">${filtered.map(s => `
    <li class="scenario-item">
      <label class="compare-check"><input type="checkbox" ${compareIds.has(s.id)?'checked':''} onchange="toggleCompare('${s.id}')"/></label>
      <div class="scenario-avatar">${initials(s.company||s.name)}</div>
      <div class="scenario-info">
        <div class="scenario-name">${s.name}
          <span class="version-badge">v${s.version||1}</span>
          ${s.ownerUsername && s.ownerUsername !== me.username ? `<span class="shared-badge">shared by ${s.ownerUsername}</span>` : ''}
        </div>
        <div class="scenario-meta">${s.company}${s.industry&&IND[s.industry]?' · '+IND[s.industry].label:''} · ${s.date} · Payback: ${payStr(s.payback)}</div>
        ${s.dealStage?`<span class="stage-pill" style="background:${stageColors[s.dealStage]||'#64748B'}20;color:${stageColors[s.dealStage]||'#64748B'};border:1px solid ${stageColors[s.dealStage]||'#64748B'}40">${s.dealStage}</span>`:''}
      </div>
      <div class="scenario-kpis">
        <div class="sk-main">${fmtFull(s.annualBenefit)}/yr · ${fmtPct(s.roi)} ROI</div>
        <div class="sk-sub">NPV3: ${fmtFull(s.npv3)} · NPV5: ${fmtFull(s.npv5)}</div>
      </div>
      <div class="scenario-actions">
        <button class="btn btn-ghost btn-sm" onclick="loadScenario('${s.id}')">Load</button>
        <button class="btn btn-ghost btn-sm" onclick="generateShareURLFromScenario('${s.id}')" title="Copy share link">🔗</button>
        ${!isShared ? `<button class="btn btn-ghost btn-sm" onclick="openShareModal('${s.id}','${s.name.replace(/'/g,"\\'")}')" title="Share with team">Share</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteScenario('${s.id}')">Delete</button>
      </div>
    </li>`).join('')}
  </ul>
  ${compareIds.size>=2?`<div class="compare-cta"><button class="btn btn-cta" onclick="switchTab('compare')">Compare ${compareIds.size} scenarios →</button></div>`:''}`;
  renderStageFilters();
}

async function generateShareURLFromScenario(id) {
  const s = savedScenarios.find(x => x.id === id);
  try {
    const resp = await apiFetch('/api/scenario-shares', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: id, company: s?.company || '', title: s?.name || '' })
    });
    if (!resp || !resp.ok) { showToast('Could not create share link.'); return; }
    const { shareUrl } = await resp.json();
    navigator.clipboard.writeText(shareUrl)
      .then(() => showToast('🔗 Trackable share link copied — you\'ll see when it\'s opened.'))
      .catch(() => showToast('Share link: ' + shareUrl));
  } catch (e) {
    console.error('share link error:', e.message);
    showToast('Could not create share link — check your connection.');
  }
}

/* ════════════════════════════════════════
   Clear form
   ════════════════════════════════════════ */
/* ── Option A: accuracy-gap → suggested recovery % ──
   Benchmark accuracy is 99.5%. The gap (benchmark − current) is mapped to
   a suggested shrink/carrying recovery %. This SUGGESTS only — the rep must
   click Apply; nothing is silently overwritten.                          */
const ACCURACY_BENCHMARK = 99.5;
function computeAccuracyRecovery(currentAccuracy) {
  if (!currentAccuracy || currentAccuracy <= 0 || currentAccuracy >= ACCURACY_BENCHMARK) return null;
  const gap = ACCURACY_BENCHMARK - currentAccuracy;           // percentage points
  /* Map gap → recovery %: each point of gap ≈ 5% recoverable, capped at 60%.
     e.g. 92% accuracy → 7.5pt gap → ~38% suggested recovery.             */
  const suggested = Math.min(60, Math.round(gap * 5));
  return suggested > 0 ? suggested : null;
}
function renderAccuracySuggestion(v) {
  const box = document.getElementById('accuracySuggestion');
  if (!box) return;
  const rec = computeAccuracyRecovery(v.currentAccuracy);
  if (rec === null) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.innerHTML =
    `<span>Prospect accuracy <strong>${v.currentAccuracy}%</strong> → suggested recovery ` +
    `<strong>${rec}%</strong> for shrink &amp; carrying.</span> ` +
    `<button type="button" class="btn btn-ghost btn-sm" onclick="applyAccuracySuggestion(${rec})">Apply</button>`;
}
function applyAccuracySuggestion(rec) {
  ['m_shrinkage','m_carrying'].forEach(id => { const el = document.getElementById(id); if (el) el.value = rec; });
  if (typeof recalc === 'function') recalc();
  if (typeof showToast === 'function') showToast(`Applied ${rec}% recovery to shrink & carrying assumptions.`);
}

/* ── Product/Solution emphasis (v2.6) ──
   Highlights the driver groups most relevant to the selected Cloud
   Inventory solution. Does NOT change the math — every lever still
   calculates identically; this only guides the rep's attention and
   labels the outputs.                                                   */
const SOLUTION_EMPHASIS = {
  cip:    { label: 'Cloud Inventory Platform (CIP)', highlight: ['wms','count'] },
  mep:    { label: 'Mobile Enterprise Platform (MEP)', highlight: ['mep','downtime'] }
};
function applySolutionEmphasis() {
  const sel = document.getElementById('solution');
  const sol = sel ? sel.value : 'all';
  const cfg = SOLUTION_EMPHASIS[sol] || SOLUTION_EMPHASIS.cip;
  document.querySelectorAll('.field-group-label').forEach(el => el.classList.remove('driver-emphasis'));
  if (cfg.highlight.includes('wms')) {
    document.querySelectorAll('.wms-tag').forEach(t => {
      const lbl = t.closest('.field-group-label'); if (lbl) lbl.classList.add('driver-emphasis');
    });
  }
  if (cfg.highlight.includes('mep')) {
    document.querySelectorAll('.mep-tag').forEach(t => {
      const lbl = t.closest('.field-group-label'); if (lbl) lbl.classList.add('driver-emphasis');
    });
  }
  if (typeof recalc === 'function') recalc();
}

function clearForm() {
  ['scenarioName','companyName','repName','revenue','userCount','inventoryValue','itCost',
   'psvcCost','hwCost','trainCost','annualWriteOff','otifBaseline','otifTarget',
   'invTurnsCurrent','invTurnsBenchmark'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  for(let i=1;i<=17;i++){ const el=document.getElementById('dq'+i); if(el) el.value=''; }
  ['industry','competitor','compSelect','dealStage'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const audEl = document.getElementById('execAudience');
  if (audEl) audEl.value = 'mixed';
  ['why_act','why_ci','why_now'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  if (typeof threeWhys !== 'undefined') { threeWhys.act=''; threeWhys.ci=''; threeWhys.now=''; }
  // Clear assumption fields entirely — they should show "Use industry avg
  // until confirmed" placeholder text, not a hardcoded generic number, so
  // selecting an industry (or leaving it blank) drives the calc-time fallback
  // consistently via metricPct(). Only non-assumption financial/timeline
  // fields get a sensible starting default here.
  ['m_labor','m_shrinkage','m_carrying','m_otif','m_it',
   'm_shrinkRate','m_carryRate','m_otifRisk',
   'downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr','m_downtime',
   'expediteSpendYr','m_expedite','countDaysYr','countPeople','m_count',
   'laborWastePct','currentAccuracy',
   'ordersPerYr','costPerOrder','pickRateGainPct','m_throughput','orderErrorPct','costPerError','m_accuracy'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const defaults={laborCost:55000,invest:80000,discRate:10,
    implMonths:3,ramp1:40,ramp2:75,ramp3:100};
  Object.entries(defaults).forEach(([id,v])=>{ const el=document.getElementById(id); if(el) el.value=v; });
  document.getElementById('benchBadge').style.display='none';
  prospectLogoDataUrl=null;
  confirmedFields=new Set();
  fieldStates={};
  /* New blank scenario — clear any discovery session from a prior load */
  if (typeof resetDiscoveryForScenario === 'function') resetDiscoveryForScenario(null);
  if (typeof updateLogoPreview === 'function') updateLogoPreview();
  if (typeof renderConfidence  === 'function') renderConfidence();
  recalc();
  showToast('Ready for new scenario.');
}

/* ════════════════════════════════════════
   Init — safe calls only (no cross-file deps)
   Cross-file inits (loadCustomBenchmarks, checkShareURL,
   renderConfidence, renderList) are called from index.html
   after all scripts have loaded.
   ════════════════════════════════════════ */
const _todayEl = document.getElementById('todayDate');
if (_todayEl) _todayEl.textContent =
  new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

updateSavedBadge();
/* recalc() is deferred to the post-load init in index.html: it calls getVals()
   which reads prospectLogoDataUrl / confirmedFields declared in features.js
   (loaded after app.js). Running it here caused a ReferenceError at load. */
