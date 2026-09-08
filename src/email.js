/* ═══════════════════════════════════════════════════════════════════
   src/email.js  —  SendGrid email helper

   All application emails are defined here.
   Email failures are ALWAYS caught and logged — they must never
   block or error a user-facing operation.

   Required env vars:
     SENDGRID_API_KEY  — from SendGrid dashboard
     FROM_EMAIL        — a SendGrid-verified sender address
     APP_URL           — e.g. https://your-service.onrender.com
   ═══════════════════════════════════════════════════════════════════ */

const sgMail = require('@sendgrid/mail');

const FROM_EMAIL = String(process.env.FROM_EMAIL || '').trim();
const SENDGRID_API_KEY = String(process.env.SENDGRID_API_KEY || '').trim();
const { getAppUrl } = require('./config');
const brand = require('./shared/brand-system');
const emailBrand = brand.emailTheme();
const APP_URL    = getAppUrl();

/* Configure SendGrid — silently skip if key not set (dev mode) */
if (SENDGRID_API_KEY && FROM_EMAIL) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('[email] provider not configured; SENDGRID_API_KEY and a verified FROM_EMAIL are both required.');
}

function providerState() {
  return { provider: 'sendgrid', configured: Boolean(SENDGRID_API_KEY && FROM_EMAIL), state: SENDGRID_API_KEY && FROM_EMAIL ? 'configured' : 'not_configured' };
}

/* ── Internal send helper ──────────────────────────────────────────
   Always resolves, never rejects. Logs failures to console.
   ────────────────────────────────────────────────────────────────── */
async function send({ to, subject, html, text, type='application' }) {
  const timestamp=new Date().toISOString();
  if (!providerState().configured) {
    console.warn(`[email] timestamp=${timestamp} provider=sendgrid state=not_configured type=${type}`);
    return { ok: false, configured: false, state: 'not_configured' };
  }

  try {
    const response=await sgMail.send({ from: FROM_EMAIL, to, subject, html, text });
    const providerMessageId=response?.[0]?.headers?.['x-message-id'] || null;
    console.info(`[email] timestamp=${timestamp} provider=sendgrid state=sent type=${type} providerMessageId=${providerMessageId||'unavailable'}`);
    return { ok: true, configured: true, state: 'sent', providerMessageId };
  } catch (err) {
    /* Log the full error for debugging, but never throw */
    console.error(`[email] timestamp=${timestamp} provider=sendgrid state=failed type=${type} category=${err.code||'provider_error'}`);
    return { ok: false, configured: true, state: 'failed', category: err.code || 'provider_error' };
  }
}

/* ── Shared styles for all HTML emails ── */
const baseStyle = `
  <style>
    body { font-family: ${emailBrand.font}; background: ${emailBrand.background}; margin: 0; padding: 0; }
    .wrap { max-width: 540px; margin: 40px auto; background: ${emailBrand.surface}; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .header { background: ${emailBrand.header}; padding: 28px 32px; text-align: center; }
    .header img { height: 36px; }
    .header-sub { color: rgba(255,255,255,.45); font-size: 12px; margin-top: 6px; }
    .accent { height: 4px; background: ${emailBrand.accent}; }
    .body { padding: 32px; color: ${emailBrand.body}; font-size: 15px; line-height: 1.65; }
    .body h2 { color: ${emailBrand.header}; font-size: 20px; margin: 0 0 12px; }
    .btn { display: inline-block; background: ${emailBrand.button}; color: ${emailBrand.surface} !important; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; }
    .btn:hover { background: ${emailBrand.buttonHover}; }
    .mono { font-family: 'Courier New', monospace; background: ${emailBrand.background}; border: 1px solid ${emailBrand.border}; border-radius: 6px; padding: 10px 14px; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: ${emailBrand.header}; display: inline-block; margin: 14px 0; }
    .note { font-size: 13px; color: ${emailBrand.muted}; margin-top: 20px; padding-top: 16px; border-top: 1px solid ${emailBrand.border}; }
    .footer { background: ${emailBrand.background}; padding: 18px 32px; text-align: center; font-size: 12px; color: ${emailBrand.muted}; border-top: 1px solid ${emailBrand.border}; }
  </style>
`;

