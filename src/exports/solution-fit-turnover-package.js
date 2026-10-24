'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const archiver = require('archiver');
const sharp = require('sharp');
const { buildSolutionFitTurnoverDocx } = require('./solution-fit-turnover-docx');
const { buildAttachmentManifestCsv } = require('../shared/ps-turnover-model');
const { safeFile } = require('../shared/output-brand');

const PREVIEWS_PER_CONTEXT = 2;
const PREVIEW_SOURCE_LIMIT_BYTES = 5 * 1024 * 1024;
const OBJECT_TIMEOUT_MS = 60 * 1000;

class EvidenceUnavailableError extends Error {
  constructor(attachmentId, detail = '') {
    super('Evidence file is unavailable.');
    this.name = 'EvidenceUnavailableError';
    this.status = 409;
    this.code = 'EVIDENCE_FILE_UNAVAILABLE';
    this.attachmentId = attachmentId;
    this.detail = detail;
  }
}

function nodeStream(stream) {
  if (stream && typeof stream.pipe === 'function') return stream;
  if (stream && typeof stream.getReader === 'function') return Readable.fromWeb(stream);
  throw new Error('Evidence object is not a readable stream.');
}

function timedController(timeoutMs = OBJECT_TIMEOUT_MS, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return { controller, stop: () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); } };
}

async function preflightEvidence(model, storage, { signal } = {}) {
  for (const attachment of model.attachments) {
    signal?.throwIfAborted();
    const timed = timedController(OBJECT_TIMEOUT_MS, signal);
    try {
      const metadata = await storage.verifyObject({ key: attachment.storageKey, signal: timed.controller.signal });
      if (Number(metadata.sizeBytes) !== attachment.sizeBytes || (metadata.contentType && metadata.contentType !== attachment.contentType)) {
        throw new Error('Stored object metadata does not match the active attachment record.');
      }
      if (attachment.objectEtag && metadata.etag && metadata.etag !== attachment.objectEtag) throw new Error('Stored object identity does not match the active attachment record.');
    } catch (error) {
      throw new EvidenceUnavailableError(attachment.id, error.message);
    } finally {
      timed.stop();
    }
  }
}

