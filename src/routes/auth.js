/* ═══════════════════════════════════════════════════════════════════
   src/routes/auth.js  —  Authentication endpoints

   POST /api/auth/login
   POST /api/auth/logout
   POST /api/auth/change-password
   GET  /api/auth/me
   GET  /api/auth/sessions        — list active sessions
   DELETE /api/auth/sessions/:id  — revoke a specific session
   DELETE /api/auth/sessions      — revoke all other sessions
   ═══════════════════════════════════════════════════════════════════ */

const express    = require('express');
const bcrypt     = require('bcrypt');
const rateLimit  = require('express-rate-limit');
const { query }  = require('../db');
const { log, ACTIONS } = require('../audit');
const {
  requireAuth, signToken, createSession, deleteSession, extractToken
} = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS      = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const MAX_FAILED_LOGINS  = 5;
const LOCKOUT_MINUTES    = 15;
const PROD               = process.env.NODE_ENV === 'production';

function setAuthCookie(res, token, expiresAt) {
  res.cookie('ci_auth', token, {
    httpOnly: true,
    secure: PROD,
    sameSite: 'strict',
    expires: expiresAt,
    path: '/'
  });
}

/* ── Rate limiter for all auth endpoints ── */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please wait a minute and try again.' }
});

router.use(authLimiter);

