/* ═══════════════════════════════════════════════════════════════════
   src/routes/scenarios.js  —  Scenario persistence API

   GET    /api/scenarios               — list user's scenarios (current versions)
   POST   /api/scenarios               — save (new or new version)
   GET    /api/scenarios/:id           — single scenario
   GET    /api/scenarios/:id/versions  — all versions for a base_id
   PATCH  /api/scenarios/:id/share     — share with other users
   DELETE /api/scenarios/:id           — soft-delete one version
   DELETE /api/scenarios/group/:baseId — soft-delete all versions of a group

   Admin: GET /api/scenarios?all=true returns all users' scenarios.
   ═══════════════════════════════════════════════════════════════════ */

const express   = require('express');
const { query, transaction } = require('../db');
const { log, ACTIONS } = require('../audit');
const { requireAuth } = require('../middleware/auth');
const { calcROI } = require('../shared/roi-engine');
const { ensureCustomer } = require('../customers');

const router = express.Router();
router.use(requireAuth);

/* ── Shared columns (never return full JSONB on list to keep payload small) ── */
const LIST_COLS = `
  s.id, s.base_id, s.version, s.is_current, s.name, s.company,
  s.owner_id, s.shared_with, s.industry, s.deal_stage, s.exec_audience, s.solution,
  s.version_note, s.created_at, s.updated_at,
  s.outcome, s.outcome_reason, s.realized_value, s.outcome_at,
  s.customer_id,
  (s.data->>'annualBenefit')::numeric AS annual_benefit,
  (s.data->>'roi')::numeric           AS roi,
  (s.data->>'npv3')::numeric          AS npv3,
  (s.data->>'npv5')::numeric          AS npv5,
  (s.data->>'payback')::numeric       AS payback,
  u.username AS owner_username
`;

