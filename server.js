/* ═══════════════════════════════════════════════════════════════════
   server.js  —  Cloud Inventory ROI Builder  v5.6.9
   Database-backed multi-user edition — production hardened

   Security layers applied (Phase 10):
   ① Helmet.js — security headers (CSP, HSTS, X-Frame, etc.)
   ② trust proxy — correct req.ip behind Render's load balancer
   ③ Global API rate limit — 100 req/min per IP on all /api/* routes
   ④ httpOnly + SameSite cookie for JWT (sessionStorage stays as fallback)
   ⑤ SSL enforced on Render PostgreSQL in all environments
   ═══════════════════════════════════════════════════════════════════ */

const express    = require('express');
const path       = require('path');
const https      = require('https');
const crypto     = require('crypto');
const { getAppUrl } = require('./src/config');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
/* This middleware is used by early admin routes as well as later APIs. */
const { requireAuth } = require('./src/middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

/* Serve the shared ROI engine (canonical source in src/shared) to the
   browser at a stable path, so client and server run identical math from
   one file — no duplicated copy, no build step. */
app.get('/roi-engine.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'src', 'shared', 'roi-engine.js'));
});
/* PowerPoint browser runtime. PptxGenJS expects JSZip as a separate global. */
app.get('/jszip.min.js', (req, res) => {
  const p = path.join(__dirname, 'node_modules', 'jszip', 'dist', 'jszip.min.js');
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(p, err => {
    if (err && !res.headersSent) {
      console.warn('jszip.min.js not found in node_modules, falling back to CDN redirect');
      res.redirect('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    }
  });
});

/* Serve pptxgenjs from npm package — no CDN needed */
app.get('/pptxgen.min.js', (req, res) => {
  const p = path.join(__dirname, 'node_modules', 'pptxgenjs', 'dist', 'pptxgen.min.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=86400'); /* cache 1 day */
  res.sendFile(p, function(err) {
    if (err) {
      console.warn('pptxgen.min.js not found in node_modules, falling back to CDN redirect');
      res.redirect('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.min.js');
    }
  });
});

app.get('/handoff-readiness.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'src', 'shared', 'handoff-readiness.js'));
});
const PROD = process.env.NODE_ENV === 'production';
const APP_URL = getAppUrl();
const APP_VERSION = require('./package.json').version;

const ANTHROPIC_MODEL    = process.env.ANTHROPIC_MODEL    || 'claude-sonnet-4-6';
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

/* ── ① Trust Render's load balancer ──────────────────────────────────
   Required for:
   - req.ip to show the real client IP (not the proxy IP)
   - express-rate-limit to key on the real client IP
   - Secure cookies to be set correctly via HTTPS on Render
   ────────────────────────────────────────────────────────────────── */
app.set('trust proxy', 1);

/* ── ② Security headers via Helmet ──────────────────────────────────
   Helmet sets a suite of HTTP headers that harden the app against
   common web vulnerabilities.
   ────────────────────────────────────────────────────────────────── */
app.use(helmet({
  /* Content-Security-Policy: tightly scoped to what the app actually loads */
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'], // inline scripts + pptxgenjs CDN (jsDelivr)
      /* Helmet's default CSP sets script-src-attr 'none'. The current UI uses
         inline HTML event handlers (onsubmit/onclick) throughout, so that
         default silently disables login and most buttons. Allow those legacy
         handlers until the UI is refactored to addEventListener(). */
      scriptSrcAttr:  ["'unsafe-inline'"],
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:         ["'self'", 'data:'],           // data: for logo fallbacks
      connectSrc:     ["'self'", 'https://api.anthropic.com', 'https://cdn.jsdelivr.net'], // jsdelivr: pptxgenjs fallback only
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      upgradeInsecureRequests: PROD ? [] : null      // HTTPS-only in production
    }
  },
  /* HTTP Strict Transport Security — tell browsers to always use HTTPS */
  hsts: PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  /* Prevent clickjacking */
  frameguard: { action: 'deny' },
  /* Prevent MIME-type sniffing */
  noSniff: true,
  /* Don't reveal Referer header to external sites */
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  /* Remove X-Powered-By: Express */
  hidePoweredBy: true
}));

/* ── ③ Global API rate limit ────────────────────────────────────────
   100 requests per minute per IP on all /api/* routes.
   Auth endpoints have their own tighter limit (10/min) applied inside
   src/routes/auth.js — this global limit is a belt-and-suspenders
   defence for all other API surfaces.
   ────────────────────────────────────────────────────────────────── */
const apiLimiter = rateLimit({
  windowMs:        60 * 1000,    // 1 minute
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests. Please slow down and try again in a minute.' },
  skip:            (req) => req.path === '/health'  // health check is exempt
});
app.use('/api/', apiLimiter);

/* ── AI endpoint limiter (cost protection) ──
   /api/enhance calls the Anthropic API, which costs money per request, so it
   gets a tighter limit than the general API budget AND is keyed on the
   authenticated user (not IP) — several reps behind one office IP shouldn't
   share a pool, and one user shouldn't be able to run up AI spend in a loop.
   TUNE HERE: adjust `max` to raise/lower the per-user per-minute AI ceiling. */
const aiLimiter = rateLimit({
  windowMs:        60 * 1000,        // 1 minute
  max:             15,               // per-user AI calls per minute (sensible default; tune freely)
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'AI request limit reached. Please wait a minute before generating more AI content.' },
  /* Key on the authenticated user id when available, else fall back to IP. */
  keyGenerator:    (req) => (req.user && req.user.id) ? 'user:' + req.user.id : (req.ip || 'anon')
});

/* ── Body parsing ── */
app.use(express.json({ limit: '1mb' }));
app.use(require('express').urlencoded({ extended: false, limit: '1mb' }));

/* ── ④ Cookie parser (for httpOnly JWT cookie) ── */
/* We use the built-in cookie parsing rather than a package to keep deps minimal */
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(
    raw.split(';').map(c => c.trim().split('=').map((p, i) => i === 0 ? p : decodeURIComponent(p)))
      .filter(([k]) => k)
  );
}

