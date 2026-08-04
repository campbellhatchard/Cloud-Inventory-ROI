/* ═══════════════════════════════════════════════════════════════════
   server.js  —  Cloud Inventory ROI Builder  v2.9.2
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
      connectSrc:     ["'self'", 'https://api.anthropic.com'],
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

/* ── Mutual Action Plans ── */
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
const { requireAuth: _reqAuthCompanies } = require('./src/middleware/auth');
app.get('/api/companies', _reqAuthCompanies, async (req, res) => {
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

/* First-class customers (stable IDs). Owner-scoped for now; Phase 2 will
   widen read access for the SE role. */
app.get('/api/customers', _reqAuthCompanies, async (req, res) => {
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

app.get('/api/customers/:id', _reqAuthCompanies, async (req, res) => {
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

app.get('/api/admin/purge/confirm', async (req, res) => {
  try {
    const token = await validatePurgeToken(req.query.token);
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
const { requireAuth } = require('./src/middleware/auth');

app.post('/api/enhance', requireAuth, aiLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });
  const { model, max_tokens, messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required.' });
  const body = JSON.stringify({ model: model || ANTHROPIC_MODEL, max_tokens: max_tokens || 1000, messages });
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

function isValidDiscoveryToken(token) {
  return /^[a-f0-9]{64}$/i.test(String(token || '').trim());
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
    const { rows } = await query(
      `INSERT INTO discovery_sessions (scenario_id, owner_id, token, industry, company) VALUES ($1, $2, $3, $4, $5) RETURNING id, token, created_at`,
      [scenarioId || null, req.user.id, token, industry || 'default', company || '']
    );
    const { log, ACTIONS } = require('./src/audit');
    await log({ userId: req.user.id, action: ACTIONS.DISCOVERY_LINK_GENERATED, entityType: 'discovery_session', entityId: rows[0].id, ipAddress: req.ip });
    res.json({ ok: true, token: rows[0].token, sessionId: rows[0].id, prospectUrl: `${APP_URL}/prospect.html?token=${rows[0].token}` });
  } catch(err) { res.status(500).json({ error: 'Failed to create discovery session.' }); }
});

app.get('/api/discovery/sessions/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidDiscoveryToken(token)) {
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
    if (!isValidDiscoveryToken(token) || !questionId) {
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
    const { rows } = await query(
      `INSERT INTO business_case_shares (token, scenario_id, owner_id, company, title)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, token, created_at`,
      [token, scenarioId, req.user.id, company || '', title || '']
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
       FROM business_case_shares b JOIN scenarios s ON s.id = b.scenario_id
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

/* ── Page routes ── */
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
