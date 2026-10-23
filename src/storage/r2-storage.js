'use strict';

const crypto = require('crypto');

const DEFAULT_UPLOAD_TTL_SECONDS = 10 * 60;
const DEFAULT_DOWNLOAD_TTL_SECONDS = 5 * 60;

class StorageUnavailableError extends Error {
  constructor(message = 'Evidence storage is temporarily unavailable.') {
    super(message);
    this.name = 'StorageUnavailableError';
    this.status = 503;
    this.code = 'EVIDENCE_STORAGE_UNAVAILABLE';
  }
}

function trim(value) { return String(value || '').trim(); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function hmac(key, value, encoding) { return crypto.createHmac('sha256', key).update(value).digest(encoding); }
function amzDate(date) { return date.toISOString().replace(/[:-]|\.\d{3}/g, ''); }
function dateStamp(date) { return amzDate(date).slice(0, 8); }
function encode(value) { return encodeURIComponent(String(value)).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
function canonicalKey(key) { return String(key).split('/').map(encode).join('/'); }

function storageConfig(env = process.env) {
  const mode = trim(env.STORAGE_MODE).toUpperCase();
  const endpoint = trim(env.S3_ENDPOINT).replace(/\/+$/, '');
  const bucket = trim(env.S3_BUCKET);
  const region = trim(env.S3_REGION) || 'auto';
  const accessKeyId = trim(env.S3_ACCESS_KEY_ID);
  const secretAccessKey = trim(env.S3_SECRET_ACCESS_KEY);
  const available = mode === 'S3' && Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
  return Object.freeze({ mode, endpoint, bucket, region, accessKeyId, secretAccessKey, available });
}

function safeFilename(filename) {
  const name = trim(filename).replace(/[\\/\0-\x1f\x7f]+/g, '-').replace(/[^a-zA-Z0-9._ -]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-');
  return (name || 'evidence-file').slice(0, 120);
}

function objectKey({ customerId, solutionFitId, attachmentId, filename }) {
  const ids = [customerId, solutionFitId, attachmentId].map(value => trim(value));
  if (ids.some(value => !/^[0-9a-f-]{36}$/i.test(value))) throw new Error('Invalid evidence object identity.');
  return `customers/${ids[0]}/solution-fit/${ids[1]}/attachments/${ids[2]}/${safeFilename(filename)}`;
}

function createR2Storage({ env = process.env, fetchImpl = global.fetch, now = () => new Date() } = {}) {
  const config = storageConfig(env);
  if (typeof fetchImpl !== 'function') throw new StorageUnavailableError();

  function assertAvailable() {
    if (!config.available) throw new StorageUnavailableError();
  }

  function presign(method, key, expiresSeconds) {
    assertAvailable();
    const instant = now();
    const timestamp = amzDate(instant);
    const day = dateStamp(instant);
    const scope = `${day}/${config.region}/s3/aws4_request`;
    const endpoint = new URL(config.endpoint);
    const path = `/${encode(config.bucket)}/${canonicalKey(key)}`;
    const params = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${config.accessKeyId}/${scope}`,
      'X-Amz-Date': timestamp,
      'X-Amz-Expires': String(expiresSeconds),
      'X-Amz-SignedHeaders': 'host'
    };
    const canonicalQuery = Object.keys(params).sort().map(name => `${encode(name)}=${encode(params[name])}`).join('&');
    const canonicalRequest = [method, path, canonicalQuery, `host:${endpoint.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
    const kDate = hmac(`AWS4${config.secretAccessKey}`, day);
    const kRegion = hmac(kDate, config.region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    params['X-Amz-Signature'] = hmac(kSigning, stringToSign, 'hex');
    const query = Object.keys(params).sort().map(name => `${encode(name)}=${encode(params[name])}`).join('&');
    return `${endpoint.origin}${path}?${query}`;
  }

  async function request(method, key) {
    const response = await fetchImpl(presign(method, key, DEFAULT_DOWNLOAD_TTL_SECONDS), { method });
    if (!response.ok) {
      const error = new Error(`Evidence object ${method} failed with status ${response.status}.`);
      error.statusCode = response.status;
      throw error;
    }
    return response;
  }

  return Object.freeze({
    isAvailable: () => config.available,
    publicConfig: () => ({ mode: config.mode, endpointHost: config.endpoint ? new URL(config.endpoint).host : '', bucket: config.bucket, region: config.region, available: config.available }),
    createUploadUrl: async ({ key, expiresSeconds = DEFAULT_UPLOAD_TTL_SECONDS }) => ({ url: presign('PUT', key, expiresSeconds), expiresSeconds }),
    createDownloadUrl: async ({ key, expiresSeconds = DEFAULT_DOWNLOAD_TTL_SECONDS }) => ({ url: presign('GET', key, expiresSeconds), expiresSeconds }),
    verifyObject: async ({ key }) => {
      const response = await request('HEAD', key);
      return {
        sizeBytes: Number(response.headers.get('content-length') || 0),
        contentType: trim(response.headers.get('content-type')).split(';')[0].toLowerCase(),
        etag: trim(response.headers.get('etag')).replace(/^"|"$/g, '')
      };
    },
    deleteObject: async ({ key }) => { await request('DELETE', key); return { deleted: true }; }
  });
}

let singleton;
function getEvidenceStorage() {
  if (!singleton) singleton = createR2Storage();
  return singleton;
}
function resetEvidenceStorageForTests() { singleton = undefined; }

module.exports = {
  DEFAULT_UPLOAD_TTL_SECONDS,
  DEFAULT_DOWNLOAD_TTL_SECONDS,
  StorageUnavailableError,
  storageConfig,
  safeFilename,
  objectKey,
  createR2Storage,
  getEvidenceStorage,
  resetEvidenceStorageForTests
};
