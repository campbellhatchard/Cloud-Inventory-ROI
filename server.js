/* ═══════════════════════════════════════════════════════════════════
   server.js  —  Cloud Inventory ROI Builder  v6.8.5
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
const fs         = require('fs');
const https      = require('https');
const crypto     = require('crypto');
const { getAppUrl } = require('./src/config');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
/* This middleware is used by early admin routes as well as later APIs. */
const { requireAuth, hasRole } = require('./src/middleware/auth');
const { calcROI: calcROIShared } = require('./src/shared/roi-engine');
const { scenarioAccess, opportunityAccessByBaseId } = require('./src/authorization');
const { buildExecutiveValueStory } = require('./src/shared/executive-value-story');
const { evaluateExecutiveOutputReadiness } = require('./src/shared/executive-output-readiness');
const brand = require('./src/shared/brand-system');
const applicationKnowledge = require('./src/shared/application-knowledge');
const christie = require('./src/shared/christie-context');
const christieContextSource = require('./src/shared/christie-context-source');

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
app.get('/questionnaire-roi-registry.js',(req,res)=>{res.type('application/javascript');res.sendFile(path.join(__dirname,'src','shared','questionnaire-roi-registry.js'));});
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
app.use('/api/customer-proof', require('./src/routes/customer-proof'));

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
app.use('/api/solution-fit/catalog', require('./src/routes/solution-fit-catalog'));
app.use('/api/sales-teams', require('./src/routes/sales-teams'));
app.use('/api/customer-switcher', require('./src/routes/customer-switcher'));
app.use('/api/sales-manager', require('./src/routes/sales-manager'));
app.use('/api/stage-readiness', require('./src/routes/stage-readiness'));
app.use('/api/competitive-intelligence', require('./src/routes/competitive-intelligence'));
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
    const { hasPermission, getTeamUsers } = require('./src/authorization');
    let rows;
    if (hasPermission(req.user,'view_all_solution_fits')) ({rows}=await db().query(`SELECT id,username,email,role,roles FROM users WHERE is_active=TRUE AND (role='se' OR 'se'=ANY(roles) OR role='admin' OR 'admin'=ANY(roles)) ORDER BY username`));
    else rows=await getTeamUsers(req.user.id,'se');
    res.json(rows.map(r => ({ id: r.id, name: r.username, role: (r.roles||[]).includes('admin')?'admin':'se', roles:r.roles||[r.role] })));
  } catch (err) {
    console.error('List solution engineers error:', err.message);
    res.status(500).json({ error: 'Failed to load solution engineers.' });
  }
});

/* First-class customers (stable IDs). SE/admin see all; AE sees their own. */
app.get('/api/customers', requireAuth, async (req, res) => {
  const started=Date.now();console.info('landing_customers.started',{userId:req.user.id});
  try {
    const { listAuthorizedCustomers } = require('./src/authorization');
    const rows=await listAuthorizedCustomers(req.user);
    const customers=rows.map(r=>({id:r.id,name:r.name,ownerId:r.owner_id,ownerUsername:r.owner_username,scenarioCount:Number(r.scenario_count)||0}));
    console.info('landing_customers.completed',{userId:req.user.id,status:200,count:customers.length,elapsedMs:Date.now()-started});res.json(customers);
  } catch (err) {
    console.error('landing_customers.failed',{userId:req.user.id,status:500,elapsedMs:Date.now()-started,message:err.message});
    res.status(500).json({ error: 'Failed to load customers.' });
  }
});

app.get('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const { customerAccess } = require('./src/authorization');
    const access=await customerAccess(req.user,req.params.id,'view');
    if(!access.exists)return res.status(404).json({error:'Customer not found.'});
    if(!access.allowed)return res.status(403).json({error:'Access denied.'});
    const c=access.customer;res.json({id:c.id,name:c.name,ownerId:c.owner_id,accessReasons:access.reasons});
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
function brandedWordStyles(theme){
  const paragraphStyles=[
    ['Title','Title',theme.type.display,true,theme.heading,180,100],
    ['Heading1','Heading 1',theme.type.pageTitle,true,theme.heading,280,100],
    ['Heading2','Heading 2',theme.type.sectionHeading,true,theme.heading,240,80],
    ['Heading3','Heading 3',theme.type.label,true,theme.accessibleAccent,180,60]
  ].map(([id,name,size,bold,color,before,after])=>({id,name,basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:theme.font,size,bold,color},paragraph:{spacing:{before,after},keepNext:true}}));
  return{default:{document:{run:{font:theme.font,size:theme.type.body,color:theme.body},paragraph:{spacing:{after:100,line:276}}},title:{run:{font:theme.font,size:theme.type.display,bold:true,color:theme.heading}},heading1:{run:{font:theme.font,size:theme.type.pageTitle,bold:true,color:theme.heading}},heading2:{run:{font:theme.font,size:theme.type.sectionHeading,bold:true,color:theme.heading}},heading3:{run:{font:theme.font,size:theme.type.label,bold:true,color:theme.accessibleAccent}}},paragraphStyles};
}
app.get('/api/admin/export/:entity', requireAuth, async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
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
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
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
   ADMIN — DATA CLEANUP & RECOVERY (v6.6.1)
   Preview snapshots resolve the exact authorized IDs. Execution accepts only
   a subset of that immutable, short-lived snapshot—never a fresh wildcard.
   Evidence/history tables are intentionally never updated by these routes.
   ══════════════════════════════════════════════════════════════════ */
app.post('/api/admin/cleanup/preview', requireAuth, async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const search = String(req.body.search || req.body.company || '').trim();
    if (!search) return res.status(400).json({ error: 'Search customer, opportunity, or rep.' });
    const filters=req.body.filters&&typeof req.body.filters==='object'?req.body.filters:{};
    const pat = '%' + search.toLowerCase() + '%';
    const { query } = db();

    const [scen, disc, cust, handoff] = await Promise.all([
      query(`SELECT s.id,s.base_id,s.customer_id,s.name,s.company,u.username AS rep,s.version,s.is_current,s.outcome,
               s.deleted_at,s.deleted_at IS NOT NULL AS already_removed,
               (SELECT COUNT(*)::int FROM scenario_shares x WHERE x.scenario_id=s.id AND x.is_active=TRUE) scenario_share_count,
               (SELECT COUNT(*)::int FROM business_case_shares x WHERE x.scenario_id=s.id AND x.is_active=TRUE) business_share_count,
               (SELECT COUNT(*)::int FROM scenario_stage_history x WHERE x.scenario_id=s.id) stage_history_count,
               (SELECT COUNT(*)::int FROM scenario_roi_value_snapshots x WHERE x.scenario_id=s.id) value_snapshot_count
             FROM scenarios s JOIN users u ON u.id = s.owner_id
             WHERE LOWER(s.company) LIKE $1 OR LOWER(s.name) LIKE $1 OR LOWER(u.username) LIKE $1
             ORDER BY s.company, s.name, s.version DESC`, [pat]),
      query(`SELECT ds.id,ds.scenario_id,ds.base_id,s.customer_id,ds.company,COALESCE(s.name,'Unlinked Prospect session') opportunity,u.username AS rep,
               ds.submitted_at IS NOT NULL AS submitted,ds.answer_count,ds.is_active,ds.cleanup_removed_at,
               ds.cleanup_removed_at IS NOT NULL AS already_removed,
               (SELECT COUNT(*)::int FROM discovery_submissions x WHERE x.discovery_session_id=ds.id) immutable_submission_count
             FROM discovery_sessions ds JOIN users u ON u.id = ds.owner_id
             LEFT JOIN scenarios s ON s.id=ds.scenario_id
             WHERE LOWER(ds.company) LIKE $1 OR LOWER(COALESCE(s.name,'')) LIKE $1 OR LOWER(u.username) LIKE $1
             ORDER BY ds.company, ds.created_at DESC`, [pat]),
      query(`SELECT c.id,c.name,u.username AS owner,c.deleted_at,c.deleted_at IS NOT NULL AS already_removed,
               COUNT(DISTINCT s.id) AS scenario_count
             FROM customers c JOIN users u ON u.id = c.owner_id
             LEFT JOIN scenarios s ON s.customer_id = c.id
             WHERE LOWER(c.name) LIKE $1 OR LOWER(u.username) LIKE $1 OR LOWER(COALESCE(s.name,'')) LIKE $1
             GROUP BY c.id, u.username
             ORDER BY c.name`, [pat]),
      query(`SELECT h.id,h.customer_id,c.name AS customer,COALESCE((h.data->'opportunity'->>'name'),c.name||' Solution Fit') opportunity,u.username AS se,
               h.deleted_at,h.deleted_at IS NOT NULL AS already_removed
             FROM handoffs h
             JOIN customers c ON c.id = h.customer_id
             JOIN users u ON u.id = h.owner_id
             WHERE LOWER(c.name) LIKE $1 OR LOWER(COALESCE(h.data->'opportunity'->>'name','')) LIKE $1 OR LOWER(u.username) LIKE $1`, [pat])
    ]);

    const status=String(filters.status||'active'),scenarioFilter=String(filters.scenario||'all'),prospect=String(filters.prospect||'all');
    const statusOk=r=>status==='all'||(status==='removed'?r.already_removed:status==='closed'?!!r.outcome:!r.already_removed&&!r.outcome);
    let scenarios=scen.rows.filter(statusOk);
    if(scenarioFilter==='current')scenarios=scenarios.filter(x=>x.is_current);
    if(scenarioFilter==='prior')scenarios=scenarios.filter(x=>!x.is_current);
    let discovery=disc.rows.filter(r=>status==='all'||(status==='removed'?r.already_removed:!r.already_removed));
    if(prospect==='submitted')discovery=discovery.filter(x=>x.submitted);
    if(prospect==='draft')discovery=discovery.filter(x=>!x.submitted&&!x.already_removed);
    if(prospect==='inactive')discovery=discovery.filter(x=>!x.is_active);
    let customers=cust.rows.filter(r=>status==='all'||(status==='removed'?r.already_removed:!r.already_removed));
    let handoffs=handoff.rows.filter(r=>status==='all'||(status==='removed'?r.already_removed:!r.already_removed));
    const types=Array.isArray(filters.types)&&filters.types.length?new Set(filters.types):null;
    if(types){if(!types.has('scenario'))scenarios=[];if(!types.has('discovery'))discovery=[];if(!types.has('customer'))customers=[];if(!types.has('handoff'))handoffs=[];}

    const records={
      scenarioIds:scenarios.map(x=>String(x.id)),discoveryIds:discovery.map(x=>String(x.id)),
      customerIds:customers.map(x=>String(x.id)),handoffIds:handoffs.map(x=>String(x.id)),
      scenarios:scenarios.map(x=>({id:String(x.id),customerId:x.customer_id&&String(x.customer_id),baseId:x.base_id&&String(x.base_id)})),
      discovery:discovery.map(x=>({id:String(x.id),customerId:x.customer_id&&String(x.customer_id),scenarioId:x.scenario_id&&String(x.scenario_id)})),
      handoffs:handoffs.map(x=>({id:String(x.id),customerId:String(x.customer_id)}))
    };
    const snap=await query(`INSERT INTO admin_cleanup_previews(admin_user_id,search_text,filters,resolved_records) VALUES($1,$2,$3,$4) RETURNING id,expires_at`,[req.user.id,search,JSON.stringify(filters),JSON.stringify(records)]);
    const confirmationPhrase='REMOVE '+search.toUpperCase().replace(/[^A-Z0-9 ]/g,'').trim();

    res.json({
      previewId:snap.rows[0].id,expiresAt:snap.rows[0].expires_at,confirmationPhrase,search,filters,
      scenarios,discovery,customers,handoffs,
      summary: {
        scenarios:scenarios.length,discovery:discovery.length,customers:customers.length,handoffs:handoffs.length,
        scenarioShares:scenarios.reduce((n,x)=>n+Number(x.scenario_share_count||0),0),
        businessShares:scenarios.reduce((n,x)=>n+Number(x.business_share_count||0),0),
        immutableSubmissions:discovery.reduce((n,x)=>n+Number(x.immutable_submission_count||0),0),
        stageHistory:scenarios.reduce((n,x)=>n+Number(x.stage_history_count||0),0),
        valueSnapshots:scenarios.reduce((n,x)=>n+Number(x.value_snapshot_count||0),0)
      },
      preservation:['ROI Value History','Immutable Prospect submissions','Scenario ROI value snapshots','BuyCycle stage history','Audit history']
    });
  } catch (err) {
    console.error('Cleanup preview error:', err.message);
    res.status(500).json({ error: 'Preview failed.' });
  }
});

