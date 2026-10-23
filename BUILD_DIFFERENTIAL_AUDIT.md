# v6.9.43 Differential Audit

## Authorized correction scope

This build starts from the verified v6.9.42 archive and corrects only the fourteen defects confirmed in the deployed role-based regression. The unbuilt v6.9.43 evidence-attachment prompt is explicitly excluded.

## Intentionally changed

- Added one browser workspace-generation authority so customer/scenario switches invalidate stale asynchronous responses.
- Bound Executive, Proposal, AI Help, and Christie loading/rendering to the originating customer and scenario.
- Made scenario save responses return the exact persisted ROI projection and made the browser adopt it immediately.
- Prevented a legacy v2.7 scenario from silently saving through a v2.8 server calculation; the existing governed upgrade preview is required.
- Extended Solution Fit readiness to General Inventory Configuration, Professional Services turnover, gap disposition, and clean saved state.
- Recomputed Solution Fit progress and selected-application counts after active scope/assessment changes.
- Removed read-time Solution Fit mutation/autosave behavior.
- Removed duplicate explicit Three Whys microphone controls while retaining the single generic dictation control per field.
- Scoped Christie memory to the opportunity, cleared invalid field-help context, and bounded both AI requests to twenty seconds.
- Added a short opportunity reference to Sales Manager rows/cards/drawer so different opportunities with the same labels remain visibly distinct.
- Added focused permanent regression coverage and synchronized release/version evidence.

## Intentionally preserved

- ROI Model v2.8 formulas, economic classes, overlap rules, contract schedule, native currency, and null-versus-zero semantics.
- Immutable Prospect evidence, deliberate per-value application, Value History, Rep Confirmed provenance, and historical scenario immutability.
- Buyer Evidence and BuyCycle governance, authorization/capability rules, and SE cross-account Solution Fit scope.
- Solution Fit state schema, application/gap identity, MEP catalog/package behavior, outputs, and authenticated persistence.
- Executive/Proposal canonical source/readiness, draft classification, and commercial-note exclusion.
- Output Registry ownership, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, and permanent-test monotonicity.
- The deployed Render build command, pre-deploy migration command, `npm start` command, PostgreSQL database, environment variables, historical certification evidence, cumulative pretest hooks, timestamp fingerprint correction, and ownership-transfer regression ordering.

## Deferred by scope

No file upload, evidence attachment, attachment gallery, new product feature, new ROI formula, authorization expansion, or browser-local authoritative storage is included.

## Migrations

No migration or schema change is introduced. The migration inventory remains 44 files through `044_admin_bulk_cleanup.sql`.

## Packaging reconciliation

- The supplied archive was based on v6.9.42 developer parent `a4a34de7238d82232fd6395e6fb6f57c42f2b51d`; the exact production parent is `46af1f156f4852551c4714ac6660df790a1b3709`.
- The v6.9.43 corrective delta was applied forward to that deployed production commit.
- Historical evidence rewrites, removed cumulative test hooks, the removed pre-deploy migration command, the alternate start command, and unrelated regression reversions were rejected as packaging regressions.

## Unresolved certification

- Disposable PostgreSQL integration and live Render role-based validation remain mandatory until CI and deployment complete.
