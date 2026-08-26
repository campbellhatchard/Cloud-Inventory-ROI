# Cloud Inventory ROI Business Case Builder

A multi-user SaaS application for Cloud Inventory sales reps and Solution Engineers to build data-driven executive business cases for prospects evaluating Cloud Inventory's WMS and field inventory solutions.

---

## What it does

- **ROI Calculator** — Live-updating model with 10 value drivers (labor, shrinkage, carrying cost, inventory turns, OTIF, downtime, expediting, field inventory, IT displacement, WMS levers)
- **Discovery guide** — Industry-specific question sets with a shareable prospect link so prospects can contribute their own data
- **Executive view** — CFO-ready narrative, Three Whys framework, PDF and PowerPoint exports
- **Solution Fit** — Pre-sales handoff document for Services / Solution Engineering
- **Action plans** — Mutual action plan builder with milestone tracking and a shareable prospect link
- **Stakeholder map** — Influence/support matrix with AI gap analysis
- **Scenario templates** — Pre-populated starting points for 6 verticals
- **Version history & diffing** — Every save creates a version; compare any two side by side
- **Admin tools** — User management, benchmarks, audit log, data export, test data cleanup with undo, resonance analytics

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Database | PostgreSQL 16 (via `pg` pool) |
| Auth | JWT (8-hour sessions) + bcrypt |
| AI | Anthropic Claude API |
| Email | SendGrid |
| Frontend | Vanilla JS + CSS — no build step |
| Deployment | Render (web service + managed Postgres) |

---

## Local development

### Prerequisites
- Node.js 22
- PostgreSQL 16

### Setup

```bash
git clone <repo-url>
cd cloud-inventory-roi-builder
npm install
cp .env.example .env   # edit with your values
npm run migrate
npm run dev             # → http://localhost:3000
```

### Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing JWTs |
| `BCRYPT_ROUNDS` | bcrypt work factor 10–15 (use 12) |
| `BOOTSTRAP_ADMIN_USERNAME` | Admin account username |
| `BOOTSTRAP_ADMIN_PASSWORD` | Admin account password (min 12 chars) |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin account email |
| `NODE_ENV` | Set to `production` on Render |

### Optional environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Enables AI features |
| `ANTHROPIC_MODEL` | Claude model — default `claude-sonnet-4-6` |
| `SENDGRID_API_KEY` | Enables discovery + password reset emails |
| `FROM_EMAIL` | From address for SendGrid emails |
| `APP_URL` | Base URL used in email links |

Without `SENDGRID_API_KEY` the app runs fully — emails are silently skipped.

---

## Database migrations

Migrations live in `migrations/*.sql` (001–022). They run automatically on every server startup. The runner tracks applied migrations in `schema_migrations` and only runs new ones.

```bash
npm run migrate   # run manually
```

**Security note:** The migration runner ensures the bootstrap admin exists. After the administrator completes the mandatory first-login password change, startup preserves that user-managed password rather than overwriting it.

---

## Deployment (Render)

`render.yaml` defines the web service and Postgres database. Set these **secrets in the Render dashboard** (not in `render.yaml`):

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_EMAIL`
- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`

Push to the connected GitHub branch. Render installs with `npm ci` and starts `node server.js`. Migrations run automatically before the server accepts traffic.

---

## Project structure

```
├── server.js                  # Express app and all routes
├── src/
│   ├── auth.js                # JWT signing and session helpers
│   ├── audit.js               # Audit log helpers
│   ├── db.js                  # PostgreSQL connection pool
│   ├── email.js               # SendGrid helpers
│   ├── migrate.js             # Migration runner
│   ├── middleware/auth.js     # requireAuth middleware
│   ├── routes/
│   │   ├── auth.js            # Login, logout, forgot/reset password
│   │   ├── maps.js            # Mutual action plans
│   │   ├── scenarios.js       # Scenarios CRUD, versions, outcome, resonance
│   │   ├── stakeholders.js    # Stakeholder maps
│   │   └── users.js           # User management (admin)
│   └── shared/roi-engine.js   # ROI calculation engine
├── migrations/                # SQL migration files (001–022)
├── public/                    # Frontend (no build step)
│   ├── index.html             # Main app shell
│   ├── prospect.html          # Standalone prospect questionnaire
│   ├── print.html             # PDF print page
│   ├── app.js                 # Scenario CRUD, tab routing
│   ├── features.js            # Analytics, sensitivity, CRM push
│   ├── discovery.js           # Discovery guide
│   ├── solution-fit.js        # Solution Fit tab
│   ├── versioning.js          # Version history and diff
│   ├── scenario-templates.js  # Vertical templates
│   ├── calc-wizard.js         # Guided mode
│   ├── ux-enhancements.js     # Keyboard shortcuts, onboarding
│   ├── industry-data.js       # Industry benchmarks
│   ├── pptx-export.js         # PowerPoint export
│   └── style.css              # All styles
└── test/
    ├── roi-engine.test.js     # ROI engine unit tests (17 tests)
    └── routes.test.js         # Integration tests (requires DB)
```

---

## Tests

```bash
npm run test:engine   # ROI engine unit tests (no DB required)
npm run test:routes   # Integration tests (requires DATABASE_URL)
npm test              # Both
```

---

## Adding a vertical template

Edit `public/scenario-templates.js`, add an entry to `SCENARIO_TEMPLATES`:

```js
{
  id: 'retail',
  label: 'Retail',
  icon: '🛍️',
  industry: 'retail',
  description: 'High-SKU retail inventory...',
  keyDrivers: ['Shrinkage', 'OTIF', 'Inventory turns'],
  data: { name: 'Retail — ROI', industry: 'retail', revenue: 60000000, ... }
}
```

---

## Security notes

- Keep the repo **private** — migration 003 contains the bootstrap admin logic
- `JWT_SECRET` is auto-generated by Render — never share it
- All `/api/*` routes except `/api/auth/*` and `/api/discovery/*` require a valid JWT
- The AI endpoint is rate-limited to 20 req/15 min per IP, plus the global 100 req/min limit

---

## Version

Current: **v5.6.3** — see Admin → Version history for full changelog.
