/* ═══════════════════════════════════════════════════════════════════
   src/routes/stakeholders.js — Stakeholder map CRUD (auth required)
   ═══════════════════════════════════════════════════════════════════ */
const express   = require('express');
const { query } = require('../db');
const { log }   = require('../audit');
const { requireAuth, hasRole } = require('../middleware/auth');
const {hasPermission}=require('../authorization');

const router = express.Router();
router.use(requireAuth);

const ROLES = ['champion','economic_buyer','technical_buyer','influencer','blocker','end_user'];

/* List — optionally filtered by company. Admins can pass ?all=true */
router.get('/', async (req, res) => {
  try {
    const { company } = req.query;
    const canViewTeam = hasPermission(req.user,'view_team_customers') || hasPermission(req.user,'view_all_customers');
    const showAll = canViewTeam && req.query.all === 'true';
    let sql, params;
    if (showAll) {
      sql = `SELECT s.id, s.company, s.name, s.title, s.role, s.influence,
                    s.support, s.engaged, s.notes, s.updated_at,
                    u.username AS owner_username
             FROM stakeholders s JOIN users u ON u.id = s.owner_id
             WHERE ($2 OR s.owner_id=$1 OR EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=s.owner_id AND om.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE))
             ${company ? 'AND LOWER(s.company) = LOWER($3)' : ''}
             ORDER BY s.influence DESC, s.name ASC LIMIT 500`;
      params = company ? [req.user.id,hasPermission(req.user,'view_all_customers'),company] : [req.user.id,hasPermission(req.user,'view_all_customers')];
    } else {
      sql = `SELECT id, company, name, title, role, influence, support, engaged, notes, updated_at
             FROM stakeholders WHERE owner_id = $1
             ${company ? 'AND LOWER(company) = LOWER($2)' : ''}
             ORDER BY influence DESC, name ASC LIMIT 200`;
      params = company ? [req.user.id, company] : [req.user.id];
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Failed to load stakeholders.' }); }
});

/* Distinct companies for the picker — admins see all reps' companies */
router.get('/companies', async (req, res) => {
  try {
    const canViewTeam = hasPermission(req.user,'view_team_customers') || hasPermission(req.user,'view_all_customers');
    const showAll = canViewTeam && req.query.all === 'true';
    let sql, params;
    if (showAll) {
      sql = `SELECT DISTINCT s.company FROM stakeholders s WHERE s.company != '' AND ($2 OR s.owner_id=$1 OR EXISTS(SELECT 1 FROM sales_team_memberships me JOIN sales_team_memberships om ON om.team_id=me.team_id AND om.user_id=s.owner_id AND om.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE)) ORDER BY s.company`;
      params = [req.user.id,hasPermission(req.user,'view_all_customers')];
    } else {
      sql = `SELECT DISTINCT company FROM stakeholders WHERE owner_id = $1 AND company != '' ORDER BY company`;
      params = [req.user.id];
    }
    const { rows } = await query(sql, params);
    res.json(rows.map(r => r.company));
  } catch (e) { res.status(500).json({ error: 'Failed to load companies.' }); }
});

/* Create */
router.post('/', async (req, res) => {
  try {
    const { company, name, title, role, influence, support, engaged, notes } = req.body || {};
    if (!company || !company.trim()) return res.status(400).json({ error: 'A company must be selected before adding a stakeholder.' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    const inf = Math.min(5, Math.max(1, parseInt(influence) || 3));
    const sup = Math.min(5, Math.max(1, parseInt(support)   || 3));
    const { rows } = await query(
      `INSERT INTO stakeholders (owner_id, company, name, title, role, influence, support, engaged, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, company, name, title, role, influence, support, engaged, notes, updated_at`,
      [req.user.id, (company||'').trim(), name.trim(), (title||'').trim(),
       role || 'influencer', inf, sup, !!engaged, (notes||'').trim()]
    );
    await log({ userId: req.user.id, action: 'stakeholder.created', entityType: 'stakeholder',
                entityId: rows[0].id, detail: { name: name.trim(), company }, ipAddress: req.ip });
    res.status(201).json(rows[0]);
  } catch (e) { console.error('Stakeholder create:', e.message); res.status(500).json({ error: 'Failed to create stakeholder.' }); }
});

/* Update */
router.patch('/:id', async (req, res) => {
  try {
    const { company, name, title, role, influence, support, engaged, notes } = req.body || {};
    if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    if (company !== undefined && !String(company).trim()) return res.status(400).json({ error: 'Company cannot be blank.' });
    const { rows } = await query(
      `UPDATE stakeholders SET
         company   = COALESCE($1, company),
         name      = COALESCE($2, name),
         title     = COALESCE($3, title),
         role      = COALESCE($4, role),
         influence = COALESCE($5, influence),
         support   = COALESCE($6, support),
         engaged   = COALESCE($7, engaged),
         notes     = COALESCE($8, notes)
       WHERE id = $9 AND owner_id = $10
       RETURNING id, company, name, title, role, influence, support, engaged, notes, updated_at`,
      [company !== undefined ? company.trim() : null,
       name    !== undefined ? name.trim()    : null,
       title   !== undefined ? title.trim()   : null,
       role || null,
       influence !== undefined ? Math.min(5, Math.max(1, parseInt(influence)||3)) : null,
       support   !== undefined ? Math.min(5, Math.max(1, parseInt(support)||3))   : null,
       engaged   !== undefined ? !!engaged : null,
       notes     !== undefined ? notes : null,
       req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Stakeholder not found.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Failed to update stakeholder.' }); }
});

/* Delete */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      'DELETE FROM stakeholders WHERE id = $1 AND owner_id = $2 RETURNING id, name',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Stakeholder not found.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete stakeholder.' }); }
});

module.exports = router;
