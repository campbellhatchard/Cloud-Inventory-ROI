'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');

const root = path.join(__dirname, '..');

function createControl(id, tagName = 'BUTTON', onclick = '') {
  const attributes = new Map();
  if (onclick) attributes.set('onclick', onclick);
  return {
    id,
    tagName,
    onclick,
    disabled: false,
    value: '',
    style: {},
    dataset: {},
    addEventListener() {},
    focus() {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; }
  };
}

function createMapHarness() {
  const elements = new Map();
  const list = { style: {} };
  const editor = {
    style: {},
    _html: '',
    set innerHTML(html) {
      this._html = String(html);
      for (const [id] of elements) if (!['mapListWrap', 'mapEditorWrap'].includes(id)) elements.delete(id);
      const tags = [...this._html.matchAll(/<(button|input|select|textarea)\b([^>]*)>/gi)];
      for (const [, tag, attrs] of tags) {
        const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
        if (!id) continue;
        const onclick = /\bonclick="([^"]*)"/.exec(attrs)?.[1] || '';
        const control = createControl(id, tag.toUpperCase(), onclick);
        control.value = /\bvalue="([^"]*)"/.exec(attrs)?.[1] || '';
        control.disabled = /\bdisabled\b/.test(attrs);
        elements.set(id, control);
      }
    },
    get innerHTML() { return this._html; },
    querySelectorAll(selector) {
      const values = [...elements.values()];
      if (selector === 'input,select,textarea') return values.filter(item => ['INPUT', 'SELECT', 'TEXTAREA'].includes(item.tagName));
      if (selector === 'button[onclick]') return values.filter(item => item.tagName === 'BUTTON' && item.getAttribute('onclick'));
      return [];
    }
  };
  elements.set('mapListWrap', list);
  elements.set('mapEditorWrap', editor);
  const document = {
    getElementById(id) { return elements.get(id) || null; },
    querySelector() { return null; }
  };
  const toasts = [];
  const context = {
    window: null,
    document,
    console,
    Date,
    Intl,
    JSON,
    Math,
    Promise,
    setTimeout,
    clearTimeout,
    navigator: { clipboard: { writeText: async () => {} } },
    confirm: () => true,
    escapeHtml: value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
    showToast(message) { toasts.push(message); },
    apiFetch: async () => ({ ok: false }),
    getVals: () => ({}),
    getCompanies: () => []
  };
  context.window = context;
  context.window.location = { origin: 'https://example.invalid', href: '' };
  context.window.ciAuth = { getUser: () => ({ username: 'qa' }) };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/jpp-date-only.js'), 'utf8'), context, { filename: 'public/jpp-date-only.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'public/map.js'), 'utf8'), context, { filename: 'public/map.js' });
  return {
    context,
    elements,
    toasts,
    run(source) { return vm.runInContext(source, context); },
    control(id) { return elements.get(id); }
  };
}

function plan({ canEditPlan, token = null } = {}) {
  return {
    id: 'plan-1',
    owner_id: 'owner',
    canEditPlan,
    company: 'Capability Customer',
    title: 'Capability Plan',
    target_close_date: null,
    token,
    milestones: [],
    groups: [{ id: 'group-1', name: 'Evaluate' }]
  };
}

test('non-owner DOM capability survives render, refresh, readiness transitions and reload', async () => {
  const harness = createMapHarness();
  harness.context.fixture = plan({ canEditPlan: false });
  await harness.run('_maps=[fixture]; openMap("plan-1")');

  assert.equal(harness.control('mapShareBtn').disabled, true);
  assert.equal(harness.control('mapShareBtn').getAttribute('aria-disabled'), 'true');
  for (const id of ['mapPdfIntBtn', 'mapPdfCustBtn', 'mapPptIntBtn', 'mapPptCustBtn']) assert.equal(harness.control(id).disabled, false, `${id} remains available`);
  for (const id of ['mapSaveBtn', 'mapAiBtn']) assert.equal(harness.control(id).disabled, true);

  harness.run('mapUpdateOutputControls()');
  assert.equal(harness.control('mapShareBtn').disabled, true, 'output refresh cannot override authorization');
  harness.run('_mapDirty=true; mapUpdateOutputControls(); _mapDirty=false; mapUpdateOutputControls()');
  assert.equal(harness.control('mapShareBtn').disabled, true, 'dirty/clean transitions cannot override authorization');
  harness.run('renderMapEditor()');
  assert.equal(harness.control('mapShareBtn').disabled, true, 'menu/editor re-render cannot override authorization');
  await harness.run('openMap("plan-1")');
  assert.equal(harness.control('mapShareBtn').disabled, true, 'plan reload cannot override authorization');
  assert.equal(harness.run('mapCanMutate()'), false);
  assert.match(harness.toasts.at(-1), /only the owner/i);
});

test('non-owner active-link Rotate and Revoke remain disabled while review actions remain available', async () => {
  const harness = createMapHarness();
  harness.context.fixture = plan({ canEditPlan: false, token: 'existing-token' });
  await harness.run('_maps=[fixture]; openMap("plan-1")');
  assert.equal(harness.control('mapRotateShareBtn').disabled, true);
  assert.equal(harness.control('mapRevokeShareBtn').disabled, true);
  harness.run('mapUpdateOutputControls(); renderMapEditor(); mapUpdateOutputControls()');
  assert.equal(harness.control('mapRotateShareBtn').disabled, true);
  assert.equal(harness.control('mapRevokeShareBtn').disabled, true);
  for (const id of ['mapPdfIntBtn', 'mapPdfCustBtn', 'mapPptIntBtn', 'mapPptCustBtn']) assert.equal(harness.control(id).disabled, false);
});

