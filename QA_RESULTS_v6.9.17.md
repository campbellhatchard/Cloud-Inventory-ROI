# QA Results — v6.9.17

Validated locally on 2026-10-01 with the supported Node.js v22.23.0 runtime and npm 11.9.0.

- JavaScript syntax validation: PASS
- Release lineage: PASS — 32 permanent protections registered
- Active output path audit: PASS — 34 production modules
- Brand asset consistency: PASS
- Application Knowledge consistency: PASS
- ROI Model v2.8 engine: 34 passed, 0 failed
- Focused v6.9.17 plus cumulative v6.9.16 SE regression suite: 10 passed, 0 failed, 0 skipped
- Complete release-gate test suite: 548 passed, 0 failed, 2 PostgreSQL-dependent skips
- Production locks: 192 passed, 0 failed, 0 skipped
- Brand tests: 19 passed, 0 failed, 0 skipped
- Active output runtime matrix: 25/25 outputs passed; 26 harness tests passed

Database migrations and the four registered PostgreSQL integration suites require a safe throwaway PostgreSQL `DATABASE_URL`; they are recorded as NOT TESTED locally and must execute in the PostgreSQL-enabled CI certification gate. Render runtime validation also remains outstanding. No release colour is assigned.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
