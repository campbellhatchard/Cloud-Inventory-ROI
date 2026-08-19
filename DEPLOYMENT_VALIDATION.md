# Cloud Inventory ROI v4.2.0 Deployment Validation

## Source package

Uploaded package: `cloud-inventory-roi-v4_2_0.zip`

## Deployment target

This package targets the existing production Render Blueprint resources:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`
- Git branch: `main`

## Corrections applied before packaging

1. Moved `.node-version` from the accidentally nested `cloud-inventory-roi-v4_0_0/` folder to the package root.
2. Moved `.github/workflows/ci.yml` from the accidentally nested `cloud-inventory-roi-v4_0_0/` folder to the package root.
3. Removed the leftover nested `cloud-inventory-roi-v4_0_0/` wrapper folder.
4. Aligned `package-lock.json` root version from `2.9.3` to `4.2.0`.
5. Added `.npmrc` to force the public npm registry and prevent inherited/private npm registry settings from affecting Render or local validation.

No application logic was changed during packaging.

## Validation performed

- ZIP integrity check: passed.
- Required Render root files: passed.
- `render.yaml` structure: passed.
- `package.json` / `package-lock.json` version alignment: passed.
- `.node-version` present at root: passed.
- Public npm registry hygiene: passed.
- JavaScript syntax checks: passed for `server.js`, `src/`, `public/`, and `test/`.
- ROI engine tests: 22 passed, 0 failed.
- Route test loader: passed; database integration tests skipped because `DATABASE_URL` is not set in sandbox.
- Discovery public-link auth fix: present.
- Migrations present through `015_scenario_shares.sql`.
- No `node_modules` included in the final ZIP.

## Sandbox limitation

A full live `npm ci` against the npm registry could not be completed reliably inside the sandbox. The deployment toolkit runs `npm ci --omit=dev --no-audit --no-fund` locally before pushing to GitHub.

## Expected Render health response after deployment

```json
{
  "status": "ok",
  "version": "4.2.0",
  "database": "connected",
  "phase": "production"
}
```