/* ── Static files — served after all API routes ── */
app.use(express.static(PUBLIC_DIR, {
  /* Don't expose directory listings */
  index: false,
  /* No dotfiles (.env, .git etc.) */
  dotfiles: 'deny',
  /* Authentication pages must never be served from a stale browser cache. */
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

/* ── Helper: lazy-load db module ── */
function db() { return require('./src/db'); }

/* ── Auth routes (public — no requireAuth here) ── */
const authRouter  = require('./src/routes/auth');
app.use('/api/auth', authRouter);

/* ── User management — Admin only ── */
const usersRouter = require('./src/routes/users');
app.use('/api/users', usersRouter);

/* ── Scenarios ── */
const scenariosRouter = require('./src/routes/scenarios');
app.use('/api/scenarios', scenariosRouter);

/* ── Help / How to Use ── */
const helpRouter = require('./src/routes/help');
app.use('/api/help', helpRouter);

/* ── Joint Project Plans ── */
const mapsRouter = require('./src/routes/maps');
app.use('/api/maps', mapsRouter);

/* ── Stakeholder maps ── */
const stakeholdersRouter = require('./src/routes/stakeholders');
app.use('/api/stakeholders', stakeholdersRouter);
const handoffsRouter = require('./src/routes/handoffs');
app.use('/api/handoffs', handoffsRouter);
app.use('/api', require('./src/routes/analytics'));  // analytics + custom benchmarks

/* ── Unified company list (v2.3) ──
   De-duplicated company names across scenarios, action plans and
   stakeholders for the current user, each with usage counts.
   Case-insensitive grouping; canonical spelling = most recent use.  */
app.get('/api/companies', requireAuth, async (req, res) => {
  try {
    const { rows } = await db().query(
      `WITH all_companies AS (
         SELECT company, updated_at, 'scenario'    AS src FROM scenarios
           WHERE owner_id = $1 AND deleted_at IS NULL AND company <> ''
         UNION ALL
         SELECT company, updated_at, 'plan'        AS src FROM mutual_action_plans
           WHERE owner_id = $1 AND company <> ''
         UNION ALL
         SELECT company, updated_at, 'stakeholder' AS src FROM stakeholders
           WHERE owner_id = $1 AND company <> ''
       ),
       canonical AS (
         SELECT DISTINCT ON (LOWER(company)) LOWER(company) AS key, company AS name
         FROM all_companies
         ORDER BY LOWER(company), updated_at DESC
       ),
       counts AS (
         SELECT LOWER(company) AS key,
                COUNT(*) FILTER (WHERE src = 'scenario')    AS scenarios,
                COUNT(*) FILTER (WHERE src = 'plan')        AS plans,
                COUNT(*) FILTER (WHERE src = 'stakeholder') AS stakeholders
         FROM all_companies
         GROUP BY LOWER(company)
       )
       SELECT c.name, ct.scenarios, ct.plans, ct.stakeholders
       FROM canonical c
       JOIN counts ct ON ct.key = c.key
       ORDER BY c.name ASC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      name: r.name,
      scenarios: Number(r.scenarios),
      plans: Number(r.plans),
      stakeholders: Number(r.stakeholders)
    })));
  } catch (err) {
    console.error('List companies error:', err.message);
    res.status(500).json({ error: 'Failed to load companies.' });
  }
});

/* Lightweight list of assignable Solution Engineers + Admins, readable by any
   authenticated user (returns only id/username/role — no sensitive fields).
   Used to populate the Solution Fit "Solution Engineer" dropdown. */
app.get('/api/solution-engineers', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const { rows } = await query(
      `SELECT id, username, role FROM users
        WHERE role IN ('se','admin') AND is_active = TRUE
        ORDER BY role DESC, username ASC`
    );
    res.json(rows.map(r => ({ id: r.id, name: r.username, role: r.role })));
  } catch (err) {
    console.error('List solution engineers error:', err.message);
    res.status(500).json({ error: 'Failed to load solution engineers.' });
  }
});

/* First-class customers (stable IDs). SE/admin see all; AE sees their own. */
app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const { listCustomersForOwner, listAllCustomers } = require('./src/customers');
    const { isCrossCustomer } = require('./src/handoff-access');
    /* SE and admin see every AE's customers (an SE supports multiple AEs);
       an AE (rep) sees only their own. */
    const customers = isCrossCustomer(req.user)
      ? await listAllCustomers()
      : await listCustomersForOwner(req.user.id);
    res.json(customers);
  } catch (err) {
    console.error('List customers error:', err.message);
    res.status(500).json({ error: 'Failed to load customers.' });
  }
});

app.get('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const { getCustomer } = require('./src/customers');
    const { isCrossCustomer } = require('./src/handoff-access');
    const c = await getCustomer(req.params.id, req.user.id, isCrossCustomer(req.user));
    if (!c) return res.status(404).json({ error: 'Customer not found.' });
    res.json(c);
  } catch (err) {
    console.error('Get customer error:', err.message);
    res.status(500).json({ error: 'Failed to load customer.' });
  }
});

/* ── Audit log viewer ── */
const logsRouter = require('./src/routes/logs');
app.use('/api/logs', logsRouter);

/* ── Audit purge confirmation endpoints ──
   These are intentionally outside the main auth middleware — they are
   accessed via email links and validated by the signed purge token.  */

async function validatePurgeToken(rawToken) {
  if (!rawToken) return null;
  const hash = crypto.createHash('sha256').update(String(rawToken)).digest('hex');
  const { rows } = await db().query(
    `SELECT * FROM purge_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [hash]
  );
  return rows[0] || null;
}

/* ══════════════════════════════════════════════════════════════════
   ADMIN — DATA EXPORT
   GET /api/admin/export/:entity  — download CSV for one entity
   Entities: scenarios | customers | discovery | users
   ══════════════════════════════════════════════════════════════════ */
app.get('/api/admin/export/:entity', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { query } = db();
  const entity = req.params.entity;

  const EXPORTS = {
    scenarios: {
      filename: 'scenarios.csv',
      sql: `SELECT s.id, s.name, s.company, u.username AS rep, s.version,
              s.is_current, s.deal_stage, s.industry,
              (s.data->>'annualBenefit')::numeric AS annual_benefit,
              (s.data->>'roi')::numeric AS roi,
              (s.data->>'npv5')::numeric AS npv5,
              s.created_at, s.updated_at, s.deleted_at
            FROM scenarios s
            JOIN users u ON u.id = s.owner_id
            ORDER BY s.company, s.name, s.version DESC`,
      params: []
    },
    customers: {
      filename: 'customers.csv',
      sql: `SELECT c.id, c.name, u.username AS owner,
              c.has_field_inventory,
              COUNT(DISTINCT s.id) AS scenario_count,
              c.created_at, c.updated_at, c.deleted_at
            FROM customers c
            JOIN users u ON u.id = c.owner_id
            LEFT JOIN scenarios s ON s.customer_id = c.id AND s.deleted_at IS NULL
            GROUP BY c.id, u.username
            ORDER BY c.name`,
      params: []
    },
    discovery: {
      filename: 'discovery_sessions.csv',
      sql: `SELECT ds.id, ds.company, ds.industry, u.username AS rep,
              ds.is_active, ds.has_field_inventory,
              ds.open_count, ds.submitted_at, ds.answer_count,
              ds.created_at, ds.updated_at
            FROM discovery_sessions ds
            JOIN users u ON u.id = ds.owner_id
            ORDER BY ds.company, ds.created_at DESC`,
      params: []
    },
    users: {
      filename: 'users.csv',
      sql: `SELECT u.id, u.username, u.email, u.role, u.is_active,
              u.created_at,
              MAX(s.updated_at) AS last_scenario_saved,
              COUNT(DISTINCT s.id) AS scenario_count
            FROM users u
            LEFT JOIN scenarios s ON s.owner_id = u.id AND s.deleted_at IS NULL AND s.is_current = TRUE
            GROUP BY u.id
            ORDER BY u.username`,
      params: []
    }
  };

  const cfg = EXPORTS[entity];
  if (!cfg) return res.status(400).json({ error: 'Unknown export entity.' });

  try {
    const { rows } = await query(cfg.sql, cfg.params);
    if (!rows.length) return res.status(204).end();

    /* Build CSV */
    const cols = Object.keys(rows[0]);
    const escape = v => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [cols.join(',')]
      .concat(rows.map(r => cols.map(c => escape(r[c])).join(',')))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${cfg.filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: 'Export failed.' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   ADMIN — COMPANY TYPEAHEAD (all companies, admin-only)
   GET /api/admin/companies?q=search
   ══════════════════════════════════════════════════════════════════ */
app.get('/api/admin/companies', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const q = String(req.query.q || '').trim();
    const pat = q ? '%' + q.toLowerCase() + '%' : '%';
    const { query } = db();
    const { rows } = await query(
      `SELECT DISTINCT ON (lower_name) name FROM (
         SELECT DISTINCT ON (LOWER(company)) company AS name, LOWER(company) AS lower_name
         FROM scenarios WHERE deleted_at IS NULL AND company <> '' AND LOWER(company) LIKE $1
         UNION ALL
         SELECT DISTINCT ON (LOWER(company)) company AS name, LOWER(company) AS lower_name
         FROM discovery_sessions WHERE company <> '' AND LOWER(company) LIKE $1
         UNION ALL
         SELECT DISTINCT ON (LOWER(name)) name, LOWER(name) AS lower_name
         FROM customers WHERE deleted_at IS NULL AND name <> '' AND LOWER(name) LIKE $1
       ) sub
       ORDER BY lower_name LIMIT 20`,
      [pat]
    );
    res.json({ companies: rows.map(r => r.name) });
  } catch (err) {
    console.error('Admin companies typeahead error:', err.message);
    res.status(500).json({ error: 'Lookup failed.' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   ADMIN — TEST DATA CLEANUP
   POST /api/admin/cleanup/preview  — show what would be deleted
   POST /api/admin/cleanup/execute  — soft-delete selected records by ID
   ══════════════════════════════════════════════════════════════════ */
app.post('/api/admin/cleanup/preview', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const search = String(req.body.company || '').trim();
    if (!search) return res.status(400).json({ error: 'Company name required.' });
    const pat = '%' + search.toLowerCase() + '%';
    const { query } = db();

    const [scen, disc, cust, handoff] = await Promise.all([
      query(`SELECT s.id, s.name, s.company, u.username AS rep, s.version, s.is_current,
               s.deleted_at IS NOT NULL AS already_deleted
             FROM scenarios s JOIN users u ON u.id = s.owner_id
             WHERE LOWER(s.company) LIKE $1
             ORDER BY s.company, s.name, s.version DESC`, [pat]),
      query(`SELECT ds.id, ds.company, u.username AS rep,
               ds.submitted_at IS NOT NULL AS submitted, ds.answer_count,
               NOT ds.is_active AS already_inactive
             FROM discovery_sessions ds JOIN users u ON u.id = ds.owner_id
             WHERE LOWER(ds.company) LIKE $1
             ORDER BY ds.company, ds.created_at DESC`, [pat]),
      query(`SELECT c.id, c.name, u.username AS owner,
               c.deleted_at IS NOT NULL AS already_deleted,
               COUNT(DISTINCT s.id) AS scenario_count
             FROM customers c JOIN users u ON u.id = c.owner_id
             LEFT JOIN scenarios s ON s.customer_id = c.id
             WHERE LOWER(c.name) LIKE $1
             GROUP BY c.id, u.username
             ORDER BY c.name`, [pat]),
      query(`SELECT h.id, c.name AS customer, u.username AS se
             FROM handoffs h
             JOIN customers c ON c.id = h.customer_id
             JOIN users u ON u.id = h.owner_id
             WHERE LOWER(c.name) LIKE $1 AND h.deleted_at IS NULL`, [pat])
    ]);

    res.json({
      search,
      scenarios:  scen.rows,
      discovery:  disc.rows,
      customers:  cust.rows,
      handoffs:   handoff.rows,
      summary: {
        scenarios:  scen.rows.length,
        discovery:  disc.rows.length,
        customers:  cust.rows.length,
        handoffs:   handoff.rows.length
      }
    });
  } catch (err) {
    console.error('Cleanup preview error:', err.message);
    res.status(500).json({ error: 'Preview failed.' });
  }
});

app.post('/api/admin/cleanup/execute', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const search  = String(req.body.company || '').trim();
    /* selectedIds — when provided, only delete these specific records */
    const selScen = Array.isArray(req.body.scenarioIds)   ? req.body.scenarioIds.map(Number).filter(Boolean)   : null;
    const selDisc = Array.isArray(req.body.discoveryIds)  ? req.body.discoveryIds.map(Number).filter(Boolean)  : null;
    const selCust = Array.isArray(req.body.customerIds)   ? req.body.customerIds.map(Number).filter(Boolean)   : null;
    const hasSelection = (selScen && selScen.length) || (selDisc && selDisc.length) || (selCust && selCust.length);
    if (!search && !hasSelection) return res.status(400).json({ error: 'Company name or selection required.' });
    const { query } = db();
    const now = new Date().toISOString();

    let scen, disc, cust;

    if (hasSelection) {
      /* Selective delete — only the explicitly checked IDs */
      scen = selScen && selScen.length
        ? await query(`UPDATE scenarios SET deleted_at = $1 WHERE id = ANY($2) AND deleted_at IS NULL RETURNING id`,
            [now, selScen])
        : { rowCount: 0 };
      disc = selDisc && selDisc.length
        ? await query(`UPDATE discovery_sessions SET is_active = FALSE WHERE id = ANY($1) AND is_active = TRUE RETURNING id`,
            [selDisc])
        : { rowCount: 0 };
      cust = selCust && selCust.length
        ? await query(`UPDATE customers SET deleted_at = $1 WHERE id = ANY($2) AND deleted_at IS NULL RETURNING id`,
            [now, selCust])
        : { rowCount: 0 };
      /* Deactivate share links for the specifically deleted scenarios */
      if (selScen && selScen.length) {
        await query(`UPDATE scenario_shares SET is_active = FALSE WHERE is_active = TRUE AND scenario_id = ANY($1)`, [selScen]);
        await query(`UPDATE business_case_shares SET is_active = FALSE WHERE is_active = TRUE AND scenario_id = ANY($1)`, [selScen]);
      }
      /* Deactivate handoffs for specifically deleted customers */
      if (selCust && selCust.length) {
        await query(`UPDATE handoffs SET deleted_at = $1 WHERE customer_id = ANY($2) AND deleted_at IS NULL`, [now, selCust]);
      }
    } else {
      /* Legacy full-pattern delete (no selection made — deletes all matches) */
      const pat = '%' + search.toLowerCase() + '%';
      scen = await query(`UPDATE scenarios SET deleted_at = $1 WHERE LOWER(company) LIKE $2 AND deleted_at IS NULL RETURNING id`, [now, pat]);
      disc = await query(`UPDATE discovery_sessions SET is_active = FALSE WHERE LOWER(company) LIKE $1 AND is_active = TRUE RETURNING id`, [pat]);
      await query(`UPDATE scenario_shares SET is_active = FALSE WHERE is_active = TRUE AND scenario_id IN (SELECT id FROM scenarios WHERE LOWER(company) LIKE $1)`, [pat]);
      await query(`UPDATE business_case_shares SET is_active = FALSE WHERE is_active = TRUE AND scenario_id IN (SELECT id FROM scenarios WHERE LOWER(company) LIKE $1)`, [pat]);
      await query(`UPDATE handoffs SET deleted_at = $1 WHERE customer_id IN (SELECT id FROM customers WHERE LOWER(name) LIKE $2) AND deleted_at IS NULL`, [now, pat]);
      cust = await query(`UPDATE customers SET deleted_at = $1 WHERE LOWER(name) LIKE $2 AND deleted_at IS NULL RETURNING id`, [now, pat]);
    }

    const { log } = require('./src/audit');
    await log({
      userId: req.user.id,
      action: 'admin.cleanup_executed',
      entityType: 'admin',
      detail: {
        search,
        selective: !!hasSelection,
        scenariosDeleted: scen.rowCount,
        discoveryDeactivated: disc.rowCount,
        customersDeleted: cust.rowCount
      },
      ipAddress: req.ip
    });

    res.json({
      ok: true,
      scenariosDeleted:     scen.rowCount,
      discoveryDeactivated: disc.rowCount,
      customersDeleted:     cust.rowCount
    });
  } catch (err) {
    console.error('Cleanup execute error:', err.message);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
});

/* ── Cleanup: list recently soft-deleted records (last 30 days) ── */
app.get('/api/admin/cleanup/deleted', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const { query } = db();
    const [scen, cust] = await Promise.all([
      query(`SELECT s.id, s.name, s.company, u.username AS rep, s.version,
               s.deleted_at, s.is_current
             FROM scenarios s JOIN users u ON u.id = s.owner_id
             WHERE s.deleted_at IS NOT NULL AND s.deleted_at > NOW() - INTERVAL '30 days'
             ORDER BY s.deleted_at DESC LIMIT 100`),
      query(`SELECT c.id, c.name, u.username AS owner, c.deleted_at
             FROM customers c JOIN users u ON u.id = c.owner_id
             WHERE c.deleted_at IS NOT NULL AND c.deleted_at > NOW() - INTERVAL '30 days'
             ORDER BY c.deleted_at DESC LIMIT 50`)
    ]);
    res.json({ scenarios: scen.rows, customers: cust.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deleted records.' });
  }
});

/* ── Cleanup: restore a soft-deleted record by id and type ── */
app.post('/api/admin/cleanup/restore', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const { type, id } = req.body || {};
    if (!id || !['scenario','customer'].includes(type)) {
      return res.status(400).json({ error: 'type (scenario|customer) and id required.' });
    }
    const { query } = db();
    if (type === 'scenario') {
      const { rowCount } = await query(
        `UPDATE scenarios SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`,
        [id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Scenario not found or not deleted.' });
    } else {
      const { rowCount } = await query(
        `UPDATE customers SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`,
        [id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Customer not found or not deleted.' });
    }
    const { log, ACTIONS } = require('./src/audit');
    await log({ userId: req.user.id, action: 'admin.cleanup_restored',
      entityType: type, entityId: id, detail: { type, id }, ipAddress: req.ip });
    res.json({ ok: true });
  } catch (err) {
    console.error('Restore error:', err.message);
    res.status(500).json({ error: 'Restore failed.' });
  }
});


app.get('/api/admin/purge/confirm', async (req, res) => {
  try {
    if (!token || token.action !== 'confirm') {
      return res.status(400).send(purgeHtmlPage(
        '❌ Invalid or expired link',
        'This purge confirmation link is invalid or has already been used.',
        false
      ));
    }

    const cutoff = new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000);
    const { rowCount } = await db().query(
      'DELETE FROM audit_log WHERE created_at < $1',
      [cutoff.toISOString()]
    );

    await db().query('UPDATE purge_tokens SET used_at = NOW() WHERE id = $1', [token.id]);

    await require('./src/audit').log({
      action:     require('./src/audit').ACTIONS.PURGE_CONFIRMED,
      entityType: 'audit_log',
      detail:     { deleted: rowCount, cutoff: cutoff.toISOString() }
    });

    const { rows: admins } = await db().query(
      "SELECT email, username FROM users WHERE role = 'admin' AND is_active = TRUE"
    );
    const { sendPurgeConfirmation } = require('./src/email');
    for (const admin of admins) {
      await sendPurgeConfirmation(admin.email, admin.username, {
        recordCount: rowCount,
        oldestDate: '—',
        cutoffDate: cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        confirmUrl: '', cancelUrl: '',
        breakdown: [{ action: 'PURGE COMPLETED', count: rowCount }]
      }).catch(() => {});
    }

    console.log(`[auditPurge] Purge confirmed — ${rowCount} records deleted.`);
    res.send(purgeHtmlPage(
      '✅ Purge complete',
      `${rowCount.toLocaleString()} audit log record${rowCount !== 1 ? 's' : ''} permanently deleted.`,
      true
    ));
  } catch (err) {
    console.error('Purge confirm error:', err.message);
    res.status(500).send(purgeHtmlPage('❌ Error', 'An error occurred. Contact your system administrator.', false));
  }
});

app.get('/api/admin/purge/cancel', async (req, res) => {
  try {
    const token = await validatePurgeToken(req.query.token);
    if (!token || token.action !== 'cancel') {
      return res.status(400).send(purgeHtmlPage(
        '❌ Invalid or expired link',
        'This cancel link is invalid or has already been used.',
        false
      ));
    }

    await db().query('UPDATE purge_tokens SET used_at = NOW() WHERE used_at IS NULL AND expires_at > NOW()');

    await require('./src/audit').log({
      action:     require('./src/audit').ACTIONS.PURGE_CANCELLED,
      entityType: 'audit_log',
      detail:     { purgeCount: token.purge_count }
    });

    console.log('[auditPurge] Purge cancelled — no records deleted.');
    res.send(purgeHtmlPage(
      '✅ Purge cancelled',
      'No records were deleted. The next scheduled check will run on the 1st of next month.',
      true
    ));
  } catch (err) {
    console.error('Purge cancel error:', err.message);
    res.status(500).send(purgeHtmlPage('❌ Error', 'An error occurred. Contact your system administrator.', false));
  }
});

function purgeHtmlPage(title, message, ok) {
  const color = ok ? '#2E7D32' : '#C62828';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title>
    <style>body{font-family:'Helvetica Neue',Arial,sans-serif;background:#F0F4F8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .card{background:#fff;border-radius:10px;padding:2.5rem;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1);}
    h1{color:${color};font-size:22px;margin-bottom:12px;}
    p{color:#475569;font-size:15px;line-height:1.6;}
    a{display:inline-block;margin-top:1.5rem;padding:10px 24px;background:#042C53;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;}</style>
  </head><body><div class="card">
    <h1>${title}</h1><p>${message}</p>
    <a href="/">Back to ROI Builder</a>
  </div></body></html>`;
}

/* ── Health check — exempt from rate limiting ── */
app.get('/health', async (req, res) => {
  try {
    if (PROD && !process.env.DATABASE_URL) {
      return res.status(503).json({
        status: 'error',
        version: APP_VERSION,
        database: 'missing',
        phase: 'production'
      });
    }

    if (process.env.DATABASE_URL) {
      await db().query('SELECT 1 AS healthy');
    }

    res.json({
      status: 'ok',
      version: APP_VERSION,
      database: process.env.DATABASE_URL ? 'connected' : 'not-configured',
      phase: PROD ? 'production' : 'development'
    });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({
      status: 'error',
      version: APP_VERSION,
      database: 'unavailable',
      phase: PROD ? 'production' : 'development'
    });
  }
});

/* ── AI Enhance health check ── */
app.get('/api/enhance/health', (req, res) => {
  let parseError = null;
  try { new URL(ANTHROPIC_BASE_URL); } catch(e) { parseError = e.message; }
  res.json({
    status: !!process.env.ANTHROPIC_API_KEY && !parseError ? 'ok' : 'error',
    anthropicKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    anthropicBaseUrl: ANTHROPIC_BASE_URL,
    anthropicModel: ANTHROPIC_MODEL,
    baseUrlValid: !parseError,
    baseUrlError: parseError
  });
});

/* ── AI Enhance proxy — requires auth ── */
app.post('/api/enhance', requireAuth, aiLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });
  const { model, max_tokens, messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required.' });
  const payload = { model: model || ANTHROPIC_MODEL, max_tokens: max_tokens || 1000, messages };
  if (typeof system === 'string' && system.trim()) payload.system = system;
  const body = JSON.stringify(payload);
  let baseUrl;
  try { baseUrl = new URL(ANTHROPIC_BASE_URL); } catch(e) { return res.status(500).json({ error: 'Bad ANTHROPIC_BASE_URL.' }); }
  try {
    const resp = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: baseUrl.hostname, path: '/v1/messages', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      }, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve({status:r.statusCode,body:d})); });
      req2.on('error', reject);
      req2.setTimeout(30000, () => { req2.destroy(); reject(new Error('Timeout')); });
      req2.write(body); req2.end();
    });
    res.status(resp.status).send(resp.body);
  } catch(err) {
    console.error('Anthropic proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach Anthropic API: ' + err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════
   COMPETITIVE RESEARCH — AI-powered dual-source comparison
   POST /api/competitive/ci-source       — admin: save CI product source
   GET  /api/competitive/ci-source       — get active CI source info
   POST /api/competitive/research        — run AI comparison
   ══════════════════════════════════════════════════════════════════ */

/* Helper: fetch a URL server-side (avoids CORS, handles redirects) */
async function fetchUrlContent(url) {
  const { URL: NURL } = require('url');
  const https2 = require('https');
  const http2  = require('http');
  return new Promise((resolve) => {
    try {
      const parsed = new NURL(url);
      const mod = parsed.protocol === 'https:' ? https2 : http2;
      const opts = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CloudInventoryResearch/1.0)',
          'Accept': 'text/html,application/xhtml+xml,*/*'
        },
        timeout: 12000
      };
      const req = mod.request(opts, (res) => {
        /* Follow one redirect */
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          fetchUrlContent(res.headers.location).then(resolve);
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', c => { if (data.length < 200000) data += c; });
        res.on('end', () => {
          /* Strip HTML tags, collapse whitespace, keep meaningful text */
          const text = data
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/\s{3,}/g, '\n\n')
            .trim()
            .slice(0, 15000); /* cap at 15K chars */
          resolve({ ok: true, text, statusCode: res.statusCode });
        });
      });
      req.on('error', e => resolve({ ok: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
      req.end();
    } catch(e) { resolve({ ok: false, error: e.message }); }
  });
}

/* Helper: call Anthropic synchronously (re-uses existing https pattern) */
async function callAnthropicDirect(messages, system, maxTokens) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const payload = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens || 2000,
    system,
    messages
  });
  let baseUrl;
  try { baseUrl = new URL(ANTHROPIC_BASE_URL); } catch(e) { throw new Error('Bad ANTHROPIC_BASE_URL'); }
  return new Promise((resolve, reject) => {
    const req2 = https.request({
      hostname: baseUrl.hostname,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('Bad Anthropic response')); }
      });
    });
    req2.on('error', reject);
    req2.setTimeout(45000, () => { req2.destroy(); reject(new Error('Anthropic timeout')); });
    req2.write(payload);
    req2.end();
  });
}

/* GET  /api/competitive/ci-source — active CI source info */
app.get('/api/competitive/ci-source', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const { rows } = await query(
      `SELECT id, source_type, source_name, source_url, file_size, created_at
       FROM ci_product_sources WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1`
    );
    res.json(rows[0] || null);
  } catch(err) {
    console.error('ci-source GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch CI source.' });
  }
});

/* POST /api/competitive/ci-source — admin: save new canonical CI source */
app.post('/api/competitive/ci-source', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const { sourceType, sourceName, sourceUrl, contentText, fileSize } = req.body;
    if (!sourceType || !sourceName) return res.status(400).json({ error: 'sourceType and sourceName required.' });
    const { query } = db();
    /* Deactivate previous */
    await query(`UPDATE ci_product_sources SET is_active = FALSE WHERE is_active = TRUE`);
    /* Insert new */
    const { rows } = await query(
      `INSERT INTO ci_product_sources (source_type, source_name, source_url, content_text, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, source_name, created_at`,
      [sourceType, sourceName, sourceUrl || null, contentText || null, fileSize || null, req.user.id]
    );
    const { log } = require('./src/audit');
    await log({ userId: req.user.id, action: 'admin.ci_source_updated', entityType: 'admin', detail: { sourceName, sourceType }, ipAddress: req.ip });
    res.json({ ok: true, source: rows[0] });
  } catch(err) {
    console.error('ci-source POST error:', err.message);
    res.status(500).json({ error: 'Failed to save CI source.' });
  }
});

/* POST /api/competitive/research — AI dual-source comparison */
app.post('/api/competitive/research', requireAuth, aiLimiter, async (req, res) => {
  try {
    const {
      competitorKey, competitorName, competitorUrl,
      competitorFileText,   /* base64-decoded text from uploaded competitor doc */
      ciSourceOverride,     /* { text, name } — rep-session override of canonical CI source */
    } = req.body;

    if (!competitorKey && !competitorName) return res.status(400).json({ error: 'competitorName required.' });

    /* Step 1: resolve CI product content */
    let ciContent = '';
    let ciSourceLabel = 'Cloud Inventory curated battlecard';
    if (ciSourceOverride && ciSourceOverride.text) {
      ciContent = ciSourceOverride.text.slice(0, 12000);
      ciSourceLabel = ciSourceOverride.name || 'Uploaded CI document';
    } else {
      const { query } = db();
      const { rows } = await query(
        `SELECT source_type, source_name, source_url, content_text FROM ci_product_sources WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1`
      );
      if (rows[0]) {
        if (rows[0].content_text) {
          ciContent = rows[0].content_text.slice(0, 12000);
          ciSourceLabel = rows[0].source_name;
        } else if (rows[0].source_url) {
          const fetched = await fetchUrlContent(rows[0].source_url);
          if (fetched.ok) { ciContent = fetched.text; ciSourceLabel = rows[0].source_url; }
        }
      }
    }

    /* Step 2: resolve competitor content */
    let compContent = '';
    let compSourceLabel = competitorName || competitorKey || 'Competitor';
    let compFetchStatus = 'none';

    if (competitorFileText) {
      compContent = competitorFileText.slice(0, 12000);
      compSourceLabel = 'Uploaded competitor document';
      compFetchStatus = 'file';
    } else if (competitorUrl) {
      const fetched = await fetchUrlContent(competitorUrl);
      if (fetched.ok) {
        compContent = fetched.text;
        compFetchStatus = 'fetched';
      } else {
        compFetchStatus = 'failed';
      }
    }

    /* Step 3: Build system prompt + call Anthropic */
    const system = `You are a B2B enterprise software sales strategist specializing in inventory management and field operations technology. You produce structured, factual competitive battlecard analysis grounded strictly in the source materials provided. You NEVER invent capabilities or prices not mentioned in the sources. When you infer something not explicitly stated, you flag it with "inferred" in the confidence field.`;

    const userPrompt = `Compare Cloud Inventory against ${competitorName || competitorKey} using the source materials below.

=== CLOUD INVENTORY SOURCE (${ciSourceLabel}) ===
${ciContent || '[No CI source provided — use general knowledge of Cloud Inventory Platform: ERP-agnostic inventory execution, warehouse + production + field, no-code configuration, offline-first mobile, API-first multi-ERP integration]'}

=== COMPETITOR SOURCE (${compSourceLabel}) ===
${compContent || `[No competitor document fetched — use general market knowledge about ${competitorName || competitorKey}]`}

Produce a JSON object with this exact structure:
{
  "competitorName": "Full official product name",
  "ciSourceLabel": "${ciSourceLabel}",
  "compSourceLabel": "${compSourceLabel}",
  "compFetchStatus": "${compFetchStatus}",
  "meta": {
    "cost": "Typical implementation/subscription cost range",
    "timeToValue": "Typical time to go-live",
    "maintenance": "Ongoing maintenance cost or model"
  },
  "diffs": [
    {
      "dimension": "Short dimension name (e.g. Mobile UX)",
      "current": "What our battlecard previously said about this",
      "updated": "What the source material now shows",
      "changed": true/false,
      "confidence": "high|medium|inferred",
      "sourceRef": "Where in the source doc this came from"
    }
  ],
  "competitorPain": [
    { "text": "Pain point or weakness of the competitor", "confidence": "high|medium|inferred", "sourceRef": "Source reference" }
  ],
  "ciAdvantages": [
    { "text": "Cloud Inventory advantage over this competitor", "confidence": "high|medium|inferred", "sourceRef": "Source reference" }
  ],
  "talkTrack": "A 3-5 sentence talk track for a sales rep to use when displacing this competitor. Must acknowledge any new capabilities they have while pivoting to CI advantages. Factual, confident, not hyperbolic.",
  "researchNotes": "1-2 sentences about what was and wasn't available in the source material, and what the rep should verify."
}

Return ONLY the JSON object. No markdown fences, no preamble.`;

    const aiResp = await callAnthropicDirect(
      [{ role: 'user', content: userPrompt }],
      system,
      2500
    );

    const rawText = (aiResp.content || []).map(b => b.text || '').join('');
    let parsed;
    try {
      const clean = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch(e) {
      console.error('AI response JSON parse failed:', rawText.slice(0, 200));
      return res.status(502).json({ error: 'AI returned malformed response. Try again.' });
    }

    /* Cache result */
    try {
      const { query } = db();
      await query(
        `INSERT INTO competitive_research_cache (competitor_key, competitor_url, competitor_name, result_json, created_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [competitorKey || null, competitorUrl || null, competitorName || null, JSON.stringify(parsed), req.user.id]
      );
    } catch(e) { /* cache failure is non-fatal */ }

    res.json({ ok: true, result: parsed, ciSourceLabel, compSourceLabel, compFetchStatus });
  } catch(err) {
    console.error('Competitive research error:', err.message);
    res.status(500).json({ error: 'Research failed: ' + err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════
   CLIENT-SIDE ERROR REPORTING
   POST /api/errors/client — browser JS errors → error_log table
   Rate-limited separately; no auth required (pre-login errors too).
   ══════════════════════════════════════════════════════════════════ */
const clientErrLimiter = rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false });

app.post('/api/errors/client', clientErrLimiter, async (req, res) => {
  try {
    const { message, source, stack, url, line, col, level } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const { logError } = require('./src/error-log');
    const errObj = { message: String(message).slice(0, 2000), stack: stack ? String(stack).slice(0, 4000) : null };
    await logError(errObj, {
      source: ('client:' + (source || 'js')).slice(0, 120),
      level:  level === 'warn' ? 'warn' : 'error',
      req:    { method: 'CLIENT', originalUrl: (url || '').slice(0, 500), user: req.user || null, ip: req.ip }
    });
    res.json({ ok: true });
  } catch(e) {
    /* Never cascade — silently swallow */
    res.json({ ok: false });
  }
});

/* ══════════════════════════════════════════════════════════════════
   SERVER-SIDE DOCUMENT GENERATION
   POST /api/export/battlecard-docx  — Word battlecard (.docx)
   POST /api/export/battlecard-pdf   — HTML print page for PDF
   All generation happens server-side; browser receives a file download.
   ══════════════════════════════════════════════════════════════════ */

app.post('/api/export/battlecard-docx', requireAuth, async (req, res) => {
  try {
    const { competitorName, cost, time, maint, pain, adv, talk, company, repName } = req.body;
    if (!competitorName) return res.status(400).json({ error: 'competitorName required' });

    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Footer,
      HeadingLevel, WidthType, BorderStyle, ShadingType, TableLayoutType, VerticalAlign
    } = require('docx');

    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const esc  = s => String(s || '');

    const mkPara = (runs, opts = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...opts });
    const mkRun  = (text, opts = {}) => new TextRun({ text: esc(text), size: 22, font: 'Calibri', ...opts });
    const hr = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '00A9CC' } }, spacing: { before: 120, after: 120 } });

    const metaRow = (label, value) => new TableRow({ children: [
      new TableCell({
        children: [mkPara(mkRun(label, { bold: true }))],
        width: { size: 3200, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }
      }),
      new TableCell({
        children: [mkPara(mkRun(value))],
        width: { size: 5800, type: WidthType.DXA },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }
      })
    ]});

    const maxRows = Math.max((pain || []).length, (adv || []).length);
    const battleRows = [
      new TableRow({ children: [
        new TableCell({ children: [mkPara(mkRun('Pain points with ' + competitorName, { bold: true, color: 'FFFFFF' }))],
          width: { size: 4500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: '991B1B' } }),
        new TableCell({ children: [mkPara(mkRun('Cloud Inventory advantages', { bold: true, color: 'FFFFFF' }))],
          width: { size: 4500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: '166534' } })
      ]}),
      ...Array.from({ length: maxRows }, (_, i) => new TableRow({ children: [
        new TableCell({ children: [i < (pain||[]).length
          ? mkPara([mkRun('\u2715  ', { bold: true, color: 'DC2626' }), mkRun(pain[i])], { spacing: { before: 60, after: 60 } })
          : new Paragraph({})],
          width: { size: 4500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'FEF9F9' },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'F1F5F9' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } }
        }),
        new TableCell({ children: [i < (adv||[]).length
          ? mkPara([mkRun('\u2713  ', { bold: true, color: '16A34A' }), mkRun(adv[i])], { spacing: { before: 60, after: 60 } })
          : new Paragraph({})],
          width: { size: 4500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'F0FDF4' },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'F1F5F9' } }
        })
      ]}))
    ];

    const children = [
      mkPara(mkRun('Competitive Battlecard: ' + competitorName, { bold: true, size: 36, color: '1E2931' }), { spacing: { after: 80 } }),
      mkPara(mkRun(esc(company) + (repName ? '  \u00b7  Prepared by ' + esc(repName) : '') + '  \u00b7  ' + date, { size: 20, color: '64748B' }), { spacing: { after: 160 } }),
      hr(),
      new Paragraph({ text: 'Current solution overview', heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } }),
      new Table({ rows: [metaRow('Typical cost', esc(cost)), metaRow('Time to value', esc(time)), metaRow('Ongoing maintenance', esc(maint))],
        width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [3200, 5800] }),
      new Paragraph({ spacing: { after: 200 } }),
      new Paragraph({ text: 'Battlecard', heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } }),
      new Table({ rows: battleRows, width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [4500, 4500] }),
      new Paragraph({ spacing: { after: 200 } }),
    ];

    if (talk) {
      children.push(new Paragraph({ text: 'Talk track', heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } }));
      children.push(mkPara(mkRun(talk, { italics: true }), {
        shading: { type: ShadingType.CLEAR, fill: 'F0F9FF' },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: '00A9CC' } },
        indent: { left: 200 }, spacing: { before: 80, after: 80 }
      }));
    }

    const doc  = new Document({ sections: [{
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            children: [mkRun('© ' + new Date().getFullYear() + ' Cloud Inventory. Confidential and proprietary. Prepared for ' + esc(company || 'the intended recipient') + '.', { size: 16, color: '64748B' })],
            alignment: 'center'
          })
        ] })
      },
      children
    }] });
    const buf  = await Packer.toBuffer(doc);
    const safe = esc(competitorName).replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `Battlecard-${safe}-${new Date().toISOString().split('T')[0]}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    console.error('battlecard-docx error:', err.message);
    res.status(500).json({ error: 'Word export failed: ' + err.message });
  }
});
/* Customer-ready executive proposal.  The browser sends only the fields the
   rep has reviewed in the proposal workspace; this creates a real editable
   Word file instead of converting a PDF or HTML printout. */
app.post('/api/export/proposal-docx', requireAuth, async (req, res) => {
  try {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Footer,
      HeadingLevel, WidthType, BorderStyle, ShadingType, TableLayoutType, AlignmentType } = require('docx');
    const clean = (value, max = 1600) => String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
    const list = (value, limit = 12) => Array.isArray(value) ? value.slice(0, limit) : [];
    const company = clean(req.body.company, 160) || 'Prospect';
    const title = clean(req.body.title, 220) || (company + ' executive proposal');
    const text = (value, opts = {}) => new TextRun({ text: clean(value), font: 'Calibri', size: 21, ...opts });
    const para = (value, opts = {}) => new Paragraph({ children: [text(value, opts.run || {})], ...opts });
    const heading = value => new Paragraph({ text: clean(value), heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 90 } });
    const bullets = values => list(values).map(item => new Paragraph({ children:[text(typeof item === 'string' ? item : '')], bullet:{level:0}, spacing:{after:60} }));
    const table = (values, left, right) => new Table({ rows: list(values).map(row => new TableRow({ children:[
      new TableCell({ children:[para(row[left], { run:{ bold:true } })], width:{size:4300,type:WidthType.DXA}, shading:{type:ShadingType.CLEAR,fill:'F8FAFC'}, borders:{bottom:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'}} }),
      new TableCell({ children:[para(row[right])], width:{size:4700,type:WidthType.DXA}, borders:{bottom:{style:BorderStyle.SINGLE,size:1,color:'E2E8F0'}} })
    ] })), width:{size:9000,type:WidthType.DXA}, layout:TableLayoutType.FIXED, columnWidths:[4300,4700] });
    const meta = [
      { label:'Prepared for', value:company }, { label:'Prepared by', value:clean(req.body.preparedBy,160) || 'Cloud Inventory' },
      { label:'Solution', value:clean(req.body.solution,180) }, { label:'Contract term', value:clean(req.body.contractTerm,80) },
      { label:'Proposal date', value:clean(req.body.proposalDate,40) }, { label:'Valid through', value:clean(req.body.validThrough,40) }
    ];
    const children = [
      para('CLOUD INVENTORY', { alignment:AlignmentType.LEFT, run:{bold:true,size:22,color:'007B94'} }),
      para('Commercial proposal', { run:{bold:true,size:22,color:'00A9CC'}, spacing:{before:160,after:80} }),
      para(title, { run:{bold:true,size:40,color:'1E2931'}, spacing:{after:110} }),
      para('Prepared for ' + company, { run:{size:24,color:'475569'}, spacing:{after:160} }),
      table(meta, 'label', 'value'),
      heading('Executive summary'), para(req.body.situation),
      new Paragraph({ text:'Our recommendation', heading:HeadingLevel.HEADING_3, spacing:{before:150,after:50} }), para(req.body.recommendation),
      new Paragraph({ text:'Expected outcome', heading:HeadingLevel.HEADING_3, spacing:{before:150,after:50} }), para(req.body.outcome, { shading:{type:ShadingType.CLEAR,fill:'E5F7FA'}, border:{left:{style:BorderStyle.SINGLE,size:12,color:'00A9CC'}}, indent:{left:160}, spacing:{before:100,after:100} }),
      heading('The value case'),
      new Paragraph({ text:'Why act', heading:HeadingLevel.HEADING_3 }), para(req.body.whyAct),
      new Paragraph({ text:'Why Cloud Inventory', heading:HeadingLevel.HEADING_3 }), para(req.body.whyCloud),
      new Paragraph({ text:'Why now', heading:HeadingLevel.HEADING_3 }), para(req.body.whyNow),
      heading('Solution and investment'), new Paragraph({ text:'In scope', heading:HeadingLevel.HEADING_3 }), ...bullets(req.body.scope),
      new Paragraph({ text:'Commercial investment', heading:HeadingLevel.HEADING_3, spacing:{before:140,after:60} }), table(req.body.investment, 'label', 'value'),
      new Paragraph({ text:'Delivery approach', heading:HeadingLevel.HEADING_3, spacing:{before:140,after:50} }), para(req.body.timeline),
      heading('Success and next steps'), new Paragraph({ text:'How we will measure success', heading:HeadingLevel.HEADING_3, spacing:{after:60} }), table(req.body.success, 'metric', 'target'),
      new Paragraph({ text:'Recommended next steps', heading:HeadingLevel.HEADING_3, spacing:{before:140,after:60} }), ...bullets(req.body.nextSteps)
    ];
    const doc = new Document({ sections:[{ footers:{ default:new Footer({ children:[new Paragraph({ children:[text('© ' + new Date().getFullYear() + ' Cloud Inventory · Confidential and proprietary · Prepared for ' + company, {size:16,color:'64748B'})], alignment:AlignmentType.CENTER })] }) }, children }] });
    const buffer = await Packer.toBuffer(doc);
    const safe = company.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Prospect';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Executive-Proposal-${safe}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('proposal-docx error:', err.message);
    res.status(500).json({ error:'Word export failed.' });
  }
});

/* Natural-language question over aggregate deal data (Admin Analytics).
   Two-step: (1) AI picks which pre-written query/queries answer the
   question, from the fixed catalog in src/deal-queries.js — the model
   never writes SQL; (2) server runs those exact queries; (3) AI phrases
   the actual results in plain English. Admin only. */
app.post('/api/analytics/ask', requireAuth, aiLimiter, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const { question } = req.body || {};
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question required.' });
    }
    const { pickDealQueries, phraseQueryResults } = require('./src/ai');
    const { getCatalogDescriptions, runCatalogQuery, VALID_QUERY_NAMES } = require('./src/deal-queries');
    const { query } = db();

    const chosenNames = await pickDealQueries({
      question: question.trim(),
      catalogDescriptions: getCatalogDescriptions()
    });
    /* Re-validate every chosen name against the allow-list — never trust
       the model's output even after pickDealQueries already filters. */
    const safeNames = chosenNames.filter(n => VALID_QUERY_NAMES.includes(n)).slice(0, 2);

    if (!safeNames.length) {
      return res.json({
        answer: "I don't have a pre-built report that answers that. Try asking about win rate by rep, win rate by industry, whether prospect-supplied data correlates with winning, which drivers resonate in closed deals, stakeholder coverage, rep activity, or open deal stages.",
        queriesUsed: []
      });
    }

    const results = {};
    for (const name of safeNames) {
      results[name] = await runCatalogQuery(name, query);
    }

    const answer = await phraseQueryResults({ question: question.trim(), results });
    res.json({
      answer: answer || 'Found the data but could not phrase a summary — raw results are in queriesUsed.',
      queriesUsed: safeNames,
      raw: results
    });
  } catch (err) {
    console.error('analytics/ask error:', err.message);
    res.status(500).json({ error: 'Could not process that question right now.' });
  }
});

/* Extract numeric ROI figures from a free-text discovery answer.
   Rep-triggered (button click), so this is auth-gated and rate-limited
   like /api/enhance, but the field-validation whitelist lives server-side
   in src/ai.js rather than trusting client-side JSON parsing of the model's
   output — the client only ever sees pre-validated { field, value, reason }
   suggestions it can apply or dismiss. */
app.post('/api/discovery/extract-figures', requireAuth, aiLimiter, async (req, res) => {
  try {
    const { questionText, answerText } = req.body || {};
    if (typeof answerText !== 'string' || typeof questionText !== 'string') {
      return res.status(400).json({ error: 'questionText and answerText required.' });
    }
    const { extractDiscoveryFigures } = require('./src/ai');
    const suggestions = await extractDiscoveryFigures({ questionText, answerText });
    res.json({ suggestions });
  } catch (err) {
    console.error('extract-figures error:', err.message);
    res.json({ suggestions: [] });  /* never a hard error — the rep just sees no suggestions */
  }
});

/* Authentication is handled by src/routes/auth.js. */

/* ── Public discovery route hardening ─────────────────────────────
   Prospect questionnaire links are intentionally public bearer-token URLs.
   These routes must not require an authenticated user session. Responses are
   no-store to avoid stale proxy/browser failures, and logging uses only a
   short token hash reference so reusable tokens are not written to logs. */
app.use('/api/discovery/sessions', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

function discoveryTokenRef(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex').slice(0, 12);
}

/* Validate a discovery token: correct format AND exists as an active
   session in the database. Async because it checks the DB.
   All four endpoints that accept prospect tokens call this. */
async function isValidDiscoveryToken(token) {
  if (!/^[a-f0-9]{64}$/i.test(String(token || '').trim())) return false;
  try {
    const { query } = db();
    const { rows } = await query(
      `SELECT id FROM discovery_sessions WHERE token = $1 AND is_active = TRUE LIMIT 1`,
      [token]
    );
    return rows.length > 0;
  } catch (e) {
    console.error('isValidDiscoveryToken DB error:', e.message);
    return false;
  }
}

/* ── Discovery sessions ─────────────────────────────────────────── */

app.get('/api/discovery/sessions', requireAuth, async (req, res) => {
  try {
    const { scenarioId } = req.query;
    const { query } = db();
    const { rows } = await query(
      `SELECT ds.id, ds.token, ds.scenario_id, ds.industry, ds.company,
              ds.is_active, ds.expires_at, ds.created_at, ds.updated_at,
              ds.open_count, ds.first_opened, ds.last_opened,
              ds.submitted_at, ds.answer_count,
              COALESCE(
                json_agg(json_build_object('questionId', da.question_id, 'answer', da.answer, 'enteredBy', da.entered_by) ORDER BY da.question_id)
                FILTER (WHERE da.id IS NOT NULL), '[]'::json
              ) AS answers
       FROM discovery_sessions ds
       LEFT JOIN discovery_answers da ON da.session_id = ds.id
       WHERE ds.owner_id = $1 AND ds.is_active = TRUE
         ${scenarioId ? 'AND ds.scenario_id = $2' : ''}
       GROUP BY ds.id ORDER BY ds.updated_at DESC LIMIT 20`,
      scenarioId ? [req.user.id, scenarioId] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load discovery sessions.' }); }
});

app.post('/api/discovery/sessions', requireAuth, async (req, res) => {
  try {
    const { scenarioId, industry, company } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const { query } = db();
    /* Read has_field_inventory from the customer record so the prospect link
       carries it without a live JOIN on every page load. */
    let hasFieldInventory = false;
    if (scenarioId) {
      const { rows: scRows } = await query(
        `SELECT c.has_field_inventory FROM scenarios s
         JOIN customers c ON c.id = s.customer_id
         WHERE s.id = $1`, [scenarioId]
      );
      if (scRows.length) hasFieldInventory = !!scRows[0].has_field_inventory;
    }
    const { rows } = await query(
      `INSERT INTO discovery_sessions (scenario_id, owner_id, token, industry, company, has_field_inventory)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, token, created_at`,
      [scenarioId || null, req.user.id, token, industry || 'default', company || '', hasFieldInventory]
    );
    const { log, ACTIONS } = require('./src/audit');
    await log({ userId: req.user.id, action: ACTIONS.DISCOVERY_LINK_GENERATED, entityType: 'discovery_session', entityId: rows[0].id, ipAddress: req.ip });
    res.json({ ok: true, token: rows[0].token, sessionId: rows[0].id, prospectUrl: `${APP_URL}/prospect.html?token=${rows[0].token}` });
  } catch(err) { res.status(500).json({ error: 'Failed to create discovery session.' }); }
});

/* ── Customer field-inventory flag ──────────────────────────────────
   GET  /api/customers/:id/field-inventory  — read the flag
   PATCH /api/customers/:id/field-inventory  — set true/false        */
app.get('/api/customers/:id/field-inventory', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const { rows } = await query(
      `SELECT has_field_inventory FROM customers WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ hasFieldInventory: rows[0].has_field_inventory });
  } catch(err) { res.status(500).json({ error: 'Failed to read flag.' }); }
});

