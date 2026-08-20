# Cloud Inventory ROI v4.9.2 Deployment Validation

## Purpose

Hotfix package for the Render startup failure in `017_share_links_follow_latest.sql`.

Render failed with:

```text
insert or update on table "business_case_shares" violates foreign key constraint "business_case_shares_scenario_base_id_fkey"
```

## Root cause

The original migration added `scenario_base_id` with a foreign key to `scenarios(id)`, but the application stores `scenarios.base_id` in that column. `base_id` is a version-group key and is not guaranteed to also exist as a row ID in `scenarios.id` for historical data.

## Fix included

`migrations/017_share_links_follow_latest.sql` now:

- Adds `scenario_base_id` as `UUID` without a foreign key to `scenarios(id)`.
- Defensively drops the incorrect FK constraints if present.
- Backfills `scenario_base_id` from `scenarios.base_id` by joining via the original `scenario_id`.
- Preserves the indexes used by share-link lookups.
- Keeps the filename as `017_share_links_follow_latest.sql` so the pending migration can run correctly after the failed deployment.

## Validation completed

- ZIP root structure valid for Render/GitHub.
- Required files present: `render.yaml`, `package.json`, `package-lock.json`, `.node-version`, `.npmrc`, `server.js`, `src/`, `public/`, `migrations/`.
- `package.json`, `package-lock.json`, and lockfile root package aligned to `4.9.2`.
- JavaScript syntax checks passed.
- ROI engine tests passed.
- Route test loader passed; DB integration skipped where `DATABASE_URL` is not set.
- Discovery public-link auth fix remains present.
- Migration 017 no longer defines `scenario_base_id` as a foreign key to `scenarios(id)`.

## Expected Render behavior

Since `016_field_inventory.sql` was already applied during the failed deploy, the next deployment should report two pending migrations:

```text
017_share_links_follow_latest.sql
018_discovery_submission.sql
```

Then startup should complete and `/health` should return version `4.9.2` with database connected.
