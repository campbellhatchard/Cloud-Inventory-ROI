/* Sales Manager portfolio dashboard.
   Synthesizes persisted application data only; it never invokes the ROI engine. */
const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAnyRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAnyRole('sales_manager', 'admin'));

const num = value => value === null || value === undefined || value === '' ? null : Number(value);
const text = value => String(value || '').trim();
const lower = value => text(value).toLowerCase();

const PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const STATUSES = new Set(['open', 'in_progress', 'done']);

function validDateOrNull(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return value;
}
function bounded(value, max) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const out = text(value);
  return out.length <= max ? out : undefined;
}
function validateActionFields(body, { requireAction = false } = {}) {
  const b = body || {};
  const action = bounded(b.action, 4000);
  const owner = bounded(b.owner, 255);
  const relatedRisk = bounded(b.relatedRisk, 4000);
  const expectedOutcome = bounded(b.expectedOutcome, 4000);
  const customerCommitmentSought = bounded(b.customerCommitmentSought, 4000);
  const dueDate = b.dueDate === undefined ? undefined : validDateOrNull(b.dueDate);
  if (requireAction && !action) return { error: 'Scenario and action are required.' };
  if (b.action !== undefined && action === undefined) return { error: 'Action must be 4,000 characters or fewer.' };
  if (b.owner !== undefined && owner === undefined) return { error: 'Owner must be 255 characters or fewer.' };
  if (b.relatedRisk !== undefined && relatedRisk === undefined) return { error: 'Related risk must be 4,000 characters or fewer.' };
  if (b.expectedOutcome !== undefined && expectedOutcome === undefined) return { error: 'Expected outcome must be 4,000 characters or fewer.' };
  if (b.customerCommitmentSought !== undefined && customerCommitmentSought === undefined) return { error: 'Customer commitment must be 4,000 characters or fewer.' };
  if (b.dueDate !== undefined && dueDate === undefined) return { error: 'Due date must use YYYY-MM-DD format.' };
  if (b.priority !== undefined && !PRIORITIES.has(b.priority)) return { error: 'Invalid priority.' };
  if (b.status !== undefined && !STATUSES.has(b.status)) return { error: 'Invalid status.' };
  return { action, owner, relatedRisk, expectedOutcome, customerCommitmentSought, dueDate };
}

function solutionFit(handoff) {
  if (!handoff) return { level: 'Not Assessed', reasons: ['No Solution Fit assessment saved'] };
  const data = handoff.data || {};
  const gaps = Array.isArray(data.gaps) ? data.gaps : [];
  const critical = gaps.filter(g => lower(g.priority).includes('must') || lower(g.severity).includes('critical') || lower(g.goLive) === 'yes');
  const unresolved = gaps.filter(g => !['closed','resolved','done'].includes(lower(g.status)));
  let level = 'Low';
  if (critical.length >= 2) level = 'Critical';
  else if (critical.length || handoff.status === 'not_ready') level = 'High';
  else if (unresolved.length || handoff.status === 'conditional') level = 'Moderate';
  return { level, readiness: handoff.readiness, reasons: [
    `${handoff.readiness || 0}% readiness`,
    `${unresolved.length} unresolved gap${unresolved.length === 1 ? '' : 's'}`,
    critical.length ? `${critical.length} must-have/go-live blocker${critical.length === 1 ? '' : 's'}` : 'No critical gaps recorded'
  ] };
}

function planHealth(plan) {
  if (!plan) return { level: 'Missing', overdue: 0, open: 0, reasons: ['No Joint Project Plan saved'] };
  const now = new Date();
  const ms = Array.isArray(plan.milestones) ? plan.milestones : [];
  const open = ms.filter(m => lower(m.status) !== 'done');
  const overdue = open.filter(m => m.dueDate && new Date(`${m.dueDate}T23:59:59`) < now);
  const missingDates = open.filter(m => !m.dueDate).length;
  const missingOwners = open.filter(m => !m.owner).length;
  const level = overdue.length ? 'At Risk' : (!ms.length || missingDates || missingOwners) ? 'Incomplete' : 'On Track';
  return {
    level, overdue: overdue.length, open: open.length, missingDates, missingOwners,
    reasons: [
      `${open.length} open milestone${open.length === 1 ? '' : 's'}`,
      `${overdue.length} past due`,
      `${missingDates + missingOwners} missing date/owner field${missingDates + missingOwners === 1 ? '' : 's'}`
    ]
  };
}

