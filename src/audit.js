/* ═══════════════════════════════════════════════════════════════════
   src/audit.js  —  Audit log helper

   Called from every route that performs a meaningful action.
   Failures are caught and logged to console — never bubble up as
   errors to the user (a failed audit write must never block an operation).
   ═══════════════════════════════════════════════════════════════════ */

const { query } = require('./db');

/**
 * Write an entry to the audit_log table.
 *
 * @param {object} opts
 * @param {string|null} opts.userId      — UUID of the acting user (null for system/anonymous)
 * @param {string}      opts.action      — dot-namespaced action, e.g. 'user.login'
 * @param {string}      [opts.entityType] — e.g. 'scenario', 'user', 'discovery_session'
 * @param {string}      [opts.entityId]  — UUID of the affected entity
 * @param {object}      [opts.detail]    — additional context (will be stored as JSONB)
 * @param {string}      [opts.ipAddress] — requester IP
 */
async function log({ userId = null, action, entityType = null, entityId = null, detail = null, ipAddress = null }) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, detail, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId     || null,
        action,
        entityType || null,
        entityId   || null,
        detail     ? JSON.stringify(detail) : null,
        ipAddress  || null
      ]
    );
  } catch (err) {
    // Audit log failures must never crash the application
    console.error(`[audit] Failed to write log entry (action=${action}):`, err.message);
  }
}

/**
 * Express middleware factory — extracts user context from req and writes
 * an audit entry. Used for simple cases where no async data is needed.
 *
 * Example:
 *   router.delete('/:id', requireAuth, auditMiddleware('scenario.deleted'), handler);
 */
function auditMiddleware(action, getDetail = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 400) {
        await log({
          userId:    req.user?.id || null,
          action,
          detail:    getDetail ? getDetail(req, body) : undefined,
          ipAddress: req.ip
        });
      }
      return originalJson(body);
    };
    next();
  };
}

/* ── Canonical action name constants ────────────────────────────────
   Import these in route modules to avoid typos in action strings.
   ────────────────────────────────────────────────────────────────── */
const ACTIONS = {
  // Auth
  USER_LOGIN:               'user.login',
  USER_LOGIN_FAILED:        'user.login_failed',
  USER_LOGIN_LOCKED:        'user.login_locked',
  USER_LOGOUT:              'user.logout',
  USER_PASSWORD_CHANGED:    'user.password_changed',
  USER_PASSWORD_RESET_REQ:  'user.password_reset_requested',
  USER_PASSWORD_RESET_DONE: 'user.password_reset_completed',

  // User management (Admin)
  USER_CREATED:             'user.created',
  USER_UPDATED:             'user.updated',
  USER_DEACTIVATED:         'user.deactivated',
  USER_REACTIVATED:         'user.reactivated',
  USER_TEMP_RESET:          'user.password_reset',

  // Scenarios
  SCENARIO_SAVED:           'scenario.saved',
  SCENARIO_LOADED:          'scenario.loaded',
  SCENARIO_DELETED:         'scenario.deleted',
  SCENARIO_SHARED:          'scenario.shared',
  SCENARIO_OUTCOME_SET:     'scenario.outcome_set',
  HANDOFF_SAVED:            'handoff.saved',

  // Discovery
  DISCOVERY_LINK_GENERATED: 'discovery.link_generated',
  DISCOVERY_LINK_ROTATED:   'discovery.link_rotated',
  DISCOVERY_LINK_REVOKED:   'discovery.link_revoked',
  DISCOVERY_ANSWERS_SUBMIT: 'discovery.answers_submitted',

  // Output
  PDF_DOWNLOADED:           'pdf.downloaded',
  EMAIL_GENERATED:          'email.generated',

  // Admin
  HELP_PAGE_UPDATED:        'admin.help_page_updated',
  BENCHMARK_UPDATED:        'admin.benchmark_updated',

  // Audit purge
  PURGE_PENDING:            'audit.purge_pending',
  PURGE_CONFIRMED:          'audit.purge_completed',
  PURGE_CANCELLED:          'audit.purge_cancelled',

  // System
  MIGRATION_APPLIED:        'system.migration_applied'
};

module.exports = { log, auditMiddleware, ACTIONS };
