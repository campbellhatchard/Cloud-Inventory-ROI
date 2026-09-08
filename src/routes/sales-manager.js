/* Sales Manager portfolio dashboard. Read-only synthesis of persisted deal data;
   it deliberately never imports or invokes the ROI calculation engine. */
const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAnyRole } = require('../middleware/auth');
const { hasPermission, customerScopeSql, scenarioAccess } = require('../authorization');
const {evaluateLiveStageReadinessBatch,liveReadinessSummary}=require('../shared/stage-readiness-service');

const router = express.Router();
router.use(requireAuth, requireAnyRole('sales_manager', 'admin'));

const num = value => value === null || value === undefined || value === '' ? null : Number(value);
const text = value => String(value || '').trim();
const lower = value => text(value).toLowerCase();

function solutionFit(handoff) {
  if (!handoff) return { level: 'Not Assessed', reasons: ['No Solution Fit assessment saved'] };
  const data = handoff.data || {};
  const gaps = Array.isArray(data.gaps) ? data.gaps : [];
  const critical = gaps.filter(g => lower(g.priority).includes('must') || lower(g.severity).includes('critical') || lower(g.goLive) === 'yes');
  const unresolved = gaps.filter(g => !['closed','resolved','done'].includes(lower(g.status)));
  let level = 'Low Risk';
  if (critical.length >= 2) level = 'Critical Risk';
  else if (critical.length || handoff.status === 'not_ready') level = 'High Risk';
  else if (unresolved.length || handoff.status === 'conditional') level = 'Moderate Risk';
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
  const level = overdue.length ? 'Past Due' : (!ms.length || missingDates || missingOwners) ? 'Incomplete' : 'On Track';
  return { level, overdue: overdue.length, open: open.length, missingDates, missingOwners,
    reasons: [`${open.length} open milestone${open.length === 1 ? '' : 's'}`, `${overdue.length} past due`, `${missingDates + missingOwners} missing date/owner field${missingDates + missingOwners === 1 ? '' : 's'}`] };
}

function stakeholderHealth(items) {
  const list = items || [];
  const champion = list.find(s => s.role === 'champion' && s.engaged && Number(s.support) >= 4);
  const buyer = list.find(s => s.role === 'economic_buyer' && s.engaged);
  const blockers = list.filter(s => s.role === 'blocker' || (Number(s.influence) >= 4 && Number(s.support) <= 2));
  let level = 'Strong';
  if (!list.length) level = 'Missing';
  else if (!champion && !buyer) level = 'Critical';
  else if (!champion || !buyer || blockers.length) level = blockers.length ? 'Weak' : 'Developing';
  return { level, reasons: [champion ? 'Engaged champion identified' : 'Engaged champion missing', buyer ? 'Economic buyer engaged' : 'Economic buyer not engaged', `${blockers.length} blocker${blockers.length === 1 ? '' : 's'} identified`] };
}

function dealHealth(deal) {
  const risks = [];
  const g=deal.stageGovernance||{};
  if(g.alignmentRisk==='Red')risks.push(`Current Stage is ${g.stageGap} stages ahead of buyer evidence`);
  else if(g.alignmentRisk==='Yellow')risks.push('Current Stage is one stage ahead of buyer evidence');
  if(g.blockingCriteria?.length)risks.push(`${g.blockingCriteria.length} mandatory stage requirement${g.blockingCriteria.length===1?' is':'s are'} incomplete`);
  if(g.roiMaturityBlockingReason)risks.push(g.roiMaturityBlockingReason);
  if(g.buyerCommitmentBlockingReason)risks.push(g.buyerCommitmentBlockingReason);
  if(g.freshnessSummary?.stale)risks.push(`${g.freshnessSummary.stale} mandatory evidence item${g.freshnessSummary.stale===1?' is':'s are'} stale`);
  if(g.freshnessSummary?.needsReview)risks.push(`${g.freshnessSummary.needsReview} mandatory evidence item${g.freshnessSummary.needsReview===1?' needs':'s need'} review`);
  if (deal.plan.level === 'Missing' || deal.plan.overdue) risks.push(deal.plan.level === 'Missing' ? 'Joint Project Plan missing' : `${deal.plan.overdue} project item(s) past due`);
  if (['High Risk','Critical Risk','Not Assessed'].includes(deal.solutionFit.level)) risks.push(`Solution Fit: ${deal.solutionFit.level}`);
  if (['Critical','Missing','Weak','Developing'].includes(deal.stakeholders.level)) risks.push(`Stakeholders: ${deal.stakeholders.level}`);
  if (!deal.closeDate) risks.push('Target close date missing');
  const age = Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / 86400000);
  if (age > 30) risks.push(`No scenario update for ${age} days`);
  return { level: risks.length >= 3 ? 'Stalled' : risks.length ? 'At Risk' : 'Healthy', reasons: risks.length ? risks : ['Current data shows no material execution gaps'] };
}

