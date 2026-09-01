/* Dependency-free golden-value + version-guard tests for the shared ROI engine.
   Runs on plain Node (no jest/devDeps): `npm run test:engine` or `node test/roi-engine.test.js`. */
const { calcROI, OVERLAP_METHOD } = require('../src/shared/roi-engine');

let _pass = 0, _fail = 0;
function check(name, cond) {
  if (cond) { _pass++; console.log('  \u2713', name); }
  else { _fail++; console.error('  \u2717 FAIL:', name); }
}
const approx = (a, b, tol = 1) => Math.abs(a - b) <= tol;

const BASE = {
  users:60, labor:60000, mLabor:0.25, effectiveShrinkBase:320000, mShrinkage:0.40,
  inventory:14000000, mCarrying:0.18, carryRate:0.25, invTurnsCurrent:4, invTurnsBenchmark:6,
  revenue:75000000, otifBaseline:91, otifTarget:97, mOtif:0.10, otifRisk:0.02,
  itCost:240000, mIt:0.60, discRate:0.10, invest:80000, otc:100000,
  implMonths:3, ramp1:0.4, ramp2:0.75, ramp3:1.0
};

function run() {
  const r = calcROI({ ...BASE, modelVersion:27 });
  check('overlap method is explicit', OVERLAP_METHOD === 'incremental-after-turns');
  check('laborSav = users\u00d7labor\u00d7mLabor', approx(r.laborSav, 60*60000*0.25));
  check('shrinkSav = base\u00d7mShrinkage', approx(r.shrinkSav, 320000*0.40));
  check('carrying + turns count only the higher estimate', approx(
    r.inventoryCarrySav,
    Math.max(14000000*0.25*0.18, 14000000*(1-4/6)*0.25)
  ));
  check('overlap removed equals the smaller estimate', approx(
    r.overlapAdj,
    Math.min(14000000*0.25*0.18, 14000000*(1-4/6)*0.25)
  ));
  check('otifSav uses target-baseline gap', approx(r.otifSav, 75000000*0.06*0.10, 5));
  check('itSav = itCost\u00d7mIt', approx(r.itSav, 240000*0.60));
  check('annualBenefit positive', r.annualBenefit > 0);

  const rw = calcROI({ ...BASE, modelVersion:27, laborWastePct:0.25 });
  check('laborWastePct scales labor', approx(rw.laborSav, 60*60000*0.25*0.25));
  const rwOld = calcROI({ ...BASE, modelVersion:24, laborWastePct:0.25 });
  check('labor waste ignored pre-v25', approx(rwOld.laborSav, 60*60000*0.25));

  const v = { ...BASE, downtimeEventsYr:120, downtimeHrsPerEvent:0.75, downtimeCostPerHr:5000, mDowntime:0.35,
              expediteSpendYr:400000, mExpedite:0.30, countDaysYr:12, countPeople:6, mCount:0.45 };
  const v24 = calcROI({ ...v, modelVersion:24 });
  const v25 = calcROI({ ...v, modelVersion:25 });
  check('v2.5 levers = 0 at v24', v24.newLeverSav === 0);
  check('downtimeSav correct at v25', approx(v25.downtimeSav, 120*0.75*5000*0.35));
  check('expediteSav correct at v25', approx(v25.expediteSav, 400000*0.30));

  const w = { ...BASE, ordersPerYr:250000, costPerOrder:3.5, pickRateGainPct:0.20, mThroughput:0.30,
              orderErrorPct:0.02, costPerError:120, mAccuracy:0.35 };
  const w25 = calcROI({ ...w, modelVersion:25 });
  const w26 = calcROI({ ...w, modelVersion:26 });
  check('WMS levers = 0 at v25', w25.wmsLeverSav === 0);
  check('throughputSav correct at v26', approx(w26.throughputSav, 250000*3.5*0.20*0.30));
  check('accuracySav correct at v26', approx(w26.accuracySav, 250000*0.02*120*0.35));

  const legacy = calcROI({ ...BASE, modelVersion:24 });
  const modern = calcROI({ ...BASE, modelVersion:27 });
  check('no-new-lever inputs identical across versions', approx(legacy.annualBenefit, modern.annualBenefit, 2));

  const z = calcROI({ modelVersion:27 });
  check('empty input safe (benefit >= 0, no NaN)', z.annualBenefit >= 0);

  const longImpl = calcROI({ ...BASE, modelVersion:27, implMonths:18 });
  check('18-month implementation has no year-1 benefit', longImpl.year1Benefit === 0);
  check('18-month implementation cannot pay back before go-live',
    longImpl.paybackFromSigning === null || longImpl.paybackFromSigning >= 19);
  check('year 2 retains post-go-live ramp', approx(
    longImpl.yearBenefits[1],
    longImpl.annualBenefit * (0.40 + 0.75 + 4) / 12
  ));

  const fieldZero = calcROI({ modelVersion:27, hasFieldInventory:true,
    fieldInvValue:1000000, fieldLeakageRate:4, mFieldLeakage:0,
    carryRate:0, mCarrying:0.2, fieldLocations:10,
    fieldReconcileCost:500, fieldReconcilePerYr:0, mFieldCount:0.5 });
  check('explicit zero field assumptions produce zero field benefit', fieldZero.fieldInvSav === 0);

  const bounded = calcROI({ ...BASE, modelVersion:27, mLabor:5, mOtif:3,
    carryRate:2, otifBaseline:120, otifTarget:150 });
  check('fraction assumptions are capped at 100%', approx(bounded.laborSav, BASE.users*BASE.labor));
  check('percentage-point inputs are capped at 100', bounded.otifSav === 0);

  const falseString = calcROI({ modelVersion:27, hasFieldInventory:'false',
    fieldInvValue:1000000, fieldLeakageRate:4, mFieldLeakage:0.3 });
  check('string false does not enable field inventory', falseString.fieldInvSav === 0);

  const zeroDiscount = calcROI({ ...BASE, modelVersion:27, discRate:0 });
  check('zero discount rate stays zero', approx(
    zeroDiscount.npv3,
    zeroDiscount.totalBenefit3 - zeroDiscount.totalCost3
  ));

  const c36 = calcROI({ ...BASE, modelVersion:27, contractMonths:36 });
  check('36-month term creates three annual and cumulative periods', c36.contractYears.length === 3);
  check('contract benefit equals sum of displayed annual benefits', approx(c36.totalContractBenefit,
    c36.contractYears.reduce((sum, y) => sum + y.grossBenefit, 0)));
  check('contract investment equals one-time plus three annual subscriptions', approx(c36.totalContractInvestment, BASE.otc + BASE.invest * 3));
  check('total contract ROI follows net divided by investment', approx(c36.totalContractRoi,
    c36.totalContractNetBenefit / c36.totalContractInvestment * 100));

  const c18 = calcROI({ ...BASE, modelVersion:27, contractMonths:18 });
  check('18-month term creates a six-month partial second year', c18.contractYears.length === 2 && c18.contractYears[1].months === 6);
  check('partial-year recurring investment is prorated to six months', approx(c18.contractYears[1].investment, BASE.invest / 2));
  check('partial-year benefit uses only months 13 through 18', approx(c18.contractYears[1].grossBenefit,
    c18.monthlyProfile.slice(12,18).reduce((sum,m)=>sum+m.benefit,0)));
  check('payback is either within selected contract or explicitly absent', c18.contractPayback === null || c18.contractPayback <= 18);
  check('blank contract term defaults to 36 months', calcROI({ ...BASE, modelVersion:28, contractMonths:'' }).contractMonths === 36);
  check('zero contract term clamps to 1 month rather than silently becoming 36', calcROI({ ...BASE, modelVersion:28, contractMonths:0 }).contractMonths === 1);
  check('contract term caps at 60 months', calcROI({ ...BASE, modelVersion:28, contractMonths:999 }).contractMonths === 60);
  return { pass:_pass, fail:_fail };
}
console.log('ROI engine tests:');
const { pass, fail } = run();
console.log(`\n${fail === 0 ? '\ud83d\udfe2' : '\ud83d\udd34'} ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
