'use strict';

const express = require('express');
const crypto = require('crypto');
const { hasRole } = require('../middleware/auth');
const { query, transaction } = require('../db');
const {
  RECORD_TYPES,
  ID_KEYS,
  MAX_PREVIEW_RECORDS,
  CleanupValidationError,
  normalizeFilters,
  snapshotHash,
  normalizeSelection,
  selectionCount,
  isSubset,
  confirmationPhrase,
  needsTypedConfirmation,
  filterSummary
} = require('../shared/admin-cleanup');

const router = express.Router();
const TYPE_TO_KEY = Object.freeze({ scenario: 'scenarios', discovery: 'discovery', customer: 'customers', handoff: 'handoffs' });
const REASONS = new Set(['test_demo', 'duplicate', 'created_error', 'obsolete', 'other']);

function adminOnly(req, res, next) {
  if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'Admin only.', code: 'ADMIN_REQUIRED' });
  next();
}
router.use(adminOnly);

function add(params, value) {
  params.push(value);
  return `$${params.length}`;
}

function whereFor({ type, alias, searchColumns, ownerColumn, creatorColumn, createdColumn, updatedColumn, removedColumn, filters, search }) {
  const params = [];
  const clauses = [];
  if (search) {
    const token = add(params, `%${search.toLowerCase()}%`);
    clauses.push(`(${searchColumns.map(column => `LOWER(COALESCE(${column}::text,'')) LIKE ${token}`).join(' OR ')})`);
  }
  if (filters.status === 'removed') clauses.push(`${removedColumn} IS NOT NULL`);
  if (filters.status === 'active') {
    clauses.push(`${removedColumn} IS NULL`);
    if (type === 'scenario') clauses.push(`${alias}.outcome IS NULL`);
    if (type === 'customer') clauses.push(`COALESCE(${alias}.status,'active')='active'`);
  }
  if (filters.status === 'closed') {
    if (type !== 'scenario') clauses.push('FALSE');
    else clauses.push(`${removedColumn} IS NULL AND ${alias}.outcome IS NOT NULL`);
  }
  if (filters.ownerId) clauses.push(`${ownerColumn}=${add(params, filters.ownerId)}::uuid`);
  if (filters.createdById) clauses.push(`${creatorColumn}=${add(params, filters.createdById)}::uuid`);
  if (filters.removedById) clauses.push(`${alias}.cleanup_removed_by=${add(params, filters.removedById)}::uuid`);
  const dateColumn = filters.dateBasis === 'created' ? createdColumn : filters.dateBasis === 'updated' ? updatedColumn : removedColumn;
  if (filters.dateFrom) clauses.push(`${dateColumn}>=${add(params, filters.dateFrom)}::timestamptz`);
  if (filters.dateUntil) clauses.push(`${dateColumn}<${add(params, filters.dateUntil)}::timestamptz`);
  if (type === 'scenario' && filters.scenario === 'current') clauses.push(`${alias}.is_current=TRUE`);
  if (type === 'scenario' && filters.scenario === 'prior') clauses.push(`${alias}.is_current=FALSE`);
  if (type === 'discovery' && filters.prospect === 'submitted') clauses.push(`${alias}.submitted_at IS NOT NULL`);
  if (type === 'discovery' && filters.prospect === 'draft') clauses.push(`${alias}.submitted_at IS NULL AND ${removedColumn} IS NULL`);
  if (type === 'discovery' && filters.prospect === 'inactive') clauses.push(`${alias}.is_active=FALSE`);
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function fingerprint(type, row) {
  return snapshotHash({
    type,
    id: String(row.id),
    ownerId: row.owner_id && String(row.owner_id),
    createdBy: row.created_by && String(row.created_by),
    updatedAt: row.updated_at || null,
    removedAt: row.removed_at || null,
    current: type === 'scenario' ? row.is_current === true : null,
    outcome: type === 'scenario' ? row.outcome || null : null,
    active: type === 'discovery' ? row.is_active === true : null,
    status: type === 'customer' ? row.customer_status || null : null
  });
}

function dependencyObject(row) {
  return {
    scenarioVersions: Number(row.dependent_scenarios || 0),
    prospectSessions: Number(row.dependent_discovery || 0),
    solutionFits: Number(row.dependent_handoffs || 0),
    scenarioShares: Number(row.scenario_share_count || 0),
    businessCaseShares: Number(row.business_share_count || 0),
    jointProjectPlans: Number(row.jpp_count || 0),
    stakeholders: Number(row.stakeholder_count || 0),
    solutionFitHistory: Number(row.handoff_history_count || 0),
    solutionFitAttachments: Number(row.handoff_attachment_count || 0),
    immutableSubmissions: Number(row.immutable_submission_count || 0),
    valueHistory: Number(row.value_history_count || 0),
    stageHistory: Number(row.stage_history_count || 0),
    valueSnapshots: Number(row.value_snapshot_count || 0),
    auditEvents: Number(row.audit_event_count || 0),
    ownershipTransfers: Number(row.ownership_transfer_count || 0)
  };
}

function present(type, row) {
  return {
    ...row,
    id: String(row.id),
    record_type: type,
    record_name: type === 'customer' ? row.name : type === 'scenario' ? row.name : type === 'handoff' ? row.opportunity : (row.opportunity || row.company || 'Prospect session'),
    owner: row.owner || row.rep || row.se || null,
    creator: row.creator || null,
    status_label: row.already_removed ? 'Removed' : type === 'scenario' && row.outcome ? 'Closed' : type === 'scenario' && !row.is_current ? 'Historical' : 'Active',
    can_remove: !row.already_removed,
    dependencies: dependencyObject(row)
  };
}

async function loadFilteredRecords(client, search, filters) {
  const result = { scenarios: [], discovery: [], customers: [], handoffs: [] };
  const limit = MAX_PREVIEW_RECORDS + 1;

  if (filters.types.includes('scenario')) {
    const where = whereFor({ type: 'scenario', alias: 's', searchColumns: ['s.company', 's.name', 'ou.username', 'cu.username'], ownerColumn: 's.owner_id', creatorColumn: 's.created_by', createdColumn: 's.created_at', updatedColumn: 's.updated_at', removedColumn: 's.deleted_at', filters, search });
    where.params.push(limit);
    const rows = await client.query(`SELECT s.id,s.base_id,s.customer_id,s.name,s.company,s.owner_id,s.created_by,s.created_at,s.updated_at,s.deleted_at removed_at,
        s.deleted_at IS NOT NULL already_removed,s.version,s.is_current,s.outcome,ou.username rep,cu.username creator,ru.username removed_by,
        (SELECT COUNT(*)::int FROM scenario_shares x WHERE x.scenario_id=s.id AND x.is_active=TRUE) scenario_share_count,
        (SELECT COUNT(*)::int FROM business_case_shares x WHERE x.scenario_id=s.id AND x.is_active=TRUE) business_share_count,
        (SELECT COUNT(*)::int FROM mutual_action_plans x WHERE x.scenario_id=s.id) jpp_count,
        (SELECT COUNT(*)::int FROM stakeholders x WHERE x.scenario_id=s.id) stakeholder_count,
        (SELECT COUNT(*)::int FROM discovery_sessions x WHERE x.base_id=s.base_id AND x.cleanup_removed_at IS NULL) dependent_discovery,
        (SELECT COUNT(*)::int FROM discovery_submissions x WHERE x.base_id=s.base_id) immutable_submission_count,
        (SELECT COUNT(*)::int FROM roi_value_events x WHERE x.base_id=s.base_id) value_history_count,
        (SELECT COUNT(*)::int FROM scenario_stage_history x WHERE x.scenario_id=s.id) stage_history_count,
        (SELECT COUNT(*)::int FROM scenario_roi_value_snapshots x WHERE x.scenario_id=s.id) value_snapshot_count,
        (SELECT COUNT(*)::int FROM audit_log x WHERE x.entity_id=s.id) audit_event_count,
        (SELECT COUNT(*)::int FROM customer_ownership_transfers x WHERE x.customer_id=s.customer_id) ownership_transfer_count
      FROM scenarios s JOIN users ou ON ou.id=s.owner_id LEFT JOIN users cu ON cu.id=s.created_by LEFT JOIN users ru ON ru.id=s.cleanup_removed_by
      ${where.sql} ORDER BY s.created_at DESC,s.id LIMIT $${where.params.length}`, where.params);
    result.scenarios = rows.rows.map(row => present('scenario', row));
  }

  if (filters.types.includes('discovery') && filters.status !== 'closed') {
    const where = whereFor({ type: 'discovery', alias: 'ds', searchColumns: ['ds.company', "COALESCE(s.name,'')", 'ou.username', 'cu.username'], ownerColumn: 'ds.owner_id', creatorColumn: 'ds.created_by', createdColumn: 'ds.created_at', updatedColumn: 'ds.updated_at', removedColumn: 'ds.cleanup_removed_at', filters, search });
    where.params.push(limit);
    const rows = await client.query(`SELECT ds.id,ds.scenario_id,ds.base_id,s.customer_id,ds.company,COALESCE(s.name,'Unlinked Prospect session') opportunity,
        ds.owner_id,ds.created_by,ds.created_at,ds.updated_at,ds.cleanup_removed_at removed_at,ds.cleanup_removed_at IS NOT NULL already_removed,
        ds.submitted_at IS NOT NULL submitted,ds.answer_count,ds.is_active,ou.username rep,cu.username creator,ru.username removed_by,
        (SELECT COUNT(*)::int FROM discovery_submissions x WHERE x.discovery_session_id=ds.id) immutable_submission_count,
        (SELECT COUNT(*)::int FROM roi_value_events x WHERE x.discovery_submission_id IN (SELECT sub.id FROM discovery_submissions sub WHERE sub.discovery_session_id=ds.id)) value_history_count,
        (SELECT COUNT(*)::int FROM audit_log x WHERE x.entity_id=ds.id) audit_event_count
      FROM discovery_sessions ds JOIN users ou ON ou.id=ds.owner_id LEFT JOIN scenarios s ON s.id=ds.scenario_id
      LEFT JOIN users cu ON cu.id=ds.created_by LEFT JOIN users ru ON ru.id=ds.cleanup_removed_by
      ${where.sql} ORDER BY ds.created_at DESC,ds.id LIMIT $${where.params.length}`, where.params);
    result.discovery = rows.rows.map(row => present('discovery', row));
  }

  if (filters.types.includes('customer') && filters.status !== 'closed') {
    const where = whereFor({ type: 'customer', alias: 'c', searchColumns: ['c.name', 'ou.username', 'cu.username'], ownerColumn: 'c.owner_id', creatorColumn: 'c.created_by', createdColumn: 'c.created_at', updatedColumn: 'c.updated_at', removedColumn: 'c.deleted_at', filters, search });
    where.params.push(limit);
    const rows = await client.query(`SELECT c.id,c.name,c.owner_id,c.created_by,c.created_at,c.updated_at,c.deleted_at removed_at,c.deleted_at IS NOT NULL already_removed,
        c.status customer_status,ou.username owner,cu.username creator,ru.username removed_by,
        (SELECT COUNT(*)::int FROM scenarios x WHERE x.customer_id=c.id AND x.deleted_at IS NULL) dependent_scenarios,
        (SELECT COUNT(*)::int FROM discovery_sessions x WHERE x.base_id IN (SELECT sx.base_id FROM scenarios sx WHERE sx.customer_id=c.id) AND x.cleanup_removed_at IS NULL) dependent_discovery,
        (SELECT COUNT(*)::int FROM handoffs x WHERE x.customer_id=c.id AND x.deleted_at IS NULL) dependent_handoffs,
        (SELECT COUNT(*)::int FROM scenario_shares x WHERE x.scenario_id IN (SELECT sx.id FROM scenarios sx WHERE sx.customer_id=c.id) AND x.is_active=TRUE) scenario_share_count,
        (SELECT COUNT(*)::int FROM business_case_shares x WHERE x.scenario_id IN (SELECT sx.id FROM scenarios sx WHERE sx.customer_id=c.id) AND x.is_active=TRUE) business_share_count,
        (SELECT COUNT(*)::int FROM mutual_action_plans x WHERE x.scenario_id IN (SELECT sx.id FROM scenarios sx WHERE sx.customer_id=c.id)) jpp_count,
        (SELECT COUNT(*)::int FROM stakeholders x WHERE x.scenario_id IN (SELECT sx.id FROM scenarios sx WHERE sx.customer_id=c.id)) stakeholder_count,
        (SELECT COUNT(*)::int FROM discovery_submissions x WHERE x.base_id IN (SELECT sx.base_id FROM scenarios sx WHERE sx.customer_id=c.id)) immutable_submission_count,
        (SELECT COUNT(*)::int FROM roi_value_events x WHERE x.base_id IN (SELECT sx.base_id FROM scenarios sx WHERE sx.customer_id=c.id)) value_history_count,
        (SELECT COUNT(*)::int FROM scenario_stage_history x WHERE x.scenario_id IN (SELECT sx.id FROM scenarios sx WHERE sx.customer_id=c.id)) stage_history_count,
        (SELECT COUNT(*)::int FROM scenario_roi_value_snapshots x WHERE x.scenario_id IN (SELECT sx.id FROM scenarios sx WHERE sx.customer_id=c.id)) value_snapshot_count,
        (SELECT COUNT(*)::int FROM audit_log x WHERE x.entity_id=c.id) audit_event_count,
        (SELECT COUNT(*)::int FROM customer_ownership_transfers x WHERE x.customer_id=c.id) ownership_transfer_count
      FROM customers c JOIN users ou ON ou.id=c.owner_id LEFT JOIN users cu ON cu.id=c.created_by LEFT JOIN users ru ON ru.id=c.cleanup_removed_by
      ${where.sql} ORDER BY c.created_at DESC,c.id LIMIT $${where.params.length}`, where.params);
    result.customers = rows.rows.map(row => present('customer', row));
  }

  if (filters.types.includes('handoff') && filters.status !== 'closed') {
    const where = whereFor({ type: 'handoff', alias: 'h', searchColumns: ['c.name', "COALESCE(h.data->'opportunity'->>'name','')", 'ou.username', 'cu.username'], ownerColumn: 'h.owner_id', creatorColumn: 'h.created_by', createdColumn: 'h.created_at', updatedColumn: 'h.updated_at', removedColumn: 'h.deleted_at', filters, search });
    where.params.push(limit);
    const rows = await client.query(`SELECT h.id,h.customer_id,c.name customer,COALESCE(h.data->'opportunity'->>'name',c.name||' Solution Fit') opportunity,
        h.owner_id,h.created_by,h.created_at,h.updated_at,h.deleted_at removed_at,h.deleted_at IS NOT NULL already_removed,
        h.status handoff_status,ou.username owner,cu.username creator,ru.username removed_by,
        (SELECT COUNT(*)::int FROM handoff_change_history x WHERE x.handoff_id=h.id) handoff_history_count,
        (SELECT COUNT(*)::int FROM handoff_attachments x WHERE x.handoff_id=h.id) handoff_attachment_count,
        (SELECT COUNT(*)::int FROM audit_log x WHERE x.entity_id=h.id) audit_event_count,
        (SELECT COUNT(*)::int FROM customer_ownership_transfers x WHERE x.customer_id=h.customer_id) ownership_transfer_count
      FROM handoffs h JOIN customers c ON c.id=h.customer_id JOIN users ou ON ou.id=h.owner_id
      LEFT JOIN users cu ON cu.id=h.created_by LEFT JOIN users ru ON ru.id=h.cleanup_removed_by
      ${where.sql} ORDER BY h.created_at DESC,h.id LIMIT $${where.params.length}`, where.params);
    result.handoffs = rows.rows.map(row => present('handoff', row));
  }
  return result;
}

async function customerDependencies(client, customerRows) {
  const ids = customerRows.filter(row => !row.already_removed).map(row => String(row.id));
  if (!ids.length) return {};
  const [scenarios, discovery, handoffs] = await Promise.all([
    client.query(`SELECT id,customer_id,owner_id,created_by,updated_at,deleted_at removed_at,is_current,outcome FROM scenarios WHERE customer_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]),
    client.query(`SELECT ds.id,s.customer_id,ds.owner_id,ds.created_by,ds.updated_at,ds.cleanup_removed_at removed_at,ds.is_active
      FROM discovery_sessions ds JOIN scenarios s ON s.base_id=ds.base_id
      WHERE s.customer_id=ANY($1::uuid[]) AND ds.cleanup_removed_at IS NULL`, [ids]),
    client.query(`SELECT id,customer_id,owner_id,created_by,updated_at,deleted_at removed_at FROM handoffs WHERE customer_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids])
  ]);
  const out = Object.fromEntries(ids.map(id => [id, { scenarioIds: [], discoveryIds: [], handoffIds: [], fingerprints: {} }]));
  const addRow = (type, row) => {
    const id = String(row.customer_id);
    if (!out[id]) return;
    out[id][ID_KEYS[type]].push(String(row.id));
    out[id].fingerprints[`${type}:${row.id}`] = fingerprint(type, row);
  };
  scenarios.rows.forEach(row => addRow('scenario', row));
  const seenDiscovery = new Set();
  discovery.rows.forEach(row => { const key = `${row.customer_id}:${row.id}`; if (!seenDiscovery.has(key)) { seenDiscovery.add(key); addRow('discovery', row); } });
  handoffs.rows.forEach(row => addRow('handoff', row));
  return out;
}

