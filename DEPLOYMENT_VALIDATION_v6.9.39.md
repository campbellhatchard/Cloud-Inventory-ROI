# Deployment Validation — v6.9.39

## Before deployment

1. Confirm the delivered ZIP SHA-256 against the handoff report.
2. Preserve the current Render environment and take a restorable PostgreSQL backup.
3. Run the mandatory CI PostgreSQL gate against a disposable PostgreSQL database, never production data.
4. Confirm the build reports v6.9.39 and no migration is pending.

## Live Solution Fit checks

1. Sign in as an SE and locate an existing customer from Solution Fit without widening general customer access.
2. Open a v6.9.38 saved Solution Fit and confirm its applications, demo/fit/validation values, exceptions, gaps, interfaces, and custom fields remain present.
3. Confirm the horizontal workflow order: Customer and SE; Inventory Configuration; Product and Application Scope; Labels and Printing; Integrations; Gaps and Exceptions; PS Turnover; Readiness and Document.
4. Select CIP, MEP, and EPP individually and together. Confirm each selected application exposes Demo Status, Fit, Customer Validation, and Exceptions/Notes.
5. For every MEP ERP, choose Standard Package and confirm every package app is selected and locked as the baseline. Add an exception to one package app and confirm all remaining package apps stay selected.
6. Choose Custom Scope and confirm applications become unselected while prior assessment content returns when reselected.
7. Switch ERP families and confirm prior ERP assessment data remains recoverable.
8. Enter inventory configuration, LPN detail, printing, integration, gap action, and turnover data. Refresh the browser and confirm all fields reload from the server.
9. Confirm save-failure and unsaved-state warnings remain visible and outputs do not silently use unsaved browser state.
10. Complete required turnover fields, generate the Word document, and confirm the approved Cloud Inventory logo, INTERNAL USE ONLY classification, customer context, app assessments, gaps, integrations, and turnover fields.
11. Repeat as Admin, owning Rep/read-only user, unrelated Rep, and multi-role user to verify permissions.

## Regression checks

Verify Calculator/ROI, Discovery and Prospect Evidence, Executive outputs, Proposal, JPP, Stakeholders, Competitive Intelligence, Customer Business Case, Customer Email, AI/Christie, Admin, Sales Manager, authentication, and all registered outputs.

## Validation status

PENDING deployment. Do not assign a final readiness colour until this checklist and CI PostgreSQL certification are complete.
