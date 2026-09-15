# v6.8.5 regression results

This file records evidence from the validated Git state. `NOT TESTED` means the check requires deployed authentication, PostgreSQL, a real browser session, or production infrastructure that was not available locally.

| Area | Status | Evidence / limitation |
|---|---|---|
| Corrected v6.8.4 baseline | PASS | Git baseline tag and clean baseline commit created from `cloud-inventory-roi-v6.8.4-render-ready-corrected.zip`. |
| Version / syntax / production locks | PASS | v6.8.5 aligned; JavaScript syntax checks passed; production auth/output locks passed. |
| Canonical ROI and 12–60 month terms | PASS | ROI engine 34/34; report assertions passed for 12, 24, 36, 48, and 60 months. |
| Report-data consistency | PASS | PDF, PPTX, and DOCX consume `buildCustomerROIReportData`; generated values match the canonical contract-year rows. |
| PDF signature, parse, render, layout | PASS | Valid `%PDF-1.4`; five pages rendered with Poppler and visually inspected. Approved logo, vector chart, tables, margins, footers, and page numbers are visible without clipping. |
| PPTX ZIP/open, editable chart, layout | PASS | Valid OOXML; six slides rendered and visually inspected; native editable chart present; automated slide overflow test passed. |
| DOCX ZIP/open, styles, chart table, layout | PASS / NOT VISUALLY RENDERED | Valid OOXML with defined styles, approved logo, headers/footer, financial tables, and chart table. The local QA runtime had no LibreOffice/Word renderer, so final page-by-page visual inspection remains post-deploy/manual. |
| Customer loading recovery states | PASS / LIVE NOT TESTED | Lightweight authenticated relative API path, credentials, timeout, empty/error/retry states and route locks pass. Live PostgreSQL-backed sign-in/customer loading remains post-deploy. |
| Customer switching / object authorization | PASS / LIVE NOT TESTED | Automated customer-switcher, scenario-access, revoked-access, and cross-customer isolation locks pass. Live multi-role switching remains post-deploy. |
| Executive View responsive layout | PASS / AUTHENTICATED DATA NOT TESTED | Responsive CSS and chart tests pass; login page was browser-tested with no console errors. Authenticated Executive View at production data breakpoints remains post-deploy. |
| Roles, workflow, Solution Fit, plans, stakeholders, manager dashboard | PASS / LIVE NOT TESTED | Complete automated suite passed; live role sessions require deployed PostgreSQL data. |
| Render start and health endpoint | PASS / LIVE RENDER NOT TESTED | Local process started as v6.8.5 and `/health` returned HTTP 200. `render.yaml` retains Node 22, `npm ci`, start, PostgreSQL, and health settings. |

## Automated summary

- ROI engine: 34 passed, 0 failed.
- Main Node test suite: 380 tests; 377 passed, 0 failed, 3 PostgreSQL-dependent tests skipped because `DATABASE_URL` was not set.
- Release-specific v6.8.5 tests: 6 passed, 0 failed.
- Route and production-lock gates: passed.
- JavaScript syntax validation: passed.

## Release decision

**READY WITH KNOWN LIMITATIONS** — code, calculations, generated file structures, PDF rendering, PowerPoint rendering, and local startup are validated. Live Render deployment, PostgreSQL-backed authentication/customer persistence, real-role sessions, and final Word page rendering must be completed using the post-deploy checklist before broad production rollout.
