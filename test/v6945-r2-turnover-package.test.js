'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { createR2Storage, storageConfig } = require('../src/storage/r2-storage');
const { buildPSTurnoverModel } = require('../src/shared/ps-turnover-model');
const { buildPSTurnoverPackage } = require('../src/exports/solution-fit-turnover-package');

const required = ['STORAGE_MODE', 'S3_ENDPOINT', 'S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
const missing = required.filter(name => !String(process.env[name] || '').trim());
const blocked = missing.length ? `Real R2 credentials unavailable (${missing.join(', ')}) — v6.9.45 PS Turnover R2 package is NOT TESTED` : false;

test('real private R2 evidence is streamed unchanged into the governed PS Turnover ZIP', { skip: blocked }, async t => {
  const storage = createR2Storage();
  const config = storageConfig(process.env);
  assert.equal(config.available, true);
  const runId = crypto.randomUUID();
  const objects = [
    { id: crypto.randomUUID(), filename: 'receiving.pdf', type: 'application/pdf', body: Buffer.from(`%PDF-1.4 Cloud Inventory v6.9.45 QA ${runId}`) },
    { id: crypto.randomUUID(), filename: 'receiving.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: Buffer.from(`PK\u0003\u0004Cloud Inventory v6.9.45 QA ${runId}`) }
  ].map(item => ({ ...item, key: `qa/v6.9.45/${new Date().toISOString().slice(0, 10)}/${runId}/${item.id}/${item.filename}` }));
  const uploaded = [];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-turnover-r2-'));
  let generated;
  t.after(async () => {
    if (generated) await generated.cleanup().catch(() => {});
    for (const item of uploaded) await storage.deleteObject({ key: item.key }).catch(() => {});
    fs.rmSync(temp, { recursive: true, force: true });
  });

  for (const item of objects) {
    const signed = await storage.createUploadUrl({ key: item.key, contentType: item.type, expiresSeconds: 120 });
    const put = await fetch(signed.url, { method: 'PUT', headers: signed.requiredHeaders, body: item.body });
    assert.equal(put.ok, true, `R2 PUT failed with ${put.status}`);
    uploaded.push(item);
  }

  const state = {
    opportunity: { customer: 'R2 Turnover QA', products: ['CIP'] },
    solutionScope: { primaryProduct: 'CIP', additionalProducts: [] },
    inventoryConfiguration: {}, lpnConfiguration: {}, printing: {}, architecture: {}, partner: {}, drivers: {}, turnover: {},
    processes: [{ id: 'R2-PROC-1', name: 'Receiving', product: 'CIP', group: 'Inbound', selected: true }],
    gaps: [], interfaces: []
  };
  const model = buildPSTurnoverModel({
    data: state, customerId: 'R2-CUSTOMER', solutionFitId: 'R2-FIT', customerName: 'R2 Turnover QA', primarySeName: 'QA SE',
    attachments: objects.map((item, index) => ({
      id: item.id, handoff_id: 'R2-FIT', customer_id: 'R2-CUSTOMER', context_type: 'APPLICATION_PROCESS', context_id: 'R2-PROC-1',
      original_filename: item.filename, content_type: item.type, file_size: item.body.length, caption: `R2 evidence ${index + 1}`,
      uploaded_by_name: 'QA Uploader', completed_at: '2026-10-23T12:00:00Z', storage_key: item.key, status: 'ACTIVE'
    }))
  });

  generated = await buildPSTurnoverPackage({ model, storage, tempDirectory: temp });
  const zip = await JSZip.loadAsync(fs.readFileSync(generated.filePath));
  assert.ok(zip.file('PS-Turnover.docx'));
  assert.ok(zip.file('Attachment-Manifest.csv'));
  for (const attachment of model.attachments) {
    const source = objects.find(item => item.id === attachment.id);
    assert.deepEqual(await zip.file(attachment.packagePath).async('nodebuffer'), source.body, `${attachment.originalFilename} must not be recompressed or altered`);
  }
  const manifest = await zip.file('Attachment-Manifest.csv').async('string');
  for (const item of objects) assert.match(manifest, new RegExp(item.id));
  assert.doesNotMatch(manifest, new RegExp(String(config.accessKeyId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(manifest, /X-Amz-Signature|X-Amz-Credential/);
});