async function streamToBuffer(stream, limitBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of nodeStream(stream)) {
    total += chunk.length;
    if (total > limitBytes) throw new Error('Evidence preview source exceeded the safe image limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

async function buildPhotoPreviews(model, storage, { signal } = {}) {
  const previews = new Map();
  for (const group of model.groups) {
    const images = group.attachments.filter(item => /^image\/(jpeg|png)$/.test(item.contentType)).slice(0, PREVIEWS_PER_CONTEXT);
    for (const attachment of images) {
      signal?.throwIfAborted();
      const timed = timedController(OBJECT_TIMEOUT_MS, signal);
      try {
        const object = await storage.getObjectStream({ key: attachment.storageKey, signal: timed.controller.signal });
        const source = await streamToBuffer(object.stream, PREVIEW_SOURCE_LIMIT_BYTES);
        const image = sharp(source, { failOn: 'error' }).rotate().resize({ width: 1100, height: 700, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true });
        const rendered = await image.toBuffer({ resolveWithObject: true });
        previews.set(attachment.id, { data: rendered.data, width: rendered.info.width || 900, height: rendered.info.height || 600, contentType: 'image/jpeg' });
      } catch (error) {
        throw new EvidenceUnavailableError(attachment.id, error.message);
      } finally {
        timed.stop();
      }
    }
  }
  return previews;
}

function appendStream(archive, source, name) {
  return new Promise((resolve, reject) => {
    const expected = String(name);
    const onEntry = entry => {
      if (entry.name === expected) {
        cleanup();
        resolve();
      }
    };
    const onError = error => { cleanup(); reject(error); };
    const cleanup = () => {
      archive.off('entry', onEntry);
      archive.off('error', onError);
      source.off?.('error', onError);
    };
    archive.on('entry', onEntry);
    archive.once('error', onError);
    source.once?.('error', onError);
    archive.append(source, { name: expected, store: true });
  });
}

async function buildPSTurnoverPackage({
  model,
  storage,
  logoData,
  tempDirectory = os.tmpdir(),
  onPhase = () => {},
  docxBuilder = buildSolutionFitTurnoverDocx,
  signal
} = {}) {
  if (!model || !storage) throw new TypeError('Turnover model and evidence storage are required.');
  let phaseStarted = Date.now();
  const phases = [];
  const phase = name => {
    const now = Date.now();
    phases.push({ name, durationMs: now - phaseStarted });
    phaseStarted = now;
    onPhase(name);
  };

  signal?.throwIfAborted();
  await preflightEvidence(model, storage, { signal });
  phase('attachment-metadata');
  const previews = await buildPhotoPreviews(model, storage, { signal });
  phase('photo-previews');
  const turnoverDoc = await docxBuilder({ model, logoData, previews });
  signal?.throwIfAborted();
  const manifest = buildAttachmentManifestCsv(model);
  phase('document-generation');

  const safeCustomer = safeFile(model.customerName);
  const filename = `Cloud-Inventory-PS-Turnover-${safeCustomer}.zip`;
  const filePath = path.join(tempDirectory, `cloud-inventory-turnover-${crypto.randomUUID()}.zip`);
  const output = fs.createWriteStream(filePath, { flags: 'wx' });
  const archive = archiver('zip', { zlib: { level: 6 }, forceZip64: model.summary.totalEvidenceSizeBytes >= 0xffffffff });
  const outputDone = pipeline(archive, output);
  outputDone.catch(() => {});
  let activeSource;
  const abort = () => { activeSource?.destroy(signal.reason); archive.destroy(signal.reason); output.destroy(signal.reason); };
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  archive.append(turnoverDoc, { name: 'PS-Turnover.docx' });
  archive.append(manifest, { name: 'Attachment-Manifest.csv' });

  try {
    for (const attachment of model.attachments) {
      signal?.throwIfAborted();
      const timed = timedController(OBJECT_TIMEOUT_MS, signal);
      try {
        const objectRequest = storage.getObjectStream({ key: attachment.storageKey, signal: timed.controller.signal });
        objectRequest.then(object => { if (timed.controller.signal.aborted && object?.stream) nodeStream(object.stream).destroy(); }).catch(() => {});
        const object = await Promise.race([objectRequest, outputDone]);
        if (object.sizeBytes && Number(object.sizeBytes) !== attachment.sizeBytes) throw new Error('Stored object size changed after package snapshot.');
        if (object.contentType && object.contentType !== attachment.contentType) throw new Error('Stored object type changed after package snapshot.');
        if (attachment.objectEtag && object.etag && object.etag !== attachment.objectEtag) throw new Error('Stored object identity changed after package snapshot.');
        activeSource = nodeStream(object.stream);
        await Promise.race([appendStream(archive, activeSource, attachment.packagePath), outputDone]);
        activeSource = undefined;
      } catch (error) {
        timed.controller.abort();
        throw new EvidenceUnavailableError(attachment.id, error.message);
      } finally {
        timed.stop();
      }
    }
    await Promise.race([archive.finalize(), outputDone]);
    await outputDone;
    phase('zip-stream');
    const stats = await fs.promises.stat(filePath);
    return {
      filePath,
      filename,
      sizeBytes: stats.size,
      evidenceCount: model.attachments.length,
      includedAttachmentIds: model.attachments.map(item => item.id),
      phases,
      cleanup: () => fs.promises.rm(filePath, { force: true })
    };
  } catch (error) {
    archive.abort();
    activeSource?.destroy();
    archive.destroy();
    output.destroy();
    await outputDone.catch(() => {});
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

module.exports = {
  PREVIEWS_PER_CONTEXT,
  EvidenceUnavailableError,
  preflightEvidence,
  buildPhotoPreviews,
  buildPSTurnoverPackage,
  nodeStream
};
