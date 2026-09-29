# QA Results — v6.9.14

Local certification completed on Node v22.23.3. These results do not replace mandatory GitHub PostgreSQL 16 certification or Render runtime validation.

- Focused Prospect Evidence plus cumulative v6.9.13 recovery: 9 passed, 0 failed, 0 skipped.
- Full test suite: 537 passed, 0 failed, 2 PostgreSQL-dependent skips.
- Production locks: 181 passed, 0 failed, 0 skipped.
- Brand tests: 19 passed, 0 failed, 0 skipped.
- Output runtime matrix: 25/25 active outputs passed; 26 harness tests passed.
- Release gates: all locally executable gates passed.
- PostgreSQL integration: requires the GitHub PostgreSQL 16 job; local execution may report `NOT TESTED` when no safe `DATABASE_URL` is available.

No Product Owner release colour is assigned.
