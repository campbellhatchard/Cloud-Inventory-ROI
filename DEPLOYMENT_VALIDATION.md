# Cloud Inventory ROI v4.4.0 Deployment Validation

Generated: 2026-08-19

## Source package

Uploaded build: `cloud-inventory-roi-v4_4_0.zip`

## Corrections applied

- Moved `.node-version` to the package root.
- Moved `.github/workflows/ci.yml` to the package root.
- Removed the leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package-lock.json` root metadata to `4.4.0`.
- Added `.npmrc` to force the public npm registry.

No application logic was changed during packaging.

## Validation results

- ZIP integrity: passed.
- Required Render root files: passed.
- `render.yaml` structure: passed.
- `package.json` / `package-lock.json` version alignment: passed.
- `.node-version` at package root: passed.
- `.github/workflows/ci.yml` at package root: passed.
- JavaScript syntax checks: passed.
- ROI engine test suite: 22 passed, 0 failed.
- Route test loader: passed; database integration tests skipped because `DATABASE_URL` is not set in the sandbox.
- Discovery public-link auth fix: present.
- Migrations present through `015_scenario_shares.sql`.
- `node_modules` excluded from final ZIP.

## Deployment target

This package targets the existing production Render Blueprint resource names:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`

Expected production health response after deploy:

```json
{
  "status": "ok",
  "version": "4.4.0",
  "database": "connected",
  "phase": "production"
}
```

## Notes

The PowerShell deployment toolkit validates the package in a temporary directory, runs `npm ci --omit=dev --no-audit --no-fund`, then deploys through a temporary Git clone to avoid OneDrive file-lock issues.
