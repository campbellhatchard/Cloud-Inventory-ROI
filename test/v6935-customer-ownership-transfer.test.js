'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  cleanReason,
  listEligibleOwners,
  previewCustomerOwnershipTransfer,
  transferCustomerOwnership
} = require('../src/shared/customer-ownership-transfer');
const { customerAccess, scenarioAccess } = require('../src/authorization');
const { requireRole } = require('../src/middleware/auth');

const root = path.join(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

function fixture(overrides = {}) {
  return {
    customer: { id: 'customer-a', name: 'Customer Alpha', owner_id: 'rep-a', owner_username: 'Rep A', status: 'active', deleted_at: null, created_at: '2026-01-01', updated_at: '2026-09-01' },
    users: [
      { id: 'rep-a', username: 'Rep A', role: 'rep', roles: ['rep'], is_active: true },
      { id: 'rep-b', username: 'Rep B', role: 'rep', roles: ['rep'], is_active: true },
      { id: 'multi', username: 'Multi Role', role: 'rep', roles: ['rep', 'se', 'sales_manager'], is_active: true },
      { id: 'se-only', username: 'SE Only', role: 'se', roles: ['se'], is_active: true },
      { id: 'inactive', username: 'Inactive Rep', role: 'rep', roles: ['rep'], is_active: false }
    ],
    scenarios: [
      { id: 's1', base_id: 'base-a', version: 1, owner_id: 'rep-a', customer_id: 'customer-a', shared_with: ['shared-user'], data: { annualBenefit: 120000, totalContractBenefit: 360000, totalContractInvestment: 100000, totalContractRoi: 260, contractNpv: 210000 } },
      { id: 's2', base_id: 'base-a', version: 2, owner_id: 'rep-a', customer_id: 'customer-a', shared_with: ['shared-user'], data: { annualBenefit: 120000, totalContractBenefit: 360000, totalContractInvestment: 100000, totalContractRoi: 260, contractNpv: 210000, proposalDraft: { title: 'Proposal' } } }
    ],
    sessions: [{ id: 'link-1', scenario_id: 's2', owner_id: 'rep-a', is_active: true }],
    submissions: [{ id: 'submission-1', discovery_session_id: 'link-1', submitted_by: 'prospect' }],
    stakeholders: [{ id: 'stake-1', scenario_id: 's2', owner_id: 'rep-a', company: 'Customer Alpha' }],
    plans: [{ id: 'plan-1', scenario_id: 's2', owner_id: 'rep-a', company: 'Customer Alpha' }],
    handoffs: [{ id: 'fit-1', customer_id: 'customer-a', owner_id: 'rep-a', primary_se_id: 'se-only', additional_se_ids: [], created_by: 'se-only', last_edited_by: 'se-only', deleted_at: null }],
    resonance: [{ id: 'res-1', scenario_id: 's2', owner_id: 'rep-a' }],
    valueEvents: [{ id: 'event-1', base_id: 'base-a', event_type: 'rep_confirmed', actor_user_id: 'rep-a', normalized_value: 120000 }],
    applications: [{ id: 'app-1', base_id: 'base-a', actor_user_id: 'rep-a' }],
    published: [{ id: 'pub-1', scenario_id: 's2', owner_id: 'rep-a', token: 'frozen-token', published_payload: { annualBenefit: 120000 } }],
    notifications: [{ id: 'notice-1', submission_id: 'submission-1', recipient_user_id: 'rep-a', status: 'sent' }],
    stageHistory: [{ scenario_id: 's2', updated_by: 'rep-a', evidence: { budget: true } }],
    transfers: [],
    audit: [],
    duplicate: null,
    ...overrides
  };
}

function harness(initial = fixture()) {
  const state = initial;
  const query = async (sql, params = []) => {
    const q = sql.replace(/\s+/g, ' ').trim();
    if (q.includes('FROM customers c') && q.includes('JOIN users u') && q.includes('WHERE c.id=$1')) {
      const owner = state.users.find(user => user.id === state.customer.owner_id);
      return { rows: state.customer.id === params[0] ? [{ ...state.customer, owner_username: owner?.username }] : [], rowCount: state.customer.id === params[0] ? 1 : 0 };
    }
    if (q.includes('FROM users') && q.includes('WHERE id=$1')) {
      const user = state.users.find(item => item.id === params[0] && item.is_active && (item.role === 'rep' || item.roles.includes('rep')));
      return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
    }
    if (q.includes('FROM users') && q.includes('ORDER BY LOWER(username)')) {
      const rows = state.users.filter(item => item.is_active && (item.role === 'rep' || item.roles.includes('rep'))).sort((a, b) => a.username.localeCompare(b.username));
      return { rows, rowCount: rows.length };
    }
    if (q.startsWith('SELECT id,name FROM customers')) return { rows: state.duplicate ? [state.duplicate] : [], rowCount: state.duplicate ? 1 : 0 };
    if (q.startsWith('WITH customer_scenarios AS')) {
      const scenarios = state.scenarios.filter(item => item.customer_id === state.customer.id);
      const ids = new Set(scenarios.map(item => item.id));
      const bases = new Set(scenarios.map(item => item.base_id));
      const sessions = state.sessions.filter(item => ids.has(item.scenario_id));
      const sessionIds = new Set(sessions.map(item => item.id));
      return { rows: [{
        customer: 1,
        opportunities: bases.size,
        scenario_versions: scenarios.length,
        active_prospect_links: sessions.filter(item => item.is_active).length,
        prospect_submissions: state.submissions.filter(item => sessionIds.has(item.discovery_session_id)).length,
        stakeholders: state.stakeholders.filter(item => ids.has(item.scenario_id) || (!item.scenario_id && item.owner_id === state.customer.owner_id && item.company.toLowerCase() === state.customer.name.toLowerCase())).length,
        solution_fits: state.handoffs.filter(item => item.customer_id === state.customer.id && !item.deleted_at).length,
        joint_project_plans: state.plans.filter(item => ids.has(item.scenario_id) || (!item.scenario_id && item.owner_id === state.customer.owner_id && item.company.toLowerCase() === state.customer.name.toLowerCase())).length,
        proposals: scenarios.filter(item => item.data.proposalDraft && Object.keys(item.data.proposalDraft).length).length,
        published_records: state.published.filter(item => ids.has(item.scenario_id) && item.published_payload).length,
        value_history: state.valueEvents.filter(item => bases.has(item.base_id)).length,
        rep_confirmed_events: state.valueEvents.filter(item => bases.has(item.base_id) && item.event_type === 'rep_confirmed').length,
        buyer_evidence_records: state.stageHistory.filter(item => ids.has(item.scenario_id)).length,
        driver_resonance_records: state.resonance.filter(item => ids.has(item.scenario_id)).length,
        notification_history: state.notifications.length,
        audit_history: state.audit.length
      }], rowCount: 1 };
    }
    const mutate = (collection, predicate, owner) => {
      let count = 0;
      for (const row of collection) if (predicate(row) && row.owner_id !== owner) { row.owner_id = owner; count += 1; }
      return { rows: [], rowCount: count };
    };
    if (q.startsWith('UPDATE discovery_sessions')) return mutate(state.sessions, row => state.scenarios.some(s => s.customer_id === params[0] && s.id === row.scenario_id), params[1]);
    if (q.startsWith('UPDATE mutual_action_plans')) return mutate(state.plans, row => state.scenarios.some(s => s.customer_id === params[0] && s.id === row.scenario_id) || (!row.scenario_id && row.owner_id === params[2] && row.company.toLowerCase() === params[3].toLowerCase()), params[1]);
    if (q.startsWith('UPDATE stakeholders')) return mutate(state.stakeholders, row => state.scenarios.some(s => s.customer_id === params[0] && s.id === row.scenario_id) || (!row.scenario_id && row.owner_id === params[2] && row.company.toLowerCase() === params[3].toLowerCase()), params[1]);
    if (q.startsWith('UPDATE handoffs')) return mutate(state.handoffs, row => row.customer_id === params[0], params[1]);
    if (q.startsWith('UPDATE driver_resonance')) return mutate(state.resonance, row => state.scenarios.some(s => s.customer_id === params[0] && s.id === row.scenario_id), params[1]);
    if (q.startsWith('UPDATE scenarios SET owner_id')) return mutate(state.scenarios, row => row.customer_id === params[0], params[1]);
    if (q.startsWith('UPDATE customers SET owner_id')) {
      if (state.customer.id !== params[0] || state.customer.owner_id !== params[2]) return { rows: [], rowCount: 0 };
      state.customer.owner_id = params[1]; return { rows: [], rowCount: 1 };
    }
    if (q.startsWith('INSERT INTO customer_ownership_transfers')) {
      const record = { id: `transfer-${state.transfers.length + 1}`, created_at: '2026-10-08T12:00:00Z', customer_id: params[0], old_owner_id: params[2], new_owner_id: params[4], reason: params[7] };
      state.transfers.push(record); return { rows: [record], rowCount: 1 };
    }
    if (q.startsWith('INSERT INTO audit_log')) { state.audit.push({ user_id: params[0], action: 'customer.ownership_transferred', entity_id: params[1], detail: JSON.parse(params[2]) }); return { rows: [], rowCount: 1 }; }
    throw new Error(`Unhandled test query: ${q.slice(0, 120)}`);
  };
  const transaction = async callback => {
    const before = structuredClone(state);
    try { return await callback({ query }); }
    catch (error) { for (const key of Object.keys(state)) delete state[key]; Object.assign(state, before); throw error; }
  };
  return { state, query, transaction };
}

async function execute(h, overrides = {}) {
  return transferCustomerOwnership({
    customerId: 'customer-a', newOwnerId: 'rep-b', expectedCurrentOwnerId: 'rep-a',
    reason: 'Territory reassignment', adminUserId: 'admin', transaction: h.transaction,
    ...overrides
  });
}

test('eligible-owner data is server filtered to active users with the Sales Rep role', async () => {
  const h = harness();
  assert.deepEqual((await listEligibleOwners(h.query)).map(owner => owner.id), ['multi', 'rep-a', 'rep-b']);
});

test('preview reports real dependency counts and separates change from preservation', async () => {
  const h = harness();
  const preview = await previewCustomerOwnershipTransfer({ customerId: 'customer-a', newOwnerId: 'rep-b', dataQuery: h.query });
  assert.equal(preview.counts.scenarioVersions, 2);
  assert.equal(preview.counts.prospectSubmissions, 1);
  assert.equal(preview.counts.valueHistory, 1);
  assert.match(preview.willChange.join(' '), /Current Customer owner/);
  assert.match(preview.willPreserve.join(' '), /Rep Confirmed actors/);
});

test('Admin role middleware allows Admin and Admin multi-role users', () => {
  for (const user of [{ role: 'admin', roleKeys: ['admin'] }, { role: 'rep', roleKeys: ['rep', 'admin', 'se'] }]) {
    let advanced = false; requireRole('admin')({ user }, { status(){ return this; }, json(){ throw new Error('denied'); } }, () => { advanced = true; }); assert.equal(advanced, true);
  }
});

test('Admin role middleware denies Rep, Sales Leader and Solution Engineer roles', () => {
  for (const role of ['rep', 'sales_manager', 'se']) {
    let status; requireRole('admin')({ user: { role, roleKeys: [role] } }, { status(value){ status=value; return this; }, json(){} }, () => { throw new Error('unexpected authorization'); }); assert.equal(status, 403);
  }
});

test('reason is required and normalized before any transaction starts', async () => {
  assert.throws(() => cleanReason('   '), /reason for transfer is required/);
  let called = false;
  await assert.rejects(transferCustomerOwnership({ customerId:'customer-a',newOwnerId:'rep-b',expectedCurrentOwnerId:'rep-a',reason:'',adminUserId:'admin',transaction:async()=>{called=true;} }), /reason for transfer is required/);
  assert.equal(called, false);
});

test('same-owner preview is rejected without an audit event', async () => {
  const h = harness();
  await assert.rejects(previewCustomerOwnershipTransfer({ customerId:'customer-a',newOwnerId:'rep-a',dataQuery:h.query }), error => error.code === 'SAME_OWNER');
  assert.equal(h.state.transfers.length, 0);
});

test('inactive and SE-only users are rejected server-side', async () => {
  for (const id of ['inactive','se-only']) { const h=harness(); await assert.rejects(execute(h,{newOwnerId:id}), error => error.code === 'NEW_OWNER_INELIGIBLE'); }
});

test('multi-role user is eligible when the Sales Rep role is present', async () => {
  const h=harness();const result=await execute(h,{newOwnerId:'multi'});assert.equal(result.newOwner.id,'multi');
});

test('inactive or removed customer must be restored before transfer', async () => {
  for (const change of [{status:'inactive'},{deleted_at:'2026-10-01'}]) { const h=harness(fixture({customer:{...fixture().customer,...change}}));await assert.rejects(execute(h),error=>error.code==='CUSTOMER_INACTIVE'); }
});

test('same-name customer under the new owner blocks transfer instead of merging identity', async () => {
  const h=harness(fixture({duplicate:{id:'different-customer',name:'Customer Alpha'}}));await assert.rejects(execute(h),error=>error.code==='CUSTOMER_IDENTITY_CONFLICT');assert.equal(h.state.customer.id,'customer-a');
});

test('a concurrent database identity collision is returned as a safe conflict after rollback', async () => {
  const conflict=Object.assign(new Error('duplicate key detail'),{code:'23505',constraint:'idx_customers_owner_name'});
  await assert.rejects(transferCustomerOwnership({customerId:'customer-a',newOwnerId:'rep-b',expectedCurrentOwnerId:'rep-a',reason:'Territory reassignment',adminUserId:'admin',transaction:async()=>{throw conflict;}}),error=>error.code==='CUSTOMER_IDENTITY_CONFLICT'&&error.status===409&&!error.message.includes('duplicate key'));
});

test('successful transfer changes canonical and operational owner fields atomically', async () => {
  const h=harness();const result=await execute(h);assert.equal(result.oldOwner.id,'rep-a');assert.equal(result.newOwner.id,'rep-b');assert.equal(h.state.customer.owner_id,'rep-b');for(const group of ['scenarios','sessions','stakeholders','plans','handoffs','resonance'])assert.ok(h.state[group].every(row=>row.owner_id==='rep-b'),group);
});

test('customer, opportunity and scenario identities are unchanged', async () => {
  const h=harness(),before=h.state.scenarios.map(({id,base_id,version})=>({id,base_id,version}));await execute(h);assert.equal(h.state.customer.id,'customer-a');assert.deepEqual(h.state.scenarios.map(({id,base_id,version})=>({id,base_id,version})),before);
});

test('ROI inputs and governed results remain byte-for-byte unchanged', async () => {
  const h=harness(),before=JSON.stringify(h.state.scenarios.map(row=>row.data));await execute(h);assert.equal(JSON.stringify(h.state.scenarios.map(row=>row.data)),before);
});

test('historical actors, Rep Confirmed and value application records remain unchanged', async () => {
  const h=harness(),before=JSON.stringify({events:h.state.valueEvents,applications:h.state.applications,stage:h.state.stageHistory});await execute(h);assert.equal(JSON.stringify({events:h.state.valueEvents,applications:h.state.applications,stage:h.state.stageHistory}),before);
});

test('immutable Prospect submissions and sent notification history remain unchanged', async () => {
  const h=harness(),before=JSON.stringify({submissions:h.state.submissions,notifications:h.state.notifications});await execute(h);assert.equal(JSON.stringify({submissions:h.state.submissions,notifications:h.state.notifications}),before);assert.equal(h.state.sessions[0].owner_id,'rep-b');
});

test('Primary SE, Solution Fit creator and editor attribution remain unchanged', async () => {
  const h=harness(),before={primary:h.state.handoffs[0].primary_se_id,created:h.state.handoffs[0].created_by,edited:h.state.handoffs[0].last_edited_by};await execute(h);assert.deepEqual({primary:h.state.handoffs[0].primary_se_id,created:h.state.handoffs[0].created_by,edited:h.state.handoffs[0].last_edited_by},before);
});

test('frozen published output identity, owner, token and payload remain unchanged', async () => {
  const h=harness(),before=JSON.stringify(h.state.published);await execute(h);assert.equal(JSON.stringify(h.state.published),before);
});

test('explicitly shared access survives owner reassignment', async () => {
  const h=harness(),before=structuredClone(h.state.scenarios.map(row=>row.shared_with));await execute(h);assert.deepEqual(h.state.scenarios.map(row=>row.shared_with),before);
  const access=await scenarioAccess({id:'shared-user',role:'rep',roleKeys:['rep']},'s2','view',async()=>({rows:[h.state.scenarios[1]]}));assert.equal(access.allowed,true);assert.deepEqual(access.reasons,['explicit_sharing']);
});

test('new owner gains and old owner loses owner-only customer access immediately', async () => {
  const h=harness();await execute(h);
  const dataQuery=async(_sql,params)=>({rows:[{...h.state.customer,explicitly_shared:false,team_scoped:false}]});
  assert.equal((await customerAccess({id:'rep-b',role:'rep',roleKeys:['rep']},'customer-a','view',dataQuery)).allowed,true);
  assert.equal((await customerAccess({id:'rep-a',role:'rep',roleKeys:['rep']},'customer-a','view',dataQuery)).allowed,false);
});

test('team-derived manager visibility follows the current owner dynamically', async () => {
  const h=harness();await execute(h);
  const manager=userId=>customerAccess({id:userId,role:'sales_manager',roleKeys:['sales_manager']},'customer-a','view',async()=>({rows:[{...h.state.customer,explicitly_shared:false,team_scoped:userId==='manager-b'}]}));
  assert.equal((await manager('manager-b')).allowed,true);assert.equal((await manager('manager-a')).allowed,false);
});

test('no-scenario Customer transfers successfully', async () => {
  const h=harness(fixture({scenarios:[],sessions:[],submissions:[],stakeholders:[],plans:[],handoffs:[],resonance:[],valueEvents:[],applications:[],published:[],notifications:[],stageHistory:[]}));const result=await execute(h);assert.equal(result.impactCounts.scenarioVersions,0);assert.equal(h.state.customer.owner_id,'rep-b');
});

test('many scenario versions transfer without cloning or renumbering', async () => {
  const base=fixture();base.scenarios=Array.from({length:40},(_,index)=>({...base.scenarios[0],id:`s-${index+1}`,version:index+1}));const h=harness(base),ids=h.state.scenarios.map(row=>[row.id,row.version]);const result=await execute(h);assert.equal(result.operationalCounts.scenarioVersions,40);assert.deepEqual(h.state.scenarios.map(row=>[row.id,row.version]),ids);
});

test('stale expected owner is rejected before any update or audit write', async () => {
  const h=harness();const preview=await previewCustomerOwnershipTransfer({customerId:'customer-a',newOwnerId:'rep-b',dataQuery:h.query});h.state.customer.owner_id='multi';await assert.rejects(execute(h,{expectedCurrentOwnerId:preview.expectedCurrentOwnerId}),error=>error.code==='OWNERSHIP_CONFLICT');assert.equal(h.state.customer.owner_id,'multi');assert.equal(h.state.transfers.length,0);
});

test('failure after operational updates rolls the entire transaction back', async () => {
  const h=harness(),before=structuredClone(h.state);await assert.rejects(execute(h,{beforeAudit:async()=>{throw new Error('induced failure');}}),/induced failure/);assert.deepEqual(h.state,before);
});

test('successful transfer writes a dedicated immutable record and transaction-bound audit event', async () => {
  const h=harness(),result=await execute(h);assert.equal(h.state.transfers.length,1);assert.equal(h.state.audit.length,1);assert.equal(h.state.audit[0].action,'customer.ownership_transferred');assert.equal(h.state.audit[0].detail.transferId,result.transferId);
  const migration=source('migrations/043_customer_ownership_transfer.sql');assert.match(migration,/BEFORE UPDATE OR DELETE ON customer_ownership_transfers/);assert.match(migration,/historical business content appear newly edited/);
});

test('production route is Admin-only and the browser requires preview before confirmation', () => {
  const route=source('src/routes/customers.js'),ui=source('public/admin-customers.js');assert.match(route,/ownership-transfer-preview', requireAuth, requireRole\('admin'\)/);assert.match(route,/ownership-transfer', requireAuth, requireRole\('admin'\)/);assert.match(ui,/Preview impact/);assert.match(ui,/if\(!_transferPreview\)/);assert.match(ui,/expectedCurrentOwnerId/);
});

test('transfer code never updates immutable evidence, authorship, SE assignment or publications', () => {
  const service=source('src/shared/customer-ownership-transfer.js');for(const prohibited of ['UPDATE roi_value_events','UPDATE roi_value_applications','UPDATE discovery_submissions','UPDATE audit_log','SET primary_se_id','UPDATE handoff_change_history','UPDATE business_case_shares','UPDATE scenario_stage_governance'])assert.doesNotMatch(service,new RegExp(prohibited));
});

test('future owner-routed Prospect notifications use the transferred Discovery owner', () => {
  const server=source('server.js');assert.match(server,/enqueueProspectSubmissionNotification\(client,\{submissionId:submission\.id,recipientUserId:session\.owner_id\}\)/);const service=source('src/shared/customer-ownership-transfer.js');assert.match(service,/UPDATE discovery_sessions ds SET owner_id=\$2/);
});
