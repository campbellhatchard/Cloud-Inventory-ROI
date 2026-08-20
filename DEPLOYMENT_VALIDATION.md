# Cloud Inventory ROI v4.7.0 Deployment Validation

## Package assessed

- Source upload: `cloud-inventory-roi-v4_7_0.zip`
- Prepared package: `cloud-inventory-roi-v4.7.0-render-ready.zip`
- Target: GitHub-backed Render production deployment

## Packaging corrections applied

- Moved `.node-version` to the package root.
- Moved `.github/workflows/ci.yml` to the package root.
- Removed the leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package-lock.json` from `2.9.3` to `4.7.0`.
- Added `.npmrc` to force the public npm registry.
- Ensured `node_modules`, `.git`, `.env`, and temporary extraction folders are not included in the final deployment ZIP.

No application logic was changed.

## Validation completed

- ZIP integrity: passed.
- Required Render root files: passed.
- `render.yaml` structure: passed.
- `package.json` / `package-lock.json` version alignment: passed.
- `.node-version` at package root: passed.
- `.github/workflows/ci.yml` at package root: passed.
- JavaScript syntax checks: passed.
- Inline HTML script syntax checks: passed.
- ROI engine tests: 17 passed, 0 failed.
- Route test loader: passed; database integration skipped because `DATABASE_URL` is not set in the sandbox.
- Discovery public-link auth fix: still present.
- Migrations present through `015_scenario_shares.sql`.
- No `node_modules` included in final ZIP.

## Sandbox limitation

A full live `npm ci --omit=dev --no-audit --no-fund` timed out in the sandbox environment. The PowerShell deployment toolkit runs `npm ci` locally in a temporary directory before pushing to GitHub.

## Expected Render health result

```json
{
  "status": "ok",
  "version": "4.7.0",
  "database": "connected",
  "phase": "production"
}
```
