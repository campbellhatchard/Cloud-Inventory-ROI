# Cloud Inventory ROI v4.4.1 — Deployment Validation

## Package reviewed

Input: `cloud-inventory-roi-v4_4_1.zip`
Output: `cloud-inventory-roi-v4.4.1-render-ready.zip`

## Deployment target

This package targets the existing production Render resources defined in `render.yaml`:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`
- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`
- Health check: `/health`
- Node version: `22.22.0`

## Packaging corrections applied

No application logic was changed. The following packaging-only corrections were applied:

1. Moved `.node-version` to the package root.
2. Moved `.github/workflows/ci.yml` to the package root.
3. Removed the leftover nested `cloud-inventory-roi-v4_0_0/` folder.
4. Aligned `package-lock.json` root version from `2.9.3` to `4.4.1`.
5. Added `.npmrc` to force `https://registry.npmjs.org/`.

## Validation performed

- ZIP integrity check: passed.
- Required Render root files: passed.
- `render.yaml` structure: passed.
- `package.json` / `package-lock.json` version alignment: passed.
- `.node-version` at package root: passed.
- `.github/workflows/ci.yml` at package root: passed.
- Public npm registry hygiene: passed.
- JavaScript syntax checks across `server.js`, `src/`, `public/`, and `test/`: passed.
- Inline HTML script syntax checks: passed.
- ROI engine test suite: 22 passed, 0 failed.
- Route test loader: passed; DB integration tests skipped because `DATABASE_URL` is not set in the sandbox.
- Discovery public-link auth fix: still present.
- Migrations present through `015_scenario_shares.sql`.
- Final ZIP excludes `node_modules`.

## Runtime caveat

A full live `npm ci` was not run in the sandbox. The deployment toolkit runs `npm ci --omit=dev --no-audit --no-fund` locally before pushing to GitHub.

## Post-deployment validation

After Render deploys, expected health response:

```json
{
  "status": "ok",
  "version": "4.4.1",
  "database": "connected",
  "phase": "production"
}
```
