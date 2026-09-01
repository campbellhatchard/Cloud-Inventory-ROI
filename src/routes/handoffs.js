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
const { query, transaction } = require('../db');
const { log, ACTIONS } = require('../audit');
const { requireAuth } = require('../middleware/auth');
const { readiness } = require('../shared/handoff-readiness');
const { solutionFitAccess, hasPermission } = require('../authorization');

const router = express.Router();
router.use(requireAuth);

/* ── Access control ─────────────────────────────────────────────────
   Loads the customer and applies the handoff access policy per verb:
     • read  → admin, se (any customer), or the owning AE (rep)
     • write → admin or se only (AE is read+print, never writes)
   Returns { ok, customer } or { ok:false, code, error }. */
async function loadAccessibleCustomer(customerId, user, mode /* 'read' | 'write' */) {
  const access=await solutionFitAccess(user,customerId,mode==='write'?'edit':'view');
  if(!access.exists)return {ok:false,code:404,error:'Customer not found.'};
  if(!access.allowed)return {ok:false,code:403,error:'You do not have team, assignment, ownership, sharing, or global permission for this Solution Fit.'};
  const c=access.customer;return {ok:true,reasons:access.reasons,customer:{id:c.id,name:c.name,ownerId:c.owner_id}};
}

function changes(before,after,prefix='') { const out=[];const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]);for(const k of keys){const p=prefix?`${prefix}.${k}`:k,a=before?.[k],b=after?.[k];if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b))out.push(...changes(a,b,p));else if(JSON.stringify(a)!==JSON.stringify(b))out.push({path:p,before:a===undefined?null:a,after:b===undefined?null:b});}return out; }

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
      `SELECT h.id,h.customer_id,h.owner_id,h.data,h.readiness,h.status,h.created_by,h.primary_se_id,h.additional_se_ids,
              h.last_edited_by,u.username last_edited_by_name,h.created_at,h.updated_at
         FROM handoffs h LEFT JOIN users u ON u.id=h.last_edited_by WHERE h.customer_id = $1`, [req.params.customerId]
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
      createdBy:h.created_by,primarySeId:h.primary_se_id,additionalSeIds:h.additional_se_ids||[],
      lastEditedBy: h.last_edited_by,lastEditedByName:h.last_edited_by_name,accessReasons:access.reasons,createdAt: h.created_at, updatedAt: h.updated_at
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

    const prior=await query('SELECT id,data FROM handoffs WHERE customer_id=$1',[req.params.customerId]);
    const rows = await transaction(async client=>{
      const saved=await client.query(
      `INSERT INTO handoffs (customer_id, owner_id, data, readiness, status, last_edited_by,created_by)
       VALUES ($1, $2, $3, $4, $5, $6,$6)
       ON CONFLICT (customer_id) DO UPDATE
         SET data = EXCLUDED.data,
             readiness = EXCLUDED.readiness,
             status = EXCLUDED.status,
             last_edited_by = EXCLUDED.last_edited_by,
             updated_at = NOW()
       RETURNING id, customer_id, data, readiness, status, updated_at`,
      [req.params.customerId, access.customer.ownerId, JSON.stringify(data), score, status, req.user.id]
      );
      for(const c of changes(prior.rows[0]?.data||{},data).slice(0,250))await client.query(`INSERT INTO handoff_change_history(handoff_id,customer_id,changed_by,field_path,previous_value,new_value) VALUES($1,$2,$3,$4,$5,$6)`,[saved.rows[0].id,req.params.customerId,req.user.id,c.path,JSON.stringify(c.before),JSON.stringify(c.after)]);
      return saved.rows;
    });

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

router.get('/:customerId/history',async(req,res)=>{try{const access=await loadAccessibleCustomer(req.params.customerId,req.user,'read');if(!access.ok)return res.status(access.code).json({error:access.error});const {rows}=await query(`SELECT hh.id,hh.field_path,hh.previous_value,hh.new_value,hh.changed_at,u.username changed_by FROM handoff_change_history hh LEFT JOIN users u ON u.id=hh.changed_by WHERE hh.customer_id=$1 ORDER BY hh.changed_at DESC LIMIT 500`,[req.params.customerId]);res.json(rows);}catch(e){res.status(500).json({error:'Failed to load Solution Fit history.'});}});

router.put('/:customerId/assignment',async(req,res)=>{if(!hasPermission(req.user,'assign_solution_fit')&&!hasPermission(req.user,'edit_team_solution_fits'))return res.status(403).json({error:'Solution Fit assignment permission required.'});try{const access=await loadAccessibleCustomer(req.params.customerId,req.user,'write');if(!access.ok)return res.status(access.code).json({error:access.error});const b=req.body||{},additional=Array.isArray(b.additionalSeIds)?b.additionalSeIds:[];if(!hasPermission(req.user,'assign_solution_fit')&&(String(b.primarySeId||'')!==String(req.user.id)||additional.length))return res.status(403).json({error:'Sales Engineers may self-assign as Primary SE; only an Admin may assign other or additional SEs.'});const {rows}=await query(`UPDATE handoffs SET primary_se_id=$1,additional_se_ids=$2,updated_at=NOW(),last_edited_by=$3 WHERE customer_id=$4 RETURNING id,primary_se_id,additional_se_ids`,[b.primarySeId||null,additional,req.user.id,req.params.customerId]);if(!rows.length)return res.status(404).json({error:'Save the Solution Fit before assigning SEs.'});await log({userId:req.user.id,action:'handoff.assignment_changed',entityType:'handoff',entityId:rows[0].id,detail:b,ipAddress:req.ip});res.json(rows[0]);}catch(e){res.status(500).json({error:'Failed to assign Solution Fit.'});}});

module.exports = router;