app.post('/api/admin/cleanup/execute', requireAuth, async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const b=req.body||{},previewId=String(b.previewId||''),reason=String(b.reason||'').trim(),note=String(b.note||'').trim().slice(0,500),mode=b.mode==='all'?'all':'selected';
    if(!previewId||!['test_demo','duplicate','created_error','obsolete','other'].includes(reason))return res.status(400).json({error:'A valid preview and cleanup reason are required.'});
    const snap=await db().query(`SELECT * FROM admin_cleanup_previews WHERE id=$1 AND admin_user_id=$2 AND expires_at>NOW()`,[previewId,req.user.id]);
    if(!snap.rows.length)return res.status(409).json({error:'Cleanup preview expired. Run Preview again.'});
    const allowed=snap.rows[0].resolved_records||{},list=k=>(Array.isArray(b[k])?b[k]:[]).map(String),subset=(xs,ok)=>xs.every(x=>(ok||[]).map(String).includes(x));
    let sel={scenarioIds:list('scenarioIds'),discoveryIds:list('discoveryIds'),customerIds:list('customerIds'),handoffIds:list('handoffIds')};
    if(mode==='all'){
      const expected='REMOVE '+String(snap.rows[0].search_text).toUpperCase().replace(/[^A-Z0-9 ]/g,'').trim();
      if(String(b.typedConfirmation||'')!==expected)return res.status(400).json({error:'Typed confirmation did not match.'});
      sel={scenarioIds:allowed.scenarioIds||[],discoveryIds:allowed.discoveryIds||[],customerIds:allowed.customerIds||[],handoffIds:allowed.handoffIds||[]};
    }
    if(!subset(sel.scenarioIds,allowed.scenarioIds)||!subset(sel.discoveryIds,allowed.discoveryIds)||!subset(sel.customerIds,allowed.customerIds)||!subset(sel.handoffIds,allowed.handoffIds))return res.status(400).json({error:'Selection is not part of the authorized preview.'});
    if(!Object.values(sel).some(x=>x.length))return res.status(400).json({error:'Select at least one previewed record.'});
    /* Selecting a customer includes only its dependencies already resolved in this preview. */
    const chosenCustomers=new Set(sel.customerIds);
    for(const x of allowed.scenarios||[])if(chosenCustomers.has(String(x.customerId))&&!sel.scenarioIds.includes(String(x.id)))sel.scenarioIds.push(String(x.id));
    for(const x of allowed.discovery||[])if(chosenCustomers.has(String(x.customerId))&&!sel.discoveryIds.includes(String(x.id)))sel.discoveryIds.push(String(x.id));
    for(const x of allowed.handoffs||[])if(chosenCustomers.has(String(x.customerId))&&!sel.handoffIds.includes(String(x.id)))sel.handoffIds.push(String(x.id));
    const result=await db().transaction(async client=>{
      const out={scenariosRemoved:0,discoveryRemoved:0,customersRemoved:0,handoffsRemoved:0,scenarioSharesDeactivated:0,businessSharesDeactivated:0,currentVersionsPromoted:0};
      let touchedBases=[];
      if(sel.scenarioIds.length){
        const locked=await client.query(`SELECT id,base_id FROM scenarios WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL FOR UPDATE`,[sel.scenarioIds]);
        touchedBases=[...new Set(locked.rows.map(x=>x.base_id))];
        const q=await client.query(`UPDATE scenarios SET deleted_at=NOW(),is_current=FALSE,cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4 WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`,[sel.scenarioIds,req.user.id,reason,note||null]);out.scenariosRemoved=q.rowCount;
        out.scenarioSharesDeactivated=(await client.query(`UPDATE scenario_shares SET is_active=FALSE WHERE scenario_id=ANY($1::uuid[]) AND is_active=TRUE RETURNING id`,[sel.scenarioIds])).rowCount;
        out.businessSharesDeactivated=(await client.query(`UPDATE business_case_shares SET is_active=FALSE WHERE scenario_id=ANY($1::uuid[]) AND is_active=TRUE RETURNING id`,[sel.scenarioIds])).rowCount;
        for(const base of touchedBases){await client.query(`UPDATE scenarios SET is_current=FALSE WHERE base_id=$1 AND deleted_at IS NULL`,[base]);const promoted=await client.query(`UPDATE scenarios SET is_current=TRUE WHERE id=(SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL ORDER BY version DESC,updated_at DESC,id DESC LIMIT 1) RETURNING id`,[base]);out.currentVersionsPromoted+=promoted.rowCount;}
      }
      if(sel.discoveryIds.length)out.discoveryRemoved=(await client.query(`UPDATE discovery_sessions SET is_active=FALSE,cleanup_removed_at=NOW(),cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4 WHERE id=ANY($1::uuid[]) AND cleanup_removed_at IS NULL RETURNING id`,[sel.discoveryIds,req.user.id,reason,note||null])).rowCount;
      if(sel.handoffIds.length)out.handoffsRemoved=(await client.query(`UPDATE handoffs SET deleted_at=NOW(),cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4 WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`,[sel.handoffIds,req.user.id,reason,note||null])).rowCount;
      if(sel.customerIds.length)out.customersRemoved=(await client.query(`UPDATE customers SET deleted_at=NOW(),cleanup_removed_by=$2,cleanup_reason=$3,cleanup_note=$4 WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`,[sel.customerIds,req.user.id,reason,note||null])).rowCount;
      return out;
    });
    const { log } = require('./src/audit');
    await log({
      userId: req.user.id,
      action: 'admin.cleanup_removed',
      entityType: 'admin',
      detail: {
        previewId,search:snap.rows[0].search_text,filters:snap.rows[0].filters,mode,reason,note:note||null,
        selectedIds:sel,affected:result,
        preserved:['roi_value_events','discovery_submissions','scenario_roi_value_snapshots','scenario_stage_history','audit_log']
      },
      ipAddress: req.ip
    });
    res.json({ok:true,...result,evidencePreserved:true,immutableProspectSubmissionsPreserved:true,valueHistoryPreserved:true,stageHistoryPreserved:true,auditHistoryPreserved:true});
  } catch (err) {
    console.error('Cleanup execute error:', err.message);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
});

