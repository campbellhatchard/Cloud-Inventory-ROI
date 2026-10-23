# Cloud Inventory ROI v6.9.41 Release Manifest

## Lineage

- Parent: `cloud-inventory-roi-v6.9.40-render-ready.zip`
- Parent SHA-256: `4cf004c42d4801720af0cd4a45cffb446aa5d12e04fbc11434244ef262c66a61`
- Materialized parent commit: `6463f4eadacb4b9bb37f8b30c6beabe091241e80`
- Target: `6.9.41`
- ROI Model authority: v2.8 / `modelVersion` 28, unchanged
- Brand System, Application Knowledge, Christie Persona: v1.0, unchanged

## Release scope

This corrective release stabilizes Solution Fit initialization, legacy compatibility, application/gap identity, Primary SE assignment, MEP ERP/version state, ERP evidence isolation, multi-product behavior, customer-context isolation, readiness, and active-scope outputs. It removes the obsolete competing checklist path.

## Persistence and migration

No database schema migration is added. Stable process IDs, stable gap IDs, `processId` relationships, active/historical metadata, ERP history, and unknown additive fields persist in the existing authenticated `handoffs.data` JSONB record. Primary SE remains in `handoffs.primary_se_id`.

## SE Solution Fit Scope

Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Deferred

Photo/file attachments, object storage, attachment lifecycle, evidence galleries, and PS evidence packages are not included.

## Certification evidence

See `SOLUTION_FIT_STABILIZATION_REPORT_v6.9.41.md`, `QA_RESULTS_v6.9.41.md`, `OUTPUT_RUNTIME_RESULTS_v6.9.41.json`, `POSTGRES_INTEGRATION_RESULTS_v6.9.41.json`, `RELEASE_GATE_RESULTS_v6.9.41.json`, `DEPLOYMENT_VALIDATION_v6.9.41.md`, and `RELEASE_READINESS_v6.9.41.md`.

Local machine results: 21/21 executable gates passed under Node `v22.22.0`; the full suite passed 688 tests, the focused v6.9.41 suite passed 157, production locks passed 339, and all 28 active output IDs have passing runtime evidence. Ten PostgreSQL/HTTP suites and authenticated deployed-browser validation remain explicitly NOT TESTED pending a safe disposable database and deployed session.
