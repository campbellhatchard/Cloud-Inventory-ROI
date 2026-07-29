/* ═══════════════════════════════════════════════════════════════════
   impact-map.js — in-app Discovery → Calculator Impact Map (all roles)

   Renders every discovery question grouped by industry, showing the
   calculator field it feeds, a plain-language description of what that
   field is used for, and the ROI line it moves. Includes live search,
   jump-to-industry chips, and floating back-to-top / search controls.
   Built live from DISC_QUESTIONS so it always matches the app.
   ═══════════════════════════════════════════════════════════════════ */

/* Plain-language description of what each calculator field is used for. */
const IMPACT_FIELD_INFO = {
  userCount:          { label: 'Labor savings',              desc: 'The number of people who touch inventory. Multiplied by labor rate and recovery % to size labor savings.' },
  laborWastePct:      { label: 'Labor savings',              desc: 'Measured share of staff time lost to manual inventory work. Scales labor savings to the actual waste, not just headcount.' },
  currentAccuracy:    { label: 'Shrink & carrying (suggested)', desc: 'The prospect’s current inventory accuracy. The gap below the 99.5% benchmark suggests a shrink/carrying recovery % the rep can apply.' },
  annualWriteOff:     { label: 'Write-off / shrink savings', desc: 'Annual dollars written off to loss, damage, or shrinkage. Multiplied by the shrink recovery % to size write-off savings.' },
  inventoryValue:     { label: 'Carrying cost + turns',      desc: 'Total inventory on hand. Drives carrying-cost savings and, with turns, the working-capital release.' },
  invTurnsCurrent:    { label: 'Working capital (turns)',    desc: 'Current inventory turns per year. The gap to the benchmark frees trapped working capital.' },
  otifBaseline:       { label: 'OTIF revenue-at-risk',       desc: 'Current on-time-in-full rate. The gap to target, applied to revenue, sizes the service/revenue recovery.' },
  otifTarget:         { label: 'OTIF revenue-at-risk',       desc: 'Target OTIF rate. Sets the ceiling of the OTIF gap used in the revenue-at-risk calculation.' },
  itCost:             { label: 'IT displacement',            desc: 'Annual spend on inventory/ERP/WMS systems. Multiplied by the IT recovery % to size displacement savings.' },
  revenue:            { label: 'Revenue base',               desc: 'Annual revenue. Used as the multiplier for OTIF value-at-risk.' },
  discRate:           { label: 'NPV discount rate',          desc: 'Finance team’s hurdle rate. Discounts future cash flows for the 3- and 5-year NPV.' },
  downtimeEventsYr:   { label: 'Production downtime (new)',  desc: 'Stockout-driven stop/slow events per year. First factor of the downtime cost.' },
  downtimeHrsPerEvent:{ label: 'Production downtime (new)',  desc: 'Average hours lost per downtime event. Second factor of the downtime cost.' },
  downtimeCostPerHr:  { label: 'Production downtime (new)',  desc: 'Fully-loaded cost of one hour of lost/slowed work. Third factor of the downtime cost.' },
  expediteSpendYr:    { label: 'Expedite premium (new)',     desc: 'Annual spend on expedited/emergency orders caused by stockouts. Multiplied by the expedite recovery %.' },
  countDaysYr:        { label: 'Count labor (new)',          desc: 'Person-days per year spent on physical/cycle counts. Combined with people and labor rate to size count-labor savings.' },
  countPeople:        { label: 'Count labor (new)',          desc: 'Number of people involved in counting. Second factor of the count-labor cost.' },
  ordersPerYr:        { label: 'Throughput & accuracy (WMS)', desc: 'Annual orders/lines shipped. Shared volume base for both the throughput and order-accuracy levers.' },
  costPerOrder:       { label: 'Throughput (WMS)',           desc: 'Current fully-loaded labor cost to process one order/line. Combined with pick-rate gain to size throughput savings.' },
  pickRateGainPct:    { label: 'Throughput (WMS)',           desc: 'Expected pick-rate/throughput improvement from mobile-first workflows — the “ship more with the same team” gain.' },
  orderErrorPct:      { label: 'Order accuracy (WMS)',       desc: 'Current order error/mis-ship rate. Applied to volume and cost-per-error to size returns/chargeback savings.' },
  costPerError:       { label: 'Order accuracy (WMS)',       desc: 'Fully-loaded cost of one mis-ship: return processing, re-ship freight, and customer chargeback.' },
  repeatVisitsYr:     { label: 'First-time-fix (Field)',     desc: 'Repeat/return field visits per year caused by wrong or missing parts. First factor of truck-roll avoidance.' },
  costPerTruckRoll:   { label: 'First-time-fix (Field)',     desc: 'Fully-loaded cost of one truck roll — labor, vehicle, and fuel.' },
  fieldTechs:         { label: 'Revenue per tech (Field)',   desc: 'Number of field technicians. Basis for the revenue-growth (utilization) lever, shown separately from cost savings.' },
  addedJobsPerDay:    { label: 'Revenue per tech (Field)',   desc: 'Additional billable jobs each tech can complete per day from time saved. Drives revenue growth.' },
  revenuePerJob:      { label: 'Revenue per tech (Field)',   desc: 'Average revenue per billable job. Multiplied through the utilization lever.' },
  fieldInventoryValue:{ label: 'Field leakage (Field)',      desc: 'Value of inventory held in the field / on trucks. Basis for field leakage savings.' },
  fieldLeakagePct:    { label: 'Field leakage (Field)',      desc: 'Current field/van-stock leakage rate — parts lost, walked-off, or expired. Distinct from warehouse shrink.' }
};

