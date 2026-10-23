'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createR2Storage, storageConfig } = require('../src/storage/r2-storage');

const required = ['STORAGE_MODE', 'S3_ENDPOINT', 'S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
const missing = required.filter(name => !String(process.env[name] || '').trim());
const blocked = missing.length ? `Real R2 credentials unavailable (${missing.join(', ')}) — v6.9.44 R2 lifecycle is NOT TESTED` : false;

test('real private R2 PUT, HEAD, GET, and DELETE lifecycle', { skip: blocked }, async () => {
  const config = storageConfig(process.env);
  assert.equal(config.available, true);
  assert.equal(config.bucket, 'cloud-inventory-discovery-staging');
  const storage = createR2Storage();
  const id = crypto.randomUUID();
  const key = `qa/v6.9.44/${new Date().toISOString().slice(0, 10)}/${id}/r2-lifecycle.txt`;
  const payload = Buffer.from(`Cloud Inventory v6.9.44 R2 QA ${id}`, 'utf8');
  let uploaded = false;
  try {
    const upload = await storage.createUploadUrl({ key, contentType: 'text/plain', expiresSeconds: 120 });
    const put = await fetch(upload.url, { method: 'PUT', headers: upload.requiredHeaders, body: payload });
    assert.equal(put.ok, true, `R2 PUT failed with ${put.status}`);
    uploaded = true;
    const overwrite = await fetch(upload.url, { method: 'PUT', headers: upload.requiredHeaders, body: Buffer.from('unverified replacement') });
    assert.equal(overwrite.status, 412, 'a reused upload URL must not overwrite verified evidence');
    const metadata = await storage.verifyObject({ key });
    assert.equal(metadata.sizeBytes, payload.length);
    assert.equal(metadata.contentType, 'text/plain');
    const download = await storage.createDownloadUrl({ key, expiresSeconds: 120 });
    const get = await fetch(download.url);
    assert.equal(get.ok, true, `R2 GET failed with ${get.status}`);
    assert.deepEqual(Buffer.from(await get.arrayBuffer()), payload);
  } finally {
    if (uploaded) await storage.deleteObject({ key });
  }
  const downloadAfterDelete = await storage.createDownloadUrl({ key, expiresSeconds: 60 });
  const missingObject = await fetch(downloadAfterDelete.url);
  assert.equal(missingObject.status, 404);
});
