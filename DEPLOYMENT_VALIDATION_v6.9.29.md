# Deployment Validation — v6.9.29

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Before deployment

1. Review `RELEASE_GATE_RESULTS_v6.9.29.json` and require zero local gate failures.
2. Use a clean, disposable PostgreSQL database for `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates`; never use production customer data.
3. Deploy only `cloud-inventory-roi-v6.9.29-render-ready.zip` or the identical reviewed Git commit.

## Post-deployment checks

1. Confirm `/health`, login, and Version History report `6.9.29`.
2. Apply one real immutable Prospect value and confirm Value History, calculator working value, save, refresh, and reload.
3. Ask Field Help on Annual revenue and Contribution Margin and confirm distinct guidance.
4. Switch a saved CIP/MEP/EPP scenario, open Competitive Intelligence, and confirm saved product context survives delayed requests and navigation.
5. Confirm customer cards separately label opportunities and saved versions.
6. Confirm Admin Error Log global totals, selected-category totals, badges, and page range remain consistent while filtering and paging.
7. Run the full role ALLOW/DENY matrix, all registered outputs, live AI persistence, and console/network review.

## Result

Not executed in this build environment. Deployment validation remains a Product Owner gate.
