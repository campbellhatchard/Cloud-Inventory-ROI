'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const JSZip = require('jszip');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.53 PostgreSQL DATE boundary is NOT TESTED';
let db, server, base, ownerToken, viewerToken;
const ids = {};
const root = path.join(__dirname, '..');

function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const namedForTesting = /(?:test|qa|ci|dev|codex)/i.test(url.pathname);
  assert.ok(local || namedForTesting, 'v6.9.53 database integration requires an explicitly non-production database');
}

async function api(route, { token = ownerToken } = {}) {
  const response = await fetch(base + route, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const contentType = response.headers.get('content-type') || '';
  return {
    status: response.status,
    contentType,
    json: contentType.includes('json') ? await response.json() : null,
    buffer: contentType.includes('json') ? null : Buffer.from(await response.arrayBuffer())
  };
}

function renderActualMap(plan) {
  const elements = new Map();
  const list = { style: {}, innerHTML: '' };
  const editor = { style: {}, _html: '', set innerHTML(value) {
    this._html = String(value);
    const match = /id="mapCloseDate"[^>]*value="([^"]*)"/.exec(this._html);
    if (match) elements.set('mapCloseDate', { value: match[1], style: {}, setAttribute() {}, addEventListener() {} });
  }, get innerHTML() { return this._html; }, querySelectorAll() { return []; } };
  elements.set('mapListWrap', list); elements.set('mapEditorWrap', editor);
  const context = {
    window: null, console, Date, Intl, JSON, Math, Promise, setTimeout, clearTimeout,
    document: { getElementById: id => elements.get(id) || null, querySelector: () => null },
    navigator: { clipboard: { writeText: async () => {} } }, confirm: () => true,
    escapeHtml: value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    showToast() {}, apiFetch: async () => ({ ok: false }), getVals: () => ({}), getCompanies: () => []
  };
  context.window = context; context.window.location = { origin: 'https://example.invalid', href: '' };
  context.window.ciAuth = { getUser: () => ({ username: 'v6953_owner', roleKeys: ['rep'] }) };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/jpp-date-only.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/map.js'), 'utf8'), context);
  context.fixture = plan;
  vm.runInContext('_maps=[fixture]; renderMapList(); openMap(fixture.id)', context);
  return { card: list.innerHTML, editorValue: elements.get('mapCloseDate')?.value, milestoneCount: vm.runInContext('_mapCurrent.milestones.length', context) };
}

if (!HAS_DB) test('v6.9.53 real PostgreSQL DATE → API → browser/output boundary', { skip: blocked }, () => {});
else describe('v6.9.53 real PostgreSQL DATE → API → browser/output boundary', { concurrency: false }, () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const password = `DateBoundary-${suffix}!`;

  before(async () => {
    assertDisposableDatabase();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || `date-boundary-secret-${suffix}`;
    await require('../src/migrate').runMigrations();
    db = require('../src/db');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 8);
    async function user(label, roles) {
      return (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active)
        VALUES($1,$2,$3,'rep',$4,FALSE,TRUE) RETURNING id,username`, [`${label}_${suffix}@example.invalid`, `${label}_${suffix}`, hash, roles])).rows[0];
    }
    ids.owner = await user('v6953_owner', ['rep']);
    ids.viewer = await user('v6953_viewer', ['rep', 'admin']);
    const milestones = Array.from({ length: 14 }, (_, index) => ({ id: `m${index + 1}`, groupId: 'g1', phase: 'Validate', title: `Milestone ${index + 1}`, owner: index % 2 ? 'joint' : 'rep', status: index < 3 ? 'done' : 'pending', dueDate: `2027-04-${String(index + 1).padStart(2, '0')}` }));
    ids.plan = (await db.query(`INSERT INTO mutual_action_plans(owner_id,company,title,target_close_date,milestones,groups,token,is_active)
      VALUES($1,$2,'PostgreSQL Date Boundary Plan',DATE '2027-03-31',$3::jsonb,$4::jsonb,$5,TRUE)
      RETURNING id`, [ids.owner.id, `Date Boundary ${suffix}`, JSON.stringify(milestones), JSON.stringify([{ id: 'g1', name: 'Validate' }]), `v6953-${suffix}`])).rows[0];
    const { app } = require('../server');
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    base = `http://127.0.0.1:${server.address().port}`;
    async function login(user) {
      const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, password }) });
      assert.equal(response.status, 200); return (await response.json()).token;
    }
    ownerToken = await login(ids.owner); viewerToken = await login(ids.viewer);
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) {
      await db.query('DELETE FROM mutual_action_plans WHERE id=$1', [ids.plan.id]);
      await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[ids.owner.id, ids.viewer.id]]);
      await db.pool?.end?.();
    }
  });

  test('raw PostgreSQL DATE and /api/maps return exact YYYY-MM-DD strings', async () => {
    const raw = (await db.query('SELECT target_close_date,pg_typeof(target_close_date)::text AS db_type FROM mutual_action_plans WHERE id=$1', [ids.plan.id])).rows[0];
    assert.deepEqual(raw, { target_close_date: '2027-03-31', db_type: 'date' });
    const result = await api('/api/maps');
    assert.equal(result.status, 200);
    const actual = result.json.find(item => item.id === ids.plan.id);
    assert.equal(actual.target_close_date, '2027-03-31');
    assert.equal(actual.milestones.length, 14);
    assert.doesNotMatch(JSON.stringify(actual), /2027-03-31T/);
  });

  test('actual All Plans/editor renderer consumes the PostgreSQL-backed API result unchanged', async () => {
    const result = await api('/api/maps');
    const actual = result.json.find(item => item.id === ids.plan.id);
    const rendered = renderActualMap(actual);
    assert.match(rendered.card, /Close: Mar 31, 2027/);
    assert.equal(rendered.editorValue, '2027-03-31');
    assert.equal(rendered.milestoneCount, 14);
  });

  test('authorized non-owner receives the same date and remains read-only', async () => {
    const result = await api('/api/maps?all=true', { token: viewerToken });
    assert.equal(result.status, 200);
    const actual = result.json.find(item => item.id === ids.plan.id);
    assert.equal(actual.target_close_date, '2027-03-31');
    assert.equal(actual.canEditPlan, false);
  });

  test('public JPP API preserves the exact date-only contract', async () => {
    const result = await api(`/api/maps/public/v6953-${suffix}`, { token: null });
    assert.equal(result.status, 200);
    assert.equal(result.json.target_close_date, '2027-03-31');
    assert.equal(result.json.milestones.length, 14);
  });

  test('database-backed internal/customer PDF and PPTX routes contain Mar 31, 2027', async () => {
    for (const audience of ['internal', 'customer']) {
      const pdf = await api(`/api/maps/${ids.plan.id}/export-pdf?audience=${audience}`);
      assert.equal(pdf.status, 200); assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');
      const pdfText = pdf.buffer.toString('latin1');
      assert.match(pdfText, /Target close date: Mar 31, 2027/); assert.doesNotMatch(pdfText, /2027-03-31T|Wed Mar|Mar 30, 2027/);
      const pptx = await api(`/api/maps/${ids.plan.id}/export-pptx?audience=${audience}`);
      assert.equal(pptx.status, 200); assert.equal(pptx.buffer.subarray(0, 2).toString(), 'PK');
      const zip = await JSZip.loadAsync(pptx.buffer);
      const names = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
      const xml = (await Promise.all(names.map(name => zip.file(name).async('string')))).join('\n');
      assert.match(xml, /Target close Mar 31, 2027/); assert.doesNotMatch(xml, /2027-03-31T|Wed Mar 31|Mar 30, 2027/);
    }
  });
});