/* ── Cleanup: list recently soft-deleted records (last 30 days) ── */
app.get('/api/admin/cleanup/deleted', requireAuth, async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const { query } = db();
    const [scen,cust,disc,handoff] = await Promise.all([
      query(`SELECT s.id, s.name, s.company, u.username AS rep, s.version,
               s.deleted_at removed_at,s.is_current,s.cleanup_reason,s.cleanup_note,ru.username removed_by
             FROM scenarios s JOIN users u ON u.id = s.owner_id
             LEFT JOIN users ru ON ru.id=s.cleanup_removed_by
             WHERE s.deleted_at IS NOT NULL AND s.deleted_at > NOW() - INTERVAL '30 days'
             ORDER BY s.deleted_at DESC LIMIT 100`),
      query(`SELECT c.id,c.name,u.username AS owner,c.deleted_at removed_at,c.cleanup_reason,c.cleanup_note,ru.username removed_by
             FROM customers c JOIN users u ON u.id = c.owner_id
             LEFT JOIN users ru ON ru.id=c.cleanup_removed_by
             WHERE c.deleted_at IS NOT NULL AND c.deleted_at > NOW() - INTERVAL '30 days'
             ORDER BY c.deleted_at DESC LIMIT 50`),
      query(`SELECT ds.id,ds.company,s.name opportunity,u.username rep,ds.cleanup_removed_at removed_at,ds.cleanup_reason,ds.cleanup_note,ru.username removed_by
             FROM discovery_sessions ds JOIN users u ON u.id=ds.owner_id LEFT JOIN scenarios s ON s.id=ds.scenario_id LEFT JOIN users ru ON ru.id=ds.cleanup_removed_by
             WHERE ds.cleanup_removed_at IS NOT NULL AND ds.cleanup_removed_at>NOW()-INTERVAL '30 days' ORDER BY ds.cleanup_removed_at DESC LIMIT 100`),
      query(`SELECT h.id,c.name customer,COALESCE(h.data->'opportunity'->>'name',c.name||' Solution Fit') opportunity,u.username owner,h.deleted_at removed_at,h.cleanup_reason,h.cleanup_note,ru.username removed_by
             FROM handoffs h JOIN customers c ON c.id=h.customer_id JOIN users u ON u.id=h.owner_id LEFT JOIN users ru ON ru.id=h.cleanup_removed_by
             WHERE h.deleted_at IS NOT NULL AND h.deleted_at>NOW()-INTERVAL '30 days' ORDER BY h.deleted_at DESC LIMIT 100`)
    ]);
    res.json({scenarios:scen.rows,customers:cust.rows,discovery:disc.rows,handoffs:handoff.rows});
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deleted records.' });
  }
});

/* ── Cleanup: restore a soft-deleted record by id and type ── */
app.post('/api/admin/cleanup/restore', requireAuth, async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const { type, id } = req.body || {};
    if (!id || !['scenario','customer','discovery','handoff'].includes(type)) {
      return res.status(400).json({ error: 'A supported record type and id are required.' });
    }
    const { query,transaction } = db();let detail={type,id,externalLinksRemainInactive:true};
    if (type === 'scenario') {
      const restored=await transaction(async client=>{const r=await client.query(`UPDATE scenarios SET deleted_at=NULL,is_current=FALSE,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=$1 AND deleted_at IS NOT NULL RETURNING base_id`,[id]);if(!r.rowCount)return null;const base=r.rows[0].base_id;const current=await client.query(`SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL AND is_current=TRUE LIMIT 1`,[base]);if(!current.rowCount){await client.query(`UPDATE scenarios SET is_current=FALSE WHERE base_id=$1 AND deleted_at IS NULL`,[base]);await client.query(`UPDATE scenarios SET is_current=TRUE WHERE id=(SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL ORDER BY version DESC,updated_at DESC,id DESC LIMIT 1)`,[base]);}return base;});
      if(!restored)return res.status(404).json({error:'Scenario not found or not removed.'});detail.baseId=restored;
    } else if(type==='customer') {
      const { rowCount } = await query(
        `UPDATE customers SET deleted_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=$1 AND deleted_at IS NOT NULL`,
        [id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Customer not found or not removed.' });
    } else if(type==='discovery'){
      const {rowCount}=await query(`UPDATE discovery_sessions SET cleanup_removed_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL,is_active=FALSE WHERE id=$1 AND cleanup_removed_at IS NOT NULL`,[id]);
      if(!rowCount)return res.status(404).json({error:'Prospect / Discovery session not found or not removed.'});detail.publicAccess='inactive';detail.immutableEvidence='preserved';
    } else {
      const {rowCount}=await query(`UPDATE handoffs SET deleted_at=NULL,cleanup_removed_by=NULL,cleanup_reason=NULL,cleanup_note=NULL WHERE id=$1 AND deleted_at IS NOT NULL`,[id]);
      if(!rowCount)return res.status(404).json({error:'Solution Fit / Handoff not found or not removed.'});
    }
    const { log } = require('./src/audit');
    await log({ userId: req.user.id, action: 'admin.cleanup_restored',
      entityType: type, entityId: id, detail, ipAddress: req.ip });
    res.json({ok:true,...detail});
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
  const pageBrand = brand.documentTheme('internal');
  const emailBrand = brand.emailTheme();
  const color = ok ? pageBrand.success : pageBrand.danger;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title>
    <style>body{font-family:${pageBrand.font};background:${emailBrand.background};color:${pageBrand.body};display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .card{background:${pageBrand.background};border:1px solid ${pageBrand.border};border-radius:10px;padding:2.5rem;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1);}
    h1{color:${color};font-size:22px;margin-bottom:12px;}
    p{color:${pageBrand.muted};font-size:15px;line-height:1.6;}
    a{display:inline-block;margin-top:1.5rem;padding:10px 24px;background:${emailBrand.button};color:${pageBrand.background};border-radius:8px;text-decoration:none;font-weight:600;}
    a:hover{background:${emailBrand.buttonHover};}a:focus-visible{outline:3px solid ${pageBrand.accessibleAccent};outline-offset:3px;}</style>
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
  const proofGuard='Customer-proof governance: Never invent or infer customer names, results, metrics, quotes, savings, or deployment claims. Reference a Cloud Inventory customer outcome only when the user message supplies an explicitly approved Customer Proof Catalog record. Peer proof never validates the current buyer or its ROI.';
  const payload = { model: model || ANTHROPIC_MODEL, max_tokens: max_tokens || 1000, messages };
  payload.system = proofGuard + (typeof system === 'string' && system.trim() ? '\n\n' + system.trim() : '');
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

/* Dedicated, server-grounded product Help. The browser supplies the question
   and location only; formulas, field meaning and workflow semantics are owned
   by Application Knowledge 1.0 and existing governed registries. */
app.post('/api/ai-help', requireAuth, aiLimiter, async (req,res)=>{
  try{
    const b=req.body||{},question=String(b.question||'').trim();
    if(!question)return res.status(400).json({error:'question required.'});
    if(b.scenarioId){const access=await scenarioAccess(req.user,b.scenarioId,'view');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Access denied.'});}
    const system=applicationKnowledge.systemPrompt({workspaceId:String(b.workspaceId||'').slice(0,80),fieldId:String(b.focusedFieldId||'').slice(0,100),role:req.user.role});
    const conversation=Array.isArray(b.recentHelpConversation)?b.recentHelpConversation.slice(-8).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,2000)})):[];
    if(!conversation.length||conversation.at(-1).content!==question)conversation.push({role:'user',content:question.slice(0,2000)});
    const data=await callAnthropicDirect(conversation,system,700);res.json(data);
  }catch(err){console.error('ai-help unavailable:',err.message);res.status(502).json({error:'AI Help is unavailable. Human Help remains available.'});}
});

