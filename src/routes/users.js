/* ═══════════════════════════════════════════════════════════════════
   src/routes/users.js  —  User management API
   All routes require Admin role.

   GET    /api/users              — list all users
   POST   /api/users              — create user with temp password
   GET    /api/users/:id          — get single user
   PATCH  /api/users/:id          — update username / email / role
   POST   /api/users/:id/reset-password — admin-initiated temp password
   PATCH  /api/users/:id/status   — activate / deactivate
   ═══════════════════════════════════════════════════════════════════ */

const express   = require('express');
const bcrypt    = require('bcrypt');
const crypto    = require('crypto');
const { query } = require('../db');
const { log, ACTIONS } = require('../audit');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

/* All user-management routes require Admin role */
router.use(requireAuth);
router.use(requireRole('admin'));

/* ── Generate a secure temporary password ──
   16 chars, guaranteed to meet complexity rules so it always passes
   the change-password validation on first login.                    */
function generateTempPassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '!@#$%^&*-+=?';
  const all     = upper + lower + digits + special;

  /* Guarantee at least one of each required character class */
  const parts = [
    upper  [crypto.randomInt(upper.length)],
    lower  [crypto.randomInt(lower.length)],
    digits [crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)]
  ];

  /* Fill remaining 12 characters from full set */
  for (let i = 0; i < 12; i++) {
    parts.push(all[crypto.randomInt(all.length)]);
  }

  /* Shuffle so required chars aren't always in the same positions */
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join('');
}

/* ── Input validation helpers ── */
function validateUsername(username) {
  if (!username || !username.trim()) return 'Username is required.';
  if (username.trim().length < 3) return 'Username must be at least 3 characters.';
  if (username.trim().length > 50) return 'Username must be 50 characters or fewer.';
  if (!/^[a-zA-Z0-9_.\-]+$/.test(username.trim())) return 'Username may only contain letters, numbers, underscores, hyphens, and dots.';
  return null;
}

