# v6.9.30 QA Results

Machine-generated release evidence is recorded in `RELEASE_GATE_RESULTS_v6.9.30.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.30.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.30.json`.

The local release gate recorded 611 passed, 0 failed, and 2 skipped in the full suite; 262 passed and 0 failed in production locks; 19 passed and 0 failed in Brand tests; and 26 passed and 0 failed in the output runtime runner. All 25 active Output Registry items emitted a successful runtime result. The v6.9.30 focused coverage includes durable application, decimal and zero semantics, percentage scaling, same-value provenance, idempotency and key collision handling, duplicate canonical-input conflicts, retryable notifications, and the interactive evidence modal.

PostgreSQL integration is reported as `NOT TESTED` locally: five database suites and the database-backed route execution did not run because no safe disposable `DATABASE_URL` was available. Dependency reinstallation was also `NOT TESTED` because npm is absent from the desktop runtime; the existing installed dependency set executed the application tests. PostgreSQL 16 CI and `npm ci` remain mandatory before production certification. No production database is used for automated testing.