/* Christie is scenario-authorized and server-grounded. Client-provided deal
   context is deliberately ignored; it cannot broaden scope or alter facts. */
async function christiePreferences(userId){
  const {rows}=await db().query(`SELECT christie_depth,christie_challenge FROM user_ai_preferences WHERE user_id=$1`,[userId]);
  return rows[0]||{christie_depth:'standard',christie_challenge:'challenging'};
}
async function loadChristieContext(req,scenarioId,perspective='rep'){
  const access=await scenarioAccess(req.user,scenarioId,'view');
  if(!access.exists){const e=new Error('Scenario not found.');e.status=404;throw e;}
  if(!access.allowed){const e=new Error('Access denied.');e.status=403;throw e;}
  const context=await christieContextSource.loadChristieContext(scenarioId,{perspective});
  if(!context){const e=new Error('Scenario not found.');e.status=404;throw e;}
  return context;
}
function christiePerspective(req,requested){
  const roles=[req.user.role,...(req.user.roleKeys||[])].map(x=>String(x||'').toLowerCase());
  let perspective=String(requested||'rep').toLowerCase();
  if(perspective==='manager'&&!roles.some(x=>['admin','sales_manager'].includes(x)))perspective='rep';
  if(perspective==='se'&&!roles.some(x=>['admin','se','solution_engineer','value_engineering'].includes(x)))perspective='rep';
  return ['rep','manager','se'].includes(perspective)?perspective:'rep';
}
app.get('/api/ai-preferences',requireAuth,async(req,res)=>{try{res.json(await christiePreferences(req.user.id));}catch(e){res.status(500).json({error:'Preferences unavailable.'});}});
app.put('/api/ai-preferences',requireAuth,async(req,res)=>{try{
  const depth=String(req.body?.christie_depth||''),challenge=String(req.body?.christie_challenge||'');
  if(!christie.persona.depths.includes(depth)||!christie.persona.challenges.includes(challenge))return res.status(400).json({error:'Invalid coaching preference.'});
  const {rows}=await db().query(`INSERT INTO user_ai_preferences(user_id,christie_depth,christie_challenge,updated_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(user_id) DO UPDATE SET christie_depth=EXCLUDED.christie_depth,christie_challenge=EXCLUDED.christie_challenge,updated_at=NOW() RETURNING christie_depth,christie_challenge`,[req.user.id,depth,challenge]);res.json(rows[0]);
 }catch(e){res.status(500).json({error:'Preferences could not be saved.'});}});
app.get('/api/scenarios/:id/christie-context',requireAuth,async(req,res)=>{try{res.json(await loadChristieContext(req,req.params.id,christiePerspective(req,req.query.perspective)));}catch(e){res.status(e.status||500).json({error:e.status?e.message:'Christie context unavailable.'});}});
app.post('/api/scenarios/:id/christie',requireAuth,aiLimiter,async(req,res)=>{try{
  const perspective=christiePerspective(req,req.body?.perspective);
  const context=await loadChristieContext(req,req.params.id,perspective),p=await christiePreferences(req.user.id);
  const prefs={depth:p.christie_depth,challenge:p.christie_challenge,perspective};
  const question=String(req.body?.question||'Coach me on the highest-priority next customer commitment.').slice(0,2500);
  const recent=Array.isArray(req.body?.recentConversation)?req.body.recentConversation.slice(-8).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,2500)})):[];
  recent.push({role:'user',content:question});
  let data;
  try{data=await callAnthropicDirect(recent,christie.systemPrompt(context,prefs),prefs.depth==='detailed'?2200:prefs.depth==='quick'?650:1300);}
  catch(_){const fallback=christie.deterministicCoach(context,prefs);data={content:[{type:'text',text:Object.entries(fallback).filter(([k])=>!['depth','challenge','perspective'].includes(k)).map(([k,v])=>`${k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}: ${v}`).join('\n\n')}],fallback:true};}
  res.json({...data,scenarioId:context.opportunity.scenarioId,baseId:context.opportunity.baseId,christieContextRevision:context.christieContextRevision,personaVersion:christie.persona.personaVersion,preferences:prefs});
 }catch(e){res.status(e.status||500).json({error:e.status?e.message:'Christie is unavailable.'});}});

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
    const ciProductKey=require('./src/competitive-intelligence').validateCiProductKey(req.query.ciProduct || 'cip');
    const { query } = db();
    const { rows } = await query(
      `SELECT id, source_type, source_name, source_url, file_size, created_at
       FROM ci_product_sources WHERE is_active = TRUE AND ci_product_key=$1 ORDER BY created_at DESC LIMIT 1`,
      [ciProductKey]
    );
    res.json(rows[0] || null);
  } catch(err) {
    console.error('ci-source GET error:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to fetch CI source.' });
  }
});

/* POST /api/competitive/ci-source — admin: save new canonical CI source */
app.post('/api/competitive/ci-source', requireAuth, async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const { sourceType, sourceName, sourceUrl, contentText, fileSize } = req.body;
    const ciProductKey=require('./src/competitive-intelligence').validateCiProductKey(req.body.ciProductKey||'cip');
    if (!sourceType || !sourceName) return res.status(400).json({ error: 'sourceType and sourceName required.' });
    const { query } = db();
    /* Deactivate previous */
    await query(`UPDATE ci_product_sources SET is_active = FALSE WHERE is_active = TRUE AND ci_product_key=$1`,[ciProductKey]);
    /* Insert new */
    const { rows } = await query(
      `INSERT INTO ci_product_sources (source_type, source_name, source_url, content_text, file_size, uploaded_by,ci_product_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, source_name, created_at`,
      [sourceType, sourceName, sourceUrl || null, contentText || null, fileSize || null, req.user.id,ciProductKey]
    );
    const { log } = require('./src/audit');
    await log({ userId: req.user.id, action: 'competitive.source_changed', entityType: 'ci_product_source', detail: { sourceName, sourceType,ciProductKey }, ipAddress: req.ip });
    res.json({ ok: true, source: rows[0] });
  } catch(err) {
    console.error('ci-source POST error:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to save CI source.' });
  }
});

