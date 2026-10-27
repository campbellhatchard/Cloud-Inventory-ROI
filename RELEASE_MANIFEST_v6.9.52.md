# Cloud Inventory ROI v6.9.52 Release Manifest

## Release identity

- Release: `6.9.52`
- Authoritative parent: `cloud-inventory-roi-v6.9.51-render-ready.zip`
- Parent SHA-256: `791AD9298068A23EA95E6FB84A42385188C01A9B14AE145E942A3219D552FAAD`
- Imported baseline commit: `4f237cee3cfa5537522121598a3a235e799e5567`
- ROI model: `28` (unchanged)
- Database migrations: none

## Corrective scope

v6.9.52 corrects JPP-DATE-01. A governed `YYYY-MM-DD` target close date now passes through one strict date-only presentation helper. The All Plans card, public JPP view, and prospect-link email preserve the stored calendar day across browser timezones. Invalid calendar values fail to the existing empty-date presentation rather than rolling into another day.

## Preserved behavior

No persistence, schema, API contract, ROI, authorization, ownership, sharing, milestone hydration, or output architecture was changed. The v6.9.51 server-owned `canEditPlan` capability remains authoritative. The blank `+ New Joint Project Plan` editor remains expected behavior and was not changed.

## Permanent evidence

- `test/v6952-jpp-date-only.test.js`
- `test/v6951-jpp-capability.test.js`
- `test/v6950-production-integrity.test.js`
- `test/output-runtime-matrix.test.js`

Local evidence is recorded in `QA_RESULTS_v6.9.52.md`, `JPP_DATE_ONLY_CORRECTIVE_REPORT_v6.9.52.md`, and `DEFECT_VERIFICATION_MATRIX_v6.9.52.md`. PostgreSQL, R2, and live browser deployment certification remain external gates when approved non-production services are unavailable.
