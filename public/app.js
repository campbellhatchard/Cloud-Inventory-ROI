/* ═══════════════════════════════════════════════════
   Cloud Inventory ROI Builder — app.js v5
   Core engine + integration of all 13 features
   ═══════════════════════════════════════════════════ */

/* ── Industry benchmark data ── */
const IND = {
  telecom:      { labor:30,shrinkage:45,carrying:20,otif:12,it:65,shrinkRate:2.5,carryRate:28,otifRisk:2.5,otifBaseline:92,otifTarget:97,invTurns:4,  downtime:30,expedite:25,count:40,throughput:30,accuracy:35,firstFix:35,utilization:20,leakage:30,label:'Telecommunications' },
  mfg:          { labor:25,shrinkage:40,carrying:18,otif:10,it:60,shrinkRate:2.0,carryRate:25,otifRisk:2.0,otifBaseline:91,otifTarget:97,invTurns:6,  downtime:35,expedite:30,count:45,throughput:30,accuracy:35,firstFix:20,utilization:10,leakage:20,label:'Manufacturing' },
  construction: { labor:20,shrinkage:35,carrying:15,otif:8, it:55,shrinkRate:3.0,carryRate:22,otifRisk:1.5,otifBaseline:88,otifTarget:95,invTurns:3,  downtime:25,expedite:25,count:35,throughput:25,accuracy:30,firstFix:35,utilization:20,leakage:30,label:'Engineering & Construction' },
  oil:          { labor:22,shrinkage:38,carrying:17,otif:9, it:58,shrinkRate:2.8,carryRate:24,otifRisk:2.0,otifBaseline:89,otifTarget:96,invTurns:4,  downtime:30,expedite:28,count:40,throughput:30,accuracy:35,firstFix:35,utilization:18,leakage:30,label:'Oil & Gas' },
  mining:       { labor:20,shrinkage:35,carrying:15,otif:8, it:55,shrinkRate:2.5,carryRate:23,otifRisk:1.5,otifBaseline:88,otifTarget:95,invTurns:3,  downtime:35,expedite:25,count:35,throughput:30,accuracy:35,firstFix:30,utilization:15,leakage:28,label:'Minerals & Mining' },
  distribution: { labor:35,shrinkage:50,carrying:22,otif:15,it:70,shrinkRate:1.5,carryRate:30,otifRisk:3.0,otifBaseline:94,otifTarget:99,invTurns:12, downtime:20,expedite:35,count:50,throughput:35,accuracy:40,firstFix:20,utilization:10,leakage:20,label:'Distribution & 3PL' },
  food:         { labor:28,shrinkage:42,carrying:18,otif:12,it:60,shrinkRate:2.2,carryRate:27,otifRisk:2.5,otifBaseline:92,otifTarget:98,invTurns:15, downtime:25,expedite:30,count:45,throughput:30,accuracy:35,firstFix:20,utilization:10,leakage:22,label:'Food & Beverage' },
  retail:       { labor:30,shrinkage:45,carrying:20,otif:13,it:62,shrinkRate:1.8,carryRate:28,otifRisk:2.8,otifBaseline:93,otifTarget:98,invTurns:8,  downtime:20,expedite:30,count:45,throughput:35,accuracy:40,firstFix:20,utilization:10,leakage:20,label:'Retail' }
};

