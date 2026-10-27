# QA Results — v6.9.53

## Corrective acceptance

- PostgreSQL 16.15 focused DATE → API → browser/output: **5 passed, 0 failed, 0 skipped**.
- Focused v6.9.53 gate: **61 passed, 0 failed, 0 skipped**.
- v6.9.52 date-only gate: **54 passed, 0 failed, 0 skipped**.
- v6.9.51 capability gate: **48 passed, 0 failed, 0 skipped**.
- v6.9.50 integrity gate: **141 passed, 0 failed, 0 skipped**.
- v6.9.49 header synchronization: **140 passed, 0 failed, 0 skipped**.
- v6.9.48 narrative authority: **105 passed, 0 failed, 0 skipped**.
- Production locks: **421 passed, 0 failed, 0 skipped**.
- Brand: **19 passed, 0 failed, 0 skipped**.
- Output runtime matrix: **30 tests passed** and **29/29 active output results passed**.
- Clean source `npm test` without PostgreSQL: **exit 0**; database-dependent cases correctly did not execute there.
- Exact dependency install: `npm ci --omit=dev --no-audit --no-fund` **exit 0**.
- JavaScript syntax, lineage, active-output audit, brand assets, and application knowledge checks: **PASS**.

## Consolidated PostgreSQL ledger

- PostgreSQL: **16.15**; `pg`: **8.22.0**.
- Migrations: **45/45 applied** on a fresh disposable database.
- Historical aggregate: **41 passed, 7 failed, 0 skipped, 0 NOT TESTED**.
- The v6.9.53 date suite passed completely inside and outside the aggregate.
- Remaining aggregate failures are inherited historical test defects: first-login bootstrap assumptions, one v6.9.36 stale-cleanup assertion reproduced in v6.9.52, one invalid historical role fixture, and two teardown-order foreign-key errors.

## External integration

- R2: **0 passed, 0 failed, 0 skipped, 2 NOT TESTED** because approved credentials were unavailable. No R2 production code changed.

No production data or credentials were used.

