# Cloud Inventory ROI v5.4.5 Deployment Validation

## Purpose

Hotfix package for the v5.4.4 deployment validator smoke-test failure:

```text
ReferenceError: _reqAuthCompanies is not defined
```

## Fix applied

- Replaced stale `_reqAuthCompanies` route references in `server.js` with the initialized `requireAuth` middleware.
- Preserved the earlier v5.4.x `requireAuth` hoist before protected admin routes.
- Preserved the migration `017_share_links_follow_latest.sql` FK hotfix.
- Updated package/version metadata to `5.4.5`.
- Updated `APP_VERSION` and `VERSION_HISTORY[0]` to `5.4.5`.

## Packaging corrections retained

- Required Render/GitHub files are at repository root.
- `.node-version` is at repository root and contains `22.22.0`.
- `.npmrc` forces the public npm registry.
- `package.json`, `package-lock.json`, and lockfile root package version are aligned.
- `node_modules`, `.git`, `.env`, `.env.local`, and OS metadata are excluded from the deployment ZIP.

## Validation completed

- ZIP/root structure: passed.
- Render Blueprint structure: passed.
- package.json / package-lock.json alignment: passed.
- Migration 017 FK hotfix: passed.
- Migrations present: 001 through 021.
- requireAuth initialization-order validation: passed.
- `_reqAuthCompanies` stale alias validation: passed.
- JavaScript syntax checks: passed; 57 files checked.
- Inline HTML script syntax checks: passed; 11 scripts checked.
- ROI engine tests: 17 passed, 0 failed.
- Route test loader: passed; DB integration skipped because DATABASE_URL is not set in sandbox.
- Version consistency test: passed.
- No node_modules included: passed.

## Sandbox caveat

A full `npm ci --omit=dev --no-audit --no-fund` could not be completed reliably inside this sandbox timeout. The PowerShell toolkit runs `npm ci` locally before pushing to GitHub, and Render has previously completed the same build step successfully.

## Expected Render health

```json
{
  "status": "ok",
  "version": "5.4.5",
  "database": "connected",
  "phase": "production"
}
```
