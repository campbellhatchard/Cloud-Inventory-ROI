# Cloud Inventory ROI Builder v4.2.0

Render-ready deployment package for the Cloud Inventory ROI Builder.

## Deployment target

- Render web service: `cloud-inventory-roi`
- Render database: `cloud-inventory-roi-db`
- Git branch: `main`

## Required runtime

Node.js is pinned to `22.22.0` through:

- `.node-version`
- `package.json` `engines.node`
- `render.yaml` `NODE_VERSION`

## Render deployment

Render uses `render.yaml` at the repository root.

Build command:

```bash
npm ci --omit=dev --no-audit --no-fund
```

Start command:

```bash
node server.js
```

Health check:

```text
/health
```

## Admin bootstrap

The Render Blueprint includes the bootstrap admin values:

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

If the database already contains the admin user, the existing password may remain in effect depending on the bootstrap logic.
