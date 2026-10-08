# Cloud Inventory ROI v6.9.34 Release Manifest

## Authoritative lineage

- Parent archive: `cloud-inventory-roi-v6.9.33-render-ready.zip`
- Parent SHA-256: `181197394a3af5898edf0194da2b5188b93b681dd07ae54bc8c14d273b6a6f88`
- Deployed GitHub parent commit: `e580a8f5696e705855805883529241e25144acc8`
- Developer source snapshot: `e26c0da511ac3339c65849cd1bee158c4ad8c237`
- Application version: `6.9.34`
- ROI Model: v2.8 / modelVersion 28 (unchanged)
- Brand System / Application Knowledge / Christie: v1.0 (unchanged)
- Latest migration: `042_server_authoritative_value_application.sql` (unchanged)
- Active Output Registry entries: 25 (unchanged)

## Scoped correction

- Schema-driven Customer Setup replaces browser-only customer creation.
- Authenticated Rep/Admin customer creation persists to PostgreSQL and returns the authoritative customer ID before entering Calculator.
- Customer Workspace exposes Create New Customer without logout.
- Context switching protects unsaved work and awaits actual server save completion.
- Explicit no-customer, no-scenario, working, saved, and dirty-saved states govern Save/Executive/Share/Email availability and no-context KPI presentation.
- One accessible alert framework supplies severity, persistence, dismissal, deduplication, and optional browser-local audio.

No ROI methodology, evidence model, migration, output generator, or unrelated feature changed.

## Permanent evidence

- `test/v6934-customer-alert-workflow.test.js`
- `ALERT_WORKFLOW_AUDIT.md`
- `BUILD_DIFFERENTIAL_AUDIT.md`
- `BUILD_GOVERNANCE_CONTRACT.md`
- `FINAL_CUSTOMER_ALERT_WORKFLOW_REPORT.md`
- `QA_RESULTS_v6.9.34.md`

The Product Owner owns final release classification after deployment validation.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