const IMPACT_IND_ORDER = ['default','telecom','mfg','construction','oil','distribution','food','retail','mining'];
const IMPACT_IND_LABEL = {
  default:'Default / Generic', telecom:'Telecommunications', mfg:'Manufacturing',
  construction:'Engineering & Construction', oil:'Oil & Gas', distribution:'Wholesale Distribution',
  food:'Food & Beverage', retail:'Medical Devices / Life Sciences', mining:'Minerals & Mining'
};

let _impactBuilt = false;

function initImpactTab() {
  if (_impactBuilt) return;      // static reference — build once
  renderImpactMap();
  _impactBuilt = true;
  setTimeout(bindImpactScroll, 50);
}

function impactEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderImpactMap() {
  const host = document.getElementById('impactContent');
  const jump = document.getElementById('impactJump');
  if (!host || typeof DISC_QUESTIONS === 'undefined') return;

  /* Intro / how-calculations-work summary */
  let html = `<div class="impact-intro">
    <p>Every quantifiable answer in the Discovery guide flows into the ROI calculator. This reference shows, for each question, the <strong>calculator field</strong> it populates, <strong>what that field is used for</strong>, and the <strong>ROI line</strong> it moves. Use the search box to find any question, field, or metric.</p>
    <div class="impact-levers">
      <div class="impact-lever-card"><strong>Annual benefit</strong> is the sum of nine levers:</div>
      <ul class="impact-lever-list">
        <li><strong>Labor</strong> = users × rate × (waste%) × recovery%</li>
        <li><strong>Write-off</strong> = write-off $ × recovery%</li>
        <li><strong>Carrying</strong> = inventory × carrying% (−15% overlap)</li>
        <li><strong>Turns</strong> = inventory × turns gap × carry rate</li>
        <li><strong>OTIF</strong> = revenue × (target−baseline) × recovery%</li>
        <li><strong>IT</strong> = IT cost × recovery%</li>
        <li><strong>Downtime</strong> = events × hrs × $/hr × recovery% <span class="impact-new">new</span></li>
        <li><strong>Expedite</strong> = expedite spend × recovery% <span class="impact-new">new</span></li>
        <li><strong>Count</strong> = days × people × daily labor × recovery% <span class="impact-new">new</span></li>
        <li><strong>Throughput</strong> = orders × cost/order × pick-rate gain% × recovery% <span class="impact-new">wms</span></li>
        <li><strong>Order accuracy</strong> = orders × error% × cost/error × recovery% <span class="impact-new">wms</span></li>
        <li><strong>First-time-fix</strong> = repeat visits × cost/truck roll × recovery% <span class="impact-new">field</span></li>
        <li><strong>Field leakage</strong> = field inventory × leakage% × recovery% <span class="impact-new">field</span></li>
        <li><strong>Revenue per tech</strong> = techs × jobs/day × rev/job × days × realization% <span class="impact-new">field · revenue</span></li>
      </ul>
    </div>
    <div class="impact-flag">⚠ The recovery percentages for the newer levers (downtime, expedite, count, throughput, order-accuracy, first-time-fix, field-leakage, and technician-utilization) ship as <strong>conservative placeholder defaults</strong>. Review and tune them against your team's validated figures before presenting to a prospect. Revenue per technician is a <strong>revenue-growth</strong> figure and is presented separately from cost savings in the methodology document.</div>
  </div>`;

  const chips = [];
  IMPACT_IND_ORDER.forEach(ind => {
    const secs = DISC_QUESTIONS[ind];
    if (!secs) return;
    chips.push(`<button class="impact-chip" onclick="jumpToImpact('${ind}')">${impactEsc(IMPACT_IND_LABEL[ind])}</button>`);

    const qCount = secs.reduce((n,s)=>n+s.questions.length,0);
    html += `<section class="impact-section" id="impact-sec-${ind}" data-ind="${ind}">
      <h3 class="impact-h">${impactEsc(IMPACT_IND_LABEL[ind])} <span class="impact-h-count">${qCount} questions</span></h3>
      <table class="impact-table"><thead><tr>
        <th style="width:38%">Question</th><th style="width:10%">Type</th>
        <th style="width:22%">Field &amp; what it’s for</th><th style="width:30%">ROI impact</th>
      </tr></thead><tbody>`;

    secs.flatMap(s=>s.questions).forEach(q => {
      let fieldCell, impactCell, kind;
      if (q.note) {
        fieldCell = '<em>Qualitative note</em>';
        impactCell = 'Context only — captured for the business-case narrative, not calculated.';
        kind = 'note';
      } else if (q.sync) {
        const info = IMPACT_FIELD_INFO[q.sync] || { label:'—', desc:'' };
        const conv = q.syncConv === 'hoursPerWeek' ? ' <span class="impact-conv">(hrs/wk → % of 40h)</span>' : '';
        fieldCell = `<code>${impactEsc(q.sync)}</code>${conv}<div class="impact-field-desc">${impactEsc(info.desc)}</div>`;
        impactCell = `<span class="impact-badge">${impactEsc(info.label)}</span>`;
        kind = 'synced';
      } else {
        fieldCell = '—';
        impactCell = 'Diagnostic — qualifies the opportunity but is not a direct input.';
        kind = 'diag';
      }
      const hay = (q.text + ' ' + (q.sync||'') + ' ' + impactCell).toLowerCase();
      html += `<tr class="impact-row" data-kind="${kind}" data-search="${impactEsc(hay)}">
        <td>${impactEsc(q.text)}</td>
        <td><span class="impact-type impact-type-${q.type}">${impactEsc(q.type)}</span></td>
        <td>${fieldCell}</td>
        <td>${impactCell}</td>
      </tr>`;
    });
    html += '</tbody></table></section>';
  });

  host.innerHTML = html;
  if (jump) jump.innerHTML = chips.join('');
}

