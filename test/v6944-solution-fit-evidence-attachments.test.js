'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const evidence = require('../src/shared/solution-fit-evidence');
const storage = require('../src/storage/r2-storage');

test('v6.9.44 extends the existing attachment foundation without a parallel table', () => {
  const prior = fs.readFileSync(path.join(root, 'migrations', '027_sales_teams_permissions.sql'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'migrations', '045_solution_fit_evidence_attachments.sql'), 'utf8');
  assert.match(prior, /CREATE TABLE IF NOT EXISTS handoff_attachments/);
  assert.doesNotMatch(migration, /CREATE TABLE\s+handoff_attachments/i);
  for (const field of ['context_type', 'context_id', 'original_filename', 'caption', 'evidence_category', 'status', 'removed_at', 'removed_by', 'deletion_status']) assert.match(migration, new RegExp(field));
});

test('file validation enforces type, extension, zero-byte and independent size ceilings', () => {
  assert.equal(evidence.validateFile({ originalFilename: 'photo.jpg', contentType: 'image/jpeg', sizeBytes: 1000 }).error, undefined);
  assert.equal(evidence.validateFile({ originalFilename: 'plan.pdf', contentType: 'application/pdf', sizeBytes: 10_000 }).error, undefined);
  assert.match(evidence.validateFile({ originalFilename: 'empty.png', contentType: 'image/png', sizeBytes: 0 }).error, /empty|unreadable/i);
  assert.match(evidence.validateFile({ originalFilename: 'script.exe', contentType: 'application/octet-stream', sizeBytes: 100 }).error, /not supported/i);
  assert.match(evidence.validateFile({ originalFilename: 'fake.jpg', contentType: 'application/pdf', sizeBytes: 100 }).error, /not supported/i);
  assert.match(evidence.validateFile({ originalFilename: 'large.jpg', contentType: 'image/jpeg', sizeBytes: evidence.IMAGE_MAX_BYTES + 1 }).error, /5 MB/i);
  assert.equal(evidence.validateFile({ originalFilename: 'large.pdf', contentType: 'application/pdf', sizeBytes: evidence.IMAGE_MAX_BYTES + 1 }).error, undefined);
  assert.match(evidence.validateFile({ originalFilename: 'too-large.pdf', contentType: 'application/pdf', sizeBytes: evidence.DOCUMENT_MAX_BYTES + 1 }).error, /25 MB/i);
});

test('stable process, gap and integration identities are required and display renames do not break context', () => {
  const state = {
    solutionScope: { primaryProduct: 'CIP', additionalProducts: [] },
    opportunity: { products: ['CIP'] },
    processes: [{ id: 'APP-STABLE-1', product: 'CIP', name: 'Receiving renamed', selected: true }],
    gaps: [{ id: 'GAP-STABLE-1', processId: 'APP-STABLE-1', gapDescription: 'Edited wording' }],
    interfaces: [{ id: 'INT-STABLE-1', source: 'ERP', target: 'Cloud Inventory' }]
  };
  assert.equal(evidence.validateContextAgainstState(state, evidence.normalizeContext('GENERAL_SOLUTION_FIT')), true);
  assert.equal(evidence.validateContextAgainstState(state, evidence.normalizeContext('APPLICATION_PROCESS', 'APP-STABLE-1')), true);
  assert.equal(evidence.validateContextAgainstState(state, evidence.normalizeContext('GAP', 'GAP-STABLE-1')), true);
  assert.equal(evidence.validateContextAgainstState(state, evidence.normalizeContext('INTEGRATION', 'INT-STABLE-1')), true);
  assert.equal(evidence.validateContextAgainstState(state, evidence.normalizeContext('APPLICATION_PROCESS', 'Receiving renamed')), false);
  assert.equal(evidence.normalizeContext('READINESS_ITEM', 'row-1'), null, 'readiness is deferred until it has a governed stable identity');
});

