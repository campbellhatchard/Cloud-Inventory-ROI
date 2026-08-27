# Cloud Inventory ROI v5.6.7 Deployment Validation

## Render deployment configuration

- The Blueprint is defined by `render.yaml` at the repository root.
- Render provisions the Node web service and PostgreSQL database.
- The production build uses `npm ci --omit=dev --no-audit --no-fund`.
- The service binds to Render's `PORT` on `0.0.0.0`.
- `/health` verifies database connectivity and returns a non-success response when PostgreSQL is unavailable.
- Database migrations run automatically before the server begins accepting traffic.
- `SIGTERM` triggers graceful HTTP and database shutdown.

## Required values during Blueprint creation

Render prompts for these values because they are declared with `sync: false`:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters)
- `BOOTSTRAP_ADMIN_EMAIL`

Production startup fails rather than using default administrator credentials when any required value is absent.

## Optional integrations

Add these in the Render dashboard when the corresponding feature is needed:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`

`APP_URL` is optional on Render because the application uses Render's external URL automatically.


## Validation corrections applied

This validated v5.6.7 release candidate preserves the live v5.6.3 integrity controls while retaining the v5.6.4–v5.6.7 enhancements. It fixes the inherited `requireAuth` initialization-order crash; preserves explicit zero ramp assumptions in export/PDF paths; uses the ROI engine's `fieldInvSav` property; labels turns-based value as annual carrying-cost savings rather than balance-sheet working capital; keeps Medical Devices / Life Sciences defaults at zero until customer-specific assumptions are supplied; and adds CI coverage for UI/startup regression guards.

## Release validation

Before uploading or syncing the Blueprint:

1. Run `npm ci` with Node.js 22.
2. Run `npm run migrate` against a disposable PostgreSQL 16 database.
3. Run `npm test` and the additional version, migration-compatibility, and regression tests used by CI.
4. Confirm `package.json`, `package-lock.json`, the UI version, and version history all report `5.6.7`.
5. After deployment, confirm `/health` reports version `5.6.7` and `database: connected`.