/* ── Competitive data ── */
const COMP = {
  sap:   { name:'SAP WM / Extended WH Mgmt', cost:'$500K–$2M+ implementation', time:'12–24 months to go-live', maint:'18–22% annual maintenance',
    pain:['Complex ABAP configuration requires expensive SAP consultants','High TCO with continuous customization costs','Difficult to adapt for mobile and field inventory','Upgrade cycles create prolonged operational risk'],
    adv:['No-code configuration vs SAP ABAP — no consultants needed','Go-live in weeks, not years','Mobile-first UX built for warehouse and field workers','Fraction of the 3-year TCO','Native Field Inventory — no SAP equivalent'] },
  rf:    { name:'Legacy RF / Paper-based', cost:'$50K–$300K in aging hardware', time:'No real-time visibility', maint:'High labor cost for manual reconciliation',
    pain:['Zero real-time inventory visibility','Error-prone manual entry drives write-offs','Disconnected field operations create blind spots','Cannot scale without adding headcount'],
    adv:['Real-time scan-verified accuracy at every transaction','Runs on modern devices — no RF gun refresh','Cloud-based — no on-premise infrastructure','Unified warehouse and field platform'] },
  oracle:{ name:'Oracle WMS', cost:'$300K–$1.5M implementation', time:'9–18 months typical', maint:'20%+ annual support costs',
    pain:['High implementation cost requires Oracle specialists','Limited mobile-first capabilities','Complex non-Oracle ERP integrations','Rigid licensing limits flexibility'],
    adv:['ERP-agnostic API-first integration','Up to 10x faster deployment','Lower 3-year TCO','Field Inventory fills a gap Oracle cannot'] },
  excel: { name:'Spreadsheets / Manual', cost:'Hidden: $80K–$200K/yr in labor waste', time:'Always running behind reality', maint:'Rework, reconciliation, audit overhead',
    pain:['Zero real-time visibility','High error rates and write-offs','No audit trail or compliance support','Cannot support multi-site operations'],
    adv:['Real-time scan-verified accuracy','Audit-ready reporting built in','Scales without adding headcount','ROI typically under 6 months'] },
  erp:   { name:'ERP-Native Module', cost:'Included but capability-limited', time:'Not optimized for warehouse ops', maint:'Tied to ERP upgrade cycle',
    pain:['Designed for records, not execution','Limited mobile scanning capability','No wave management or directed put-away','Field inventory blind spots'],
    adv:['Purpose-built execution on top of your ERP','Scan-verified at every transaction','Field Inventory fills ERP gaps','API-first sync with any ERP'] },
  other: { name:'Other WMS', cost:'$200K–$1M+ typical', time:'12–18 months average', maint:'15–20% annual maintenance',
    pain:['High ongoing customization cost','Limited field operation flexibility','Mobile UX often retrofitted','Vendor lock-in'],
    adv:['No-code config — adapt in hours','Single platform for warehouse and field','API-first for any ERP','Cloud-native SaaS'] }
};

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
    const resp = await apiFetch('/api/scenarios');
    if (!resp || !resp.ok) return;
    const rows = await resp.json();
    /* Normalise DB row shape to match the legacy shape used by features.js */
    savedScenarios = rows.map(normaliseRow);
    updateSavedBadge();
    if (typeof renderListVersioned === 'function') renderListVersioned();
    else renderList();
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
    solution:      r.solution || 'all',
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
const ALL_TABS = ['calc','disc','comp','exec','saved','compare','sensitivity','analytics','map','stake','admin','help','impact','profile'];

function switchTab(name) {
  ALL_TABS.forEach(n => {
    const tab = document.getElementById('tab-' + n);
    const nav = document.getElementById('nav-' + n);
    if (tab) tab.classList.toggle('active', n === name);
    if (nav) nav.classList.toggle('active', n === name);
  });
  document.body.classList.toggle('impact-active', name === 'impact');
  if (name === 'comp')        { syncCompDropdowns(); renderComp(); }
  if (name === 'exec')        renderExec();
  if (name === 'saved')       { renderList(); renderStageFilters(); }
  if (name === 'compare')     renderComparison();
  if (name === 'sensitivity') renderSensitivity();
  if (name === 'analytics')   renderAnalytics();
  if (name === 'admin')       adminUnlocked && renderAdminEditor();
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
  Object.entries(bmap).forEach(([id,v]) => { const el=document.getElementById(id); if(el) el.textContent='Avg: '+v; });
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
function g(id) { return Math.max(0, parseFloat(document.getElementById(id)?.value) || 0); }
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
    solution: gs('solution') || 'all',
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
    /* ── v2.7 Field Inventory levers ── */
    repeatVisitsYr:      g('repeatVisitsYr'),
    costPerTruckRoll:    g('costPerTruckRoll'),
    mFirstFix:           metricPct('m_firstfix', 'firstFix'),
    fieldTechs:          g('fieldTechs'),
    addedJobsPerDay:     g('addedJobsPerDay'),
    revenuePerJob:       g('revenuePerJob'),
    workingDaysYr:       g('workingDaysYr') || 0,
    mUtilization:        metricPct('m_utilization', 'utilization'),
    fieldInventoryValue: g('fieldInventoryValue'),
    fieldLeakagePct:     g('fieldLeakagePct') / 100,
    mLeakage:            metricPct('m_leakage', 'leakage'),
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
    prospectLogoDataUrl: prospectLogoDataUrl,
    confidence: [...confirmedFields]
  };
}

