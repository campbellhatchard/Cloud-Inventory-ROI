# Cloud Inventory ROI v4.3.0 Deployment Validation

Generated: 2026-08-19

## Source package

Uploaded package: `cloud-inventory-roi-v4_3_0.zip`

## Result

The uploaded package was structurally valid, with deployment-packaging corrections applied before creating the Render-ready ZIP.

## Corrections applied

1. Moved `.node-version` to the package root.
2. Moved `.github/workflows/ci.yml` to the package root.
3. Removed the leftover nested `cloud-inventory-roi-v4_0_0/` folder.
4. Aligned `package-lock.json` from `2.9.3` to `4.3.0`.
5. Added `.npmrc` to force the public npm registry.

No application logic was changed.

## Validation checks completed

- ZIP integrity: passed.
- Required Render root files: passed.
- `render.yaml` structure: passed.
- `package.json` / `package-lock.json` version alignment: passed.
- `.node-version` at package root: passed.
- `.github/workflows/ci.yml` at package root: passed.
- NPM registry hygiene check: passed.
- JavaScript syntax checks: passed across `server.js`, `src/`, `public/`, and `test/`.
- ROI engine tests: 22 passed, 0 failed.
- Route test loader: passed; database-backed integration tests skipped because `DATABASE_URL` is not set in the validation sandbox.
- Discovery public-link auth fix: present.
- Migrations present through `015_scenario_shares.sql`.
- Final deployment ZIP excludes `node_modules`.

## Render target

This package targets the existing production Render resources:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`

## Important note

A live `npm ci` could not be completed reliably inside the sandbox due npm registry timeout behavior. The deployment toolkit runs `npm ci --omit=dev --no-audit --no-fund` locally before it pushes to GitHub.