app.patch('/api/customers/:id/field-inventory', requireAuth, async (req, res) => {
  try {
    const val = !!req.body.hasFieldInventory;
    const { query } = db();
    const { rowCount } = await query(
      `UPDATE customers SET has_field_inventory = $1, updated_at = NOW()
       WHERE id = $2 AND owner_id = $3`,
      [val, req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ ok: true, hasFieldInventory: val });
  } catch(err) { res.status(500).json({ error: 'Failed to update flag.' }); }
});

app.get('/api/discovery/sessions/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!await isValidDiscoveryToken(token)) {
      console.warn('Discovery session invalid token', {
        tokenReference: discoveryTokenRef(token),
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(400).json({ error: 'Invalid token.' });
    }
    const { query } = db();
    const { rows } = await query(
      `SELECT ds.id, ds.token, ds.industry, ds.company, ds.is_active, ds.expires_at,
              ds.has_field_inventory,
              COALESCE(json_agg(json_build_object('questionId', da.question_id, 'answer', da.answer, 'enteredBy', da.entered_by) ORDER BY da.question_id) FILTER (WHERE da.id IS NOT NULL), '[]'::json) AS answers
       FROM discovery_sessions ds LEFT JOIN discovery_answers da ON da.session_id = ds.id WHERE ds.token = $1 GROUP BY ds.id`, [token]
    );
    if (!rows.length) {
      console.warn('Discovery session not found', {
        tokenReference: discoveryTokenRef(token),
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(404).json({ error: 'Session not found.' });
    }
    const s = rows[0];
    if (!s.is_active) return res.status(410).json({ error: 'This prospect link is no longer active.' });
    if (s.expires_at && new Date(s.expires_at) < new Date()) return res.status(410).json({ error: 'This prospect link has expired.' });
    /* Engagement tracking: count this open (fire-and-forget, never blocks). */
    query(`UPDATE discovery_sessions
           SET open_count = COALESCE(open_count,0) + 1,
               first_opened = COALESCE(first_opened, NOW()),
               last_opened = NOW()
           WHERE id = $1`, [s.id]).catch(() => {});
    res.json(s);
  } catch(err) { res.status(500).json({ error: 'Failed to load discovery session.' }); }
});

app.put('/api/discovery/sessions/:token/answers', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    const { questionId, answer, enteredBy } = req.body;
    if (!await isValidDiscoveryToken(token) || !questionId) {
      return res.status(400).json({ error: 'valid token and questionId required.' });
    }
    const { query } = db();
    const { rows: sessions } = await query('SELECT id, is_active, expires_at FROM discovery_sessions WHERE token = $1', [token]);
    if (!sessions.length) return res.status(404).json({ error: 'Session not found.' });
    const s = sessions[0];
    if (!s.is_active) return res.status(410).json({ error: 'Session is no longer active.' });
    if (s.expires_at && new Date(s.expires_at) < new Date()) return res.status(410).json({ error: 'Session has expired.' });
    await query(
      `INSERT INTO discovery_answers (session_id, question_id, answer, entered_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, question_id) DO UPDATE SET answer = EXCLUDED.answer, entered_by = EXCLUDED.entered_by, updated_at = NOW()`,
      [s.id, questionId, answer || '', enteredBy || 'prospect']
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Failed to save answer.' }); }
});

/* ── Prospect submits their discovery answers ───────────────────────
   Called by confirmSubmit() on the prospect page after the review step.
   Stamps submitted_at, emails the rep, logs the audit event.
   Fire-and-forget on email — submission always succeeds even if email fails. */
app.post('/api/discovery/sessions/:token/submit', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!await isValidDiscoveryToken(token)) {
      return res.status(403).json({ error: 'Invalid or expired session.' });
    }
    const { query } = db();

    /* Count real answers and stamp submitted_at */
    const { rows } = await query(
      `UPDATE discovery_sessions ds
       SET submitted_at = COALESCE(ds.submitted_at, NOW()),
           answer_count = (
             SELECT COUNT(*) FROM discovery_answers da
             WHERE da.session_id = ds.id
               AND da.answer IS NOT NULL AND da.answer <> ''
           )
       WHERE ds.token = $1 AND ds.is_active = TRUE
       RETURNING ds.id, ds.submitted_at, ds.answer_count,
                 ds.company, ds.owner_id,
                 (ds.submitted_at IS NULL) AS first_submission`,
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Session not found or inactive.' });
    }

    const s = rows[0];
    res.json({ ok: true, submittedAt: s.submitted_at, answerCount: s.answer_count });

    /* ── Async: email the rep (never blocks the response) ── */
    if (s.first_submission !== false) {
      try {
        const { rows: userRows } = await query(
          `SELECT u.email, u.username FROM users u WHERE u.id = $1`, [s.owner_id]
        );
        if (userRows.length) {
          const rep     = userRows[0];
          const discUrl = `${APP_URL}/?tab=disc`;
          const { sendDiscoverySubmitted } = require('./src/email');
          await sendDiscoverySubmitted(
            rep.email,
            rep.username,
            s.company || 'Your prospect',
            s.answer_count,
            discUrl
          );
        }
      } catch (emailErr) {
        console.error('[discovery submit] email failed:', emailErr.message);
      }

      /* Audit log */
      try {
        const { log, ACTIONS } = require('./src/audit');
        await log({
          userId:     s.owner_id,
          action:     ACTIONS.DISCOVERY_ANSWERS_SUBMIT,
          entityType: 'discovery_session',
          entityId:   s.id,
          detail:     { company: s.company, answerCount: s.answer_count }
        });
      } catch (auditErr) {
        console.error('[discovery submit] audit log failed:', auditErr.message);
      }
    }
  } catch (err) {
    console.error('[discovery submit] error:', err.message);
    res.status(500).json({ error: 'Failed to record submission.' });
  }
});

