'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { validateHeaderValue } = require('node:http');
const { EventEmitter } = require('node:events');
const JSZip = require('jszip');
const {
  MANIFEST_COLUMNS,
  TurnoverIntegrityError,
  buildPSTurnoverModel,
  buildAttachmentManifestCsv,
  sanitizeZipSegment
} = require('../src/shared/ps-turnover-model');
const { buildSolutionFitTurnoverDocx } = require('../src/exports/solution-fit-turnover-docx');
const { buildPSTurnoverPackage, EvidenceUnavailableError } = require('../src/exports/solution-fit-turnover-package');
const { loadPSTurnoverModel, TurnoverAccessError } = require('../src/services/ps-turnover-service');

const root = path.join(__dirname, '..');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNkYGD4z8DAwMDAxAADAAoAAf8CBhYAAAAASUVORK5CYII=', 'base64');

function state() {
  return {
    opportunity: { customer: 'Acme', products: ['MEP', 'CIP'], stage: 'Stage 3' },
    solutionScope: { primaryProduct: 'MEP', additionalProducts: ['CIP'], erp: 'JDE', packageMode: 'standard' },
    inventoryConfiguration: {}, lpnConfiguration: {}, printing: {}, architecture: {}, partner: {}, drivers: {}, turnover: {},
    processes: [
      { id: 'PROC-MEP-CYCLE', product: 'MEP', erp: 'JDE', group: 'Inventory', name: 'Cycle Count', selected: true, demoStatus: 'Demonstrated', fit: 'Full fit', customerValidation: 'Customer validated' },
      { id: 'PROC-CIP-CYCLE', product: 'CIP', erp: '', group: 'Inventory', name: 'Cycle Count', selected: true, demoStatus: 'Discussed only', fit: 'Partial fit', customerValidation: 'Validation pending' }
    ],
    gaps: [{ id: 'GAP-001', processId: 'PROC-CIP-CYCLE', product: 'CIP', process: 'Cycle Count', gapDescription: 'Customer-specific approval', status: 'Open' }],
    interfaces: [{ id: 'INT-001', source: 'ERP', target: 'Cloud Inventory', object: 'Items' }]
  };
}

function row(id, contextType, contextId, filename, overrides = {}) {
  const contentType = filename.endsWith('.png') ? 'image/png' : 'application/pdf';
  const body = contentType === 'image/png' ? PNG : Buffer.from(`PDF-${id}`);
  return {
    id, handoff_id: 'FIT-A', customer_id: 'CUSTOMER-A', context_type: contextType,
    context_id: contextId || null, original_filename: filename, content_type: contentType,
    file_size: body.length, caption: `Caption ${id}`, evidence_category: contentType.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
    uploaded_by: `USER-${id}`, uploaded_by_name: `Uploader ${id}`, completed_at: '2026-10-23T12:30:00.000Z',
    storage_key: `private/${id}`, status: 'ACTIVE', removed_at: null, body, ...overrides
  };
}

function model(rows) {
  return buildPSTurnoverModel({
    data: state(), attachments: rows, customerId: 'CUSTOMER-A', solutionFitId: 'FIT-A',
    customerName: 'Acme / ../ Operations', accountExecutive: 'Current AE', primarySeId: 'SE-CURRENT',
    primarySeName: 'Current Primary SE', generatedAt: '2026-10-23T14:00:00.000Z'
  });
}

function fakeStorage(rows, missingId = '') {
  const byKey = new Map(rows.map(item => [item.storage_key, item]));
  return {
    async verifyObject({ key }) {
      const item = byKey.get(key);
      if (!item || item.id === missingId) throw Object.assign(new Error('not found'), { statusCode: 404 });
      return { sizeBytes: item.body.length, contentType: item.content_type, etag: item.id };
    },
    async getObjectStream({ key }) {
      const item = byKey.get(key);
      if (!item || item.id === missingId) throw Object.assign(new Error('not found'), { statusCode: 404 });
      return { stream: Readable.from(item.body), sizeBytes: item.body.length, contentType: item.content_type, etag: item.id };
    }
  };
}