function priority(deal) {
  const g=deal.stageGovernance||{};
  if(g.outcome)return{level:'No Intervention Needed',reasons:[`Closed ${g.outcome==='won'?'Won':'Lost'} — review outcome rather than active readiness.`]};
  const immediate=g.alignmentRisk==='Red'||deal.solutionFit.level==='Critical Risk'||g.stageGap>=2;
  const weekly=g.alignmentRisk==='Yellow'||g.blockingCriteria?.length||g.roiMaturityBlockingReason||g.buyerCommitmentBlockingReason||g.freshnessSummary?.stale||g.freshnessSummary?.needsReview||deal.plan.overdue||['High Risk','Not Assessed'].includes(deal.solutionFit.level)||['Critical','Missing','Weak'].includes(deal.stakeholders.level);
  const level=immediate?'Immediate Attention':weekly?'Review This Week':deal.plan.level==='Incomplete'?'Monitor':'No Intervention Needed';
  return { level, reasons: [...deal.health.reasons, ...deal.solutionFit.reasons.slice(0,1)] };
}

router.get('/dashboard', async (req, res) => {
  try {
    const global=hasPermission(req.user,'view_all_customers');
    const [scenarios, handoffs, plans, stakeholders, actions, reps] = await Promise.all([
      query(`SELECT s.id,s.base_id,s.version,s.name,s.company,s.customer_id,s.industry,s.deal_stage,s.solution,s.data,s.updated_at,
                    g.current_stage,g.rep_assessed_stage,g.outcome buy_cycle_outcome,g.opportunity_profile,
                    u.id owner_id,u.username owner_username
             FROM scenarios s JOIN users u ON u.id=s.owner_id
             LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
             LEFT JOIN customers c ON c.id=s.customer_id
             WHERE s.is_current=TRUE AND s.deleted_at IS NULL AND ($2 OR (c.id IS NOT NULL AND ${customerScopeSql('c','$1')})) ORDER BY s.updated_at DESC`,[req.user.id,global]),
      query(`SELECT h.customer_id,h.data,h.readiness,h.status,h.updated_at FROM handoffs h JOIN customers c ON c.id=h.customer_id WHERE h.deleted_at IS NULL AND ($2 OR ${customerScopeSql('c','$1')})`,[req.user.id,global]),
      query(`SELECT p.id,p.scenario_id,p.company,p.title,p.target_close_date,p.milestones,p.groups,p.token,p.is_active,p.updated_at FROM mutual_action_plans p WHERE ($2 OR p.owner_id=$1 OR EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=p.owner_id AND om.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE))`,[req.user.id,global]),
      query(`SELECT s.id,s.company,s.owner_id,s.name,s.title,s.role,s.influence,s.support,s.engaged,s.notes,s.updated_at FROM stakeholders s WHERE ($2 OR s.owner_id=$1 OR EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=s.owner_id AND om.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE))`,[req.user.id,global]),
      query(`SELECT * FROM sales_manager_actions ORDER BY due_date NULLS LAST,created_at DESC`),
      query(`SELECT DISTINCT u.id,u.username FROM users u LEFT JOIN sales_team_memberships tm ON tm.user_id=u.id AND tm.is_active=TRUE LEFT JOIN sales_team_memberships me ON me.team_id=tm.team_id AND me.user_id=$1 AND me.is_active=TRUE WHERE u.is_active=TRUE AND (u.role='rep' OR 'rep'=ANY(u.roles)) AND ($2 OR u.id=$1 OR me.id IS NOT NULL) ORDER BY u.username`,[req.user.id,global])
    ]);
    const liveByScenario=await evaluateLiveStageReadinessBatch(scenarios.rows);
    const handoffByCustomer = new Map(handoffs.rows.map(h => [String(h.customer_id), h]));
    const actionsByScenario = new Map();
    actions.rows.forEach(a => { const key=String(a.scenario_id); actionsByScenario.set(key,[...(actionsByScenario.get(key)||[]),a]); });
    const deals = scenarios.rows.map(s => {
      const plan = plans.rows.filter(p => (p.scenario_id && String(p.scenario_id) === String(s.id)) || lower(p.company) === lower(s.company)).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0];
      const people = stakeholders.rows.filter(p => lower(p.company) === lower(s.company) && String(p.owner_id) === String(s.owner_id));
      const data = s.data || {};
      const live=liveByScenario.get(String(s.id));
      const governance=live?liveReadinessSummary(live):{currentStage:Number(s.current_stage||2),repAssessmentStage:Number(s.rep_assessed_stage||s.current_stage||2),evidenceStage:2,stageGap:Math.max(0,Number(s.current_stage||2)-2),alignmentRisk:'Red',readiness:null,blockingCriteria:[],freshnessSummary:{aging:0,stale:0,needsReview:0},setupNeeded:true};
      const savedStage=governance.currentStage;
      const deal = {
        id:s.id, baseId:s.base_id, version:s.version, name:s.name, company:s.company, customerId:s.customer_id,
        repId:s.owner_id, rep:s.owner_username, industry:s.industry || data.industry || 'Not set', buyingStage:savedStage===7&&s.buy_cycle_outcome?`Closed ${s.buy_cycle_outcome==='won'?'Won':'Lost'}`:`Stage ${savedStage}`,
        solution:s.solution || data.solution || 'Not set', updatedAt:s.updated_at,
        closeDate:plan && plan.target_close_date || null,
        commercial:{opportunityValue:num(s.opportunity_profile?.estimatedOpportunityValue),currency:s.opportunity_profile?.currency||data.currency||'USD'},
        roi:{ annualBenefit:num(data.annualBenefit), totalContractBenefit:num(data.totalContractBenefit), totalContractInvestment:num(data.totalContractInvestment), contractNetBenefit:num(data.totalContractNetBenefit), contractRoi:num(data.totalContractRoi), contractNpv:num(data.totalContractNpv), payback:num(data.payback), contractMonths:num(data.contractMonths), investment:num(data.totalContractInvestment) /* deprecated compatibility alias */ },
        solutionFit:solutionFit(s.customer_id ? handoffByCustomer.get(String(s.customer_id)) : null),
        plan:planHealth(plan), planRecord:plan || null, stakeholders:stakeholderHealth(people), stakeholderRecords:people,
        actions:actionsByScenario.get(String(s.id)) || [],
        stageGovernance:governance
      };
      deal.health = dealHealth(deal);
      deal.managementPriority = priority(deal);
      deal.missing = [deal.stageGovernance.stageGap>0 && `Stage evidence gap: ${deal.stageGovernance.stageGap}`, !deal.closeDate && 'Target close date', deal.plan.level === 'Missing' && 'Joint Project Plan', deal.solutionFit.level === 'Not Assessed' && 'Solution Fit', deal.stakeholders.level === 'Missing' && 'Stakeholder map'].filter(Boolean);
      return deal;
    });
    res.json({ generatedAt:new Date().toISOString(), reps:reps.rows, deals });
  } catch (e) { console.error('Sales manager dashboard:', e.message); res.status(500).json({ error:'Failed to load the sales manager dashboard.' }); }
});