function buildResolved(records, dependencies) {
  const resolved = { scenarioIds: [], discoveryIds: [], customerIds: [], handoffIds: [], fingerprints: {}, rowDependencies: {}, customerDependencies: dependencies };
  for (const type of RECORD_TYPES) {
    const rows = records[TYPE_TO_KEY[type]] || [];
    const key = ID_KEYS[type];
    for (const row of rows) {
      if (!row.can_remove) continue;
      resolved[key].push(String(row.id));
      resolved.fingerprints[`${type}:${row.id}`] = fingerprint(type, row);
      resolved.rowDependencies[`${type}:${row.id}`] = row.dependencies || {};
    }
  }
  return resolved;
}

function totals(records) {
  const all = Object.values(records).flat();
  const dependencies = all.reduce((sum, row) => {
    for (const [key, value] of Object.entries(row.dependencies || {})) sum[key] = (sum[key] || 0) + Number(value || 0);
    return sum;
  }, {});
  return {
    scenarios: records.scenarios.length,
    discovery: records.discovery.length,
    customers: records.customers.length,
    handoffs: records.handoffs.length,
    total: all.length,
    dependencies
  };
}

function expandCustomerSelection(selection, allowed) {
  const expanded = normalizeSelection(selection);
  for (const customerId of expanded.customerIds) {
    const child = allowed.customerDependencies?.[customerId];
    if (!child) continue;
    for (const key of ['scenarioIds', 'discoveryIds', 'handoffIds']) expanded[key] = [...new Set([...expanded[key], ...(child[key] || []).map(String)])];
  }
  return expanded;
}

