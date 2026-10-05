# Final Corrective Build Report — Cloud Inventory ROI v6.9.29

## Outcome

Five confirmed repeat defects were traced to shared authority failures and corrected at those boundaries. No ROI formula, evidence boundary, authorization capability, database schema, or output owner changed.

## Root causes and corrections

### Prospect value application

The authority query referenced `discovery_sessions.customer_id`, which no migration creates. The new authority validates the immutable value event, submission, and exact submitted answer through opportunity `base_id`, submission ID, question, canonical input, and normalized value. The route emits a safe structured problem with stable code and phase; it does not fabricate or auto-apply evidence.

### Field Help semantic drift

Field meaning was inferred from a shared ROI formula, so Annual revenue and Contribution Margin received the same generic service-margin definition. An exact canonical field-definition registry now owns label, definition, unit, and entry guidance. Formula context remains supplemental.

### Competitive product context

Multiple asynchronous loaders shared mutable dropdown state; synchronization copied the competitor but not the saved Cloud Inventory product. A scenario-scoped context authority now defaults to the saved product, limits explicit overrides to the same scenario, aborts superseded requests, and discards stale completions.

### Customer counts

Saved scenario versions were counted and labeled as scenarios/opportunities. Server projections now expose `opportunityCount = COUNT(DISTINCT base_id)` and `versionCount = COUNT(s.id)`. The UI and administrative exports label both explicitly.

### Admin Error Log totals

The headline used a database total while badges counted only the downloaded page. One PostgreSQL statement now returns page rows, all/filtered totals, server/client totals, offset, limit, and returned count from one snapshot. The client renders only that contract.

## Reliability practices applied

- Stable machine-readable API problem codes and phases with customer-safe messages.
- Explicit `response.ok` handling retained at browser boundaries.
- Request cancellation plus generation checks for stale asynchronous work.
- Distinct opportunity identity separated from version identity.
- One paginated response contract for rows and all related totals.
- Permanent behavioral tests for each authority.

## Verification

- Full suite: 600 TAP passed, 0 failed, 2 PostgreSQL-dependent skipped; 34 standalone ROI checks passed.
- v6.9.29 focused suite: 58 passed, 0 failed, 0 skipped.
- Production locks: 251 passed, 0 failed.
- Brand tests: 19 passed, 0 failed.
- Output runtime: all 25 active output owners executed; 26 matrix tests passed.
- PostgreSQL migrations and four integration suites: NOT TESTED because no safe non-production database was available.

Final deployment readiness belongs to the Product Owner after PostgreSQL and deployed multi-role browser validation.
