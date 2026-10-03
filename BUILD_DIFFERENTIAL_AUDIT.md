# v6.9.26 Differential Audit

v6.9.26 is a corrective build from the exact v6.9.25 render-ready archive. It resolves confirmed regression findings in customer/workspace state, customer-level Field Inventory persistence, Executive Three Whys persistence, Prospect-value warnings, AI failure handling and context, role presentation, and read-only Joint Project Plans.

ROI formulas, overlap policy, ROI Model v2.8, immutable Prospect evidence, deliberate value application, authorization scope, output registry ownership, native currency, Brand System v1.0, Application Knowledge v1.0, and Christie Persona v1.0 are preserved.

One migration, `039_sync_customer_field_inventory.sql`, reconciles each customer's current flag from its newest current scenario that contains an explicit boolean Field Inventory value. It does not modify ROI inputs or calculated results.

Permanent coverage is provided by `test/v6926-regression-hardening.test.js` and all inherited suites.

## Prior v6.9.23 Differential Audit

v6.9.23 corrects saved-state completeness, Prospect-value continuity, field-inventory synchronization, Value History canonical mapping, contract-period labels, and AI service failure clarity. It changes no ROI formula, evidence boundary, schema, migration, or permission.

Permanent coverage is provided by `test/v6923-regression-integrity.test.js` in the full and production-lock suites.

## Prior v6.9.21 differential record

v6.9.21 is a focused correction for defects reproduced after deploying v6.9.20. It introduces no ROI, evidence, authorization, database, or sales-methodology changes.

## Intentionally changed

- Executive PDF and PowerPoint deadlines now start after the user completes the governed Ready/Review/Draft decision. User review time is no longer misclassified as file-generation time.
- Stakeholder Map accepts the currently selected authorized scenario as customer authority instead of requiring a second match in a narrower company list.
- Christie converts unmet checklist states into explicit next actions and corrects the visible criteria pluralization.
- Default legacy `Mutual Action Plan` titles are presented as `Joint Project Plan` in the portfolio, editor, Deal Coach, printable plan, and generated JPP PowerPoint. Stored plan evidence and milestone history are not rewritten.
- Release metadata advances to v6.9.21 and retains exact v6.9.20 parent lineage.

## Intentionally preserved

ROI Model v2.8, formulas, overlap rules, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, immutable Prospect evidence, deliberate per-value application, Value History, Rep Confirmed provenance, BuyCycle governance, native currency, output readiness, saved-state requirements, role permissions, and SE cross-account Solution Fit scope.

## Migrations added

None.

## Tests added

- `test/v6921-live-regression-corrections.test.js`
- Registered in permanent release tests and production locks.

## External validation remaining

- PostgreSQL integration requires the disposable PostgreSQL 16 GitHub Actions service.
- Render validation must exercise the corrected readiness-dialog/export sequence and validate downloaded PDF/PPTX files.
# v6.9.24 corrective differential

- Added one shared server-side Proposal export preparation service.
- Added real server-generated Proposal PDF and ROI Methodology PDF builders.
- Replaced the active Proposal and Methodology browser-print calls with authenticated file downloads.
- Added a bounded 30-second export lifecycle, UI restoration, safe errors, and retry controls.
- Updated runtime ownership and tests to execute the actual production builders.
- No ROI formula, evidence, authorization, database schema, migration, or role change was introduced.

# v6.9.25 corrective differential

- Corrected scenario versioning so every version retains the source scenario's canonical customer ID; administrator on-behalf saves remain owned by the intended rep/customer.
- Added a deterministic migration to repair historical scenario/customer identity mismatches without changing evidence or ROI values.
- Replaced the repeatedly failing browser-print paths for JPP, Stakeholder, Solution Fit, Competitive, and Impact Map PDFs with authenticated server-generated files from saved authoritative records.
- Removed the Proposal initial-save deadlock and retained explicit seller control over save and export.
- Exposed contract-value projections needed by Compare/portfolio views without returning full scenario JSON in list responses.
- Corrected saved-stage propagation, JPP blank-milestone validation, Prospect-evidence modal contrast, stale-draft warnings, role labels, analytics credential autofill, payback precision, and Christie’s saved Stakeholder/JPP context.
- No ROI formula, overlap rule, immutable evidence boundary, authorization scope, native-currency rule, Rep Confirmed behavior, or SE cross-account Solution Fit capability changed.
