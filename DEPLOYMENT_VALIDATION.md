# Cloud Inventory ROI v5.5.8 Deployment Validation

Source upload: `cloud-inventory-roi-v5_5_8.zip`  
Validated package: `cloud-inventory-roi-v5.5.8-render-ready.zip`  
Prepared: 2026-08-26

## Packaging corrections applied

- Removed leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package-lock.json` from `4.9.2` to `5.5.8`.
- Confirmed `.node-version` is `22.22.0`.
- Confirmed `.npmrc` uses the public npm registry.
- Confirmed migration `017_share_links_follow_latest.sql` keeps the FK hotfix for `scenario_base_id`.
- Hoisted `requireAuth` before protected routes and removed the legacy `_reqAuthCompanies` alias.
- Restored `function switchAdminPanel(panel)` in `public/index.html`.
- Restored the ESC modal comment opener in `public/index.html`.
- Fixed Error Log inline JavaScript quote escaping in `public/index.html`.
- Removed `node_modules`, `.git`, `.env`, `.env.local`, and OS metadata from the deployment ZIP.

## Validation checks completed in sandbox

- ZIP/root structure: passed.
- Required Render root files: passed.
- Render Blueprint structure: passed.
- `package.json` / `package-lock.json` alignment: passed.
- NPM registry hygiene: passed.
- Migration 017 FK hotfix: passed.
- Migrations present: `001` through `022`.
- `requireAuth` initialization-order validation: passed.
- Legacy `_reqAuthCompanies` reference check: passed.
- JavaScript syntax checks: passed; 59 files checked.
- Inline HTML script syntax checks: passed; 12 inline scripts checked.
- `switchAdminPanel` wrapper: passed.
- ESC modal comment opener: passed.
- Error Log inline quote escaping: passed.
- ROI engine tests: 17 passed, 0 failed.
- Route test loader: passed; DB integration skipped because `DATABASE_URL` is not set in sandbox.
- Version consistency: passed; package, `APP_VERSION`, and version history all report `5.5.8`.
- No `node_modules`, `.git`, `.env`, or `.env.local` included in final ZIP.

## Sandbox caveat

A full live `npm ci --omit=dev --no-audit --no-fund` did not complete reliably in this sandbox environment. The PowerShell toolkit runs that command locally before GitHub clone/commit/push and includes the server require smoke test that previously caught Render startup defects.

## Deployment target

This package targets the production Render resources defined in `render.yaml`: `cloud-inventory-roi` and `cloud-inventory-roi-db`.
