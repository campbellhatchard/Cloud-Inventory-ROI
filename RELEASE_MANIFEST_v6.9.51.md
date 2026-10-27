# Cloud Inventory ROI v6.9.51 Release Manifest

## Identity

- Release: `6.9.51`
- Parent archive: `cloud-inventory-roi-v6.9.50-render-ready.zip`
- Parent SHA-256: `A43C5B5008841B2B932716E7950B5D72902595C3ED7EC04FCAA1AD97BE99201C`
- Exact imported baseline commit: `ae5e7e4762fc3cdd5f384b9eda06608946ba8526`
- ROI Model: v2.8 / `modelVersion` 28
- Migration level: 045; no migration added

## Corrective content

v6.9.51 makes the server-returned JPP `canEditPlan` capability authoritative for prospect-link controls. Share, Rotate, and Revoke require both edit authority and the existing saved-plan readiness. Menu rendering, output refresh, dirty/clean transitions, and plan reload cannot grant authority. JPP PDF/PPTX review access remains independently governed.

## Changed production files

- `public/map.js`

All other changes are focused behavioral tests, version/lineage metadata, CI evidence naming, and release governance documentation.

## Certification boundary

Local executable evidence is recorded in `QA_RESULTS_v6.9.51.md` and the machine-generated result files. PostgreSQL and R2 are `NOT TESTED` without safe non-production services. Live Render owner/non-owner acceptance remains pending deployment and belongs to the Product Owner.
