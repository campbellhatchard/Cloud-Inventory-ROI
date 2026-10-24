# v6.9.35 QA Results

## Executed locally

| Gate | Passed | Failed | Skipped / Not tested |
|---|---:|---:|---:|
| Focused ownership + authorization + migration + UI + switcher + ROI | 89 | 0 | 0 |
| Full inherited application suite | 674 | 0 | 2 database-dependent skips |
| Production regression locks | 291 | 0 | 0 |
| Active output runtime matrix | 26 | 0 | 0 |
| Brand System | 19 | 0 | 0 |
| Focused ownership PostgreSQL suite | 0 | 0 | 1 NOT TESTED |
| Complete registered PostgreSQL gate | 0 | 0 | 7 suites NOT TESTED |

All executable local gates completed with zero failures. The output matrix executed all 25 active production output owners plus the registry-coverage check. ROI Model v2.8/modelVersion 28 fixtures passed with no formula or economic-semantic change.

## Ownership evidence

The executable service suite verifies server-filtered eligible owners, preview counts, Admin/non-Admin boundaries, reason and same-owner checks, inactive and multi-role users, inactive Customers, identity collisions, atomic operational changes, identity/economic/provenance/SE/publication preservation, shared access, Rep and manager access movement, no-scenario and 40-version Customers, stale preview rejection, rollback, immutable audit, UI preflight, prohibited historical writes, and future notification routing.

The real PostgreSQL suite additionally covers HTTP authorization, migrations, actual database counts, role-derived access, a post-transfer Rep B scenario action, future notification recipient, historical timestamps, immutable actors, frozen output, no-scenario transfer, stale conflict, and induced transaction failure.

## Environmental limits

No safe non-production `DATABASE_URL` exists in this workspace. PostgreSQL work is therefore truthfully **NOT TESTED**, not passed. A fresh `npm ci` is also NOT TESTED because an npm CLI/network install path is unavailable; executable tests used the bundled Node v24.19.0 runtime with an existing production dependency installation. The application remains pinned to Node 22 for Render, so exact Node 22 execution is a CI/deployment gate. The production database was never used.

v6.9.35 is not deployed, so live Admin/Rep/Manager/SE browser acceptance and future email-delivery observation remain NOT TESTED. Follow `DEPLOYMENT_VALIDATION_v6.9.35.md` after disposable CI database certification and deployment.

The Product Owner assigns the final release classification.
