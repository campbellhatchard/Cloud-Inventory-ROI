'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const cleanup = require('../src/shared/admin-cleanup');

test('custom calendar range is a deterministic UTC half-open interval', () => {
  const filters = cleanup.normalizeFilters({ dateBasis: 'created', quickRange: 'custom', dateFrom: '2026-09-01', dateThrough: '2026-09-30' });
  assert.equal(filters.dateFrom, '2026-09-01T00:00:00.000Z');
  assert.equal(filters.dateUntil, '2026-10-01T00:00:00.000Z');
  assert.equal(filters.timezone, 'UTC');
});

test('quick date filters include full UTC calendar dates across month, year and DST boundaries', () => {
  const now = new Date('2026-11-01T06:30:00.000Z');
  const today = cleanup.normalizeFilters({ quickRange: 'today' }, { now });
  const last7 = cleanup.normalizeFilters({ quickRange: 'last7' }, { now });
  const last30 = cleanup.normalizeFilters({ quickRange: 'last30' }, { now });
  const last90 = cleanup.normalizeFilters({ quickRange: 'last90' }, { now });
  const older = cleanup.normalizeFilters({ quickRange: 'older90' }, { now });
  assert.deepEqual([today.dateFrom,today.dateUntil], ['2026-11-01T00:00:00.000Z','2026-11-02T00:00:00.000Z']);
  assert.deepEqual([last7.dateFrom,last7.dateUntil], ['2026-10-26T00:00:00.000Z','2026-11-02T00:00:00.000Z']);
  assert.deepEqual([last30.dateFrom,last30.dateUntil], ['2026-10-03T00:00:00.000Z','2026-11-02T00:00:00.000Z']);
  assert.deepEqual([last90.dateFrom,last90.dateUntil], ['2026-08-04T00:00:00.000Z','2026-11-02T00:00:00.000Z']);
  assert.deepEqual([older.dateFrom,older.dateUntil], [null,'2026-08-03T00:00:00.000Z']);
});

test('open-ended dates are supported and invalid dates/ranges fail closed', () => {
  const from = cleanup.normalizeFilters({ quickRange:'custom', dateFrom:'2026-12-31' });
  const through = cleanup.normalizeFilters({ quickRange:'custom', dateThrough:'2027-01-01' });
  assert.equal(from.dateUntil, null);
  assert.equal(through.dateFrom, null);
  assert.throws(() => cleanup.normalizeFilters({ quickRange:'custom',dateFrom:'2026-10-03',dateThrough:'2026-10-02' }), error => error.code === 'INVALID_DATE_RANGE');
  assert.throws(() => cleanup.normalizeFilters({ quickRange:'custom',dateFrom:'2026-02-30' }), /valid calendar date/);
});

test('owner, creator, record type, status and prospect filters remain distinct and composable', () => {
  const rep = '11111111-1111-4111-8111-111111111111';
  const creator = '22222222-2222-4222-8222-222222222222';
  const f = cleanup.normalizeFilters({ ownerId:rep,createdById:creator,status:'closed',scenario:'prior',prospect:'submitted',types:['scenario','scenario','customer'] });
  assert.equal(f.ownerId, rep);
  assert.equal(f.createdById, creator);
  assert.equal(f.status, 'closed');
  assert.equal(f.scenario, 'prior');
  assert.equal(f.prospect, 'submitted');
  assert.deepEqual(f.types, ['scenario','customer']);
  assert.throws(() => cleanup.normalizeFilters({ status:'active',dateBasis:'removed' }), /Removed Date/);
});

test('stable explicit IDs govern multi-select, clear, select-all and typed confirmation', () => {
  const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const selected = cleanup.normalizeSelection({ scenarioIds:[a,a], customerIds:[b], scenarioRows:[1] });
  assert.deepEqual(selected.scenarioIds, [a]);
  assert.deepEqual(selected.customerIds, [b]);
  assert.equal(cleanup.selectionCount(selected), 2);
  assert.equal(cleanup.isSubset(selected,{scenarioIds:[a],customerIds:[b]}),true);
  assert.equal(cleanup.isSubset({...selected,handoffIds:[a]},{scenarioIds:[a],customerIds:[b],handoffIds:[]}),false);
  assert.deepEqual(cleanup.emptySelection(),{scenarioIds:[],discoveryIds:[],customerIds:[],handoffIds:[]});
  assert.equal(cleanup.needsTypedConfirmation('all',1),true);
  assert.equal(cleanup.needsTypedConfirmation('selected',9),false);
  assert.equal(cleanup.needsTypedConfirmation('selected',10),true);
  assert.equal(cleanup.confirmationPhrase(47),'REMOVE 47 RECORDS');
});