/* ════════════════════════════════════════
   ROI + NPV Engine
   ════════════════════════════════════════ */
/* calcROI is defined in src/shared/roi-engine.js (loaded before app.js) */

/* ════════════════════════════════════════
   Formatters
   ════════════════════════════════════════ */
function fmt(n) {
  if (n===null||n===undefined||isNaN(n)) return '—';
  const abs=Math.abs(Math.round(n));
  if (abs>=1000000) return (n<0?'-$':'$')+(abs/1000000).toFixed(1).replace(/\.0$/,'')+'M';
  if (abs>=10000)   return (n<0?'-$':'$')+Math.round(abs/1000)+'K';
  return (n<0?'-$':'$')+abs.toLocaleString();
}
function fmtFull(n) {
  if (n===null||isNaN(n)) return '—';
  return (n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString();
}
function fmtPct(n) { return Math.round(n)+'%'; }
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
  lb('lb-benefit', fmt(r.annualBenefit), lbClass(r.annualBenefit));
  lb('lb-roi',     r.roi?fmtPct(r.roi):'—', lbClass(r.roi));
  lb('lb-npv3',    fmt(r.npv3), lbClass(r.npv3));
  lb('lb-npv5',    fmt(r.npv5), lbClass(r.npv5));

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
}

/* ════════════════════════════════════════
   Competitive tab
   ════════════════════════════════════════ */