function stakeholderHealth(items) {
  const list = items || [];
  const champion = list.find(s => s.role === 'champion' && s.engaged && Number(s.support) >= 4);
  const buyer = list.find(s => s.role === 'economic_buyer' && s.engaged);
  const blockers = list.filter(s => s.role === 'blocker' || (Number(s.influence) >= 4 && Number(s.support) <= 2));
  let level = 'Healthy';
  if (!list.length) level = 'Missing';
  else if (!champion && !buyer) level = 'Critical';
  else if (!champion || !buyer || blockers.length) level = 'At Risk';
  return {
    level,
    reasons: [
      champion ? 'Engaged champion identified' : 'Engaged champion missing',
      buyer ? 'Economic buyer engaged' : 'Economic buyer not engaged',
      `${blockers.length} blocker${blockers.length === 1 ? '' : 's'} identified`
    ]
  };
}

function dealHealth(deal) {
  const risks = [];
  if (deal.plan.level === 'Missing' || deal.plan.overdue) {
    risks.push(deal.plan.level === 'Missing' ? 'Joint Project Plan missing' : `${deal.plan.overdue} project item(s) past due`);
  }
  if (['High','Critical','Not Assessed'].includes(deal.solutionFit.level)) risks.push(`Solution Fit: ${deal.solutionFit.level}`);
  if (['Critical','Missing','At Risk'].includes(deal.stakeholders.level)) risks.push(`Stakeholders: ${deal.stakeholders.level}`);
  if (!deal.closeDate) risks.push('Target close date missing');
  const updated = new Date(deal.updatedAt).getTime();
  if (Number.isFinite(updated)) {
    const age = Math.floor((Date.now() - updated) / 86400000);
    if (age > 30) risks.push(`No scenario update for ${age} days`);
  }
  return { level: risks.length >= 3 ? 'Stalled' : risks.length ? 'At Risk' : 'Healthy', reasons: risks.length ? risks : ['Current data shows no material execution gaps'] };
}

function priority(deal) {
  const critical = [
    deal.health.level === 'Stalled',
    deal.solutionFit.level === 'Critical',
    deal.stakeholders.level === 'Critical',
    deal.plan.overdue >= 2
  ].filter(Boolean).length;
  const level = critical >= 2 ? 'Critical'
    : critical || deal.health.level === 'At Risk' ? 'High'
    : deal.plan.level === 'Incomplete' ? 'Medium'
    : 'Low';
  return { level, reasons: [...deal.health.reasons, ...deal.solutionFit.reasons.slice(0, 1)] };
}

router.get('/dashboard', async (req, res) => {
  try {
    const [scenarios, handoffs, plans, stakeholders, actions, reps] = await Promise.all([
      query(`SELECT s.id,s.base_id,s.version,s.name,s.company,s.customer_id,s.industry,s.deal_stage,s.solution,s.data,s.updated_at,
                    u.id owner_id,u.username owner_username
             FROM scenarios s JOIN users u ON u.id=s.owner_id
             WHERE s.is_current=TRUE AND s.deleted_at IS NULL
             ORDER BY s.updated_at DESC`),
      query(`SELECT h.customer_id,h.data,h.readiness,h.status,h.updated_at FROM handoffs h`),
      query(`SELECT id,scenario_id,company,title,target_close_date,milestones,groups,is_active,updated_at
             FROM mutual_action_plans`),
      query(`SELECT company,owner_id,role,influence,support,engaged,updated_at
             FROM stakeholders`),
      query(`SELECT a.*, s.base_id AS scenario_base_id
             FROM sales_manager_actions a
             JOIN scenarios s ON s.id = a.scenario_id
             WHERE s.deleted_at IS NULL
             ORDER BY a.due_date NULLS LAST,a.created_at DESC`),
      query(`SELECT id,username FROM users
             WHERE is_active=TRUE AND (role='rep' OR 'rep'=ANY(roles))
             ORDER BY username`)
    ]);

    const handoffByCustomer = new Map(handoffs.rows.map(h => [String(h.customer_id), h]));
    const actionsByBase = new Map();
    actions.rows.forEach(a => {
      const key = String(a.scenario_base_id);
      const publicAction = { ...a };
      delete publicAction.scenario_base_id;
      actionsByBase.set(key, [...(actionsByBase.get(key) || []), publicAction]);
    });

    const deals = scenarios.rows.map(s => {
      const plan = plans.rows
        .filter(p => (p.scenario_id && String(p.scenario_id) === String(s.id)) || lower(p.company) === lower(s.company))
        .sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
      const people = stakeholders.rows.filter(p => lower(p.company) === lower(s.company) && String(p.owner_id) === String(s.owner_id));
      const data = s.data || {};
      const deal = {
        id: s.id,
        baseId: s.base_id,
        version: s.version,
        name: s.name,
        company: s.company,
        customerId: s.customer_id,
        repId: s.owner_id,
        rep: s.owner_username,
        industry: s.industry || data.industry || 'Not set',
        buyingStage: s.deal_stage || data.dealStage || 'Not set',
        solution: s.solution || data.solution || 'Not set',
        updatedAt: s.updated_at,
        closeDate: plan && plan.target_close_date || null,
        roi: {
          annualBenefit: num(data.annualBenefit),
          contractRoi: num(data.totalContractRoi),
          contractNetBenefit: num(data.totalContractNetBenefit),
          contractNpv: num(data.totalContractNpv),
          contractMonths: num(data.contractMonths),
          investment: num(data.totalContractInvestment)
        },
        solutionFit: solutionFit(s.customer_id ? handoffByCustomer.get(String(s.customer_id)) : null),
        plan: planHealth(plan),
        stakeholders: stakeholderHealth(people),
        actions: actionsByBase.get(String(s.base_id)) || []
      };
      deal.health = dealHealth(deal);
      deal.managementPriority = priority(deal);
      deal.missing = [
        !deal.closeDate && 'Target close date',
        deal.plan.level === 'Missing' && 'Joint Project Plan',
        deal.solutionFit.level === 'Not Assessed' && 'Solution Fit',
        deal.stakeholders.level === 'Missing' && 'Stakeholder map'
      ].filter(Boolean);
      return deal;
    });

    res.json({ generatedAt: new Date().toISOString(), reps: reps.rows, deals });
  } catch (err) {
    console.error('Sales manager dashboard:', err.message);
    res.status(500).json({ error: 'Failed to load the sales manager dashboard.' });
  }
});

