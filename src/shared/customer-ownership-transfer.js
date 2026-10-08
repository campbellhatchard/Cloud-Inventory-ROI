'use strict';

class OwnershipTransferError extends Error {
  constructor(message, { status = 400, code = 'OWNERSHIP_TRANSFER_INVALID' } = {}) {
    super(message);
    this.name = 'OwnershipTransferError';
    this.status = status;
    this.code = code;
  }
}

const PRESERVED_ITEMS = Object.freeze([
  'Customer identity and opportunity base IDs',
  'Scenario version identities, ROI inputs and calculated economics',
  'Immutable Prospect submissions and submitted-answer evidence',
  'ROI Value History, Rep Confirmed actors and application history',
  'Buyer Evidence, BuyCycle history and historical timestamps',
  'Primary and additional Solution Engineer assignments',
  'Solution Fit creator and change history',
  'Joint Project Plan and Stakeholder business content',
  'Proposal, Three Whys and Executive Value Story revisions',
  'Frozen Customer Business Cases, share tokens and published content',
  'Existing audit events, notification history and all historical actors'
]);

const CHANGED_ITEMS = Object.freeze([
  'Current Customer owner',
  'Current owner-derived Sales Rep access',
  'Current team and Sales Leader visibility derived from the new owner',
  'Operational owner scope on scenarios, Prospect Links, Stakeholders, Joint Project Plans and Solution Fit',
  'Recipient for future owner-routed Prospect submission notifications'
]);

