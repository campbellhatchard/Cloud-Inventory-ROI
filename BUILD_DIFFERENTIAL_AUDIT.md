# v6.9.34 Differential Audit

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

v6.9.34 is a focused customer-workflow and alert-integrity correction built only from `cloud-inventory-roi-v6.9.33-render-ready.zip`, SHA-256 `181197394a3af5898edf0194da2b5188b93b681dd07ae54bc8c14d273b6a6f88`. The deployed GitHub parent is `e580a8f5696e705855805883529241e25144acc8`; the developer source snapshot is retained separately as `e26c0da511ac3339c65849cd1bee158c4ad8c237`.

## Reproduced failures

- New Customer created only a browser object. Refreshing the deployed application removed it because no customer row had been committed.
- The persistent customer switcher had no creation entry, forcing users back through the landing experience.
- No-customer state exposed Save, Executive, Share, and Email actions and displayed `$0` / `0%` as though an economic case existed.
- Customer-switch Save & Continue polled a browser dirty flag instead of awaiting the server save result.
- Important failures shared a transient toast channel and optional audio had no governed, accessible framework.

## Corrective architecture

- One frozen Customer Setup contract supplies browser fields and server validation. Only Company Name is database-required; Field Inventory is optional and Account Owner is derived from the authenticated user.
- `POST /api/customers` is authenticated, Rep/Admin-authorized, validates on the server, inserts into PostgreSQL, applies the existing owner/name duplicate rule, audits success, and returns the authoritative customer ID.
- The setup dialog retains entered information on validation, duplicate, network, or server failure and exposes an authorized Open Existing path when appropriate.
- One context-state authority distinguishes no customer, customer/no scenario, unsaved working scenario, saved scenario, and dirty saved scenario. Governed actions follow that state and no-context economics render as unavailable rather than zero.
- Customer switching and creation protect edits with Save & Continue, Discard & Continue, and Cancel. Save paths await the actual save promise and fail closed.
- `AppAlerts` centralizes severity, persistence, ARIA live-region behavior, deduplication, dismissal, and optional local audio. Existing `showToast` callers now enter this authority without broad workflow rewrites.

## Deliberately preserved

No database migration, ROI formula, ROI Model version, evidence rule, scenario version behavior, output generator, authorization expansion, or customer-facing document logic changed. Sales Engineers retain their existing Solution Fit access and do not gain ROI customer-creation authority.

## Permanent evidence

`test/v6934-customer-alert-workflow.test.js` covers the shared schema, server validation, authentication/role boundary, PostgreSQL insert contract, duplicate and failure behavior, customer-ID context establishment, unsaved guards, explicit state machine, no-false-zero rule, stale-context reset, accessible alert semantics, optional audio isolation, and the unchanged ROI/migration boundary.