/* POST /api/competitive/research — AI dual-source comparison */
app.post('/api/competitive/research', requireAuth, aiLimiter, async (req, res) => {
  try {
    const {
      competitorKey, competitorName, competitorUrl,
      competitorFileText,   /* base64-decoded text from uploaded competitor doc */
      ciSourceOverride,     /* { text, name } — rep-session override of canonical CI source */
      productId, ciProductKey = 'cip', opportunityBaseId
    } = req.body;

    if (!competitorKey && !competitorName) return res.status(400).json({ error: 'competitorName required.' });
    const governedCiProductKey=require('./src/competitive-intelligence').validateCiProductKey(ciProductKey);
    /* Research may be global, but associating it to customer opportunity data
       requires normal opportunity edit authorization before any AI/persistence. */
    if(opportunityBaseId){const access=await opportunityAccessByBaseId(req.user,opportunityBaseId,'edit');if(!access.exists)return res.status(404).json({error:'Opportunity not found.'});if(!access.allowed)return res.status(403).json({error:'Opportunity edit permission required for associated research.'});}

    /* Step 1: resolve CI product content */
    let ciContent = '';
    let ciSourceLabel = 'Cloud Inventory curated battlecard';
    if (ciSourceOverride && (ciSourceOverride.text || ciSourceOverride.url)) {
      if(ciSourceOverride.text)ciContent = ciSourceOverride.text.slice(0, 12000);
      else {const fetched=await fetchUrlContent(ciSourceOverride.url);if(fetched.ok)ciContent=fetched.text;}
      ciSourceLabel = ciSourceOverride.name || ciSourceOverride.url || 'Session-specific CI source';
    } else {
      const { query } = db();
      const { rows } = await query(
        `SELECT source_type, source_name, source_url, content_text FROM ci_product_sources WHERE is_active = TRUE AND ci_product_key=$1 ORDER BY created_at DESC LIMIT 1`,
        [governedCiProductKey]
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

    if(!ciContent)return res.status(422).json({error:'Approved Cloud Inventory product knowledge is unavailable. Ask an Admin to add a canonical source for this product.'});

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

    if(!compContent)return res.status(422).json({error:'Source insufficient — provide or refresh a competitor source. You may save the product identity as Draft without creating approved intelligence.'});

    /* Step 3: Build system prompt + call Anthropic */
    const system = `You are a B2B enterprise software sales strategist specializing in inventory management and field operations technology. You produce structured, factual competitive battlecard analysis grounded strictly in the source materials provided. You NEVER invent capabilities or prices not mentioned in the sources. When you infer something not explicitly stated, you flag it with "inferred" in the confidence field.`;

    const userPrompt = `Compare Cloud Inventory against ${competitorName || competitorKey} using the source materials below.

=== CLOUD INVENTORY SOURCE (${ciSourceLabel}) ===
${ciContent}

=== COMPETITOR SOURCE (${compSourceLabel}) ===
${compContent}

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

    /* Persist immutable, finding-level research and retain the legacy cache only
       as a compatibility trail. Research is saved; approval is always separate. */
    let memory=null;
    try {
      memory=await require('./src/competitive-intelligence').persistResearch({productId,name:competitorName||competitorKey,url:competitorUrl,userId:req.user.id,ciProductKey:governedCiProductKey,baseId:opportunityBaseId,sourceType:competitorFileText?'uploaded_document':'official_website',result:parsed,model:ANTHROPIC_MODEL});
      const {log}=require('./src/audit');await log({userId:req.user.id,action:'competitive.research_completed',entityType:'competitive_research',entityId:memory.run?.id,detail:{productId:memory.product.id,researchVersion:memory.run?.version,ciProductKey:governedCiProductKey,findingCount:memory.findingCount}});
    } catch(e) { console.error('Competitive intelligence persistence failed:',e.message);return res.status(e.status||500).json({error:'Research completed but could not be governed and saved. No approval or Battlecard update was made.'}); }

    /* Legacy compatibility cache. */
    try {
      const { query } = db();
      await query(
        `INSERT INTO competitive_research_cache (competitor_key, competitor_url, competitor_name, result_json, created_by,competitive_product_id,research_run_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [competitorKey || null, competitorUrl || null, competitorName || null, JSON.stringify(parsed), req.user.id,memory.product.id,memory.run.id]
      );
    } catch(e) { /* cache failure is non-fatal */ }

    res.json({ ok: true, result: parsed, ciSourceLabel, compSourceLabel, compFetchStatus,product:memory.product,researchRun:memory.run,approvalStatus:'Research — not yet approved' });
  } catch(err) {
    console.error('Competitive research error:', err.message);
    res.status(err.status || 500).json({ error: 'Research failed: ' + err.message });
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
    let { competitorName, cost, time, maint, pain, adv, talk, company, repName,researchStatus,battlecardRevisionId } = req.body;
    let authorityLabel=String(researchStatus||'Research — not yet approved');
    if(battlecardRevisionId){
      const governed=await db().query(`SELECT r.version,r.published_at,r.content_json,p.product_name FROM competitive_battlecard_revisions r JOIN competitive_battlecards b ON b.id=r.battlecard_id JOIN competitive_products p ON p.id=b.product_id WHERE r.id=$1 AND b.current_revision_id=r.id`,[battlecardRevisionId]);
      if(!governed.rows.length)return res.status(404).json({error:'Authoritative Battlecard revision not found.'});
      const g=governed.rows[0],findings=Array.isArray(g.content_json?.findings)?g.content_json.findings:[];
      competitorName=g.product_name;pain=findings.map(x=>x.claim);adv=[];talk='';cost=time=maint='See governed source details';authorityLabel=`Approved Battlecard v${g.version} · ${new Date(g.published_at).toLocaleDateString('en-US')}`;
    }
    if (!competitorName) return res.status(400).json({ error: 'competitorName required' });

    const {
      Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Footer,
      HeadingLevel, WidthType, BorderStyle, ShadingType, TableLayoutType, VerticalAlign
    } = require('docx');

    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const wordBrand = brand.documentTheme('internal');
    const esc  = s => String(s || '');

    const mkPara = (runs, opts = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...opts });
    const mkRun  = (text, opts = {}) => new TextRun({ text: esc(text), size: wordBrand.type.body, font: wordBrand.font, ...opts });
    const hr = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: wordBrand.accent } }, spacing: { before: 120, after: 120 } });

    const metaRow = (label, value) => new TableRow({ children: [
      new TableCell({
        children: [mkPara(mkRun(label, { bold: true }))],
        width: { size: 3200, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: wordBrand.canvas },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: wordBrand.border }, right: { style: BorderStyle.SINGLE, size: 1, color: wordBrand.border } }
      }),
      new TableCell({
        children: [mkPara(mkRun(value))],
        width: { size: 5800, type: WidthType.DXA },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: wordBrand.border } }
      })
    ]});

    const maxRows = Math.max((pain || []).length, (adv || []).length);
    const battleRows = [
      new TableRow({ children: [
        new TableCell({ children: [mkPara(mkRun('Pain points with ' + competitorName, { bold: true, color: brand.document.background.replace('#','') }))],
          width: { size: 4500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: wordBrand.danger } }),
        new TableCell({ children: [mkPara(mkRun('Cloud Inventory advantages', { bold: true, color: brand.document.background.replace('#','') }))],
          width: { size: 4500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: wordBrand.success } })
      ]}),
      ...Array.from({ length: maxRows }, (_, i) => new TableRow({ children: [
        new TableCell({ children: [i < (pain||[]).length
          ? mkPara([mkRun('\u2715  ', { bold: true, color: wordBrand.danger }), mkRun(pain[i])], { spacing: { before: 60, after: 60 } })
          : new Paragraph({})],
          width: { size: 4500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? wordBrand.background : wordBrand.dangerSurface },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: wordBrand.border }, right: { style: BorderStyle.SINGLE, size: 1, color: wordBrand.border } }
        }),
        new TableCell({ children: [i < (adv||[]).length
          ? mkPara([mkRun('\u2713  ', { bold: true, color: wordBrand.success }), mkRun(adv[i])], { spacing: { before: 60, after: 60 } })
          : new Paragraph({})],
          width: { size: 4500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? wordBrand.background : wordBrand.successSurface },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: wordBrand.border } }
        })
      ]}))
    ];

    const children = [
      new Paragraph({ children:[new ImageRun({ data:fs.readFileSync(path.join(PUBLIC_DIR,wordBrand.logo)), transformation:{width:180,height:Math.round(180*wordBrand.logoAspect)} })], spacing:{after:90} }),
      mkPara(mkRun('INTERNAL COMPETITIVE INTELLIGENCE', { bold: true, size: wordBrand.type.label, color: wordBrand.danger }), { spacing: { after: 70 } }),
      mkPara(mkRun('Competitive Battlecard: ' + competitorName, { bold: true, size: wordBrand.type.pageTitle, color: wordBrand.heading }), { spacing: { after: 80 } }),
      mkPara(mkRun(authorityLabel, { bold: true, size: wordBrand.type.label, color: wordBrand.muted }), { spacing: { after: 70 } }),
      mkPara(mkRun(esc(company) + (repName ? '  \u00b7  Prepared by ' + esc(repName) : '') + '  \u00b7  ' + date, { size: wordBrand.type.label, color: wordBrand.muted }), { spacing: { after: 160 } }),
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
        shading: { type: ShadingType.CLEAR, fill: wordBrand.infoSurface },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: wordBrand.accent } },
        indent: { left: 200 }, spacing: { before: 80, after: 80 }
      }));
    }

    const doc  = new Document({ styles:brandedWordStyles(wordBrand), sections: [{
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            children: [mkRun(wordBrand.footer + ' · Prepared for ' + esc(company || 'the intended recipient'), { size: wordBrand.type.caption, color: wordBrand.muted })],
            alignment: 'center'
          })
        ] })
      },
      children
    }] });
    const buf  = await Packer.toBuffer(doc);
    const safe = esc(competitorName).replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `Cloud-Inventory-Internal-Battlecard-${safe}-${new Date().toISOString().split('T')[0]}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    console.error('battlecard-docx error:', err.message);
    res.status(500).json({ error: 'Word export failed: ' + err.message });
  }
});

/* Customer-ready executive proposal. The scenario id is the only proposal
   authority accepted from the browser; content is loaded from the server. */
app.post('/api/export/proposal-docx', requireAuth, async (req, res) => {
  try {
    const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Footer,
      HeadingLevel, WidthType, BorderStyle, ShadingType, TableLayoutType, AlignmentType } = require('docx');
    const clean = (value, max = 1600) => String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
    const list = (value, limit = 12) => Array.isArray(value) ? value.slice(0, limit) : [];
    const scenarioId=String(req.body?.scenarioId||'');
    if(!scenarioId)return res.status(400).json({error:'A scenario is required for proposal export.'});
    const access=await scenarioAccess(req.user,scenarioId,'view');
    if(!access.exists)return res.status(404).json({error:'Scenario not found.'});
    if(!access.allowed)return res.status(403).json({error:'Access denied.'});
    const stored=await db().query(`SELECT data->'proposalDraft' proposal FROM scenarios WHERE id=$1 AND deleted_at IS NULL`,[scenarioId]);
    const proposal=stored.rows[0]?.proposal;
    if(!proposal)return res.status(409).json({error:'Save the proposal before exporting.'});
    const scenarioRows=await db().query(`SELECT s.*,u.username owner_username FROM scenarios s JOIN users u ON u.id=s.owner_id WHERE s.id=$1 AND s.deleted_at IS NULL`,[scenarioId]);
    const scenario=scenarioRows.rows[0];
    const [governance,stakeholders,discovery,handoff,plans]=await Promise.all([
      db().query('SELECT evidence FROM scenario_stage_governance WHERE scenario_id=$1',[scenarioId]),
      db().query('SELECT id,name,title,role,engaged FROM stakeholders WHERE owner_id=$1 AND LOWER(company)=LOWER($2)',[scenario.owner_id,scenario.company]),
      db().query(`SELECT DISTINCT ON (a.question_id) a.question_id,a.answer,a.entered_by,a.updated_at FROM discovery_answers a JOIN discovery_sessions d ON d.id=a.session_id WHERE d.scenario_id=$1 ORDER BY a.question_id,a.updated_at DESC`,[scenarioId]),
      scenario.customer_id?db().query('SELECT data FROM handoffs WHERE customer_id=$1 AND deleted_at IS NULL',[scenario.customer_id]):Promise.resolve({rows:[]}),
      db().query(`SELECT title,milestones,updated_at FROM mutual_action_plans WHERE scenario_id=$1 OR (owner_id=$2 AND LOWER(company)=LOWER($3)) ORDER BY (scenario_id=$1) DESC,updated_at DESC LIMIT 1`,[scenarioId,scenario.owner_id,scenario.company])
    ]);
    const story=buildExecutiveValueStory({scenario,governance:governance.rows[0]||{},stakeholders:stakeholders.rows,discovery:discovery.rows,solutionFit:handoff.rows[0]||null,jointProjectPlan:plans.rows[0]||null,proposal});
    const readiness=evaluateExecutiveOutputReadiness(story,{outputType:'proposal'});
    if(readiness.status==='draft_only'&&!req.body?.internalDraft)return res.status(409).json({error:'This proposal is Draft Only. Resolve blockers or explicitly export an internal draft.',readiness});
    if(readiness.status==='review'&&!req.body?.reviewAcknowledged)return res.status(409).json({error:'Review acknowledgement is required before export.',readiness});
    const company = clean(story.meta.customer, 160) || 'Prospect';
    const wordBrand = brand.documentTheme('customer');
    const title = clean(proposal.title, 220) || (company + ' executive proposal');
    const text = (value, opts = {}) => new TextRun({ text: clean(value), font: wordBrand.font, size: wordBrand.type.body, ...opts });
    const para = (value, opts = {}) => new Paragraph({ children: [text(value, opts.run || {})], ...opts });
    const heading = value => new Paragraph({ text: clean(value), heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 90 } });
    const bullets = values => list(values).map(item => new Paragraph({ children:[text(typeof item === 'string' ? item : '')], bullet:{level:0}, spacing:{after:60} }));
    const table = (values, left, right) => new Table({ rows: list(values).map(row => new TableRow({ children:[
      new TableCell({ children:[para(row[left], { run:{ bold:true } })], width:{size:4300,type:WidthType.DXA}, shading:{type:ShadingType.CLEAR,fill:wordBrand.canvas}, borders:{bottom:{style:BorderStyle.SINGLE,size:1,color:wordBrand.border}} }),
      new TableCell({ children:[para(row[right])], width:{size:4700,type:WidthType.DXA}, borders:{bottom:{style:BorderStyle.SINGLE,size:1,color:wordBrand.border}} })
    ] })), width:{size:9000,type:WidthType.DXA}, layout:TableLayoutType.FIXED, columnWidths:[4300,4700] });
    const meta = [
      { label:'Prepared for', value:company }, { label:'Prepared by', value:clean(proposal.preparedBy,160) || 'Cloud Inventory' },
      { label:'Solution', value:clean(story.meta.solution,180) }, { label:'Contract term', value:clean(story.economics.contractMonths+' months',80) },
      { label:'Proposal date', value:clean(proposal.proposalDate,40) }, { label:'Valid through', value:clean(proposal.validThrough,40) }
    ];
    const children = [
      new Paragraph({ children:[new ImageRun({ data:fs.readFileSync(path.join(PUBLIC_DIR,wordBrand.logo)), transformation:{width:180,height:Math.round(180*wordBrand.logoAspect)} })], spacing:{after:90} }),
      para('Commercial proposal', { run:{bold:true,size:wordBrand.type.label,color:wordBrand.accent}, spacing:{before:160,after:80} }),
      para(title, { run:{bold:true,size:wordBrand.type.display,color:wordBrand.heading}, spacing:{after:110} }),
      para('Prepared for ' + company, { run:{size:wordBrand.type.sectionHeading,color:wordBrand.muted}, spacing:{after:160} }),
      table(meta, 'label', 'value'),
      ...(req.body?.internalDraft?[para('DRAFT — NOT READY FOR CUSTOMER SHARING',{run:{bold:true,color:wordBrand.danger},spacing:{after:120}})]:[]),
      heading('Executive summary'), para(proposal.situation),
      new Paragraph({ text:'Our recommendation', heading:HeadingLevel.HEADING_3, spacing:{before:150,after:50} }), para(proposal.recommendation),
      new Paragraph({ text:'Expected outcome', heading:HeadingLevel.HEADING_3, spacing:{before:150,after:50} }), para(`${story.economics.annualBenefit.toLocaleString()} ${story.meta.currency} annual customer benefit; ${story.economics.totalContractBenefit.toLocaleString()} total contract benefit; ${story.economics.netEconomicBenefit.toLocaleString()} net economic benefit; ${Math.round(story.economics.contractRoi)}% contract ROI.`, { shading:{type:ShadingType.CLEAR,fill:wordBrand.infoSurface}, border:{left:{style:BorderStyle.SINGLE,size:12,color:wordBrand.accent}}, indent:{left:160}, spacing:{before:100,after:100} }),
      heading('The value case'),
      new Paragraph({ text:'Why change', heading:HeadingLevel.HEADING_3 }), para(story.threeWhys.whyChange.value),
      new Paragraph({ text:'Why Cloud Inventory', heading:HeadingLevel.HEADING_3 }), para(story.threeWhys.whyCloudInventory.value),
      new Paragraph({ text:'Why now', heading:HeadingLevel.HEADING_3 }), para(story.threeWhys.whyNow.value),
      heading('Solution and investment'), new Paragraph({ text:'In scope', heading:HeadingLevel.HEADING_3 }), ...bullets(story.solutionAlignment.priorityWorkflows.map(x=>x.name)),
      new Paragraph({ text:'Commercial investment', heading:HeadingLevel.HEADING_3, spacing:{before:140,after:60} }), table(proposal.investment, 'label', 'value'),
      new Paragraph({ text:'Delivery approach', heading:HeadingLevel.HEADING_3, spacing:{before:140,after:50} }), para(`ROI modeling assumption: ${story.implementationContext.modelingMonths||0} months to implementation/go-live. This is not a delivery commitment.`),
      heading('Success and next steps'), new Paragraph({ text:'How we will measure success', heading:HeadingLevel.HEADING_3, spacing:{after:60} }), table(story.economics.activeDrivers.slice(0,5).map(x=>({metric:x.label,target:x.annualValue.toLocaleString()+' '+story.meta.currency+' / year · '+x.status})), 'metric', 'target'),
      new Paragraph({ text:'Joint next steps', heading:HeadingLevel.HEADING_3, spacing:{before:140,after:60} }), ...bullets(story.nextSteps.items.map(x=>[x.milestone,x.owner,x.dueDate].filter(Boolean).join(' — ')))
    ];
    const doc = new Document({ styles:brandedWordStyles(wordBrand), sections:[{ footers:{ default:new Footer({ children:[new Paragraph({ children:[text(wordBrand.footer+' · Prepared for '+company+' · Story '+story.storyRevision, {size:wordBrand.type.caption,color:wordBrand.muted})], alignment:AlignmentType.CENTER })] }) }, children }] });
    const buffer = await Packer.toBuffer(doc);
    const safe = company.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Prospect';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Cloud-Inventory-Proposal-${safe}-${new Date().toISOString().slice(0,10)}.docx"`);
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
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
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
    if(scenarioId){const access=await scenarioAccess(req.user,scenarioId,'view');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Access denied.'});}
    const { rows } = await query(
      `SELECT ds.id, ds.token, ds.scenario_id, ds.industry, ds.company,
              ds.base_id, ds.source_scenario_version, ds.questionnaire_schema_source,
              ds.is_active, ds.expires_at, ds.created_at, ds.updated_at,
              ds.open_count, ds.first_opened, ds.last_opened,
              ds.submitted_at, ds.answer_count, ds.last_submitted_at, ds.submission_count,
              latest.id latest_submission_id, latest.submission_number latest_submission_number,
              COALESCE(
                json_agg(json_build_object('questionId', da.question_id, 'answer', da.answer, 'enteredBy', da.entered_by) ORDER BY da.question_id)
                FILTER (WHERE da.id IS NOT NULL), '[]'::json
              ) AS answers
       FROM discovery_sessions ds
       LEFT JOIN discovery_answers da ON da.session_id = ds.id
       LEFT JOIN LATERAL(SELECT id,submission_number FROM discovery_submissions sub WHERE sub.discovery_session_id=ds.id ORDER BY submission_number DESC LIMIT 1) latest ON TRUE
       WHERE ${scenarioId ? 'ds.scenario_id = $2' : 'ds.owner_id = $1'} AND ds.is_active = TRUE
       GROUP BY ds.id,latest.id,latest.submission_number ORDER BY ds.updated_at DESC LIMIT 20`,
      scenarioId ? [req.user.id, scenarioId] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load discovery sessions.' }); }
});

