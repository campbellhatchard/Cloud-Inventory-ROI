'use strict';

const crypto = require('crypto');

const RECORD_TYPES = Object.freeze(['scenario', 'discovery', 'customer', 'handoff']);
const ID_KEYS = Object.freeze({
  scenario: 'scenarioIds',
  discovery: 'discoveryIds',
  customer: 'customerIds',
  handoff: 'handoffIds'
});
const DATE_BASIS = new Set(['created', 'updated', 'removed']);
const QUICK_RANGES = new Set(['all', 'today', 'last7', 'last30', 'last90', 'older90', 'custom']);
const STATUSES = new Set(['active', 'removed', 'closed', 'all']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PREVIEW_RECORDS = 500;
const TYPED_CONFIRMATION_THRESHOLD = 10;

class CleanupValidationError extends Error {
  constructor(message, code = 'CLEANUP_VALIDATION_FAILED') {
    super(message);
    this.name = 'CleanupValidationError';
    this.status = 400;
    this.code = code;
  }
}

function strictDate(value, label) {
  if (value == null || value === '') return null;
  const text = String(value);
  if (!DATE.test(text)) throw new CleanupValidationError(`${label} must be a valid calendar date.`);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) {
    throw new CleanupValidationError(`${label} must be a valid calendar date.`);
  }
  return date;
}

function startUtcDay(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function normalizeFilters(raw = {}, { now = new Date(), removedView = false } = {}) {
  const status = removedView ? 'removed' : (STATUSES.has(String(raw.status || 'active')) ? String(raw.status || 'active') : 'active');
  const scenario = ['all', 'current', 'prior'].includes(String(raw.scenario || 'all')) ? String(raw.scenario || 'all') : 'all';
  const prospect = ['all', 'submitted', 'draft', 'inactive'].includes(String(raw.prospect || 'all')) ? String(raw.prospect || 'all') : 'all';
  const requestedTypes = Array.isArray(raw.types) ? raw.types.map(String) : [];
  const types = [...new Set(requestedTypes.filter(type => RECORD_TYPES.includes(type)))];
  const dateBasis = DATE_BASIS.has(String(raw.dateBasis || (removedView ? 'removed' : 'created')))
    ? String(raw.dateBasis || (removedView ? 'removed' : 'created'))
    : (removedView ? 'removed' : 'created');
  if (dateBasis === 'removed' && status !== 'removed' && status !== 'all') {
    throw new CleanupValidationError('Removed Date is available only for removed records.');
  }
  const quickRange = QUICK_RANGES.has(String(raw.quickRange || 'all')) ? String(raw.quickRange || 'all') : 'all';
  const ownerId = raw.ownerId ? String(raw.ownerId) : null;
  const createdById = raw.createdById ? String(raw.createdById) : null;
  const removedById = raw.removedById ? String(raw.removedById) : null;
  for (const [label, value] of [['Owner', ownerId], ['Created By', createdById], ['Removed By', removedById]]) {
    if (value && !UUID.test(value)) throw new CleanupValidationError(`${label} is invalid.`);
  }

  let from = strictDate(raw.dateFrom, 'From date');
  let through = strictDate(raw.dateThrough, 'Through date');
  const today = startUtcDay(now);
  if (quickRange === 'today') { from = today; through = today; }
  if (quickRange === 'last7') { from = addUtcDays(today, -6); through = today; }
  if (quickRange === 'last30') { from = addUtcDays(today, -29); through = today; }
  if (quickRange === 'last90') { from = addUtcDays(today, -89); through = today; }
  if (quickRange === 'older90') { from = null; through = addUtcDays(today, -91); }
  if (from && through && from > through) {
    throw new CleanupValidationError('From date must be on or before Through date.', 'INVALID_DATE_RANGE');
  }
  const dateFrom = from ? from.toISOString() : null;
  const dateUntil = through ? addUtcDays(through, 1).toISOString() : null;

  return Object.freeze({
    status,
    scenario,
    prospect,
    types: types.length ? types : [...RECORD_TYPES],
    dateBasis,
    quickRange,
    dateFrom,
    dateUntil,
    ownerId,
    createdById,
    removedById,
    timezone: 'UTC'
  });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
}

function snapshotHash(records) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(records))).digest('hex');
}

function emptySelection() {
  return { scenarioIds: [], discoveryIds: [], customerIds: [], handoffIds: [] };
}

function normalizeSelection(raw = {}) {
  const result = emptySelection();
  for (const key of Object.values(ID_KEYS)) {
    const values = Array.isArray(raw[key]) ? raw[key].map(String) : [];
    result[key] = [...new Set(values.filter(id => UUID.test(id)))];
  }
  return result;
}

function selectionCount(selection) {
  return Object.values(selection || {}).reduce((total, values) => total + (Array.isArray(values) ? values.length : 0), 0);
}

function isSubset(selection, allowed) {
  for (const key of Object.values(ID_KEYS)) {
    const allow = new Set((allowed?.[key] || []).map(String));
    if (!(selection?.[key] || []).every(id => allow.has(String(id)))) return false;
  }
  return true;
}

function confirmationPhrase(count) {
  return `REMOVE ${Number(count)} ${Number(count) === 1 ? 'RECORD' : 'RECORDS'}`;
}

function needsTypedConfirmation(mode, count) {
  return mode === 'all' || Number(count) >= TYPED_CONFIRMATION_THRESHOLD;
}

function filterSummary(search, filters) {
  const parts = [];
  if (search) parts.push(`Search: ${search}`);
  parts.push(`Record type: ${filters.types.join(', ')}`);
  parts.push(`Status: ${filters.status}`);
  if (filters.ownerId) parts.push(`Owner selected`);
  if (filters.createdById) parts.push(`Created By selected`);
  if (filters.removedById) parts.push(`Removed By selected`);
  if (filters.dateFrom || filters.dateUntil) parts.push(`${filters.dateBasis} date range (${filters.timezone})`);
  return parts;
}

module.exports = {
  RECORD_TYPES,
  ID_KEYS,
  MAX_PREVIEW_RECORDS,
  TYPED_CONFIRMATION_THRESHOLD,
  CleanupValidationError,
  normalizeFilters,
  snapshotHash,
  emptySelection,
  normalizeSelection,
  selectionCount,
  isSubset,
  confirmationPhrase,
  needsTypedConfirmation,
  filterSummary
};
