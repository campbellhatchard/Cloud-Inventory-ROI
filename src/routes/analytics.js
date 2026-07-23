/* ═══════════════════════════════════════════════════════════════════
   analytics.js — server-side usage analytics + custom benchmarks
   Replaces the former client-only localStorage storage.
   ═══════════════════════════════════════════════════════════════════ */
const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/* Do not apply requireAuth globally at router level.
   This router is mounted at /api, and a broad router-level auth middleware
   intercepts public routes such as /api/discovery/sessions/:token before
   server.js can serve them. Apply auth only to the routes declared here. */

/* ── Record a usage event (fire-and-forget from the client) ── */
router.post('/analytics', requireAuth, async (req, res) => {
  try {
    const { event, data } = req.body || {};
    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'event is required.' });
    }
    await query(
      `INSERT INTO analytics_events (user_id, event, data) VALUES ($1, $2, $3)`,
      [req.user.id, event.slice(0, 60), JSON.stringify(data && typeof data === 'object' ? data : {})]
    );
    res.status(204).end();
  } catch (err) {
    /* Analytics must never break the app — swallow and 204 */
    res.status(204).end();
  }
});

/* ── Team-wide analytics summary (admin only) ── */
router.get('/analytics/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [byEvent, byUser, recent, totals] = await Promise.all([
      query(`SELECT event, COUNT(*)::int AS count FROM analytics_events GROUP BY event ORDER BY count DESC LIMIT 25`),
      query(`SELECT u.username, COUNT(*)::int AS count
             FROM analytics_events a LEFT JOIN users u ON u.id = a.user_id
             GROUP BY u.username ORDER BY count DESC LIMIT 25`),
      query(`SELECT event, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 50`),
      query(`SELECT COUNT(*)::int AS total,
                    COUNT(DISTINCT user_id)::int AS active_users,
                    MIN(created_at) AS since
             FROM analytics_events`)
    ]);
    res.json({
      totals: totals.rows[0],
      byEvent: byEvent.rows,
      byUser: byUser.rows,
      recent: recent.rows
    });
  } catch (err) {
    console.error('analytics summary error:', err.message);
    res.status(500).json({ error: 'Failed to load analytics.' });
  }
});

/* ── Custom benchmarks: load (all users) ── */
router.get('/benchmarks', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT industry, metric, value FROM custom_benchmarks`);
    /* Shape into { industry: { metric: value } } for easy client merge */
    const out = {};
    rows.forEach(r => {
      out[r.industry] = out[r.industry] || {};
      out[r.industry][r.metric] = Number(r.value);
    });
    res.json(out);
  } catch (err) {
    console.error('load benchmarks error:', err.message);
    res.status(500).json({ error: 'Failed to load benchmarks.' });
  }
});

/* ── Custom benchmarks: save (admin only) ── */
router.put('/benchmarks', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { benchmarks } = req.body || {};
    if (!benchmarks || typeof benchmarks !== 'object') {
      return res.status(400).json({ error: 'benchmarks object required.' });
    }
    for (const industry of Object.keys(benchmarks)) {
      const metrics = benchmarks[industry] || {};
      for (const metric of Object.keys(metrics)) {
        const value = Number(metrics[metric]);
        if (isNaN(value)) continue;
        await query(
          `INSERT INTO custom_benchmarks (industry, metric, value, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (industry, metric)
           DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
          [industry.slice(0, 30), metric.slice(0, 40), value, req.user.id]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('save benchmarks error:', err.message);
    res.status(500).json({ error: 'Failed to save benchmarks.' });
  }
});

module.exports = router;
