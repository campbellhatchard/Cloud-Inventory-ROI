# v6.9.38 Differential Audit

## Intentionally changed

- Moved ROI Assumptions modal styles outside the phone-only media query while preserving its responsive 850-pixel and phone behavior.
- Added presentation-only legacy saved-model method resolution for workforce productivity and service value.
- Added a report-only legacy throughput row sourced from the authoritative engine result when needed for exact Annual Customer Benefit reconciliation.
- Added saved-model identity to Web and PDF reports and customer-safe legacy method explanations.
- Added behavioral tests for legacy labor, throughput and service traces, exact reconciliation, unchanged PDF generation, and desktop CSS containment.
- Incremented the application release to `6.9.38` and updated lineage, changelog and generated Application Knowledge metadata.

## Intentionally preserved

- `src/shared/roi-engine.js` formulas and overlap behavior are unchanged.
- No saved scenario is upgraded or rewritten.
- v2.8 input, provenance, economics, readiness and audience behavior are unchanged.
- Authorization, APIs, database schema, migrations, AI, email, Customer Business Case, Prospect Link, Solution Fit, JPP, Stakeholders, Proposal and all other outputs are unchanged.
- SE Solution Fit Scope remains limited to Solution Fit discovery/create/view/edit across active customers.

## Removed

- No feature, route, field, evidence, or output was removed.

## Migrations

- None.

## Tests added or strengthened

- Legacy saved model identity and method trace.
- Legacy additive throughput reconciliation using an engine-owned result.
- Service trace excludes v2.8 contribution-margin inputs when the saved legacy engine did not use them.
- Desktop modal CSS must be outside the `max-width:640px` block.

## Unresolved certification

- Disposable PostgreSQL integration remains NOT TESTED locally unless a safe `DATABASE_URL` is supplied.
- Live Render validation of v6.9.38 is required after deployment.
