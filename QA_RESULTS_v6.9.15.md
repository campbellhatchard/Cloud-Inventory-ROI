# QA Results — v6.9.15

Validation date: 2026-09-29

Source baseline:

- Product Owner-selected archive: `cloud-inventory-roi-v6.9.13-render-ready.zip`
- Baseline SHA-256: `4a61dbdb2c64e6968acf240f107079dc58a014c44f382fb56a4fc134999ae562`
- The newly supplied archive was byte-for-byte identical to that baseline.

Results:

- Full `npm test`: 34 ROI-engine checks plus 534 Node test passes; 0 failures; 3 PostgreSQL-dependent skips.
- Production regression locks: 178 passed; 0 failed; 0 skipped.
- v6.9.15 focused recovery suite: 6 passed; 0 failed; 0 skipped.
- Active output runtime matrix: 25/25 active outputs executed and passed; matrix harness total 26 passed.
- Release lineage, JavaScript execution, output-path audit, Brand assets, Application Knowledge, package identity, and version consistency: passed.
- Local runtime: Node v24.19.0 / npm 11.9.0. Production and CI remain pinned to Node 22.22.0.

The focused recovery suite was first executed against the v6.9.13 source and failed all six tests, including a behavioral reproduction where Prospect ROI preview logged `token is not defined`, made no preview request, and returned no result. The same six tests passed after the bounded corrections.

PostgreSQL integration and migrations are truthfully **NOT TESTED locally** because no isolated PostgreSQL service was available. The production deployment must therefore retain the current database, run the normal startup migration check, and complete the post-deployment smoke tests in `DEPLOYMENT_VALIDATION_v6.9.15.md`.

No Product Owner release colour is assigned.
