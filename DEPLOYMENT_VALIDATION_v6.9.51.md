# Deployment Validation — v6.9.51

## Identity

1. Deploy only `cloud-inventory-roi-v6.9.51-render-ready.zip` from the committed release state.
2. Confirm `/health` and Admin Version History show `6.9.51`.
3. Confirm Node 22 and migration level 045. This release adds no migration.

## Non-owner acceptance

1. Sign in as an approved non-owner Sales Rep QA user.
2. Open a plan under **All reps' plans — Read-only** and confirm the read-only indicator.
3. Confirm title, date, group, milestone, status, Save, Add/Remove, and AI mutations remain unavailable.
4. Open More and confirm **Share with prospect** is disabled or absent.
5. For a plan with an existing link, confirm Rotate and Revoke are disabled or absent.
6. Confirm permitted internal/customer PDF and PowerPoint outputs still work.
7. Directly attempt update/share/revoke/delete requests and require 403 with zero state change.

## Owner acceptance

1. Sign in as the plan owner and open an eligible saved plan.
2. Confirm normal editing, Save, Add/Remove, and AI behavior.
3. Confirm Share is available only when the plan is saved and clean.
4. Confirm existing-link Rotate and Revoke behavior.
5. Generate permitted JPP PDF and PowerPoint outputs and validate the files.

## External gates

Run `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` against a disposable PostgreSQL 16 database. Require zero database failures, skips, or NOT TESTED results. Never use production customer data or credentials. The Product Owner assigns the final release classification after these live checks.
