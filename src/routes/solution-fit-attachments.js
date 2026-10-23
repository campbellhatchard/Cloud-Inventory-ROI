'use strict';

const express = require('express');
const crypto = require('crypto');
const { query, transaction } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { solutionFitAccess } = require('../authorization');
const { log } = require('../audit');
const { getEvidenceStorage, objectKey, safeFilename, StorageUnavailableError } = require('../storage/r2-storage');
const { IMAGE_MAX_BYTES, DOCUMENT_MAX_BYTES, CATEGORIES, text, maxBytes, validateFile, normalizeContext, validateContextAgainstState } = require('../shared/solution-fit-evidence');

function present(row) {
  return {
    id: row.id,
    solutionFitId: row.handoff_id,
    customerId: row.customer_id,
    contextType: row.context_type,
    contextId: row.context_id,
    originalFilename: row.original_filename || row.file_name,
    contentType: row.content_type,
    sizeBytes: Number(row.file_size || 0),
    caption: row.caption || '',
    evidenceCategory: row.evidence_category || '',
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name || '',
    createdAt: row.created_at,
    completedAt: row.completed_at,
    status: row.status
  };
}

async function accessibleFit(customerId, user, mode) {
  const access = await solutionFitAccess(user, customerId, mode === 'write' ? 'edit' : 'view');
  if (!access.exists) return { ok: false, status: 404, error: 'Customer not found.' };
  if (!access.allowed) return { ok: false, status: 403, error: 'You do not have permission for this Solution Fit.' };
  const result = await query(`SELECT id,customer_id,data,deleted_at FROM handoffs WHERE customer_id=$1 ORDER BY deleted_at NULLS FIRST,updated_at DESC LIMIT 1`, [customerId]);
  if (!result.rows.length) return { ok: false, status: 409, error: 'Save the Solution Fit before adding evidence.' };
  if (result.rows[0].deleted_at) return { ok: false, status: 409, error: 'Restore the Solution Fit before accessing evidence.' };
  return { ok: true, fit: result.rows[0] };
}

function storageFailure(res, error) {
  if (error instanceof StorageUnavailableError || error?.code === 'EVIDENCE_STORAGE_UNAVAILABLE') {
    return res.status(503).json({ error: 'Evidence storage is temporarily unavailable.', code: 'EVIDENCE_STORAGE_UNAVAILABLE' });
  }
  return null;
}

const router = express.Router();
router.use(requireAuth);

router.get('/:customerId/attachments', async (req, res) => {
  try {
    const access = await accessibleFit(req.params.customerId, req.user, 'read');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const result = await query(`SELECT a.*,u.username uploaded_by_name
      FROM handoff_attachments a LEFT JOIN users u ON u.id=a.uploaded_by
      WHERE a.handoff_id=$1 AND a.customer_id=$2 AND a.status='ACTIVE' AND a.removed_at IS NULL
      ORDER BY a.created_at DESC,a.id`, [access.fit.id, req.params.customerId]);
    res.json({ solutionFitId: access.fit.id, attachments: result.rows.map(present), storage: getEvidenceStorage().publicConfig() });
  } catch (error) {
    if (storageFailure(res, error)) return;
    console.error('solution_fit_evidence.list_failed', { userId: req.user.id, customerId: req.params.customerId, message: error.message });
    res.status(500).json({ error: 'Evidence could not be loaded.' });
  }
});

router.get('/:customerId/attachments/storage-status', async (req, res) => {
  try {
    const access = await accessibleFit(req.params.customerId, req.user, 'read');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    res.json(getEvidenceStorage().publicConfig());
  } catch (error) {
    res.status(503).json({ available: false, error: 'Evidence storage is temporarily unavailable.' });
  }
});

