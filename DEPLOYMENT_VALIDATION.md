# Cloud Inventory ROI Builder v4.0.0 — Deployment Validation

Validated package: `cloud-inventory-roi-v4_NewUI.zip`
Prepared output: `cloud-inventory-roi-v4.0.0-render-ready.zip`
Target: GitHub `main` branch / existing production Render Blueprint

## Packaging corrections applied

No application logic was changed.

1. Updated `package-lock.json` root version from `2.9.3` to `4.0.0` to match `package.json`.
2. Added `.npmrc` to force the public npm registry and disable inherited engine-strict settings:
   - `registry=https://registry.npmjs.org/`
   - `audit=false`
   - `fund=false`
   - `engine-strict=false`
3. Updated the stale server header comment from v2.9.2 to v4.0.0.

## Render deployment structure

Passed checks:

- `render.yaml` present at repository root.
- Node web service defined.
- Managed PostgreSQL database defined.
- `DATABASE_URL` wired through `fromDatabase`.
- `buildCommand: npm ci --omit=dev --no-audit --no-fund`.
- `startCommand: node server.js`.
- `healthCheckPath: /health`.
- `autoDeployTrigger: commit`.
- `maxShutdownDelaySeconds: 15`.
- `NODE_VERSION: 22.22.0`.
- `.node-version` contains `22.22.0`.

## Application validation

Passed checks:

- ZIP integrity test passed.
- Required root files/directories present:
  - `render.yaml`
  - `package.json`
  - `package-lock.json`
  - `.node-version`
  - `.npmrc`
  - `server.js`
  - `src/`
  - `public/`
  - `migrations/`
- `package.json`, `package-lock.json`, and lock root package are all version `4.0.0`.
- No private npm registry references found in `package-lock.json`.
- JavaScript syntax validation passed for `server.js`, `src/**/*.js`, `public/**/*.js`, and `test/**/*.js`.
- ROI engine tests passed: 22 passed, 0 failed.
- Route test loader passed; DB integration tests were skipped because `DATABASE_URL` is not set in the sandbox.
- Discovery public-link authentication fix remains present:
  - `src/routes/analytics.js` no longer uses broad `router.use(requireAuth)`.
  - Prospect page handles `401/403` separately instead of masking them as “Link not found”.
  - Discovery session responses include no-store cache headers.
- Migrations present through `014_update_help_content.sql`.
- Final package does not include `node_modules`.

## Sandbox limitation

A live `npm ci` from the sandbox timed out while attempting to reach the public npm registry. The deployment toolkit runs `npm ci --omit=dev --no-audit --no-fund` locally in a temporary directory before it pushes to GitHub.

## Post-deployment expected health response

```json
{
  "status": "ok",
  "version": "4.0.0",
  "database": "connected",
  "phase": "production"
}
```

## Recommended post-deployment smoke tests

1. Open the Render app and confirm login page loads.
2. Log in as admin.
3. Confirm existing scenarios list and open.
4. Create/save a scenario.
5. Generate a prospect discovery link.
6. Test the prospect link without logging in.
7. Run the toolkit health-check script.
8. Run the toolkit prospect-link test script with a newly generated token.
