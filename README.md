# Cloud Inventory ROI Builder v2.9.2

Render-ready release prepared from the v2.9.1 developer package.

## Deployment target

- GitHub repository root must contain `render.yaml`, `package.json`, `package-lock.json`, `server.js`, `src/`, `public/`, and `migrations/`.
- Render deploys through Blueprint from `render.yaml`.
- The service is configured as a Node web service with a managed Render PostgreSQL database.

## Render settings

- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`
- Health check path: `/health`
- Node version: `22.22.0`
- Shutdown delay: `15` seconds
- Web plan: `starter`
- PostgreSQL plan: `basic-256mb`

## Initial administrator

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

Keep the GitHub repository private because the bootstrap credential is present in `render.yaml`.

## Optional integrations

Add these manually in Render Environment settings only when needed:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `APP_URL`

The application derives its default public URL from Render when possible. `APP_URL` is only needed for a custom domain override.

## Public discovery links

This release preserves the developer update to generate prospect links with `?token=` and supports legacy `#token=` links in `public/prospect.html`.