router.post('/:customerId/attachments/initiate', async (req, res) => {
  let attachmentId;
  try {
    const access = await accessibleFit(req.params.customerId, req.user, 'write');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const context = normalizeContext(req.body?.contextType, req.body?.contextId);
    if (!context || !validateContextAgainstState(access.fit.data, context)) return res.status(400).json({ error: 'The evidence context is no longer valid.', code: 'INVALID_EVIDENCE_CONTEXT' });
    const file = validateFile(req.body || {});
    if (file.error) return res.status(400).json({ error: file.error, code: 'INVALID_EVIDENCE_FILE' });
    const category = text(req.body?.evidenceCategory, 40).toUpperCase();
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Choose a valid evidence category.' });
    const storage = getEvidenceStorage();
    if (!storage.isAvailable()) throw new StorageUnavailableError();
    attachmentId = crypto.randomUUID();
    const key = objectKey({ customerId: req.params.customerId, solutionFitId: access.fit.id, attachmentId, filename: file.filename });
    const caption = text(req.body?.caption, 1000);
    await query(`INSERT INTO handoff_attachments
      (id,handoff_id,customer_id,file_name,original_filename,storage_key,content_type,file_size,expected_content_type,expected_size_bytes,context_type,context_id,caption,evidence_category,status,uploaded_by,upload_expires_at)
      VALUES($1,$2,$3,$4,$4,$5,$6,0,$6,$7,$8,$9,$10,$11,'PENDING',$12,NOW()+INTERVAL '10 minutes')`,
      [attachmentId, access.fit.id, req.params.customerId, file.filename, key, file.contentType, file.sizeBytes, context.type, context.id, caption, category || null, req.user.id]);
    let signed;
    try { signed = await storage.createUploadUrl({ key }); }
    catch (error) {
      await query(`UPDATE handoff_attachments SET status='FAILED',updated_at=NOW() WHERE id=$1 AND status='PENDING'`, [attachmentId]);
      throw error;
    }
    await log({ userId: req.user.id, action: 'handoff.attachment_initiated', entityType: 'handoff_attachment', entityId: attachmentId, detail: { handoffId: access.fit.id, customerId: req.params.customerId, contextType: context.type, contextId: context.id, contentType: file.contentType, sizeBytes: file.sizeBytes }, ipAddress: req.ip });
    res.status(201).json({ attachmentId, solutionFitId: access.fit.id, uploadUrl: signed.url, expiresIn: signed.expiresSeconds, requiredHeaders: { 'Content-Type': file.contentType } });
  } catch (error) {
    if (storageFailure(res, error)) return;
    console.error('solution_fit_evidence.initiate_failed', { userId: req.user.id, customerId: req.params.customerId, attachmentId, message: error.message });
    res.status(500).json({ error: 'Evidence could not be uploaded. Please try again.' });
  }
});

async function loadAttachmentForFit(customerId, attachmentId, user, mode, { includeRemoved = false } = {}) {
  const access = await accessibleFit(customerId, user, mode);
  if (!access.ok) return access;
  const result = await query(`SELECT * FROM handoff_attachments WHERE id=$1 AND handoff_id=$2 AND customer_id=$3${includeRemoved ? '' : ' AND removed_at IS NULL'}`, [attachmentId, access.fit.id, customerId]);
  if (!result.rows.length) return { ok: false, status: 404, error: 'Evidence was not found.' };
  return { ok: true, fit: access.fit, attachment: result.rows[0] };
}

