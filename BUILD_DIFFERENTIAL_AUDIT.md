# v6.9.17 Differential Audit

## Intentionally changed

- Competitive AI Research preserves the explicitly selected CIP or MEP product in its governed source.
- Discovery progress refreshes immediately after answer entry.
- Stakeholder Map inherits the saved authorized scenario customer and exposes keyboard-accessible search-result controls.
- Sensitivity uses the authoritative selected-contract NPV and contract term instead of a fixed five-year label.
- AI Help maps active panes to canonical Application Knowledge workspace identifiers, including Solution Fit.
- Risk Ledger opens its output window before asynchronous save validation so the initiating browser gesture is preserved.
- Added `test/v6917-se-interactive-regression.test.js` and registered it in both the full suite and production locks.

## Intentionally preserved

ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, database schema, migrations, authorization boundaries, immutable evidence, server-authoritative customer outputs, saved-state output controls, and all earlier permanent regression protections.

## Removed as obsolete

None identified by the supplied release manifest.

## Migrations added

None. The migration ceiling remains `037_rep_confirmed_value_provenance.sql`.

## Tests added

- Six v6.9.17 SE interactive workflow regression tests.
- The four v6.9.16 SE Solution Fit discoverability tests remain cumulative.

## Validation limitation

The declared v6.9.16 parent archive was not supplied, so this audit cannot independently reproduce a file-by-file archive comparison. The statements above are supported by the v6.9.17 manifest, active source inspection and executed regression tests. The production script provides an additional exact Git diff against live `main` before deployment.

## Unresolved deployment work

PostgreSQL migrations and integration suites require a safe non-production PostgreSQL database and remain NOT TESTED locally. GitHub PostgreSQL 16 certification and Render post-deployment validation remain external gates.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
