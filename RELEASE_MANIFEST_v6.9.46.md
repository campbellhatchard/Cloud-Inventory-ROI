# Cloud Inventory ROI v6.9.46 Release Manifest

## Lineage

- Target release: `6.9.46`
- Parent archive: `cloud-inventory-roi-v6.9.45-render-ready(1).zip`
- Parent SHA-256: `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`
- Untouched baseline commit: `6adf41b`
- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Database migration level: 045, unchanged
- Brand System / Application Knowledge / Christie Persona: 1.0 / 1.0 / 1.0

## Corrective scope

This differential release corrects the six reproducible defects recorded in the October 24, 2026 v6.9.45 live regression: cross-format Three Why divergence, MEP package duplication, questionnaire/Field Inventory divergence, completed evidence queue ambiguity, legacy Saved Scenarios/Compare disagreement, and duplicate ERP tokens in gap labels. It retains the existing safe Deal Coach timeout fallback without changing AI authority.

## Production changes

- `src/shared/executive-narrative.js` provides the canonical persisted narrative projection and legacy compatibility mirrors.
- `src/shared/scenario-financial-summary.js` provides read-time, null-preserving legacy financial aliases without recalculation.
- Executive Value Story, scenario persistence/list projection, Discovery, Impact Map, Solution Fit application classification/labels, and Solution Fit evidence queue consumers use those authorities.
- No schema migration, ROI formula change, role/capability change, attachment-store change, or output-classification change is included.

## Permanent verification

`test/v6946-release-stabilization.test.js` semantically validates the actual Executive and Proposal Web/PDF/DOCX/PPTX builders, package/custom identity across save/reload, exact questionnaire IDs for Field Inventory on/off, server-confirmed evidence reconciliation and idempotency, legacy financial null/value handling, structured labels, and Deal Coach timeout recovery.

Detailed evidence is recorded in `REGRESSION_MATRIX_v6.9.46.md`, `QA_RESULTS_v6.9.46.md`, `RELEASE_GATE_RESULTS_v6.9.46.json`, and `FULL_REGRESSION_CORRECTIVE_REPORT_v6.9.46.md`.

PostgreSQL, private R2, and authenticated post-deployment browser certification are explicitly recorded as NOT TESTED. This package is a controlled-validation candidate and is not self-classified GREEN.