router.post('/actions', async (req, res) => {
  const b = req.body || {};
  if (!b.scenarioId) return res.status(400).json({ error: 'Scenario and action are required.' });
  const fields = validateActionFields(b, { requireAction: true });
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    const { rows: scenarioRows } = await query(
      `SELECT id, customer_id
       FROM scenarios
       WHERE id = $1 AND deleted_at IS NULL`,
      [b.scenarioId]
    );
    if (!scenarioRows.length) return res.status(404).json({ error: 'Scenario not found.' });

    const { rows } = await query(
      `INSERT INTO sales_manager_actions
        (scenario_id,customer_id,created_by,action,owner,due_date,priority,status,related_risk,expected_outcome,customer_commitment_sought)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        b.scenarioId,
        scenarioRows[0].customer_id || null,
        req.user.id,
        fields.action,
        fields.owner || null,
        fields.dueDate ?? null,
        b.priority || 'medium',
        b.status || 'open',
        fields.relatedRisk || null,
        fields.expectedOutcome || null,
        fields.customerCommitmentSought || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create manager action:', err.message);
    res.status(500).json({ error: 'Failed to save the manager action.' });
  }
});

router.patch('/actions/:id', async (req, res) => {
  const b = req.body || {};
  const fields = validateActionFields(b);
  if (fields.error) return res.status(400).json({ error: fields.error });

  const updates = [];
  const values = [];
  const push = (column, value) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (b.action !== undefined) push('action', fields.action);
  if (b.owner !== undefined) push('owner', fields.owner || null);
  if (b.dueDate !== undefined) push('due_date', fields.dueDate);
  if (b.priority !== undefined) push('priority', b.priority);
  if (b.status !== undefined) push('status', b.status);
  if (b.relatedRisk !== undefined) push('related_risk', fields.relatedRisk || null);
  if (b.expectedOutcome !== undefined) push('expected_outcome', fields.expectedOutcome || null);
  if (b.customerCommitmentSought !== undefined) push('customer_commitment_sought', fields.customerCommitmentSought || null);

  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });
  values.push(req.params.id);

  try {
    const { rows } = await query(
      `UPDATE sales_manager_actions
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Action not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update manager action:', err.message);
    res.status(500).json({ error: 'Failed to update the manager action.' });
  }
});

router.delete('/actions/:id', async (req, res) => {
  try {
    const { rows } = await query(
      'DELETE FROM sales_manager_actions WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Action not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete manager action:', err.message);
    res.status(500).json({ error: 'Failed to delete the manager action.' });
  }
});

module.exports = router;
