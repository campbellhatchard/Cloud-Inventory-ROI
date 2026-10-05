# QA Results — Cloud Inventory ROI v6.9.29

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

The release gates were executed under the supported Node 22 runtime before packaging.

## Environment

- Parent: `cloud-inventory-roi-v6.9.28-corrective-candidate.zip`
- Parent SHA-256: `a1a9c03e18cd52b7897fe275ed3d4de5e6856923b614305bde49d25e5630644a`
- Node: `v22.22.0`
- npm: `10.9.4`
- PostgreSQL: no safe non-production `DATABASE_URL` was available during the local build.

## Executed results

| Gate | Passed | Failed | Skipped | Not tested | Result |
|---|---:|---:|---:|---:|---|
| Full test suite | 600 TAP + 34 standalone ROI checks | 0 | 2 database-dependent | 0 | PASS locally |
| v6.9.29 reliability suite | 58 | 0 | 0 | 0 | PASS |
| Production locks | 251 | 0 | 0 | 0 | PASS |
| Brand | 19 | 0 | 0 | 0 | PASS |
| Active output matrix | 26 | 0 | 0 | 0 | PASS |
| Active output owners | 25 | 0 | 0 | 0 | PASS |
| Dependency install, lineage, output audit, generated assets/knowledge | 5 commands | 0 | 0 | 0 | PASS |
| PostgreSQL migrations | 0 | 0 | 0 | 1 | NOT TESTED |
| PostgreSQL integration suites | 0 | 0 | 0 | 4 suites | NOT TESTED |

Machine evidence is in `RELEASE_GATE_RESULTS_v6.9.29.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.29.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.29.json`.

## Required interpretation

- The two full-suite skips are PostgreSQL-dependent tests and are not represented as passes.
- Database migration and four PostgreSQL integration suites remain `NOT TESTED`; production data was never used.
- The Product Owner must complete deployed role/browser validation after deployment.