router.post('/actions', async (req,res) => {
  const b=req.body||{};
  if (!b.scenarioId || !text(b.action)) return res.status(400).json({error:'Scenario and action are required.'});
  try {
    const access=await scenarioAccess(req.user,b.scenarioId,'view');
    if(!access.exists)return res.status(404).json({error:'Scenario not found.'});
    if(!access.allowed)return res.status(403).json({error:'This scenario is outside your Sales Team scope.'});
    const {rows}=await query(`INSERT INTO sales_manager_actions
      (scenario_id,customer_id,created_by,action,owner,due_date,priority,status,related_risk,expected_outcome,customer_commitment_sought)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.scenarioId,b.customerId||null,req.user.id,text(b.action),text(b.owner)||null,b.dueDate||null,b.priority||'medium',b.status||'open',text(b.relatedRisk)||null,text(b.expectedOutcome)||null,text(b.customerCommitmentSought)||null]);
    res.status(201).json(rows[0]);
  } catch(e){res.status(500).json({error:'Failed to save the manager action.'});}
});

router.patch('/actions/:id', async (req,res) => {
  const b=req.body||{};
  try { const existing=await query('SELECT scenario_id FROM sales_manager_actions WHERE id=$1',[req.params.id]);
    if(!existing.rows.length)return res.status(404).json({error:'Action not found.'});
    const access=await scenarioAccess(req.user,existing.rows[0].scenario_id,'view');
    if(!access.allowed)return res.status(403).json({error:'This action is outside your Sales Team scope.'});
    const {rows}=await query(`UPDATE sales_manager_actions SET action=COALESCE($1,action),owner=COALESCE($2,owner),due_date=$3,
    priority=COALESCE($4,priority),status=COALESCE($5,status),related_risk=COALESCE($6,related_risk),expected_outcome=COALESCE($7,expected_outcome),customer_commitment_sought=COALESCE($8,customer_commitment_sought)
    WHERE id=$9 RETURNING *`,[b.action||null,b.owner||null,b.dueDate||null,b.priority||null,b.status||null,b.relatedRisk||null,b.expectedOutcome||null,b.customerCommitmentSought||null,req.params.id]);
    if(!rows.length)return res.status(404).json({error:'Action not found.'}); res.json(rows[0]);
  } catch(e){res.status(500).json({error:'Failed to update the manager action.'});}
});

router.delete('/actions/:id', async(req,res)=>{try{const existing=await query('SELECT scenario_id FROM sales_manager_actions WHERE id=$1',[req.params.id]);if(!existing.rows.length)return res.status(404).json({error:'Action not found.'});const access=await scenarioAccess(req.user,existing.rows[0].scenario_id,'view');if(!access.allowed)return res.status(403).json({error:'This action is outside your Sales Team scope.'});const {rows}=await query('DELETE FROM sales_manager_actions WHERE id=$1 RETURNING id',[req.params.id]);res.json({ok:true});}catch(e){res.status(500).json({error:'Failed to delete the manager action.'});}});

module.exports = router;
