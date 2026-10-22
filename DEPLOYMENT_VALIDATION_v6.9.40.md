# Deployment Validation — v6.9.40

## Before deployment

1. Verify the delivered ZIP SHA-256 against the handoff report.
2. Confirm CI used a disposable PostgreSQL 16 database, ran migrations, and recorded zero failed/skipped/not-tested database suites.
3. Preserve the existing Render environment and obtain a restorable production database backup.
4. Deploy the committed v6.9.40 archive and confirm `/health`, the app footer/history, and served assets identify 6.9.40.

## MEP product-only setup

1. Sign in as a Solution Engineer and open Solution Fit.
2. Switch to an active QA customer with no fit and select Create Solution Fit.
3. Select MEP; confirm only primary and additional products appear—no ERP or application controls.
4. Create the fit and configure ERP, version, Standard Package/Custom Scope, applications, custom app, and demo/fit data in the main workflow.
5. Save, refresh, and verify persistence.
6. Edit Scope without changing products and confirm every ERP/application/assessment/gap value remains.
7. Attempt to remove MEP and confirm the preservation warning/acknowledgement appears and historical data is not deleted.

## Customer switching

1. From Customer A, use `⇄ Switch Customer`; do not leave Solution Fit or change the ROI customer.
2. With unsaved changes, verify Cancel, Discard & Switch, Save & Switch, and failed-save blocking.
3. Load Customer B with an existing fit and confirm no Customer A field, progress, IDs, or coaching context appears.
4. Load Customer C with no ROI scenario and no fit; confirm Create Solution Fit is offered and product-only setup opens.
5. Switch A→B→C→A, refresh, and use Browser Back. Confirm each record reloads authoritatively.
6. Monitor network and console for stale requests, unauthorized access, errors, or browser-storage persistence.

## Role regression

Repeat the authorized paths as Solution Engineer, Sales Rep, Sales Leader, Admin, Rep+SE, SE+Leader, and Admin+all roles. Verify unauthorized direct customer/handoff URLs are rejected and no Solution Fit selection grants unrelated ROI access.

## Critical regression

Smoke authentication, ROI Calculator/save/version, Prospect/Rep Confirmed/Value History/Three Whys, Sales Manager, Solution Fit save/outputs, JPP, Proposal, Executive Outputs, Competitive Intelligence, Customer Business Case, Admin ownership/cleanup, ROI Assumptions, and Christie.

## Status

PENDING deployment. Record observed pass/fail evidence; do not infer success from local source tests.
