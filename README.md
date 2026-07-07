# Cloud Inventory ROI Builder v2.4.1

Render-ready Node.js/Express application with PostgreSQL persistence.

## Render deployment

The repository root must contain:

- `render.yaml`
- `package.json`
- `package-lock.json`
- `server.js`
- `migrations/`
- `public/`
- `src/`

Deploy by creating or synchronizing a Render Blueprint from the repository. The Blueprint creates or updates:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`

The web service runs `node server.js` directly so Render shutdown signals reach the Node process.

## Initial administrator

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

Keep the GitHub repository private because the initial password is intentionally present in `render.yaml`.

On an existing database, the bootstrap process does not overwrite a user-managed administrator password after initial setup.

## Optional environment variables

Add these manually in the Render service Environment page only when required:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `APP_URL` — only for a custom domain override

When `APP_URL` is absent, the application derives its public URL from Render's supported `RENDER_EXTERNAL_HOSTNAME` variable.

## Health endpoint

`GET /health`

A healthy production response includes:

```json
{
  "status": "ok",
  "version": "2.4.1",
  "database": "connected",
  "phase": "production"
}
```

## Local smoke test without PostgreSQL

```powershell
$env:REQUIRE_DATABASE = "false"
$env:PORT = "3000"
npm ci
node server.js
```

Do not set `REQUIRE_DATABASE=false` in Render. The Blueprint explicitly requires PostgreSQL.