function validateEmail(email) {
  if (!email || !email.trim()) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

/* ═══════════════════════════════════════
   GET /api/users
   List all users — never returns password_hash
   ═══════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, email, role, is_active, first_login,
              created_at, last_login_at, failed_login_count,
              locked_until,
              (SELECT COUNT(*) FROM scenarios WHERE owner_id = users.id AND deleted_at IS NULL)::int AS scenario_count
       FROM users
       ORDER BY role ASC, username ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('List users error:', err.message);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

/* ═══════════════════════════════════════
   GET /api/users/:id
   ═══════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, email, role, is_active, first_login,
              created_at, updated_at, last_login_at,
              failed_login_count, locked_until
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Failed to load user.' });
  }
});

/* ═══════════════════════════════════════
   POST /api/users
   Create a new user with a generated temp password.
   Emails the temp password to the new user.
   Returns the temp password once (only time it is visible).
   ═══════════════════════════════════════ */
router.post('/', async (req, res) => {
  const { username, email, role } = req.body || {};

  /* Validate inputs */
  const usernameError = validateUsername(username);
  if (usernameError) return res.status(400).json({ error: usernameError });

  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  if (!role || !['admin', 'rep', 'se'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin", "rep" (AE), or "se" (Solution Engineer).' });
  }

  /* Guard: cannot create a second admin without explicit intent (soft guard — UX) */
  /* Hard guard: cannot create a user with your own username */
  if (username.trim().toLowerCase() === req.user.username.toLowerCase()) {
    return res.status(400).json({ error: 'Cannot create a user with your own username.' });
  }

  try {
    /* Check uniqueness */
    const { rows: existing } = await query(
      `SELECT id, username, email FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)`,
      [username.trim(), email.trim()]
    );

    if (existing.length) {
      const conflict = existing[0].username.toLowerCase() === username.trim().toLowerCase()
        ? 'Username already exists.'
        : 'Email address already registered.';
      return res.status(409).json({ error: conflict });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash, role, first_login, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, username, email, role, first_login, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, role, req.user.id]
    );

    const newUser = rows[0];

    /* Send welcome email — fire and forget, never blocks response */
    const { sendWelcomeWithTempPassword } = require('../email');
    sendWelcomeWithTempPassword(newUser.email, newUser.username, tempPassword, req.user.username)
      .catch(err => console.error('Welcome email failed:', err.message));

    await log({
      userId:     req.user.id,
      action:     ACTIONS.USER_CREATED,
      entityType: 'user',
      entityId:   newUser.id,
      detail:     { username: newUser.username, email: newUser.email, role },
      ipAddress:  req.ip
    });

    /* Return temp password once — this is the only time it is visible */
    res.status(201).json({
      user:          newUser,
      tempPassword,  /* Display this to the Admin; it will not be recoverable again */
      emailSent:     !!process.env.SENDGRID_API_KEY
    });

  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

/* ═══════════════════════════════════════
   PATCH /api/users/:id
   Update username, email, or role.
   Cannot modify your own account via this endpoint (use /api/auth/* instead).
   ═══════════════════════════════════════ */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body || {};

  /* Prevent self-edit via this endpoint (use profile page instead) */
  if (id === req.user.id) {
    return res.status(400).json({
      error: 'Cannot edit your own account via user management. Use your profile page instead.'
    });
  }

  try {
    const { rows: existing } = await query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
      [id]
    );
    if (!existing.length) return res.status(404).json({ error: 'User not found.' });

    const current = existing[0];
    const updates = [];
    const values  = [];
    let   idx     = 1;

    if (username !== undefined) {
      const err = validateUsername(username);
      if (err) return res.status(400).json({ error: err });

      /* Uniqueness check */
      const { rows: clash } = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username.trim(), id]
      );
      if (clash.length) return res.status(409).json({ error: 'Username already taken.' });

      updates.push(`username = $${idx++}`);
      values.push(username.trim());
    }

    if (email !== undefined) {
      const err = validateEmail(email);
      if (err) return res.status(400).json({ error: err });

      const { rows: clash } = await query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
        [email.trim(), id]
      );
      if (clash.length) return res.status(409).json({ error: 'Email address already registered.' });

      updates.push(`email = $${idx++}`);
      values.push(email.trim().toLowerCase());
    }

    if (role !== undefined) {
      if (!['admin', 'rep', 'se'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "admin", "rep" (AE), or "se" (Solution Engineer).' });
      }
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, username, email, role, is_active, first_login, updated_at`,
      values
    );

    await log({
      userId:     req.user.id,
      action:     ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId:   id,
      detail:     {
        changed: Object.fromEntries(
          Object.entries({ username, email, role })
            .filter(([, v]) => v !== undefined)
        )
      },
      ipAddress: req.ip
    });

    res.json(rows[0]);

  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

/* ═══════════════════════════════════════
   POST /api/users/:id/reset-password
   Admin-initiated temp password reset.
   Sends a new temp password, forces first_login,
   unlocks account, revokes all sessions.
   ═══════════════════════════════════════ */
router.post('/:id/reset-password', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    /* Update password, force first_login, unlock account */
    await query(
      `UPDATE users
       SET password_hash = $1, first_login = TRUE,
           failed_login_count = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, id]
    );

    /* Revoke all active sessions */
    await query('DELETE FROM sessions WHERE user_id = $1', [id]);

    /* Invalidate any pending password reset tokens */
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [id]
    );

    /* Email the new temp password */
    const { sendWelcomeWithTempPassword } = require('../email');
    sendWelcomeWithTempPassword(user.email, user.username, tempPassword, req.user.username)
      .catch(err => console.error('Reset password email failed:', err.message));

    await log({
      userId:     req.user.id,
      action:     ACTIONS.USER_TEMP_RESET,
      entityType: 'user',
      entityId:   id,
      detail:     { username: user.username, resetBy: req.user.username },
      ipAddress:  req.ip
    });

    res.json({
      ok:          true,
      tempPassword,
      emailSent:   !!process.env.SENDGRID_API_KEY,
      message:     `Password reset for ${user.username}. All active sessions have been revoked.`
    });

  } catch (err) {
    console.error('Admin reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

/* ═══════════════════════════════════════
   PATCH /api/users/:id/status
   Activate or deactivate a user (soft delete).
   Cannot deactivate your own account.
   Deactivating revokes all sessions.
   ═══════════════════════════════════════ */
router.patch('/:id/status', async (req, res) => {
  const { id }      = req.params;
  const { isActive } = req.body || {};

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive (boolean) is required.' });
  }

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  try {
    const { rows } = await query(
      'SELECT id, username, is_active FROM users WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    if (rows[0].is_active === isActive) {
      return res.status(400).json({
        error: `User is already ${isActive ? 'active' : 'inactive'}.`
      });
    }

    await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [isActive, id]
    );

    /* Revoke all sessions when deactivating */
    if (!isActive) {
      await query('DELETE FROM sessions WHERE user_id = $1', [id]);
    }

    await log({
      userId:     req.user.id,
      action:     isActive ? ACTIONS.USER_REACTIVATED : ACTIONS.USER_DEACTIVATED,
      entityType: 'user',
      entityId:   id,
      detail:     { username: rows[0].username },
      ipAddress:  req.ip
    });

    res.json({
      ok:       true,
      isActive,
      message:  `${rows[0].username} has been ${isActive ? 'reactivated' : 'deactivated'}.`
    });

  } catch (err) {
    console.error('Update user status error:', err.message);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

module.exports = router;