async function loadCurrentFingerprints(client, selected, { lock = false } = {}) {
  const result = {};
  const suffix = lock ? ' FOR UPDATE' : '';
  /* Customer first matches ownership-transfer lock order and avoids a cleanup /
     transfer deadlock. Remaining record classes use one stable order. */
  if (selected.customerIds.length) {
    const rows = await client.query(`SELECT id,owner_id,created_by,updated_at,deleted_at removed_at,status customer_status FROM customers WHERE id=ANY($1::uuid[]) ORDER BY id${suffix}`, [selected.customerIds]);
    rows.rows.forEach(row => { result[`customer:${row.id}`] = fingerprint('customer', row); });
  }
  if (selected.scenarioIds.length) {
    const rows = await client.query(`SELECT id,owner_id,created_by,updated_at,deleted_at removed_at,is_current,outcome FROM scenarios WHERE id=ANY($1::uuid[]) ORDER BY id${suffix}`, [selected.scenarioIds]);
    rows.rows.forEach(row => { result[`scenario:${row.id}`] = fingerprint('scenario', row); });
  }
  if (selected.discoveryIds.length) {
    const rows = await client.query(`SELECT id,owner_id,created_by,updated_at,cleanup_removed_at removed_at,is_active FROM discovery_sessions WHERE id=ANY($1::uuid[]) ORDER BY id${suffix}`, [selected.discoveryIds]);
    rows.rows.forEach(row => { result[`discovery:${row.id}`] = fingerprint('discovery', row); });
  }
  if (selected.handoffIds.length) {
    const rows = await client.query(`SELECT id,owner_id,created_by,updated_at,deleted_at removed_at FROM handoffs WHERE id=ANY($1::uuid[]) ORDER BY id${suffix}`, [selected.handoffIds]);
    rows.rows.forEach(row => { result[`handoff:${row.id}`] = fingerprint('handoff', row); });
  }
  return result;
}

