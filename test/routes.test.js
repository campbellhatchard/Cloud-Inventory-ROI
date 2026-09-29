/* ═══════════════════════════════════════════════════════════════════
   test/routes.test.js — integration tests for the HTTP API
   ───────────────────────────────────────────────────────────────────
   WHAT THIS COVERS (the flows most prone to regression):
     • Auth boundary — protected routes reject anonymous callers, public
       prospect routes stay reachable (the class of bug that once broke
       prospect links via router-level requireAuth).
     • Health + unknown-route behavior.
     • Authenticated scenario CRUD round-trip (create → list → outcome → delete).
     • Server-authoritative ROI — the server stores its own computed numbers.
     • Error log endpoint is admin-gated.

   HOW TO RUN (needs a database + the app; NOT run in the build sandbox):
     1. Provision a throwaway Postgres and set DATABASE_URL.
     2. Set JWT_SECRET and (optionally) ADMIN_PASSWORD to match your seed.
     3. `node --test test/routes.test.js`
        (Node 18+; uses built-in node:test and global fetch — no extra deps.)

   The suite boots the real Express app on an ephemeral port, waits for
   migrations, logs in as the seeded admin, and exercises real requests.
   If DATABASE_URL is absent it SKIPS (so CI without a DB stays green with
   a clear skip message rather than a false failure).
   ═══════════════════════════════════════════════════════════════════ */

'use strict';
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');

const HAS_DB = !!process.env.DATABASE_URL;
const ADMIN_USER = process.env.TEST_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASS || 'CloudInventory2026!';

let base = null;      // http://127.0.0.1:PORT
let server = null;
let adminToken = null;

/* Boot the app on an ephemeral port by requiring server.js's app.
   server.js starts listening itself; to keep tests self-contained we
   instead import the express app if it is exported, else start a child.
   The app exports `app` when required in test mode (see note below). */
async function boot() {
  process.env.NODE_ENV = 'test';
  process.env.PORT = process.env.TEST_PORT || '0';   // 0 = ephemeral
  // The app module should export { app } for testing. If it does not yet,
  // this require still triggers listen(); we then read the bound port.
  const mod = require('../server.js');
  // Prefer an exported app + explicit listen for a clean ephemeral port.
  if (mod && mod.app && typeof mod.app.listen === 'function') {
    await new Promise((res) => {
      server = mod.app.listen(0, '127.0.0.1', res);
    });
    const { port } = server.address();
    base = `http://127.0.0.1:${port}`;
  } else if (mod && mod.server && mod.server.address) {
    base = `http://127.0.0.1:${mod.server.address().port}`;
    server = mod.server;
  } else {
    throw new Error('server.js must export { app } (preferred) or { server } for integration tests.');
  }
  // Give migrations a moment if the app runs them on boot.
  await new Promise((r) => setTimeout(r, 1500));
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(base + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await resp.json(); } catch (_) { /* non-JSON */ }
  return { status: resp.status, json };
}

