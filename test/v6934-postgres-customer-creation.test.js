'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.34 customer-creation PostgreSQL integration is NOT TESTED';
const USER = process.env.TEST_ADMIN_USER || 'admin';
const PASS = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASS || 'CloudInventory2026!';
let server, base, token, db, customerId, customerName;

async function api(path, { method = 'GET', auth = token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(base + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

if (!HAS_DB) {
  test('v6.9.34 customer creation PostgreSQL persistence gate', { skip: blocked }, () => {});
} else describe('v6.9.34 server-authoritative customer creation', { concurrency: false }, () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    const { runMigrations } = require('../src/migrate');
    await runMigrations();
    db = require('../src/db');
    const { app } = require('../server');
    server = await new Promise(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    base = `http://127.0.0.1:${server.address().port}`;
    const login = await api('/api/auth/login', { method: 'POST', auth: null, body: { username: USER, password: PASS } });
    assert.equal(login.status, 200);
    token = login.json.token;
    customerName = `v6934 Customer ${Date.now()} ${Math.random().toString(16).slice(2)}`;
  });

  after(async () => {
    if (customerId) {
      await db.query("DELETE FROM audit_log WHERE action='customer.created' AND entity_id=$1", [customerId]);
      await db.query('DELETE FROM customers WHERE id=$1', [customerId]);
    }
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('schema is authenticated and anonymous creation is rejected', async () => {
    const schema = await api('/api/customers/setup-schema');
    assert.equal(schema.status, 200);
    assert.deepEqual(schema.json.fields.filter(field => field.required).map(field => field.key), ['name']);
    const anonymous = await api('/api/customers', { method: 'POST', auth: null, body: { name: customerName } });
    assert.equal(anonymous.status, 401);
  });

  test('save returns the committed customer id and persisted server-owned values', async () => {
    const created = await api('/api/customers', {
      method: 'POST', body: { name: `  ${customerName}  `, hasFieldInventory: true, ownerId: 'spoofed' }
    });
    assert.equal(created.status, 201);
    customerId = created.json.customer.id;
    assert.ok(customerId);
    const row = (await db.query(
      `SELECT c.id,c.name,c.owner_id,c.has_field_inventory,u.username owner_username
         FROM customers c JOIN users u ON u.id=c.owner_id WHERE c.id=$1`, [customerId]
    )).rows[0];
    assert.equal(row.name, customerName);
    assert.equal(row.owner_username, USER);
    assert.equal(row.has_field_inventory, true);
    assert.notEqual(String(row.owner_id), 'spoofed');
  });

  test('customer survives a fresh list request and duplicate rule returns the authorized record', async () => {
    const list = await api('/api/customers');
    assert.equal(list.status, 200);
    assert.ok(list.json.some(customer => customer.id === customerId && customer.name === customerName));
    const duplicate = await api('/api/customers', { method: 'POST', body: { name: customerName.toUpperCase() } });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.json.code, 'CUSTOMER_DUPLICATE');
    assert.equal(duplicate.json.existingCustomer.id, customerId);
    const count = await db.query('SELECT COUNT(*)::int count FROM customers WHERE owner_id=(SELECT owner_id FROM customers WHERE id=$1) AND LOWER(name)=LOWER($2)', [customerId, customerName]);
    assert.equal(count.rows[0].count, 1);
  });
});
