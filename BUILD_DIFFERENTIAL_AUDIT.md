# v6.9.42 Differential Audit

## Intentionally changed

- Included the cumulative v6.9.41 Solution Fit identity, authority, readiness, criterion-evidence, handoff, output, and PostgreSQL stabilization changes.
- Refined the General Inventory Configuration step with scan-friendly cards, native answer controls, an instructional callout, inline notes, conditional LPN layout, responsive behavior, accessible labels, and visible focus states.
- Preserved the governed questions, answer values, state keys, answered-count rule, persistence path, readiness semantics, and customer boundary.
- Added permanent v6.9.41 and v6.9.42 behavioral tests and release metadata.

## Root cause corrected

The cumulative developer package corrects Solution Fit stabilization defects introduced after v6.9.40 and improves the dense General Inventory Configuration presentation without changing its stored model or server contract.

## Data-preservation controls

- Existing authenticated handoff JSONB remains authoritative; no database or state-schema migration is added.
- Inventory notes and LPN details continue through the existing debounced server save path.
- Stable process, criterion, gap, customer, and product identities remain governed and customer-isolated.

## Intentionally preserved

- ROI calculations, economic semantics, evidence methodology, provenance, scenario persistence, and every non-Solution-Fit workflow.
- Role semantics and cross-account boundaries.
- All existing Solution Fit server routes, record identity, output preconditions, and database schema.
- The v6.9.40 main workflow, customer switch protections, MEP catalogs, Standard Package rules, custom applications, outputs, and turnover document.
- The deployed Render build command, pre-deploy migration command, `npm start` command, PostgreSQL database, environment variables, historical certification evidence, cumulative pretest hooks, timestamp fingerprint correction, and ownership-transfer regression ordering.

## Deferred by scope

File/photo attachments, attachment storage/deletion, PS turnover evidence packages, new ROI functionality, and role-model changes are not implemented.

## Migrations

None. This correction uses the existing additive JSONB state and route model.

## Packaging reconciliation

- The supplied archive was based on the v6.9.41 developer parent materialized as `cfee9275b073fdb9f074a61daaf4460e87227ba2`, while production remained on v6.9.40.
- The cumulative v6.9.41 and v6.9.42 delta was applied forward to deployed commit `212712ae890f74c09f4f439e4007b63b0c6a8dd9`.
- Historical evidence rewrites, removed cumulative test hooks, the removed pre-deploy migration command, the alternate start command, and unrelated regression reversions were rejected as packaging regressions.

## Unresolved certification

- Disposable PostgreSQL integration and live Render role-based validation remain mandatory until CI and deployment complete.
