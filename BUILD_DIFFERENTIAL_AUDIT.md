# v6.9.40 Differential Audit

## Intentionally changed

- Replaced the Create/Edit Scope dialog's duplicated ERP and application controls with one product-only builder shared by MEP, CIP, and EPP.
- Kept ERP family/version, Standard Package/Custom Scope, application selection, custom applications, assessment, gaps, integration, and readiness in the main Solution Fit workflow.
- Added primary-product validation and a governed product-removal acknowledgement.
- Preserved removed-product application rows and evidence as history while removing them only from active scope.
- Added an always-visible `⇄ Switch Customer` action and clear current-customer workspace label.
- Reused the dedicated Solution Fit customer discovery route rather than the general ROI customer list.
- Added Save & Switch, Discard & Switch, and Cancel protection for dirty records. A failed save keeps the current customer and edits.
- Added URL-backed `sfCustomer` navigation, authoritative refresh/back loading, loading-state clearing, stale-response rejection, and cross-customer Christie suppression.
- Added permanent v6.9.40 behavioral tests and release metadata.

## Root cause corrected

The legacy setup wizard still seeded MEP ERP and application scope even after v6.9.39 made the main guided workflow authoritative for those fields. The server create endpoint required only a saved handoff document, not duplicated wizard inputs. The correction removes the second user-entry path without deleting the underlying fields or their main-workflow controls.

## Data-preservation controls

- An unchanged Edit Scope round-trip preserves ERP, ERP version, application rows, custom applications, demo/fit/validation, notes, evidence IDs, gaps, integrations, readiness, and unknown extension fields byte-for-byte in the save candidate.
- Product removal requires confirmation, marks matching application rows inactive by selection state, and appends scope history without deleting assessments or evidence.
- Scope changes operate on a cloned candidate and mutate the live workspace only after the server accepts the save.
- Customer switching clears all rendered/customer state before loading the next authoritative record and ignores late responses from prior selections.

## Intentionally preserved

- ROI calculations, economic semantics, evidence methodology, provenance, scenario persistence, and every non-Solution-Fit workflow.
- Role semantics and cross-account boundaries.
- All existing Solution Fit server routes, record identity, output preconditions, and database schema.
- The v6.9.39 main workflow, MEP catalogs, Standard Package rules, custom applications, outputs, and turnover document.
- The deployed Render build command, pre-deploy migration command, `npm start` command, PostgreSQL database, environment variables, historical certification evidence, cumulative pretest hooks, timestamp fingerprint correction, and ownership-transfer regression ordering.

## Deferred by scope

File/photo attachments, attachment storage/deletion, PS turnover evidence packages, CIP prototype integration, new ROI functionality, and role-model changes are not implemented.

## Migrations

None. This correction uses the existing additive JSONB state and route model.

## Packaging reconciliation

- The supplied archive was based on developer snapshot `069f02b8ed42d78e21dd0b583acdb2a3c9274674`, not the deployed v6.9.39 GitHub commit.
- The intended v6.9.40 delta was applied forward to deployed commit `3ad081be117574568d7608bdf952d1ef034924ca`.
- Historical evidence rewrites, removed cumulative test hooks, the removed pre-deploy migration command, the alternate start command, and unrelated regression reversions were rejected as packaging regressions.

## Unresolved certification

- Disposable PostgreSQL integration and live Render role-based validation remain mandatory until CI and deployment complete.
