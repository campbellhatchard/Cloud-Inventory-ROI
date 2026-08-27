# Cloud Inventory ROI v5.6.13 Deployment Validation

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

This validated v5.6.13 release candidate preserves the locked v5.6.10 integrity controls while incorporating the v5.6.11 Executive Proposal, v5.6.12 Deal Coach, and v5.6.13 Christie AI Deal Coach workflows. It keeps `requireAuth` initialized once before every protected route; preserves explicit zero ramp assumptions and `fieldInvSav`; keeps turns-based value labelled as annual carrying-cost savings rather than balance-sheet working capital; keeps Medical Devices / Life Sciences customer-input-only; retains CI startup/UI regression coverage; preserves migrations 001–023 unchanged and quote-safe Joint Project Plan rendering; removes the nested v4 package contaminant; sends Proposal AI/Word calls through authenticated `apiFetch`; refreshes persisted stakeholder and Joint Project Plan context before Deal Coach scoring; preserves locally saved Proposal readiness; quote-escapes Champion Kit content; and sends Christie requests through the authenticated AI proxy using deal context without inventing customer facts.

## Release validation

Before uploading or syncing the Blueprint:

1. Run `npm ci` with Node.js 22.
2. Run `npm run migrate` against a disposable PostgreSQL 16 database.
3. Run `npm test` and the additional version, migration-compatibility, and regression tests used by CI.
4. Confirm `package.json`, `package-lock.json`, the UI version, and version history all report `5.6.13`.
5. After deployment, confirm `/health` reports version `5.6.13` and `database: connected`.
