# Cloud Inventory ROI v4.4.0

Render-ready deployment package for the Cloud Inventory ROI Builder.

## Deployment

Use the accompanying PowerShell toolkit. It deploys from a temporary Git clone and pushes to GitHub `main`, which triggers Render through the Blueprint auto-deploy configuration.

Default target:

- Repository: `https://github.com/campbellhatchard/Cloud-Inventory-ROI.git`
- Branch: `main`
- Render service: `cloud-inventory-roi`
- Render database: `cloud-inventory-roi-db`

## Health check

After Render deploys, expected `/health` response:

```json
{"status":"ok","version":"4.4.0","database":"connected","phase":"production"}
```

## Admin bootstrap

The Render Blueprint includes the bootstrap admin values. If the production database already contains an admin user, existing credentials may be preserved by the bootstrap logic.
