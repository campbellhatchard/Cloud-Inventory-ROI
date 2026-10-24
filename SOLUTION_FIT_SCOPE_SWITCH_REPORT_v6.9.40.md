# Solution Fit Scope/Switch Report — v6.9.40

## 1. Executive Summary

The Solution Fit setup dialog now defines product scope only for MEP, CIP, and EPP. The guided Solution Fit workflow remains the only place ERP and applications are configured. A clear in-workspace customer switch lets authorized users move among customer Solution Fits without changing the ROI Calculator customer or signing out.

## 2. Authoritative Baseline

The build started only from `cloud-inventory-roi-v6.9.39-render-ready.zip`, verified at SHA-256 `071a32de3aa3b56f75fb13aa66d499d5ec40faba6abb79985bda711f5f2f287d`, materialized as commit `069f02b8ed42d78e21dd0b583acdb2a3c9274674`.

## 3. Existing Setup Architecture

`public/solution-fit.js` owned both a legacy setup wizard and the v6.9.39 main workflow. The wizard selected products and, conditionally for MEP, collected ERP and application scope. The main workflow separately edited the same ERP/application fields and saved the complete document to `handoffs.data`.

## 4. Verified MEP Duplication Cause

The MEP fields were historical creation-time seed controls. The server `POST /api/handoffs/:customerId` does not require ERP or application choices. Once v6.9.39 added complete main-workflow configuration, the old wizard became a second user-entry path rather than a server dependency.

## 5. Product-Only Setup Architecture

`public/solution-fit-scope.js` is the exact production/tested builder and state transition. It accepts one required primary product and optional additional products, renders no ERP/application/custom-app controls, validates before save, and supplies a cloned server-save candidate.

## 6. Existing MEP Data Preservation

Unchanged scope edits leave ERP, version, application rows, custom apps, demo/fit/validation, notes, evidence IDs, gaps, integrations, readiness, and unknown extension fields intact. Product removal is confirmed, changes only active selection state, and appends history without deleting records.

## 7. Main Workflow ERP/Application Authority

The Product and Application Scope step continues to own MEP ERP family/version, Standard Package/Custom Scope, governed application selection, and custom applications. Per-application assessment, gaps, integrations, readiness, and handoff remain in their approved main-workflow locations.

## 8. Customer Switching Architecture

The workspace header displays the active customer and `⇄ Switch Customer`. The existing picker searches the dedicated `/api/solution-fit/customers` route. Selection updates the `sfCustomer` URL parameter, clears the old workspace, and loads the new handoff authoritatively. Browser refresh and Back use the same path.

## 9. SE Cross-Account Authorization

The implementation preserves `solution_fit_cross_account` and `resolveSolutionFitDecision`. It does not assign the selected customer to the global ROI scenario/customer context and does not use a broad all-customer endpoint. Direct handoff access remains server-authorized.

## 10. Unsaved Change Handling

Dirty records present Save & Switch, Discard & Switch, and Cancel. Save completes before selection; a failed save blocks navigation and preserves edits. Discard reloads authoritative saved state before opening the picker.

## 11. Cross-Customer Isolation

All customer-specific state, notices, IDs, progress, rendered content, catalogs, and transient dialogs are cleared before loading. A monotonically increasing load generation causes late responses to be ignored. Christie is hidden when the selected Solution Fit customer is not the authorized active ROI scenario customer, preventing stale AI context reuse.

## 12. CIP Regression

CIP uses the same product-only setup builder and retains all saved process/application assessment data in the main workflow. Focused behavioral coverage passed.

## 13. EPP Regression

EPP uses the same product-only builder as primary or additional scope and is not subjected to MEP ERP logic. Focused behavioral coverage passed.

## 14. Role Regression

Inherited authorization and role-regression suites cover SE, Sales Rep, Sales Leader, Admin, and multi-role capability unions. No role or permission contract changed.

## 15. Interactive Browser Results

NOT TESTED locally. The package was not deployed during this build, and no safe authenticated disposable browser environment containing the required customer fixtures was available. The exact post-deployment steps are retained in `DEPLOYMENT_VALIDATION_v6.9.40.md`; this is not represented as a pass.

## 16. Automated Test Results

The dedicated v6.9.40 gate passed 72 tests with 0 failures and 0 skips. The full application command passed 688 tests with 0 failures and 3 skips; production locks passed 339/339; Brand passed 19/19; and the active output runtime matrix passed 29/29. Machine evidence is recorded in `RELEASE_GATE_RESULTS_v6.9.40.json`.

## 17. PostgreSQL / Persistence Results

Local PostgreSQL migration/integration execution is NOT TESTED because no safe disposable `DATABASE_URL` was available. The release workflow retains PostgreSQL 16 disposable-database certification. Existing server route and state-contract tests passed; no database migration is introduced.

## 18. Files Changed

Production changes are limited to Solution Fit scope/switch JavaScript and styling, its script registration, application version/knowledge metadata, test/release configuration, and release documentation. No ROI engine, formula, evidence, database migration, or unrelated route changed.

## 19. Known Limitations

Live role-based browser validation and disposable PostgreSQL certification remain pending. Until those run, final production readiness belongs to the Product Owner.

## 20. Deferred Evidence/Attachment Build

Photo/file capture, attachment persistence/deletion, per-item attachments, mobile capture, audit history, and PS Turnover evidence packaging are explicitly deferred. This release does not add or emulate them.

## 21. Release Recommendation

Proceed to disposable PostgreSQL CI and controlled deployment validation. Do not assign the final release colour until both are reviewed by the Product Owner.
