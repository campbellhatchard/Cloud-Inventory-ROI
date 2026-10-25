# v6.9.46 Deployment Validation

## Before deployment

1. Verify the ZIP SHA-256 against the handoff report.
2. Deploy the committed Git archive without adding `node_modules`, `.env`, credentials, or prior release folders.
3. Use Node 22 and run `npm ci --omit=dev --no-audit --no-fund` in the deployment environment.
4. Confirm all configured migrations complete against the intended environment database.

## Deployment identity

- `/health` reports application version `6.9.46`.
- Login and Version History show `6.9.46`.
- Served `public/discovery.js`, `public/solution-fit.js`, and `public/solution-fit-evidence.js` are from the new release; hard-refresh once to eliminate stale browser assets.

## Complete authenticated browser flow

1. Sign in with a non-production mixed-role QA account.
2. Create or open a QA customer and save a new ROI scenario.
3. Enable Field Inventory and verify Discovery/Impact Map question identities and counts.
4. Create a Prospect link, submit the public questionnaire, then review and individually apply customer values.
5. Verify no automatic Calculator overwrite and confirm Value History provenance.
6. Create/open a multi-product Solution Fit and select MEP / JDE Standard Package.
7. Confirm 15 standard applications, zero package rows in customer-specific applications, and a 15-item readiness denominator.
8. Add two real customer-specific applications; confirm 17 total and 2 customer-specific after save/reload.
9. Assess applications, add a gap, and confirm the label is `MEP · JDE · Inventory Transfer` or an equivalent non-duplicated structured label.
10. Upload three evidence files with one induced failure. Confirm successful files leave the queue, saved count becomes 2, failed file remains retryable, and repeated/double completion creates no duplicate.
11. Refresh and sign out/in; confirm ACTIVE evidence persists. Remove one file and confirm counts/PS Turnover exclude it.
12. Save Solution Fit and generate/open PS Turnover DOCX and ZIP.
13. Enter three distinctive Three Why values and save.
14. Generate Executive Web/PDF/DOCX/PPTX and Proposal Preview/PDF/DOCX; confirm exact semantic parity and correct Draft/Internal classification.
15. Open Saved Scenarios and Compare for a representative imported legacy scenario and a current scenario; confirm term, benefit, investment, net benefit, ROI, NPV, and payback agree, while missing values remain unestablished.
16. Smoke-test Buyer Evidence, Stakeholders, JPP save-before-output, Sales Manager, Admin, Competitive Intelligence, Help, Deal Coach/AI fallback, and customer switching.
17. Confirm customer switching never leaves questions, evidence, applications, gaps, story, or metrics from the prior customer.
18. Download and open all customer/internal PDFs, DOCX, PPTX, ZIP, and CSV artifacts.

## Role matrix

Exercise Sales Rep only, Sales Leader only, Admin only, SE only, Rep+SE, and the mixed Admin/Rep/SE/Sales Leader role. Validate both allowed actions and denied cross-customer/Admin-only actions. Never place QA passwords in the release report.

## External certification

- Run `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` with a clean non-production PostgreSQL database.
- Run `npm run test:r2` with dedicated non-production private R2 credentials.
- Download and review all four CI evidence JSON files.

Any mismatch is a release blocker. Do not test automated database suites against production customer data.
