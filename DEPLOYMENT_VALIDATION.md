# Deployment validation — v2.4.1

## Result

The package is structurally ready for a Render Blueprint deployment.

The exact cause of the previous Render failure cannot be proven without the failed deployment log. Revalidation identified and corrected several material deployment risks.

## Corrections

1. **Direct Node start command**
   - Changed `startCommand` from `npm start` to `node server.js`.
   - This makes Node the service process so Render's `SIGTERM` reaches the application's graceful-shutdown handler directly.

2. **Database readiness window**
   - Increased and parameterized PostgreSQL connection retries.
   - Default: 60 attempts with a 3-second interval and a 10-second connection timeout.
   - This reduces first-deploy failures while a Blueprint-created database is still becoming available.

3. **No false healthy deployment without PostgreSQL**
   - Production startup now fails when `DATABASE_URL` is missing.
   - The `/health` endpoint therefore cannot mark a database-less production instance as ready.

4. **Optional Blueprint prompts removed**
   - Removed optional `sync: false` entries for Anthropic and SendGrid.
   - Existing Render values are preserved when omitted from a Blueprint.
   - Optional secrets can be added manually after the core service is live.

5. **Supported Render hostname variable**
   - Replaced the undocumented `RENDER_EXTERNAL_URL` dependency with `RENDER_EXTERNAL_HOSTNAME` and an `https://` prefix.

6. **Bounded graceful shutdown**
   - `maxShutdownDelaySeconds` is set to 15.
   - The application closes idle HTTP connections, the HTTP server, scheduled tasks, and the PostgreSQL pool, with a 10-second internal force-exit guard.

7. **Reproducible dependency build**
   - Public npm registry pinned in `.npmrc`.
   - `package-lock.json` contains no private build-environment registry references.
   - Render build uses `npm ci --omit=dev --no-audit --no-fund`.

8. **PowerShell deployment safety**
   - The new toolkit validates in a temporary directory outside OneDrive.
   - It does not delete or reinstall the repository's local `node_modules` directory, avoiding the Windows file-lock failure seen previously.

## Validation performed

- Package root and required paths checked.
- `render.yaml` parsed and asserted against required Blueprint fields.
- `npm ci --omit=dev` completed using the public npm registry.
- `npm audit --omit=dev --audit-level=high`: zero known vulnerabilities at validation time.
- All server and browser JavaScript files passed `node --check`.
- Inline scripts in HTML files passed syntax checks.
- Local HTTP smoke test passed with `REQUIRE_DATABASE=false`.
- `/health` returned version `2.4.1`.
- Login page returned HTTP 200 with no-cache headers.
- `SIGTERM` test exited cleanly.
- Production startup correctly failed when `DATABASE_URL` was absent.
- Database retry path was exercised against an unavailable endpoint.

## Not validated in this environment

- A live Render Blueprint sync in the user's workspace.
- Execution of migrations against the user's existing Render PostgreSQL database.
- Authentication against the user's existing database contents.
- The exact prior Render failure, because the failed deploy log was not supplied.
