/* ═══════════════════════════════════════════════════════════════════
   src/email.js  —  SendGrid email helper

   All application emails are defined here.
   Email failures are ALWAYS caught and logged — they must never
   block or error a user-facing operation.

   Required env vars:
     SENDGRID_API_KEY  — from SendGrid dashboard
     FROM_EMAIL        — verified sender address (e.g. noreply@cloudinventory.com)
     APP_URL           — e.g. https://your-service.onrender.com
   ═══════════════════════════════════════════════════════════════════ */

const sgMail = require('@sendgrid/mail');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cloudinventory.com';
const { getAppUrl } = require('./config');
const APP_URL    = getAppUrl();

/* Configure SendGrid — silently skip if key not set (dev mode) */
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️  SENDGRID_API_KEY not set — emails will be logged to console only.');
}

/* ── Internal send helper ──────────────────────────────────────────
   Always resolves, never rejects. Logs failures to console.
   ────────────────────────────────────────────────────────────────── */
async function send({ to, subject, html, text }) {
  if (!process.env.SENDGRID_API_KEY) {
    /* Dev mode: log email to console instead of sending */
    console.log('\n📧 [EMAIL — dev mode, not sent]');
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:\n${text || html}`);
    console.log('────────────────────────────────────\n');
    return { ok: true, dev: true };
  }

  try {
    await sgMail.send({ from: FROM_EMAIL, to, subject, html, text });
    return { ok: true };
  } catch (err) {
    /* Log the full error for debugging, but never throw */
    const detail = err.response?.body?.errors || err.message;
    console.error(`[email] Failed to send "${subject}" to ${to}:`, detail);
    return { ok: false, error: err.message };
  }
}

/* ── Shared styles for all HTML emails ── */
const baseStyle = `
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #F0F4F8; margin: 0; padding: 0; }
    .wrap { max-width: 540px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .header { background: #042C53; padding: 28px 32px; text-align: center; }
    .header img { height: 36px; }
    .header-sub { color: rgba(255,255,255,.45); font-size: 12px; margin-top: 6px; }
    .accent { height: 4px; background: linear-gradient(90deg, #00AEEF, rgba(0,174,239,.2)); }
    .body { padding: 32px; color: #334155; font-size: 15px; line-height: 1.65; }
    .body h2 { color: #042C53; font-size: 20px; margin: 0 0 12px; }
    .btn { display: inline-block; background: #042C53; color: #fff !important; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; }
    .btn:hover { background: #0A3D6B; }
    .mono { font-family: 'Courier New', monospace; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #042C53; display: inline-block; margin: 14px 0; }
    .note { font-size: 13px; color: #94A3B8; margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0; }
    .footer { background: #F8FAFC; padding: 18px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
`;

function logo() {
  /* Inline logo as text fallback — avoids image hosting dependency */
  return `<div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:.02em;">Cloud Inventory</div>`;
}

/* ══════════════════════════════════════════════════════════════════
   1. Password reset email
   ══════════════════════════════════════════════════════════════════ */
async function sendPasswordReset(toEmail, username, resetToken) {
  const resetUrl = `${APP_URL}/reset-password.html?token=${encodeURIComponent(resetToken)}`;

  const html = `<!DOCTYPE html><html><head>${baseStyle}</head><body>
    <div class="wrap">
      <div class="header">${logo()}<div class="header-sub">ROI Business Case Builder</div></div>
      <div class="accent"></div>
      <div class="body">
        <h2>Reset your password</h2>
        <p>Hi <strong>${escapeHtml(username)}</strong>,</p>
        <p>We received a request to reset your password for the Cloud Inventory ROI Business Case Builder. Click the button below to set a new password:</p>
        <div style="text-align:center;">
          <a class="btn" href="${resetUrl}">Reset my password</a>
        </div>
        <p>This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password hasn't changed.</p>
        <p class="note">If the button doesn't work, copy and paste this URL into your browser:<br/><span style="word-break:break-all;font-size:12px;color:#64748B;">${resetUrl}</span></p>
      </div>
      <div class="footer">Cloud Inventory · Nextworld Company · Internal tool</div>
    </div>
  </body></html>`;

  const text = `Hi ${username},

Reset your Cloud Inventory password by visiting this link (expires in 1 hour):
${resetUrl}

If you didn't request this, ignore this email.

— Cloud Inventory`;

  return send({
    to:      toEmail,
    subject: 'Reset your Cloud Inventory password',
    html,
    text
  });
}

/* ══════════════════════════════════════════════════════════════════
   2. Welcome / new user email with temporary password
   ══════════════════════════════════════════════════════════════════ */
async function sendWelcomeWithTempPassword(toEmail, username, tempPassword, createdByUsername) {
  const loginUrl = `${APP_URL}/login.html`;

  const html = `<!DOCTYPE html><html><head>${baseStyle}</head><body>
    <div class="wrap">
      <div class="header">${logo()}<div class="header-sub">ROI Business Case Builder</div></div>
      <div class="accent"></div>
      <div class="body">
        <h2>Welcome to Cloud Inventory ROI Builder</h2>
        <p>Hi <strong>${escapeHtml(username)}</strong>,</p>
        <p>Your account has been created${createdByUsername ? ` by <strong>${escapeHtml(createdByUsername)}</strong>` : ''}. Use the credentials below to sign in — you'll be prompted to set a new password immediately after your first login.</p>
        <table style="margin:20px 0;border-collapse:collapse;width:100%;">
          <tr>
            <td style="padding:8px 12px;background:#F1F5F9;border:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#475569;width:130px;">Username</td>
            <td style="padding:8px 12px;border:1px solid #E2E8F0;font-size:13px;font-family:monospace;color:#042C53;">${escapeHtml(username)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:#F1F5F9;border:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#475569;">Temp. password</td>
            <td style="padding:8px 12px;border:1px solid #E2E8F0;">
              <span class="mono">${escapeHtml(tempPassword)}</span>
            </td>
          </tr>
        </table>
        <div style="text-align:center;">
          <a class="btn" href="${loginUrl}">Sign in now</a>
        </div>
        <p>For security, your temporary password expires on first use. You will be required to set a new password (at least 12 characters with upper, lower, number, and special character).</p>
        <p class="note">Keep this email safe. If you have trouble logging in, contact your administrator.</p>
      </div>
      <div class="footer">Cloud Inventory · Nextworld Company · Internal tool</div>
    </div>
  </body></html>`;

  const text = `Hi ${username},

Your Cloud Inventory ROI Builder account has been created.

Username:          ${username}
Temporary password: ${tempPassword}

Sign in at: ${loginUrl}

You will be required to set a new password on first login.

— Cloud Inventory`;

  return send({
    to:      toEmail,
    subject: 'Your Cloud Inventory account is ready',
    html,
    text
  });
}

/* ══════════════════════════════════════════════════════════════════
   3. Audit log purge confirmation email
   Sent to all Admin users before any records are deleted.
   ══════════════════════════════════════════════════════════════════ */
async function sendPurgeConfirmation(toEmail, adminUsername, summary) {
  const { recordCount, oldestDate, cutoffDate, confirmUrl, cancelUrl, breakdown } = summary;

  const breakdownHtml = breakdown.map(row =>
    `<tr>
      <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${escapeHtml(row.action)}</td>
      <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;text-align:right;">${row.count.toLocaleString()}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html><head>${baseStyle}</head><body>
    <div class="wrap">
      <div class="header">${logo()}<div class="header-sub">ROI Business Case Builder — Admin</div></div>
      <div class="accent"></div>
      <div class="body">
        <h2>⚠️ Audit log purge pending — action required</h2>
        <p>Hi <strong>${escapeHtml(adminUsername)}</strong>,</p>
        <p>The scheduled audit log retention check has found <strong>${recordCount.toLocaleString()} records</strong> that are older than 2 years and are eligible for deletion.</p>
        <table style="margin:16px 0;border-collapse:collapse;width:100%;">
          <tr>
            <td style="padding:7px 10px;background:#F1F5F9;border:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#475569;">Records to delete</td>
            <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#C62828;">${recordCount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:7px 10px;background:#F1F5F9;border:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#475569;">Date range</td>
            <td style="padding:7px 10px;border:1px solid #E2E8F0;font-size:13px;">${oldestDate} → ${cutoffDate}</td>
          </tr>
        </table>
        <p><strong>Breakdown by action type:</strong></p>
        <table style="margin:8px 0 20px;border-collapse:collapse;width:100%;">
          <thead><tr>
            <th style="padding:7px 10px;background:#042C53;color:#fff;font-size:12px;text-align:left;">Action</th>
            <th style="padding:7px 10px;background:#042C53;color:#fff;font-size:12px;text-align:right;">Count</th>
          </tr></thead>
          <tbody>${breakdownHtml}</tbody>
        </table>
        <p>To proceed with the deletion, click <strong>Confirm purge</strong> below. To keep all records, click <strong>Cancel</strong>. If neither link is clicked within <strong>48 hours</strong>, the purge will <strong>not</strong> proceed automatically.</p>
        <div style="display:flex;gap:12px;margin:20px 0;">
          <a href="${confirmUrl}" style="display:inline-block;background:#C62828;color:#fff!important;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Confirm purge (delete ${recordCount.toLocaleString()} records)</a>
          <a href="${cancelUrl}" style="display:inline-block;background:#475569;color:#fff!important;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Cancel — keep all records</a>
        </div>
        <p class="note">This email was sent to all Admin users. Only one confirmation is needed. All Admins will receive a confirmation once the purge is completed or cancelled.</p>
      </div>
      <div class="footer">Cloud Inventory · Nextworld Company · Internal tool</div>
    </div>
  </body></html>`;

  const text = `Audit log purge pending — action required

Hi ${adminUsername},

${recordCount.toLocaleString()} audit log records older than 2 years are eligible for deletion.
Date range: ${oldestDate} to ${cutoffDate}

To confirm deletion:
${confirmUrl}

To cancel (keep all records):
${cancelUrl}

If no action is taken within 48 hours, the purge will NOT proceed.

— Cloud Inventory`;

  return send({
    to:      toEmail,
    subject: `Action required: Audit log purge pending — ${recordCount.toLocaleString()} records`,
    html,
    text
  });
}

/* ── HTML escape helper ── */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  sendPasswordReset,
  sendWelcomeWithTempPassword,
  sendPurgeConfirmation
};
