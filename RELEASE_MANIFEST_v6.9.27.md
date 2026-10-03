# Cloud Inventory ROI v6.9.27 Release Manifest

## Lineage

- Parent archive: `cloud-inventory-roi-v6.9.26-render-ready.zip`
- Parent SHA-256: `1b6ffd73e9c7210abad8defc0fb1f8460a314eb1823bdb38a44442d247e3ed0a`
- Production parent Git commit: `79b1efee047346214b327cfebc8563c1a509570a`
- Developer source snapshot: `424476d2e7caf2b98b772378ea3105a88d87e8ad`
- Target release: `6.9.27`

## Scope

This corrective release consolidates the confirmed production-regression and P0 reliability backlog into one patch. It hardens server ROI authority, saved state, governed workspace context, authorization, destructive-operation safety, and output consistency without changing core functionality.

## Database

Migration 040 removes orphan Joint Project Plan scenario references, adds the scenario foreign key with `ON DELETE SET NULL`, and indexes that relationship. Automated migration testing must use non-production PostgreSQL.

## Preserved authorities

- ROI Model v2.8 / modelVersion 28
- Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0
- immutable Prospect submission evidence and deliberate application
- Value History, Rep Confirmed, BuyCycle, authorization, native currency, and registered output owners

## Local validation

- Full application script: 632 passed, 0 failed; two PostgreSQL-only suites skipped.
- Production locks: 249 passed, 0 failed.
- Active output runtime: all 25 active outputs passed their production-builder smoke.
- PostgreSQL integration and dependency installation: NOT TESTED locally; required in CI/staging.

## Authorization boundary

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
