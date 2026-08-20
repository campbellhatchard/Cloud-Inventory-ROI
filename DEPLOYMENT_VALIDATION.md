# Cloud Inventory ROI v4.6.1 Deployment Validation

Generated: 2026-08-20

## Source

Uploaded package: `cloud-inventory-roi-v4_6_1.zip`

## Packaging corrections applied

- Moved `.node-version` from the leftover nested `cloud-inventory-roi-v4_0_0/` folder to the package root.
- Moved `.github/workflows/ci.yml` from the leftover nested `cloud-inventory-roi-v4_0_0/` folder to the package root.
- Removed the leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package-lock.json` version values from `2.9.3` to `4.6.1`.
- Added root `.npmrc` with the public npm registry.
- Confirmed `node_modules/` and `.git/` are not included in the final deployment ZIP.

No application logic was changed.

## Validation checks completed

| Check | Result |
|---|---:|
| ZIP integrity of uploaded package | Passed |
| Required Render root files present | Passed |
| `render.yaml` production structure | Passed |
| `package.json` version = `4.6.1` | Passed |
| `package-lock.json` version/root version = `4.6.1` | Passed |
| `.node-version` at root = `22.22.0` | Passed |
| `.github/workflows/ci.yml` at root | Passed |
| Public npm registry hygiene | Passed |
| JavaScript syntax checks | Passed |
| Inline HTML script syntax checks | Passed |
| ROI engine tests | 22 passed, 0 failed |
| Route test loader | Passed; DB integration skipped because `DATABASE_URL` is not set in sandbox |
| Discovery public-link auth fix | Present |
| Migrations present through `015_scenario_shares.sql` | Passed |

## Render target

This package is production-targeted:

- Web service: `cloud-inventory-roi`
- Database: `cloud-inventory-roi-db`
- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`
- Health check: `/health`
- Node: `22.22.0`

## Migration files

```text
001_initial_schema.sql
002_seed_data.sql
003_repair_bootstrap_admin.sql
004_fix_admin_first_login.sql
005_maps_stakeholders.sql
006_add_solution.sql
007_analytics_benchmarks.sql
008_engagement_tracking.sql
009_outcome_tracking.sql
010_error_log.sql
011_customers.sql
012_handoffs.sql
013_se_role.sql
014_update_help_content.sql
015_scenario_shares.sql
```

## Sandbox limitation

A full live `npm ci` was not completed in the sandbox environment. The deployment toolkit runs `npm ci --omit=dev --no-audit --no-fund` locally before cloning, committing, or pushing to GitHub.
