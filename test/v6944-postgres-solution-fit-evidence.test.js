'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.44 Solution Fit evidence PostgreSQL integration is NOT TESTED';
let db, appServer, objectServer, base, objectBase, adminToken, seToken, ownerToken, outsiderToken, ids = {}, objects = new Map();

function listen(server) { return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server))); }
function close(server) { return server ? new Promise(resolve => server.close(resolve)) : Promise.resolve(); }
function collect(req) { return new Promise((resolve, reject) => { const parts = []; req.on('data', part => parts.push(part)); req.on('end', () => resolve(Buffer.concat(parts))); req.on('error', reject); }); }

async function api(route, { method = 'GET', token = adminToken, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }; if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, headers: response.headers, json: await response.json().catch(() => null) };
}

if (!HAS_DB) test('v6.9.44 PostgreSQL + private object-storage attachment lifecycle gate', { skip: blocked }, () => {});
else describe('v6.9.44 governed Solution Fit evidence against disposable PostgreSQL and object storage', { concurrency: false }, () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`, password = `Evidence-${suffix}!`;

  before(async () => {
    objectServer = await listen(http.createServer(async (req, res) => {
      const key = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'PUT') {
        if (req.headers['if-none-match'] === '*' && objects.has(key)) { res.writeHead(412); return res.end(); }
        const body = await collect(req); objects.set(key, { body, contentType: String(req.headers['content-type'] || 'application/octet-stream') }); res.writeHead(200, { ETag: '"qa-etag"' }); return res.end();
      }
      const object = objects.get(key);
      if (req.method === 'HEAD') { if (!object) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Length': object.body.length, 'Content-Type': object.contentType, ETag: '"qa-etag"' }); return res.end(); }
      if (req.method === 'GET') { if (!object) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Length': object.body.length, 'Content-Type': object.contentType }); return res.end(object.body); }
      if (req.method === 'DELETE') { objects.delete(key); res.writeHead(204); return res.end(); }
      res.writeHead(405); res.end();
    }));
    objectBase = `http://127.0.0.1:${objectServer.address().port}`;
    process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = process.env.JWT_SECRET || `evidence-secret-${suffix}`;
    process.env.STORAGE_MODE = 'S3'; process.env.S3_ENDPOINT = objectBase; process.env.S3_BUCKET = 'qa-private'; process.env.S3_REGION = 'auto'; process.env.S3_ACCESS_KEY_ID = 'QA_ACCESS'; process.env.S3_SECRET_ACCESS_KEY = 'QA_SECRET';
    await require('../src/migrate').runMigrations(); db = require('../src/db');
    const bcrypt = require('bcrypt'), hash = await bcrypt.hash(password, 8);
    async function user(label, role, roles) { return (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active) VALUES($1,$2,$3,$4,$5,FALSE,TRUE) RETURNING id,username`, [`${label}_${suffix}@example.invalid`, `${label}_${suffix}`, hash, role, roles])).rows[0]; }
    ids.admin = await user('evidence_admin', 'admin', ['admin']); ids.se = await user('evidence_se', 'se', ['se']); ids.owner = await user('evidence_owner', 'rep', ['rep']); ids.outsider = await user('evidence_outsider', 'rep', ['rep']);
    ids.customer = (await db.query(`INSERT INTO customers(name,owner_id,created_by,status) VALUES($1,$2,$2,'active') RETURNING id,name`, [`Evidence Customer ${suffix}`, ids.owner.id])).rows[0];
    const { app } = require('../server'); appServer = await listen(http.createServer(app)); base = `http://127.0.0.1:${appServer.address().port}`;
    async function login(user) { const result = await api('/api/auth/login', { method: 'POST', token: null, body: { username: user.username, password } }); assert.equal(result.status, 200); return result.json.token; }
    adminToken = await login(ids.admin); seToken = await login(ids.se); ownerToken = await login(ids.owner); outsiderToken = await login(ids.outsider);
    const data = { opportunity: { customer: ids.customer.name, products: ['CIP'] }, solutionScope: { primaryProduct: 'CIP', additionalProducts: [] }, processes: [{ id: 'APP-EVIDENCE-1', name: 'Receiving', product: 'CIP', selected: true }], gaps: [{ id: 'GAP-EVIDENCE-1', processId: 'APP-EVIDENCE-1', need: 'Label evidence' }], interfaces: [{ id: 'INT-EVIDENCE-1', source: 'ERP', target: 'Cloud Inventory' }] };
    const created = await api(`/api/handoffs/${ids.customer.id}`, { method: 'POST', body: { data } }); assert.equal(created.status, 201); ids.handoff = created.json.id;
  });

  after(async () => {
    await close(appServer); await close(objectServer);
    if (db) { await db.query('DELETE FROM customers WHERE id=$1', [ids.customer.id]).catch(() => {}); await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[ids.admin.id, ids.se.id, ids.owner.id, ids.outsider.id]]).catch(() => {}); await db.pool?.end?.(); }
  });

  async function upload({ contextType, contextId, filename = 'receiving.jpg', contentType = 'image/jpeg', bytes = Buffer.from('qa-image-evidence') } = {}) {
    const initiated = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body: { contextType, contextId, originalFilename: filename, contentType, sizeBytes: bytes.length, caption: `${contextType} caption`, evidenceCategory: contentType.startsWith('image/') ? 'PHOTO' : 'DOCUMENT' } });
    assert.equal(initiated.status, 201, JSON.stringify(initiated.json));
    const put = await fetch(initiated.json.uploadUrl, { method: 'PUT', headers: initiated.json.requiredHeaders, body: bytes }); assert.equal(put.status, 200);
    const completed = await api(`/api/handoffs/${ids.customer.id}/attachments/${initiated.json.attachmentId}/complete`, { method: 'POST', token: seToken, body: {} }); assert.equal(completed.status, 200, JSON.stringify(completed.json));
    return completed.json.attachment;
  }

  test('authorization and context validation fail closed before object upload', async () => {
    const body = { contextType: 'APPLICATION_PROCESS', contextId: 'APP-EVIDENCE-1', originalFilename: 'photo.jpg', contentType: 'image/jpeg', sizeBytes: 3 };
    assert.equal((await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: ownerToken, body })).status, 403, 'read-only owner cannot upload');
    assert.equal((await api(`/api/handoffs/${ids.customer.id}/attachments`, { token: outsiderToken })).status, 403, 'unrelated Rep cannot view');
    const invalid = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body: { ...body, contextId: 'Receiving' } }); assert.equal(invalid.status, 400);
    const executable = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body: { ...body, originalFilename: 'malware.exe', contentType: 'application/octet-stream' } }); assert.equal(executable.status, 400);
    const oversized = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body: { ...body, sizeBytes: 5 * 1024 * 1024 + 1 } }); assert.equal(oversized.status, 400);
  });

  test('interrupted and metadata-mismatched uploads never become active and retry is idempotent', async () => {
    const body = { contextType: 'APPLICATION_PROCESS', contextId: 'APP-EVIDENCE-1', originalFilename: 'interrupted.jpg', contentType: 'image/jpeg', sizeBytes: 3, evidenceCategory: 'PHOTO' };
    const initiated = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body });
    assert.equal(initiated.status, 201);
    const absent = await api(`/api/handoffs/${ids.customer.id}/attachments/${initiated.json.attachmentId}/complete`, { method: 'POST', token: seToken, body: {} });
    assert.equal(absent.status, 422);
    const retry = await api(`/api/handoffs/${ids.customer.id}/attachments/${initiated.json.attachmentId}/retry`, { method: 'POST', token: seToken, body: {} });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.attachmentId, initiated.json.attachmentId);
    assert.equal((await fetch(retry.json.uploadUrl, { method: 'PUT', headers: retry.json.requiredHeaders, body: Buffer.from('four') })).status, 200);
    const mismatch = await api(`/api/handoffs/${ids.customer.id}/attachments/${initiated.json.attachmentId}/complete`, { method: 'POST', token: seToken, body: {} });
    assert.equal(mismatch.status, 422);
    const row = (await db.query(`SELECT status,completed_at FROM handoff_attachments WHERE id=$1`, [initiated.json.attachmentId])).rows[0];
    assert.equal(row.status, 'FAILED');
    assert.equal(row.completed_at, null);
  });

  test('multiple process and gap attachments with duplicate filenames persist independently', async () => {
    const one = await upload({ contextType: 'APPLICATION_PROCESS', contextId: 'APP-EVIDENCE-1' });
    const two = await upload({ contextType: 'APPLICATION_PROCESS', contextId: 'APP-EVIDENCE-1' });
    const gap = await upload({ contextType: 'GAP', contextId: 'GAP-EVIDENCE-1' });
    assert.notEqual(one.id, two.id); ids.one = one.id; ids.two = two.id; ids.gap = gap.id;
    const rows = await db.query(`SELECT id,storage_key,original_filename,status,context_type,context_id FROM handoff_attachments WHERE id=ANY($1::uuid[]) ORDER BY id`, [[one.id, two.id, gap.id]]);
    assert.equal(rows.rowCount, 3); assert.equal(new Set(rows.rows.map(row => row.storage_key)).size, 3); assert.ok(rows.rows.every(row => row.original_filename === 'receiving.jpg' && row.status === 'ACTIVE'));
    assert.equal(rows.rows.filter(row => row.context_type === 'APPLICATION_PROCESS').length, 2);
    const listed = await api(`/api/handoffs/${ids.customer.id}/attachments`, { token: ownerToken }); assert.equal(listed.status, 200); assert.equal(listed.json.attachments.length, 3); assert.equal(listed.json.storage.available, true); assert.equal(JSON.stringify(listed.json).includes('storage_key'), false);
  });

  test('renaming display text preserves stable evidence relationships', async () => {
    const loaded = await api(`/api/handoffs/${ids.customer.id}`, { token: seToken }); loaded.json.data.processes[0].name = 'Receiving — renamed'; loaded.json.data.gaps[0].gapDescription = 'Edited description';
    assert.equal((await api(`/api/handoffs/${ids.customer.id}`, { method: 'PUT', token: seToken, body: { data: loaded.json.data } })).status, 200);
    const listed = await api(`/api/handoffs/${ids.customer.id}/attachments`, { token: seToken }); assert.equal(listed.json.attachments.find(row => row.id === ids.one).contextId, 'APP-EVIDENCE-1'); assert.equal(listed.json.attachments.find(row => row.id === ids.gap).contextId, 'GAP-EVIDENCE-1');
  });

  test('authorized short-lived download works and metadata does not expose credentials', async () => {
    const download = await api(`/api/handoffs/${ids.customer.id}/attachments/${ids.one}/download`, { token: ownerToken }); assert.equal(download.status, 200); assert.match(download.json.url, /X-Amz-Expires=300/); assert.doesNotMatch(download.json.url, /QA_SECRET/);
    const object = await fetch(download.json.url); assert.equal(object.status, 200); assert.equal(Buffer.from(await object.arrayBuffer()).toString(), 'qa-image-evidence');
    assert.equal((await api(`/api/handoffs/${ids.customer.id}/attachments/${ids.one}/download`, { token: outsiderToken })).status, 403);
  });

  test('customer ownership reassignment preserves attachment context and uploader attribution', async () => {
    await db.query('UPDATE customers SET owner_id=$2 WHERE id=$1', [ids.customer.id, ids.outsider.id]);
    assert.equal((await api(`/api/handoffs/${ids.customer.id}/attachments/${ids.one}/download`, { token: ownerToken })).status, 403);
    assert.equal((await api(`/api/handoffs/${ids.customer.id}/attachments/${ids.one}/download`, { token: outsiderToken })).status, 200);
    const row = (await db.query('SELECT customer_id,handoff_id,context_type,context_id,uploaded_by FROM handoff_attachments WHERE id=$1', [ids.one])).rows[0];
    assert.equal(row.customer_id, ids.customer.id); assert.equal(row.handoff_id, ids.handoff); assert.equal(row.context_id, 'APP-EVIDENCE-1'); assert.equal(row.uploaded_by, ids.se.id);
    await db.query('UPDATE customers SET owner_id=$2 WHERE id=$1', [ids.customer.id, ids.owner.id]);
  });

  test('removing one attachment preserves the other and records immutable attribution', async () => {
    const removed = await api(`/api/handoffs/${ids.customer.id}/attachments/${ids.one}`, { method: 'DELETE', token: seToken }); assert.equal(removed.status, 200); assert.equal(removed.json.removed, true);
    const listed = await api(`/api/handoffs/${ids.customer.id}/attachments`, { token: seToken }); assert.equal(listed.json.attachments.length, 2); assert.ok(listed.json.attachments.some(row => row.id === ids.two)); assert.ok(listed.json.attachments.some(row => row.id === ids.gap));
    assert.equal((await api(`/api/handoffs/${ids.customer.id}/attachments/${ids.one}/download`, { token: ownerToken })).status, 404);
    const audit = (await db.query(`SELECT uploaded_by,removed_by,removed_at,status,deletion_status FROM handoff_attachments WHERE id=$1`, [ids.one])).rows[0]; assert.equal(audit.uploaded_by, ids.se.id); assert.equal(audit.removed_by, ids.se.id); assert.ok(audit.removed_at); assert.equal(audit.status, 'REMOVED'); assert.equal(audit.deletion_status, 'DELETED');
  });

  test('Admin Cleanup reports only active attachment dependencies', async () => {
    const preview = await api('/api/admin/cleanup/preview', { method: 'POST', body: { mode: 'selected', search: ids.customer.name, filters: { types: ['handoff'], status: 'active', quickRange: 'all' }, selection: { handoffIds: [ids.handoff] } } });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    const fit = preview.json.records?.handoffs?.find(row => row.id === ids.handoff) || preview.json.handoffs?.find(row => row.id === ids.handoff);
    assert.ok(fit); assert.equal(fit.dependencies.solutionFitAttachments, 2);
  });

  test('cleanup preserves renewed and active uploads while atomically removing expired pending evidence', async () => {
    const body = { contextType: 'GENERAL_SOLUTION_FIT', originalFilename: 'expired.jpg', contentType: 'image/jpeg', sizeBytes: 3 };
    const expired = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body });
    const renewed = await api(`/api/handoffs/${ids.customer.id}/attachments/initiate`, { method: 'POST', token: seToken, body });
    assert.equal(expired.status, 201); assert.equal(renewed.status, 201);
    await db.query(`UPDATE handoff_attachments SET created_at=NOW()-INTERVAL '25 hours',upload_expires_at=NOW()-INTERVAL '1 hour' WHERE id=$1`, [expired.json.attachmentId]);
    await db.query(`UPDATE handoff_attachments SET created_at=NOW()-INTERVAL '25 hours' WHERE id=$1`, [renewed.json.attachmentId]);
    await db.query(`UPDATE handoff_attachments SET created_at=NOW()-INTERVAL '25 hours',upload_expires_at=NOW()-INTERVAL '1 hour' WHERE id=$1`, [ids.two]);
    const { cleanupStaleSolutionFitEvidence } = require('../src/jobs/attachmentCleanup');
    await cleanupStaleSolutionFitEvidence();
    const rows = (await db.query('SELECT id,status,deletion_status FROM handoff_attachments WHERE id=ANY($1::uuid[])', [[expired.json.attachmentId, renewed.json.attachmentId, ids.two]])).rows;
    assert.equal(rows.find(row => row.id === expired.json.attachmentId).status, 'REMOVED');
    assert.equal(rows.find(row => row.id === expired.json.attachmentId).deletion_status, 'DELETED');
    assert.equal(rows.find(row => row.id === renewed.json.attachmentId).status, 'PENDING');
    assert.equal(rows.find(row => row.id === ids.two).status, 'ACTIVE');
    const complete = await api(`/api/handoffs/${ids.customer.id}/attachments/${expired.json.attachmentId}/complete`, { method: 'POST', token: seToken, body: {} });
    assert.equal(complete.status, 404);
  });
});
