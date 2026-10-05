/* ═══════════════════════════════════════════════════════════════════
   src/error-log.js — resilient server-side error capture
   Writes errors to the error_log table for in-app visibility. Logging must
   NEVER throw or cascade a second failure, so every path is wrapped and
   falls back to console. Also exposes a fetch for the admin view and a
   prune for retention.
   ═══════════════════════════════════════════════════════════════════ */

function db() { return require('./db'); }

/* Record an error. Best-effort: on any failure it logs to console and
   returns without throwing. `ctx` may include { req, source, level, status }. */
async function logError(err, ctx = {}) {
  const message = (err && err.message) ? err.message : String(err);
  const stack   = (err && err.stack) ? String(err.stack).slice(0, 8000) : null;
  const level   = ctx.level || 'error';
  const source  = (ctx.source || 'unknown').slice(0, 120);
  const req     = ctx.req || null;
  const method  = req && req.method ? String(req.method).slice(0, 10) : null;
  const path    = req && (req.originalUrl || req.url) ? String(req.originalUrl || req.url).slice(0, 500) : null;
  const status  = ctx.status || (err && err.status) || null;
  const userId  = req && req.user && req.user.id ? req.user.id : null;
  const ip      = req && req.ip ? String(req.ip).slice(0, 64) : null;

  /* Always mirror to console so Render logs still have it. */
  console.error(`[${level}] ${source}: ${message}`);

  try {
    const { query } = db();
    await query(
      `INSERT INTO error_log (level, source, message, stack, method, path, status, user_id, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [level, source, message.slice(0, 4000), stack, method, path, status, userId, ip]
    );
  } catch (e) {
    /* DB unavailable or table missing (pre-migration): swallow, keep console line. */
    console.error('error-log write failed:', e.message);
  }
}

/* Fetch recent errors for the admin view. */
async function recentErrors(limit = 100, offset = 0, kind = 'all', dataQuery = null) {
  const query = dataQuery || db().query;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const normalizedKind = ['all', 'server', 'client'].includes(kind) ? kind : 'all';
  /* Totals and page rows are resolved by one PostgreSQL statement so the UI
     cannot combine a newer total with an older page. */
  const { rows } = await query(
    `WITH base AS (
       SELECT id,occurred_at,level,source,message,stack,method,path,status,user_id,ip,
              CASE WHEN source LIKE 'client%' THEN 'client' ELSE 'server' END kind
       FROM error_log
     ), filtered AS (
       SELECT * FROM base WHERE $3='all' OR kind=$3
     ), page AS (
       SELECT id,occurred_at,level,source,message,stack,method,path,status,user_id,ip
       FROM filtered ORDER BY occurred_at DESC LIMIT $1 OFFSET $2
     )
     SELECT COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.occurred_at DESC) FROM page p),'[]'::jsonb) errors,
            (SELECT COUNT(*)::int FROM base) total_all,
            (SELECT COUNT(*)::int FROM filtered) total_filtered,
            (SELECT COUNT(*)::int FROM base WHERE kind='server') total_server,
            (SELECT COUNT(*)::int FROM base WHERE kind='client') total_client`,
    [lim, off, normalizedKind]
  );
  const row = rows[0] || {};
  const errors = Array.isArray(row.errors) ? row.errors : [];
  const page = {
    limit: lim,
    offset: off,
    returned: errors.length,
    totalFiltered: Number(row.total_filtered) || 0,
    totalAll: Number(row.total_all) || 0,
    counts: { all: Number(row.total_all) || 0, server: Number(row.total_server) || 0, client: Number(row.total_client) || 0 },
    kind: normalizedKind
  };
  return { errors, page, total: page.totalAll, limit: lim, offset: off, counts: page.counts };
}

/* Prune errors older than N days (default 90). Returns rows removed. */
async function pruneErrors(days = 90) {
  const { query } = db();
  const d = Math.max(parseInt(days, 10) || 90, 1);
  const { rowCount } = await query(
    `DELETE FROM error_log WHERE occurred_at < NOW() - ($1 || ' days')::interval`,
    [String(d)]
  );
  return rowCount;
}

module.exports = { logError, recentErrors, pruneErrors };
