# v6.9.19 Differential Audit

v6.9.19 is a corrective release applied to the exact Git commit currently deployed as v6.9.18. It retains the v6.9.18 fixes and adds the explicitly listed reliability, persistence, context, accessibility, and output corrections below. It does not change the authoritative ROI formulas or database schema.

## Intentionally changed

- Prospect Link generation uses one resolved active scenario ID for validation and API submission.
- Prospect questionnaire autosave uses one timer per question and flushes every buffered answer before immutable submission.
- ROI customer/scenario creation requires an independent Sales Rep or Admin role in both UI and server authorization.
- Sales Manager and saved-scenario surfaces prefer governed contract ROI, NPV, and payback fields.
- Implementation timeline uses the same interpolated contract payback as Summary and Executive outputs.
- Scenario save prevents duplicate client activation and serializes same-opportunity creation on PostgreSQL.
- Three Whys fall back to in-memory editor state and invalidate cached Executive Value Story after version save.
- Sales Manager search resists login credential autofill.
- Executive PDF requests time out safely, restore controls, show Retry, and report failure to Admin Error Log.
- Prospect draft-difference text identifies the Prospect Link draft rather than implying the calculator value is stale.
- Customer switching clears dependent scenario/prospect state and restores the selected active context.
- Prospect value application is constrained to the matching opportunity and customer.
- Admin customer/scenario payloads are normalized before rendering and switching.
- JPP milestone inputs persist through save and reload.
- Buyer Evidence uses local-date formatting and exposes evidence strength consistently.
- CRM contract metrics and published business-case link actions provide explicit success/failure feedback.
- Modal visibility and downloadable output handling fail safely for inaccessible or empty artifacts.

## Intentionally preserved

ROI Model v2.8, formulas, overlap rules, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, immutable Prospect evidence, deliberate per-value application, Value History, Rep Confirmed provenance, BuyCycle governance, output authority, migrations, and SE cross-account Solution Fit scope.

## Migrations added

None.

## Tests added

- `test/v6918-role-regression-corrections.test.js`
- Registered permanently in the full suite and production locks.

## Unresolved external validation

GitHub Actions PostgreSQL 16 certification and Render post-deployment verification remain mandatory external gates. The original live Executive PDF server failure cannot be fully reproduced without an authenticated deployed runtime; v6.9.19 preserves fail-recovery and diagnostic capture while existing server PDF runtime coverage remains in force.
