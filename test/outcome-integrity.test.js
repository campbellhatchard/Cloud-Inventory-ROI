const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scenarios = read('src/routes/scenarios.js');
const closeRoute = read('src/routes/stage-readiness.js');
const authorization = read('src/authorization.js');
const versioning = read('public/versioning.js');
const app = read('public/app.js');
const analytics = read('src/deal-queries.js');

test('legacy group outcome endpoint is terminally retired before any handler mutation', () => {
  const retired = scenarios.match(/router\.put\('\/group\/:baseId\/outcome',[\s\S]*?\}\)\);/);
  assert.ok(retired, 'retired endpoint must remain registered');
  assert.match(retired[0], /status\(410\)/);
  assert.doesNotMatch(retired[0], /query\(|transaction\(|UPDATE|INSERT|DELETE/);
});

test('client has no Phase 1 outcome editor or call to its endpoint', () => {
  for (const retired of ['openOutcomeModal', 'saveOutcomeFromModal', 'saveOutcome(']) {
    assert.equal(versioning.includes(retired), false, `${retired} must stay removed`);
  }
  assert.doesNotMatch(versioning, /\/outcome['"`]/);
  assert.match(versioning, /Close Opportunity/);
  assert.match(versioning, /View Close Details/);
});

test('scenario responses expose governed outcome and explicitly named compatibility metadata', () => {
  assert.match(scenarios, /function presentScenario/);
  assert.match(scenarios, /outcome: governedOutcome \|\| null/);
  assert.match(scenarios, /legacyOutcome:/);
  assert.match(scenarios, /legacyOutcomeReason:/);
  assert.doesNotMatch(app, /buy_cycle_outcome\s*\|\|\s*(?:r\.)?outcome/);
});

test('governed close mirrors compatibility fields across the opportunity group once', () => {
  assert.match(closeRoute, /UPDATE scenarios SET outcome=\$1,outcome_reason=\$2,outcome_at=\$3[\s\S]*WHERE base_id=\$4/);
  assert.match(closeRoute, /compatibilityReason\s*=\s*outcome==='lost'/);
  assert.match(closeRoute, /stageAtLoss\s*=\s*outcome==='lost'/);
  assert.doesNotMatch(closeRoute, /outcome='no_decision'/);
});

test('customer switcher current status is governed with no legacy fallback', () => {
  assert.match(authorization, /g\.outcome outcome,s\.outcome legacy_outcome/);
  assert.match(authorization, /\$9='closed' AND COALESCE\(g\.outcome,''\)<>''/);
  assert.match(authorization, /\$9='active' AND COALESCE\(g\.outcome,''\)=''/);
  assert.doesNotMatch(authorization, /COALESCE\(g\.outcome,s\.outcome\)/);
});

test('realized value is a separate governed-Won-only mutation', () => {
  const handler = scenarios.slice(scenarios.indexOf("router.put('/group/:baseId/realized-value'"), scenarios.indexOf('Batch C'));
  assert.match(handler, /current_stage\)!==7\|\|current\.outcome!=='won'/);
  assert.match(handler, /UPDATE scenarios SET realized_value=\$2/);
  assert.doesNotMatch(handler, /SET outcome=|current_stage\s*=/);
});

test('new versions carry governed close state and compatibility mirrors', () => {
  assert.match(scenarios, /sourceGovernance\?\.outcome\|\|null/);
  assert.match(scenarios, /sourceGovernance\?\.outcome==='won'\?sourceCompatibility\?\.realized_value/);
  assert.match(scenarios, /INSERT INTO scenario_stage_governance[\s\S]*sourceGovernance\.outcome/);
});

test('analytics delegates outcome authority to the R6.2 effective-outcome expression', () => {
  assert.match(analytics, /const EFFECTIVE_OUTCOME_SQL/);
  assert.doesNotMatch(analytics, /COALESCE\(g\.outcome\s*,\s*s\.outcome\)/);
});