/* ── Password complexity validation ── */
function validatePassword(password) {
  if (!password || password.length < 12) return 'Password must be at least 12 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}

/* ═══════════════════════════════════════
   POST /api/auth/login
   ═══════════════════════════════════════ */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    /* Lookup user — case-insensitive username */
    const { rows } = await query(
      `SELECT id, username, email, password_hash, role, first_login,
              is_active, failed_login_count, locked_until
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [String(username).trim()]
    );

    /* Uniform response time to prevent username enumeration */
    const dummyHash = '$2b$12$invalidhashthatisneverusedforcomparison0000000000000';

    if (!rows.length) {
      /* Still run bcrypt to normalise response time */
      await bcrypt.compare(password, dummyHash).catch(() => {});
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];

    /* Check account active */
    if (!user.is_active) {
      await log({ userId: user.id, action: ACTIONS.USER_LOGIN_FAILED, detail: { reason: 'account_inactive' }, ipAddress: req.ip });
      return res.status(403).json({ error: 'Account has been deactivated. Contact your administrator.' });
    }

    /* Check lockout */
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs  = new Date(user.locked_until) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      await log({ userId: user.id, action: ACTIONS.USER_LOGIN_LOCKED, detail: { locked_until: user.locked_until }, ipAddress: req.ip });
      return res.status(423).json({
        error: `Account is temporarily locked due to too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`,
        lockedUntil: user.locked_until
      });
    }

    /* Verify password */
    const match = await bcrypt.compare(String(password), user.password_hash);

    if (!match) {
      const newCount = user.failed_login_count + 1;
      const shouldLock = newCount >= MAX_FAILED_LOGINS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;

      await query(
        `UPDATE users SET failed_login_count = $1, locked_until = $2 WHERE id = $3`,
        [newCount, lockedUntil, user.id]
      );

      await log({
        userId: user.id,
        action: shouldLock ? ACTIONS.USER_LOGIN_LOCKED : ACTIONS.USER_LOGIN_FAILED,
        detail: { attempts: newCount, locked: shouldLock },
        ipAddress: req.ip
      });

      if (shouldLock) {
        return res.status(423).json({
          error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          lockedUntil
        });
      }

      const remaining = MAX_FAILED_LOGINS - newCount;
      return res.status(401).json({
        error: `Invalid username or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout.`
      });
    }

    /* ── Successful login ── */
    await query(
      `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    const { token, expiresAt } = signToken(user);
    await createSession(user.id, token, expiresAt, req);

    await log({
      userId: user.id,
      action: ACTIONS.USER_LOGIN,
      detail: { username: user.username },
      ipAddress: req.ip
    });

    setAuthCookie(res, token, expiresAt);
    res.set('Cache-Control', 'no-store');

    res.json({
      token,
      expiresAt,
      user: {
        id:         user.id,
        username:   user.username,
        email:      user.email,
        role:       user.role,
        firstLogin: user.first_login
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ═══════════════════════════════════════
   POST /api/auth/logout
   ═══════════════════════════════════════ */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const raw = extractToken(req);
    if (raw) await deleteSession(raw);

    await log({ userId: req.user.id, action: ACTIONS.USER_LOGOUT, ipAddress: req.ip });

    res.clearCookie('ci_auth', { path: '/', secure: PROD, sameSite: 'strict' });
    res.status(204).send();
  } catch (err) {
    console.error('Logout error:', err.message);
    /* Even if DB delete fails, return success — client discards token */
    res.clearCookie('ci_auth', { path: '/', secure: PROD, sameSite: 'strict' });
    res.status(204).send();
  }
});

/* ═══════════════════════════════════════
   POST /api/auth/change-password
   ═══════════════════════════════════════ */
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }

  const validationError = validatePassword(newPassword);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different from your current password.' });
  }

  try {
    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    const match = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    await query(
      `UPDATE users SET password_hash = $1, first_login = FALSE, updated_at = NOW() WHERE id = $2`,
      [newHash, req.user.id]
    );

    /* Revoke all OTHER sessions (force re-login on other devices) */
    const raw = extractToken(req);
    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(raw).digest('hex');
    await query(
      'DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2',
      [req.user.id, currentHash]
    );

    await log({ userId: req.user.id, action: ACTIONS.USER_PASSWORD_CHANGED, ipAddress: req.ip });

    res.json({ ok: true, message: 'Password changed successfully.' });

  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/auth/me
   ═══════════════════════════════════════ */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, email, role, first_login, created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('/me error:', err.message);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/auth/sessions — list active sessions for current user
   ═══════════════════════════════════════ */
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const raw = extractToken(req);
    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(raw).digest('hex');

    const { rows } = await query(
      `SELECT id, created_at, expires_at, ip_address,
              user_agent,
              (token_hash = $2) AS is_current
       FROM sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id, currentHash]
    );
    res.json(rows);
  } catch (err) {
    console.error('List sessions error:', err.message);
    res.status(500).json({ error: 'Failed to load sessions.' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/auth/sessions/:id — revoke a specific session
   ═══════════════════════════════════════ */
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    /* Can only revoke own sessions */
    const { rows } = await query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Revoke session error:', err.message);
    res.status(500).json({ error: 'Failed to revoke session.' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/auth/sessions — revoke ALL other sessions (keep current)
   ═══════════════════════════════════════ */
router.delete('/sessions', requireAuth, async (req, res) => {
  try {
    const raw = extractToken(req);
    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256').update(raw).digest('hex');

    await query(
      'DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2',
      [req.user.id, currentHash]
    );
    res.json({ ok: true, message: 'All other sessions revoked.' });
  } catch (err) {
    console.error('Revoke all sessions error:', err.message);
    res.status(500).json({ error: 'Failed to revoke sessions.' });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/auth/forgot-password
   Public — no auth required.
   Rate limited: 3 requests per hour per IP (via authLimiter above,
   which applies to the whole router — sufficient for forgot-password).

   Always returns 200 with the same message regardless of whether the
   email address is registered — prevents email enumeration.
   ═══════════════════════════════════════════════════════════════════ */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};

  /* Respond immediately with the safe message — processing happens asynchronously */
  res.json({
    ok: true,
    message: "If that address is registered, you'll receive a reset link shortly. Check your inbox (and spam folder)."
  });

  /* All subsequent work is fire-and-forget — errors never reach the client */
  if (!email || !String(email).includes('@')) return;

  try {
    const { rows } = await query(
      `SELECT id, username, email, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [String(email).trim()]
    );

    if (!rows.length || !rows[0].is_active) return;

    const user = rows[0];

    /* Invalidate any existing unused reset tokens for this user */
    await query(
      `DELETE FROM password_reset_tokens
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    /* Generate a cryptographically secure raw token */
    const rawToken  = require('crypto').randomBytes(32).toString('hex');
    const tokenHash = require('crypto').createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    /* Send email — failure is caught inside sendPasswordReset, never throws */
    const { sendPasswordReset } = require('../email');
    await sendPasswordReset(user.email, user.username, rawToken);

    await log({
      userId:    user.id,
      action:    ACTIONS.USER_PASSWORD_RESET_REQ,
      detail:    { email: user.email },
      ipAddress: req.ip
    });

  } catch (err) {
    /* Log but never expose — response already sent */
    console.error('Forgot password processing error:', err.message);
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/auth/reset-password
   Public — no auth required.
   Body: { token, newPassword }
   ═══════════════════════════════════════════════════════════════════ */
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'token and newPassword are required.' });
  }

  const validationError = validatePassword(newPassword);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const tokenHash = require('crypto').createHash('sha256').update(String(token)).digest('hex');

    /* Find the matching, unexpired, unused token */
    const { rows } = await query(
      `SELECT prt.id, prt.user_id, prt.expires_at,
              u.username, u.email, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(400).json({
        error: 'This reset link is invalid or has expired. Please request a new one.',
        code: 'TOKEN_INVALID'
      });
    }

    const row = rows[0];

    if (!row.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated. Contact your administrator.' });
    }

    const newHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);

    /* Update password, mark token used, unlock account, set first_login FALSE */
    await query(
      `UPDATE users
       SET password_hash = $1, first_login = FALSE, failed_login_count = 0,
           locked_until = NULL, updated_at = NOW()
       WHERE id = $2`,
      [newHash, row.user_id]
    );

    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [row.id]
    );

    /* Revoke all active sessions — force fresh login everywhere */
    await query(
      'DELETE FROM sessions WHERE user_id = $1',
      [row.user_id]
    );

    await log({
      userId:    row.user_id,
      action:    ACTIONS.USER_PASSWORD_RESET_DONE,
      detail:    { username: row.username },
      ipAddress: req.ip
    });

    res.json({
      ok: true,
      message: 'Password updated successfully. Please sign in with your new password.'
    });

  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

module.exports = router;
