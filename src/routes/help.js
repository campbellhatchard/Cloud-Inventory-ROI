/* ═══════════════════════════════════════════════════════════════════
   src/routes/help.js  —  How to Use help pages

   GET  /api/help          — list all pages (public — no auth required)
   GET  /api/help/:slug    — single page by slug (public)
   PUT  /api/help/:slug    — update title + content (Admin only)
   ═══════════════════════════════════════════════════════════════════ */

const express  = require('express');
const { query } = require('../db');
const { log, ACTIONS } = require('../audit');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/* ═══════════════════════════════════════
   GET /api/help
   List all pages ordered by sort_order.
   Public — no auth required (reps and prospects can read).
   ═══════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, slug, title, sort_order, updated_at,
              u.username AS updated_by_username
       FROM help_pages h
       LEFT JOIN users u ON u.id = h.updated_by
       ORDER BY h.sort_order ASC, h.title ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('List help pages error:', err.message);
    res.status(500).json({ error: 'Failed to load help pages.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/help/:slug
   Single page including full content.
   ═══════════════════════════════════════ */
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT h.id, h.slug, h.title, h.content, h.sort_order,
              h.updated_at, u.username AS updated_by_username
       FROM help_pages h
       LEFT JOIN users u ON u.id = h.updated_by
       WHERE h.slug = $1`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Page not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get help page error:', err.message);
    res.status(500).json({ error: 'Failed to load help page.' });
  }
});

/* ═══════════════════════════════════════
   PUT /api/help/:slug
   Update title and/or content. Admin only.
   ═══════════════════════════════════════ */
router.put('/:slug', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, content } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (content === undefined) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  /* Basic HTML sanitisation — strip <script> tags (belt-and-suspenders;
     full sanitisation should be done client-side and at display time too) */
  const safeContent = String(content)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  try {
    const { rows } = await query(
      `UPDATE help_pages
       SET title = $1, content = $2, updated_by = $3, updated_at = NOW()
       WHERE slug = $4
       RETURNING id, slug, title, updated_at`,
      [title.trim(), safeContent, req.user.id, req.params.slug]
    );

    if (!rows.length) return res.status(404).json({ error: 'Page not found.' });

    await log({
      userId:     req.user.id,
      action:     ACTIONS.HELP_PAGE_UPDATED,
      entityType: 'help_page',
      entityId:   rows[0].id,
      detail:     { slug: req.params.slug, title: title.trim() },
      ipAddress:  req.ip
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('Update help page error:', err.message);
    res.status(500).json({ error: 'Failed to update help page.' });
  }
});

module.exports = router;
