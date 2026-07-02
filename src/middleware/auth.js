/* ═══════════════════════════════════════════════════════════════════
   src/middleware/auth.js  —  Authentication middleware

   requireAuth   — validates JWT, checks session exists in DB, attaches req.user
   requireRole() — factory that additionally checks role
   ═══════════════════════════════════════════════════════════════════ */

const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Extract raw token from Authorization header or httpOnly cookie.
 * Authorization header takes priority (used by fetch() calls).
 * Cookie fallback used when browser sends it automatically.
 */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();

  /* Cookie fallback — for browsers that send the httpOnly cookie */
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(c => c.trim()).find(c => c.startsWith('ci_auth='));
  if (match) return decodeURIComponent(match.slice('ci_auth='.length).trim());

  return null;
}

/**
 * requireAuth middleware.
 * 1. Extracts JWT from Authorization header
 * 2. Verifies signature and expiry
 * 3. Confirms the session still exists in the DB (handles logouts)
 * 4. Attaches req.user = { id, username, email, role, firstLogin }
 */
async function requireAuth(req, res, next) {
  const raw = extractToken(req);
  if (!raw) {
    return res.status(401).json({ error: 'Authentication required.', code: 'NO_TOKEN' });
  }

  let payload;
  try {
    payload = jwt.verify(raw, JWT_SECRET);
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({ error: 'Invalid or expired session.', code });
  }

  try {
    /* Hash the raw token to look up the session row.
       We store the hash, never the raw token, in the DB. */
    const tokenHash = require('crypto')
      .createHash('sha256')
      .update(raw)
      .digest('hex');

    const { rows } = await query(
      `SELECT s.id AS session_id, s.expires_at,
              u.id, u.username, u.email, u.role,
              u.first_login, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [tokenHash]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Session not found — please log in again.', code: 'SESSION_NOT_FOUND' });
    }

    const row = rows[0];

    if (new Date(row.expires_at) < new Date()) {
      /* Clean up expired session */
      await query('DELETE FROM sessions WHERE id = $1', [row.session_id]).catch(() => {});
      return res.status(401).json({ error: 'Session expired — please log in again.', code: 'SESSION_EXPIRED' });
    }

    if (!row.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated. Contact your administrator.', code: 'ACCOUNT_INACTIVE' });
    }

    req.user = {
      id:         row.id,
      username:   row.username,
      email:      row.email,
      role:       row.role,
      firstLogin: row.first_login,
      sessionId:  row.session_id
    };

    next();
  } catch (err) {
    console.error('requireAuth DB error:', err.message);
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

/**
 * requireRole(role) — middleware factory.
 * Must be used AFTER requireAuth.
 *
 * Usage:
 *   router.get('/users', requireAuth, requireRole('admin'), handler);
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({
        error: `Access denied. Requires role: ${role}.`,
        code: 'INSUFFICIENT_ROLE'
      });
    }
    next();
  };
}

/**
 * Generate a signed JWT for a user.
 * Returns { token, expiresAt }
 */
function signToken(user) {
  const expiresIn = 8 * 60 * 60; // 8 hours in seconds
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const token = jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn }
  );
  return { token, expiresAt };
}

/**
 * Store a session in the DB after successful login.
 * Stores SHA-256 hash of raw token — never the token itself.
 */
async function createSession(userId, rawToken, expiresAt, req) {
  const tokenHash = require('crypto')
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      tokenHash,
      expiresAt,
      req.ip || null,
      req.headers['user-agent']?.substring(0, 500) || null
    ]
  );
}

/**
 * Delete a session by its token hash (logout).
 */
async function deleteSession(rawToken) {
  const tokenHash = require('crypto')
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

module.exports = { requireAuth, requireRole, signToken, createSession, deleteSession, extractToken };
