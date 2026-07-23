# Cloud Inventory ROI Builder v2.9.3 — Deployment Validation

## Result

Validated and packaged as a Render-ready release to fix public prospect questionnaire links returning `401 NO_TOKEN`.

## Primary defect corrected

The public discovery API was accidentally blocked by authentication middleware. The analytics router was mounted broadly at `/api` and applied `requireAuth` at router level. Because that router loaded before the public discovery routes, `/api/discovery/sessions/:token` was intercepted and rejected before the token lookup ran.

## Code fixes

- Removed global router-level authentication from `src/routes/analytics.js`.
- Applied `requireAuth` route-by-route to analytics and benchmark endpoints.
- Preserved public access for:
  - `GET /api/discovery/sessions/:token`
  - `PUT /api/discovery/sessions/:token/answers`
- Added no-store headers to `/api/discovery/sessions` API responses.
- Added strict 64-character hex-token validation.
- Added privacy-safe discovery token references in server logs.
- Improved prospect-page error handling so `401`, `403`, `404`, `410`, `429`, and `5xx` failures are shown distinctly.
- Updated package version to `2.9.3`.

## Render deployment checks

- `render.yaml` is at repository root.
- Build command remains deterministic: `npm ci --omit=dev --no-audit --no-fund`.
- Start command remains direct Node execution: `node server.js`.
- Health check path remains `/health`.
- `maxShutdownDelaySeconds: 15` remains configured.
- PostgreSQL remains injected through `fromDatabase.connectionString`.
- Node is pinned to `22.22.0`.

## Local validation performed in this environment

Passed:

- ZIP/package root structure check.
- `package.json` parse and version validation.
- `package-lock.json` parse and version validation.
- Private npm registry reference scan.
- `node --check server.js`.
- `node --check` across `src/**/*.js` and `public/**/*.js`.
- Inline script syntax checks across `public/*.html`.
- Static verification that `src/routes/analytics.js` no longer contains `router.use(requireAuth)`.
- Static verification that discovery API no-store hardening is present.

Not executed here:

- Live `npm ci` against the public npm registry, due sandbox network limitations.
- Live Render deployment.
- Live query against the Render PostgreSQL database.

The PowerShell deployment toolkit runs `npm ci` locally in a temporary directory before changing the local repository or pushing to GitHub.

## Post-deploy verification

Run:

```powershell
$token = "PASTE_64_CHARACTER_TOKEN"
$response = Invoke-WebRequest `
  -Uri "https://cloud-inventory-roi.onrender.com/api/discovery/sessions/$token" `
  -Method GET `
  -SkipHttpErrorCheck `
  -UseBasicParsing

Write-Host "HTTP status: $($response.StatusCode)"
$response.Content
```

The critical success condition is that the public discovery lookup no longer returns:

```json
{"error":"Authentication required.","code":"NO_TOKEN"}
```
