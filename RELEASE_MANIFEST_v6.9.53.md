# Cloud Inventory ROI v6.9.53 Release Manifest

## Release identity

- Release: `6.9.53`
- Authoritative parent: `cloud-inventory-roi-v6.9.52-render-ready.zip`
- Parent SHA-256: `9C76181C3494DF47C3B254911326709716044D1FAB485593032993D29BD0D810`
- ROI model: `28` (unchanged)
- Brand System: `1.0` (unchanged)
- Application Knowledge: `1.0` (unchanged)
- Christie Persona: `1.0` (unchanged)
- Database migrations: none

## Corrective scope

v6.9.53 corrects JPP-DATE-01 at the PostgreSQL boundary. PostgreSQL `DATE` (OID 1082) now enters the application as the exact `YYYY-MM-DD` wire value. The strict shared date-only contract then supplies consistent list, editor, public JPP, PDF, and PowerPoint presentation without timezone conversion or output-specific string truncation.

## Production files changed

- `src/db.js`
- `src/shared/date-only.js`
- `src/exports/operational-pdf.js`
- `src/exports/operational-pptx.js`
- `public/jpp-date-only.js`
- `public/map.js`
- `public/prospect-map.html`
- `public/deal-export.js`

All other modifications are regression tests, version/lineage metadata, release-gate wiring, and corrective evidence. Authorization, ROI Model v2.8, Solution Fit, Executive narrative, R2, Buyer Evidence, and the database schema are unchanged.

## Permanent evidence

- `test/v6953-jpp-date-boundary.test.js`
- `test/v6953-postgres-jpp-date-boundary.test.js`
- `test/v6952-jpp-date-only.test.js`
- `test/v6951-jpp-capability.test.js`
- `test/v6950-production-integrity.test.js`
- `test/output-runtime-matrix.test.js`

Release evidence included:

- `POSTGRES_DATE_BOUNDARY_AUDIT_v6.9.53.md`
- `JPP_DATE_BOUNDARY_CORRECTIVE_REPORT_v6.9.53.md`
- `DEFECT_VERIFICATION_MATRIX_v6.9.53.md`
- `QA_RESULTS_v6.9.53.md`
- `POSTGRES_INTEGRATION_RESULTS_v6.9.53.json`
- `OUTPUT_RUNTIME_RESULTS_v6.9.53.json`
- `RELEASE_GATE_RESULTS_v6.9.53.json`
- `DEPLOYMENT_VALIDATION_v6.9.53.md`
- `RELEASE_READINESS_v6.9.53.md`

The focused real-PostgreSQL date boundary passed 5/5 with zero failures or skips. The consolidated historical PostgreSQL ledger remains FAIL because of inherited setup/assertion/teardown defects documented in the corrective report. R2 is NOT TESTED. This package is therefore YELLOW for controlled live deployment certification, not final production GREEN.

The Product Owner retains final live release authority after deployment certification.
