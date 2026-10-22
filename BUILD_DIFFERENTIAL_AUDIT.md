# v6.9.39 Differential Audit

## Intentionally changed

- Replaced the Solution Fit tab presentation with an eight-step horizontal guided workflow.
- Put General Inventory Configuration before Product and Application Scope.
- Added CIP, MEP, and EPP application catalogs with direct per-application Demo Status, Fit, Customer Validation, and Exceptions/Notes controls.
- Added governed MEP Standard Package subsets for JDE, EBS, Oracle Fusion, SAP ECC6, and SAP Hana; Hana intentionally shares the ECC6 package list.
- Added Standard Package and Custom Scope behavior. Package applications remain selected; custom scope deselects them without deleting prior assessment evidence.
- Preserved legacy/customer-specific processes in a visible saved-record section instead of dropping or hiding them.
- Added compact Labels/Printing, centralized Gaps/Exceptions action fields, and Professional Services turnover inputs.
- Added a branded internal Professional Services turnover DOCX produced from the successfully saved server record.
- Registered and runtime-certified the DOCX output through its exact production builder.
- Incremented application identity to `6.9.39` and updated lineage, changelog, output registry, knowledge metadata, and permanent regression protections.
- Advanced GitHub certification artifact names and paths to v6.9.39 and added the v6.9.39 focused workflow to the machine release runner.

## Data-preservation controls

- The migration function fills only missing keys and preserves unknown future/legacy keys.
- Application deselection never resets Demo, Fit, Validation, Notes, IDs, or extension fields.
- ERP changes retain the prior ERP records and may carry matching assessment evidence forward with `scope_carried_forward=true`.
- The older scope wizard now merges records rather than replacing `S.processes`.
- Server persistence remains the existing `handoffs.data` JSONB record; no `localStorage` or `sessionStorage` is used.

## Intentionally preserved

- ROI formulas, evidence methodology, provenance, null/zero semantics, native currency, and saved scenario economics.
- All role and cross-account authorization boundaries.
- Existing Solution Fit PDFs and saved-state output enforcement.
- Existing database schema and all 44 inherited migrations.
- Every unrelated page, route, output, AI workflow, and customer-facing surface.
- The deployed v6.9.38 Render build command, pre-deploy migration command, `npm start` command, PostgreSQL database, environment variables, historical certification evidence, cumulative pretest hooks, timestamp fingerprint correction, and ownership-transfer regression ordering.

## Removed

- The redundant standalone Demo/Fit primary navigation step is removed from the new presentation because assessment is performed directly on each selected application. Its saved data model is retained.
- No saved field, API, record, route, or evidence is removed.

## Migrations

- None. All new fields are additive within the existing governed JSONB document.

## Test additions

- Additive legacy-state migration and unknown-field preservation.
- Standard Package/custom-scope selection with assessment retention.
- Governed package catalog subset and SAP list parity.
- Server-only persistence and workflow ordering.
- Actual branded DOCX generation and OOXML validation.
- Saved-record DOCX route and fail-closed required-field validation.

## Packaging reconciliation

- The supplied archive was based on developer snapshot `5a1f4c9001627406b8f8a30ba547f8b35c23d103`, not the deployed v6.9.38 GitHub commit.
- Intended v6.9.39 source changes were applied forward to deployed commit `f54bd01e22b25e1b4e3087bd13e38e8db06130a3`.
- Historical evidence rewrites, removed cumulative test hooks, the removed pre-deploy migration command, the alternate start command, and unrelated v6.9.36/v6.9.35 test changes were rejected as packaging regressions.

## Unresolved certification

- Disposable PostgreSQL integration and live Render role-based validation remain mandatory until CI and deployment complete.
