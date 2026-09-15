# Release manifest — v6.9.3

Release: Solution Fit Runtime Authorization & Picker Recovery. Date: 2026-09-04.

Authoritative baseline: `cloud-inventory-roi-v6.9.2-render-ready.zip` (SHA-256 `6960E2D48A86AC07FD44F957E5C15C55CD31EF5BB50948E17F888E6F61FF1DA1`), committed unchanged as `e9777d4f65e1c3a01fc52c5477d43ffd2f9a3576` before modification.

Application 6.9.3; ROI Model 2.8 / 28; Brand System 1.0; Application Knowledge 1.0; Christie Persona 1.0. No migration added; migration ceiling remains `036_solution_fit_cross_account.sql`.

Changes are limited to the Solution Fit authorization runtime correction, picker state/retry behavior, permanent behavioral tests, version metadata, and release governance evidence. No public/prospect route or role/capability definition changed.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

Expected archive: `cloud-inventory-roi-v6.9.3-render-ready.zip`, produced from validated Git state with `git archive`. Product Owner approval remains required.