app.post('/api/discovery/sessions', requireAuth, async (req, res) => {
  try {
    const { scenarioId } = req.body||{};
    if(!scenarioId)return res.status(400).json({error:'Save this opportunity before creating a Prospect Link.'});
    const access=await scenarioAccess(req.user,scenarioId,'edit');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'You do not have permission to create a Prospect Link for this opportunity.'});
    const token = crypto.randomBytes(32).toString('hex');
    const { transaction } = db();
    const rows=await transaction(async client=>{const sc=await client.query(`SELECT s.id,s.base_id,s.version,s.owner_id,s.company,s.industry,COALESCE(c.has_field_inventory,FALSE) has_field_inventory FROM scenarios s LEFT JOIN customers c ON c.id=s.customer_id WHERE s.id=$1 AND s.deleted_at IS NULL`,[scenarioId]);if(!sc.rows.length)throw Object.assign(new Error('Scenario not found.'),{status:404});const x=sc.rows[0];const made=await client.query(`INSERT INTO discovery_sessions(scenario_id,base_id,source_scenario_version,owner_id,token,industry,company,has_field_inventory,questionnaire_schema_source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'server_generated') RETURNING *`,[x.id,x.base_id,x.version,x.owner_id,token,x.industry||'default',x.company||'',x.has_field_inventory]);const {ensureSessionQuestions}=require('./src/shared/discovery-session-schema');await ensureSessionQuestions(client,made.rows[0]);return made.rows;});
    const { log, ACTIONS } = require('./src/audit');
    await log({ userId: req.user.id, action: ACTIONS.DISCOVERY_LINK_GENERATED, entityType: 'discovery_session', entityId: rows[0].id, ipAddress: req.ip });
    res.json({ ok: true, token: rows[0].token, sessionId: rows[0].id, prospectUrl: `${APP_URL}/prospect.html?token=${rows[0].token}` });
  } catch(err) { res.status(err.status||500).json({ error: err.message||'Failed to create discovery session.' }); }
});