/* ── Search ── */
function filterImpactMap(term) {
  const q = (term||'').trim().toLowerCase();
  const clear = document.getElementById('impactSearchClear');
  if (clear) clear.style.display = q ? 'block' : 'none';

  const rows = document.querySelectorAll('.impact-row');
  let shown = 0;
  rows.forEach(r => {
    const match = !q || r.dataset.search.includes(q);
    r.style.display = match ? '' : 'none';
    if (match) shown++;
  });
  /* Hide sections whose rows are all filtered out */
  document.querySelectorAll('.impact-section').forEach(sec => {
    const anyVisible = sec.querySelector('.impact-row:not([style*="display: none"])');
    sec.style.display = anyVisible ? '' : 'none';
  });
  const count = document.getElementById('impactCount');
  if (count) count.textContent = q ? `${shown} match${shown!==1?'es':''}` : '';
}
function clearImpactSearch() {
  const s = document.getElementById('impactSearch');
  if (s) { s.value = ''; filterImpactMap(''); s.focus(); }
}
function focusImpactSearch() {
  const s = document.getElementById('impactSearch');
  if (s) { s.scrollIntoView({behavior:'smooth', block:'center'}); s.focus(); }
}

/* ── Navigation ── */
function jumpToImpact(ind) {
  const el = document.getElementById('impact-sec-' + ind);
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}
function impactScrollTop() {
  const pane = document.getElementById('tab-impact');
  const scroller = getImpactScroller();
  if (scroller) scroller.scrollTo({ top:0, behavior:'smooth' });
  else window.scrollTo({ top:0, behavior:'smooth' });
}
/* The scroll container is whichever ancestor actually scrolls */
function getImpactScroller() {
  let el = document.getElementById('impactContent');
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4) return el;
    el = el.parentElement;
  }
  return null;
}
function bindImpactScroll() {
  const scroller = getImpactScroller() || window;
  const fabTop = document.getElementById('impactFabTop');
  const onScroll = () => {
    const y = scroller === window ? window.scrollY : scroller.scrollTop;
    if (fabTop) fabTop.classList.toggle('impact-fab-hidden', y < 300);
  };
  scroller.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
}