function cleanReason(value) {
  const reason = String(value || '').trim();
  if (!reason) throw new OwnershipTransferError('A reason for transfer is required.', { code: 'TRANSFER_REASON_REQUIRED' });
  if (reason.length > 1000) throw new OwnershipTransferError('The transfer reason must be 1,000 characters or fewer.', { code: 'TRANSFER_REASON_TOO_LONG' });
  return reason;
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function presentOwner(row) {
  return row ? { id: row.id || row.owner_id, name: row.username || row.owner_username || '' } : null;
}

async function loadCustomer(runner, customerId, { lock = false } = {}) {
  const result = await runner.query(
    `SELECT c.id,c.name,c.owner_id,c.status,c.deleted_at,c.created_at,c.updated_at,
            u.username owner_username
       FROM customers c
       JOIN users u ON u.id=c.owner_id
      WHERE c.id=$1
      ${lock ? 'FOR UPDATE OF c' : ''}`,
    [customerId]
  );
  const customer = result.rows[0];
  if (!customer) throw new OwnershipTransferError('Customer not found.', { status: 404, code: 'CUSTOMER_NOT_FOUND' });
  if (customer.deleted_at || String(customer.status || 'active') !== 'active') {
    throw new OwnershipTransferError('Restore this customer before transferring ownership.', { status: 409, code: 'CUSTOMER_INACTIVE' });
  }
  return customer;
}

async function loadEligibleOwner(runner, userId) {
  const result = await runner.query(
    `SELECT id,username,role,roles
       FROM users
      WHERE id=$1
        AND is_active=TRUE
        AND (role='rep' OR 'rep'=ANY(COALESCE(roles,'{}'::text[])))`,
    [userId]
  );
  const owner = result.rows[0];
  if (!owner) {
    throw new OwnershipTransferError('The selected Sales Rep is no longer eligible to own customers.', {
      status: 409,
      code: 'NEW_OWNER_INELIGIBLE'
    });
  }
  return owner;
}

async function assertNoCustomerIdentityCollision(runner, customer, newOwnerId) {
  const result = await runner.query(
    `SELECT id,name
       FROM customers
      WHERE owner_id=$1
        AND LOWER(name)=LOWER($2)
        AND id<>$3
      LIMIT 1`,
    [newOwnerId, customer.name, customer.id]
  );
  if (result.rows.length) {
    throw new OwnershipTransferError(
      `${customer.name} already exists under the selected Sales Rep. Ownership transfer does not merge customers.`,
      { status: 409, code: 'CUSTOMER_IDENTITY_CONFLICT' }
    );
  }
}

async function loadImpactCounts(runner, customer) {
  const result = await runner.query(
    `WITH customer_scenarios AS (
       SELECT id,base_id,data FROM scenarios WHERE customer_id=$1
     ), customer_bases AS (
       SELECT DISTINCT base_id FROM customer_scenarios
     ), customer_sessions AS (
       SELECT ds.id FROM discovery_sessions ds
       WHERE ds.scenario_id IN (SELECT id FROM customer_scenarios)
     )
     SELECT
       1::int customer,
       (SELECT COUNT(DISTINCT base_id)::int FROM customer_scenarios) opportunities,
       (SELECT COUNT(*)::int FROM customer_scenarios) scenario_versions,
       (SELECT COUNT(*)::int FROM discovery_sessions ds WHERE ds.id IN (SELECT id FROM customer_sessions) AND ds.is_active=TRUE) active_prospect_links,
       (SELECT COUNT(*)::int FROM discovery_submissions sub WHERE sub.discovery_session_id IN (SELECT id FROM customer_sessions)) prospect_submissions,
       (SELECT COUNT(*)::int FROM stakeholders st WHERE st.scenario_id IN (SELECT id FROM customer_scenarios) OR (st.scenario_id IS NULL AND st.owner_id=$2 AND LOWER(st.company)=LOWER($3))) stakeholders,
       (SELECT COUNT(*)::int FROM handoffs h WHERE h.customer_id=$1 AND h.deleted_at IS NULL) solution_fits,
       (SELECT COUNT(*)::int FROM mutual_action_plans p WHERE p.scenario_id IN (SELECT id FROM customer_scenarios) OR (p.scenario_id IS NULL AND p.owner_id=$2 AND LOWER(p.company)=LOWER($3))) joint_project_plans,
       (SELECT COUNT(*)::int FROM customer_scenarios cs WHERE cs.data ? 'proposalDraft' AND COALESCE(cs.data->'proposalDraft','{}'::jsonb)<>'{}'::jsonb) proposals,
       (SELECT COUNT(*)::int FROM business_case_shares b WHERE b.scenario_id IN (SELECT id FROM customer_scenarios) AND b.published_payload IS NOT NULL) published_records,
       (SELECT COUNT(*)::int FROM roi_value_events e WHERE e.base_id IN (SELECT base_id FROM customer_bases)) value_history,
       (SELECT COUNT(*)::int FROM roi_value_events e WHERE e.base_id IN (SELECT base_id FROM customer_bases) AND e.event_type='rep_confirmed') rep_confirmed_events,
       (SELECT COUNT(*)::int FROM scenario_stage_governance g WHERE g.scenario_id IN (SELECT id FROM customer_scenarios)) buyer_evidence_records,
       (SELECT COUNT(*)::int FROM driver_resonance r WHERE r.scenario_id IN (SELECT id FROM customer_scenarios)) driver_resonance_records,
       (SELECT COUNT(*)::int FROM prospect_submission_notifications n JOIN discovery_submissions sub ON sub.id=n.submission_id WHERE sub.discovery_session_id IN (SELECT id FROM customer_sessions)) notification_history,
       (SELECT COUNT(*)::int FROM audit_log a WHERE (a.entity_type='customer' AND a.entity_id=$1) OR a.entity_id IN (SELECT id FROM customer_scenarios)) audit_history`,
    [customer.id, customer.owner_id, customer.name]
  );
  const row = result.rows[0] || {};
  return {
    customer: number(row.customer),
    opportunities: number(row.opportunities),
    scenarioVersions: number(row.scenario_versions),
    activeProspectLinks: number(row.active_prospect_links),
    prospectSubmissions: number(row.prospect_submissions),
    stakeholders: number(row.stakeholders),
    solutionFits: number(row.solution_fits),
    jointProjectPlans: number(row.joint_project_plans),
    proposals: number(row.proposals),
    publishedRecords: number(row.published_records),
    valueHistory: number(row.value_history),
    repConfirmedEvents: number(row.rep_confirmed_events),
    buyerEvidenceRecords: number(row.buyer_evidence_records),
    driverResonanceRecords: number(row.driver_resonance_records),
    notificationHistory: number(row.notification_history),
    auditHistory: number(row.audit_history)
  };
}

async function listEligibleOwners(dataQuery) {
  const result = await dataQuery(
    `SELECT id,username,role,roles
       FROM users
      WHERE is_active=TRUE
        AND (role='rep' OR 'rep'=ANY(COALESCE(roles,'{}'::text[])))
      ORDER BY LOWER(username),id`
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.username,
    roles: Array.isArray(row.roles) && row.roles.length ? row.roles : [row.role]
  }));
}

