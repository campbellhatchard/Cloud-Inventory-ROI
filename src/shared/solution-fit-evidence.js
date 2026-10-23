'use strict';

const SolutionFitState = require('../../public/solution-fit-state');

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
const CONTEXTS = new Set(['GENERAL_SOLUTION_FIT', 'APPLICATION_PROCESS', 'GAP', 'INTEGRATION']);
const CATEGORIES = new Set(['', 'PHOTO', 'DOCUMENT', 'CUSTOMER_EVIDENCE', 'DEMO_EVIDENCE', 'GAP_EVIDENCE', 'DESIGN_REFERENCE', 'OTHER']);
const ALLOWED = Object.freeze({
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
});

function text(value, max = 500) { return String(value == null ? '' : value).trim().slice(0, max); }
function extension(filename) { const match = text(filename, 260).toLowerCase().match(/(\.[a-z0-9]+)$/); return match ? match[1] : ''; }
function isImage(contentType) { return contentType === 'image/jpeg' || contentType === 'image/png'; }
function maxBytes(contentType) { return isImage(contentType) ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES; }

function validateFile({ originalFilename, contentType, sizeBytes }) {
  const filename = text(originalFilename, 255);
  const type = text(contentType, 160).toLowerCase().split(';')[0];
  const size = Number(sizeBytes);
  if (!filename) return { error: 'Choose a file to upload.' };
  if (!ALLOWED[type] || !ALLOWED[type].includes(extension(filename))) return { error: 'This file type is not supported.' };
  if (!Number.isSafeInteger(size) || size <= 0) return { error: 'The selected file is empty or unreadable.' };
  if (size > maxBytes(type)) return { error: isImage(type) ? 'The optimized image must be 5 MB or smaller.' : 'Documents must be 25 MB or smaller.' };
  return { filename, contentType: type, sizeBytes: size };
}

function normalizeContext(contextType, contextId) {
  const type = text(contextType, 40).toUpperCase() || 'GENERAL_SOLUTION_FIT';
  const id = type === 'GENERAL_SOLUTION_FIT' ? null : text(contextId, 160);
  if (!CONTEXTS.has(type) || (type !== 'GENERAL_SOLUTION_FIT' && !id)) return null;
  return { type, id };
}

function validateContextAgainstState(stateInput, context) {
  const state = SolutionFitState.synchronizeAuthority(SolutionFitState.migrateState(JSON.parse(JSON.stringify(stateInput || {}))));
  if (context.type === 'GENERAL_SOLUTION_FIT') return true;
  if (context.type === 'APPLICATION_PROCESS') return (state.processes || []).some(row => String(row.id) === context.id);
  if (context.type === 'GAP') return (state.gaps || []).some(row => String(row.id) === context.id);
  if (context.type === 'INTEGRATION') return (state.interfaces || []).some(row => row.id && String(row.id) === context.id);
  return false;
}

module.exports = { IMAGE_MAX_BYTES, DOCUMENT_MAX_BYTES, CONTEXTS, CATEGORIES, ALLOWED, text, isImage, maxBytes, validateFile, normalizeContext, validateContextAgainstState };