function assertSnapshotCurrent(selected, allowed, current) {
  const expectedKeys = [];
  for (const [type, key] of Object.entries(ID_KEYS)) for (const id of selected[key]) expectedKeys.push(`${type}:${id}`);
  for (const key of expectedKeys) {
    const expected = allowed.fingerprints?.[key] || Object.values(allowed.customerDependencies || {}).map(x => x.fingerprints?.[key]).find(Boolean);
    if (!expected || !current[key] || expected !== current[key]) {
      const error = new Error('The records matching this preview changed after review. Refresh the preview before continuing.');
      error.status = 409;
      error.code = 'CLEANUP_PREVIEW_STALE';
      throw error;
    }
  }
}

function selectedDependencies(allowed, directSelection) {
  const selected = [];
  for (const [type, key] of Object.entries(ID_KEYS)) for (const id of directSelection[key] || []) selected.push(`${type}:${id}`);
  return selected.reduce((sum, recordKey) => {
    for (const [key, value] of Object.entries(allowed.rowDependencies?.[recordKey] || {})) sum[key] = (sum[key] || 0) + Number(value || 0);
    return sum;
  }, {});
}

async function loadPreview(req, { forUpdate = false } = {}) {
  const runner = req.client || { query };
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const result = await runner.query(`SELECT * FROM admin_cleanup_previews WHERE id=$1 AND admin_user_id=$2 AND expires_at>NOW()${lock}`, [req.previewId, req.userId]);
  if (!result.rows.length) {
    const error = new Error('Cleanup preview expired. Run Preview Results again.');
    error.status = 409;
    error.code = 'CLEANUP_PREVIEW_EXPIRED';
    throw error;
  }
  const preview = result.rows[0];
  if (preview.used_at) {
    const error = new Error('This cleanup preview was already used. Run Preview Results again.');
    error.status = 409;
    error.code = 'CLEANUP_PREVIEW_USED';
    throw error;
  }
  return preview;
}

