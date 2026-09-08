const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('protected server routes initialize requireAuth once and before use', () => {
  const server = read('server.js');
  const decl = "const { requireAuth, hasRole } = require('./src/middleware/auth');";
  assert.equal((server.match(new RegExp(decl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1);
  assert.equal(server.includes('_reqAuthCompanies'), false);
  const pos = server.indexOf(decl);
  assert.ok(pos >= 0);
  for (const m of server.matchAll(/app\.(?:get|post|put|patch|delete)\([^\r\n]*requireAuth/g)) {
    assert.ok(m.index > pos, 'protected route appeared before requireAuth initialization');
  }
});

test('retired print cannot recalculate ROI; active output helpers preserve zero ramps and field inventory property names', () => {
  const print = read('public/print.html');
  const deal = read('public/deal-export.js');
  const info = read('public/exec-infographics.js');
  assert.match(print, /output format has been retired/i);
  assert.doesNotMatch(print, /calcROI|roi-engine|#data|normalizeRamp|healRamp/);
  assert.match(deal, /v\.ramp1 \?\? 0\.4/);
  assert.doesNotMatch(deal, /v\.ramp1\|\|0\.4/);
  assert.match(info, /fieldInvSav/);
  assert.doesNotMatch(info, /fieldLeverSav/);
});

test('turns savings are not mislabeled as balance-sheet working capital on active or retired output paths', () => {
  const print = read('public/print.html');
  const deal = read('public/deal-export.js');
  assert.doesNotMatch(print, /Turns \(capital\)|Working capital \(inventory turns\)/i);
  assert.doesNotMatch(deal, /Working capital \(inventory turns\)/i);
  assert.doesNotMatch(deal, /Turns \(capital\)/i);
});

test('Medical Devices / Life Sciences remains customer-input-only', () => {
  const prospect = read('public/prospect.html');
  const provenance = read('public/benchmark-provenance.js');
  assert.match(prospect, /retail:\s*\{\s*revenue:0,\s*users:0,\s*labor:0,\s*inventory:0/);
  assert.match(provenance, /Customer inputs required\./);
  assert.match(provenance, /no bundled benchmark values in v6\.9\.1/);
  assert.doesNotMatch(prospect, /retail:\s*\{\s*revenue:60e6/);
});

test('contract-term boundaries preserve blank default, explicit zero clamp, and 60-month cap', () => {
  const { calcROI } = require('../src/shared/roi-engine');
  const base = { modelVersion:28, users:1, labor:1, mLabor:0.1, invest:1, otc:1 };
  assert.equal(calcROI({ ...base, contractMonths:'' }).contractMonths, 36);
  assert.equal(calcROI({ ...base, contractMonths:0 }).contractMonths, 1);
  assert.equal(calcROI({ ...base, contractMonths:999 }).contractMonths, 60);
});

test('server remains authoritative for contract-term scenario metrics', () => {
  const routes = read('src/routes/scenarios.js');
  for (const key of [
    'contractMonths:          r.contractMonths',
    'totalContractBenefit:    r.totalContractBenefit',
    'totalContractInvestment: r.totalContractInvestment',
    'totalContractNetBenefit: r.totalContractNetBenefit',
    'totalContractRoi:        r.totalContractRoi',
    'totalContractNpv:        r.totalContractNpv',
    'contractPayback:         r.contractPayback'
  ]) assert.ok(routes.includes(key), `missing authoritative metric ${key}`);
});

test('published business cases are frozen, customer-safe, and never follow a later scenario version', () => {
  const server = read('server.js');
  const route = read('src/routes/business-case-shares.js');
  const migration = read('migrations/035_published_business_cases.sql');
  assert.match(server, /app\.use\('\/api\/business-case-shares', require\('\.\/src\/routes\/business-case-shares'\)\)/);
  assert.match(route, /published_payload/);
  assert.match(route, /status\(410\)/);
  assert.doesNotMatch(route, /JOIN scenarios|is_current|\bs\.data\b/);
  assert.match(migration, /Published business case content is immutable/);
  assert.match(migration, /CREATE TRIGGER immutable_business_case_publication/);
});

test('Prospect AI message history is role-normalized and bounded', () => {
  const server = read('server.js');
  assert.match(server, /const safeMessages = messages\.slice\(-8\)\.map/);
  assert.match(server, /role: m && m\.role === 'assistant' \? 'assistant' : 'user'/);
  assert.match(server, /\.slice\(0, 2000\)/);
  assert.match(server, /messages: safeMessages/);
});

test('Three Whys AI uses authenticated transport and exposes final-save hook', () => {
  const narrative = read('public/narrative.js');
  assert.match(narrative, /apiFetch\('\/api\/enhance'/);
  assert.doesNotMatch(narrative, /fetch\('\/api\/enhance'/);
  assert.match(narrative, /window\.persistThreeWhys = persistThreeWhys/);
});

test('v5.7 product and scenario integrity controls survive the v6 major release', () => {
  const app = read('public/app.js');
  const start = app.indexOf('function applySolutionEmphasis()');
  const end = app.indexOf('function clearForm()', start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(app.slice(start, end), /\brecalc\s*\(/);
  assert.match(app, /await loadFieldInventoryFlag\(cid\)/);
  assert.match(app, /window\._calcScenarioId = saved\.id/);
});

test('bootstrap documentation matches startup behavior and migration count', () => {
  const readme = read('README.md');
  assert.match(readme, /001–035/);
  assert.doesNotMatch(readme, /Migration 003 re-seeds/);
  assert.match(readme, /preserves the user-managed password/);
});

test('migrations 025-035 are transaction-protected and do not destructively delete business data', () => {
  const migrate = read('src/migrate.js');
  assert.match(migrate, /await client\.query\('BEGIN'\)/);
  assert.match(migrate, /await client\.query\('ROLLBACK'\)/);
  assert.match(migrate, /await client\.query\('COMMIT'\)/);
  for (let n = 25; n <= 35; n++) {
    const prefix = String(n).padStart(3, '0') + '_';
    const name = fs.readdirSync(path.join(ROOT, 'migrations')).find(x => x.startsWith(prefix));
    assert.ok(name, `missing migration ${prefix}`);
    const sql = read('migrations/' + name);
    assert.doesNotMatch(sql, /^\s*(DROP\s+TABLE|TRUNCATE|ALTER\s+TABLE[^;\n]*DROP\s+COLUMN)\b/im);
    if (n !== 26) assert.doesNotMatch(sql, /^\s*DELETE\s+FROM\b/im);
  }
  const m26 = read('migrations/026_buycycle_stages_2_7.sql');
  const deletes = [...m26.matchAll(/^\s*DELETE\s+FROM\s+([a-zA-Z0-9_]+)/gim)].map(m => m[1]);
  assert.deepEqual(deletes, ['buycycle_stage_config']);
  const m35 = read('migrations/035_published_business_cases.sql');
  assert.match(m35, /ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS published_payload JSONB/);
  assert.match(m35, /CREATE TRIGGER immutable_business_case_publication/);
  assert.doesNotMatch(m35, /^\s*(DROP\s+TABLE|TRUNCATE|ALTER\s+TABLE[^;\n]*DROP\s+COLUMN|DELETE\s+FROM)\b/im);
});

test('CI executes both legacy production locks and the complete v6 suite', () => {
  const ci = read('.github/workflows/ci.yml');
  const pkg = JSON.parse(read('package.json'));
  assert.match(ci, /UI and startup regression tests/);
  assert.match(ci, /production-regression-locks\.test\.js/);
  assert.match(ci, /npm test/);
  assert.match(pkg.scripts.test, /v681-ai-context-help-email\.test\.js/);
  assert.match(pkg.scripts.test, /v682-runtime-completion\.test\.js/);
  assert.match(pkg.scripts.test, /production-regression-locks\.test\.js/);
  assert.match(pkg.scripts.test, /release-integrity\.test\.js/);
  assert.match(pkg.scripts['test:production-locks'], /production-regression-locks\.test\.js/);
});

test('v6.9.1 keeps ROI Model v2.8 and brand/application-knowledge/persona locks', () => {
  const release = read('RELEASE_VALIDATION_V6.8.2.md');
  const v680 = read('RELEASE_VALIDATION_V6.8.0.md');
  assert.match(v680, /ROI Model: \*\*v2\.8 \/ modelVersion 28\*\*, unchanged/);
  assert.match(release, /Business Case/);
  assert.match(read('public/version-history.js'), /version: '6\.8\.4'/);
});
