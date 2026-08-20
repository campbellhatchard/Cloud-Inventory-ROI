/* Dependency-free golden-value + version-guard tests for the shared ROI engine.
   Runs on plain Node (no jest/devDeps): `npm run test:engine` or `node test/roi-engine.test.js`. */
const { calcROI, OVERLAP_DEDUCTION } = require('../src/shared/roi-engine');

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
  check('OVERLAP_DEDUCTION is 0.15', OVERLAP_DEDUCTION === 0.15);
  check('laborSav = users\u00d7labor\u00d7mLabor', approx(r.laborSav, 60*60000*0.25));
  check('shrinkSav = base\u00d7mShrinkage', approx(r.shrinkSav, 320000*0.40));
  check('carrySav applies 15% overlap', approx(r.carrySav, 14000000*0.25*0.18*0.85));
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
  return { pass:_pass, fail:_fail };
}
console.log('ROI engine tests:');
const { pass, fail } = run();
console.log(`\n${fail === 0 ? '\ud83d\udfe2' : '\ud83d\udd34'} ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