/* ── Unread submission count (for nav badge) ────────────────────────
   Returns the count of sessions that have been submitted but the rep
   hasn't opened the Discovery tab since submission. "Unread" is
   approximated as submitted_at > last time the rep loaded the disc tab,
   which we track via a lightweight last_disc_viewed timestamp on the
   session itself. Simple and avoids a separate read-receipts table. */
app.get('/api/discovery/unread-count', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const { rows } = await query(
      `SELECT COUNT(*) AS count FROM discovery_sessions
       WHERE owner_id = $1
         AND submitted_at IS NOT NULL
         AND is_active = TRUE
         AND (last_disc_viewed IS NULL OR submitted_at > last_disc_viewed)`,
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

/* ── Mark Discovery tab viewed (clears badge) ─────────────────────── */
app.post('/api/discovery/mark-viewed', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    await query(
      `UPDATE discovery_sessions SET last_disc_viewed = NOW()
       WHERE owner_id = $1 AND submitted_at IS NOT NULL AND is_active = TRUE`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

app.put('/api/discovery/sessions/:token/rotate', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const newToken = crypto.randomBytes(32).toString('hex');
    const { rows } = await query(
      'UPDATE discovery_sessions SET token = $1, token_rotated_at = NOW() WHERE token = $2 AND is_active = TRUE RETURNING id',
      [newToken, String(req.params.token || '')]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found or already inactive.' });
    res.json({ ok: true, token: newToken, prospectUrl: `${APP_URL}/prospect.html?token=${newToken}` });
  } catch(err) { res.status(500).json({ error: 'Failed to rotate session token.' }); }
});

app.delete('/api/discovery/sessions/:token', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const { rows } = await query('UPDATE discovery_sessions SET is_active = FALSE WHERE token = $1 RETURNING id', [String(req.params.token || '')]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found.' });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Failed to revoke session.' }); }
});