test('owner prospect-link controls follow saved readiness without changing owner edit capability', async () => {
  const harness = createMapHarness();
  harness.context.fixture = plan({ canEditPlan: true });
  await harness.run('_maps=[fixture]; openMap("plan-1")');
  assert.equal(harness.control('mapShareBtn').disabled, false);
  assert.equal(harness.control('mapSaveBtn').disabled, false);
  assert.equal(harness.control('mapAiBtn').disabled, false);
  assert.equal(harness.control('mapTitle').disabled, false);
  assert.equal(harness.run('_mapCurrent.milestones.length'), 0);
  harness.run('addMilestone("group-1","end")');
  assert.equal(harness.run('_mapCurrent.milestones.length'), 1, 'owner can add a milestone');
  harness.run('removeMilestone(_mapCurrent.milestones[0].id)');
  assert.equal(harness.run('_mapCurrent.milestones.length'), 0, 'owner can remove a milestone');
  harness.run('_mapDirty=true; mapUpdateOutputControls()');
  assert.equal(harness.control('mapShareBtn').disabled, true);
  assert.equal(harness.run('mapCanMutate()'), true);
  harness.run('_mapDirty=false; mapUpdateOutputControls()');
  assert.equal(harness.control('mapShareBtn').disabled, false);
});

test('owner can Rotate and Revoke an eligible saved link', async () => {
  const harness = createMapHarness();
  harness.context.fixture = plan({ canEditPlan: true, token: 'owner-token' });
  await harness.run('_maps=[fixture]; openMap("plan-1")');
  assert.equal(harness.control('mapRotateShareBtn').disabled, false);
  assert.equal(harness.control('mapRevokeShareBtn').disabled, false);
});

async function createRouteHarness() {
  const mutations = [];
  const routePath = path.join(root, 'src/routes/maps.js');
  const originalLoad = Module._load;
  const query = async (sql, params) => {
    const normalized = String(sql).replace(/\s+/g, ' ').trim();
    if (/^SELECT id,owner_id FROM mutual_action_plans/.test(normalized)) return { rows: [{ id: 'plan-1', owner_id: 'owner' }] };
    if (/^UPDATE mutual_action_plans SET token = \$1/.test(normalized)) {
      mutations.push({ operation: 'share', params });
      return { rows: [{ id: 'plan-1' }] };
    }
    if (/^UPDATE mutual_action_plans SET token = NULL/.test(normalized)) {
      mutations.push({ operation: 'revoke', params });
      return { rows: [{ id: 'plan-1' }] };
    }
    if (/^UPDATE mutual_action_plans SET company/.test(normalized)) {
      mutations.push({ operation: 'update', params });
      return { rows: [{ id: 'plan-1', owner_id: 'owner', company: 'Capability Customer', title: params[1], milestones: [], groups: [], token: null }] };
    }
    if (/^DELETE FROM mutual_action_plans/.test(normalized)) {
      mutations.push({ operation: 'delete', params });
      return { rows: [{ id: 'plan-1' }] };
    }
    throw new Error(`Unexpected query: ${normalized}`);
  };
  Module._load = function(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === '../db') return { query };
      if (request === '../audit') return { log: async () => {} };
      if (request === '../middleware/auth') return { requireAuth(req, _res, next) { req.user = { id: req.headers['x-user-id'] || 'viewer', roleKeys: ['rep'] }; next(); }, hasRole: () => false };
      if (request === '../authorization') return { hasPermission: () => false, scenarioAccess: async () => ({ exists: false, allowed: false }) };
      if (request === '../exports/operational-pptx') return { buildJppPptx: async () => Buffer.from('pptx') };
      if (request === '../exports/operational-pdf') return { buildJppPdf: () => Buffer.from('%PDF') };
      if (request === '../shared/output-brand') return { safeFile: value => String(value) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[routePath];
  let router;
  try { router = require(routePath); } finally { Module._load = originalLoad; }
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/maps', router);
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, { method = 'GET', user = 'viewer', body } = {}) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', 'x-user-id': user }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json().catch(() => null) };
  }
  return { mutations, request, close: () => new Promise(resolve => server.close(resolve)) };
}

test('real JPP mutation routes deny non-owner share, revoke, update and delete with zero mutation', async t => {
  const harness = await createRouteHarness();
  t.after(harness.close);
  const attempts = [
    ['/api/maps/plan-1/share', { method: 'POST', body: {} }],
    ['/api/maps/plan-1/share', { method: 'DELETE' }],
    ['/api/maps/plan-1', { method: 'PUT', body: { title: 'Forged', milestones: [] } }],
    ['/api/maps/plan-1', { method: 'DELETE' }]
  ];
  for (const [route, options] of attempts) {
    const result = await harness.request(route, options);
    assert.equal(result.status, 403, `${options.method} ${route}`);
    assert.match(result.body.error, /only the owner/i);
  }
  assert.deepEqual(harness.mutations, []);
});

test('real JPP routes preserve owner share and revoke behavior', async t => {
  const harness = await createRouteHarness();
  t.after(harness.close);
  const shared = await harness.request('/api/maps/plan-1/share', { method: 'POST', user: 'owner', body: {} });
  assert.equal(shared.status, 200);
  assert.equal(shared.body.ok, true);
  const revoked = await harness.request('/api/maps/plan-1/share', { method: 'DELETE', user: 'owner' });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.ok, true);
  assert.deepEqual(harness.mutations.map(item => item.operation), ['share', 'revoke']);
});
