/* ═══════════════════════════════════════════════════════════════════
   roi-engine.js — SHARED ROI calculation engine (browser + Node)

   Single source of truth for the ROI math. Loaded by the browser
   (public/app.js) AND required by the server (scenario save) so the
   figures stored server-side are authoritative and can never drift
   from a stale or buggy client.

   This module is PURE: calcROI(v) depends only on its input object and
   its documented overlap policy. It performs no DOM access — getVals() (DOM-coupled)
   stays in app.js and calls this.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();            // Node / CommonJS (server + tests)
  } else {
    const api = factory();                 // Browser global
    root.OVERLAP_METHOD = api.OVERLAP_METHOD;
    root.calcROI = api.calcROI;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const OVERLAP_METHOD = 'incremental-after-turns';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
      'pickRateGainPct','mThroughput','orderErrorPct','costPerError','mAccuracy',
      'fieldInvValue','fieldLeakageRate','mFieldLeakage',
      'fieldLocations','fieldReconcileCost','fieldReconcilePerYr','mFieldCount','currentAccuracy'];
    const _v = Object.assign({}, v);
    for (const k of _num) { const n = parseFloat(_v[k]); _v[k] = (isNaN(n) || n < 0) ? 0 : n; }
    const fractionFields = ['mLabor','mShrinkage','mCarrying','carryRate','mOtif','otifRisk','mIt',
      'discRate','laborWastePct','mDowntime','mExpedite','mCount','pickRateGainPct','mThroughput',
      'orderErrorPct','mAccuracy','mFieldLeakage','mFieldCount'];
    for (const k of fractionFields) _v[k] = clamp(_v[k], 0, 1);
    for (const k of ['otifBaseline','otifTarget','fieldLeakageRate','currentAccuracy']) {
      _v[k] = clamp(_v[k], 0, 100);
    }
    _v.implMonths = clamp(_v.implMonths, 0, 60);
    const parsedContractMonths = parseInt(v.contractMonths, 10);
    _v.contractMonths = Number.isFinite(parsedContractMonths) ? clamp(parsedContractMonths, 1, 60) : 36;
    const ramp = (value, fallback) => {
      if (value === undefined || value === null || value === '') return fallback;
      const n = parseFloat(value);
      return Number.isFinite(n) ? clamp(n, 0, 1) : fallback;
    };
    _v.ramp1 = ramp(v.ramp1, 0.40);
    _v.ramp2 = ramp(v.ramp2, 0.75);
    _v.ramp3 = ramp(v.ramp3, 1.00);
    /* Accept only explicit boolean-like values. The string "false" must not become true. */
    _v.hasFieldInventory = v.hasFieldInventory === true || v.hasFieldInventory === 1
      || String(v.hasFieldInventory).toLowerCase() === 'true';
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

  /* ── 3–4. Inventory carrying cost and turns ──
     Both approaches estimate carrying-cost savings on the same inventory
     pool. Count the turns-based estimate first, then include only any
     incremental carrying-cost estimate above it. This makes the combined
     benefit equal to the higher estimate instead of adding overlapping
     estimates or relying on an arbitrary fixed deduction.              */
  const annualCarryCost   = v.inventory * v.carryRate;
  const carrySavGross     = annualCarryCost * v.mCarrying;

  let capitalFreed = 0, turnsSav = 0;
  if (v.invTurnsCurrent > 0 && v.invTurnsBenchmark > 0 && v.invTurnsCurrent < v.invTurnsBenchmark) {
    capitalFreed = v.inventory * (1 - v.invTurnsCurrent / v.invTurnsBenchmark);
    turnsSav     = capitalFreed * v.carryRate;
  }
  const carrySav = Math.max(0, carrySavGross - turnsSav);
  const inventoryCarrySav = carrySav + turnsSav;
  const overlapAdj = Math.min(carrySavGross, turnsSav);
  /* ── 5. OTIF savings ── */
  let otifSav = 0;
  if (v.otifBaseline > 0 && v.otifTarget > 0 && v.otifTarget > v.otifBaseline) {
    /* Both entered and target > baseline: use the gap */
    const otifGapPp = (v.otifTarget - v.otifBaseline) / 100;
    otifSav = v.revenue * otifGapPp * v.mOtif;
  } else if (!v.otifBaseline && !v.otifTarget) {
    /* Neither entered: use the industry-risk fallback so there is still
       some OTIF value in the model when the rep hasn't filled these in. */
    otifSav = v.revenue * v.otifRisk * v.mOtif;
  }
  /* All other cases (inverted, partial entry) → 0.
     If baseline >= target, there is no improvement to quantify. */

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

  /* ── Field inventory levers (opt-in; only when hasFieldInventory=true) ──
     Three distinct value drivers for stock held outside a fixed warehouse:

     1. Leakage / shrinkage — materials lost, misappropriated, or unaccounted
        at contractor sites, job locations, or van/truck stock. Same pattern
        as warehouse shrinkage but applied to field inventory value × leakage
        rate × recovery %.

     2. Carrying cost on excess field stock — buffer stock held at distributed
        locations because records are not trusted. fieldInventoryValue ×
        carryRate × (1 - invTurnsBenchmark/fieldTurns) × recovery %.
        Simplified: we apply the standard carryRate to the field inventory
        value × the same mCarrying recovery %.

     3. Count / reconciliation labor — periodic manual counting at remote
        sites. locations × costPerReconcile × reconciliationsPerYr.           */
  const fiLeakageSav = (v.hasFieldInventory && v.fieldInvValue && v.fieldLeakageRate)
    ? (v.fieldInvValue * (v.fieldLeakageRate / 100)) * v.mFieldLeakage
    : 0;
  const fiCarrySav = (v.hasFieldInventory && v.fieldInvValue)
    ? v.fieldInvValue * v.carryRate * v.mCarrying
    : 0;
  const fiCountSav = (v.hasFieldInventory && v.fieldLocations && v.fieldReconcileCost)
    ? v.fieldLocations * v.fieldReconcileCost * v.fieldReconcilePerYr * v.mFieldCount
    : 0;
  const fieldInvSav = fiLeakageSav + fiCarrySav + fiCountSav;

  const annualBenefit = laborSav + shrinkSav + inventoryCarrySav + otifSav + itSav + newLeverSav + wmsLeverSav + fieldInvSav;

  /* ── Ramp-up & implementation timeline ──
     implMonths: months from contract signing to go-live (0 benefit)
     Post go-live, efficiency ramps: ramp1 (month 1), ramp2 (month 2), ramp3+ (full)
     Year 1 benefit is the sum of partial-month benefits within months 1–12.  */
  const impl = Math.round(v.implMonths || 0);
  const ramp1 = v.ramp1;
  const ramp2 = v.ramp2;
  const ramp3 = v.ramp3;
  const monthlyBenefit = annualBenefit / 12;

  // Build one continuous five-year profile so implementation and ramp behavior
  // remain correct when either extends beyond the first calendar year.
  const monthlyProfile = [];
  for (let m = 1; m <= 60; m++) {
    const postGoLive = m - impl;  // months after go-live (negative = still in impl)
    let eff = 0;
    if (postGoLive === 1)      eff = ramp1;
    else if (postGoLive === 2) eff = ramp2;
    else if (postGoLive >= 3)  eff = ramp3;
    const mBenefit = monthlyBenefit * eff;
    monthlyProfile.push({ month: m, postGoLive, eff, benefit: mBenefit });
  }
  const yearBenefits = Array.from({ length: 5 }, (_, yearIndex) =>
    monthlyProfile.slice(yearIndex * 12, yearIndex * 12 + 12)
      .reduce((sum, month) => sum + month.benefit, 0)
  );
  const year1Benefit = yearBenefits[0];

  // Effective year 1 benefit fraction (for display)
  const year1Factor = annualBenefit > 0 ? year1Benefit / annualBenefit : 0;

  const totalInvestY1 = v.otc + v.invest;
  const netY1   = year1Benefit - totalInvestY1;

  /* When invest + otc = 0, ROI and payback are undefined (not zero).
     Return null so the UI can show "N/A" rather than misleading 0% / 1 month.
     Note: invest is already clamped to ≥ 0 in the sanitisation step above,
     so a negative entry from the calculator also reaches this branch. */
  const roi = totalInvestY1 > 0 ? (netY1 / totalInvestY1) * 100 : null;

  // Payback from CONTRACT SIGNING (includes impl months + ramp)
  // When there is no investment, payback is undefined — return null.
  let cumulativeCash = -v.otc, paybackFromSigning = null;
  if (totalInvestY1 > 0) {
    for (let m = 1; m <= 60; m++) {
      // Treat the annual subscription as paid at the start of each service year.
      if ((m - 1) % 12 === 0) cumulativeCash -= v.invest;
      cumulativeCash += monthlyProfile[m - 1].benefit;
      if (cumulativeCash >= 0 && paybackFromSigning === null) {
        paybackFromSigning = m;
      }
    }
  }

  // Payback from GO-LIVE (impl months excluded)
  const paybackFromGoLive = paybackFromSigning !== null
    ? Math.max(0, paybackFromSigning - impl)
    : null;

  // NPV — use ramp-adjusted cash flows
  const dr = v.discRate;
  let npv3 = -v.otc, npv5 = -v.otc;
  const cashflows = [];
  for (let yr = 1; yr <= 5; yr++) {
    const yBenefit = yearBenefits[yr - 1];
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
      isRamped: yBenefit < annualBenefit * 0.99
    });
  }
  let cum = -v.otc;
  cashflows.forEach(c => { cum += c.pv; c.cumPV = cum; });

  /* Contract-term economics — the authoritative customer-facing view.
     Annual subscription is attributed evenly by month so partial contract
     years contain only their actual months of recurring investment. */
  const contractMonths = v.contractMonths;
  const contractYearCount = Math.ceil(contractMonths / 12);
  const monthlyRecurring = v.invest / 12;
  let contractCumBenefit = 0, contractCumInvestment = 0, contractPayback = null;
  let contractNpv = 0;
  const monthlyDiscount = Math.pow(1 + dr, 1 / 12) - 1;
  const contractYears = [];
  for (let year = 1; year <= contractYearCount; year++) {
    const start = (year - 1) * 12;
    const end = Math.min(year * 12, contractMonths);
    const months = end - start;
    const grossBenefit = monthlyProfile.slice(start, end).reduce((sum, month) => sum + month.benefit, 0);
    const investment = monthlyRecurring * months + (year === 1 ? v.otc : 0);
    const netBenefit = grossBenefit - investment;
    contractCumBenefit += grossBenefit;
    contractCumInvestment += investment;
    const cumulativeNetBenefit = contractCumBenefit - contractCumInvestment;
    contractYears.push({
      year, months, startMonth: start + 1, endMonth: end,
      grossBenefit, investment, netBenefit,
      annualRoi: investment > 0 ? (netBenefit / investment) * 100 : null,
      cumulativeBenefit: contractCumBenefit,
      cumulativeInvestment: contractCumInvestment,
      cumulativeNetBenefit,
      cumulativeRoi: contractCumInvestment > 0 ? (cumulativeNetBenefit / contractCumInvestment) * 100 : null,
      paybackStatus: ''
    });
  }
  let runningBenefit = 0, runningInvestment = v.otc;
  contractNpv = -v.otc;
  for (let month = 1; month <= contractMonths; month++) {
    const mBenefit = monthlyProfile[month - 1] ? monthlyProfile[month - 1].benefit : 0;
    runningBenefit += mBenefit;
    runningInvestment += monthlyRecurring;
    contractNpv += (mBenefit - monthlyRecurring) / Math.pow(1 + monthlyDiscount, month);
    if (contractPayback === null && runningBenefit >= runningInvestment) {
      const prevBenefit = runningBenefit - mBenefit;
      const prevInvestment = runningInvestment - monthlyRecurring;
      const prevGap = prevInvestment - prevBenefit;
      const monthlyGain = mBenefit - monthlyRecurring;
      contractPayback = monthlyGain > 0 ? Math.max(0, month - 1 + prevGap / monthlyGain) : month;
    }
  }
  contractYears.forEach(row => {
    if (contractPayback === null || contractPayback > contractMonths) row.paybackStatus = 'Payback not achieved during contract term';
    else if (contractPayback > row.endMonth) row.paybackStatus = 'Payback not yet achieved';
    else if (contractPayback >= row.startMonth - 1) row.paybackStatus = 'Payback achieved in Month ' + contractPayback.toFixed(1);
    else row.paybackStatus = 'Investment already recovered';
  });
  const totalContractBenefit = contractCumBenefit;
  const totalContractInvestment = contractCumInvestment;
  const totalContractNetBenefit = totalContractBenefit - totalContractInvestment;
  const totalContractRoi = totalContractInvestment > 0 ? (totalContractNetBenefit / totalContractInvestment) * 100 : null;

  return {
    laborSav, shrinkSav,
    carrySav, carrySavGross, turnsSav, inventoryCarrySav, capitalFreed, otifSav, itSav,
    downtimeSav, expediteSav, countSav, newLeverSav,
    throughputSav, accuracySav, wmsLeverSav,
    fiLeakageSav, fiCarrySav, fiCountSav, fieldInvSav,
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
    totalBenefit3: yearBenefits.slice(0, 3).reduce((sum, value) => sum + value, 0),
    totalBenefit5: yearBenefits.reduce((sum, value) => sum + value, 0),
    yearBenefits,
    cashflows,
    monthlyProfile, implMonths: impl, ramp1, ramp2, ramp3,
    contractMonths, contractYearCount, contractYears,
    totalContractBenefit, totalContractInvestment, totalContractNetBenefit,
    totalContractRoi, totalContractNpv: contractNpv,
    contractPayback: contractPayback !== null && contractPayback <= contractMonths ? contractPayback : null
  };
}

  return { OVERLAP_METHOD, calcROI };
});
