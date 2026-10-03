/* ═══════════════════════════════════════════════════════════════════
   src/routes/maps.js — Joint Project Plans
   Rep endpoints (auth) + public prospect endpoints (token-gated).
   ═══════════════════════════════════════════════════════════════════ */
const express   = require('express');
const crypto    = require('crypto');
const { query } = require('../db');
const { log }   = require('../audit');
const { requireAuth, hasRole } = require('../middleware/auth');
const {hasPermission,scenarioAccess}=require('../authorization');
const {buildJppPptx}=require('../exports/operational-pptx');
const {buildJppPdf}=require('../exports/operational-pdf');
const {safeFile}=require('../shared/output-brand');

const router = express.Router();
const namedMilestones=value=>(Array.isArray(value)?value:[]).filter(m=>String(m?.title||m?.task||'').trim());
const presentPlan=plan=>plan?{...plan,milestones:namedMilestones(plan.milestones)}:plan;
function validateMilestones(value){if(value===undefined)return; if(!Array.isArray(value))throw Object.assign(new Error('Milestones must be an array.'),{status:400});if(value.some(m=>!String(m?.title||m?.task||'').trim()))throw Object.assign(new Error('Name each milestone before saving the Joint Project Plan.'),{status:400});}

/* ── PUBLIC: prospect fetches the plan by token ── */
router.get('/public/:token', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT m.id, m.company, m.title, m.target_close_date, m.milestones, m.groups,
              m.is_active, m.updated_at, u.username AS rep_name, u.email AS rep_email
       FROM mutual_action_plans m JOIN users u ON u.id = m.owner_id
       WHERE m.token = $1`,
      [String(req.params.token || '')]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    if (!rows[0].is_active) return res.status(410).json({ error: 'This Joint Project Plan link is no longer active.' });
    res.json(presentPlan(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Failed to load plan.' }); }
});

/* ── PUBLIC: prospect updates status of a milestone assigned to them ── */
router.put('/public/:token/milestone/:mid', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const { rows } = await query(
      'SELECT id, milestones, is_active FROM mutual_action_plans WHERE token = $1',
      [String(req.params.token || '')]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    if (!rows[0].is_active) return res.status(410).json({ error: 'Link no longer active.' });

    const ms = rows[0].milestones || [];
    const idx = ms.findIndex(m => m.id === req.params.mid);
    if (idx === -1) return res.status(404).json({ error: 'Milestone not found.' });
    /* Prospects may only update items owned by prospect or joint */
    if (!['prospect', 'joint'].includes(ms[idx].owner)) {
      return res.status(403).json({ error: 'This item is owned by the vendor team.' });
    }
    ms[idx].status = status;
    ms[idx].updatedBy = 'prospect';
    await query('UPDATE mutual_action_plans SET milestones = $1 WHERE id = $2',
      [JSON.stringify(ms), rows[0].id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to update milestone.' }); }
});

/* ── All routes below require auth ── */
router.use(requireAuth);

/* List own plans — admins can pass ?all=true to see all reps' plans */
router.get('/', async (req, res) => {
  try {
    const canViewTeam = hasPermission(req.user,'view_team_customers') || hasPermission(req.user,'view_all_customers');
    const showAll = canViewTeam && req.query.all === 'true';
    let sql, params;
    if (showAll) {
      sql = `SELECT m.id, m.owner_id, m.company, m.title, m.target_close_date, m.token, m.is_active,
                    m.milestones, m.groups, m.created_at, m.updated_at,
                    u.username AS owner_username
             FROM mutual_action_plans m
             JOIN users u ON u.id = m.owner_id
             WHERE ($2 OR m.owner_id=$1 OR EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=m.owner_id AND om.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE))
             ORDER BY m.updated_at DESC LIMIT 200`;
      params = [req.user.id,hasPermission(req.user,'view_all_customers')];
    } else {
      sql = `SELECT id, owner_id, company, title, target_close_date, token, is_active,
                    milestones, groups, created_at, updated_at
             FROM mutual_action_plans WHERE owner_id = $1
             ORDER BY updated_at DESC LIMIT 50`;
      params = [req.user.id];
    }
    const { rows } = await query(sql, params);
    res.json(rows.map(presentPlan));
  } catch (e) { res.status(500).json({ error: 'Failed to load plans.' }); }
});

router.get('/:id/export-pptx',async(req,res)=>{try{const audience=req.query.audience==='internal'?'internal':'customer',all=hasPermission(req.user,'view_all_customers'),team=hasPermission(req.user,'view_team_customers'),{rows}=await query(`SELECT m.* FROM mutual_action_plans m WHERE m.id=$1 AND ($3 OR m.owner_id=$2 OR ($4 AND EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=m.owner_id AND om.is_active=TRUE WHERE me.user_id=$2 AND me.is_active=TRUE)))`,[req.params.id,req.user.id,all,team]);if(!rows.length)return res.status(404).json({error:'Plan not found or access denied.'});const buf=await buildJppPptx(rows[0],{audience});res.set('Content-Type','application/vnd.openxmlformats-officedocument.presentationml.presentation');res.set('Content-Disposition',`attachment; filename="Cloud-Inventory-${audience==='internal'?'Internal-':''}Joint-Project-Plan-${safeFile(rows[0].company)}-${new Date().toISOString().slice(0,10)}.pptx"`);res.send(buf);}catch(e){console.error('jpp_pptx.failed',{errorId:`jpp-${Date.now().toString(36)}`,message:e.message});res.status(500).json({error:'Joint Project Plan PowerPoint could not be generated.'});}});
router.get('/:id/export-pdf',async(req,res)=>{try{const audience=req.query.audience==='internal'?'internal':'customer',all=hasPermission(req.user,'view_all_customers'),team=hasPermission(req.user,'view_team_customers'),{rows}=await query(`SELECT m.* FROM mutual_action_plans m WHERE m.id=$1 AND ($3 OR m.owner_id=$2 OR ($4 AND EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=m.owner_id AND om.is_active=TRUE WHERE me.user_id=$2 AND me.is_active=TRUE)))`,[req.params.id,req.user.id,all,team]);if(!rows.length)return res.status(404).json({error:'Plan not found or access denied.'});const buf=buildJppPdf(rows[0],{audience});res.set('Content-Type','application/pdf');res.set('Cache-Control','private, no-store');res.set('Content-Disposition',`attachment; filename="Cloud-Inventory-${audience==='internal'?'Internal-':''}Joint-Project-Plan-${safeFile(rows[0].company)}-${new Date().toISOString().slice(0,10)}.pdf"`);res.send(buf);}catch(e){console.error('jpp_pdf.failed',{errorId:`jpp-pdf-${Date.now().toString(36)}`,message:e.message});res.status(500).json({error:'Joint Project Plan PDF could not be generated.'});}});

/* Create */
router.post('/', async (req, res) => {
  try {
    const { company, title, targetCloseDate, milestones, groups, scenarioId } = req.body || {};
    validateMilestones(milestones);
    let authoritativeCompany=String(company||'').trim(),authoritativeOwner=req.user.id;
    if(scenarioId){
      const access=await scenarioAccess(req.user,scenarioId,'edit');
      if(!access.exists)return res.status(404).json({error:'Scenario not found.'});
      if(!access.allowed)return res.status(403).json({error:'You cannot attach a Joint Project Plan to this scenario.'});
      const scoped=await query('SELECT company,owner_id FROM scenarios WHERE id=$1 AND deleted_at IS NULL',[scenarioId]);
      if(!scoped.rows.length)return res.status(404).json({error:'Scenario not found.'});
      authoritativeCompany=String(scoped.rows[0].company||'').trim();authoritativeOwner=scoped.rows[0].owner_id;
    }
    if (!authoritativeCompany) return res.status(400).json({ error: 'A company must be selected before saving a Joint Project Plan.' });
    const { rows } = await query(
      `INSERT INTO mutual_action_plans (owner_id, scenario_id, company, title, target_close_date, milestones, groups)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, company, title, target_close_date, token, is_active, milestones, groups, created_at, updated_at`,
      [authoritativeOwner, scenarioId || null, authoritativeCompany, (title||'Joint Project Plan').trim(),
       targetCloseDate || null, JSON.stringify(milestones || []), JSON.stringify(groups || [])]
    );
    await log({ userId: req.user.id, action: 'map.created', entityType: 'mutual_action_plan',
                entityId: rows[0].id, detail: { company:authoritativeCompany, scenarioId:scenarioId||null }, ipAddress: req.ip });
    res.status(201).json(presentPlan(rows[0]));
  } catch (e) { console.error('MAP create:', e.message); res.status(e.status||500).json({ error: e.status?e.message:'Failed to create plan.' }); }
});

/* Update (title, date, milestones) */
router.put('/:id', async (req, res) => {
  try {
    const { company, title, targetCloseDate, milestones, groups } = req.body || {};
    validateMilestones(milestones);
    if (company !== undefined && !String(company).trim()) {
      return res.status(400).json({ error: 'Company cannot be blank.' });
    }
    const { rows } = await query(
      `UPDATE mutual_action_plans
       SET company = COALESCE($1, company), title = COALESCE($2, title),
           target_close_date = $3, milestones = COALESCE($4, milestones),
           groups = COALESCE($5, groups)
       WHERE id = $6 AND owner_id = $7
       RETURNING id, company, title, target_close_date, token, is_active, milestones, groups, updated_at`,
      [company !== undefined ? company.trim() : null,
       title   !== undefined ? title.trim()   : null,
       targetCloseDate || null,
       milestones !== undefined ? JSON.stringify(milestones) : null,
       groups !== undefined ? JSON.stringify(groups) : null,
       req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    res.json(presentPlan(rows[0]));
  } catch (e) { console.error('MAP update:', e.message); res.status(e.status||500).json({ error: e.status?e.message:'Failed to update plan.' }); }
});

/* Generate / rotate share token */
router.post('/:id/share', async (req, res) => {
  try {
    const token = crypto.randomBytes(24).toString('hex');
    const { rows } = await query(
      `UPDATE mutual_action_plans SET token = $1, is_active = TRUE
       WHERE id = $2 AND owner_id = $3 RETURNING id`,
      [token, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    await log({ userId: req.user.id, action: 'map.shared', entityType: 'mutual_action_plan',
                entityId: req.params.id, ipAddress: req.ip });
    res.json({ ok: true, token,
      url: `${(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '')}/prospect-map.html?token=${token}` });
  } catch (e) { res.status(500).json({ error: 'Failed to share plan.' }); }
});

/* Revoke share link */
router.delete('/:id/share', async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE mutual_action_plans SET token = NULL WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to revoke link.' }); }
});

/* Delete plan */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      'DELETE FROM mutual_action_plans WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    await log({ userId: req.user.id, action: 'map.deleted', entityType: 'mutual_action_plan',
                entityId: req.params.id, ipAddress: req.ip });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete plan.' }); }
});

module.exports = router;
