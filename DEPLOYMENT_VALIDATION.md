# Cloud Inventory ROI v5.7.6 Deployment Validation

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

This validated v5.7.6 release candidate is rebuilt from the locked live v5.7.4 production tree. It preserves the established startup, financial-semantic, export, customer-safety, Proposal, Joint Project Plan, Deal Coach, contract-term ROI, BuyCycle, AI-session, product-selection, Field Inventory, and Three Whys autosave controls while adding the intended v5.7.5 and v5.7.6 changes: a stronger four-slide Champion Pack, an explicit Executive View narrative save action, and current-version targeting so Three Whys edits remain attached to the newly created scenario version after a versioned save.

The validated candidate keeps `requireAuth` initialized once before every protected route; preserves explicit zero ramp assumptions and `fieldInvSav`; keeps turns-based value labelled as annual carrying-cost savings rather than balance-sheet working capital; keeps Medical Devices / Life Sciences customer-input-only; retains CI startup/UI regression coverage; preserves migrations 001–023 unchanged; preserves quote-safe Joint Project Plan rendering and authenticated Proposal AI/Word calls; refreshes persisted stakeholder/JPP context before Deal Coach scoring; clears authenticated AI session state on logout/expiry; routes the internal Assistant through authenticated `apiFetch`; and rebuilds prospect AI field context server-side through an explicit prospect-safe allow-list. The obsolete nested `cloud-inventory-roi-v4_0_0` package directory is excluded from the validated release.

## Release validation

Before deployment:

1. Run `npm ci --omit=dev --no-audit --no-fund` with Node.js 22.
2. Confirm migrations remain exactly 001–023 and run `npm run migrate` against a disposable PostgreSQL 16 database when available.
3. Run ROI engine, version consistency, migration compatibility, Phase-1, UI/startup, and route/integration tests.
4. Confirm `package.json`, `package-lock.json`, the UI version, and version history all report `5.7.6`.
5. Confirm the repository delta matches only the validated release files and contains no nested project, `.git`, `node_modules`, or `.env` artifacts.
6. After deployment, confirm `/health` reports version `5.7.6` and `database: connected`.
