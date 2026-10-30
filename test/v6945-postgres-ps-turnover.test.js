'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const HAS_DB = Boolean(process.env.DATABASE_URL);
const blocked = HAS_DB ? false : 'DATABASE_URL unavailable — v6.9.45 PS Turnover PostgreSQL integration is NOT TESTED';

if (!HAS_DB) test('v6.9.45 PS Turnover PostgreSQL integration gate', { skip: blocked }, () => {});
else describe('v6.9.45 PS Turnover saved-state, authorization, and evidence isolation against disposable PostgreSQL', { concurrency: false }, () => {
  let db;
  const ids = {};
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const fitState = {
    opportunity: { customer: `Turnover Customer A ${suffix}`, products: ['MEP', 'CIP'], stage: 'Stage 3' },
    solutionScope: { primaryProduct: 'MEP', additionalProducts: ['CIP'], erp: 'JDE', packageMode: 'standard' },
    inventoryConfiguration: {}, lpnConfiguration: {}, printing: {}, architecture: {}, partner: {}, drivers: {}, turnover: {},
    processes: [
      { id: 'PG-MEP-CYCLE', name: 'Cycle Count', product: 'MEP', erp: 'JDE', group: 'Inventory', selected: true },
      { id: 'PG-CIP-CYCLE', name: 'Cycle Count', product: 'CIP', group: 'Inventory', selected: true }
    ],
    gaps: [{ id: 'PG-GAP-1', processId: 'PG-CIP-CYCLE', process: 'Cycle Count', product: 'CIP', gapDescription: 'Approval exception', status: 'Open' }],
    interfaces: []
  };

  function principal(row) { return { id: row.id, username: row.username, role: row.role, roleKeys: row.roles }; }

  before(async () => {
    await require('../src/migrate').runMigrations();
    db = require('../src/db');
    async function addUser(label, role, roles = [role]) {
      return (await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active)
        VALUES($1,$2,'not-used-in-direct-integration',$3,$4,FALSE,TRUE) RETURNING id,username,role,roles`,
      [`${label}_${suffix}@example.invalid`, `${label}_${suffix}`, role, roles])).rows[0];
    }
    ids.admin = await addUser('turnover_admin', 'admin');
    ids.se = await addUser('turnover_se', 'se');
    ids.ownerA = await addUser('turnover_owner_a', 'rep');
    ids.ownerB = await addUser('turnover_owner_b', 'rep');
    ids.outsider = await addUser('turnover_outsider', 'rep');
    // Sales Manager is an additive capability; the canonical primary role
    // remains rep under the production users_role_check constraint.
    ids.leader = await addUser('turnover_leader', 'rep', ['sales_manager']);
    ids.multi = await addUser('turnover_multi', 'rep', ['rep', 'se']);
    ids.customerA = (await db.query(`INSERT INTO customers(name,owner_id,created_by,status) VALUES($1,$2,$2,'active') RETURNING id,name`, [fitState.opportunity.customer, ids.ownerA.id])).rows[0];
    ids.customerB = (await db.query(`INSERT INTO customers(name,owner_id,created_by,status) VALUES($1,$2,$2,'active') RETURNING id,name`, [`Turnover Customer B ${suffix}`, ids.ownerB.id])).rows[0];
    ids.fitA = (await db.query(`INSERT INTO handoffs(customer_id,owner_id,data,last_edited_by,created_by,primary_se_id)
      VALUES($1,$2,$3,$4,$4,$4) RETURNING id`, [ids.customerA.id, ids.ownerA.id, JSON.stringify(fitState), ids.se.id])).rows[0];
    ids.fitB = (await db.query(`INSERT INTO handoffs(customer_id,owner_id,data,last_edited_by,created_by,primary_se_id)
      VALUES($1,$2,$3,$4,$4,$4) RETURNING id`, [ids.customerB.id, ids.ownerB.id, JSON.stringify({ ...fitState, opportunity: { ...fitState.opportunity, customer: ids.customerB.name } }), ids.se.id])).rows[0];
    ids.team = (await db.query(`INSERT INTO sales_teams(name,primary_leader_id,created_by,updated_by) VALUES($1,$2,$3,$3) RETURNING id`, [`Turnover Team ${suffix}`, ids.leader.id, ids.admin.id])).rows[0];
    await db.query(`INSERT INTO sales_team_memberships(team_id,user_id,membership_functions,created_by,updated_by) VALUES
      ($1,$2,ARRAY['sales_manager'],$4,$4),($1,$3,ARRAY['rep'],$4,$4)`, [ids.team.id, ids.leader.id, ids.ownerA.id, ids.admin.id]);

    async function attachment({ fit, customer, id, contextType, contextId = null, status = 'ACTIVE', removed = false, uploader = ids.se.id, name = `${id}.pdf` }) {
      return (await db.query(`INSERT INTO handoff_attachments
        (handoff_id,customer_id,file_name,storage_key,content_type,file_size,uploaded_by,context_type,context_id,original_filename,caption,evidence_category,status,expected_size_bytes,expected_content_type,completed_at,removed_at)
        VALUES($1,$2,$3,$4,'application/pdf',12,$5,$6,$7,$3,$8,'DOCUMENT',$9,12,'application/pdf',NOW(),$10) RETURNING id`,
      [fit.id, customer.id, name, `qa/v6.9.45/${suffix}/${id}`, uploader, contextType, contextId, `Caption ${id}`, status, removed ? new Date() : null])).rows[0];
    }
    ids.activeMep = await attachment({ fit: ids.fitA, customer: ids.customerA, id: 'active-mep', contextType: 'APPLICATION_PROCESS', contextId: 'PG-MEP-CYCLE', name: 'cycle-count.pdf' });
    ids.activeCip = await attachment({ fit: ids.fitA, customer: ids.customerA, id: 'active-cip', contextType: 'APPLICATION_PROCESS', contextId: 'PG-CIP-CYCLE', name: 'cycle-count.pdf' });
    ids.activeGap = await attachment({ fit: ids.fitA, customer: ids.customerA, id: 'active-gap', contextType: 'GAP', contextId: 'PG-GAP-1' });
    ids.removed = await attachment({ fit: ids.fitA, customer: ids.customerA, id: 'removed', contextType: 'GENERAL_SOLUTION_FIT', status: 'REMOVED', removed: true });
    ids.pending = await attachment({ fit: ids.fitA, customer: ids.customerA, id: 'pending', contextType: 'GENERAL_SOLUTION_FIT', status: 'PENDING' });
    ids.customerBFile = await attachment({ fit: ids.fitB, customer: ids.customerB, id: 'customer-b', contextType: 'GENERAL_SOLUTION_FIT' });
  });

  after(async () => {
    if (!db) return;
    await db.query('DELETE FROM customers WHERE id=ANY($1::uuid[])', [[ids.customerA.id, ids.customerB.id]]).catch(() => {});
    await db.query('DELETE FROM sales_teams WHERE id=$1', [ids.team.id]).catch(() => {});
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[ids.admin.id, ids.se.id, ids.ownerA.id, ids.ownerB.id, ids.outsider.id, ids.leader.id, ids.multi.id]]).catch(() => {});
    await db.pool?.end?.();
  });

  test('saved snapshot includes active exact-fit evidence only and preserves stable same-name contexts', async () => {
    const { loadPSTurnoverModel } = require('../src/services/ps-turnover-service');
    const loaded = await loadPSTurnoverModel({ customerId: ids.customerA.id, user: principal(ids.se), generatedAt: '2026-10-23T12:00:00Z' });
    assert.equal(loaded.model.solutionFitId, ids.fitA.id);
    assert.equal(loaded.model.attachments.length, 3);
    assert.equal(loaded.model.pendingAttachmentCount, 1);
    assert.deepEqual(new Set(loaded.model.attachments.map(item => item.id)), new Set([ids.activeMep.id, ids.activeCip.id, ids.activeGap.id]));
    assert.equal(loaded.model.attachments.some(item => item.id === ids.removed.id || item.id === ids.pending.id || item.id === ids.customerBFile.id), false);
    const mep = loaded.model.attachments.find(item => item.id === ids.activeMep.id);
    const cip = loaded.model.attachments.find(item => item.id === ids.activeCip.id);
    assert.notEqual(mep.packagePath, cip.packagePath);
    assert.match(mep.packagePath, /Evidence\/MEP\/JDE/);
    assert.match(cip.packagePath, /Evidence\/CIP/);
    assert.equal(loaded.model.primarySeName, ids.se.username);
    assert.ok(loaded.model.attachments.every(item => item.uploadedByName === ids.se.username));
  });

  test('authorized roles can read while an unrelated Rep is denied server-side', async () => {
    const { loadPSTurnoverModel, TurnoverAccessError } = require('../src/services/ps-turnover-service');
    for (const viewer of [ids.admin, ids.se, ids.ownerA, ids.leader, ids.multi]) {
      const result = await loadPSTurnoverModel({ customerId: ids.customerA.id, user: principal(viewer) });
      assert.equal(result.model.customerId, ids.customerA.id, `${viewer.role} should be authorized`);
    }
    await assert.rejects(() => loadPSTurnoverModel({ customerId: ids.customerA.id, user: principal(ids.outsider) }), error => error instanceof TurnoverAccessError && error.status === 403);
  });

  test('customer reassignment changes current Rep access without rewriting evidence or uploader attribution', async () => {
    const { loadPSTurnoverModel, TurnoverAccessError } = require('../src/services/ps-turnover-service');
    await db.query('UPDATE customers SET owner_id=$2 WHERE id=$1', [ids.customerA.id, ids.ownerB.id]);
    await assert.rejects(() => loadPSTurnoverModel({ customerId: ids.customerA.id, user: principal(ids.ownerA) }), error => error instanceof TurnoverAccessError && error.status === 403);
    const reassigned = await loadPSTurnoverModel({ customerId: ids.customerA.id, user: principal(ids.ownerB) });
    assert.equal(reassigned.model.accountExecutive, ids.ownerB.username);
    assert.ok(reassigned.model.attachments.every(item => item.uploadedByName === ids.se.username));
    const persisted = await db.query('SELECT handoff_id,customer_id,uploaded_by FROM handoff_attachments WHERE id=$1', [ids.activeMep.id]);
    assert.equal(persisted.rows[0].handoff_id, ids.fitA.id);
    assert.equal(persisted.rows[0].customer_id, ids.customerA.id);
    assert.equal(persisted.rows[0].uploaded_by, ids.se.id);
    await db.query('UPDATE customers SET owner_id=$2 WHERE id=$1', [ids.customerA.id, ids.ownerA.id]);
  });

  test('v6.9.45 creates no duplicate turnover evidence repository', async () => {
    const duplicate = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE 'ps%turnover%attachment%'`);
    assert.equal(duplicate.rowCount, 0);
  });
});
