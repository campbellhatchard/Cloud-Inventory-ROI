'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { once } = require('events');
const archiver = require('archiver');
const sharp = require('sharp');
const { buildSolutionFitTurnoverDocx } = require('./solution-fit-turnover-docx');
const { buildAttachmentManifestCsv, sanitizeZipSegment } = require('../shared/ps-turnover-model');

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

function timedController(timeoutMs = OBJECT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return { controller, stop: () => clearTimeout(timer) };
}

async function preflightEvidence(model, storage) {
  for (const attachment of model.attachments) {
    const timed = timedController();
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

async function buildPhotoPreviews(model, storage) {
  const previews = new Map();
  for (const group of model.groups) {
    const images = group.attachments.filter(item => /^image\/(jpeg|png)$/.test(item.contentType)).slice(0, PREVIEWS_PER_CONTEXT);
    for (const attachment of images) {
      const timed = timedController();
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
  docxBuilder = buildSolutionFitTurnoverDocx
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

  await preflightEvidence(model, storage);
  phase('attachment-metadata');
  const previews = await buildPhotoPreviews(model, storage);
  phase('photo-previews');
  const turnoverDoc = await docxBuilder({ model, logoData, previews });
  const manifest = buildAttachmentManifestCsv(model);
  phase('document-generation');

  const safeCustomer = sanitizeZipSegment(model.customerName, 'Customer');
  const filename = `Cloud-Inventory-PS-Turnover-${safeCustomer}.zip`;
  const filePath = path.join(tempDirectory, `cloud-inventory-turnover-${crypto.randomUUID()}.zip`);
  const output = fs.createWriteStream(filePath, { flags: 'wx' });
  const archive = archiver('zip', { zlib: { level: 6 }, forceZip64: model.summary.totalEvidenceSizeBytes >= 0xffffffff });
  const outputClosed = once(output, 'close');
  const archiveError = new Promise((_, reject) => archive.once('error', reject));
  archive.pipe(output);
  archive.append(turnoverDoc, { name: 'PS-Turnover.docx' });
  archive.append(manifest, { name: 'Attachment-Manifest.csv' });

  try {
    for (const attachment of model.attachments) {
      const timed = timedController();
      try {
        const object = await storage.getObjectStream({ key: attachment.storageKey, signal: timed.controller.signal });
        if (object.sizeBytes && Number(object.sizeBytes) !== attachment.sizeBytes) throw new Error('Stored object size changed after package snapshot.');
        if (object.contentType && object.contentType !== attachment.contentType) throw new Error('Stored object type changed after package snapshot.');
        if (attachment.objectEtag && object.etag && object.etag !== attachment.objectEtag) throw new Error('Stored object identity changed after package snapshot.');
        await appendStream(archive, nodeStream(object.stream), attachment.packagePath);
      } catch (error) {
        throw new EvidenceUnavailableError(attachment.id, error.message);
      } finally {
        timed.stop();
      }
    }
    await archive.finalize();
    await Promise.race([outputClosed, archiveError]);
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
    output.destroy();
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    throw error;
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