test('snapshot fingerprints are stable but change when owner or record state changes', () => {
  const first = cleanup.snapshotHash({id:'x',owner:'rep-a',updatedAt:'2026-01-01',removed:false});
  const reordered = cleanup.snapshotHash({removed:false,updatedAt:'2026-01-01',owner:'rep-a',id:'x'});
  const transferred = cleanup.snapshotHash({id:'x',owner:'rep-b',updatedAt:'2026-01-01',removed:false});
  assert.equal(first,reordered);
  assert.notEqual(first,transferred);
});

test('migration adds nullable creator authority without fabricating legacy creators and immutable batch audit', () => {
  const migration = read('migrations/044_admin_bulk_cleanup.sql');
  assert.match(migration,/customers ADD COLUMN IF NOT EXISTS created_by/);
  assert.match(migration,/scenarios ADD COLUMN IF NOT EXISTS created_by/);
  assert.match(migration,/discovery_sessions ADD COLUMN IF NOT EXISTS created_by/);
  assert.doesNotMatch(migration,/UPDATE\s+(customers|scenarios|discovery_sessions)\s+SET\s+created_by/i);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS admin_cleanup_batches/);
  assert.match(migration,/immutable_admin_cleanup_batches/);
  assert.match(migration,/used_at TIMESTAMPTZ/);
});

test('active Cleanup router is Admin-only, uses one-use locked previews and never hard deletes governed records', () => {
  const server = read('server.js');
  const route = read('src/routes/admin-cleanup.js');
  assert.match(server,/app\.use\('\/api\/admin\/cleanup', requireAuth, require\('\.\/src\/routes\/admin-cleanup'\)\)/);
  assert.ok(server.indexOf("app.get('/api/admin/companies'") < server.indexOf("app.use('/api/admin/cleanup'"), 'Admin company lookup must remain outside the legacy cleanup guard');
  assert.ok(server.indexOf("app.get('/api/admin/export/:entity'") < server.indexOf("app.use('/api/admin/cleanup'"), 'Admin export must remain outside the legacy cleanup guard');
  assert.match(route,/router\.use\(adminOnly\)/);
  assert.match(route,/FOR UPDATE/);
  assert.match(route,/CLEANUP_PREVIEW_STALE/);
  assert.match(route,/used_at=NOW\(\)/);
  assert.match(route,/admin\.cleanup_batch_removed/);
  assert.match(route,/admin\.cleanup_record_removed/);
  assert.match(route,/customerDependencies/);
  assert.match(route,/dependentRestored/);
  const execute = route.slice(route.indexOf("router.post('/execute'"),route.indexOf("router.get('/deleted'"));
  assert.doesNotMatch(execute,/DELETE\s+FROM/i);
  for(const protectedTable of ['roi_value_events','discovery_submissions','scenario_roi_value_snapshots','scenario_stage_history','customer_ownership_transfers'])assert.match(execute,new RegExp(protectedTable));
});

test('browser workflow exposes all required filters, safe selection and explicit impact confirmation', () => {
  const html = read('public/index.html');
  const ui = read('public/admin-cleanup-v661.js');
  for(const id of ['cleanupDateBasis','cleanupQuickRange','cleanupDateFrom','cleanupDateThrough','cleanupOwner','cleanupCreatedBy','cleanupRemovedBy'])assert.match(html,new RegExp(`id="${id}"`));
  for(const phrase of ['Select All Previewed Results','Clear Selection','View Selected','Remove All Filtered Results','View Dependencies','Filters changed. The prior preview and selection were cleared','From date must be on or before Through date'])assert.ok(ui.includes(phrase),phrase);
  assert.match(ui,/\/api\/admin\/cleanup\/impact/);
  assert.match(ui,/typedConfirmationRequired/);
  assert.doesNotMatch(ui,/\bconfirm\s*\(/);
});

test('new Customer, Scenario and Discovery creation persist actual creator separately from current owner', () => {
  assert.match(read('src/shared/customer-setup-service.js'),/status, created_by/);
  assert.match(read('src/customers.js'),/created_by/);
  assert.match(read('src/routes/scenarios.js'),/outcome_at,created_by/);
  assert.match(read('server.js'),/questionnaire_schema_source,created_by/);
  const transfer = read('src/shared/customer-ownership-transfer.js');
  assert.doesNotMatch(transfer,/SET\s+created_by/i);
});
