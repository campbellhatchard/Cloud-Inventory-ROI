'use strict';

const path = require('path');
const SolutionFitState = require('../../public/solution-fit-state');

const ACTIVE_STATUS = 'ACTIVE';
const MAX_SEGMENT_LENGTH = 80;
const MANIFEST_COLUMNS = Object.freeze([
  'Attachment ID', 'Context Type', 'Context ID', 'Product', 'ERP',
  'Functional Group', 'Application', 'Gap', 'Caption', 'Original Filename',
  'Package Path', 'Content Type', 'Size Bytes', 'Size Display', 'Uploaded By',
  'Uploaded At', 'Status'
]);

class TurnoverIntegrityError extends Error {
  constructor(message, code = 'TURNOVER_EVIDENCE_INTEGRITY') {
    super(message);
    this.name = 'TurnoverIntegrityError';
    this.code = code;
    this.status = 409;
  }
}

function clean(value, max = 4000) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function cleanMultiline(value, max = 4000) {
  return String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function first(row, ...names) {
  for (const name of names) if (row && row[name] != null) return row[name];
  return null;
}

function sanitizeZipSegment(value, fallback = 'Item') {
  let segment = clean(value, 300).normalize('NFKC')
    .replace(/\.\.+/g, '-')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[. -]+|[. -]+$/g, '');
  if (!segment || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(segment)) segment = `${fallback}-item`;
  return segment.slice(0, MAX_SEGMENT_LENGTH).replace(/[. -]+$/g, '') || fallback;
}

