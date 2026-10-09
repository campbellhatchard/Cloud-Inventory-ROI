# Cloud Inventory ROI v6.9.36 Release Manifest

## Lineage

- Parent: `cloud-inventory-roi-v6.9.35-render-ready.zip`
- Parent SHA-256: `666727f7e4a6e762b8fd91435cb1edf7d52bd6f46c333f0c634ea575e17392db`
- Deployed production parent commit: `b64a9294e86505bd50eee5c935499f6bf4992645`
- Developer source snapshot: `3a31e89cf845ed57806152e220ea944c59f2d49a`
- Target: `6.9.36`
- ROI Model: v2.8 / `modelVersion` 28, unchanged
- Brand System, Application Knowledge, Christie Persona: v1.0, unchanged

## Authorized scope

Advanced Admin Data Cleanup & Recovery only: server filters, exact preview snapshots, selection and impact review, atomic soft removal, recovery, creator attribution, immutable audit, migration 044, and permanent tests. v6.9.35 Customer Ownership Reassignment is preserved.

## Database

Migration `044_admin_bulk_cleanup.sql` adds nullable creator attribution for new Customer, Scenario, and Discovery records; exact-preview metadata; immutable cleanup batches; and cleanup-batch recovery references. It does not backfill or invent legacy creators and does not delete business data.

## Evidence and calculation authority

No ROI formula, economic semantic, Prospect submission, Value History, Rep Confirmed, Buyer Evidence, output, or customer-facing content authority changed. Cleanup uses soft removal and preserves immutable evidence and historical identities.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Certification evidence

See `ADMIN_BULK_CLEANUP_REPORT_v6.9.36.md`, `QA_RESULTS_v6.9.36.md`, `POSTGRES_INTEGRATION_RESULTS_v6.9.36.json`, `RELEASE_GATE_RESULTS_v6.9.36.json`, `DEPLOYMENT_VALIDATION_v6.9.36.md`, and `RELEASE_READINESS_v6.9.36.md`.
