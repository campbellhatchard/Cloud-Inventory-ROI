# Cloud Inventory ROI v6.9.35 Release Manifest

## Authoritative lineage

- Parent: `cloud-inventory-roi-v6.9.34-render-ready.zip`
- Parent SHA-256: `6c0458c45541fb0cf955bb0d6c460c9bcd65acede98ceade148e33a914acdb08`
- Deployed production parent commit: `9fcbce9a527d2565f95f6c70e6cefe9581a9e50d`
- Developer source snapshot: `9cf1e0c12e8ecf64f687db2772fcd8bdf08cba18`
- Application: v6.9.35
- ROI Model: v2.8 / modelVersion 28
- Brand System, Application Knowledge, Christie Persona: v1.0
- New migration: `043_customer_ownership_transfer.sql`
- Active output registrations: 25, unchanged

## Scope

This release adds only governed Admin customer ownership reassignment, its immutable audit trail, UI, authorization, concurrency protection, and regression evidence. It preserves historical actors, immutable evidence, economic data, SE assignment, shared access, and frozen customer outputs.

The Product Owner owns the final deployment classification.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
