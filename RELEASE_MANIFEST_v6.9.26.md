# Cloud Inventory ROI v6.9.26 Release Manifest

## Lineage

- Parent archive: `cloud-inventory-roi-v6.9.25-render-ready.zip`
- Parent SHA-256: `e946d2170675053022d68acfba16205829387b7e304a0da28eadeb8959c09113`
- Deployed parent Git commit: `2ea230462afce1ee6b53ee29805ccbac89aacbe6`
- Developer source snapshot: `77befba6d01e1d68c5ab989830fa2a70a6b20d8f`
- Target release: `6.9.26`

## Scope

This corrective release addresses the confirmed regression backlog for Field Inventory and ROI state, customer/scenario isolation, Three Whys persistence and output freshness, Prospect-value warnings, AI context and recovery, role presentation, analytics input state, read-only Joint Project Plans, and dynamic version presentation.

## Preserved authorities

- ROI Model v2.8 / modelVersion 28
- immutable Prospect submissions and deliberate per-value application
- Value History and Rep Confirmed provenance
- BuyCycle and authorization rules
- Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0
- native scenario currency and registered output owners

## Database

Migration 039 synchronizes `customers.has_field_inventory` from the newest explicit current-scenario value. Automated database validation must use disposable PostgreSQL only.
