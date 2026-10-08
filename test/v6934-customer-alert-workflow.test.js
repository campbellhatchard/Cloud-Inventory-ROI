'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const {
  CUSTOMER_SETUP_CONTRACT,
  publicCustomerSetupContract,
  validateCustomerSetup
} = require('../src/shared/customer-setup-contract');
const setupCore = require('../public/customer-setup-core');
const appContext = require('../public/app-context');
const alerts = require('../public/app-alerts');
const { createCustomerHandler } = require('../src/shared/customer-setup-service');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('customer contract exposes only actual database-required business fields', () => {
  const contract = publicCustomerSetupContract();
  assert.deepEqual(contract.fields.filter(field => field.required).map(field => field.key), ['name']);
  assert.equal(contract.serverDerived[0].key, 'ownerId');
  assert.equal(contract.fields.find(field => field.key === 'hasFieldInventory').classification, 'optional');
  assert.equal(Object.isFrozen(CUSTOMER_SETUP_CONTRACT), true);
});

test('server validation normalizes permitted values and remains authoritative', () => {
  const empty = validateCustomerSetup({ name: '   ' });
  assert.equal(empty.valid, false);
  assert.deepEqual(empty.errors.map(error => error.field), ['name']);
  const valid = validateCustomerSetup({ name: '  Acme   Manufacturing  ', hasFieldInventory: true, ownerId: 'spoofed' });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.value, { name: 'Acme Manufacturing', hasFieldInventory: true });
});

test('browser validation is derived from the server schema', () => {
  const contract = publicCustomerSetupContract();
  assert.deepEqual(setupCore.missingRequired(contract, {}), [contract.fields[0]]);
  assert.deepEqual(setupCore.missingRequired(contract, { name: 'Acme' }), []);
  assert.deepEqual(setupCore.payloadFromContract(contract, { name: ' Acme ', hasFieldInventory: true, ownerId: 'spoofed' }), {
    name: 'Acme', hasFieldInventory: true
  });
});

test('server rejects missing required fields without touching PostgreSQL', async () => {
  let queries = 0;
  const handler = createCustomerHandler({ dataQuery: async () => { queries += 1; throw new Error('must not run'); }, auditLog: async () => {} });
  const res = responseRecorder();
  await handler({ body: {}, user: { id: 'user-1' }, ip: '127.0.0.1' }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'CUSTOMER_VALIDATION_FAILED');
  assert.equal(queries, 0);
});

test('valid customer is persisted before authoritative id is returned', async () => {
  const calls = [];
  const handler = createCustomerHandler({
    dataQuery: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{ id: 'customer-1', name: 'Acme', owner_id: 'user-1', has_field_inventory: true, status: 'active' }] };
    },
    auditLog: async entry => calls.push({ audit: entry })
  });
  const res = responseRecorder();
  await handler({ body: { name: 'Acme', hasFieldInventory: true }, user: { id: 'user-1', username: 'rep' }, ip: '127.0.0.1' }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.customer.id, 'customer-1');
  assert.match(calls[0].sql, /INSERT INTO customers/);
  assert.deepEqual(calls[0].params, ['Acme', 'user-1', true]);
  assert.equal(calls[1].audit.entityId, 'customer-1');
});

test('duplicate follows owner plus case-insensitive name authority and exposes only active owned record', async () => {
  let call = 0;
  const handler = createCustomerHandler({
    dataQuery: async () => (++call === 1
      ? { rows: [] }
      : { rows: [{ id: 'existing-1', name: 'Acme', owner_id: 'user-1', status: 'active', deleted_at: null }] }),
    auditLog: async () => {}
  });
  const res = responseRecorder();
  await handler({ body: { name: 'ACME' }, user: { id: 'user-1' }, ip: '' }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'CUSTOMER_DUPLICATE');
  assert.deepEqual(res.body.existingCustomer, { id: 'existing-1', name: 'Acme' });
});

test('server failure is explicit and does not claim creation', async () => {
  const handler = createCustomerHandler({ dataQuery: async () => { throw new Error('database unavailable'); }, auditLog: async () => {} });
  const res = responseRecorder();
  await handler({ body: { name: 'Acme' }, user: { id: 'user-1' }, ip: '' }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, 'CUSTOMER_CREATE_FAILED');
  assert.match(res.body.error, /not been lost/i);
});