function directSelection(body, preview) {
  const allowed = preview.resolved_records || {};
  if (body.mode === 'all') return normalizeSelection(allowed);
  const selected = normalizeSelection(body);
  if (!isSubset(selected, allowed)) {
    const error = new CleanupValidationError('Selection is not part of the authorized preview.', 'CLEANUP_SELECTION_INVALID');
    throw error;
  }
  return selected;
}

router.get('/options', async (_req, res) => {
  try {
    const users = await query(`SELECT id,username,role,roles FROM users WHERE is_active=TRUE ORDER BY LOWER(username),id`);
    res.json({
      recordTypes: [
        { value: 'scenario', label: 'Opportunities / scenarios' },
        { value: 'discovery', label: 'Prospect / Discovery sessions' },
        { value: 'customer', label: 'Customers' },
        { value: 'handoff', label: 'Solution Fit / Handoff' }
      ],
      owners: users.rows.filter(user => user.role === 'rep' || (user.roles || []).includes('rep')).map(user => ({ id: user.id, username: user.username })),
      creators: users.rows.map(user => ({ id: user.id, username: user.username })),
      timezone: 'UTC',
      maxPreviewRecords: MAX_PREVIEW_RECORDS
    });
  } catch (error) {
    console.error('cleanup.options.failed', { message: error.message });
    res.status(500).json({ error: 'Cleanup filter options could not be loaded.' });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const search = String(req.body?.search || req.body?.company || '').trim().slice(0, 200);
    const filters = normalizeFilters(req.body?.filters || {});
    const data = await transaction(async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const records = await loadFilteredRecords(client, search, filters);
      const summary = totals(records);
      if (summary.total > MAX_PREVIEW_RECORDS) {
        const error = new Error(`More than ${MAX_PREVIEW_RECORDS} records match. Narrow the filters before previewing a bulk action.`);
        error.status = 413;
        error.code = 'CLEANUP_PREVIEW_TOO_LARGE';
        throw error;
      }
      const dependencies = await customerDependencies(client, records.customers);
      const resolved = buildResolved(records, dependencies);
      const hash = snapshotHash({ resolved, filters, search });
      const inserted = await client.query(`INSERT INTO admin_cleanup_previews
        (admin_user_id,search_text,filters,resolved_records,snapshot_hash,record_count,dependency_summary)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,expires_at`, [req.user.id, search, filters, resolved, hash, summary.total, summary.dependencies]);
      return { records, summary, resolved, hash, row: inserted.rows[0] };
    });
    res.json({
      previewId: data.row.id,
      expiresAt: data.row.expires_at,
      snapshotHash: data.hash,
      search,
      filters,
      filterSummary: filterSummary(search, filters),
      ...data.records,
      summary: data.summary,
      preservation: ['ROI Value History', 'Immutable Prospect submissions', 'Scenario ROI value snapshots', 'BuyCycle stage history', 'Audit history', 'Customer ownership transfer history']
    });
  } catch (error) {
    console.error('cleanup.preview.failed', { userId: req.user.id, code: error.code, message: error.message });
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Preview failed.', code: error.code || 'CLEANUP_PREVIEW_FAILED' });
  }
});