/* ── Customer field-inventory flag ──────────────────────────────────
   GET  /api/customers/:id/field-inventory  — read the flag
   PATCH /api/customers/:id/field-inventory  — set true/false        */
app.get('/api/customers/:id/field-inventory', requireAuth, async (req, res) => {
  try {
    const { query } = db();
    const {customerAccess}=require('./src/authorization');const access=await customerAccess(req.user,req.params.id,'view');if(!access.exists)return res.status(404).json({error:'Customer not found.'});if(!access.allowed)return res.status(403).json({error:'Access denied.'});
    const { rows } = await query(
      `SELECT has_field_inventory FROM customers WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ hasFieldInventory: rows[0].has_field_inventory });
  } catch(err) { res.status(500).json({ error: 'Failed to read flag.' }); }
});

app.patch('/api/customers/:id/field-inventory', requireAuth, async (req, res) => {
  try {
    const val = !!req.body.hasFieldInventory;
    const { query } = db();
    const {customerAccess}=require('./src/authorization');const access=await customerAccess(req.user,req.params.id,'edit');if(!access.exists)return res.status(404).json({error:'Customer not found.'});if(!access.allowed)return res.status(403).json({error:'Customer edit permission required.'});
    const { rowCount } = await query(
      `UPDATE customers SET has_field_inventory = $1, updated_at = NOW()
       WHERE id = $2`,
      [val, req.params.id]
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
              ds.base_id,ds.source_scenario_version,ds.questionnaire_schema_source,ds.has_field_inventory,
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
    const {ensureSessionQuestions,groupSessionQuestions}=require('./src/shared/discovery-session-schema');
    const questions=await ensureSessionQuestions({query},s,{legacy:!s.base_id||s.questionnaire_schema_source!=='server_generated'});
    res.json({
      industry:s.industry,
      company:s.company,
      has_field_inventory:!!s.has_field_inventory,
      answers:s.answers,
      questionnaire:groupSessionQuestions(questions)
    });
  } catch(err) { res.status(500).json({ error: 'Failed to load discovery session.' }); }
});

app.put('/api/discovery/sessions/:token/answers', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    const { questionId, answer } = req.body;
    if (!await isValidDiscoveryToken(token) || !questionId) {
      return res.status(400).json({ error: 'valid token and questionId required.' });
    }
    const { query } = db();
    const { rows: sessions } = await query('SELECT * FROM discovery_sessions WHERE token = $1', [token]);
    if (!sessions.length) return res.status(404).json({ error: 'Session not found.' });
    const s = sessions[0];
    if (!s.is_active) return res.status(410).json({ error: 'Session is no longer active.' });
    if (s.expires_at && new Date(s.expires_at) < new Date()) return res.status(410).json({ error: 'Session has expired.' });
    const {ensureSessionQuestions}=require('./src/shared/discovery-session-schema');await ensureSessionQuestions({query},s,{legacy:s.questionnaire_schema_source!=='server_generated'});
    const known=await query(`SELECT 1 FROM discovery_session_questions WHERE discovery_session_id=$1 AND question_id=$2`,[s.id,String(questionId)]);if(!known.rows.length)return res.status(400).json({error:'This question is not part of the governed Prospect questionnaire.'});
    await query(
      `INSERT INTO discovery_answers (session_id, question_id, answer, entered_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, question_id) DO UPDATE SET answer = EXCLUDED.answer, entered_by = EXCLUDED.entered_by, updated_at = NOW()`,
      [s.id, questionId, answer || '', 'prospect']
    );
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Failed to save answer.' }); }
});

/* Authenticated rep working-answer path. Public tokens can never manufacture
   rep provenance, and knowing a session UUID is not authorization. */
app.put('/api/discovery/session-records/:sessionId/answers',requireAuth,async(req,res)=>{try{
  const {questionId,answer}=req.body||{};if(!questionId)return res.status(400).json({error:'questionId is required.'});const {query}=db();const session=await query(`SELECT * FROM discovery_sessions WHERE id=$1`,[req.params.sessionId]);if(!session.rows.length)return res.status(404).json({error:'Session not found.'});const s=session.rows[0];const access=await scenarioAccess(req.user,s.scenario_id,'edit');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Opportunity edit permission required.'});const {ensureSessionQuestions}=require('./src/shared/discovery-session-schema');await ensureSessionQuestions({query},s,{legacy:s.questionnaire_schema_source!=='server_generated'});const known=await query(`SELECT 1 FROM discovery_session_questions WHERE discovery_session_id=$1 AND question_id=$2`,[s.id,String(questionId)]);if(!known.rows.length)return res.status(400).json({error:'Unknown governed question.'});await query(`INSERT INTO discovery_answers(session_id,question_id,answer,entered_by) VALUES($1,$2,$3,'rep') ON CONFLICT(session_id,question_id) DO UPDATE SET answer=EXCLUDED.answer,entered_by='rep',updated_at=NOW()`,[s.id,String(questionId),answer||'']);res.json({ok:true,enteredBy:'rep'});
}catch(err){console.error('Rep discovery answer error:',err.message);res.status(500).json({error:'Failed to save answer.'});}});

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
    const { query,transaction } = db();
    const clientSubmissionId=String(req.body?.clientSubmissionId||'').trim();
    if(!/^[a-zA-Z0-9_-]{12,120}$/.test(clientSubmissionId))return res.status(400).json({error:'A valid submission idempotency key is required.'});
    const result=await transaction(async client=>{
      const locked=await client.query(`SELECT ds.*,s.base_id,s.version source_scenario_version FROM discovery_sessions ds JOIN scenarios s ON s.id=ds.scenario_id WHERE ds.token=$1 AND ds.is_active=TRUE FOR UPDATE OF ds`,[token]);
      if(!locked.rows.length)throw Object.assign(new Error('Session not found or inactive.'),{status:404});const session=locked.rows[0];
      const existing=await client.query(`SELECT * FROM discovery_submissions WHERE discovery_session_id=$1 AND client_submission_id=$2`,[session.id,clientSubmissionId]);if(existing.rows.length)return{session,submission:existing.rows[0],duplicate:true};
      const {ensureSessionQuestions}=require('./src/shared/discovery-session-schema');const schema=await ensureSessionQuestions(client,session,{legacy:session.questionnaire_schema_source!=='server_generated'}),context=new Map(schema.map(q=>[String(q.question_id),q]));
      const answers=(await client.query(`SELECT da.question_id,da.answer FROM discovery_answers da JOIN discovery_session_questions q ON q.discovery_session_id=da.session_id AND q.question_id=da.question_id WHERE da.session_id=$1 AND da.answer IS NOT NULL AND BTRIM(da.answer)<>'' ORDER BY q.display_order`,[session.id])).rows;
      const number=Number(session.submission_count||0)+1,hash=crypto.createHash('sha256').update(JSON.stringify(answers)).digest('hex');
      const made=await client.query(`INSERT INTO discovery_submissions(discovery_session_id,base_id,source_scenario_id,source_scenario_version,submission_number,answer_count,submitted_by,submission_hash,client_submission_id) VALUES($1,$2,$3,$4,$5,$6,'prospect',$7,$8) RETURNING *`,[session.id,session.base_id,session.scenario_id,session.source_scenario_version,number,answers.length,hash,clientSubmissionId]);const submission=made.rows[0];
      for(const answer of answers){const meta=context.get(String(answer.question_id));let normalized=meta.classification==='financial_input'?Number(String(answer.answer).replace(/[$,%\s,]/g,'')):null;if(Number.isFinite(normalized)&&meta.conversion==='hoursPerWeek')normalized=Math.min(100,(normalized/40)*100);await client.query(`INSERT INTO discovery_submission_answers(submission_id,question_id,question_text,section,classification,canonical_input,answer_text,normalized_value,unit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[submission.id,answer.question_id,meta.question_text,meta.section,meta.classification,meta.canonical_input,answer.answer,Number.isFinite(normalized)?normalized:null,meta.unit]);if(meta.classification==='financial_input'&&meta.canonical_input&&Number.isFinite(normalized))await client.query(`INSERT INTO roi_value_events(base_id,canonical_input,question_id,event_type,value_text,normalized_value,currency,unit,source_scenario_id,source_scenario_version,discovery_submission_id,evidence_source,evidence_date,provenance_state) VALUES($1,$2,$3,'prospect_submitted',$4,$5,NULL,$6,$7,$8,$9,'Prospect Link submission',$10,'confirmed_prospect')`,[session.base_id,meta.canonical_input,answer.question_id,answer.answer,normalized,meta.unit,session.scenario_id,session.source_scenario_version,submission.id,submission.submitted_at]);}
      await client.query(`UPDATE discovery_sessions SET submitted_at=COALESCE(submitted_at,$2),last_submitted_at=$2,submission_count=$3,answer_count=$4,updated_at=NOW() WHERE id=$1`,[session.id,submission.submitted_at,number,answers.length]);return{session,submission,duplicate:false};
    });
    const s={...result.session,id:result.session.id,submitted_at:result.submission.submitted_at,answer_count:result.submission.answer_count};
    res.status(result.duplicate?200:201).json({ok:true,submissionId:result.submission.id,submissionNumber:result.submission.submission_number,submittedAt:s.submitted_at,answerCount:s.answer_count,idempotentReplay:result.duplicate});

    /* ── Async: email the rep (never blocks the response) ── */
    if (!result.duplicate) {
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
          action:     'discovery.submission_snapshot_created',
          entityType: 'discovery_submission',
          entityId:   result.submission.id,
          detail:     { sessionId:s.id, baseId:s.base_id, submissionNumber:result.submission.submission_number, answerCount:s.answer_count }
        });
      } catch (auditErr) {
        console.error('[discovery submit] audit log failed:', auditErr.message);
      }
    }
  } catch (err) {
    console.error('[discovery submit] error:', err.message);
    res.status(err.status||500).json({ error: err.message||'Failed to record submission.' });
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
    const session=await query(`SELECT id,scenario_id FROM discovery_sessions WHERE token=$1 AND is_active=TRUE`,[String(req.params.token||'')]);if(!session.rows.length)return res.status(404).json({error:'Session not found or already inactive.'});const access=await scenarioAccess(req.user,session.rows[0].scenario_id,'edit');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Opportunity edit permission required.'});
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
    const session=await query(`SELECT id,scenario_id FROM discovery_sessions WHERE token=$1 AND is_active=TRUE`,[String(req.params.token||'')]);if(!session.rows.length)return res.status(404).json({error:'Session not found.'});const access=await scenarioAccess(req.user,session.rows[0].scenario_id,'edit');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Opportunity edit permission required.'});
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
    /* Preserve compatibility for historical scenarios and keep customer-facing
       contract economics authoritative without mutating the stored version. */
    let shareData = rows[0].data || {};
    try {
      const r = calcROIShared(shareData);
      shareData = {
        ...shareData,
        contractMonths: r.contractMonths,
        contractYears: r.contractYears,
        totalContractBenefit: r.totalContractBenefit,
        totalContractInvestment: r.totalContractInvestment,
        totalContractNetBenefit: r.totalContractNetBenefit,
        totalContractRoi: r.totalContractRoi,
        totalContractNpv: r.totalContractNpv,
        contractPayback: r.contractPayback
      };
    } catch (err) {
      console.warn('Business-case contract recompute failed:', err.message);
    }
    res.json({ company: rows[0].company, title: rows[0].title, data: shareData });
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
    const { token, messages, questionId } = req.body || {};
    if (!token || !questionId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'token, questionId and messages required.' });
    }
    /* Validate discovery token so only real prospect links can call this. */
    if (!await isValidDiscoveryToken(token)) {
      return res.status(403).json({ error: 'Invalid or expired session.' });
    }
    /* Resolve the exact governed question server-side. Client-supplied labels,
       classifications and financial mappings are deliberately ignored. */
    const {query}=db();
    const governed=(await query(`SELECT q.question_id,q.question_text,q.section,q.input_type,q.classification,q.canonical_input,q.unit,q.placeholder,a.answer existing_value FROM discovery_sessions s JOIN discovery_session_questions q ON q.discovery_session_id=s.id LEFT JOIN discovery_answers a ON a.session_id=s.id AND a.question_id=q.question_id WHERE s.token=$1 AND s.is_active=TRUE AND q.question_id=$2 LIMIT 1`,[token,String(questionId)])).rows[0];
    if(!governed)return res.status(400).json({error:'Question is not part of this governed Prospect questionnaire.'});
    const safeField = {
      audience: 'Prospect',
      screen:'Prospect Link',section:String(governed.section||'').slice(0,120),field:String(governed.question_id),fieldLabel:String(governed.question_text).slice(0,600),question:String(governed.question_text).slice(0,600),
      description:String(governed.placeholder||'').slice(0,500),inputType:String(governed.input_type||'text'),units:String(governed.unit||''),existingValue:String(governed.existing_value||'').slice(0,200),classification:String(governed.classification||'context'),
      relevantPriorInputs:[],
      allowedContext: 'Explain the active questionnaire field using only this prospect-safe object.',
      contextClassification: 'Prospect-Safe'
    };
    /* Hard-coded system prompt — client cannot override it. */
    const system = [
      'You are concise, neutral, customer-friendly field Help for a business operations questionnaire.',
      'Answer in the context of the ACTIVE FIELD CONTEXT below. Explain what the field means, why the information is requested, what to include or exclude, the relevant unit and period, and where the prospect might find it.',
      'Never invent an answer, benchmark, persuade, sell, calculate ROI, discuss products, or reveal sales methodology. Clearly distinguish known facts, supported estimates, assumptions, and unknowns. If unknown, suggest a best supported estimate, an internal source or colleague, or leaving it unknown when allowed.',
      'Do not expose sales strategy or any other internal-only information.',
      'Use relevant prior inputs only when they materially clarify this field. Preserve the active-field meaning for follow-up questions.',
      'You have no access to internal strategy, coaching, risk, champion, economic-buyer, stakeholder classification, competitive, forecast, qualification, closing, discount, notes, or comments. If asked outside questionnaire Help, politely redirect to the Cloud Inventory contact.',
      'ACTIVE FIELD CONTEXT: ' + JSON.stringify(safeField)
    ].join(' ');
    const safeMessages = messages.slice(-8).map(m => ({
      role: m && m.role === 'assistant' ? 'assistant' : 'user',
      content: String((m && m.content) || '').slice(0, 2000)
    })).filter(m => m.content);
    if (!safeMessages.length) return res.status(400).json({ error: 'messages required.' });
    const payload = {
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system,
      messages: safeMessages
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
