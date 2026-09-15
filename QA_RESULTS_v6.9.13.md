# QA Results — v6.9.13

Machine results are recorded in `RELEASE_GATE_RESULTS_v6.9.13.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.13.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.13.json`.

- Full local suite: 528 passed, 0 failed, 3 PostgreSQL-dependent skips.
- Production locks: 172 passed, 0 failed, 0 skipped.
- v6.9.13 focused correction suite: 32 passed, 0 failed, 0 skipped.
- Active output runtime matrix: 25/25 active outputs executed and passed; matrix harness total 26 passed.
- JavaScript syntax, lineage, output-path, Brand asset, and Application Knowledge checks: passed.
- Local runtime: Node v24.19.0 / npm 11.6.0. The production and CI engine remains Node 22 as required by `package.json`.

Local PostgreSQL integration is reported as NOT TESTED (4 suites) because no safe local PostgreSQL service is available. GitHub CI requires PostgreSQL 16, all migrations, all four integration suites, zero failures, zero skips, and zero NOT TESTED results.

No Product Owner release colour is assigned.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