describe('HTTP API integration', { skip: HAS_DB ? false : 'DATABASE_URL not set — integration tests skipped' }, () => {
  before(async () => {
    await boot();
    // Log in as the seeded admin to get a real, session-backed token.
    const r = await api('/api/auth/login', { method: 'POST', body: { username: ADMIN_USER, password: ADMIN_PASS } });
    if (r.status === 200 && r.json && r.json.token) adminToken = r.json.token;
  });

  after(async () => {
    if (server && server.close) await new Promise((res) => server.close(res));
  });

  test('health endpoint responds', async () => {
    const r = await api('/api/enhance/health');
    assert.ok(r.status === 200 || r.status === 503, `health status ${r.status}`);
  });

  test('protected route rejects anonymous caller', async () => {
    const r = await api('/api/scenarios');   // requires auth
    assert.strictEqual(r.status, 401, 'anonymous access to /api/scenarios should be 401');
  });

  test('admin login succeeded (precondition for the rest)', () => {
    assert.ok(adminToken, 'expected a token from admin login — check ADMIN_PASSWORD/seed');
  });

  test('authenticated caller can list scenarios', async () => {
    const r = await api('/api/scenarios', { token: adminToken });
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.json) || Array.isArray(r.json?.scenarios), 'expected a scenario list');
  });

  test('public prospect route is reachable without auth (invalid token → 400/404, never 401)', async () => {
    // The historically-broken path: a public discovery route must NOT be
    // blocked by auth. A malformed token should yield a validation/not-found
    // error, never an auth rejection.
    const r = await api('/api/discovery/sessions/not-a-real-token');
    assert.notStrictEqual(r.status, 401, 'public discovery route must not require auth');
    assert.ok([400, 404].includes(r.status), `expected 400/404 for bad token, got ${r.status}`);
  });

  test('error log endpoint is admin-gated', async () => {
    const anon = await api('/api/logs/errors');
    assert.strictEqual(anon.status, 401, 'error log must require auth');
    const asAdmin = await api('/api/logs/errors', { token: adminToken });
    assert.strictEqual(asAdmin.status, 200, 'admin should read the error log');
    assert.ok(asAdmin.json && Array.isArray(asAdmin.json.errors), 'expected { errors: [...] }');
  });

  test('scenario round-trip: create → server-authoritative ROI → outcome → delete', async () => {
    // Create a scenario with real inputs.
    const inputs = {
      name: 'Integration Test Co', company: 'Integration Test Co', industry: 'mfg',
      users: 50, labor: 60000, mLabor: 0.25, invest: 120000, otc: 150000,
      revenue: 80000000, modelVersion: 27, implMonths: 3, ramp1: 0.4, ramp2: 0.75, ramp3: 1.0
    };
    const created = await api('/api/scenarios', { method: 'POST', token: adminToken, body: { data: inputs, name: inputs.name } });
    assert.ok([200, 201].includes(created.status), `create status ${created.status}`);
    const saved = created.json && (created.json.scenario || created.json);
    const id = saved && saved.id;
    const baseId = saved && (saved.base_id || saved.baseId);
    assert.ok(id, 'created scenario should have an id');

    // Server-authoritative ROI: server computed and stored a positive benefit.
    const data = saved.data || saved;
    if (data && data.annualBenefit !== undefined) {
      assert.ok(Number(data.annualBenefit) > 0, 'server should compute a positive annual benefit');
    }

    // The legacy group outcome writer is permanently retired. Closure must use
    // Buyer Readiness, even when the caller supplies a formerly valid payload.
    if (baseId) {
      const oc = await api(`/api/scenarios/group/${baseId}/outcome`, {
        method: 'PUT', token: adminToken, body: { outcome: 'won', realizedValue: 1500000 }
      });
      assert.strictEqual(oc.status, 410, 'legacy outcome writer must remain retired');
    }

    // Clean up.
    const del = await api(`/api/scenarios/${id}`, { method: 'DELETE', token: adminToken });
    assert.ok([200, 204].includes(del.status), `delete status ${del.status}`);
  });

  test('customers endpoint lists customers for the AE', async () => {
    const r = await api('/api/customers', { token: adminToken });
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.json), 'expected an array of customers');
    // each should carry a stable id + name
    if (r.json.length) {
      assert.ok(r.json[0].id && r.json[0].name !== undefined, 'customer needs id + name');
    }
  });

  test('saving a scenario links it to a first-class customer', async () => {
    const company = 'Customer Link Test ' + Date.now();
    const created = await api('/api/scenarios', {
      method: 'POST', token: adminToken,
      body: { name: 'CL Test', company, data: { company, modelVersion: 27 } }
    });
    assert.ok([200, 201].includes(created.status), `create status ${created.status}`);
    const saved = created.json && (created.json.scenario || created.json);
    // the saved scenario should carry a customer_id
    assert.ok(saved.customer_id || saved.customerId, 'saved scenario should have a customer_id');
    // and the customer should now appear in the customers list
    const list = await api('/api/customers', { token: adminToken });
    assert.ok(list.json.some(c => c.name === company), 'new customer should appear in /api/customers');
    // cleanup
    if (saved.id) await api('/api/scenarios/' + saved.id, { method: 'DELETE', token: adminToken });
  });

  test('handoff endpoints: auth-gated, upsert, server-computed readiness', async () => {
    // Need a customer to attach to — create a scenario to get one.
    const company = 'Handoff Test ' + Date.now();
    const created = await api('/api/scenarios', {
      method: 'POST', token: adminToken,
      body: { name: 'HO', company, data: { company, modelVersion: 27 } }
    });
    const saved = created.json && (created.json.scenario || created.json);
    const customerId = saved && (saved.customer_id || saved.customerId);
    if (!customerId) { assert.ok(true, 'no customer_id returned — skipping handoff body'); return; }

    // Anonymous is rejected.
    const anon = await api('/api/handoffs/' + customerId);
    assert.strictEqual(anon.status, 401, 'handoff read must require auth');

    // Empty shell before any save.
    const shell = await api('/api/handoffs/' + customerId, { token: adminToken });
    assert.strictEqual(shell.status, 200);
    assert.strictEqual(shell.json.exists, false, 'expected an empty shell');
    assert.strictEqual(shell.json.readiness, 0);

    // Upsert with partial data → server computes readiness > 0.
    const put = await api('/api/handoffs/' + customerId, {
      method: 'PUT', token: adminToken,
      body: { data: { opportunity: { customer: company, solutionEngineer: 'Jo', products: 'CIP' } } }
    });
    assert.strictEqual(put.status, 200);
    assert.ok(typeof put.json.readiness === 'number' && put.json.readiness > 0, 'server should compute a readiness score');

    // Re-fetch persists.
    const refetch = await api('/api/handoffs/' + customerId, { token: adminToken });
    assert.strictEqual(refetch.json.exists, true);
    assert.strictEqual(refetch.json.data.opportunity.solutionEngineer, 'Jo');

    // Cleanup the scenario (customer + handoff cascade as configured).
    if (saved.id) await api('/api/scenarios/' + saved.id, { method: 'DELETE', token: adminToken });
  });

  test('role validation accepts se (Solution Engineer)', async () => {
    // Admin creating a user with role 'se' should succeed (or 409 if exists),
    // and must NOT be rejected as an invalid role.
    const uname = 'se_test_' + Date.now();
    const r = await api('/api/users', {
      method: 'POST', token: adminToken,
      body: { username: uname, email: uname + '@example.com', role: 'se' }
    });
    // 200/201 = created; 400 would mean the role was rejected (the bug we're guarding).
    assert.notStrictEqual(r.status, 400, 'role "se" must be accepted, not rejected as invalid');
    // best-effort cleanup if an id came back
    const id = r.json && (r.json.id || (r.json.user && r.json.user.id));
    if (id) await api('/api/users/' + id, { method: 'DELETE', token: adminToken });
  });

  test('retired outcome endpoint cannot mutate with any payload', async () => {
    // The retired endpoint returns 410 before payload validation or DB writes.
    const created = await api('/api/scenarios', { method: 'POST', token: adminToken, body: { data: { name: 'Bad Outcome Co', company: 'Bad Outcome Co', modelVersion: 27 }, name: 'Bad Outcome Co' } });
    const saved = created.json && (created.json.scenario || created.json);
    const baseId = saved && (saved.base_id || saved.baseId);
    const id = saved && saved.id;
    if (baseId) {
      const bad = await api(`/api/scenarios/group/${baseId}/outcome`, {
        method: 'PUT', token: adminToken, body: { outcome: 'maybe' }
      });
      assert.strictEqual(bad.status, 410, 'retired outcome endpoint must always return 410');
    }
    if (id) await api(`/api/scenarios/${id}`, { method: 'DELETE', token: adminToken });
  });
});
