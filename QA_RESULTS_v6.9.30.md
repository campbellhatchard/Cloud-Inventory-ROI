# v6.9.30 QA Results

Machine-generated release evidence is recorded in `RELEASE_GATE_RESULTS_v6.9.30.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.30.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.30.json`.

The deployment-preparation release gate recorded 628 passed, 0 failed, and 2 PostgreSQL-dependent skips in the full suite; 279 passed and 0 failed in production locks; 31 passed and 0 failed in the focused v6.9.30 suite; 19 passed and 0 failed in Brand tests; and 26 passed and 0 failed in the output runtime runner. All 25 active Output Registry items emitted a successful runtime result. The v6.9.30 focused coverage includes durable application, decimal and zero semantics, percentage scaling, same-value provenance, idempotency and key collision handling, duplicate canonical-input conflicts, retryable notifications, and the interactive evidence modal.

PostgreSQL integration is reported as `NOT TESTED` locally: five database suites and the database-backed route execution did not run because no safe disposable `DATABASE_URL` was available. Dependency reinstallation completed successfully with npm 11.9.0; the local runtime was Node 24.19.0, so the repository's Node 22 GitHub workflow remains the authoritative runtime certification. PostgreSQL 16 CI and `npm ci` remain mandatory before production deployment. No production database is used for automated testing.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
