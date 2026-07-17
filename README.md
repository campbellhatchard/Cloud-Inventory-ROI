# Cloud Inventory ROI Builder v2.9.1

Render-ready production package.

## Deployment

This package is structured for a Render Blueprint deployment from the GitHub repository root.

Required root files:

- `render.yaml`
- `package.json`
- `package-lock.json`
- `.node-version`
- `server.js`
- `src/`
- `public/`
- `migrations/`

Render build command:

```bash
npm ci --omit=dev --no-audit --no-fund
```

Render start command:

```bash
node server.js
```

Health check:

```text
/health
```

Expected health response after deployment:

```json
{
  "status": "ok",
  "version": "2.9.1",
  "database": "connected",
  "phase": "production"
}
```

## Bootstrap administrator

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

Keep the GitHub repository private because the bootstrap credential is present in `render.yaml`.

## Optional integrations

Add these manually in Render only when required:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `APP_URL` for a custom domain override
