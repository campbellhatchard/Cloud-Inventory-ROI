# Cloud Inventory ROI v6.9.40 Release Manifest

## Lineage

- Parent: `cloud-inventory-roi-v6.9.39-render-ready.zip`
- Parent SHA-256: `071a32de3aa3b56f75fb13aa66d499d5ec40faba6abb79985bda711f5f2f287d`
- Deployed parent commit: `3ad081be117574568d7608bdf952d1ef034924ca`
- Developer source snapshot: `069f02b8ed42d78e21dd0b583acdb2a3c9274674`
- Target: `6.9.40`
- ROI Model authority: v2.8 / `modelVersion` 28, unchanged
- Brand System, Application Knowledge, Christie Persona: v1.0, unchanged

## Release scope

This focused release makes Solution Fit setup product-only and adds a direct, governed Solution Fit customer switch. The setup dialog selects primary and optional additional Cloud Inventory products; the main workflow remains the sole owner of ERP and application configuration.

## Persistence and data integrity

Creation and updates remain authenticated server operations over the existing handoff record. Existing MEP, CIP, and EPP scope, application assessments, custom applications, evidence, gaps, integrations, readiness, turnover fields, and unknown additive properties are preserved. Removing a product from active scope requires confirmation and does not delete its history.

## Customer navigation and authorization

The visible `⇄ Switch Customer` action uses the dedicated Solution Fit customer route and capability. It does not modify global ROI customer authority. Dirty records require Save & Switch, Discard & Switch, or Cancel. The customer identity is URL-backed, the old workspace is cleared before loading, and stale responses cannot overwrite the active customer.

## Database and migrations

No migration is added. The inherited schema and JSONB handoff authority are unchanged.

## Certification evidence

See `SOLUTION_FIT_SCOPE_SWITCH_REPORT_v6.9.40.md`, `QA_RESULTS_v6.9.40.md`, `OUTPUT_RUNTIME_RESULTS_v6.9.40.json`, `POSTGRES_INTEGRATION_RESULTS_v6.9.40.json`, `RELEASE_GATE_RESULTS_v6.9.40.json`, `DEPLOYMENT_VALIDATION_v6.9.40.md`, and `RELEASE_READINESS_v6.9.40.md`.
