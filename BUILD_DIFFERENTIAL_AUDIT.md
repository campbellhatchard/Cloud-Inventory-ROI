# v6.9.30 Differential Audit

v6.9.30 implements Option B from the exact v6.9.29 Render-ready baseline: Prospect evidence application is server-authoritative, durable, idempotent, and independently observable. It does not change ROI Model v2.8 formulas, evidence qualification, roles, or customer-output ownership.

## Root-cause corrections

- **Durable application:** `Use Prospect Value` locks and updates the selected current scenario in one transaction rather than changing only browser fields.
- **Canonical units:** one mapping translates display values to legacy scenario storage keys and fractional percentage storage. Formatting-only values remain missing rather than becoming zero.
- **Authoritative ROI:** the same transaction recomputes all derived economics through the canonical server projection.
- **Immutable history:** every successful application receives a constrained immutable application record, provenance, and audit event; repeat requests are idempotent.
- **Consistent review:** one repeatable-read endpoint loads immutable submission answers, matching value events, application state, and current scenario values.
- **Durable notification:** Prospect submission creates a notification outbox record and audit event in the submission transaction; provider failure becomes a retryable state rather than a lost email.
- **UI state:** the comparison modal remains open, prevents duplicate clicks, refreshes only the affected evidence state, and distinguishes Applied, Previously applied, unavailable, conflicting, and read-only rows.

## Explicitly unchanged

- ROI Model v2.8 / modelVersion 28 formulas, overlap rules, native currency, contract horizon, and Field Inventory methodology.
- Immutable Prospect submission boundary and deliberate per-value approval by an authorized internal user.
- BuyCycle, Solution Fit authorization, role/capability rules, output registry, Executive Value Story, and customer-facing output authorities.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