function renderComp() {
  const key = gs('compSelect') || gs('competitor');
  const el  = document.getElementById('compContent');
  if (!key) { el.innerHTML='<div class="empty-state"><p>Select a competing solution above.</p></div>'; return; }
  const c = COMP[key];
  if (gs('competitor') !== key) document.getElementById('competitor').value = key;
  el.innerHTML = `
    <div class="comp-header-card">
      <div class="comp-header-name">${c.name}</div>
      <div class="comp-meta-row">
        <div class="comp-meta-item"><div class="cm-label">Typical cost</div><div class="cm-value">${c.cost}</div></div>
        <div class="comp-meta-item"><div class="cm-label">Time to value</div><div class="cm-value">${c.time}</div></div>
        <div class="comp-meta-item"><div class="cm-label">Ongoing maintenance</div><div class="cm-value">${c.maint}</div></div>
      </div>
    </div>
    <div class="comp-two">
      <div class="comp-list-card pain">
        <div class="comp-list-title">Pain points with ${c.name}</div>
        ${c.pain.map(p=>`<div class="comp-row"><i class="comp-icon">✗</i><span>${p}</span></div>`).join('')}
      </div>
      <div class="comp-list-card adv">
        <div class="comp-list-title">Cloud Inventory advantages</div>
        ${c.adv.map(a=>`<div class="comp-row"><i class="comp-icon">✓</i><span>${a}</span></div>`).join('')}
      </div>
    </div>`;
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
          <th style="background:#854F0B;">Conservative (70%)</th>
          <th style="background:#185FA5;">Base (100%)</th>
          <th style="background:#2E7D32;">Aggressive (130%)</th>
        </tr></thead>
        <tbody>
          <tr><td class="left">Annual benefit</td>${scenarios.map(s=>`<td class="pos">${fmtFull(s.r.annualBenefit)}</td>`).join('')}</tr>
          <tr><td class="left">Year 1 ROI</td>${scenarios.map(s=>`<td style="font-weight:600;color:#185FA5;">${fmtPct(s.r.roi)}</td>`).join('')}</tr>
          <tr><td class="left">Payback period</td>${scenarios.map(s=>`<td>${payStr(s.r.payback)}</td>`).join('')}</tr>
          <tr><td class="left">3-yr NPV</td>${scenarios.map(s=>`<td class="${s.r.npv3>=0?'pos':'neg'}">${fmtFull(s.r.npv3)}</td>`).join('')}</tr>
          <tr><td class="left">5-yr NPV</td>${scenarios.map(s=>`<td class="${s.r.npv5>=0?'pos':'neg'}">${fmtFull(s.r.npv5)}</td>`).join('')}</tr>
        </tbody>
      </table>
      <p class="e-footnote">Conservative = 70% of base improvement %; Aggressive = 130%. Investment costs are fixed across all three scenarios.</p>
    </div>`;
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

  const valueRows=[
    {label:'Labor & productivity savings',  val:r.laborSav,  color:'#185FA5'},
    {label:'Shrinkage / write-off reduction',val:r.shrinkSav,color:'#2E7D32'},
    {label:'Inventory carrying cost reduction',val:r.carrySav,color:'#0F6E56'},
    {label:'OTIF / order accuracy improvement',val:r.otifSav, color:'#854F0B'},
    {label:'Inventory turns — capital freed', val:r.turnsSav, color:'#6B3FA0'},
    {label:'IT & legacy system displacement', val:r.itSav,   color:'#3C3489'}
  ].filter(row => row.val > 0).sort((a,b) => b.val - a.val);
  const maxVal=Math.max(...valueRows.map(x=>x.val),1);

  const bars=valueRows.map(row=>`
    <div class="e-bar-row">
      <span class="e-bar-lbl">${row.label}</span>
      <div class="e-bar-track"><div class="e-bar-fill" style="width:${Math.round((row.val/maxVal)*100)}%;background:${row.color};"></div></div>
      <span class="e-bar-val">${fmtFull(row.val)}</span>
    </div>`).join('');

  const paySignStr = r.paybackFromSigning===null?'—':r.paybackFromSigning>=60?'60+ mo':r.paybackFromSigning.toFixed(1)+' mo';
  const payLiveStr = r.paybackFromGoLive===null?'—':r.paybackFromGoLive>=60?'60+ mo':r.paybackFromGoLive.toFixed(1)+' mo';
  const year1Pct   = Math.round(r.year1Factor*100);

  // Implementation proviso section for exec doc
  const implProvisoSection = v.implMonths > 0 || r.year1Factor < 0.99 ? `
    <div class="e-section e-proviso-section">
      <div class="e-h2">Implementation timeline &amp; assumptions</div>
      <div class="e-proviso-grid">
        <div class="e-proviso-card" style="border-left:4px solid #185FA5;">
          <div class="e-proviso-icon">📅</div>
          <div>
            <div class="e-proviso-label">Implementation period</div>
            <div class="e-proviso-value">${v.implMonths} month${v.implMonths!==1?'s':''}</div>
            <div class="e-proviso-detail">No benefit accrues during implementation. Go-live in month ${v.implMonths+1}.</div>
          </div>
        </div>
        <div class="e-proviso-card" style="border-left:4px solid #854F0B;">
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
      <td class="left">Year ${c.yr}${c.isRamped ? ' <span style="font-size:9px;color:#854F0B;font-weight:600">(ramp-adjusted)</span>' : ''}</td>
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
            <div style="font-size:10px;font-weight:700;color:#042C53;margin-bottom:4px;">${p.company}</div>
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
    <div class="e-body">
      <div class="e-section e-approach">
        <div class="e-approach-head">
          <div class="e-approach-title">A data-driven business case</div>
          <div class="e-approach-lede">Every figure in this assessment was built from <strong>${v.company||'your'} operational data</strong> — not vendor assumptions — using a structured, transparent method engineered to withstand financial scrutiny.</div>
        </div>
        <div class="e-approach-pillars">
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#185FA5;">◆</div>
            <div class="e-approach-pt">Your data, not assumptions</div>
            <div class="e-approach-pd">Inputs captured through structured discovery of your actual metrics.</div>
          </div>
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#0F6E56;">◆</div>
            <div class="e-approach-pt">Decomposed value drivers</div>
            <div class="e-approach-pd">Benefit broken into independently-quantified drivers, each traceable to a metric.</div>
          </div>
          <div class="e-approach-pillar">
            <div class="e-approach-icon" style="background:#854F0B;">◆</div>
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
        <div class="e-bar-total"><span style="flex:1">Total annual value</span><span>${fmtFull(r.annualBenefit)}</span></div>
      </div>
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
        solution:     v.solution     || 'all',
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
    if (!inputs) {
      const resp = await apiFetch('/api/scenarios/' + id);
      if (!resp || !resp.ok) { showToast('Could not load scenario.'); return; }
      const full = await resp.json();
      inputs = full.data;
      if (scenario) scenario.inputs = inputs;
    }
    if (!inputs) { showToast('Scenario data not found.'); return; }
    if (typeof loadFromObject === 'function') loadFromObject(inputs);
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
  if (!s || !confirm('Delete "' + s.name + '"?')) return;
  try {
    const resp = await apiFetch('/api/scenarios/' + id, { method: 'DELETE' });
    if (!resp || !resp.ok) { showToast('Delete failed.'); return; }
    compareIds.delete(id);
    showToast('Deleted.');
    await fetchScenarios();
  } catch(e) {
    showToast('Delete failed — check your connection.');
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
  const stageColors = { Discovery:'#185FA5', Demo:'#854F0B', Proposal:'#0F6E56', Negotiation:'#3C3489', 'Closed Won':'#2E7D32', 'Closed Lost':'#C62828' };
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
  let inputs = s?.inputs;
  if (!inputs) {
    const resp = await apiFetch('/api/scenarios/' + id);
    if (!resp || !resp.ok) { showToast('Could not load scenario for sharing.'); return; }
    const full = await resp.json();
    inputs = full.data;
  }
  if (!inputs) { showToast('No data to share.'); return; }
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(inputs))));
  const url = window.location.origin + window.location.pathname + '#share=' + payload;
  navigator.clipboard.writeText(url).then(() => showToast('🔗 Share link copied!'));
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
  wms:    { label: 'Warehouse Operations (WMS)', highlight: ['wms','count'] },
  mep:    { label: 'Field Inventory (MEP)',      highlight: ['mep','downtime'] },
  mfgmat: { label: 'Manufacturing Materials',    highlight: ['downtime','count'] },
  all:    { label: 'All / Platform',             highlight: [] }
};
function applySolutionEmphasis() {
  const sel = document.getElementById('solution');
  const sol = sel ? sel.value : 'all';
  const cfg = SOLUTION_EMPHASIS[sol] || SOLUTION_EMPHASIS.all;
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
   'ordersPerYr','costPerOrder','pickRateGainPct','m_throughput','orderErrorPct','costPerError','m_accuracy',
   'repeatVisitsYr','costPerTruckRoll','m_firstfix','fieldTechs','addedJobsPerDay','revenuePerJob','workingDaysYr','m_utilization','fieldInventoryValue','fieldLeakagePct','m_leakage'].forEach(id => {
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
document.getElementById('todayDate').textContent =
  new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

updateSavedBadge();
recalc();