/* Legacy endpoint — returns 410 Gone */
app.post('/api/prospect-sessions', (req, res) => res.status(410).json({ error: 'Replaced by /api/discovery/sessions' }));

/* ═══════════════════════════════════════════════════════════════════
   BUSINESS-CASE SHARES (v3.1) — link-view delivery tracking (no pixels).
   A rep creates a share token for a scenario; each prospect view of the
   hosted business-case link is counted. Rep sees view engagement.
   ═══════════════════════════════════════════════════════════════════ */

app.post('/api/business-case-shares', requireAuth, async (req, res) => {
  try {
    const { scenarioId, company, title } = req.body || {};
    if (!scenarioId) return res.status(400).json({ error: 'scenarioId required.' });
    const { query } = db();
    const token = crypto.randomBytes(32).toString('hex');
    /* Look up base_id so the business case link always shows the latest version. */
    const { rows: sRows } = await query(
      `SELECT base_id FROM scenarios WHERE id = $1`, [scenarioId]
    );
    if (!sRows.length) return res.status(404).json({ error: 'Scenario not found.' });
    const baseId = sRows[0].base_id;
    const { rows } = await query(
      `INSERT INTO business_case_shares (token, scenario_id, scenario_base_id, owner_id, company, title)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, token, created_at`,
      [token, scenarioId, baseId, req.user.id, company || '', title || '']
    );
    res.json({ ok: true, token: rows[0].token, shareUrl: `${APP_URL}/business-case.html?token=${rows[0].token}` });
  } catch (err) { res.status(500).json({ error: 'Failed to create business-case share.' }); }
});

