# Deployment Validation — Cloud Inventory ROI v6.9.45

Use a clean non-production PostgreSQL database and a QA-only private R2 prefix. Never run automated package tests against production customer data.

## Before deploy

1. Verify the release ZIP SHA-256 against the delivered value.
2. Confirm Render uses Node 22 and the normal `npm ci --omit=dev --no-audit --no-fund` build.
3. Confirm the existing PostgreSQL database is current through migration 045. v6.9.45 adds no migration.
4. Confirm the private R2 variables and existing CORS policy are present; do not expose credentials to the browser.

## Required external certification

1. Against a clean disposable PostgreSQL database, run migrations and `npm run test:postgres`. Require zero failed, zero skipped, and zero NOT TESTED.
2. With QA-only R2 credentials, run `npm run test:r2`. Require PUT/HEAD/GET/package stream/binary reconciliation/DELETE to pass and delete only test-prefixed objects.
3. Run `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` in CI with the disposable database.
4. Retain the generated PostgreSQL, R2, output-runtime, and release-gate JSON artifacts.

## Authenticated browser workflow

1. Sign in as authorized SE; open a QA customer and saved Solution Fit.
2. Confirm product/application scope, Demo Status, Fit, Customer Validation, gaps, integrations, readiness, and current Primary SE.
3. Add general, MEP application, CIP same-name application, gap, and integration evidence; include duplicate filenames and JPEG/PNG/PDF/DOCX/XLSX/PPTX where supported.
4. Remove one attachment and leave one upload incomplete. Save the Solution Fit.
5. Open Readiness and confirm the package summary/count/size and incomplete-upload warning.
6. Download `PS Turnover Document`; open all pages and verify internal classification, current Primary SE, captions, selected images, references, and no removed evidence.
7. Download `PS Turnover Package`; inspect `PS-Turnover.docx`, `Attachment-Manifest.csv`, and every Evidence folder/file.
8. Reconcile every manifest row to the active Solution Fit evidence UI. Verify same-name MEP/CIP separation, duplicate filenames, intact Office/PDF/image bytes, removed exclusion, and no cross-customer data.
9. Repeat read/download as permitted for Rep, Sales Leader, Admin, and a multi-role user. Direct requests by an unrelated user must return 403 without metadata or bytes.
10. Change Primary SE and Customer ownership; regenerate. Current assignments must update while historical uploader attribution remains unchanged.
11. Create unsaved changes and confirm output is blocked until save. Simulate missing storage object/service failure and confirm no corrupt ZIP is offered and the action recovers.

## Application smoke

Retest authentication, customer create/reassignment, Admin Cleanup, ROI Calculator, scenario save/version, Prospect workflow, Three Whys, Sales Manager, JPP, Proposal, Executive outputs, Competitive, ROI Assumptions & Results, AI/Christie, and Solution Fit upload/download/remove/customer switching.

Do not assign GREEN until every external item above has machine or browser evidence.
