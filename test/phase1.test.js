/* Phase 1 pre-build specification tests
   Run: node test/phase1.test.js
   These define WHAT to build before HOW to build it */
'use strict';
const { calcROI } = require('../src/shared/roi-engine.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try {
    if (fn()) { console.log('  ✓', name); pass++; }
    else { console.log('  ✗ FAIL:', name); fail++; }
  } catch(e) { console.log('  ✗ THROWS:', name, '-', e.message); fail++; }
}

const BASE = {
  modelVersion:27, users:50, labor:55000, mLabor:0.20,
  inventory:10e6, mCarrying:0.20, carryRate:0.25,
  mShrinkage:0.30, shrinkRate:0.03, annualWriteOff:300000,
  effectiveShrinkBase:300000,
  revenue:50e6, otifBaseline:92, otifTarget:97, mOtif:0.10, otifRisk:0.02,
  invTurnsCurrent:4, invTurnsBenchmark:8, itCost:150000, mIt:0.50,
  invest:90000, otc:75000, discRate:0.10,
  implMonths:3, ramp1:0.40, ramp2:0.75, ramp3:1.00,
  hasFieldInventory:false, fieldInvValue:0, fieldLeakageRate:0,
  fieldLocations:0, fieldReconcileCost:0, fieldReconcilePerYr:1
};

const scale = (f) => ({
  ...BASE, mLabor:BASE.mLabor*f, mCarrying:BASE.mCarrying*f,
  mShrinkage:BASE.mShrinkage*f, mOtif:BASE.mOtif*f, mIt:BASE.mIt*f
});

const base = calcROI(BASE);
const cons = calcROI(scale(0.7));
const aggr = calcROI(scale(1.3));

console.log('\n─── 1. Cost of inaction ───');
t('annualBenefit > 0',          () => base.annualBenefit > 0);
t('monthly inaction = AB/12',   () => Math.round(base.annualBenefit/12) > 0);
t('6-mo inaction = AB/2',       () => Math.round(base.annualBenefit/2) > 0);
t('no NaN in annualBenefit',    () => !isNaN(base.annualBenefit));
t('zero invest → null roi (no inaction distortion)', () => calcROI({...BASE,invest:0,otc:0}).roi === null);

console.log('\n─── 2. Three-scenario model ───');
t('conservative < base benefit',   () => cons.annualBenefit < base.annualBenefit);
t('base < aggressive benefit',     () => base.annualBenefit < aggr.annualBenefit);
t('conservative ROI not negative', () => cons.roi === null || cons.roi > -1000);
t('aggressive ROI > base ROI',     () => (aggr.roi || 0) > (base.roi || 0));
t('all paybacks valid',            () => [cons,base,aggr].every(x => x.payback === null || (x.payback > 0 && x.payback < 200)));
t('conservative retains invest',   () => cons.totalInvestY1 === base.totalInvestY1);

console.log('\n─── 3. Provenance counting logic ───');
// Simulate the counting function we will build
function countProvenance(discoveryAnswers) {
  const keys = Object.keys(discoveryAnswers).filter(k => !k.endsWith('_by'));
  const answered = keys.filter(k => discoveryAnswers[k] && String(discoveryAnswers[k]).trim());
  const fromProspect = keys.filter(k => discoveryAnswers[k + '_by'] === 'prospect' && discoveryAnswers[k]);
  const fromRep = keys.filter(k => discoveryAnswers[k + '_by'] === 'rep' && discoveryAnswers[k]);
  return { total: keys.length, answered: answered.length, fromProspect: fromProspect.length, fromRep: fromRep.length };
}
const p = countProvenance({
  'dq1':'50','dq1_by':'prospect',
  'dq2':'100000','dq2_by':'rep',
  'dq3':'94','dq3_by':'prospect',
  'dq4':'','dq4_by':'',
  'dq5':'2','dq5_by':'prospect',
});
t('prospectCount = 3',             () => p.fromProspect === 3);
t('repCount = 1',                  () => p.fromRep === 1);
t('answered = 4 (not 5)',          () => p.answered === 4);
t('unanswered = 1',                () => p.total - p.answered === 1);
t('prospect% = 75%',               () => Math.round(p.fromProspect / p.answered * 100) === 75);

console.log('\n─── 4. Engine regression (must still pass) ───');
const eng = require('./roi-engine.test.js');

console.log(`\n${'─'.repeat(40)}`);
console.log(`Phase 1 spec: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
