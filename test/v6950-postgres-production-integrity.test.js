'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.50 JPP capability integration is NOT TESTED';
let db, server, base, ownerToken, viewerToken, outsiderToken;
const ids = {};

async function api(route, { method = 'GET', token = ownerToken, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, json: await response.json().catch(() => null) };
}

if (!HAS_DB) test('v6.9.50 PostgreSQL JPP server-owned capability gate', { skip: blocked }, () => {});
else describe('v6.9.50 JPP capability against disposable PostgreSQL', { concurrency: false }, () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const password = `Jpp-${suffix}!`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || `jpp-secret-${suffix}`;
    await require('../src/migrate').runMigrations();
    db = require('../src/db');
    const bcrypt = require('bcrypt'), hash = await bcrypt.hash(password, 8);
    async function user(label, roles) {
      return (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active)
        VALUES($1,$2,$3,'rep',$4,FALSE,TRUE) RETURNING id,username`, [`${label}_${suffix}@example.invalid`, `${label}_${suffix}`, hash, roles])).rows[0];
    }
    ids.owner = await user('jpp_owner', ['rep']);
    ids.viewer = await user('jpp_viewer_admin_rep', ['rep', 'admin']);
    ids.outsider = await user('jpp_outsider_rep', ['rep']);
    ids.plan = (await db.query(`INSERT INTO mutual_action_plans(owner_id,company,title,milestones,groups)
      VALUES($1,$2,'Capability Plan','[]'::jsonb,'[]'::jsonb) RETURNING id`, [ids.owner.id, `JPP Capability ${suffix}`])).rows[0];
    const { app } = require('../server');
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    base = `http://127.0.0.1:${server.address().port}`;
    async function login(user) {
      const result = await api('/api/auth/login', { method: 'POST', token: null, body: { username: user.username, password } });
      assert.equal(result.status, 200);return result.json.token;
    }
    ownerToken = await login(ids.owner);viewerToken = await login(ids.viewer);outsiderToken = await login(ids.outsider);
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) {
      await db.query('DELETE FROM mutual_action_plans WHERE id=$1', [ids.plan.id]);
      await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[ids.owner.id, ids.viewer.id, ids.outsider.id]]);
      await db.pool?.end?.();
    }
  });

  test('list response exposes owner editability and multi-role non-owner read-only capability', async () => {
    const owner = await api('/api/maps?all=true');
    assert.equal(owner.status, 200);assert.equal(owner.json.find(item => item.id === ids.plan.id).canEditPlan, true);
    const viewer = await api('/api/maps?all=true', { token: viewerToken });
    assert.equal(viewer.status, 200);assert.equal(viewer.json.find(item => item.id === ids.plan.id).canEditPlan, false);
  });

  test('non-owner direct update, share, revoke and delete routes deny before mutation', async () => {
    const attempts = [
      ['/api/maps/' + ids.plan.id, 'PUT', { title: 'Forged title' }],
      ['/api/maps/' + ids.plan.id + '/share', 'POST', {}],
      ['/api/maps/' + ids.plan.id + '/share', 'DELETE'],
      ['/api/maps/' + ids.plan.id, 'DELETE']
    ];
    for (const [route, method, body] of attempts) {
      const result = await api(route, { method, token: outsiderToken, body });
      assert.equal(result.status, 403, `${method} ${route} must remain owner-only`);
    }
    const row = (await db.query('SELECT title,token FROM mutual_action_plans WHERE id=$1', [ids.plan.id])).rows[0];
    assert.equal(row.title, 'Capability Plan');assert.equal(row.token, null);
  });

  test('owner mutation remains available and returns the same server capability', async () => {
    const result = await api('/api/maps/' + ids.plan.id, { method: 'PUT', body: { title: 'Owner Updated Plan', milestones: [] } });
    assert.equal(result.status, 200);assert.equal(result.json.canEditPlan, true);assert.equal(result.json.title, 'Owner Updated Plan');
  });
});
