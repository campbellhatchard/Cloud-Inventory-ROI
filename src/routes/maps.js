/* ═══════════════════════════════════════════════════════════════════
   src/routes/maps.js — Mutual Action Plans
   Rep endpoints (auth) + public prospect endpoints (token-gated).
   ═══════════════════════════════════════════════════════════════════ */
const express   = require('express');
const crypto    = require('crypto');
const { query } = require('../db');
const { log }   = require('../audit');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ── PUBLIC: prospect fetches the plan by token ── */
router.get('/public/:token', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT m.id, m.company, m.title, m.target_close_date, m.milestones,
              m.is_active, m.updated_at, u.username AS rep_name, u.email AS rep_email
       FROM mutual_action_plans m JOIN users u ON u.id = m.owner_id
       WHERE m.token = $1`,
      [String(req.params.token || '')]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    if (!rows[0].is_active) return res.status(410).json({ error: 'This action plan link is no longer active.' });
    res.json(rows[0]);
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

/* List own plans */
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, company, title, target_close_date, token, is_active,
              milestones, created_at, updated_at
       FROM mutual_action_plans WHERE owner_id = $1
       ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Failed to load plans.' }); }
});

/* Create */
router.post('/', async (req, res) => {
  try {
    const { company, title, targetCloseDate, milestones, scenarioId } = req.body || {};
    const { rows } = await query(
      `INSERT INTO mutual_action_plans (owner_id, scenario_id, company, title, target_close_date, milestones)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, company, title, target_close_date, token, is_active, milestones, created_at, updated_at`,
      [req.user.id, scenarioId || null, (company||'').trim(), (title||'Mutual Action Plan').trim(),
       targetCloseDate || null, JSON.stringify(milestones || [])]
    );
    await log({ userId: req.user.id, action: 'map.created', entityType: 'mutual_action_plan',
                entityId: rows[0].id, detail: { company }, ipAddress: req.ip });
    res.status(201).json(rows[0]);
  } catch (e) { console.error('MAP create:', e.message); res.status(500).json({ error: 'Failed to create plan.' }); }
});

/* Update (title, date, milestones) */
router.put('/:id', async (req, res) => {
  try {
    const { company, title, targetCloseDate, milestones } = req.body || {};
    const { rows } = await query(
      `UPDATE mutual_action_plans
       SET company = COALESCE($1, company), title = COALESCE($2, title),
           target_close_date = $3, milestones = COALESCE($4, milestones)
       WHERE id = $5 AND owner_id = $6
       RETURNING id, company, title, target_close_date, token, is_active, milestones, updated_at`,
      [company !== undefined ? company.trim() : null,
       title   !== undefined ? title.trim()   : null,
       targetCloseDate || null,
       milestones !== undefined ? JSON.stringify(milestones) : null,
       req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found.' });
    res.json(rows[0]);
  } catch (e) { console.error('MAP update:', e.message); res.status(500).json({ error: 'Failed to update plan.' }); }
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
      url: `${process.env.APP_URL || ''}/prospect-map.html#token=${token}` });
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
