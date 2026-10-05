# v6.9.32 Differential Audit

v6.9.32 is a focused consistency correction built from the exact v6.9.31 Render-ready baseline.

## Confirmed root cause

The Calculator warning counted server review rows whose status was `AVAILABLE`. Discovery independently rebuilt pending state from cached Value History and browser provenance. The two projections could disagree even though the evidence modal and apply transaction were correct. In the reproduced case, the server reported 24 mapped values, 7 applied, and 17 available; Discovery reported 15 because its secondary join excluded two values.

## Production changes

- Added `public/prospect-evidence-summary.js`, a pure shared browser/Node authority that summarizes the server-owned review rows.
- Discovery and Calculator now use the same pending count and exact wording.
- Pending means the server review row is `AVAILABLE`. A numerically equal working value remains pending until the user explicitly applies the immutable Prospect value event and saves its provenance.
- Removed the Discovery-only reconstruction from `byInput`, Value History events, and `activeProvenance`.

## Preserved behavior

- Prospect values are never applied automatically.
- Draft answers never become submitted evidence.
- Missing verified events remain unavailable for application.
- Historical, closed, and view-only scenarios remain read-only.
- ROI Model v2.8, evidence provenance, authorization, routes, migrations, and all customer-facing outputs are unchanged.

## Permanent evidence

`test/v6932-prospect-evidence-count-consistency.test.js` verifies the reproduced 24/7/17 state, equal-value provenance behavior, empty and non-actionable states, shared consumption by both surfaces, and removal of the legacy second counting path.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