async function previewCustomerOwnershipTransfer({ customerId, newOwnerId, dataQuery }) {
  const runner = { query: dataQuery };
  const customer = await loadCustomer(runner, customerId);
  const newOwner = await loadEligibleOwner(runner, newOwnerId);
  if (String(customer.owner_id) === String(newOwner.id)) {
    throw new OwnershipTransferError(`This customer is already assigned to ${newOwner.username}.`, {
      status: 409,
      code: 'SAME_OWNER'
    });
  }
  await assertNoCustomerIdentityCollision(runner, customer, newOwner.id);
  const counts = await loadImpactCounts(runner, customer);
  return {
    preparedAt: new Date().toISOString(),
    customer: { id: customer.id, name: customer.name },
    currentOwner: { id: customer.owner_id, name: customer.owner_username },
    newOwner: presentOwner(newOwner),
    expectedCurrentOwnerId: customer.owner_id,
    counts,
    willChange: [...CHANGED_ITEMS],
    willPreserve: [...PRESERVED_ITEMS]
  };
}

async function updateOperationalOwnership(client, customer, newOwnerId) {
  const scoped = [customer.id, newOwnerId];
  const legacyScoped = [customer.id, newOwnerId, customer.owner_id, customer.name];
  const updates = {};
  let result = await client.query(
    `UPDATE discovery_sessions ds SET owner_id=$2
      WHERE ds.scenario_id IN (SELECT id FROM scenarios WHERE customer_id=$1)
        AND ds.owner_id IS DISTINCT FROM $2`,
    scoped
  );
  updates.prospectLinks = result.rowCount;

  result = await client.query(
    `UPDATE mutual_action_plans p SET owner_id=$2
      WHERE (p.scenario_id IN (SELECT id FROM scenarios WHERE customer_id=$1)
             OR (p.scenario_id IS NULL AND p.owner_id=$3 AND LOWER(p.company)=LOWER($4)))
        AND p.owner_id IS DISTINCT FROM $2`,
    legacyScoped
  );
  updates.jointProjectPlans = result.rowCount;

  result = await client.query(
    `UPDATE stakeholders st SET owner_id=$2
      WHERE (st.scenario_id IN (SELECT id FROM scenarios WHERE customer_id=$1)
             OR (st.scenario_id IS NULL AND st.owner_id=$3 AND LOWER(st.company)=LOWER($4)))
        AND st.owner_id IS DISTINCT FROM $2`,
    legacyScoped
  );
  updates.stakeholders = result.rowCount;

  result = await client.query(
    `UPDATE handoffs SET owner_id=$2
      WHERE customer_id=$1 AND owner_id IS DISTINCT FROM $2`,
    scoped
  );
  updates.solutionFits = result.rowCount;

  result = await client.query(
    `UPDATE driver_resonance r SET owner_id=$2
      WHERE r.scenario_id IN (SELECT id FROM scenarios WHERE customer_id=$1)
        AND r.owner_id IS DISTINCT FROM $2`,
    scoped
  );
  updates.driverResonanceRecords = result.rowCount;

  result = await client.query(
    `UPDATE scenarios SET owner_id=$2
      WHERE customer_id=$1 AND owner_id IS DISTINCT FROM $2`,
    scoped
  );
  updates.scenarioVersions = result.rowCount;

  result = await client.query(
    `UPDATE customers SET owner_id=$2,updated_at=NOW()
      WHERE id=$1 AND owner_id=$3`,
    [customer.id, newOwnerId, customer.owner_id]
  );
  if (result.rowCount !== 1) {
    throw new OwnershipTransferError('Customer ownership changed. Refresh and review before retrying.', {
      status: 409,
      code: 'OWNERSHIP_CONFLICT'
    });
  }
  updates.customer = 1;
  return updates;
}

