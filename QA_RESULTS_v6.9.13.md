# QA Results — v6.9.13

Machine results are recorded in `RELEASE_GATE_RESULTS_v6.9.13.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.13.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.13.json`.

- Full recovery suite: 34 ROI-engine checks plus 534 Node test passes, 0 failures, 2 PostgreSQL-dependent skips.
- Production locks: 178 passed, 0 failed, 0 skipped.
- v6.9.13 recovery suite: 6 passed, 0 failed, 0 skipped.
- Active output runtime matrix: 25/25 active outputs executed and passed; matrix harness total 26 passed.
- JavaScript syntax, lineage, output-path, Brand asset, and Application Knowledge checks: passed.
- Current normalization evidence was generated under Node v22.23.3, matching the production Node 22 major version.

This synchronized revision preserves the fixed code previously labeled v6.9.15. It restores Prospect Link ROI progress and answer processing, prevents stale Executive PDF values, and retains the PostgreSQL scenario corrections. Only the release identity and its supporting evidence names were normalized to v6.9.13.

Local PostgreSQL integration is reported as NOT TESTED (4 suites) because no safe local PostgreSQL service is available. GitHub CI requires PostgreSQL 16, all migrations, all four integration suites, zero failures, zero skips, and zero NOT TESTED results.

Release revision: `production-recovery-2`.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