/* ═══════════════════════════════════════
   GET /api/scenarios
   ═══════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const isAdmin  = req.user.role === 'admin';
    const showAll  = isAdmin && req.query.all === 'true';
    const baseId   = req.query.base_id;

    let sql, params;

    if (baseId) {
      /* All versions for one base_id */
      sql = `
        SELECT ${LIST_COLS}
        FROM scenarios s
        JOIN users u ON u.id = s.owner_id
        WHERE s.base_id = $1
          AND s.deleted_at IS NULL
          AND (s.owner_id = $2 OR $2 = ANY(s.shared_with) OR $3)
        ORDER BY s.version DESC`;
      params = [baseId, req.user.id, isAdmin];

    } else if (showAll) {
      /* Admin: all current scenarios across all users */
      sql = `
        SELECT ${LIST_COLS}
        FROM scenarios s
        JOIN users u ON u.id = s.owner_id
        WHERE s.is_current = TRUE AND s.deleted_at IS NULL
        ORDER BY s.updated_at DESC`;
      params = [];

    } else {
      /* Normal: user's own + shared — current versions only */
      sql = `
        SELECT ${LIST_COLS}
        FROM scenarios s
        JOIN users u ON u.id = s.owner_id
        WHERE s.is_current = TRUE
          AND s.deleted_at IS NULL
          AND (s.owner_id = $1 OR $1 = ANY(s.shared_with))
        ORDER BY s.updated_at DESC`;
      params = [req.user.id];
    }

    const { rows } = await query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error('List scenarios error:', err.message);
    res.status(500).json({ error: 'Failed to load scenarios.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/scenarios/:id
   ═══════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.username AS owner_username
       FROM scenarios s JOIN users u ON u.id = s.owner_id
       WHERE s.id = $1 AND s.deleted_at IS NULL
         AND (s.owner_id = $2 OR $2 = ANY(s.shared_with) OR $3)`,
      [req.params.id, req.user.id, req.user.role === 'admin']
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario not found.' });

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_LOADED,
      entityType: 'scenario', entityId: req.params.id,
      detail: { name: rows[0].name, company: rows[0].company }, ipAddress: req.ip
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('Get scenario error:', err.message);
    res.status(500).json({ error: 'Failed to load scenario.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/scenarios/:id/versions
   All versions of the same base_id
   ═══════════════════════════════════════ */
router.get('/:id/versions', async (req, res) => {
  try {
    /* First get the base_id */
    const { rows: base } = await query(
      'SELECT base_id, owner_id FROM scenarios WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!base.length) return res.status(404).json({ error: 'Scenario not found.' });

    const isOwnerOrAdmin = base[0].owner_id === req.user.id || req.user.role === 'admin';
    if (!isOwnerOrAdmin) return res.status(403).json({ error: 'Access denied.' });

    const { rows } = await query(
      `SELECT ${LIST_COLS}
       FROM scenarios s JOIN users u ON u.id = s.owner_id
       WHERE s.base_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.version DESC`,
      [base[0].base_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get versions error:', err.message);
    res.status(500).json({ error: 'Failed to load versions.' });
  }
});

/* ═══════════════════════════════════════
   POST /api/scenarios
   Save a scenario — creates a new version if base_id exists,
   otherwise creates a new scenario group.
   Body: { name, company, data, industry?, dealStage?, execAudience?,
           versionNote?, baseId? }
   ═══════════════════════════════════════ */
router.post('/', async (req, res) => {
  const { name, company, data, industry, dealStage, execAudience, solution, versionNote, baseId } = req.body || {};

  /* Server-side required field validation (mirrors client-side) */
  if (!name || !name.trim() || name.trim() === 'Unnamed scenario') {
    return res.status(400).json({ error: 'Scenario name is required.' });
  }
  if (!company || !company.trim() || company.trim() === 'Prospect') {
    return res.status(400).json({ error: 'Company name is required.' });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Scenario data is required.' });
  }

  try {
    const result = await transaction(async (client) => {
      let resolvedBaseId = baseId;
      let nextVersion    = 1;
      let adminOnBehalfOwner = null;   // set if an admin edits another user's scenario

      if (resolvedBaseId) {
        /* Versioning an existing scenario — verify ownership */
        const { rows: existing } = await client.query(
          `SELECT id, version, owner_id FROM scenarios
           WHERE base_id = $1 AND deleted_at IS NULL
           ORDER BY version DESC LIMIT 1`,
          [resolvedBaseId]
        );

        if (existing.length) {
          if (existing[0].owner_id !== req.user.id && req.user.role !== 'admin') {
            throw Object.assign(new Error('Access denied.'), { status: 403 });
          }
          nextVersion = (existing[0].version || 1) + 1;
          /* Admin editing another user's scenario: keep the original owner
             (don't let admin silently take over the deal) and flag it. */
          if (existing[0].owner_id !== req.user.id && req.user.role === 'admin') {
            adminOnBehalfOwner = existing[0].owner_id;
          }
        } else {
          /* baseId provided but no existing rows found — treat as new */
          resolvedBaseId = null;
        }
      }

      if (!resolvedBaseId) {
        /* New scenario — check if same name+company already exists for this user */
        const { rows: dupe } = await client.query(
          `SELECT base_id FROM scenarios
           WHERE owner_id = $1 AND LOWER(name) = LOWER($2) AND LOWER(company) = LOWER($3)
             AND is_current = TRUE AND deleted_at IS NULL
           LIMIT 1`,
          [req.user.id, name.trim(), company.trim()]
        );
        if (dupe.length) {
          /* Auto-version against existing group */
          resolvedBaseId = dupe[0].base_id;
          const { rows: maxVer } = await client.query(
            'SELECT MAX(version) AS mv FROM scenarios WHERE base_id = $1',
            [resolvedBaseId]
          );
          nextVersion = (maxVer[0].mv || 1) + 1;
        } else {
          /* Brand new scenario */
          const { v4: uuidv4 } = require('uuid');
          resolvedBaseId = uuidv4();
          nextVersion = 1;
        }
      }

      /* Mark all previous versions as not-current */
      await client.query(
        'UPDATE scenarios SET is_current = FALSE WHERE base_id = $1',
        [resolvedBaseId]
      );

      /* ── Server-authoritative ROI recompute ──
         Recompute metrics from the submitted inputs using the SAME shared
         engine the browser uses. The stored figures are the server's, never
         the client's. If the client's numbers differ (stale tab, client bug,
         tampering), we still store ours and log the discrepancy for visibility. */
      let metrics;
      let recomputeDiscrepancy = null;
      try {
        const r = calcROI(data);
        metrics = {
          annualBenefit: r.annualBenefit || 0,
          roi:           r.roi           || 0,
          npv3:          r.npv3          || 0,
          npv5:          r.npv5          || 0,
          payback:       r.paybackFromSigning != null ? r.paybackFromSigning : null
        };
        /* Detect drift vs. what the client sent (>$1 or >0.5% considered drift) */
        const clientBenefit = Number(data.annualBenefit) || 0;
        if (clientBenefit > 0 && Math.abs(clientBenefit - metrics.annualBenefit) > Math.max(1, clientBenefit * 0.005)) {
          recomputeDiscrepancy = {
            clientAnnualBenefit: Math.round(clientBenefit),
            serverAnnualBenefit: Math.round(metrics.annualBenefit)
          };
        }
      } catch (e) {
        /* If recompute fails for any reason, fall back to client values so a
           save is never lost — but flag it. */
        metrics = {
          annualBenefit: Number(data.annualBenefit) || 0,
          roi:           Number(data.roi)           || 0,
          npv3:          Number(data.npv3)          || 0,
          npv5:          Number(data.npv5)          || 0,
          payback:       data.paybackFromSigning || data.payback || null
        };
        recomputeDiscrepancy = { recomputeError: e.message };
      }

      /* Merge server metrics into data JSONB so they're always in sync */
      const dataWithMetrics = { ...data, ...metrics };

      /* Link to a first-class customer (create if new), atomic with the save. */
      const customerId = await ensureCustomer(req.user.id, company, client.query.bind(client));

      const { rows } = await client.query(
        `INSERT INTO scenarios
           (base_id, version, is_current, name, company, owner_id, customer_id,
            industry, deal_stage, exec_audience, solution, data, version_note)
         VALUES ($1, $2, TRUE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, base_id, version, name, company, is_current,
                   industry, deal_stage, exec_audience, solution, version_note,
                   created_at, updated_at`,
        [
          resolvedBaseId, nextVersion, name.trim(), company.trim(), (adminOnBehalfOwner || req.user.id), customerId,
          industry || null, dealStage || null, execAudience || 'mixed',
          solution || null, JSON.stringify(dataWithMetrics), versionNote || null
        ]
      );

      return { row: rows[0], recomputeDiscrepancy, adminOnBehalfOwner };
    });
    const savedRow = result.row;

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_SAVED,
      entityType: 'scenario', entityId: savedRow.id,
      detail: { name: savedRow.name, company: savedRow.company, version: savedRow.version },
      ipAddress: req.ip
    });

    /* Admin-on-behalf edit: record who edited whose scenario, for accountability. */
    if (result.adminOnBehalfOwner) {
      await log({
        userId: req.user.id, action: ACTIONS.ADMIN_EDIT_ON_BEHALF,
        entityType: 'scenario', entityId: savedRow.id,
        detail: { editedByAdmin: req.user.id, originalOwner: result.adminOnBehalfOwner, name: savedRow.name, company: savedRow.company },
        ipAddress: req.ip
      });
    }

    /* Visibility into client/server ROI drift (Fix 1, option b) */
    if (result.recomputeDiscrepancy) {
      await log({
        userId: req.user.id, action: ACTIONS.SCENARIO_SAVED,
        entityType: 'scenario', entityId: savedRow.id,
        detail: { roiRecomputeDiscrepancy: result.recomputeDiscrepancy },
        ipAddress: req.ip
      });
    }

    res.status(201).json(savedRow);

  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message });
    console.error('Save scenario error:', err.message);
    res.status(500).json({ error: 'Failed to save scenario.' });
  }
});

/* ═══════════════════════════════════════
   PATCH /api/scenarios/:id/share
   Body: { shareWith: [userId, ...] }
   ═══════════════════════════════════════ */
router.patch('/:id/share', async (req, res) => {
  const { shareWith } = req.body || {};
  if (!Array.isArray(shareWith)) {
    return res.status(400).json({ error: 'shareWith must be an array of user IDs.' });
  }

  try {
    /* Only owner or admin can share */
    const { rows: sc } = await query(
      'SELECT id, base_id, owner_id, name FROM scenarios WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!sc.length) return res.status(404).json({ error: 'Scenario not found.' });
    if (sc[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can share this scenario.' });
    }

    /* Validate all shareWith IDs exist */
    if (shareWith.length > 0) {
      const { rows: validUsers } = await query(
        'SELECT id FROM users WHERE id = ANY($1) AND is_active = TRUE',
        [shareWith]
      );
      if (validUsers.length !== shareWith.length) {
        return res.status(400).json({ error: 'One or more user IDs are invalid or inactive.' });
      }
    }

    /* Update shared_with on ALL versions of this base_id */
    await query(
      'UPDATE scenarios SET shared_with = $1 WHERE base_id = $2',
      [shareWith, sc[0].base_id]
    );

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_SHARED,
      entityType: 'scenario', entityId: req.params.id,
      detail: { name: sc[0].name, sharedWith: shareWith }, ipAddress: req.ip
    });

    res.json({ ok: true, sharedWith: shareWith });

  } catch (err) {
    console.error('Share scenario error:', err.message);
    res.status(500).json({ error: 'Failed to update sharing.' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/scenarios/:id
   Soft-delete a single version
   ═══════════════════════════════════════ */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, base_id, owner_id, version, is_current, name
       FROM scenarios WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario not found.' });

    const sc = rows[0];
    if (sc.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can delete this scenario.' });
    }

    await query(
      'UPDATE scenarios SET deleted_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    /* If this was the current version, promote the previous one */
    if (sc.is_current) {
      await query(
        `UPDATE scenarios SET is_current = TRUE
         WHERE base_id = $1 AND deleted_at IS NULL
           AND id != $2
         ORDER BY version DESC LIMIT 1`,
        [sc.base_id, req.params.id]
      );
    }

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_DELETED,
      entityType: 'scenario', entityId: req.params.id,
      detail: { name: sc.name, version: sc.version }, ipAddress: req.ip
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete scenario error:', err.message);
    res.status(500).json({ error: 'Failed to delete scenario.' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/scenarios/group/:baseId
   Soft-delete ALL versions of a scenario group
   ═══════════════════════════════════════ */
router.delete('/group/:baseId', async (req, res) => {
  try {
    /* Verify ownership of at least one version */
    const { rows } = await query(
      `SELECT owner_id, COUNT(*) AS cnt FROM scenarios
       WHERE base_id = $1 AND deleted_at IS NULL GROUP BY owner_id`,
      [req.params.baseId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario group not found.' });

    const ownerIds = rows.map(r => r.owner_id);
    if (!ownerIds.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can delete this scenario.' });
    }

    const { rowCount } = await query(
      'UPDATE scenarios SET deleted_at = NOW() WHERE base_id = $1 AND deleted_at IS NULL',
      [req.params.baseId]
    );

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_DELETED,
      entityType: 'scenario', entityId: null,
      detail: { baseId: req.params.baseId, versionsDeleted: rowCount }, ipAddress: req.ip
    });

    res.json({ ok: true, deletedVersions: rowCount });
  } catch (err) {
    console.error('Delete scenario group error:', err.message);
    res.status(500).json({ error: 'Failed to delete scenario group.' });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PUT /api/scenarios/group/:baseId/outcome — record win/loss outcome
   Outcome applies to the whole scenario group, so it's written to every
   version sharing the base_id. Phase 1 of outcome tracking (capture).
   ═══════════════════════════════════════════════════════════════════ */
router.put('/group/:baseId/outcome', async (req, res) => {
  try {
    const { outcome, reason, realizedValue } = req.body || {};
    const VALID = ['won', 'lost', 'no_decision', null, ''];
    if (!VALID.includes(outcome)) {
      return res.status(400).json({ error: "outcome must be 'won', 'lost', 'no_decision', or empty to clear." });
    }
    /* Verify the caller owns (or admins) at least one version of the group. */
    const { rows } = await query(
      `SELECT DISTINCT owner_id FROM scenarios WHERE base_id = $1 AND deleted_at IS NULL`,
      [req.params.baseId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario group not found.' });
    const ownerIds = rows.map(r => r.owner_id);
    if (!ownerIds.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can set the outcome for this scenario.' });
    }

    const cleared = !outcome;
    const realized = (realizedValue === undefined || realizedValue === null || realizedValue === '')
      ? null : Number(realizedValue);
    if (realized !== null && (isNaN(realized) || realized < 0)) {
      return res.status(400).json({ error: 'realizedValue must be a non-negative number.' });
    }

    const { rowCount } = await query(
      `UPDATE scenarios
         SET outcome        = $2,
             outcome_reason = $3,
             realized_value = $4,
             outcome_at     = CASE WHEN $2 IS NULL THEN NULL ELSE NOW() END,
             updated_at     = NOW()
       WHERE base_id = $1 AND deleted_at IS NULL`,
      [req.params.baseId, cleared ? null : outcome, reason || null, realized]
    );

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_OUTCOME_SET,
      entityType: 'scenario', entityId: null,
      detail: { baseId: req.params.baseId, outcome: cleared ? 'cleared' : outcome, realizedValue: realized },
      ipAddress: req.ip
    });

    res.json({ ok: true, updatedVersions: rowCount, outcome: cleared ? null : outcome });
  } catch (err) {
    console.error('Set scenario outcome error:', err.message);
    res.status(500).json({ error: 'Failed to record outcome.' });
  }
});

module.exports = router;