router.post('/impact', async (req, res) => {
  try {
    const preview = await loadPreview({ previewId: String(req.body?.previewId || ''), userId: req.user.id });
    const direct = directSelection(req.body || {}, preview);
    if (!selectionCount(direct)) return res.status(400).json({ error: 'Select at least one previewed record.' });
    const expanded = expandCustomerSelection(direct, preview.resolved_records || {});
    const count = selectionCount(expanded);
    const allowed = preview.resolved_records || {};
    res.json({
      directCount: selectionCount(direct),
      affectedCount: count,
      breakdown: Object.fromEntries(Object.entries(expanded).map(([key, ids]) => [key, ids.length])),
      dependencies: selectedDependencies(allowed, direct),
      preservation: ['Immutable Prospect submissions', 'ROI Value History', 'Rep Confirmed events', 'BuyCycle stage history', 'Audit and ownership-transfer history'],
      filterSummary: filterSummary(preview.search_text, preview.filters || {}),
      typedConfirmationRequired: needsTypedConfirmation(req.body?.mode === 'all' ? 'all' : 'selected', count),
      confirmationPhrase: confirmationPhrase(count),
      recoverable: true
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Cleanup impact could not be loaded.', code: error.code || 'CLEANUP_IMPACT_FAILED' });
  }
});

async function writeRecordAudit(client, { actorId, batchId, type, ids, prior, ipAddress }) {
  for (const id of ids) {
    const key = `${type}:${id}`;
    await client.query(`INSERT INTO audit_log(user_id,action,entity_type,entity_id,detail,ip_address)
      VALUES($1,'admin.cleanup_record_removed',$2,$3,$4,$5)`, [actorId, type, id, { batchId, priorFingerprint: prior[key], newState: 'removed' }, ipAddress]);
  }
}

router.post('/execute', async (req, res) => {
  const body = req.body || {};
  const reason = String(body.reason || '').trim();
  const note = String(body.note || '').trim().slice(0, 500);
  const mode = body.mode === 'all' ? 'all' : 'selected';
  if (!REASONS.has(reason)) return res.status(400).json({ error: 'A cleanup reason is required.', code: 'CLEANUP_REASON_REQUIRED' });
  try {
    const result = await transaction(async client => {
      const preview = await loadPreview({ previewId: String(body.previewId || ''), userId: req.user.id, client }, { forUpdate: true });
      const direct = directSelection({ ...body, mode }, preview);
      if (!selectionCount(direct)) throw new CleanupValidationError('Select at least one previewed record.');
      const selected = expandCustomerSelection(direct, preview.resolved_records || {});
      const affectedCount = selectionCount(selected);
      if (affectedCount > MAX_PREVIEW_RECORDS) {
        const error = new Error(`This action affects more than ${MAX_PREVIEW_RECORDS} records. Narrow the filters and run a smaller atomic cleanup.`);
        error.status = 413;
        error.code = 'CLEANUP_BATCH_TOO_LARGE';
        throw error;
      }
      if (needsTypedConfirmation(mode, affectedCount) && String(body.typedConfirmation || '') !== confirmationPhrase(affectedCount)) {
        throw new CleanupValidationError('Typed confirmation did not match.', 'CLEANUP_CONFIRMATION_MISMATCH');
      }
      const current = await loadCurrentFingerprints(client, selected, { lock: true });
      assertSnapshotCurrent(selected, preview.resolved_records || {}, current);
      const batchId = crypto.randomUUID();
      const out = { scenariosRemoved: 0, discoveryRemoved: 0, customersRemoved: 0, handoffsRemoved: 0, scenarioSharesDeactivated: 0, businessSharesDeactivated: 0, currentVersionsPromoted: 0 };
      const selectedBreakdown = Object.fromEntries(Object.entries(selected).map(([key, ids]) => [key, ids.length]));
      await client.query(`INSERT INTO admin_cleanup_batches
        (id,admin_user_id,preview_id,mode,search_text,filters,reason,note,requested_count,removed_count,skipped_count,failed_count,typed_confirmation_used,result_summary,completed_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,0,0,$10,$11,NOW())`, [batchId, req.user.id, preview.id, mode, preview.search_text, preview.filters, reason, note || null, affectedCount, needsTypedConfirmation(mode, affectedCount), { atomic: true, selectedBreakdown }]);
      let touchedBases = [];
      if (selected.scenarioIds.length) {
        const locked = await client.query(`SELECT id,base_id FROM scenarios WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL`, [selected.scenarioIds]);
        touchedBases = [...new Set(locked.rows.map(row => row.base_id))];
        out.scenariosRemoved = (await client.query(`UPDATE scenarios SET deleted_at=NOW(),is_current=FALSE,cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4,cleanup_batch_id=$5 WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`, [selected.scenarioIds, req.user.id, reason, note || null, batchId])).rowCount;
        out.scenarioSharesDeactivated = (await client.query(`UPDATE scenario_shares SET is_active=FALSE WHERE scenario_id=ANY($1::uuid[]) AND is_active=TRUE RETURNING id`, [selected.scenarioIds])).rowCount;
        out.businessSharesDeactivated = (await client.query(`UPDATE business_case_shares SET is_active=FALSE WHERE scenario_id=ANY($1::uuid[]) AND is_active=TRUE RETURNING id`, [selected.scenarioIds])).rowCount;
        for (const baseId of touchedBases) {
          await client.query(`UPDATE scenarios SET is_current=FALSE WHERE base_id=$1 AND deleted_at IS NULL`, [baseId]);
          const promoted = await client.query(`UPDATE scenarios SET is_current=TRUE WHERE id=(SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL ORDER BY version DESC,updated_at DESC,id DESC LIMIT 1) RETURNING id`, [baseId]);
          out.currentVersionsPromoted += promoted.rowCount;
        }
      }
      if (selected.discoveryIds.length) out.discoveryRemoved = (await client.query(`UPDATE discovery_sessions SET is_active=FALSE,cleanup_removed_at=NOW(),cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4,cleanup_batch_id=$5 WHERE id=ANY($1::uuid[]) AND cleanup_removed_at IS NULL RETURNING id`, [selected.discoveryIds, req.user.id, reason, note || null, batchId])).rowCount;
      if (selected.handoffIds.length) out.handoffsRemoved = (await client.query(`UPDATE handoffs SET deleted_at=NOW(),cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4,cleanup_batch_id=$5 WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`, [selected.handoffIds, req.user.id, reason, note || null, batchId])).rowCount;
      if (selected.customerIds.length) out.customersRemoved = (await client.query(`UPDATE customers SET deleted_at=NOW(),cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4,cleanup_batch_id=$5 WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`, [selected.customerIds, req.user.id, reason, note || null, batchId])).rowCount;
      const removedCount = out.scenariosRemoved + out.discoveryRemoved + out.handoffsRemoved + out.customersRemoved;
      if (removedCount !== affectedCount) {
        const error = new Error('One or more records changed during cleanup. Nothing was removed. Refresh the preview and try again.');
        error.status = 409;
        error.code = 'CLEANUP_CONCURRENT_CHANGE';
        throw error;
      }
      for (const [type, key] of Object.entries(ID_KEYS)) await writeRecordAudit(client, { actorId: req.user.id, batchId, type, ids: selected[key], prior: current, ipAddress: req.ip });
      await client.query(`UPDATE admin_cleanup_previews SET used_at=NOW() WHERE id=$1`, [preview.id]);
      await client.query(`INSERT INTO audit_log(user_id,action,entity_type,entity_id,detail,ip_address)
        VALUES($1,'admin.cleanup_batch_removed','admin_cleanup_batch',$2,$3,$4)`, [req.user.id, batchId, { previewId: preview.id, mode, search: preview.search_text, filters: preview.filters, reason, requestedCount: affectedCount, removedCount, selectedIds: selected, preserved: ['roi_value_events', 'discovery_submissions', 'scenario_roi_value_snapshots', 'scenario_stage_history', 'customer_ownership_transfers', 'audit_log'], result: out }, req.ip]);
      return { batchId, requestedCount: affectedCount, removedCount, skippedCount: 0, failedCount: 0, ...out };
    });
    res.json({ ok: true, ...result, evidencePreserved: true, immutableProspectSubmissionsPreserved: true, valueHistoryPreserved: true, stageHistoryPreserved: true, ownershipHistoryPreserved: true, auditHistoryPreserved: true });
  } catch (error) {
    console.error('cleanup.execute.failed', { userId: req.user.id, code: error.code, message: error.message });
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Cleanup failed. No records were changed.', code: error.code || 'CLEANUP_EXECUTE_FAILED' });
  }
});

router.get('/deleted', async (req, res) => {
  try {
    const types = String(req.query.types || '').split(',').filter(Boolean);
    const filters = normalizeFilters({ ...req.query, types }, { removedView: true });
    const search = String(req.query.search || '').trim().slice(0, 200);
    const records = await transaction(async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      return loadFilteredRecords(client, search, filters);
    });
    const summary = totals(records);
    if (summary.total > MAX_PREVIEW_RECORDS) return res.status(413).json({ error: `More than ${MAX_PREVIEW_RECORDS} removed records match. Narrow the recovery filters.` });
    res.json({ ...records, summary, filters });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to load removed records.', code: error.code || 'CLEANUP_REMOVED_FAILED' });
  }
});

router.post('/restore', async (req, res) => {
  const type = String(req.body?.type || '');
  const id = String(req.body?.id || '');
  if (!RECORD_TYPES.includes(type) || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'A supported record type and id are required.' });
  try {
    const detail = await transaction(async client => {
      let restored;
      let baseId = null;
      if (type === 'scenario') {
        const locked = await client.query(`SELECT id,base_id,owner_id,deleted_at FROM scenarios WHERE id=$1 FOR UPDATE`, [id]);
        if (!locked.rows.length) return null;
        if (!locked.rows[0].deleted_at) throw Object.assign(new Error('This Scenario is already active.'), { status: 409, code: 'CLEANUP_ALREADY_ACTIVE' });
        baseId = locked.rows[0].base_id;
        restored = await client.query(`UPDATE scenarios SET deleted_at=NULL,is_current=FALSE,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=$1 RETURNING id`, [id]);
        const current = await client.query(`SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL AND is_current=TRUE LIMIT 1`, [baseId]);
        if (!current.rowCount) {
          await client.query(`UPDATE scenarios SET is_current=FALSE WHERE base_id=$1 AND deleted_at IS NULL`, [baseId]);
          await client.query(`UPDATE scenarios SET is_current=TRUE WHERE id=(SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL ORDER BY version DESC,updated_at DESC,id DESC LIMIT 1)`, [baseId]);
        }
      } else if (type === 'customer') {
        const locked = await client.query(`SELECT id,owner_id,deleted_at,cleanup_batch_id FROM customers WHERE id=$1 FOR UPDATE`, [id]);
        if (!locked.rows.length) return null;
        if (!locked.rows[0].deleted_at) throw Object.assign(new Error('This Customer is already active.'), { status: 409, code: 'CLEANUP_ALREADY_ACTIVE' });
        const batchId = locked.rows[0].cleanup_batch_id;
        const dependentRestored = { scenarios: 0, discovery: 0, handoffs: 0, currentVersionsPromoted: 0 };
        let restoredBases = [];
        if (batchId) {
          const scenarioRows = await client.query(`SELECT id,base_id FROM scenarios WHERE customer_id=$1 AND cleanup_batch_id=$2 AND deleted_at IS NOT NULL ORDER BY id FOR UPDATE`, [id, batchId]);
          restoredBases = [...new Set(scenarioRows.rows.map(row => row.base_id))];
          if (scenarioRows.rowCount) {
            dependentRestored.scenarios = (await client.query(`UPDATE scenarios SET deleted_at=NULL,is_current=FALSE,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=ANY($1::uuid[]) RETURNING id`, [scenarioRows.rows.map(row => row.id)])).rowCount;
          }
          if (restoredBases.length) {
            const discoveryRows = await client.query(`SELECT id FROM discovery_sessions WHERE base_id=ANY($1::uuid[]) AND cleanup_batch_id=$2 AND cleanup_removed_at IS NOT NULL ORDER BY id FOR UPDATE`, [restoredBases, batchId]);
            if (discoveryRows.rowCount) dependentRestored.discovery = (await client.query(`UPDATE discovery_sessions SET cleanup_removed_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL,is_active=FALSE WHERE id=ANY($1::uuid[]) RETURNING id`, [discoveryRows.rows.map(row => row.id)])).rowCount;
          }
          const handoffRows = await client.query(`SELECT id FROM handoffs WHERE customer_id=$1 AND cleanup_batch_id=$2 AND deleted_at IS NOT NULL ORDER BY id FOR UPDATE`, [id, batchId]);
          if (handoffRows.rowCount) dependentRestored.handoffs = (await client.query(`UPDATE handoffs SET deleted_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=ANY($1::uuid[]) RETURNING id`, [handoffRows.rows.map(row => row.id)])).rowCount;
          for (const restoredBase of restoredBases) {
            const current = await client.query(`SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL AND is_current=TRUE LIMIT 1`, [restoredBase]);
            if (!current.rowCount) {
              await client.query(`UPDATE scenarios SET is_current=FALSE WHERE base_id=$1 AND deleted_at IS NULL`, [restoredBase]);
              dependentRestored.currentVersionsPromoted += (await client.query(`UPDATE scenarios SET is_current=TRUE WHERE id=(SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL ORDER BY version DESC,updated_at DESC,id DESC LIMIT 1) RETURNING id`, [restoredBase])).rowCount;
            }
          }
        }
        restored = await client.query(`UPDATE customers SET deleted_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=$1 RETURNING id`, [id]);
        const detail = { type, id, cleanupBatchId: batchId, dependentRestored, externalLinksRemainInactive: true, identityPreserved: true, ownershipPreserved: true };
        await client.query(`INSERT INTO audit_log(user_id,action,entity_type,entity_id,detail,ip_address) VALUES($1,'admin.cleanup_restored',$2,$3,$4,$5)`, [req.user.id, type, id, detail, req.ip]);
        return detail;
      } else {
        const table = type === 'customer' ? 'customers' : type === 'discovery' ? 'discovery_sessions' : 'handoffs';
        const removedColumn = type === 'discovery' ? 'cleanup_removed_at' : 'deleted_at';
        const locked = await client.query(`SELECT id,${removedColumn} removed_at FROM ${table} WHERE id=$1 FOR UPDATE`, [id]);
        if (!locked.rows.length) return null;
        if (!locked.rows[0].removed_at) throw Object.assign(new Error('This record is already active.'), { status: 409, code: 'CLEANUP_ALREADY_ACTIVE' });
        if (type === 'discovery') restored = await client.query(`UPDATE discovery_sessions SET cleanup_removed_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL,is_active=FALSE WHERE id=$1 RETURNING id`, [id]);
        else restored = await client.query(`UPDATE ${table} SET deleted_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=$1 RETURNING id`, [id]);
      }
      if (!restored?.rowCount) return null;
      const detail = { type, id, baseId, externalLinksRemainInactive: true, identityPreserved: true, ownershipPreserved: true };
      await client.query(`INSERT INTO audit_log(user_id,action,entity_type,entity_id,detail,ip_address) VALUES($1,'admin.cleanup_restored',$2,$3,$4,$5)`, [req.user.id, type, id, detail, req.ip]);
      return detail;
    });
    if (!detail) return res.status(404).json({ error: 'Record not found.' });
    res.json({ ok: true, ...detail });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Restore failed.', code: error.code || 'CLEANUP_RESTORE_FAILED' });
  }
});

module.exports = router;