test('server-generated object keys prevent duplicate filename overwrite and path traversal', () => {
  const customerId = '11111111-1111-4111-8111-111111111111';
  const solutionFitId = '22222222-2222-4222-8222-222222222222';
  const one = storage.objectKey({ customerId, solutionFitId, attachmentId: '33333333-3333-4333-8333-333333333333', filename: '../../receiving.jpg' });
  const two = storage.objectKey({ customerId, solutionFitId, attachmentId: '44444444-4444-4444-8444-444444444444', filename: '../../receiving.jpg' });
  assert.notEqual(one, two);
  assert.match(one, /^customers\/11111111-1111-4111-8111-111111111111\/solution-fit\/22222222-2222-4222-8222-222222222222\/attachments\/33333333/);
  assert.doesNotMatch(one, /\.\.\//);
});

test('R2 presigning exposes only short-lived signed URLs and never exposes the secret', async () => {
  const env = { STORAGE_MODE: 'S3', S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com', S3_BUCKET: 'qa-private', S3_REGION: 'auto', S3_ACCESS_KEY_ID: 'ACCESS_FOR_TEST', S3_SECRET_ACCESS_KEY: 'SUPER_SECRET_TEST_VALUE' };
  const headers = new Headers({ 'content-length': '123', 'content-type': 'image/jpeg', etag: '"abc"' });
  const svc = storage.createR2Storage({ env, now: () => new Date('2026-10-23T12:00:00.000Z'), fetchImpl: async () => ({ ok: true, status: 200, headers }) });
  const upload = await svc.createUploadUrl({ key: 'customers/a/file.jpg' });
  assert.match(upload.url, /X-Amz-Algorithm=AWS4-HMAC-SHA256/);
  assert.match(upload.url, /X-Amz-Expires=600/);
  assert.doesNotMatch(upload.url, /SUPER_SECRET_TEST_VALUE/);
  assert.deepEqual(await svc.verifyObject({ key: 'customers/a/file.jpg' }), { sizeBytes: 123, contentType: 'image/jpeg', etag: 'abc' });
  assert.equal(svc.publicConfig().endpointHost, 'example.r2.cloudflarestorage.com');
  assert.equal(Object.prototype.hasOwnProperty.call(svc.publicConfig(), 'accessKeyId'), false);
});

test('storage configuration fails closed while the core Solution Fit remains importable', async () => {
  const svc = storage.createR2Storage({ env: {}, fetchImpl: async () => ({}) });
  assert.equal(svc.isAvailable(), false);
  await assert.rejects(() => svc.createUploadUrl({ key: 'x' }), /temporarily unavailable/i);
});

test('production UI exposes general, application and gap evidence with camera, multi-file and per-file states', () => {
  const ui = fs.readFileSync(path.join(root, 'public', 'solution-fit-evidence.js'), 'utf8');
  const fit = fs.readFileSync(path.join(root, 'public', 'solution-fit.js'), 'utf8');
  assert.match(ui, /capture=\\?"environment\\?"/);
  assert.match(ui, /data-evidence-file-input[^>]*multiple/);
  for (const state of ['Optimizing', 'Ready', 'Uploading', 'Complete', 'Failed']) assert.match(ui, new RegExp(state));
  assert.match(ui, /IMAGE_TARGET/);
  assert.match(ui, /canvas\.toBlob/);
  assert.match(ui, /createObjectURL/);
  assert.match(ui, /revokeObjectURL/);
  assert.match(fit, /GENERAL_SOLUTION_FIT/);
  assert.match(fit, /APPLICATION_PROCESS/);
  assert.match(fit, /evidenceControls\('GAP'/);
  assert.match(fit, /SolutionFitEvidence\?\.load/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
});

test('browser upload normalizes document MIME when the file chooser omits it', () => {
  const browser = require('../public/solution-fit-evidence');
  assert.equal(browser.canonicalContentType({ name: 'turnover.DOCX', type: '' }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(browser.canonicalContentType({ name: 'scope.xlsx', type: '' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(browser.canonicalContentType({ name: 'deck.pptx', type: '' }), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.equal(browser.canonicalContentType({ name: 'unsafe.exe', type: '' }), '');
  assert.match(browser.fileTypeError({ name: 'phone-photo.heic', type: 'image/heic' }), /HEIC\/HEIF.*JPEG or PNG/i);
  assert.equal(browser.fileTypeError({ name: 'field-photo.jpg', type: 'image/jpeg' }), '');
});

test('large-photo optimizer is bounded, orientation-aware, aspect-ratio preserving and strips source metadata', async () => {
  let bitmapOptions;
  const canvases = [];
  const fakeRoot = {
    document: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        const canvas = {
          width: 0, height: 0,
          getContext: () => ({ drawImage: () => {} }),
          toBlob(callback, type, quality) {
            const bytes = Math.max(256, Math.floor(canvas.width * canvas.height * quality * 0.45));
            callback(new Blob([Buffer.alloc(bytes)], { type }));
          }
        };
        canvases.push(canvas);
        return canvas;
      }
    }
  };
  const browser = require('../public/solution-fit-evidence').createForRoot(fakeRoot);
  const source = new File([Buffer.alloc(browser.IMAGE_LIMIT + 1024)], 'field-photo.jpg', { type: 'image/jpeg', lastModified: 1 });
  const result = await browser.optimizeImage(source, { createBitmap: async (_file, options) => { bitmapOptions = options; return { width: 6000, height: 3000, close() {} }; } });
  assert.equal(result.optimized, true);
  assert.equal(result.file.type, 'image/jpeg');
  assert.match(result.file.name, /-optimized\.jpg$/);
  assert.ok(result.file.size <= browser.IMAGE_TARGET);
  assert.ok(result.width <= 4096 && result.height <= 4096);
  assert.equal(result.width / result.height, 2);
  assert.deepEqual(bitmapOptions, { imageOrientation: 'from-image' });
  assert.equal(result.file.lastModified > source.lastModified, true);
  assert.ok(canvases.length <= 6, 'optimization must use bounded dimension passes');
});

test('documents bypass image optimization and unreadable oversized images fail clearly', async () => {
  const browser = require('../public/solution-fit-evidence').createForRoot({ document: {} });
  const documentFile = new File([Buffer.from('pdf')], 'evidence.pdf', { type: 'application/pdf' });
  const unchanged = await browser.optimizeImage(documentFile);
  assert.equal(unchanged.file, documentFile);
  await assert.rejects(() => browser.optimizeImage(new File([Buffer.alloc(browser.IMAGE_LIMIT + 1)], 'bad.jpg', { type: 'image/jpeg' }), { createBitmap: async () => { throw new Error('decode failed'); } }), /decode failed/);
});

test('attachment routes are mounted ahead of base handoff routes and storage failures are isolated', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const attachmentPosition = server.indexOf("require('./src/routes/solution-fit-attachments')");
  const handoffPosition = server.indexOf("app.use('/api/handoffs', handoffsRouter)");
  assert.ok(attachmentPosition > 0 && attachmentPosition < handoffPosition);
  assert.match(server, /STORAGE_CONNECT_ORIGINS/);
  assert.match(server, /cleanupStaleSolutionFitEvidence/);
});

test('upload signatures require create-only writes and bind the approved content type', async () => {
  const svc = storage.createR2Storage({ env: { STORAGE_MODE: 'S3', S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com', S3_BUCKET: 'qa-private', S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test' } });
  const image = await svc.createUploadUrl({ key: 'evidence/image.jpg', contentType: 'image/jpeg' });
  const document = await svc.createUploadUrl({ key: 'evidence/image.jpg', contentType: 'application/pdf' });
  assert.equal(new URL(image.url).searchParams.get('X-Amz-SignedHeaders'), 'content-type;host;if-none-match');
  assert.deepEqual(image.requiredHeaders, { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' });
  assert.notEqual(new URL(image.url).searchParams.get('X-Amz-Signature'), new URL(document.url).searchParams.get('X-Amz-Signature'));
});

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function evidencePayload(customer) { return { ok: true, json: async () => ({ solutionFitId: `fit-${customer}`, storage: { available: true }, attachments: [{ id: customer, caption: `private-${customer}` }] }) }; }

test('late evidence responses cannot replace another customer workspace', async () => {
  const pending = { A: deferred(), B: deferred() };
  const browser = require('../public/solution-fit-evidence').createForRoot({ apiFetch: url => pending[url.includes('/A/') ? 'A' : 'B'].promise });
  const first = browser.load({ customerId: 'A', canWrite: true });
  const second = browser.load({ customerId: 'B', canWrite: false });
  pending.B.resolve(evidencePayload('B')); await second;
  pending.A.resolve(evidencePayload('A')); await first;
  const state = browser.validateState();
  assert.equal(state.customerId, 'B'); assert.equal(state.solutionFitId, 'fit-B');
  assert.equal(state.canWrite, false); assert.deepEqual(state.attachments.map(row => row.id), ['B']);
});

test('reset invalidates evidence immediately before the next customer finishes loading', async () => {
  const response = deferred();
  const browser = require('../public/solution-fit-evidence').createForRoot({ apiFetch: () => response.promise });
  const loading = browser.load({ customerId: 'A', canWrite: true });
  browser.reset(); response.resolve(evidencePayload('A')); await loading;
  assert.equal(browser.validateState().customerId, '');
  assert.deepEqual(browser.validateState().attachments, []);
});

test('switching customers cancels the old upload queue and never completes into the new customer', async () => {
  const put = deferred(), putStarted = deferred(); const calls = []; const listeners = {};
  const button = { disabled: false, addEventListener: (_event, fn) => { listeners.upload = fn; } };
  const overlay = { innerHTML: '', remove() {}, querySelectorAll: () => [], querySelector: selector => selector === '[data-evidence-upload]' ? button : null };
  const browser = require('../public/solution-fit-evidence').createForRoot({
    document: { getElementById: () => overlay },
    apiFetch: async url => { calls.push(url); return url.endsWith('/initiate') ? { ok: true, json: async () => ({ uploadUrl: 'https://storage.invalid/test', attachmentId: 'one' }) } : evidencePayload(url.includes('/A/') ? 'A' : 'B'); },
    fetch: () => { putStarted.resolve(); return put.promise; }
  });
  await browser.load({ customerId: 'A', canWrite: true }); browser.open('GENERAL_SOLUTION_FIT');
  for (const name of ['one.pdf', 'two.pdf']) browser.validateState().queue.push({ file: new File(['pdf'], name, { type: 'application/pdf' }), caption: '', category: 'DOCUMENT', state: 'Ready' });
  const uploading = listeners.upload({ currentTarget: button }); await putStarted.promise;
  await browser.load({ customerId: 'B', canWrite: true }); put.resolve({ ok: true }); await uploading;
  assert.equal(calls.filter(url => url.endsWith('/initiate')).length, 1);
  assert.equal(calls.some(url => url.endsWith('/complete')), false);
  assert.equal(browser.validateState().customerId, 'B'); assert.equal(browser.validateState().solutionFitId, 'fit-B');
  assert.equal(browser.validateState().queue.length, 0);
});

test('stale evidence cleanup claims expired metadata before deletion and retains failed deletes for retry', async () => {
  const vm = require('node:vm'); const queries = [];
  const row = { id: 'stale', storage_key: 'private/stale' }; let deleted = false;
  const source = fs.readFileSync(path.join(root, 'src/jobs/attachmentCleanup.js'), 'utf8');
  const context = { module: { exports: {} }, require: name => name === '../db' ? { query: async (sql, params) => {
    queries.push({ sql, params });
    if (queries.length === 1) return { rows: [row], rowCount: 1 };
    if (sql.startsWith('SELECT')) return { rows: [row] };
    return { rows: [], rowCount: 1 };
  } } : { getEvidenceStorage: () => ({ isAvailable: () => true, deleteObject: async () => {
    assert.match(queries[0].sql, /UPDATE handoff_attachments/);
    assert.match(queries[0].sql, /upload_expires_at/);
    assert.match(queries[0].sql, /FOR UPDATE SKIP LOCKED/);
    deleted = true; throw new Error('storage unavailable');
  } }) } };
  vm.runInNewContext(source, context);
  const result = await context.module.exports.cleanupStaleSolutionFitEvidence();
  assert.equal(deleted, true); assert.equal(result.deletionRetries, 0);
  assert.equal(queries.some(entry => /deletion_status='DELETED'/.test(entry.sql)), false);
  assert.equal(queries.some(entry => /deletion_status='RETRY'/.test(entry.sql)), true);
});

test('withdrawing a waiting file during another upload prevents its upload', async () => {
  const put = deferred(), started = deferred(); const initiated = []; let uploadHandler;
  const button = { addEventListener: (_event, fn) => { uploadHandler = fn; } };
  const overlay = { remove() {}, querySelectorAll: () => [], querySelector: selector => selector === '[data-evidence-upload]' ? button : null };
  const browser = require('../public/solution-fit-evidence').createForRoot({ document: { getElementById: () => overlay },
    apiFetch: async (url, options) => { if (url.endsWith('/initiate')) { initiated.push(JSON.parse(options.body).originalFilename); return { ok: true, json: async () => ({ uploadUrl: 'https://storage.invalid/qa', attachmentId: 'qa' }) }; } return evidencePayload('A'); },
    fetch: () => { started.resolve(); return put.promise; }
  });
  await browser.load({ customerId: 'A', canWrite: true }); browser.open('GENERAL_SOLUTION_FIT');
  for (const name of ['one.pdf', 'withdrawn.pdf']) browser.validateState().queue.push({ file: new File(['pdf'], name, { type: 'application/pdf' }), caption: '', category: 'DOCUMENT', state: 'Ready' });
  const uploading = uploadHandler({ currentTarget: button }); await started.promise;
  browser.validateState().queue.splice(1, 1); put.resolve({ ok: true }); await uploading;
  assert.deepEqual(initiated, ['one.pdf']);
});

test('object verification requests uncompressed metadata so file size and ETag remain authoritative', async () => {
  const svc = storage.createR2Storage({ env: { STORAGE_MODE: 'S3', S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com', S3_BUCKET: 'qa-private', S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test' },
    fetchImpl: async (_url, options) => {
      const identity = new Headers(options.headers).get('accept-encoding') === 'identity';
      return { ok: true, status: 200, headers: new Headers(identity ? { 'content-length': '66', 'content-type': 'text/plain', etag: '"original"' } : { 'content-encoding': 'gzip', 'content-type': 'text/plain', etag: 'W/"compressed"' }) };
    }
  });
  assert.deepEqual(await svc.verifyObject({ key: 'qa/compressible.txt' }), { sizeBytes: 66, contentType: 'text/plain', etag: 'original' });
});
