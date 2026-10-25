# Cloud Inventory ROI v6.9.47 Release Manifest

## Lineage

- Target release: `6.9.47`
- Parent archive: `cloud-inventory-roi-v6.9.46-render-ready.zip`
- Parent SHA-256: `7C7E582588B8C01AF7B612C7DF4642D6089F4767541118A2B5422542BF06EE72`
- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Database migration level: 045, unchanged
- Brand System / Application Knowledge / Christie Persona: 1.0 / 1.0 / 1.0

## Corrective scope

This release corrects three independently reproduced certification defects: an intentionally cleared Three Why being rehydrated by fallback data, the unsupported native browser prompt used for customer-specific Solution Fit applications, and a Primary SE display mismatch when the assigned user was outside the viewer-selectable assignment list.

## Production changes

- Canonical Executive narrative persistence now distinguishes omitted, populated, and explicitly cleared fields. A canonical clear is stored as `null`, compatibility mirrors are cleared, and presentation alone resolves the state to `To validate`.
- The customer-specific application workflow uses an accessible in-application modal, stable `APP-CUSTOM-*` identity, non-standard classification, inline validation, single-submit protection, and server-confirmed save before success.
- Primary SE presentation is derived from `handoffs.primary_se_id` and adds the current assignment to a read-only control when that assignment is outside the viewer's selectable list.
- No ROI formula, questionnaire, evidence, authorization, output-classification, database-schema, or object-storage change is included.

## Permanent verification

- `test/v6947-corrective-release.test.js`
- `test/v6947-postgres-corrective.test.js`
- `config/permanent-release-tests.json`

Detailed evidence is recorded in `DEFECT_VERIFICATION_MATRIX_v6.9.47.md`, `CERTIFICATION_CORRECTIVE_REPORT_v6.9.47.md`, `QA_RESULTS_v6.9.47.md`, and `RELEASE_GATE_RESULTS_v6.9.47.json`.

## Machine evidence

- `RELEASE_GATE_RESULTS_v6.9.47.json`
- `OUTPUT_RUNTIME_RESULTS_v6.9.47.json`
- `POSTGRES_INTEGRATION_RESULTS_v6.9.47.json`
- `R2_INTEGRATION_RESULTS_v6.9.47.json`
- `BROWSER_REGRESSION_RESULTS_v6.9.47.md`

## Release recommendation

Local executable gates pass, but the supported Node 22, PostgreSQL, R2, and deployed browser gates remain incomplete. The Product Owner retains final release authority.
