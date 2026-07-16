# Deployment Validation — Cloud Inventory ROI Builder v2.8.1

## Source inspected

Uploaded package: `cloud-inventory-roi-v2_8_0.zip`

The uploaded ZIP was intact and extractable, but it was not deployment-hardened for Render as submitted.

## Issues found in the uploaded package

1. No `package-lock.json` was included, so Render would have run a nondeterministic dependency install.
2. `render.yaml` used `npm install` rather than `npm ci`.
3. `render.yaml` used `npm start`; this starts the application through npm rather than directly as the Node process.
4. `render.yaml` did not include `maxShutdownDelaySeconds`.
5. The server had no complete centralized `SIGTERM` / `SIGINT` shutdown path for the HTTP server, cleanup timer, cron job, and PostgreSQL pool.
6. Production could start without `DATABASE_URL`, which is unsafe for this database-backed application.
7. `/health` could return healthy when the database was not configured.
8. The cleanup timer and audit purge cron task were not explicitly stopped during shutdown.
9. URL generation depended on `APP_URL` / `RENDER_EXTERNAL_URL` only; the package now also supports `RENDER_EXTERNAL_HOSTNAME`.
10. Optional `sync: false` Blueprint secrets could interrupt initial Blueprint provisioning.
11. Old patch and troubleshooting documents were included in the release ZIP.
12. The package used older `node-cron` and `uuid` ranges than the previously validated deployment lock.

## Corrections applied

- Created a clean v2.8.1 release.
- Added `package-lock.json` using public npm registry tarball URLs.
- Updated `render.yaml`:
  - `buildCommand: npm ci --omit=dev --no-audit --no-fund`
  - `startCommand: node server.js`
  - `maxShutdownDelaySeconds: 15`
  - removed optional `sync: false` secrets from the mandatory Blueprint flow
- Added `src/config.js` for URL resolution through `APP_URL`, `RENDER_EXTERNAL_URL`, or `RENDER_EXTERNAL_HOSTNAME`.
- Made PostgreSQL mandatory in production startup.
- Added bounded database startup retries.
- Made `/health` database-aware.
- Centralized graceful shutdown in `server.js`.
- Removed the independent `SIGTERM` handler from `src/db.js` so shutdown is coordinated once.
- Made the cleanup timer and audit purge job stoppable.
- Removed obsolete patch-history documents and dev-only test artifacts from the deployment package.
- Updated package version markers to `2.8.1`.
- Upgraded `node-cron` to `^4.6.0` and `uuid` to `^11.1.1` to align with the previously validated dependency lock.
- Preserved the paid Render plans submitted by the developer:
  - Web service: `starter`
  - PostgreSQL: `basic-256mb`

## Validation completed in this environment

Passed:

- ZIP integrity check on the uploaded archive.
- Root structure inspection.
- YAML parsing of `render.yaml`.
- Render Blueprint field sanity checks.
- JSON parsing of `package.json` and `package-lock.json`.
- Verification that the lockfile contains no private/internal registry URLs.
- JavaScript syntax checks for `server.js`.
- JavaScript syntax checks for all files under `src/` and `public/`.
- Static verification of ordered migrations `001` through `007`.
- Static verification of required root files.
- Static verification that production startup requires `DATABASE_URL`.
- Static verification that `/health` queries PostgreSQL when `DATABASE_URL` is set.
- Static verification that `SIGTERM` and `SIGINT` are handled in `server.js`.

Not completed in this sandbox:

- Live `npm ci` against the public npm registry. The sandbox could not complete registry access within the available execution window.
- Live `npm audit`.
- A live Render Blueprint deployment.
- A live migration against the existing Render PostgreSQL database.

The PowerShell deployment toolkit performs `npm ci` in a temporary directory before replacing local repository files or pushing to GitHub.