app.get('/api/business-case-shares/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Invalid token.' });
    const { query } = db();
    const { rows } = await query(
      `SELECT b.id, b.is_active, b.company, b.title, s.data
       FROM business_case_shares b
       JOIN scenarios s ON s.base_id = b.scenario_base_id AND s.is_current = TRUE
       WHERE b.token = $1`, [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Business case not found.' });
    if (!rows[0].is_active) return res.status(410).json({ error: 'This business case link is no longer active.' });
    query(`UPDATE business_case_shares
           SET view_count = COALESCE(view_count,0) + 1,
               first_viewed = COALESCE(first_viewed, NOW()),
               last_viewed = NOW()
           WHERE id = $1`, [rows[0].id]).catch(() => {});
    res.set('Cache-Control', 'no-store');
    res.json({ company: rows[0].company, title: rows[0].title, data: rows[0].data });
  } catch (err) { res.status(500).json({ error: 'Failed to load business case.' }); }
});

/* Prospect-adjustable assumptions — record what the CFO changed */
app.post('/api/business-case-shares/:token/assumptions', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Invalid token.' });
    const { adjustments } = req.body || {};
    if (!adjustments || typeof adjustments !== 'object') return res.status(400).json({ error: 'adjustments required.' });
    const { query } = db();
    const { rows } = await query(
      `SELECT b.id, b.owner_id, b.company, u.email, u.username
       FROM business_case_shares b JOIN users u ON u.id = b.owner_id
       WHERE b.token = $1 AND b.is_active = TRUE`, [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Share not found.' });
    /* Store adjustments on the share row */
    await query(
      `UPDATE business_case_shares
       SET prospect_adjustments = $1, prospect_adjusted_at = NOW()
       WHERE token = $2`,
      [JSON.stringify(adjustments), token]
    );
    /* Email the rep — with an AI-generated one-sentence interpretation
       when the API key is configured. Falls back to raw numbers only
       if the AI call fails or isn't configured; never blocks the email. */
    try {
      const { sendProspectAssumptionChange } = require('./src/email');
      const { interpretAssumptionChange } = require('./src/ai');
      const insight = await interpretAssumptionChange({
        company: rows[0].company,
        adjustments,
        baseValues: null
      });
      await sendProspectAssumptionChange(rows[0].email, rows[0].username, rows[0].company, adjustments, insight);
    } catch(e) { /* non-blocking */ }
    res.json({ ok: true });
  } catch (err) { console.error('assumptions post error:', err.message); res.status(500).json({ error: 'Failed.' }); }
});

