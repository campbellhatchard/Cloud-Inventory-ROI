# Cloud Inventory ROI v6.9.32 Release Manifest

## Authoritative lineage

- Parent archive: `cloud-inventory-roi-v6.9.31-render-ready.zip`
- Parent SHA-256: `5a0eebb10717b679c5baa3eb86f3f0b863dd175c6025232e78a4bab390cdd8f1`
- Deployed GitHub parent commit: `b462fbbb321a18f947557dea0651fef128f3ffd8`
- Developer source snapshot: `754a2648cfe108632395f610f2a8e764aac33507`
- Application version: `6.9.32`
- ROI Model: v2.8 / modelVersion 28
- Brand System / Application Knowledge / Christie: v1.0
- Latest migration: `042_server_authoritative_value_application.sql` (unchanged)
- Active Output Registry entries: 25 (unchanged)

## Scoped correction

Discovery and Calculator now summarize the same server-authoritative Prospect evidence review rows. Both show the number of `AVAILABLE` immutable Prospect value events still awaiting explicit application, using the same wording. The duplicate browser-side inference path was removed.

## Permanent evidence

- `public/prospect-evidence-summary.js`
- `test/v6932-prospect-evidence-count-consistency.test.js`
- `BUILD_DIFFERENTIAL_AUDIT.md`
- `QA_RESULTS_v6.9.32.md`
- `RELEASE_GATE_RESULTS_v6.9.32.json`
- `OUTPUT_RUNTIME_RESULTS_v6.9.32.json`
- `POSTGRES_INTEGRATION_RESULTS_v6.9.32.json`

The Product Owner owns final release classification after deployment validation.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
