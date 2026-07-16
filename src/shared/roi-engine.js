/* ═══════════════════════════════════════════════════════════════════
   roi-engine.js — SHARED ROI calculation engine (browser + Node)

   Single source of truth for the ROI math. Loaded by the browser
   (public/app.js) AND required by the server (scenario save) so the
   figures stored server-side are authoritative and can never drift
   from a stale or buggy client.

   This module is PURE: calcROI(v) depends only on its input object and
   OVERLAP_DEDUCTION. It performs no DOM access — getVals() (DOM-coupled)
   stays in app.js and calls this.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();            // Node / CommonJS (server + tests)
  } else {
    const api = factory();                 // Browser global
    root.OVERLAP_DEDUCTION = api.OVERLAP_DEDUCTION;
    root.calcROI = api.calcROI;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const OVERLAP_DEDUCTION = 0.15; // 15% carrying cost overlap deduction — disclosed in footnotes

  function calcROI(v) {
    /* Defensive input contract: the browser's getVals() guarantees every
       numeric field is a number >= 0 (never undefined/NaN). When calcROI is
       called directly (server recompute, tests, malformed JSON), coerce the
       same way so the math is robust and never yields NaN. Non-numeric keys
       (modelVersion is numeric; strings are untouched) pass through.        */
    v = v || {};
    const _num = ['users','labor','mLabor','effectiveShrinkBase','mShrinkage','inventory',
      'mCarrying','carryRate','invTurnsCurrent','invTurnsBenchmark','revenue','otifBaseline',
      'otifTarget','mOtif','otifRisk','itCost','mIt','discRate','invest','otc','implMonths',
      'laborWastePct','downtimeEventsYr','downtimeHrsPerEvent','downtimeCostPerHr','mDowntime',
      'expediteSpendYr','mExpedite','countDaysYr','countPeople','mCount','ordersPerYr','costPerOrder',
      'pickRateGainPct','mThroughput','orderErrorPct','costPerError','mAccuracy','repeatVisitsYr',
      'costPerTruckRoll','mFirstFix','fieldTechs','addedJobsPerDay','revenuePerJob','workingDaysYr',
      'mUtilization','fieldInventoryValue','fieldLeakagePct','mLeakage'];
    const _v = Object.assign({}, v);
    for (const k of _num) { const n = parseFloat(_v[k]); _v[k] = (isNaN(n) || n < 0) ? 0 : n; }
    if (_v.ramp1 === undefined) _v.ramp1 = v.ramp1; // preserve undefined-ramp default logic below
    if (_v.ramp2 === undefined) _v.ramp2 = v.ramp2;
    if (_v.ramp3 === undefined) _v.ramp3 = v.ramp3;
    _v.modelVersion = v.modelVersion;  // preserve (may be undefined for legacy)
    v = _v;

  /* ── 1. Labor savings ──
     Base: users × labor × recovery%. When a measured productivity-waste %
     is supplied (v2.5+), scale by it so the actual measured waste drives
     the number instead of headcount alone. Version-guarded + blank-safe:
     old scenarios (no modelVersion) and blank fields fall back to base.  */
  const laborSav = (v.modelVersion >= 25 && v.laborWastePct > 0)
    ? v.users * v.labor * v.laborWastePct * v.mLabor
    : v.users * v.labor * v.mLabor;

  /* ── 2. Write-off / shrinkage savings ──
     Use prospect's actual $ write-off if supplied, else inventory × shrinkRate.
     This is a DIRECT saving — reduction in actual loss dollars.              */
  const shrinkSav = v.effectiveShrinkBase * v.mShrinkage;

  /* ── 3. Carrying cost savings — Option 1 overlap disclosure ──
     Calculate gross carrying cost savings, then apply a fixed 15%
     overlap deduction to account for partial double-counting with
     write-off reduction and inventory turns. The deduction is disclosed
     transparently in the executive document footnote.                  */
  const annualCarryCost   = v.inventory * v.carryRate;
  const carrySavGross     = annualCarryCost * v.mCarrying;
  const carrySavCorrected = carrySavGross * (1 - OVERLAP_DEDUCTION);
  const overlapAdj        = carrySavGross - carrySavCorrected;   // for footnote

  /* ── 4. Inventory turns: capital freed carrying cost ──
     Calculated independently — the 15% deduction above already
     accounts for partial overlap between turns and carry savings.     */
  let capitalFreed = 0, turnsSav = 0;
  if (v.invTurnsCurrent > 0 && v.invTurnsBenchmark > 0 && v.invTurnsCurrent < v.invTurnsBenchmark) {
    capitalFreed = v.inventory * (1 - v.invTurnsCurrent / v.invTurnsBenchmark);
    turnsSav     = capitalFreed * v.carryRate;
  }
  /* ── 5. OTIF savings ── */
  let otifSav = 0;
  if (v.otifBaseline > 0 && v.otifTarget > 0 && v.otifTarget > v.otifBaseline) {
    const otifGapPp = (v.otifTarget - v.otifBaseline) / 100;
    otifSav = v.revenue * otifGapPp * v.mOtif;
  } else {
    otifSav = v.revenue * v.otifRisk * v.mOtif;
  }

  /* ── 6. IT displacement ── */
  const itSav = v.itCost * v.mIt;

  /* ── 7. Production downtime from stockouts (v2.5 lever) ──
     events/yr × hrs/event × $/hr of downtime, recovered by the
     accuracy improvement fraction (mDowntime).                      */
  const downtimeCostAnnual = (v.downtimeEventsYr || 0) * (v.downtimeHrsPerEvent || 0) * (v.downtimeCostPerHr || 0);
  const downtimeSav = downtimeCostAnnual * (v.mDowntime || 0);

  /* ── 8. Expedite / emergency procurement premium (v2.5 lever) ──
     annual expedite spend × premium % that better accuracy avoids.   */
  const expediteSav = (v.expediteSpendYr || 0) * (v.mExpedite || 0);

  /* ── 9. Physical-count / cycle-count labor (v2.5 lever) ──
     count days/yr × people × daily labor cost, recovered fraction.   */
  const countLaborAnnual = (v.countDaysYr || 0) * (v.countPeople || 0) * ((v.labor || 0) / 260);
  const countSav = countLaborAnnual * (v.mCount || 0);

  /* Model version: scenarios saved before v2.5 have no new-lever inputs.
     The inputs default to 0, so these levers contribute 0 for old
     scenarios — but we also hard-gate on modelVersion for clarity and
     to protect the documented "old scenarios recalculate identically". */
  const newLeverSav = (v.modelVersion >= 25)
    ? (downtimeSav + expediteSav + countSav)
    : 0;

  /* ── 10. Warehouse throughput / pick-rate productivity (v2.6 / WMS) ──
     Ship more with the same team: orders/yr × cost/order × pick-rate gain%
     × recovery%. Distinct from headcount labor — captures speed of work.  */
  const throughputSav = (v.modelVersion >= 26)
    ? (v.ordersPerYr || 0) * (v.costPerOrder || 0) * (v.pickRateGainPct || 0) * (v.mThroughput || 0)
    : 0;

  /* ── 11. Order accuracy → returns & chargeback cost (v2.6 / WMS) ──
     Mis-ship cost OTIF misses: orders/yr × error rate% × cost/error ×
     recovery%. Reuses ordersPerYr so volume is entered once.             */
  const accuracySav = (v.modelVersion >= 26)
    ? (v.ordersPerYr || 0) * (v.orderErrorPct || 0) * (v.costPerError || 0) * (v.mAccuracy || 0)
    : 0;

  const wmsLeverSav = throughputSav + accuracySav;

  /* ── 12. First-time-fix / truck-roll avoidance (v2.7 / Field Inventory) ──
     Fewer repeat visits from wrong/missing parts: repeat visits avoided
     × fully-loaded cost per truck roll × recovery %.                     */
  const truckRollSav = (v.modelVersion >= 27)
    ? (v.repeatVisitsYr || 0) * (v.costPerTruckRoll || 0) * (v.mFirstFix || 0)
    : 0;

  /* ── 13. Revenue per technician (v2.7 / Field Inventory) ──
     REVENUE GROWTH (not a cost saving): more billable jobs/day when techs
     stop hunting parts. techs × added jobs/day × rev/job × working days
     × realization %. Tracked separately from cost savings for honesty.   */
  const techRevenueSav = (v.modelVersion >= 27)
    ? (v.fieldTechs || 0) * (v.addedJobsPerDay || 0) * (v.revenuePerJob || 0) * (v.workingDaysYr || 0) * (v.mUtilization || 0)
    : 0;

  /* ── 14. Field parts leakage / high-value asset loss (v2.7 / Field Inventory) ──
     Van-stock and field parts lost, walked off, or expired — distinct
     from warehouse shrink. field inventory value × leakage rate × recovery %. */
  const fieldLeakageSav = (v.modelVersion >= 27)
    ? (v.fieldInventoryValue || 0) * (v.fieldLeakagePct || 0) * (v.mLeakage || 0)
    : 0;

  /* Field cost savings (excludes the revenue-growth lever) + revenue growth
     tracked separately so the methodology doc can present them honestly.   */
  const fieldCostSav   = truckRollSav + fieldLeakageSav;
  const fieldRevenueSav = techRevenueSav;
  const fieldLeverSav  = fieldCostSav + fieldRevenueSav;

  /* ── Full annualised benefit (at steady-state, post-ramp) ── */
  const annualBenefit = laborSav + shrinkSav + carrySavCorrected + turnsSav + otifSav + itSav + newLeverSav + wmsLeverSav + fieldLeverSav;

  /* ── Ramp-up & implementation timeline ──
     implMonths: months from contract signing to go-live (0 benefit)
     Post go-live, efficiency ramps: ramp1 (month 1), ramp2 (month 2), ramp3+ (full)
     Year 1 benefit is the sum of partial-month benefits within months 1–12.  */
  const impl = Math.round(v.implMonths || 0);
  const ramp1 = v.ramp1 !== undefined ? v.ramp1 : 0.40;
  const ramp2 = v.ramp2 !== undefined ? v.ramp2 : 0.75;
  const ramp3 = v.ramp3 !== undefined ? v.ramp3 : 1.00;
  const monthlyBenefit = annualBenefit / 12;

  // Build month-by-month benefit for year 1
  let year1Benefit = 0;
  const monthlyProfile = [];
  for (let m = 1; m <= 12; m++) {
    const postGoLive = m - impl;  // months after go-live (negative = still in impl)
    let eff = 0;
    if (postGoLive === 1)      eff = ramp1;
    else if (postGoLive === 2) eff = ramp2;
    else if (postGoLive >= 3)  eff = ramp3;
    const mBenefit = monthlyBenefit * eff;
    year1Benefit += mBenefit;
    monthlyProfile.push({ month: m, postGoLive, eff, benefit: mBenefit });
  }

  // Effective year 1 benefit fraction (for display)
  const year1Factor = annualBenefit > 0 ? year1Benefit / annualBenefit : 0;

  const totalInvestY1 = v.otc + v.invest;
  const netY1   = year1Benefit - totalInvestY1;

  // ROI based on year 1 actual benefit
  const roi = totalInvestY1 > 0 ? (netY1 / totalInvestY1) * 100 : 0;

  // Payback from CONTRACT SIGNING (includes impl months + ramp)
  // Accumulate monthly benefit until cumulative exceeds total investment
  let cumBenefit = 0, paybackFromSigning = null;
  // Year 1 month by month
  for (let m = 1; m <= 12; m++) {
    cumBenefit += monthlyProfile[m-1].benefit;
    if (cumBenefit >= totalInvestY1 && paybackFromSigning === null) {
      paybackFromSigning = m;
    }
  }
  // Year 2+ at full rate if not yet broken even
  if (paybackFromSigning === null) {
    for (let m = 13; m <= 60; m++) {
      cumBenefit += monthlyBenefit * ramp3;
      if (cumBenefit >= totalInvestY1 && paybackFromSigning === null) {
        paybackFromSigning = m;
      }
    }
  }

  // Payback from GO-LIVE (impl months excluded)
  const paybackFromGoLive = paybackFromSigning !== null
    ? Math.max(0, paybackFromSigning - impl)
    : null;

  // NPV — use ramp-adjusted cash flows
  const dr = Math.max(v.discRate, 0.001);
  let npv3 = -v.otc, npv5 = -v.otc;
  const cashflows = [];
  for (let yr = 1; yr <= 5; yr++) {
    // Year 1 uses ramp-adjusted benefit; years 2–5 use full annual benefit
    const yBenefit = yr === 1 ? year1Benefit : annualBenefit;
    const netCF = yBenefit - v.invest;
    const pv    = netCF / Math.pow(1 + dr, yr);
    if (yr <= 3) npv3 += pv;
    npv5 += pv;
    cashflows.push({
      yr,
      benefit: yBenefit,
      invest: v.invest + (yr === 1 ? v.otc : 0),
      net: netCF - (yr === 1 ? v.otc : 0),
      pv, cumPV: 0,
      isRamped: yr === 1 && year1Factor < 0.99
    });
  }
  let cum = -v.otc;
  cashflows.forEach(c => { cum += c.pv; c.cumPV = cum; });

  return {
    laborSav, shrinkSav,
    carrySav: carrySavCorrected, turnsSav, capitalFreed, otifSav, itSav,
    downtimeSav, expediteSav, countSav, newLeverSav,
    throughputSav, accuracySav, wmsLeverSav,
    truckRollSav, techRevenueSav, fieldLeakageSav,
    fieldCostSav, fieldRevenueSav, fieldLeverSav,
    overlapAdj, annualCarryCost,
    annualBenefit, year1Benefit, year1Factor,
    totalInvestY1, netY1, roi,
    paybackFromSigning, paybackFromGoLive,
    payback: paybackFromSigning,  // kept for backward compat
    npv3, npv5,
    totalCost3: v.otc + v.invest*3,
    totalCost5: v.otc + v.invest*5,
    // Ramp-aware undiscounted benefit totals — Year 1 uses year1Benefit,
    // Years 2+ use full annualBenefit. Prevents overstating totals when
    // implementation/ramp reduces Year 1 below steady-state.
    totalBenefit3: year1Benefit + annualBenefit * 2,
    totalBenefit5: year1Benefit + annualBenefit * 4,
    cashflows,
    monthlyProfile, implMonths: impl, ramp1, ramp2, ramp3
  };
}

  return { OVERLAP_DEDUCTION, calcROI };
});
