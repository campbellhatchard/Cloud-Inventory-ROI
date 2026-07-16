# Cloud Inventory ROI Builder v2.8.1 — Render-ready package

This package is structured for GitHub repository root deployment through a Render Blueprint.

## Required root files

- `render.yaml`
- `package.json`
- `package-lock.json`
- `.node-version`
- `server.js`
- `src/`
- `public/`
- `migrations/`

## Render deployment

The Blueprint creates or updates:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`

The service uses:

- Node runtime
- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`
- Health check path: `/health`
- Auto deploy on commit
- Shutdown delay: 15 seconds

## Administrator account

Initial account:

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

Keep the GitHub repository private because the bootstrap password is present in `render.yaml` and migration history.

## Optional integrations

Add these manually in Render only if required:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `APP_URL` for a custom domain override

The application can derive the default onrender.com URL from Render runtime variables.