test('canonical model filters non-active evidence and preserves stable application, gap and integration grouping', () => {
  const rows = [
    row('A1', 'GENERAL_SOLUTION_FIT', null, 'overview.png'),
    row('A2', 'APPLICATION_PROCESS', 'PROC-MEP-CYCLE', 'receiving.pdf'),
    row('A3', 'APPLICATION_PROCESS', 'PROC-CIP-CYCLE', 'receiving.pdf'),
    row('A4', 'GAP', 'GAP-001', 'gap.pdf'),
    row('A5', 'INTEGRATION', 'INT-001', 'integration.pdf'),
    row('REMOVED', 'GENERAL_SOLUTION_FIT', null, 'removed.pdf', { status: 'REMOVED', removed_at: '2026-10-23T13:00:00Z' }),
    row('PENDING', 'GENERAL_SOLUTION_FIT', null, 'pending.pdf', { status: 'PENDING' })
  ];
  const result = model(rows);
  assert.equal(result.attachments.length, 5);
  assert.equal(result.summary.photos, 1);
  assert.equal(result.summary.documents, 4);
  assert.equal(result.summary.applicationsWithEvidence, 2);
  assert.equal(result.summary.gapsWithEvidence, 1);
  const mep = result.attachments.find(item => item.id === 'A2');
  const cip = result.attachments.find(item => item.id === 'A3');
  assert.match(mep.packagePath, /^Evidence\/MEP\/JDE\/Inventory\/Cycle-Count-PROC-MEP-CYCLE\//);
  assert.match(cip.packagePath, /^Evidence\/CIP\/Inventory\/Cycle-Count-PROC-CIP-CYCLE\//);
  assert.notEqual(path.posix.dirname(mep.packagePath), path.posix.dirname(cip.packagePath));
  assert.equal(result.primarySeName, 'Current Primary SE');
  assert.equal(result.attachments[0].uploadedByName, 'Uploader A1', 'historical uploader is preserved independently');
});

test('model rejects cross-customer, cross-fit and unknown stable contexts', () => {
  assert.throws(() => model([row('X1', 'GENERAL_SOLUTION_FIT', null, 'x.pdf', { customer_id: 'CUSTOMER-B' })]), error => error instanceof TurnoverIntegrityError && error.code === 'CROSS_CUSTOMER_EVIDENCE');
  assert.throws(() => model([row('X2', 'GENERAL_SOLUTION_FIT', null, 'x.pdf', { handoff_id: 'FIT-B' })]), error => error instanceof TurnoverIntegrityError && error.code === 'CROSS_SOLUTION_FIT_EVIDENCE');
  assert.throws(() => model([row('X3', 'APPLICATION_PROCESS', 'DISPLAY-NAME-NOT-ID', 'x.pdf')]), /unknown application\/process/i);
});

test('manifest has governed columns, real sizes, UTC dates and RFC 4180 escaping', () => {
  const source = row('CSV1', 'GAP', 'GAP-001', 'gap,review.pdf', { caption: 'Line one, "quoted"\nLine two' });
  const result = model([source]);
  const csv = buildAttachmentManifestCsv(result);
  assert.equal(csv.replace(/^\uFEFF/, '').split('\r\n')[0], MANIFEST_COLUMNS.join(','));
  assert.match(csv, /"Line one, ""quoted""\nLine two"/);
  assert.match(csv, new RegExp(`,${source.body.length},`));
  assert.match(csv, /2026-10-23T12:30:00\.000Z/);
  assert.doesNotMatch(csv, /private\/CSV1|presign|secret/i);
});

test('ZIP path sanitizing blocks traversal, absolute paths and reserved names', () => {
  for (const unsafe of ['../secret', '..\\secret', '/absolute', 'C:\\windows', 'CON']) {
    const safe = sanitizeZipSegment(unsafe, 'Item');
    assert.doesNotMatch(safe, /\.\.|[\\/:*?"<>|]/);
    assert.ok(safe.length <= 80);
  }
});

test('duplicate filenames remain separate and deterministic inside a valid turnover package', async t => {
  const rows = [
    row('D1', 'GENERAL_SOLUTION_FIT', null, 'same.pdf'),
    row('D2', 'GENERAL_SOLUTION_FIT', null, 'same.pdf'),
    row('P1', 'APPLICATION_PROCESS', 'PROC-MEP-CYCLE', 'photo.png')
  ];
  const result = model(rows);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-test-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const generated = await buildPSTurnoverPackage({ model: result, storage: fakeStorage(rows), tempDirectory: temp });
  t.after(() => generated.cleanup());
  const zip = await JSZip.loadAsync(fs.readFileSync(generated.filePath));
  const names = Object.keys(zip.files);
  assert.ok(names.includes('PS-Turnover.docx'));
  assert.ok(names.includes('Attachment-Manifest.csv'));
  assert.ok(names.includes('Evidence/General/same.pdf'));
  assert.ok(names.includes('Evidence/General/same-2.pdf'));
  assert.ok(names.some(name => /Evidence\/MEP\/JDE\/Inventory\/Cycle-Count-PROC-MEP-CYCLE\/photo\.png$/.test(name)));
  assert.deepEqual(await zip.file('Evidence/General/same.pdf').async('nodebuffer'), rows[0].body);
  assert.equal(generated.includedAttachmentIds.length, 3);
});

test('generated suffixes and case collisions preserve every attachment and its bytes', async t => {
  const rows = ['same.pdf','same.pdf','same-2.pdf','SAME.PDF'].map((name,index) => row(`COLLISION-${index}`, 'GENERAL_SOLUTION_FIT', null, name));
  const result = model(rows);
  assert.equal(new Set(result.attachments.map(item => item.packagePath.toLowerCase())).size, rows.length);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-collisions-'));
  t.after(() => fs.rmSync(temp, { recursive:true, force:true }));
  const generated = await buildPSTurnoverPackage({ model:result, storage:fakeStorage(rows), tempDirectory:temp });
  for (const attachment of result.attachments) {
    const zip = await JSZip.loadAsync(fs.readFileSync(generated.filePath));
    assert.deepEqual(await zip.file(attachment.packagePath).async('nodebuffer'), rows.find(item => item.id === attachment.id).body);
  }
});

test('output sink failures reach the caller without terminating the server process', () => {
  const script = "const path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');const {buildPSTurnoverModel}=require('./src/shared/ps-turnover-model');const {buildPSTurnoverPackage}=require('./src/exports/solution-fit-turnover-package');buildPSTurnoverPackage({model:buildPSTurnoverModel({data:{}}),storage:{},tempDirectory:path.join(os.tmpdir(),'nonexistent-turnover-'+crypto.randomUUID()),docxBuilder:async()=>Buffer.from('docx')}).then(()=>{process.exitCode=3;},e=>{console.log('HANDLED',e.code);process.exitCode=e.code==='ENOENT'?0:2;});";
  const child = spawnSync(process.execPath, ['--unhandled-rejections=strict','-e',script], { cwd:root, encoding:'utf8', timeout:10000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /HANDLED ENOENT/);
});

test('valid Unicode customer names produce a safe HTTP download filename', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-unicode-'));
  t.after(() => fs.rmSync(temp, { recursive:true, force:true }));
  const result = { ...model([]), customerName:'O’Reilly 日本' };
  const generated = await buildPSTurnoverPackage({ model:result, storage:fakeStorage([]), tempDirectory:temp });
  assert.doesNotThrow(() => validateHeaderValue('Content-Disposition', `attachment; filename="${generated.filename}"`));
});

test('a sink failure aborts a pending object request and discards a late stream', async () => {
  const rows=[row('PENDING-GET','GENERAL_SOLUTION_FIT',null,'pending.pdf')],pending=deferredResult();let signal;
  const storage={...fakeStorage(rows),getObjectStream:options=>{signal=options.signal;return pending.promise;}};
  await assert.rejects(()=>buildPSTurnoverPackage({model:model(rows),storage,tempDirectory:path.join(os.tmpdir(),`absent-turnover-${require('crypto').randomUUID()}`)}),error=>error instanceof EvidenceUnavailableError);
  assert.equal(signal.aborted,true);
  const stream=Readable.from(Buffer.from('late'));pending.resolve({stream});
  await new Promise(setImmediate);assert.equal(stream.destroyed,true);
});

function deferredResult() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function browserFunction(file, start, end) { const source = fs.readFileSync(path.join(root,'public',file),'utf8'); return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))); }
function previewHarness(apiFetch) {
  const context = { apiFetch };
  const source = browserFunction('solution-fit.js','  async function loadTurnoverPackagePreview(){','  /* Tolerate handoffs');
  vm.runInNewContext("let customerId='A',workspaceLoadGeneration=1,turnoverPreviewRevision=0,turnoverPackagePreview=null;"+source+"this.preview={load:loadTurnoverPackagePreview,change:id=>{customerId=id;workspaceLoadGeneration++;turnoverPackagePreview=null;},value:()=>turnoverPackagePreview};",context);
  return context.preview;
}

test('late turnover previews cannot replace another customer or a newer preview', async () => {
  const requests = [];
  const browser = previewHarness(() => { const pending=deferredResult(); requests.push(pending); return pending.promise; });
  const payload = id => ({ ok:true, json:async()=>({ customerId:id }) });
  const first=browser.load(); browser.change('B'); const second=browser.load();
  requests[1].resolve(payload('B')); await second; requests[0].resolve(payload('A')); await first;
  assert.equal(browser.value().customerId,'B');
  const older=browser.load(),newer=browser.load(); requests[3].resolve(payload('new')); await newer; requests[2].resolve(payload('old')); await older;
  assert.equal(browser.value().customerId,'new');
});

test('switching customers while save is pending cancels the old package action', async () => {
  const saved=deferredResult(),calls=[];
  const context={flushSolutionFitSave:()=>saved.promise,loadTurnoverPackagePreview:async()=>{},renderApp:()=>{},window:{deServerDownload:async url=>{calls.push(url);return true;},SolutionFitEvidence:{validateState:()=>({queue:[]})}}};
  const source=browserFunction('solution-fit.js','  async function downloadTurnoverPackage(){','  function setDocType');
  vm.runInNewContext("let customerId='A',workspaceLoadGeneration=1,turnoverPackagePreview=null,turnoverPackageBusy=false;"+source+"this.action={download:downloadTurnoverPackage,change:()=>{customerId='B';workspaceLoadGeneration++;}};",context);
  const downloading=context.action.download();context.action.change();saved.resolve(true);await downloading;
  assert.deepEqual(calls,[]);
});

test('server download discards completed bytes after its workspace is invalidated', async () => {
  const body=deferredResult(),downloads=[];let current=true;
  const context={AbortController,setTimeout,clearTimeout,Blob,console,fetch:async()=>({ok:true,headers:new Headers(),blob:()=>body.promise}),deDownloadBlob:blob=>downloads.push(blob),showToast:()=>{}};
  vm.runInNewContext(browserFunction('deal-export.js','async function deServerDownload(','/* Open a clean print window'),context);
  const downloading=context.deServerDownload('/package','package.zip','Package',{isCurrent:()=>current});
  await Promise.resolve();current=false;body.resolve(new Blob(['zip'],{type:'application/zip'}));
  assert.equal(await downloading,false);assert.equal(downloads.length,0);
});

test('disconnecting during package generation aborts it and cleans a late generated file', async () => {
  const pending=deferredResult(),started=deferredResult();let handler,cleanupCalls=0,signal,headerWrites=0;
  const context={router:{get:(_path,fn)=>{handler=fn;}},Date,AbortController,loadPSTurnoverModel:async()=>({model:{solutionFitId:'fit'},turnover:{missing:[]}}),buildPSTurnoverPackage:options=>{signal=options.signal;started.resolve();return pending.promise;},getEvidenceStorage:()=>({}),fs:{readFileSync:()=>Buffer.alloc(0),createReadStream:()=>Readable.from(Buffer.from('zip'))},logoPath:'logo',log:async()=>{},console:{error:()=>{}},turnoverFailure:()=>{throw new Error('must not write a disconnected response');}};
  const source=fs.readFileSync(path.join(root,'src/routes/handoffs.js'),'utf8');
  vm.runInNewContext(source.slice(source.indexOf("router.get('/:customerId/turnover-package',"),source.indexOf("router.get('/:customerId/export-pdf',")),context);
  const res=new EventEmitter();res.destroyed=false;res.writableFinished=false;res.set=()=>{headerWrites++;return res;};
  const handling=handler({params:{customerId:'A'},user:{id:'U'}},res);await started.promise;
  res.destroyed=true;res.emit('close');pending.resolve({sizeBytes:3,filename:'x.zip',filePath:'tmp',cleanup:async()=>{cleanupCalls++;},includedAttachmentIds:[],evidenceCount:0});await handling;
  assert.equal(cleanupCalls,1);assert.equal(headerWrites,0);assert.equal(signal.aborted,true);
});

test('zero-evidence package still contains a turnover document and manifest', async t => {
  const result = model([]);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-zero-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const generated = await buildPSTurnoverPackage({ model: result, storage: fakeStorage([]), tempDirectory: temp });
  const zip = await JSZip.loadAsync(fs.readFileSync(generated.filePath));
  assert.ok(zip.file('PS-Turnover.docx'));
  assert.ok(zip.file('Attachment-Manifest.csv'));
  assert.equal(result.summary.totalEvidenceFiles, 0);
});

test('missing active storage object fails the package and leaves no completed ZIP', async t => {
  const rows = [row('MISSING', 'GENERAL_SOLUTION_FIT', null, 'missing.pdf')];
  const result = model(rows);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-missing-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  await assert.rejects(() => buildPSTurnoverPackage({ model: result, storage: fakeStorage(rows, 'MISSING'), tempDirectory: temp }), error => error instanceof EvidenceUnavailableError && error.attachmentId === 'MISSING');
  assert.deepEqual(fs.readdirSync(temp), []);
});

test('canonical loader authorizes first and snapshots only the exact saved Solution Fit attachment set', async () => {
  let calls = 0;
  const source = row('LOAD1', 'APPLICATION_PROCESS', 'PROC-MEP-CYCLE', 'saved.pdf');
  const result = await loadPSTurnoverModel({
    customerId: 'CUSTOMER-A',
    user: { id: 'SE-1', role: 'se', roleKeys: ['se'] },
    generatedAt: '2026-10-23T14:00:00.000Z',
    accessImpl: async () => ({ exists: true, allowed: true, customer: { id: 'CUSTOMER-A', name: 'Acme', owner_id: 'AE-1' } }),
    queryImpl: async () => {
      calls += 1;
      if (calls === 1) return { rows: [{ id: 'FIT-A', customer_id: 'CUSTOMER-A', data: state(), updated_at: '2026-10-23T13:00:00Z', primary_se_id: 'SE-CURRENT', primary_se_name: 'Current Primary SE', account_executive: 'Current AE' }] };
      return { rows: [source, row('REMOVED-LOAD', 'GENERAL_SOLUTION_FIT', null, 'removed.pdf', { status: 'REMOVED', removed_at: '2026-10-23T13:30:00Z' }), row('PENDING-LOAD', 'GENERAL_SOLUTION_FIT', null, 'pending.pdf', { status: 'PENDING' })] };
    }
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.model.attachments.map(item => item.id), ['LOAD1']);
  assert.equal(result.model.pendingAttachmentCount, 1);
  assert.equal(result.model.primarySeName, 'Current Primary SE');
  assert.equal(result.model.attachments[0].uploadedByName, 'Uploader LOAD1');

  let queried = false;
  await assert.rejects(() => loadPSTurnoverModel({
    customerId: 'CUSTOMER-A', user: { id: 'OUTSIDER', role: 'rep', roleKeys: ['rep'] },
    accessImpl: async () => ({ exists: true, allowed: false }),
    queryImpl: async () => { queried = true; return { rows: [] }; }
  }), error => error instanceof TurnoverAccessError && error.status === 403);
  assert.equal(queried, false, 'unauthorized requests must fail before saved evidence is queried');
});

test('production loader uses a repeatable-read read-only transaction for one coherent saved snapshot', async () => {
  const source = row('SNAPSHOT1', 'GENERAL_SOLUTION_FIT', null, 'snapshot.pdf');
  const statements = [];
  const transactionImpl = async callback => callback({
    async query(statement) {
      statements.push(statement);
      if (/^SET TRANSACTION/.test(statement)) return { rows: [] };
      if (/FROM handoffs h/.test(statement)) return { rows: [{ id: 'FIT-A', customer_id: 'CUSTOMER-A', data: state(), updated_at: '2026-10-23T13:00:00Z', primary_se_id: 'SE-CURRENT', primary_se_name: 'Current Primary SE', account_executive: 'Current AE' }] };
      if (/FROM handoff_attachments a/.test(statement)) return { rows: [source] };
      throw new Error(`Unexpected snapshot query: ${statement}`);
    }
  });
  const loaded = await loadPSTurnoverModel({
    customerId: 'CUSTOMER-A', user: { id: 'SE-1', role: 'se', roleKeys: ['se'] }, transactionImpl,
    accessImpl: async (_user, _customerId, _mode, scopedQuery) => {
      assert.equal(typeof scopedQuery, 'function');
      return { exists: true, allowed: true, customer: { id: 'CUSTOMER-A', name: 'Acme', owner_id: 'AE-1' } };
    }
  });
  assert.match(statements[0], /REPEATABLE READ READ ONLY/);
  assert.deepEqual(loaded.model.attachments.map(item => item.id), ['SNAPSHOT1']);
});

test('Word-builder and ZIP-stream failures never leave a downloadable partial package', async t => {
  const rows = [row('FAIL1', 'GENERAL_SOLUTION_FIT', null, 'failure.pdf')];
  const result = model(rows);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-failure-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  await assert.rejects(() => buildPSTurnoverPackage({
    model: result,
    storage: fakeStorage(rows),
    tempDirectory: temp,
    docxBuilder: async () => { throw new Error('controlled Word builder failure'); }
  }), /controlled Word builder failure/);
  assert.deepEqual(fs.readdirSync(temp), []);

  const streamFailure = {
    async verifyObject() { return { sizeBytes: rows[0].body.length, contentType: rows[0].content_type }; },
    async getObjectStream() {
      return {
        sizeBytes: rows[0].body.length,
        contentType: rows[0].content_type,
        stream: Readable.from((async function *broken() { throw new Error('controlled evidence stream failure'); })())
      };
    }
  };
  await assert.rejects(() => buildPSTurnoverPackage({ model: result, storage: streamFailure, tempDirectory: temp }), error => error instanceof EvidenceUnavailableError);
  assert.deepEqual(fs.readdirSync(temp), []);
});

test('meaningful 25-file evidence package streams to disk and preserves every authoritative byte', async t => {
  const rows = Array.from({ length: 25 }, (_, index) => row(`PERF-${String(index + 1).padStart(2, '0')}`, 'GENERAL_SOLUTION_FIT', null, `evidence-${index + 1}.pdf`, { body: Buffer.alloc(64 * 1024, index) }));
  for (const item of rows) item.file_size = item.body.length;
  const result = model(rows);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-volume-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const beforeHeap = process.memoryUsage().heapUsed;
  const started = Date.now();
  const generated = await buildPSTurnoverPackage({ model: result, storage: fakeStorage(rows), tempDirectory: temp });
  const durationMs = Date.now() - started;
  const heapDeltaBytes = process.memoryUsage().heapUsed - beforeHeap;
  const zip = await JSZip.loadAsync(fs.readFileSync(generated.filePath));
  const evidenceNames = Object.keys(zip.files).filter(name => name.startsWith('Evidence/') && !name.endsWith('/'));
  assert.equal(evidenceNames.length, 25);
  for (const item of result.attachments) assert.deepEqual(await zip.file(item.packagePath).async('nodebuffer'), rows.find(rowItem => rowItem.id === item.id).body);
  t.diagnostic(`25-file package: ${result.summary.totalEvidenceSizeBytes} source bytes, ${generated.sizeBytes} ZIP bytes, ${durationMs} ms, heap delta ${heapDeltaBytes} bytes`);
});

test('turnover Word uses the canonical model, internal classification, evidence appendix and selected previews', async () => {
  const rows = [row('IMG1', 'APPLICATION_PROCESS', 'PROC-MEP-CYCLE', 'photo.png')];
  const result = model(rows);
  const buffer = await buildSolutionFitTurnoverDocx({ model: result, previews: new Map([['IMG1', { data: PNG, width: 2, height: 2 }]]) });
  const docx = await JSZip.loadAsync(buffer);
  const xml = await docx.file('word/document.xml').async('string');
  assert.match(xml, /CONFIDENTIAL — INTERNAL USE ONLY/);
  assert.match(xml, /Evidence and attachments appendix/);
  assert.match(xml, /Current Primary SE/);
  assert.match(xml, /Cycle Count/);
  assert.match(xml, /Caption IMG1/);
  assert.ok(Object.keys(docx.files).some(name => /^word\/media\//.test(name)), 'selected photo preview must be embedded');
});

test('production UI keeps one governed package action, save boundary, progress, pending warning and non-PDF download types', () => {
  const ui = fs.readFileSync(path.join(root, 'public', 'solution-fit.js'), 'utf8');
  const downloads = fs.readFileSync(path.join(root, 'public', 'deal-export.js'), 'utf8');
  assert.match(ui, /Download PS Turnover Package/);
  assert.match(ui, /Preparing turnover package/);
  assert.match(ui, /flushSolutionFitSave/);
  assert.match(ui, /still in progress or incomplete and will not be included/);
  assert.match(ui, /turnover-package\/preview/);
  assert.match(downloads, /application\/zip/);
  assert.match(downloads, /wordprocessingml\.document/);
});
