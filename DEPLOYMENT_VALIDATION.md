# Cloud Inventory ROI Builder v3.12.1 — Deployment Validation

Generated: 2026-08-05

## Result

The uploaded `cloud-inventory-roi-v3_12_1.zip` package was structurally valid for GitHub/Render deployment after two packaging hygiene corrections:

1. `package-lock.json` root version was aligned to `3.12.1`.
2. `.npmrc` was added to force the public npm registry and avoid inherited private/local npm registry settings.

No application logic was changed.

## Render target

This package targets the existing production Render Blueprint resource names:

- Web service: `cloud-inventory-roi`
- PostgreSQL database: `cloud-inventory-roi-db`
- Branch expected by the deployment toolkit: `main`

Do not use this package unchanged for staging unless `render.yaml` is adjusted to separate staging service/database names and a staging branch.

## Validated checks

- ZIP integrity check: passed
- Required root files: passed
  - `render.yaml`
  - `package.json`
  - `package-lock.json`
  - `.node-version`
  - `.npmrc`
  - `server.js`
  - `src/`
  - `public/`
  - `migrations/`
- Render Blueprint structure: passed
  - `runtime: node`
  - `buildCommand: npm ci --omit=dev --no-audit --no-fund`
  - `startCommand: node server.js`
  - `healthCheckPath: /health`
  - `autoDeployTrigger: commit`
  - `maxShutdownDelaySeconds: 15`
  - `DATABASE_URL` supplied via `fromDatabase`
  - `NODE_VERSION: 22.22.0`
- Node version pin: passed
  - `.node-version`: `22.22.0`
  - `package.json` engines: `>=22.0.0 <23.0.0`
- NPM registry hygiene: passed after adding `.npmrc`
- JavaScript syntax validation: passed across `server.js`, `src/**/*.js`, `public/**/*.js`, and `test/**/*.js`
- ROI engine tests: passed, 22/22
- Route test loader: passed; database integration tests skipped because `DATABASE_URL` is not set in the validation sandbox
- Discovery public-link auth fix: present
  - `src/routes/analytics.js` does not apply broad `router.use(requireAuth)` middleware
  - public prospect session routes do not require logged-in user auth
  - public discovery responses use `Cache-Control: no-store`
  - public discovery token validation uses strict 64-character hex validation

## NPM validation caveat

The sandbox environment has an internal npm registry override that can interfere with live `npm ci`. The deployment toolkit explicitly sets `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/` before running `npm ci` locally, and the package includes `.npmrc` with the same public registry setting.

## Expected health response after Render deployment

```json
{
  "status": "ok",
  "version": "3.12.1",
  "database": "connected",
  "phase": "production"
}
```
