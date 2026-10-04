'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('prospect ROI preview path is built from the persisted public session', () => {
  const { roiPreviewPath } = require('../public/prospect-runtime');
  assert.equal(roiPreviewPath({ token: 'abc 123' }), '/api/discovery/sessions/abc%20123/roi-preview');
  assert.throws(() => roiPreviewPath(null), /active Prospect session/);
});

test('prospect ROI preview uses the persisted session token outside init scope', () => {
  const source = read('public/prospect.html');
  const start = source.indexOf('async function computeLiveROI()');
  const section = source.slice(start, source.indexOf('async function renderValuePanel()', start));
  assert.match(section, /CIProspectRuntime\.roiPreviewPath\(sessionData\)/);
  assert.doesNotMatch(section, /encodeURIComponent\(token\)/);
});

test('scenario-scoped discovery lookup binds one PostgreSQL parameter without a type-less gap', () => {
  const { discoverySessionScope } = require('../src/shared/discovery-session-query');
  assert.deepEqual(discoverySessionScope({ scenarioId: 'scenario-1', userId: 'user-1' }), {
    predicate: 'ds.scenario_id = $1',
    values: ['scenario-1']
  });
  assert.deepEqual(discoverySessionScope({ userId: 'user-1' }), {
    predicate: 'ds.owner_id = $1',
    values: ['user-1']
  });
});

test('base scenario list computes shared ownership before rendering its actions', () => {
  const source = read('public/app.js');
  const start = source.indexOf('function renderList()');
  const section = source.slice(start, source.indexOf('async function generateShareURLFromScenario', start));
  assert.match(section, /const isShared\s*=\s*Boolean\(/);
});

test('Executive PDF refuses to export stale ROI while calculator changes are unsaved', async () => {
  let fetchCount = 0;
  let guardCount = 0;
  const messages = [];
  const button = { disabled: false, dataset: {}, innerHTML: 'PDF' };
  const window = {
    _calcScenarioId: 'scenario-1',
    CIEconomicAvailability: { hasEconomicValue: () => true, percent: () => '1%', paybackLabel: () => '1 month' },
    CIBrand: { audience: () => '', logo: () => '', documentCss: () => '' },
    CIProposalOutputBuilder: { buildProposalOutputHtml: () => '' },
    hasUnsavedChanges: () => true,
    CIExecutiveOutputPreconditions: require('../public/executive-output-preconditions'),
    getExecutiveOutputPersistenceState: () => ({ scenarioId:'scenario-1', calculatorDirty:true, narrativeDirty:false, appliedValueDraftCount:0 })
  };
  const document = {
    getElementById: id => id === 'pdfDownloadBtn' ? button : null,
    querySelector: () => null,
    createElement: () => ({ click() {}, querySelector: () => ({}) }),
    body: { prepend() {} }
  };
  const context = {
    window, document, Date, Intl, Number, Math, Promise, URL, Blob,
    setTimeout, clearTimeout, console,
    hasUnsavedChanges: window.hasUnsavedChanges,
    showToast: message => messages.push(message),
    guardExecutiveOutput: async () => { guardCount += 1; return { proceed: true, draft: false, result: { status: 'ready' } }; },
    fetch: async () => { fetchCount += 1; return { ok: true, blob: async () => new Blob(['pdf']) }; }
  };
  vm.createContext(context);
  vm.runInContext(read('public/executive-output-adapters.js'), context);

  await window.downloadPDF();

  assert.equal(fetchCount, 0);
  assert.equal(guardCount, 0);
  assert.match(messages.join(' '), /Save the updated ROI as a new scenario version before creating the PDF/);
});

test('scenario current-version recovery keeps the PostgreSQL update deterministic', () => {
  const source = read('src/routes/scenarios.js');
  assert.match(source, /RETURNING id, base_id, version, name, company, customer_id, is_current/);
  assert.match(source, /UPDATE scenarios SET is_current = TRUE\s+WHERE id = \(\s+SELECT id FROM scenarios/);
});