app.get('/api/business-case-shares', requireAuth, async (req, res) => {
  try {
    const { scenarioId } = req.query;
    const { query } = db();
    const { rows } = await query(
      `SELECT id, token, scenario_id, company, title, is_active, view_count, first_viewed, last_viewed, created_at
       FROM business_case_shares
       WHERE owner_id = $1 ${scenarioId ? 'AND scenario_id = $2' : ''}
       ORDER BY created_at DESC LIMIT 20`,
      scenarioId ? [req.user.id, scenarioId] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load shares.' }); }
});

/* ═══════════════════════════════════════════════════════════════════
   SCENARIO SHARES — trackable, revocable links to a saved scenario.
   Replaces the old index.html#share=<base64> link, which embedded the whole
   scenario in the URL and so could be neither tracked nor revoked.
   Views are counted server-side on fetch — no tracking pixels.
   ═══════════════════════════════════════════════════════════════════ */

app.post('/api/scenario-shares', requireAuth, async (req, res) => {
  try {
    const { scenarioId, company, title } = req.body || {};
    if (!scenarioId) return res.status(400).json({ error: 'scenarioId required.' });
    const { query } = db();
    const token = crypto.randomBytes(32).toString('hex');
    /* Look up the base_id so the link always resolves to the latest version. */
    const { rows: sRows } = await query(
      `SELECT base_id FROM scenarios WHERE id = $1`, [scenarioId]
    );
    if (!sRows.length) return res.status(404).json({ error: 'Scenario not found.' });
    const baseId = sRows[0].base_id;
    const { rows } = await query(
      `INSERT INTO scenario_shares (token, scenario_id, scenario_base_id, owner_id, company, title)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING token`,
      [token, scenarioId, baseId, req.user.id, company || '', title || '']
    );
    res.json({ ok: true, token: rows[0].token, shareUrl: `${APP_URL}/?share=${rows[0].token}` });
  } catch (err) { res.status(500).json({ error: 'Failed to create share link.' }); }
});

app.get('/api/scenario-shares/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Invalid token.' });
    const { query } = db();
    const { rows } = await query(
      `SELECT sh.id, sh.is_active, sh.company, sh.title, s.data
       FROM scenario_shares sh
       JOIN scenarios s ON s.base_id = sh.scenario_base_id AND s.is_current = TRUE
       WHERE sh.token = $1`, [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Shared scenario not found.' });
    if (!rows[0].is_active) return res.status(410).json({ error: 'This share link is no longer active.' });
    query(`UPDATE scenario_shares
           SET view_count = COALESCE(view_count,0) + 1,
               first_viewed = COALESCE(first_viewed, NOW()),
               last_viewed = NOW()
           WHERE id = $1`, [rows[0].id]).catch(() => {});
    res.set('Cache-Control', 'no-store');
    res.json({ company: rows[0].company, title: rows[0].title, data: rows[0].data });
  } catch (err) { res.status(500).json({ error: 'Failed to load shared scenario.' }); }
});

