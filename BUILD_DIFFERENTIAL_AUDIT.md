# v6.9.14 Differential Audit

## Intentionally changed

- Corrected the PostgreSQL scenario integration request to supply the required top-level company field.
- Corrected the scenario INSERT response to return the persisted `customer_id`.
- Replaced PostgreSQL-invalid `UPDATE ... ORDER BY ... LIMIT` current-version promotion with an ordered scalar subquery.
- Updated the handoff integration journey to use the governed explicit POST creation path before PUT update.
- Advanced application and evidence manifests to v6.9.14.

## Intentionally preserved

ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, immutable customer evidence, authorization, native currency, JPP saved-state authority, Solution Fit save-before-output, Executive source/readiness, and every earlier permanent regression test.

## Removed as obsolete

None.

## Migrations added

None.

## Tests added

- PostgreSQL scenario create/save/reload coverage now exercises the public request contract.
- Response coverage verifies the persisted customer identity.
- Scenario deletion coverage executes PostgreSQL-safe prior-version promotion.
- Solution Fit coverage preserves the explicit-create/no-upsert contract.

## Unresolved deployment work

The local workstation has no PostgreSQL server. The mandatory GitHub PostgreSQL 16 job and Render production validation remain external execution steps and are not self-certified here.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
