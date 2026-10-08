# v6.9.34 QA Results

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

## Result summary

All executable local gates passed with zero failures.

| Gate | Passed | Failed | Skipped / Not tested |
|---|---:|---:|---:|
| Focused customer/context/alert + switcher/UI/ROI | 71 | 0 | 0 |
| Full inherited application suite | 650 | 0 | 2 database-only skips |
| Production regression locks | 301 | 0 | 0 |
| v6.9.33 Proposal export lock | 35 | 0 | 0 |
| Active output runtime matrix | 26 | 0 | 0 |
| Brand System tests | 19 | 0 | 0 |
| Version consistency | 1 | 0 | 0 |
| v6.9.34 PostgreSQL customer persistence | 0 | 0 | 1 skipped / NOT TESTED |
| HTTP route integration | 0 | 0 | 1 suite NOT TESTED |

The output runtime matrix executed all 25 active output IDs plus its registry-coverage test. ROI Model v2.8 fixtures passed and no formula, model version, migration, or economic semantics changed.

## Focused evidence

- Browser validation is derived from the same server contract used by the write handler.
- Missing required values do not call the database.
- Valid creation inserts before returning the customer ID.
- Duplicate owner/name identity returns an authorized existing customer without a second insert.
- Creation failure is explicit and the UI leaves the dialog and values in place.
- Rep/Admin creation authority is retained; SE-only users are not granted ROI customer creation.
- Context switching awaits server save and fails closed.
- No-customer KPIs are unavailable rather than zero.
- Success, warning, and error alerts render with appropriate ARIA roles.
- Audio-off remains fully functional and audio preference is browser-local only.
- Stale scenario, evidence, AI, Proposal, JPP, Stakeholder, and Solution Fit context is cleared during customer reset.

## Environment limitations

No safe `DATABASE_URL` or local PostgreSQL service was available. The new real HTTP/PostgreSQL suite, `test/v6934-postgres-customer-creation.test.js`, is registered in `test:postgres` but is truthfully recorded as NOT TESTED locally. An independent fresh production-dependency install passed, but the local runtime was Node 24; the supported Node 22 and PostgreSQL 16 certification remains the responsibility of the mandatory GitHub Actions gate.

The deployed site still runs the prior release while this package is being built. Pre-change browser behavior was reproduced against v6.9.33. Post-change browser and refresh/logout/login persistence certification must occur after v6.9.34 is deployed.

Final release classification belongs to the Product Owner.
