# v6.9.14 Differential Audit

## Intentionally changed

- Both `Review Prospect Answers` controls now invoke the deliberate Prospect Evidence comparison workflow.
- `Submission History` remains separately labeled and accessible.
- Prospect submission API failures are distinguished from a valid no-submission result.
- Added `test/discovery-review-wiring.test.js` and advanced application/evidence manifests to v6.9.14.

## Intentionally preserved

ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, immutable customer evidence, authorization, native currency, JPP saved-state authority, Solution Fit save-before-output, Executive source/readiness, and every earlier permanent regression test. The production-recovery implementation for Prospect Link ROI progress, answer refresh, Proposal PDF and Executive PDF persistence remains unchanged.

## Removed as obsolete

None.

## Migrations added

None.

## Tests added

- Prospect review button routing and separate Submission History behavior.
- Load failure versus legitimate empty-submission handling.
- Cumulative v6.9.13 production-recovery regression suite remains a release lock.

## Unresolved deployment work

The local workstation has no PostgreSQL server. The GitHub PostgreSQL 16 job and Render Release-Readiness Audit remain external execution steps and are not self-certified here.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