function safeAttachmentFilename(value) {
  const raw = clean(value, 255).replace(/\\/g, '/').split('/').pop() || 'evidence-file';
  const parsed = path.parse(raw);
  const extension = parsed.ext.replace(/[^.a-z0-9]/gi, '').slice(0, 12).toLowerCase();
  const base = sanitizeZipSegment(parsed.name, 'evidence-file').slice(0, 96);
  return `${base}${extension}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isoTimestamp(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function readableTimestamp(value) {
  const iso = isoTimestamp(value);
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(new Date(iso));
}

function activeAttachment(row) {
  return clean(first(row, 'status'), 20).toUpperCase() === ACTIVE_STATUS
    && !first(row, 'removed_at', 'removedAt');
}

function normalizeAttachment(row) {
  return {
    id: clean(first(row, 'id'), 80),
    solutionFitId: clean(first(row, 'handoff_id', 'solutionFitId'), 80),
    customerId: clean(first(row, 'customer_id', 'customerId'), 80),
    contextType: clean(first(row, 'context_type', 'contextType') || 'GENERAL_SOLUTION_FIT', 40).toUpperCase(),
    contextId: clean(first(row, 'context_id', 'contextId'), 160),
    originalFilename: clean(first(row, 'original_filename', 'originalFilename', 'file_name'), 255),
    contentType: clean(first(row, 'content_type', 'contentType'), 160).toLowerCase(),
    sizeBytes: Number(first(row, 'file_size', 'sizeBytes') || 0),
    caption: cleanMultiline(first(row, 'caption'), 4000),
    evidenceCategory: clean(first(row, 'evidence_category', 'evidenceCategory'), 80),
    uploadedBy: clean(first(row, 'uploaded_by', 'uploadedBy'), 80),
    uploadedByName: clean(first(row, 'uploaded_by_name', 'uploadedByName'), 200),
    uploadedAt: isoTimestamp(first(row, 'completed_at', 'completedAt', 'created_at', 'createdAt')),
    storageKey: clean(first(row, 'storage_key', 'storageKey'), 1000),
    objectEtag: clean(first(row, 'object_etag', 'objectEtag'), 200),
    status: ACTIVE_STATUS
  };
}

function contextFor(state, attachment) {
  const process = attachment.contextType === 'APPLICATION_PROCESS'
    ? (state.processes || []).find(row => String(row.id) === attachment.contextId) : null;
  const gap = attachment.contextType === 'GAP'
    ? (state.gaps || []).find(row => String(row.id) === attachment.contextId) : null;
  const integration = attachment.contextType === 'INTEGRATION'
    ? (state.interfaces || []).find(row => String(row.id) === attachment.contextId) : null;

  if (attachment.contextType === 'APPLICATION_PROCESS' && !process) throw new TurnoverIntegrityError(`Evidence attachment ${attachment.id} references an unknown application/process.`);
  if (attachment.contextType === 'GAP' && !gap) throw new TurnoverIntegrityError(`Evidence attachment ${attachment.id} references an unknown gap.`);
  if (attachment.contextType === 'INTEGRATION' && !integration) throw new TurnoverIntegrityError(`Evidence attachment ${attachment.id} references an unknown integration.`);
  if (!['GENERAL_SOLUTION_FIT', 'APPLICATION_PROCESS', 'GAP', 'INTEGRATION'].includes(attachment.contextType)) {
    throw new TurnoverIntegrityError(`Evidence attachment ${attachment.id} has an unsupported context.`);
  }

  const relatedProcess = gap?.processId ? (state.processes || []).find(row => String(row.id) === String(gap.processId)) : null;
  const group = process?.group || relatedProcess?.group || '';
  const product = process?.product || relatedProcess?.product || gap?.product || '';
  const erp = process?.erp || relatedProcess?.erp || gap?.erp || '';
  return {
    process,
    gap,
    integration,
    product: clean(product, 120),
    erp: clean(erp, 120),
    functionalGroup: clean(group, 160),
    application: clean(process?.name || relatedProcess?.name || gap?.process, 240),
    gapLabel: clean(gap ? [gap.id, gap.gapDescription || gap.need].filter(Boolean).join(' - ') : '', 500)
  };
}

function folderFor(attachment) {
  const ref = attachment.context;
  const stable = sanitizeZipSegment(attachment.contextId || attachment.id, 'context').slice(-24);
  if (attachment.contextType === 'GENERAL_SOLUTION_FIT') return 'Evidence/General';
  if (attachment.contextType === 'GAP') {
    return `Evidence/Gaps/${sanitizeZipSegment(`${ref.gap?.id || 'Gap'}-${ref.gap?.gapDescription || ref.gap?.need || stable}`, 'Gap')}`;
  }
  if (attachment.contextType === 'INTEGRATION') {
    return `Evidence/Integration/${sanitizeZipSegment(`${ref.integration?.id || 'Integration'}-${ref.integration?.object || stable}`, 'Integration')}`;
  }
  const parts = ['Evidence', ref.product || 'Applications'];
  if (ref.erp) parts.push(ref.erp);
  if (ref.functionalGroup) parts.push(ref.functionalGroup);
  parts.push(`${ref.application || 'Application'}-${stable}`);
  return parts.map((part, index) => index === 0 ? part : sanitizeZipSegment(part, 'Item')).join('/');
}

function assignPackagePaths(attachments) {
  const allocated = new Set();
  return attachments.map(attachment => {
    const folder = folderFor(attachment);
    const baseName = safeAttachmentFilename(attachment.originalFilename);
    const parsed = path.posix.parse(baseName);
    let filename = baseName, suffix = 2;
    while (allocated.has(`${folder}/${filename}`.toLowerCase())) filename = `${parsed.name}-${suffix++}${parsed.ext}`;
    allocated.add(`${folder}/${filename}`.toLowerCase());
    return { ...attachment, packagePath: `${folder}/${filename}` };
  });
}

function groupAttachments(attachments) {
  const map = new Map();
  for (const attachment of attachments) {
    const key = `${attachment.contextType}:${attachment.contextId}`;
    if (!map.has(key)) map.set(key, {
      key,
      contextType: attachment.contextType,
      contextId: attachment.contextId,
      product: attachment.context.product,
      erp: attachment.context.erp,
      functionalGroup: attachment.context.functionalGroup,
      application: attachment.context.application,
      gap: attachment.context.gap,
      integration: attachment.context.integration,
      attachments: []
    });
    map.get(key).attachments.push(attachment);
  }
  return [...map.values()];
}

function buildPSTurnoverModel({
  data,
  attachments = [],
  customerId = '',
  solutionFitId = '',
  customerName = '',
  accountExecutive = '',
  primarySeId = '',
  primarySeName = '',
  generatedAt = new Date().toISOString(),
  pendingAttachmentCount = 0
} = {}) {
  const state = SolutionFitState.synchronizeAuthority(SolutionFitState.migrateState(JSON.parse(JSON.stringify(data || {}))));
  const normalized = attachments.filter(activeAttachment).map(normalizeAttachment).sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id));
  for (const attachment of normalized) {
    if (customerId && attachment.customerId && attachment.customerId !== String(customerId)) throw new TurnoverIntegrityError(`Evidence attachment ${attachment.id} belongs to another customer.`, 'CROSS_CUSTOMER_EVIDENCE');
    if (solutionFitId && attachment.solutionFitId && attachment.solutionFitId !== String(solutionFitId)) throw new TurnoverIntegrityError(`Evidence attachment ${attachment.id} belongs to another Solution Fit.`, 'CROSS_SOLUTION_FIT_EVIDENCE');
    if (!attachment.id || !attachment.storageKey || !attachment.originalFilename || !Number.isSafeInteger(attachment.sizeBytes) || attachment.sizeBytes <= 0) {
      throw new TurnoverIntegrityError('An active evidence record is incomplete.');
    }
    attachment.context = contextFor(state, attachment);
  }
  const packaged = assignPackagePaths(normalized);
  const photos = packaged.filter(row => /^image\/(jpeg|png)$/.test(row.contentType));
  const documents = packaged.filter(row => !/^image\//.test(row.contentType));
  const applicationContexts = new Set(packaged.filter(row => row.contextType === 'APPLICATION_PROCESS').map(row => row.contextId));
  const gapContexts = new Set(packaged.filter(row => row.contextType === 'GAP').map(row => row.contextId));
  return Object.freeze({
    schemaVersion: 1,
    generatedAt: isoTimestamp(generatedAt) || new Date().toISOString(),
    timestampConvention: 'UTC ISO 8601 in CSV; UTC readable dates in Word',
    classification: 'CONFIDENTIAL — INTERNAL USE ONLY',
    customerId: clean(customerId, 80),
    customerName: clean(customerName || state.opportunity?.customer || 'Customer', 240),
    solutionFitId: clean(solutionFitId, 80),
    accountExecutive: clean(accountExecutive, 200),
    primarySeId: clean(primarySeId, 80),
    primarySeName: clean(primarySeName, 200),
    state,
    attachments: Object.freeze(packaged),
    groups: Object.freeze(groupAttachments(packaged)),
    pendingAttachmentCount: Math.max(0, Number(pendingAttachmentCount || 0)),
    summary: Object.freeze({
      totalEvidenceFiles: packaged.length,
      photos: photos.length,
      documents: documents.length,
      applicationsWithEvidence: applicationContexts.size,
      gapsWithEvidence: gapContexts.size,
      totalEvidenceSizeBytes: packaged.reduce((sum, row) => sum + row.sizeBytes, 0)
    })
  });
}

function csvValue(value) {
  const string = String(value == null ? '' : value);
  return /[",\r\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}

function buildAttachmentManifestCsv(model) {
  const rows = model.attachments.map(attachment => {
    const ref = attachment.context;
    return [
      attachment.id, attachment.contextType, attachment.contextId, ref.product, ref.erp,
      ref.functionalGroup, ref.application, ref.gapLabel, attachment.caption,
      attachment.originalFilename, attachment.packagePath, attachment.contentType,
      attachment.sizeBytes, formatBytes(attachment.sizeBytes), attachment.uploadedByName,
      attachment.uploadedAt, 'INCLUDED'
    ];
  });
  return '\uFEFF' + [MANIFEST_COLUMNS, ...rows].map(row => row.map(csvValue).join(',')).join('\r\n') + '\r\n';
}

module.exports = {
  ACTIVE_STATUS,
  MANIFEST_COLUMNS,
  TurnoverIntegrityError,
  buildPSTurnoverModel,
  buildAttachmentManifestCsv,
  sanitizeZipSegment,
  safeAttachmentFilename,
  formatBytes,
  readableTimestamp,
  isoTimestamp,
  activeAttachment
};
