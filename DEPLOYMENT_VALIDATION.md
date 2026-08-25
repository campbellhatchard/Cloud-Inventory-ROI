# Cloud Inventory ROI v5.4.5 Deployment Validation (r2)

Source upload: `cloud-inventory-roi-v5_4_5.zip`  
Validated package: `cloud-inventory-roi-v5.4.5-render-ready-r2.zip`  
Date: 2026-08-25

## Packaging corrections applied

- Removed leftover nested `cloud-inventory-roi-v4_0_0/`.
- Aligned `package-lock.json` from `4.9.2` to `5.4.5`.
- Confirmed `.node-version` is at repository root with `22.22.0`.
- Confirmed `.npmrc` uses the public npm registry.
- Confirmed migration `017_share_links_follow_latest.sql` keeps the FK hotfix.
- Hoisted `requireAuth` before protected routes and removed legacy `_reqAuthCompanies` references.
- Restored the missing `function switchAdminPanel(panel)` wrapper in `public/index.html`.
- Restored the missing comment opener before the ESC-key modal-close handler in `public/index.html`.
- Removed `node_modules`, `.git`, `.env`, `.env.local`, and OS metadata from the deployment package.

## Previous-error regression checks

- PowerShell lockfile metadata parsing issue avoided in the toolkit by using Node `--input-type=commonjs -e`, not PowerShell `ConvertFrom-Json`.
- ES module temp-file issue avoided by not generating `.js` helper files in `%TEMP%`.
- `node -e` PowerShell parameter ambiguity avoided by passing Node arguments through an explicit argument array.
- Invalid PowerShell regex for `node_modules` filtering avoided by using `-notlike "*\node_modules\*"`.
- Migration path validation uses nested `Join-Path` calls.
- `requireAuth` order and `_reqAuthCompanies` checks are explicit.
- Toolkit performs a server require smoke test after `npm ci`.

## Validation checks

- ZIP integrity: passed.
- Required Render root files: passed.
- Render Blueprint structure: passed.
- `package.json` / `package-lock.json` alignment: passed.
- `.node-version`: `22.22.0`.
- NPM registry hygiene: passed.
- Migration `017_share_links_follow_latest.sql` FK hotfix: passed.
- Migrations present: `001_initial_schema.sql` through `021_prospect_adjustments.sql`.
- `requireAuth` initialization-order validation: passed.
- `_reqAuthCompanies` legacy reference check: passed.
- JavaScript syntax checks: passed; 58 files checked.
- Inline HTML script syntax checks: passed; 11 inline scripts checked.
- `switchAdminPanel` wrapper: passed.
- ESC-key modal comment opener: passed.
- ROI engine tests: 17 passed, 0 failed.
- Route test loader: passed; DB integration skipped because `DATABASE_URL` is not set in sandbox.
- Version consistency: package, index, and version history aligned to `5.4.5`.
- No `node_modules`, `.git`, or env files included: passed.

## Sandbox caveat

A full live `npm ci --omit=dev --no-audit --no-fund` was not completed in this sandbox environment. The PowerShell toolkit runs that command locally before pushing to GitHub and then performs the `server.js` require smoke test with installed dependencies.

## Render target

This package targets the existing production Render resources defined in `render.yaml`:

- Web service: `cloud-inventory-roi`
- Database: `cloud-inventory-roi-db`
- Node version: `22.22.0`
- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`

## Expected result

After GitHub push and Render deployment, `/health` should return version `5.4.5` with database connected.