function logo() {
  /* Inline logo as text fallback — avoids image hosting dependency */
  return `<div style="color:${emailBrand.surface};font-size:18px;font-weight:800;letter-spacing:.02em;">Cloud Inventory</div>`;
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
        <p class="note">If the button doesn't work, copy and paste this URL into your browser:<br/><span style="word-break:break-all;font-size:12px;color:${emailBrand.muted};">${resetUrl}</span></p>
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
    type:    'password_reset',
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
            <td style="padding:8px 12px;background:${emailBrand.background};border:1px solid ${emailBrand.border};font-size:13px;font-weight:600;color:${emailBrand.body};width:130px;">Username</td>
            <td style="padding:8px 12px;border:1px solid ${emailBrand.border};font-size:13px;font-family:monospace;color:${emailBrand.header};">${escapeHtml(username)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:${emailBrand.background};border:1px solid ${emailBrand.border};font-size:13px;font-weight:600;color:${emailBrand.body};">Temp. password</td>
            <td style="padding:8px 12px;border:1px solid ${emailBrand.border};">
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
    type:    'welcome_temp_password',
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
      <td style="padding:6px 10px;border:1px solid ${emailBrand.border};font-size:12px;">${escapeHtml(row.action)}</td>
      <td style="padding:6px 10px;border:1px solid ${emailBrand.border};font-size:12px;text-align:right;">${row.count.toLocaleString()}</td>
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
            <td style="padding:7px 10px;background:${emailBrand.background};border:1px solid ${emailBrand.border};font-size:13px;font-weight:600;color:${emailBrand.body};">Records to delete</td>
            <td style="padding:7px 10px;border:1px solid ${emailBrand.border};font-size:13px;font-weight:700;color:${emailBrand.danger};">${recordCount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:7px 10px;background:${emailBrand.background};border:1px solid ${emailBrand.border};font-size:13px;font-weight:600;color:${emailBrand.body};">Date range</td>
            <td style="padding:7px 10px;border:1px solid ${emailBrand.border};font-size:13px;">${oldestDate} → ${cutoffDate}</td>
          </tr>
        </table>
        <p><strong>Breakdown by action type:</strong></p>
        <table style="margin:8px 0 20px;border-collapse:collapse;width:100%;">
          <thead><tr>
            <th style="padding:7px 10px;background:${emailBrand.header};color:${emailBrand.surface};font-size:12px;text-align:left;">Action</th>
            <th style="padding:7px 10px;background:${emailBrand.header};color:${emailBrand.surface};font-size:12px;text-align:right;">Count</th>
          </tr></thead>
          <tbody>${breakdownHtml}</tbody>
        </table>
        <p>To proceed with the deletion, click <strong>Confirm purge</strong> below. To keep all records, click <strong>Cancel</strong>. If neither link is clicked within <strong>48 hours</strong>, the purge will <strong>not</strong> proceed automatically.</p>
        <div style="display:flex;gap:12px;margin:20px 0;">
          <a href="${confirmUrl}" style="display:inline-block;background:${emailBrand.danger};color:${emailBrand.surface}!important;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Confirm purge (delete ${recordCount.toLocaleString()} records)</a>
          <a href="${cancelUrl}" style="display:inline-block;background:${emailBrand.body};color:${emailBrand.surface}!important;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Cancel — keep all records</a>
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
    type:    'audit_purge_confirmation',
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

/* ══════════════════════════════════════════════════════════════════
   4. Discovery submission notification
   Sent to the rep when a prospect clicks "Confirm and send".
   ══════════════════════════════════════════════════════════════════ */
async function sendDiscoverySubmitted(toEmail, repName, company, answerCount, discUrl) {
  const html = `<!DOCTYPE html><html><head>${baseStyle}</head><body>
    <div class="wrap">
      <div class="header">${logo()}<div class="header-sub">ROI Business Case Builder</div></div>
      <div class="accent"></div>
      <div class="body">
        <h2>Your prospect has submitted their answers</h2>
        <p>Hi <strong>${escapeHtml(repName)}</strong>,</p>
        <p><strong>${escapeHtml(company)}</strong> has just completed and submitted their discovery questionnaire — <strong>${answerCount} answer${answerCount !== 1 ? 's' : ''}</strong> recorded.</p>
        <p>Their responses are ready in the app. Click below to review the answers and apply them to the calculator.</p>
        <div style="text-align:center;">
          <a class="btn" href="${discUrl}">Review answers in the app</a>
        </div>
        <p class="note">This notification was sent because you generated the discovery link for ${escapeHtml(company)}. The answers are applied to the calculator from the Discovery tab.</p>
      </div>
      <div class="footer">Cloud Inventory &middot; Nextworld Company &middot; Internal tool</div>
    </div>
  </body></html>`;

  const text = `Hi ${repName},

${company} has submitted their discovery questionnaire — ${answerCount} answer${answerCount !== 1 ? 's' : ''} recorded.

Review their answers and apply them to the calculator:
${discUrl}

— Cloud Inventory`;

  return send({
    type:    'prospect_submission',
    to:      toEmail,
    subject: `${company} submitted their discovery answers (${answerCount} responses)`,
    html,
    text
  });
}

async function sendProspectAssumptionChange(toEmail, repName, company, adjustments, aiInsight) {
  const rows = Object.entries(adjustments).map(([k, v]) =>
    `<tr><td style="padding:6px 10px;font-size:13px;border-bottom:1px solid ${emailBrand.border};">${k}</td>
     <td style="padding:6px 10px;font-size:13px;font-weight:600;border-bottom:1px solid ${emailBrand.border};">${v}</td></tr>`
  ).join('');
  const insightHtml = aiInsight
    ? `<div style="background:${emailBrand.infoSurface};border:1.5px solid ${emailBrand.accent};border-radius:8px;padding:12px 16px;margin:16px 0;">
        <div style="font-size:11px;font-weight:700;color:${emailBrand.buttonHover};text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">What this signals</div>
        <div style="font-size:13.5px;color:${emailBrand.header};line-height:1.5;">${aiInsight}</div>
      </div>`
    : '';
  const insightText = aiInsight ? `\n\nWHAT THIS SIGNALS: ${aiInsight}\n` : '';
  return send({
    type: 'prospect_assumption_change',
    to: toEmail,
    subject: `[CI ROI] ${company} adjusted assumptions on their shared business case`,
    text: `${repName},\n\n${company} just adjusted assumptions on the shared business case link.\n\nAdjusted fields:\n${Object.entries(adjustments).map(([k,v]) => `  ${k}: ${v}`).join('\n')}${insightText}\nReview before your next call.\n\nCloud Inventory ROI Builder`,
    html: `<div style="font-family:${emailBrand.font};max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:${emailBrand.header};">📊 ${company} adjusted business case assumptions</h2>
      <p style="color:${emailBrand.body};font-size:14px;">${repName}, the prospect just stress-tested the shared business case and changed the following assumptions. This tells you exactly which numbers they're pushing back on before your next call.</p>
      ${insightHtml}
      <table style="width:100%;border-collapse:collapse;border:1px solid ${emailBrand.border};border-radius:8px;overflow:hidden;margin:16px 0;">
        <thead><tr><th style="background:${emailBrand.header};color:${emailBrand.surface};padding:8px 10px;text-align:left;font-size:12px;">Assumption changed</th><th style="background:${emailBrand.header};color:${emailBrand.surface};padding:8px 10px;text-align:left;font-size:12px;">Value they used</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:${emailBrand.muted};font-size:12px;margin-top:16px;">Review these before your next conversation. If they reduced a recovery assumption significantly, that's the objection to address.</p>
    </div>`
  });
}

module.exports = {
  providerState,
  sendPasswordReset,
  sendWelcomeWithTempPassword,
  sendPurgeConfirmation,
  sendDiscoverySubmitted,
  sendProspectAssumptionChange
};
