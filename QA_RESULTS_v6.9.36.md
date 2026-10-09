# QA Results — v6.9.36

## Result

All locally executable release gates passed with zero failures. Database-dependent and live-browser validations are explicitly **NOT TESTED**, not passed.

## Executed gates

| Gate | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---|
| Full cumulative test suite | 689 | 0 | 2 | PASS |
| v6.9.36 Admin cleanup | 99 | 0 | 1 | PASS with PostgreSQL case skipped |
| v6.9.35 ownership transfer | 89 | 0 | 0 | PASS |
| v6.9.34 workflow | 71 | 0 | 0 | PASS |
| v6.9.33 correction | 35 | 0 | 0 | PASS |
| v6.9.32 evidence consistency | 51 | 0 | 0 | PASS |
| v6.9.31 corrective suite | 99 | 0 | 0 | PASS |
| v6.9.30 value authority | 31 | 0 | 0 | PASS |
| Production locks | 340 | 0 | 0 | PASS |
| Brand tests | 19 | 0 | 0 | PASS |
| Output runtime matrix | 26 | 0 | 0 | PASS; all 25 active outputs executed |

Lineage, active-output path audit, generated brand assets, generated application knowledge, JavaScript syntax, version consistency, and migration-schema compatibility also passed. Counts overlap across deliberately redundant permanent gates.

## Not tested locally

- Migration 044 against PostgreSQL.
- Eight PostgreSQL integration suites, including v6.9.36 filters, locks, transactions, immutable evidence, restore, and ownership preservation.
- Interactive Admin browser workflow on a deployed environment.
- Realistic PostgreSQL query timing and larger QA datasets.

These items require a disposable non-production database and authorized browser session. Production customer data must never be used for automated destructive tests.

## Functional coverage added

Tests cover UTC half-open dates, quick ranges, open bounds, invalid ranges, combined filters, current Owner versus Created By, stable ID selection, exact preview snapshots, one-use previews, typed confirmation, stale fingerprints, atomic soft removal, dependency expansion, protected evidence, recovery, reassigned owner preservation, Admin-only authorization, empty state, accessible controls, and preservation of v6.9.35 ownership transfer.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Decision authority

No release colour or Production Ready claim is assigned. Final classification belongs to the Product Owner after the outstanding PostgreSQL and deployment checks.
