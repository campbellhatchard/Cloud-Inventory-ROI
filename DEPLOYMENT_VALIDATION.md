# Cloud Inventory ROI Builder v3.2.3 — Deployment Validation

## Result
Validated and corrected for GitHub-to-Render deployment.

## Corrections applied to uploaded v3.2.2 package
- Aligned `package.json` and `package-lock.json` versions to `3.2.3`.
- Added `.npmrc` to force installs through the public npm registry.
- Preserved deterministic Render build command: `npm ci --omit=dev --no-audit --no-fund`.
- Preserved direct Render start command: `node server.js`.
- Confirmed `render.yaml` contains `healthCheckPath: /health`, `autoDeployTrigger: commit`, and `maxShutdownDelaySeconds: 15`.
- Confirmed public discovery routes are not blocked by the analytics authentication middleware.
- Confirmed prospect page supports `?token=` links and legacy `#token=` links.
- Confirmed displayed version markers were updated to `3.2.3`.

## Static validation performed
- ZIP integrity passed on the source upload.
- JavaScript syntax checks passed for `server.js`, `src/**/*.js`, and `public/**/*.js`.
- Inline HTML script syntax checks passed.
- Required Render root files are present: `render.yaml`, `package.json`, `package-lock.json`, `.node-version`, `server.js`, `src/`, `public/`, and `migrations/`.
- No private npm registry references found in `package-lock.json`.

## Runtime validation note
A live `npm ci` and Render deployment must be run from the deployment machine / Render environment. The PowerShell toolkit validates this locally in a temporary folder before updating the Git repository.
