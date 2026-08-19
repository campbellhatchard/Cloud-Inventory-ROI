# Cloud Inventory ROI Builder v4.4.1

Render-ready deployment package for the Cloud Inventory ROI Builder.

## Deployment

This package is intended to be committed at the root of the GitHub repository used by Render. The repository root should contain:

- `render.yaml`
- `package.json`
- `package-lock.json`
- `.node-version`
- `.npmrc`
- `server.js`
- `src/`
- `public/`
- `migrations/`

Render will run:

```bash
npm ci --omit=dev --no-audit --no-fund
node server.js
```

## Health check

After deployment:

```text
https://cloud-inventory-roi.onrender.com/health
```

Expected version: `4.4.1`.