async function transferCustomerOwnership({
  customerId,
  newOwnerId,
  expectedCurrentOwnerId,
  reason,
  adminUserId,
  ipAddress = null,
  transaction,
  beforeAudit = null
}) {
  const transferReason = cleanReason(reason);
  if (!expectedCurrentOwnerId) {
    throw new OwnershipTransferError('Refresh the ownership preview before confirming this transfer.', {
      status: 409,
      code: 'PREVIEW_REQUIRED'
    });
  }
  try {
    return await transaction(async client => {
      const customer = await loadCustomer(client, customerId, { lock: true });
      if (String(customer.owner_id) !== String(expectedCurrentOwnerId)) {
        throw new OwnershipTransferError('Customer ownership changed after this transfer was prepared. Refresh and review the current owner before trying again.', {
          status: 409,
          code: 'OWNERSHIP_CONFLICT'
        });
      }
      const newOwner = await loadEligibleOwner(client, newOwnerId);
      if (String(customer.owner_id) === String(newOwner.id)) {
        throw new OwnershipTransferError(`This customer is already assigned to ${newOwner.username}.`, {
          status: 409,
          code: 'SAME_OWNER'
        });
      }
      await assertNoCustomerIdentityCollision(client, customer, newOwner.id);
      const impactCounts = await loadImpactCounts(client, customer);
      const operationalCounts = await updateOperationalOwnership(client, customer, newOwner.id);
      if (typeof beforeAudit === 'function') await beforeAudit(client);

      const auditDetail = {
        customerId: customer.id,
        customerName: customer.name,
        oldOwnerId: customer.owner_id,
        oldOwnerName: customer.owner_username,
        newOwnerId: newOwner.id,
        newOwnerName: newOwner.username,
        reason: transferReason,
        impactCounts,
        operationalCounts
      };
      const transfer = await client.query(
        `INSERT INTO customer_ownership_transfers
           (customer_id,customer_name,old_owner_id,old_owner_name,new_owner_id,new_owner_name,admin_actor_id,reason,affected_counts,ip_address)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
         RETURNING id,created_at`,
        [customer.id, customer.name, customer.owner_id, customer.owner_username,
          newOwner.id, newOwner.username, adminUserId, transferReason,
          JSON.stringify({ impact: impactCounts, operational: operationalCounts }), ipAddress]
      );
      if (!transfer.rows[0]) throw new Error('Ownership transfer audit record was not created.');
      await client.query(
        `INSERT INTO audit_log(user_id,action,entity_type,entity_id,detail,ip_address)
         VALUES($1,'customer.ownership_transferred','customer',$2,$3::jsonb,$4)`,
        [adminUserId, customer.id, JSON.stringify({ ...auditDetail, transferId: transfer.rows[0].id }), ipAddress]
      );
      return {
        ok: true,
        transferId: transfer.rows[0].id,
        transferredAt: transfer.rows[0].created_at,
        customer: { id: customer.id, name: customer.name },
        oldOwner: { id: customer.owner_id, name: customer.owner_username },
        newOwner: presentOwner(newOwner),
        impactCounts,
        operationalCounts,
        willPreserve: [...PRESERVED_ITEMS]
      };
    });
  } catch (error) {
    if (error?.code === '23505' && error?.constraint === 'idx_customers_owner_name') {
      throw new OwnershipTransferError('This customer name is already assigned to the selected Sales Rep. Ownership transfer does not merge customers.', {
        status: 409,
        code: 'CUSTOMER_IDENTITY_CONFLICT'
      });
    }
    throw error;
  }
}

module.exports = {
  OwnershipTransferError,
  CHANGED_ITEMS,
  PRESERVED_ITEMS,
  cleanReason,
  loadImpactCounts,
  listEligibleOwners,
  previewCustomerOwnershipTransfer,
  transferCustomerOwnership,
  updateOperationalOwnership
};
