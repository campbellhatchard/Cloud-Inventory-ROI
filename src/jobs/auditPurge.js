/* ═══════════════════════════════════════════════════════════════════
   src/jobs/auditPurge.js  —  Audit log retention + purge job

   Schedule: 02:00 on the 1st of every month (server time).
   Logic:
   1. Count audit_log rows older than 2 years.
   2. If none → log and exit.
   3. If some → build a breakdown summary, email all Admin users a
      confirmation link. Do NOT delete anything yet.
   4. Admin clicks confirm link → GET /api/admin/purge/confirm?token=X
      → deletes rows → emails completion notice to all Admins.
   5. Admin clicks cancel → GET /api/admin/purge/cancel?token=X
      → marks token cancelled, logs it.
   6. If no action within 48 hours → nothing is deleted. Next check
      runs on the 1st of next month.
   ═══════════════════════════════════════════════════════════════════ */

const crypto = require('crypto');
const { query, transaction } = require('../db');
const { log, ACTIONS } = require('../audit');
const { sendPurgeConfirmation } = require('../email');

const TWO_YEARS_MS       = 2 * 365.25 * 24 * 60 * 60 * 1000;
const CONFIRM_EXPIRY_HRS = 48;
const APP_URL            = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');

/* ── Called once on startup to register the monthly cron job ── */
function startPurgeJob() {
  let cron;
  try { cron = require('node-cron'); } catch(e) {
    console.warn('[auditPurge] node-cron not installed — purge job disabled.');
    return;
  }

  /* '0 2 1 * *' = 02:00 on the 1st of every month */
  cron.schedule('0 2 1 * *', () => {
    runPurgeCheck().catch(err =>
      console.error('[auditPurge] Purge check failed:', err.message)
    );
  });

  console.log('[auditPurge] Monthly purge check scheduled (02:00 on 1st of month).');
}

/* ── Main purge check logic ── */
async function runPurgeCheck() {
  console.log('[auditPurge] Running monthly retention check...');

  const cutoff = new Date(Date.now() - TWO_YEARS_MS);

  /* 1. Count eligible rows */
  const { rows: countRows } = await query(
    'SELECT COUNT(*)::int AS count FROM audit_log WHERE created_at < $1',
    [cutoff.toISOString()]
  );
  const count = countRows[0]?.count || 0;

  if (count === 0) {
    console.log('[auditPurge] Nothing to purge — all records are within 2 years.');
    await log({ action: 'audit.purge_check', detail: { result: 'nothing_to_purge', cutoff } });
    return;
  }

  console.log(`[auditPurge] ${count} records eligible for purge (older than ${cutoff.toDateString()}).`);

  /* 2. Breakdown by action type */
  const { rows: breakdown } = await query(
    `SELECT action, COUNT(*)::int AS count
     FROM audit_log WHERE created_at < $1
     GROUP BY action ORDER BY count DESC`,
    [cutoff.toISOString()]
  );

  /* 3. Oldest record date */
  const { rows: oldestRows } = await query(
    'SELECT MIN(created_at) AS oldest FROM audit_log WHERE created_at < $1',
    [cutoff.toISOString()]
  );
  const oldestDate = oldestRows[0]?.oldest
    ? new Date(oldestRows[0].oldest).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'unknown';
  const cutoffDate = cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  /* 4. Generate confirm + cancel tokens */
  const rawConfirm = crypto.randomBytes(32).toString('hex');
  const rawCancel  = crypto.randomBytes(32).toString('hex');
  const hashConfirm = crypto.createHash('sha256').update(rawConfirm).digest('hex');
  const hashCancel  = crypto.createHash('sha256').update(rawCancel).digest('hex');
  const expiresAt   = new Date(Date.now() + CONFIRM_EXPIRY_HRS * 60 * 60 * 1000);

  await transaction(async (client) => {
    /* Invalidate any previous unused purge tokens */
    await client.query('UPDATE purge_tokens SET used_at = NOW() WHERE used_at IS NULL');

    /* Insert confirm token */
    await client.query(
      `INSERT INTO purge_tokens (token_hash, action, purge_count, expires_at)
       VALUES ($1, 'confirm', $2, $3)`,
      [hashConfirm, count, expiresAt.toISOString()]
    );

    /* Insert cancel token */
    await client.query(
      `INSERT INTO purge_tokens (token_hash, action, purge_count, expires_at)
       VALUES ($1, 'cancel', $2, $3)`,
      [hashCancel, count, expiresAt.toISOString()]
    );
  });

  const confirmUrl = `${APP_URL}/api/admin/purge/confirm?token=${rawConfirm}`;
  const cancelUrl  = `${APP_URL}/api/admin/purge/cancel?token=${rawCancel}`;

  /* 5. Email all active Admins */
  const { rows: admins } = await query(
    "SELECT id, email, username FROM users WHERE role = 'admin' AND is_active = TRUE"
  );

  for (const admin of admins) {
    await sendPurgeConfirmation(admin.email, admin.username, {
      recordCount: count,
      oldestDate,
      cutoffDate,
      confirmUrl,
      cancelUrl,
      breakdown
    });
  }

  await log({
    action:     ACTIONS.PURGE_PENDING,
    entityType: 'audit_log',
    detail:     { count, cutoff: cutoff.toISOString(), adminCount: admins.length, breakdown }
  });

  console.log(`[auditPurge] Purge confirmation emails sent to ${admins.length} admin(s).`);
}

/* ── Exported for testing / manual trigger ── */
module.exports = { startPurgeJob, runPurgeCheck };
