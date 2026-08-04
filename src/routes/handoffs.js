/* ═══════════════════════════════════════════════════════════════════
   src/routes/handoffs.js — SE Solution Fit & Handoff CRUD (phase 1b)
   One handoff per customer. Readiness is computed server-side from the
   saved state (authoritative), so the stored score can't be faked and
   list views stay consistent.

   Access (phase 1b): owner-scoped — the AE who owns the customer.
   Phase 2 will widen this: SE = cross-customer read/write; AE = read+print
   on their own customers. The scoping helper below has a single marked
   seam (canAccessCustomer) for that change.
   ═══════════════════════════════════════════════════════════════════ */

const express = require('express');
const { query } = require('../db');
const { log, ACTIONS } = require('../audit');
const { requireAuth } = require('../middleware/auth');
const { readiness } = require('../shared/handoff-readiness');
const { canRead, canWrite } = require('../handoff-access');

const router = express.Router();
router.use(requireAuth);

/* ── Access control ─────────────────────────────────────────────────
   Loads the customer and applies the handoff access policy per verb:
     • read  → admin, se (any customer), or the owning AE (rep)
     • write → admin or se only (AE is read+print, never writes)
   Returns { ok, customer } or { ok:false, code, error }. */
async function loadAccessibleCustomer(customerId, user, mode /* 'read' | 'write' */) {
  const { rows } = await query(
    `SELECT id, name, owner_id FROM customers WHERE id = $1`, [customerId]
  );
  if (!rows.length) return { ok: false, code: 404, error: 'Customer not found.' };
  const c = rows[0];
  const permitted = mode === 'write' ? canWrite(user, c.owner_id) : canRead(user, c.owner_id);
  if (!permitted) {
    /* Distinguish "AE trying to write" (403 with guidance) from generic denial. */
    const msg = (mode === 'write' && user.role === 'rep')
      ? 'Handoffs are completed by a Solution Engineer. You have read and print access.'
      : 'You do not have access to this customer.';
    return { ok: false, code: 403, error: msg };
  }
  return { ok: true, customer: { id: c.id, name: c.name, ownerId: c.owner_id } };
}

function scoreOf(data) {
  try { const r = readiness(data || {}); return { readiness: r.score, status: r.status }; }
  catch (e) { return { readiness: 0, status: 'not_ready' }; }
}

/* GET /api/handoffs/:customerId — fetch the handoff for a customer (creating
   an empty shell in the response if none exists yet; not persisted until saved). */
router.get('/:customerId', async (req, res) => {
  try {
    const access = await loadAccessibleCustomer(req.params.customerId, req.user, 'read');
    if (!access.ok) return res.status(access.code).json({ error: access.error });

    const { rows } = await query(
      `SELECT id, customer_id, owner_id, data, readiness, status,
              last_edited_by, created_at, updated_at
         FROM handoffs WHERE customer_id = $1`, [req.params.customerId]
    );
    if (!rows.length) {
      return res.json({
        exists: false, customerId: req.params.customerId,
        customerName: access.customer.name,
        data: {}, readiness: 0, status: 'not_ready'
      });
    }
    const h = rows[0];
    res.json({
      exists: true, id: h.id, customerId: h.customer_id, ownerId: h.owner_id,
      customerName: access.customer.name,
      data: h.data || {}, readiness: h.readiness, status: h.status,
      lastEditedBy: h.last_edited_by, createdAt: h.created_at, updatedAt: h.updated_at
    });
  } catch (err) {
    console.error('Get handoff error:', err.message);
    res.status(500).json({ error: 'Failed to load handoff.' });
  }
});

/* PUT /api/handoffs/:customerId — create or update the handoff (upsert).
   Readiness is recomputed server-side from the submitted data. */
router.put('/:customerId', async (req, res) => {
  try {
    const access = await loadAccessibleCustomer(req.params.customerId, req.user, 'write');
    if (!access.ok) return res.status(access.code).json({ error: access.error });

    const data = (req.body && typeof req.body.data === 'object' && req.body.data) ? req.body.data : {};
    const { readiness: score, status } = scoreOf(data);

    const { rows } = await query(
      `INSERT INTO handoffs (customer_id, owner_id, data, readiness, status, last_edited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (customer_id) DO UPDATE
         SET data = EXCLUDED.data,
             readiness = EXCLUDED.readiness,
             status = EXCLUDED.status,
             last_edited_by = EXCLUDED.last_edited_by,
             updated_at = NOW()
       RETURNING id, customer_id, data, readiness, status, updated_at`,
      [req.params.customerId, access.customer.ownerId, JSON.stringify(data), score, status, req.user.id]
    );

    await log({
      userId: req.user.id, action: ACTIONS.HANDOFF_SAVED,
      entityType: 'handoff', entityId: rows[0].id,
      detail: { customerId: req.params.customerId, readiness: score, status },
      ipAddress: req.ip
    });

    /* Admin/SE editing a customer they don't own — record for accountability. */
    if (access.customer.ownerId !== req.user.id) {
      await log({
        userId: req.user.id, action: ACTIONS.ADMIN_EDIT_ON_BEHALF,
        entityType: 'handoff', entityId: rows[0].id,
        detail: { editedBy: req.user.id, role: req.user.role, customerOwner: access.customer.ownerId, customerId: req.params.customerId },
        ipAddress: req.ip
      });
    }

    res.json({ ok: true, id: rows[0].id, readiness: rows[0].readiness, status: rows[0].status, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error('Save handoff error:', err.message);
    res.status(500).json({ error: 'Failed to save handoff.' });
  }
});

module.exports = router;