async function completeAttachment(req, res, row, fit) {
  if (row.status === 'ACTIVE' && !row.removed_at) return res.json({ ok: true, attachment: present(row), idempotent: true });
  if (!['PENDING', 'FAILED'].includes(row.status) || row.removed_at) return res.status(409).json({ error: 'This upload can no longer be completed.' });
  const metadata = await getEvidenceStorage().verifyObject({ key: row.storage_key });
  const expectedSize = Number(row.expected_size_bytes || 0);
  const expectedType = text(row.expected_content_type, 160).toLowerCase();
  const invalid = metadata.sizeBytes <= 0 || metadata.sizeBytes !== expectedSize || metadata.sizeBytes > maxBytes(expectedType) || metadata.contentType !== expectedType;
  if (invalid) {
    await query(`UPDATE handoff_attachments SET status='FAILED',file_size=$2,content_type=$3,object_etag=$4,updated_at=NOW() WHERE id=$1`, [row.id, metadata.sizeBytes, metadata.contentType || null, metadata.etag || null]);
    try { await getEvidenceStorage().deleteObject({ key: row.storage_key }); } catch (_) { /* reconciliation job will retry */ }
    return res.status(422).json({ error: 'The uploaded object did not match the approved file. Choose the file again.', code: 'EVIDENCE_OBJECT_MISMATCH' });
  }
  const updated = await query(`UPDATE handoff_attachments SET status='ACTIVE',file_size=$2,content_type=$3,object_etag=$4,completed_at=NOW(),updated_at=NOW(),deletion_error=NULL WHERE id=$1 AND status IN ('PENDING','FAILED') AND removed_at IS NULL RETURNING *`, [row.id, metadata.sizeBytes, metadata.contentType, metadata.etag || null]);
  const attachment = updated.rows[0] || row;
  await log({ userId: req.user.id, action: 'handoff.attachment_completed', entityType: 'handoff_attachment', entityId: row.id, detail: { handoffId: fit.id, customerId: req.params.customerId, contextType: row.context_type, contextId: row.context_id, sizeBytes: metadata.sizeBytes }, ipAddress: req.ip });
  return res.json({ ok: true, attachment: present(attachment) });
}

router.post('/:customerId/attachments/:attachmentId/complete', async (req, res) => {
  try {
    const access = await loadAttachmentForFit(req.params.customerId, req.params.attachmentId, req.user, 'write');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    return await completeAttachment(req, res, access.attachment, access.fit);
  } catch (error) {
    if (storageFailure(res, error)) return;
    if (error?.statusCode === 404) return res.status(422).json({ error: 'The uploaded object was not found or is incomplete. Retry the upload.', code: 'EVIDENCE_OBJECT_NOT_FOUND' });
    console.error('solution_fit_evidence.complete_failed', { userId: req.user.id, customerId: req.params.customerId, attachmentId: req.params.attachmentId, message: error.message });
    res.status(500).json({ error: 'Evidence could not be verified. Please retry.' });
  }
});

router.post('/:customerId/attachments/:attachmentId/retry', async (req, res) => {
  try {
    const access = await loadAttachmentForFit(req.params.customerId, req.params.attachmentId, req.user, 'write');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const row = access.attachment;
    if (row.status === 'ACTIVE') return res.json({ ok: true, attachment: present(row), idempotent: true });
    if (!['PENDING', 'FAILED'].includes(row.status)) return res.status(409).json({ error: 'This evidence cannot be retried.' });
    try {
      const metadata = await getEvidenceStorage().verifyObject({ key: row.storage_key });
      if (metadata.sizeBytes === Number(row.expected_size_bytes) && metadata.contentType === row.expected_content_type) return completeAttachment(req, res, row, access.fit);
    } catch (_) { /* object is absent or incomplete; issue a fresh short-lived URL */ }
    const signed = await getEvidenceStorage().createUploadUrl({ key: row.storage_key });
    await query(`UPDATE handoff_attachments SET status='PENDING',upload_expires_at=NOW()+INTERVAL '10 minutes',updated_at=NOW() WHERE id=$1`, [row.id]);
    res.json({ attachmentId: row.id, uploadUrl: signed.url, expiresIn: signed.expiresSeconds, requiredHeaders: { 'Content-Type': row.expected_content_type } });
  } catch (error) {
    if (storageFailure(res, error)) return;
    res.status(500).json({ error: 'Evidence upload could not be retried.' });
  }
});

