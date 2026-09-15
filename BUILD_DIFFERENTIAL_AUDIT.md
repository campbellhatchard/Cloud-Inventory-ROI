# v6.9.13 Differential Audit

## Intentionally changed

- Added a shared `public/proposal-output-builder.js` used by Proposal Preview and the production Proposal PDF adapter.
- Registered that shared production builder as the owner of both Proposal HTML outputs.
- Added sequential `test:postgres`, mandatory database certification mode, sanitized PostgreSQL evidence, and CI artifact upload.
- Advanced application and evidence manifests to v6.9.13.

## Intentionally preserved

ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, immutable customer evidence, authorization, native currency, JPP saved-state authority, Solution Fit save-before-output, Executive source/readiness, and every earlier permanent regression test.

## Removed as obsolete

- Competing Proposal HTML implementations in `public/proposal.js` and `public/executive-output-adapters.js`.

## Migrations added

None.

## Tests added

- Shared Proposal Ready/Review/Draft audience and commercial-note exclusion.
- Production builder ownership parity.
- Mandatory PostgreSQL certification workflow and sanitized evidence.

## Unresolved deployment work

The local workstation has no PostgreSQL server. The GitHub PostgreSQL 16 job and Render Release-Readiness Audit remain external execution steps and are not self-certified here.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
