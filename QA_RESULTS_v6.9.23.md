# QA Results — v6.9.23

## Local execution

- Full application suite: 612 passed, 0 failed, 2 skipped.
- Permanent production locks: 229 passed, 0 failed, 0 skipped.
- Brand suite: 19 passed, 0 failed, 0 skipped.
- v6.9.23 focused regression: 6 passed, 0 failed, 0 skipped.
- Active output runtime matrix: all 25 active outputs executed and passed; artifacts validated.
- JavaScript syntax, lineage, active-output audit, Brand assets, and Application Knowledge checks: passed.

## Not tested locally

PostgreSQL HTTP/integration suites were not executed because no safe disposable `DATABASE_URL` is available in this workspace. They remain required in GitHub Actions or another non-production PostgreSQL environment. Production data must never be used for automated testing.

The Product Owner retains final release classification authority.