router.get('/:customerId/attachments/:attachmentId/download', async (req, res) => {
  try {
    const access = await loadAttachmentForFit(req.params.customerId, req.params.attachmentId, req.user, 'read');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    if (access.attachment.status !== 'ACTIVE') return res.status(409).json({ error: 'Evidence is not available for download.' });
    const signed = await getEvidenceStorage().createDownloadUrl({ key: access.attachment.storage_key });
    await log({ userId: req.user.id, action: 'handoff.attachment_downloaded', entityType: 'handoff_attachment', entityId: access.attachment.id, detail: { handoffId: access.fit.id, customerId: req.params.customerId }, ipAddress: req.ip });
    res.set('Cache-Control', 'private, no-store');
    res.json({ url: signed.url, expiresIn: signed.expiresSeconds, filename: access.attachment.original_filename || access.attachment.file_name });
  } catch (error) {
    if (storageFailure(res, error)) return;
    res.status(500).json({ error: 'Evidence could not be opened.' });
  }
});

router.patch('/:customerId/attachments/:attachmentId', async (req, res) => {
  try {
    const access = await loadAttachmentForFit(req.params.customerId, req.params.attachmentId, req.user, 'write');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    if (access.attachment.status !== 'ACTIVE') return res.status(409).json({ error: 'Only completed evidence can be edited.' });
    const category = text(req.body?.evidenceCategory, 40).toUpperCase();
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Choose a valid evidence category.' });
    const updated = await query(`UPDATE handoff_attachments SET caption=$2,evidence_category=$3,updated_at=NOW() WHERE id=$1 AND removed_at IS NULL RETURNING *`, [access.attachment.id, text(req.body?.caption, 1000), category || null]);
    await log({ userId: req.user.id, action: 'handoff.attachment_metadata_changed', entityType: 'handoff_attachment', entityId: access.attachment.id, detail: { handoffId: access.fit.id, customerId: req.params.customerId }, ipAddress: req.ip });
    res.json({ ok: true, attachment: present(updated.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Evidence details could not be saved.' });
  }
});

router.delete('/:customerId/attachments/:attachmentId', async (req, res) => {
  try {
    const access = await loadAttachmentForFit(req.params.customerId, req.params.attachmentId, req.user, 'write');
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const removed = await transaction(async client => {
      const locked = await client.query(`SELECT * FROM handoff_attachments WHERE id=$1 AND handoff_id=$2 AND customer_id=$3 FOR UPDATE`, [access.attachment.id, access.fit.id, req.params.customerId]);
      if (!locked.rows.length || locked.rows[0].removed_at) return null;
      return (await client.query(`UPDATE handoff_attachments SET status='REMOVED',removed_at=NOW(),removed_by=$2,deletion_status='PENDING',updated_at=NOW() WHERE id=$1 RETURNING *`, [access.attachment.id, req.user.id])).rows[0];
    });
    if (!removed) return res.json({ ok: true, alreadyRemoved: true });
    let deletionPending = false;
    try {
      await getEvidenceStorage().deleteObject({ key: removed.storage_key });
      await query(`UPDATE handoff_attachments SET deletion_status='DELETED',deletion_error=NULL,updated_at=NOW() WHERE id=$1`, [removed.id]);
    } catch (error) {
      deletionPending = true;
      await query(`UPDATE handoff_attachments SET deletion_status='RETRY',deletion_error=$2,updated_at=NOW() WHERE id=$1`, [removed.id, text(error.message, 500)]);
    }
    await log({ userId: req.user.id, action: 'handoff.attachment_removed', entityType: 'handoff_attachment', entityId: removed.id, detail: { handoffId: access.fit.id, customerId: req.params.customerId, storageDeletePending: deletionPending }, ipAddress: req.ip });
    res.json({ ok: true, removed: true, storageDeletePending: deletionPending });
  } catch (error) {
    res.status(500).json({ error: 'Evidence could not be removed.' });
  }
});

module.exports = router;
module.exports.validateFile = validateFile;
module.exports.normalizeContext = normalizeContext;
module.exports.validateContextAgainstState = validateContextAgainstState;
module.exports.present = present;
module.exports.IMAGE_MAX_BYTES = IMAGE_MAX_BYTES;
module.exports.DOCUMENT_MAX_BYTES = DOCUMENT_MAX_BYTES;
module.exports.safeFilename = safeFilename;
