'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  enqueueProspectSubmissionNotification,
  dispatchProspectSubmissionNotification,
  safeError
} = require('../src/shared/prospect-submission-notifications');

test('submission notification is enqueued idempotently inside the caller transaction', async () => {
  const calls = [];
  const client = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ id: 'notice-1', submission_id: 'submission-1', status: 'pending' }] }; } };
  const queued = await enqueueProspectSubmissionNotification(client, { submissionId: 'submission-1', recipientUserId: 'user-1' });
  assert.equal(queued.id, 'notice-1');
  assert.match(calls[0].sql, /ON CONFLICT\(submission_id\) DO NOTHING/);
  assert.deepEqual(calls[0].params, ['submission-1', 'user-1']);
});

function dispatchHarness(sendResult) {
  const writes = [];
  const transaction = async (fn) => fn({ query: async (sql, params) => {
    writes.push({ sql, params });
    if (/FROM prospect_submission_notifications n/.test(sql)) return { rows: [{
      id: 'notice-1', submission_id: 'submission-1', recipient_user_id: 'user-1',
      status: 'pending', attempt_count: 0, email: 'rep@example.test', username: 'Rep',
      company: 'Example Customer', answer_count: 4
    }] };
    return { rows: [], rowCount: 1 };
  } });
  const query = async (sql, params) => { writes.push({ sql, params }); return { rows: [], rowCount: 1 }; };
  const sends = [];
  const sendDiscoverySubmitted = async (...args) => { sends.push(args); if (sendResult instanceof Error) throw sendResult; return sendResult; };
  return { writes, sends, transaction, query, sendDiscoverySubmitted };
}

test('outbox delivery claims once and records provider success without customer answers', async () => {
  const harness = dispatchHarness({ ok: true, state: 'sent', providerMessageId: 'provider-1' });
  const result = await dispatchProspectSubmissionNotification({ ...harness, submissionId: 'submission-1', appUrl: 'https://example.test' });
  assert.equal(result.sent, true);
  assert.equal(harness.sends.length, 1);
  assert.deepEqual(harness.sends[0], ['rep@example.test', 'Rep', 'Example Customer', 4, 'https://example.test/?tab=disc']);
  assert.ok(harness.writes.some(call => /status='sending'/.test(call.sql)));
  assert.ok(harness.writes.some(call => /status='sent'/.test(call.sql)));
  assert.equal(JSON.stringify(harness.writes).includes('customer answers'), false);
});

test('email-provider failure remains durable and retryable without rolling back submission', async () => {
  const harness = dispatchHarness({ ok: false, state: 'failed', category: 'provider_unavailable' });
  const result = await dispatchProspectSubmissionNotification({ ...harness, submissionId: 'submission-1', appUrl: 'https://example.test' });
  assert.equal(result.sent, false);
  const failure = harness.writes.find(call => /status='failed'/.test(call.sql));
  assert.ok(failure);
  assert.equal(failure.params[1], 'provider_unavailable');
  assert.equal(safeError(null, new Error('line one\nline two')), 'line one line two');
});

test('production submit transaction owns snapshot audit and durable notification before response', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const route = server.slice(server.indexOf("app.post('/api/discovery/sessions/:token/submit'"), server.indexOf('/* ── Discovery access tracking'));
  assert.match(route, /enqueueProspectSubmissionNotification\(client/);
  assert.match(route, /INSERT INTO audit_log/);
  assert.match(route, /dispatchProspectSubmissionNotification/);
  assert.doesNotMatch(route, /Async: email the rep/);
});