test('customer setup routes retain authentication and Rep-or-Admin creation authority', () => {
  const source = read('src/routes/customers.js');
  assert.match(source, /router\.get\('\/setup-schema', requireAuth/);
  assert.match(source, /router\.post\('\/', requireAuth, requireAnyRole\('rep',\s*'admin'\)/);
  assert.doesNotMatch(source, /router\.post\('\/',[^\n]*\bse\b/);
});

test('Customer Setup opens instead of browser-only calculator creation', () => {
  const gate = read('public/customer-gate.js');
  const create = gate.match(/function cgCreateNew\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(create, /requestCreateNewCustomer/);
  assert.doesNotMatch(create, /getCompanies\(\)\.push|clearForm\(/);
});

test('client blocks missing fields before POST and keeps dialog open on errors', () => {
  const source = read('public/customer-setup.js');
  const missingCheck = source.indexOf('if (missing.length) { showValidation(missing); return; }');
  const post = source.indexOf("apiFetch('/api/customers'");
  assert.ok(missingCheck > 0 && missingCheck < post);
  assert.match(source, /showServerError\([\s\S]*Customer could not be created/);
  assert.doesNotMatch(source.slice(source.indexOf('function showServerError'), source.indexOf('async function saveCustomerSetup')), /closeCustomerSetup/);
});

test('returned customer id establishes active context before setup closes', () => {
  const source = read('public/customer-setup.js');
  const select = source.indexOf('selectCustomerContextById?.(payload.customer.id');
  const close = source.indexOf('closeCustomerSetup();', select);
  assert.ok(select > 0 && close > select);
});

test('Create New Customer is available in the persistent switcher without logout', () => {
  const source = read('public/customer-switcher.js');
  assert.match(source, /Create New Customer/);
  assert.match(source, /requestCreateNewCustomer/);
  assert.doesNotMatch(source, /logout\(.*Create New Customer/);
});

test('unsaved context guard provides all three governed choices', () => {
  const source = read('public/customer-setup.js');
  assert.match(source, /Save &amp; Continue/);
  assert.match(source, /Discard &amp; Continue/);
  assert.match(source, />Cancel</);
  assert.match(source, /if \(!saved\)[\s\S]*original customer workspace/);
});

test('customer switch save waits for confirmed server save and fails closed', () => {
  const source = read('public/customer-switcher.js');
  assert.match(source, /await window\.saveScenario\?\.\(\{skipDialog:true\}\)/);
  assert.match(source, /if\(!saved\)[\s\S]*Customer context was not changed/);
  assert.doesNotMatch(source, /setInterval\(async\(\)=>\{if\(!window\.hasUnsavedChanges/);
});

test('explicit context states drive action availability', () => {
  const S = appContext.STATES;
  assert.equal(appContext.derive({}), S.NO_CUSTOMER);
  assert.equal(appContext.derive({ customerId: 'c1' }), S.CUSTOMER_NO_SCENARIO);
  assert.equal(appContext.derive({ customerId: 'c1', hasValidWorkingScenario: true }), S.WORKING_UNSAVED);
  assert.equal(appContext.derive({ customerId: 'c1', scenarioId: 's1', dirty: false }), S.SAVED);
  assert.equal(appContext.derive({ customerId: 'c1', scenarioId: 's1', dirty: true }), S.DIRTY_SAVED);
});

test('no-customer state never renders false zero economics', () => {
  const app = read('public/app.js');
  const block = app.slice(app.indexOf('if (!activeCustomerId)'), app.indexOf('if (typeof updateCompletenessMeter'));
  assert.match(block, /No business case/);
  assert.doesNotMatch(block, /fmt\(0\)|'0%'/);
  const html = read('public/index.html');
  for (const action of ['save', 'output', 'share', 'email']) assert.match(html, new RegExp(`data-context-action="${action}"`));
  assert.match(html, /name === 'exec'[\s\S]*CIAppContext\.requireSaved\('opening Executive Outputs'\)/);
});

test('customer reset clears every material cross-customer context', () => {
  const source = read('public/customer-switcher.js');
  const reset = source.match(/function resetCustomerContext\(\)[\s\S]*?}\n async function perform/)?.[0] || '';
  for (const marker of ['_activeCustomerMeta=null', '_calcScenarioId=null', 'discoveryScenarioId=null', 'latestSubmittedEvidence=null', 'clearProposalContext', 'resetCustomerAIContext']) {
    assert.match(reset, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('shared alerts define accessible severity and persistence semantics', () => {
  assert.deepEqual(alerts.semanticsFor('error'), { severity: 'error', role: 'alert', ariaLive: 'assertive', persist: true, audioEligible: true });
  assert.deepEqual(alerts.semanticsFor('warning'), { severity: 'warning', role: 'alert', ariaLive: 'assertive', persist: true, audioEligible: true });
  assert.deepEqual(alerts.semanticsFor('success'), { severity: 'success', role: 'status', ariaLive: 'polite', persist: false, audioEligible: true });
  assert.equal(alerts.semanticsFor('info').audioEligible, false);
});

test('shared alert service renders success, warning, and error with accessible roles', () => {
  const nodes = new Map();
  function element(tag) {
    const node = {
      tag, id: '', className: '', children: [], attrs: {}, textContent: '',
      appendChild(child) { this.children.push(child); if (child.id) nodes.set(child.id, child); },
      setAttribute(key, value) { this.attrs[key] = String(value); },
      addEventListener() {}, remove() {},
      querySelector(selector) {
        if (selector === '.app-alert-copy span') return this.copy || (this.copy = element('span'));
        if (selector === '.app-alert-close') return this.close || (this.close = element('button'));
        return null;
      }
    };
    return node;
  }
  const body = element('body');
  const document = {
    readyState: 'complete', body,
    getElementById(id) { return nodes.get(id) || null; },
    createElement: element,
    querySelectorAll() { return []; }
  };
  const store = new Map();
  const rootForAlerts = { document, localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) } };
  const runtime = alerts.createForRoot(rootForAlerts);
  runtime.success('Customer saved.', { duration: 1 });
  runtime.warning('Unsaved changes.', { key: 'warning-test' });
  runtime.error('Save failed.', { key: 'error-test' });
  const host = body.children.find(node => node.id === 'appAlertRegion');
  assert.ok(host);
  assert.deepEqual(host.children.map(node => node.className), [
    'app-alert app-alert-success', 'app-alert app-alert-warning', 'app-alert app-alert-error'
  ]);
  assert.deepEqual(host.children.map(node => node.attrs.role), ['status', 'alert', 'alert']);
  assert.deepEqual(host.children.map(node => node.attrs['aria-live']), ['polite', 'assertive', 'assertive']);
});

test('audio-off remains functional and audio never substitutes for visible ARIA output', () => {
  assert.equal(alerts.isAudioEnabled(), false);
  const source = read('public/app-alerts.js');
  assert.match(source, /container\.appendChild\(node\)/);
  assert.match(source, /setAttribute\('role'/);
  assert.match(source, /setAttribute\('aria-live'/);
  assert.ok(source.indexOf('container.appendChild(node)') < source.indexOf('playCue(level)'));
});

test('audio preference is browser-local and never written to governed customer data', () => {
  const source = read('public/app-alerts.js');
  const html = read('public/index.html');
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(source, /ci_audio_alerts/);
  assert.doesNotMatch(source, /apiFetch|fetch\(|scenario\.data|customerId/);
  assert.ok(html.indexOf('data-audio-alert-preference') > html.indexOf('id="tab-profile"'));
});

test('validation summary is accessible and focuses the first invalid server-defined field', () => {
  const source = read('public/customer-setup.js');
  assert.match(source, /required field\$\{fields\.length === 1/);
  assert.match(source, /setAttribute\('aria-invalid', 'true'\)/);
  assert.match(source, /fields\[0\][\s\S]*\.focus\(\)/);
});

test('no migration or ROI methodology change is introduced by this correction', () => {
  const migrations = fs.readdirSync(path.join(root, 'migrations')).filter(file => file.endsWith('.sql'));
  assert.equal(migrations.at(-1), '042_server_authoritative_value_application.sql');
  assert.equal(require('../release-lineage.json').roiModelVersion, 28);
});
