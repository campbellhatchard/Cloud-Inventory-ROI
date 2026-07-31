# Cloud Inventory ROI v3.7.0 — Staging Package Validation

Validated for staging deployment through GitHub + Render Blueprint.

## Corrections applied to uploaded package

- Fixed `package-lock.json` root version from `2.9.3` to `3.7.0`.
- Added `.npmrc` to force the public npm registry.
- Replaced production Render resource names with staging resource names.
- Added `branch: staging` to the Render web service.
- Added `APP_ENV=staging` while preserving `NODE_ENV=production` for production-equivalent startup, SSL, migration, and health behavior.

## Render resource names

- Service: `cloud-inventory-roi-staging`
- Database: `cloud-inventory-roi-staging-db`
- Branch: `staging`

## Validated checks

- ZIP archive integrity.
- Required root files present.
- `render.yaml` has staging service/database names.
- `render.yaml` references staging database via `fromDatabase`.
- `package.json` and `package-lock.json` version alignment.
- No private npm registry references in `package-lock.json`.
- `.npmrc` forces `https://registry.npmjs.org/`.
- JavaScript syntax checks passed for server, src, public, and test JS files.
- ROI engine tests passed.
- Migration `011_customers.sql` present and additive.

## Limitation

A live `npm ci` could not be completed from the sandbox due transient DNS/network failures to the npm registry. The PowerShell deployment toolkit runs `npm ci` locally in a temporary directory before replacing files or pushing to GitHub.
