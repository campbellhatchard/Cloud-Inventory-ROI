# Cloud Inventory ROI v4.9.1 Deployment Validation

Source upload: `cloud-inventory-roi-v4_9_1.zip`  
Validated package: `cloud-inventory-roi-v4.9.1-render-ready.zip`

## Packaging corrections applied

- Moved `.node-version` to the package root.
- Moved `.github/workflows/ci.yml` to the package root.
- Removed leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package.json` and `package-lock.json` to `4.9.1`.
- Added `.npmrc` to force the public npm registry.
- Removed `node_modules` / Git metadata from the final deployment ZIP.

No application logic was changed.

## Validation checks

- ZIP integrity: passed.
- Required Render root files: passed.
- `render.yaml` structure: passed.
- `package.json` / `package-lock.json` alignment: passed.
- `.node-version` at package root: passed.
- `.github/workflows/ci.yml` at package root: passed.
- Public npm registry hygiene: passed.
- JavaScript syntax checks: passed (53 files).
- Inline HTML script syntax checks: passed (10 inline scripts).
- ROI engine tests: 17 passed, 0 failed.
- Route test loader: passed; DB integration skipped because `DATABASE_URL` is not set in sandbox.
- Discovery public-link auth fix: still present.
- Migrations present through `018_discovery_submission.sql`.
- No `node_modules` included in final ZIP.

## Sandbox caveat

A full live `npm ci --omit=dev --no-audit --no-fund` timed out in this sandbox environment. The PowerShell toolkit runs that same command locally before replacing the GitHub repository contents or pushing to GitHub.

## Render target

This package targets the existing production Render resources defined in `render.yaml`: `cloud-inventory-roi` and `cloud-inventory-roi-db`.
