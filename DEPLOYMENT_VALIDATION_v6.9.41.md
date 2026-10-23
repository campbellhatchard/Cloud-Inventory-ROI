# Deployment Validation — v6.9.41

## Before deployment

1. Verify the delivered ZIP SHA-256 against the handoff report.
2. Require CI to use a clean disposable PostgreSQL database, run migrations, and execute `npm run test:postgres` with zero failed, skipped, or not-tested suites.
3. Review `POSTGRES_INTEGRATION_RESULTS_v6.9.41.json`, `RELEASE_GATE_RESULTS_v6.9.41.json`, and `OUTPUT_RUNTIME_RESULTS_v6.9.41.json` from CI.
4. Preserve the current Render configuration and obtain a restorable production database backup.
5. Deploy the committed archive. Confirm `/health`, Version History, and served assets identify `6.9.41`.

## New MEP flow

1. Sign in as a Solution Engineer and switch to an active QA customer with no Solution Fit.
2. Create an MEP fit; verify the setup modal owns products only and no generic legacy rows or warning appears.
3. In Product & Application Scope, select ERP family, enter ERP version, select Standard Package or Custom Scope, and choose applications.
4. Assess applications, create a gap, save, refresh, sign out/in, and reopen.
5. Verify stable process/gap IDs, current assessment, ERP/version, assignment, and readiness persist.

## Duplicate-name identity

1. Create a CIP+MEP fit containing same-name applications where available.
2. Create a gap for only one application.
3. Confirm the other application has no gap, save, refresh, and confirm the relationship remains exact.
4. Repeat with duplicate names in separate CIP groups.

## Primary SE

1. As Admin, create/open an unassigned fit and verify `Not Assigned`.
2. Assign an active QA Solution Engineer and verify display, `primary_se_id`, readiness, and refresh persistence.
3. Verify an inactive, deleted, or non-SE user is rejected and an eligible multi-role SE succeeds.
4. Confirm reassignment does not alter creator/assessment/gap authorship.

## ERP evidence isolation

1. Configure MEP/JDE with version, application demo/fit, customer validation, note, and gap; save.
2. Deliberately change JDE to SAP and accept the explicit reset.
3. Confirm SAP rows start unreviewed/unvalidated and no same-name evidence carries.
4. Confirm the JDE/version/assessment/note remains in internal historical state.

## Multi-product and customer isolation

1. Test CIP primary + MEP additional, MEP primary + CIP additional, MEP + EPP, and CIP + EPP.
2. Confirm every active MEP configuration receives ERP/version/application requirements, and non-MEP products do not.
3. Set ROI context to Customer A and Solution Fit to Customer B. Confirm B never receives A-derived defaults or Christie context.
4. Switch ROI context A→C and confirm B remains stable.
5. Switch Solution Fit A→B→C→A; verify processes, gaps, SE, ERP, readiness, outputs, and context reload authoritatively with no stale state.

## Role matrix and direct access

Repeat applicable flows as Sales Rep, Solution Engineer, Admin, Rep+Leader, Rep+SE, SE+Leader, and Admin+all roles. Confirm SE cross-account access remains Solution-Fit-specific and unauthorized direct customer/handoff requests are server-denied.

## Critical regression

Smoke authentication, customer creation/switching, ROI Calculator/save/version, Prospect workflow, Rep Confirmed, Value History, Three Whys, Sales Manager, Solution Fit and outputs, JPP, Proposal, Executive Outputs, Competitive Intelligence, Admin ownership/cleanup, ROI Assumptions & Results, and Christie.

## Status

PENDING deployment execution. Record observed pass/fail evidence; do not infer browser or database success from local unit tests.
