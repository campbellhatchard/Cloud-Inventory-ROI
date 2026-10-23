# QA Results — v6.9.41

## Local result

The machine-generated release runner completed under Node `v22.22.0` and npm `10.9.4` with no failed executable gate.

- Full application suite: 688 passed, 0 failed, 3 skipped.
- v6.9.41 Solution Fit stabilization: 157 passed, 0 failed, 0 skipped.
- Production locks: 339 passed, 0 failed, 0 skipped.
- Brand: 19 passed, 0 failed, 0 skipped.
- Active output runtime matrix: 29 passed, 0 failed, 0 skipped, with passing evidence for all 28 active output IDs.
- Lineage, active-output audit, generated Brand assets, generated Application Knowledge, JavaScript syntax, and clean production dependency install: passed.

The release evidence contains 23 registered gates: 21 executed successfully and 2 database-dependent gates recorded as NOT TESTED. Command-level totals are 1,956 passes, 0 failures, and 5 skips; these are intentionally overlapping because permanent tests run in multiple focused gates.

## Corrective coverage

Permanent tests cover clean MEP/CIP/EPP initialization, meaningful legacy preservation, stable governed/custom application IDs, stable gap IDs and `processId` relationships, rename survival, duplicate-name isolation, unambiguous/ambiguous legacy mapping, authoritative Primary SE assignment/readiness, MEP ERP/version synchronization, deliberate ERP reset with historical evidence preservation, MEP as primary/additional, exact-customer context isolation, removal of the dead checklist/bulk paths, and current-scope output/PS turnover behavior.

## Database status

A safe disposable `DATABASE_URL` was not available. Migrations and all 10 registered PostgreSQL/HTTP integration suites are NOT TESTED, never passed. This includes the v6.9.41 stable-ID, assignment, persistence, legacy, and authorization suite.

## Interactive status

Authenticated deployed-browser certification is NOT TESTED locally. Execute `DEPLOYMENT_VALIDATION_v6.9.41.md` after deployment.

## Decision authority

No final release colour is assigned. Final classification belongs to the Product Owner after reviewing database and live-browser evidence.
