# Cloud Inventory ROI Builder v3.12.0 — Deployment Validation

## Summary

Uploaded package: `cloud-inventory-roi-v3_12_0.zip`

Validated output: `cloud-inventory-roi-v3.12.0-render-ready.zip`

Result: **deployment-ready after packaging corrections**.

## Corrections applied

- Aligned `package-lock.json` root version from `2.9.3` to `3.12.0` so `package.json` and lock metadata match.
- Added `.npmrc` to force the public npm registry and prevent inherited local/private registry settings during Render or local validation.

No functional application logic was changed.

## Render deployment checks

- `render.yaml` is at repository root.
- Node web service is configured as `cloud-inventory-roi`.
- PostgreSQL database is configured as `cloud-inventory-roi-db`.
- Build command is deterministic: `npm ci --omit=dev --no-audit --no-fund`.
- Start command is direct: `node server.js`.
- Health check path is `/health`.
- `NODE_VERSION` and `.node-version` are both pinned to `22.22.0`.
- `DATABASE_URL` is sourced from the Render-managed PostgreSQL database.
- `maxShutdownDelaySeconds: 15` is present.

## Code validation completed

- ZIP integrity check passed.
- Required root files present.
- `package.json` and `package-lock.json` parse cleanly.
- JavaScript syntax check passed for `server.js`, `src/**/*.js`, `public/**/*.js`, and `test/**/*.js`.
- ROI engine test suite passed: **22 passed, 0 failed**.
- Route/integration test file loads; DB-backed tests were skipped in this sandbox because `DATABASE_URL` is not set.
- Discovery public-link authentication fix remains present: analytics auth is route-scoped, not globally applied at router level.

## Known limitation

A live `npm ci` against the external npm registry was not relied on in the sandbox environment. The deployment toolkit performs `npm ci --omit=dev --no-audit --no-fund` in a temporary folder before it pushes to GitHub.
