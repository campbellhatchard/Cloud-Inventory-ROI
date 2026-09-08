const test = require('node:test');
const assert = require('node:assert/strict');
const { EFFECTIVE_OUTCOME_SQL, QUERY_CATALOG, VALID_QUERY_NAMES } = require('../src/deal-queries');

function effectiveOutcome({ governanceExists, governedOutcome = null, legacyOutcome = null }) {
  return governanceExists ? governedOutcome : legacyOutcome;
}

test('effective outcome truth table makes governance-row presence authoritative', () => {
  assert.equal(effectiveOutcome({ governanceExists: true, governedOutcome: null, legacyOutcome: 'won' }), null,
    'active governed opportunity must not resurrect legacy Won');
  assert.equal(effectiveOutcome({ governanceExists: true, governedOutcome: 'lost', legacyOutcome: 'won' }), 'lost');
  assert.equal(effectiveOutcome({ governanceExists: true, governedOutcome: 'won', legacyOutcome: 'lost' }), 'won');
  assert.equal(effectiveOutcome({ governanceExists: false, legacyOutcome: 'won' }), 'won');
  assert.equal(effectiveOutcome({ governanceExists: false, legacyOutcome: 'lost' }), 'lost');
  assert.equal(effectiveOutcome({ governanceExists: false, legacyOutcome: 'no_decision' }), 'no_decision');
});

test('governed active legacy-Won fixture is excluded from decided population', () => {
  const deals = [
    { governanceExists: true, governedOutcome: 'won', legacyOutcome: 'won' },
    { governanceExists: true, governedOutcome: 'lost', legacyOutcome: 'lost' },
    { governanceExists: true, governedOutcome: null, legacyOutcome: 'won' }
  ];
  const outcomes = deals.map(effectiveOutcome).filter(value => value === 'won' || value === 'lost');
  const won = outcomes.filter(value => value === 'won').length;
  const lost = outcomes.filter(value => value === 'lost').length;
  assert.deepEqual({ won, lost, decided: outcomes.length, winRate: 100 * won / outcomes.length },
    { won: 1, lost: 1, decided: 2, winRate: 50 });
});

test('SQL distinguishes missing governance from a governed null outcome', () => {
  assert.match(EFFECTIVE_OUTCOME_SQL, /WHEN g\.scenario_id IS NOT NULL THEN g\.outcome/);
  assert.match(EFFECTIVE_OUTCOME_SQL, /ELSE s\.outcome/);
  assert.doesNotMatch(EFFECTIVE_OUTCOME_SQL, /COALESCE/i);
});

test('all opportunity outcome analytics use the shared authority expression', () => {
  const names = ['win_rate_by_rep', 'win_rate_by_industry', 'provenance_vs_outcome', 'stakeholder_coverage_vs_outcome'];
  for (const name of names) {
    const sql = QUERY_CATALOG[name].sql;
    assert.match(sql, /WHEN g\.scenario_id IS NOT NULL THEN g\.outcome[\s\S]*ELSE s\.outcome/,
      `${name} must use governed-first historical fallback`);
    assert.doesNotMatch(sql, /COALESCE\(g\.outcome\s*,\s*s\.outcome\)/);
  }
});

test('closed-deal populations exclude active governed legacy outcomes', () => {
  for (const name of ['provenance_vs_outcome', 'stakeholder_coverage_vs_outcome']) {
    assert.match(QUERY_CATALOG[name].sql, /CASE[\s\S]*WHEN g\.scenario_id IS NOT NULL THEN g\.outcome[\s\S]*IN \('won','lost'\)/);
  }
});

test('open-deal stage catalog applies the same authority without changing fixed-query security', () => {
  assert.match(QUERY_CATALOG.deal_stage_breakdown.sql, /WHEN g\.scenario_id IS NOT NULL THEN g\.outcome[\s\S]*IS NULL/);
  assert.deepEqual(VALID_QUERY_NAMES, Object.keys(QUERY_CATALOG));
});
