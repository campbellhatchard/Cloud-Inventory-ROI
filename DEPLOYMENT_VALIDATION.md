# Cloud Inventory ROI v5.8.0 Deployment Validation

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

This validated v5.8.0 release candidate is rebuilt from the exact live v5.7.6 production tree. It preserves the established startup, financial-semantic, export, customer-safety, Proposal, Joint Project Plan, Deal Coach, contract-term ROI, BuyCycle, AI-session, product-selection, Field Inventory, Three Whys, Champion Pack, and current-version persistence controls while adding the intended v5.8.0 Sales Manager Deal Management capability.

The validated candidate adds additive migration 024 for multi-role access and internal manager actions; keeps primary user roles intact while allowing Sales Manager as a secondary role; enforces Sales Manager access server-side; provides team/rep/buying-stage portfolio views using saved server-authoritative metrics without recalculating ROI; keeps manager actions attached to the scenario base record across later versions; derives customer linkage server-side; updates only explicitly supplied action fields; removes unnecessary prospect-link tokens and raw stakeholder records from the manager response; keeps `requireAuth` initialized once; preserves explicit zero ramps and `fieldInvSav`; keeps Medical Devices / Life Sciences customer-input-only; retains CI UI/startup coverage; and preserves prospect-safe AI message normalization. The obsolete nested `cloud-inventory-roi-v4_0_0` directory is excluded.

## Release validation

Before deployment:

1. Run `npm ci --omit=dev --no-audit --no-fund` with Node.js 22.
2. Confirm migrations remain exactly 001–024 and run `npm run migrate` against a disposable PostgreSQL 16 database when available.
3. Run ROI engine, version consistency, migration compatibility, Phase-1, UI/startup, and route/integration tests.
4. Confirm `package.json`, `package-lock.json`, the UI version, and version history all report `5.8.0`.
5. Confirm the repository delta matches only the validated release files and contains no nested project, `.git`, `node_modules`, or `.env` artifacts.
6. After deployment, confirm `/health` reports version `5.8.0` and `database: connected`.
