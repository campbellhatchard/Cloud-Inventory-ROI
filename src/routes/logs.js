/* ═══════════════════════════════════════════════════════════════════
   src/routes/logs.js  —  Audit log viewer API

   GET /api/logs          — paginated, filterable audit log (Admin only)
   GET /api/logs/actions  — distinct action types for filter dropdown
   ═══════════════════════════════════════════════════════════════════ */

const express  = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

/* ═══════════════════════════════════════
   GET /api/logs/actions
   Returns distinct action types — used to populate the filter dropdown.
   ═══════════════════════════════════════ */
router.get('/actions', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT action FROM audit_log ORDER BY action ASC`
    );
    res.json(rows.map(r => r.action));
  } catch (err) {
    console.error('List audit actions error:', err.message);
    res.status(500).json({ error: 'Failed to load action types.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/logs
   Paginated audit log with optional filters.

   Query params:
     userId   — filter by user UUID
     action   — filter by action string (partial match)
     from     — ISO date string (inclusive)
     to       — ISO date string (inclusive, extended to end of day)
     limit    — default 50, max 200
     offset   — default 0
     format   — 'csv' for CSV export
   ═══════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { userId, action, from, to, format } = req.query;
    const limit  = Math.min(parseInt(req.query.limit  || '50',  10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0',   10), 0);

    /* Build WHERE clause dynamically */
    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (userId) {
      conditions.push(`al.user_id = $${idx++}`);
      params.push(userId);
    }
    if (action) {
      conditions.push(`al.action ILIKE $${idx++}`);
      params.push('%' + action + '%');
    }
    if (from) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(new Date(from).toISOString());
    }
    if (to) {
      /* Extend 'to' to end of the selected day */
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(toDate.toISOString());
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    /* Total count for pagination */
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM audit_log al ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    /* Fetch page */
    const { rows } = await query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id,
              al.detail, al.ip_address, al.created_at,
              u.username, u.email
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    /* CSV export */
    if (format === 'csv') {
      const header = ['Timestamp', 'User', 'Email', 'Action', 'Entity type', 'Entity ID', 'IP Address', 'Detail'];
      const csvRows = rows.map(r => [
        new Date(r.created_at).toISOString(),
        r.username || '(system)',
        r.email    || '',
        r.action,
        r.entity_type || '',
        r.entity_id   || '',
        r.ip_address  || '',
        r.detail ? JSON.stringify(r.detail) : ''
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

      const csv = [header.join(','), ...csvRows].join('\r\n');
      const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    res.json({ total, limit, offset, rows });

  } catch (err) {
    console.error('List audit logs error:', err.message);
    res.status(500).json({ error: 'Failed to load audit log.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/logs/errors  — recent server errors (Admin only)
   DELETE /api/logs/errors — prune errors older than ?days (default 90)
   ═══════════════════════════════════════ */
router.get('/errors', async (req, res) => {
  try {
    const { recentErrors } = require('../error-log');
    const data = await recentErrors(req.query.limit || 100, req.query.offset || 0);
    res.json(data);
  } catch (err) {
    console.error('List errors failed:', err.message);
    res.status(500).json({ error: 'Failed to load error log.' });
  }
});

router.delete('/errors', async (req, res) => {
  try {
    const { pruneErrors } = require('../error-log');
    const removed = await pruneErrors(req.query.days || 90);
    res.json({ ok: true, removed });
  } catch (err) {
    console.error('Prune errors failed:', err.message);
    res.status(500).json({ error: 'Failed to prune error log.' });
  }
});

module.exports = router;
