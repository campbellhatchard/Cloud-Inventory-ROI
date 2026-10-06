# v6.9.33 QA Results

The machine-generated source of truth is `RELEASE_GATE_RESULTS_v6.9.33.json`. A release candidate is not packageable until every mandatory gate records PASS.

## Corrective coverage

- Production browser adapter: delayed Internal Draft decision does not arm the generation timeout.
- Single-flight behavior: rapid repeat activation produces one preflight, one request, and one download.
- Recovery: request-only timeout restores the control and gives a retryable error.
- Production service and PDF response authority: canonical story/readiness, real PDF bytes, governed filename, audience, readiness, and `private, no-store` headers.
- Content stress: long narrative, long customer name, many workflows/milestones, USD/GBP, zero and missing economics.
- Security: the real anonymous Proposal PDF HTTP request returns 401.
- Output matrix: the actual Proposal PDF production response authority is exercised with the other 24 active output owners.

## Supplied developer certification

The supplied package reports that PostgreSQL 16.14 was started as a disposable local test database, all 42 migrations applied, and all 23 registered PostgreSQL/HTTP integration tests passed with 0 failures, 0 skips, and 0 NOT TESTED. No production database or production credential was used.

The deployment integration independently reran the corrected candidate without a local database. Its checked-in machine evidence therefore records PostgreSQL as NOT TESTED. The exact Git commit must pass the GitHub Actions PostgreSQL 16 gate before `main` is advanced.

## Independent candidate results

- Full suite: 638 passed, 0 failed, 2 database-dependent skips.
- v6.9.33 Proposal PDF corrective suite: 35 passed, 0 failed, 0 skipped.
- Preserved v6.9.30-v6.9.32 suites: 181 passed, 0 failed, 0 skipped.
- Production locks: 289 passed, 0 failed, 0 skipped.
- Route/PostgreSQL integration: NOT TESTED locally; mandatory in GitHub Actions.
- Brand tests: 19 passed, 0 failed, 0 skipped.
- Active output runtime matrix: 26 passed and all 25 active output IDs executed successfully.
- Lineage, output-path audit, generated brand assets, and generated application knowledge: PASS.

## Browser and document verification

The production browser adapter was exercised against the v6.9.33 server and disposable PostgreSQL database. The Draft Only readiness dialog remained open for 31 seconds, beyond the previous failure point, and then completed one authenticated PDF request. The UI reported `PDF document created`; the browser console recorded one `proposal_pdf.client_started` and one `proposal_pdf.client_completed`. Cancel restored the export button, and a rapid double activation produced one readiness dialog and one export control.

The generated Internal Draft PDF was rendered to an image and visually inspected. It is a valid one-page PDF with both internal classification lines above the header rule, no overlap or clipping, the governed customer/economic content, and the Internal Use Only footer.

## Preserved authorities

ROI Model v2.8, evidence and provenance, BuyCycle, Solution Fit, Customer Business Case, Proposal facts, Brand System, native currency, and every non-Proposal output remain governed by their existing production owners.


> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