app.get('/api/scenario-shares', requireAuth, async (req, res) => {
  try {
    const { scenarioId } = req.query;
    const { query } = db();
    const { rows } = await query(
      `SELECT id, token, scenario_id, company, title, is_active, view_count, first_viewed, last_viewed, created_at
       FROM scenario_shares
       WHERE owner_id = $1 ${scenarioId ? 'AND scenario_id = $2' : ''}
       ORDER BY created_at DESC LIMIT 20`,
      scenarioId ? [req.user.id, scenarioId] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load share links.' }); }
});

/* Revoke — the capability the old embedded-payload link could never offer. */
app.post('/api/scenario-shares/:id/revoke', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const { rowCount } = await query(
      `UPDATE scenario_shares SET is_active = FALSE WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Share link not found.' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Failed to revoke share link.' }); }
});

/* ── Prospect-scoped AI endpoint ────────────────────────────────────
   The /api/enhance proxy requires a session (requireAuth). Prospects on
   the discovery link have a discovery token but no session — so they
   need a separate, tightly-scoped endpoint. The system prompt is built
   server-side to ensure it cannot be overridden by the client. */
app.post('/api/prospect-assist', aiLimiter, async (req, res) => {
  try {
    const { token, messages } = req.body || {};
    if (!token || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'token and messages required.' });
    }
    /* Validate discovery token so only real prospect links can call this. */
    if (!await isValidDiscoveryToken(token)) {
      return res.status(403).json({ error: 'Invalid or expired session.' });
    }
    /* Hard-coded system prompt — client cannot override it. */
    const system = [
      'You are a helpful assistant on a business operations questionnaire page.',
      'A prospect is completing questions about their inventory and operations.',
      'ONLY answer questions about the questionnaire: what terms mean, what a good',
      'answer looks like, or where to find a number. Do NOT discuss Cloud Inventory',
      'products, pricing, ROI calculations, or the sales process. Do NOT benchmark',
      'or advise on what numbers "should" be. If asked anything outside this scope,',
      'say politely that you can only help with the questionnaire and suggest they',
      'contact their Cloud Inventory representative. Be concise and friendly.'
    ].join(' ');
    const payload = {
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system,
      messages: messages.slice(-8)
    };
    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const data = await aiResp.json();
    if (!aiResp.ok) return res.status(502).json({ error: 'AI service error.' });
    res.json(data);
  } catch (err) {
    console.error('prospect-assist error:', err.message);
    res.status(500).json({ error: 'Assistant unavailable.' });
  }
});


app.get('/login.html',           (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/change-password.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'change-password.html')));
app.get('/reset-password.html',  (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'reset-password.html')));
app.get('/print.html',           (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'print.html')));
app.get('/prospect-map.html',  (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'prospect-map.html')));
app.get('/prospect.html',        (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'prospect.html')));
app.get('/business-case.html',   (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'business-case.html')));

/* SPA fallback */
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

/* ── ⑤ Error handler — never leak stack traces to clients ── */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  /* Persist for in-app visibility (best-effort, never throws). */
  try {
    require('./src/error-log').logError(err, { req, source: 'express', status });
  } catch (e) { console.error('Unhandled error:', err.message); }
  res.status(status).json({ error: 'An unexpected error occurred.' });
});

/* ═══════ STARTUP ═══════ */
let server;
let cleanupTimer;
let purgeTask;
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase(maxAttempts = 60, delayMs = 3000) {
  if (!process.env.DATABASE_URL) {
    if (PROD) {
      throw new Error('DATABASE_URL is required in production.');
    }
    console.warn('⚠️  DATABASE_URL not set — running without database in development.');
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const dbTime = await db().testConnection();
      console.log('✅ PostgreSQL connected — server time:', dbTime);
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw new Error(`PostgreSQL not ready after ${maxAttempts} attempts: ${err.message}`);
      }
      console.warn(`PostgreSQL not ready (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
}

function startCleanupTimer() {
  cleanupTimer = setInterval(async () => {
    try {
      const { query } = require('./src/db');
      const s = await query('DELETE FROM sessions WHERE expires_at < NOW()');
      const t = await query('DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used_at IS NULL');
      const p = await query('DELETE FROM purge_tokens WHERE expires_at < NOW()');
      const total = s.rowCount + t.rowCount + p.rowCount;
      if (total > 0) {
        console.log(`[cleanup] Expired: ${s.rowCount} sessions, ${t.rowCount} reset tokens, ${p.rowCount} purge tokens.`);
      }
    } catch(err) {
      console.error('[cleanup] Error:', err.message);
    }
  }, 60 * 60 * 1000);

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

function closeServer() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received — shutting down Cloud Inventory ROI Builder...`);

  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);

  try {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }

    if (purgeTask && typeof purgeTask.stop === 'function') {
      purgeTask.stop();
    }

    if (server && typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    await closeServer();

    if (process.env.DATABASE_URL) {
      await db().pool.end();
      console.log('Database pool closed.');
    }

    clearTimeout(forceExit);
    console.log('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExit);
    console.error('Shutdown failed:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/* Capture process-level failures to the error log (best-effort). We log and
   keep running for unhandledRejection; for uncaughtException we log then let
   the process exit so the platform can restart cleanly. */
process.on('unhandledRejection', (reason) => {
  try { require('./src/error-log').logError(reason instanceof Error ? reason : new Error(String(reason)), { source: 'unhandledRejection', level: 'error' }); }
  catch (e) { console.error('unhandledRejection:', reason); }
});
process.on('uncaughtException', (err) => {
  try { require('./src/error-log').logError(err, { source: 'uncaughtException', level: 'fatal' }); }
  catch (e) { console.error('uncaughtException:', err && err.message); }
  /* Give the async log a brief moment, then exit for a clean restart. */
  setTimeout(() => process.exit(1), 500);
});

async function start() {
  try {
    await waitForDatabase();

    if (process.env.DATABASE_URL) {
      const { runMigrations } = require('./src/migrate');
      await runMigrations();

      startCleanupTimer();

      const { startPurgeJob } = require('./src/jobs/auditPurge');
      purgeTask = startPurgeJob();
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Cloud Inventory ROI Builder v${APP_VERSION} — port ${PORT}`);
      console.log(`   Phase    : production-ready`);
      console.log(`   Database : ${process.env.DATABASE_URL ? '✅ connected' : '⚠️  not configured'}`);
      console.log(`   App URL  : ${APP_URL || 'not configured'}`);
      console.log(`   Helmet   : ✅ security headers active`);
      console.log(`   Rate lim : ✅ 100/min global + 10/min auth`);
      console.log(`   AI model : ${ANTHROPIC_MODEL}`);
      console.log(`   AI key   : ${process.env.ANTHROPIC_API_KEY ? '✅ set' : '⚠️  not set'}`);
      console.log(`   SendGrid : ${process.env.SENDGRID_API_KEY  ? '✅ set' : '⚠️  not set'}`);
      console.log(`   Env      : ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Startup failed — aborting:', err.message);
    process.exit(1);
  }
}

/* Only auto-start when run directly (node server.js). When required by the
   integration test suite, the app is exported and the test controls listen(). */
if (require.main === module) {
  start();
}

module.exports = { app, start };
