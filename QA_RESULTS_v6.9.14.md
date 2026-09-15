# QA Results — v6.9.14

Machine results are recorded in `RELEASE_GATE_RESULTS_v6.9.14.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.14.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.14.json`.

The v6.9.14 candidate corrects the failures exposed by the v6.9.13 and initial v6.9.14 PostgreSQL 16 certification runs: request/response contract drift, PostgreSQL-invalid current-version promotion during deletion, and an obsolete implicit-upsert expectation in the Solution Fit integration journey.

- Full local suite: passed with only the expected PostgreSQL-dependent skips.
- Production locks: 172 passed, 0 failed, 0 skipped.
- v6.9.14 focused correction suite: 32 passed, 0 failed, 1 PostgreSQL-dependent skip.
- Active output runtime matrix: 25/25 active outputs executed and passed.
- Release lineage, output-path, Brand asset, and Application Knowledge checks: passed.
- Local runtime: Node v24.19.0. Production and CI remain pinned to Node 22 by `package.json`.

PostgreSQL certification is performed only by the isolated GitHub Actions PostgreSQL 16 service and remains a mandatory pre-merge gate.

No Product Owner release colour is assigned.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
