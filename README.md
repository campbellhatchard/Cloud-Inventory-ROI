# Cloud Inventory ROI Builder v2.4.2

Render-ready Node.js/Express application with PostgreSQL persistence.

## Repository root

Deploy the **contents** of this package at the root of the GitHub repository. The root must contain:

- `render.yaml`
- `package.json`
- `package-lock.json`
- `server.js`
- `.node-version`
- `.npmrc`
- `migrations/`
- `public/`
- `src/`

## Render Blueprint

The Blueprint creates or updates:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`

Deployment commands:

- Build: `npm ci --omit=dev --no-audit --no-fund`
- Start: `node server.js`
- Health check: `/health`
- Auto deploy: every commit to the linked branch

Node is pinned to `22.22.0`.

## Initial administrator

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

The bootstrap administrator is not forced through the first-login password-change screen. Change the password from the profile after signing in. Once changed, later deploys preserve the user-managed password.

Keep the GitHub repository private because the bootstrap credential is deliberately present in `render.yaml` and migration history.

## Optional integrations

The core Blueprint does not require optional secrets. Add these manually in the Render service Environment page when needed:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `APP_URL` only for a custom-domain override

Without `APP_URL`, generated links use Render's `RENDER_EXTERNAL_HOSTNAME`.

## Health response

A healthy production deployment returns HTTP 200 from `/health` with:

```json
{
  "status": "ok",
  "version": "2.4.2",
  "database": "connected",
  "phase": "production"
}
```

## Deployment behavior

- PostgreSQL is mandatory in Render production.
- Startup retries database connectivity while a Blueprint-created database becomes ready.
- Migrations run before the HTTP listener starts.
- The application handles `SIGTERM`, stops timers and cron jobs, closes the HTTP server, and drains the PostgreSQL pool.
- Render waits up to 15 seconds for graceful shutdown; the application enforces a 10-second internal limit.

## Local smoke test without PostgreSQL

```powershell
$env:REQUIRE_DATABASE = "false"
$env:NODE_ENV = "development"
$env:PORT = "3000"
npm ci
node server.js
```

Do not set `REQUIRE_DATABASE=false` in Render.
