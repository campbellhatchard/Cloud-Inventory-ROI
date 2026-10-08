# v6.9.35 Pre-build Baseline Inheritance Audit

- Authoritative parent archive: `cloud-inventory-roi-v6.9.34-render-ready.zip`
- Parent archive SHA-256: `6c0458c45541fb0cf955bb0d6c460c9bcd65acede98ceade148e33a914acdb08`
- Deployed production parent commit: `9fcbce9a527d2565f95f6c70e6cefe9581a9e50d`
- Developer source snapshot: `9cf1e0c12e8ecf64f687db2772fcd8bdf08cba18`
- Parent application/package version: `6.9.34`
- Target application version: `6.9.35`
- Parent migration: `042_server_authoritative_value_application.sql`
- New scoped migration: `043_customer_ownership_transfer.sql`
- Active Output Registry entries: 25 (unchanged)
- ROI authority: Model v2.8 / `modelVersion` 28 (unchanged)
- Brand, Application Knowledge, and Christie authorities: v1.0 (unchanged)

The verified v6.9.34 Render-ready archive is the sole source baseline. It was extracted and committed before production files changed. No older branch or reconstructed source was used.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

## Pre-change ownership model

`customers.owner_id` is the canonical current Customer owner. Existing authorization also uses operational owner copies on scenario-linked records. Historical author/actor fields and frozen publication ownership are separate evidence and must not move.

## Preserved authorities

All permanent v6.9.1–v6.9.34 protections remain registered. The change does not alter ROI formulas, evidence classifications, scenario identities or versions, Prospect submission immutability, Rep Confirmed provenance, Buyer Evidence, SE assignments, customer-facing output generation, or frozen Customer Business Cases.
