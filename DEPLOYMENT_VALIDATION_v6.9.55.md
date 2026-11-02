# Cloud Inventory ROI v6.9.55 Deployment Validation

## Package deployment

1. Back up the existing Render PostgreSQL database and confirm rollback access.
2. Deploy the exact `cloud-inventory-roi-v6.9.55-render-ready.zip` contents through the existing GitHub/Render workflow.
3. Preserve existing production environment values; do not copy disposable test credentials.
4. Confirm Render uses supported Node 22 and installs production dependencies.
5. Allow startup migration execution through `046_preserve_operational_transfer_timestamps.sql`.
6. Verify `/health` reports version `6.9.55` and a connected database.
7. Hard refresh once so the browser receives the v6.9.55 Buyer Evidence assets.

## Focused live acceptance

Using QA-only customer data:

1. Open Buyer Evidence for each proof type: Derived, Customer Evidence, and Hybrid.
2. Confirm Derived requirements show source facts/blockers and no evidence form.
3. Open Commercial scope agreed with no Proposal artifact. Enter valid customer-confirmed products/services/term/commercial evidence and save. Confirm the requirement completes.
4. Confirm a Proposal artifact without qualifying Commercial customer evidence remains incomplete.
5. Verify Amount, Timing, target date, and Commercial term fields appear only for governed criteria.
6. Confirm Save evidence / Update evidence do not alter the customer-confirmed checkbox automatically.
7. Use recent evidence; confirm it only prefills fields and requires explicit review/save.
8. Reopen completed evidence and confirm compact summary mode appears before Edit evidence.
9. For a Hybrid requirement, confirm customer evidence and the separate Solution Fit/Stakeholder prerequisite show independent status and exact blockers.
10. Use Next incomplete requirement; confirm the governed sales stage does not auto-advance.
11. Hard refresh and sign out/in; confirm evidence, blockers, percentages, and completion state persist.
12. Repeat appropriate read/edit checks for Sales Rep, Sales Leader, Rep+SE, and Admin without broadening existing authorization.

## Regression smoke

- Customer list/load/switch
- ROI Calculator and saved values
- Prospect Link submission and immutable evidence review
- Stakeholders and Buyer Evidence
- Solution Fit and PS Turnover
- JPP owner/read-only behavior and date-only outputs
- Executive Web/PDF/Word/PowerPoint
- Proposal Preview/PDF/Word
- Active customer/internal outputs and audience classification
- Admin Cleanup preview/execute protection using QA-only records

## External services

- Validate private R2 PUT/HEAD/GET/DELETE and PS Turnover package streaming only with approved non-production credentials/prefix. This build recorded R2 as NOT TESTED.
- Validate SendGrid welcome/reset/Prospect/purge flows without exposing keys.

Stop deployment for any ROI difference, authorization broadening, cross-customer evidence leak, hidden prerequisite, stale-preview acceptance, corrupt output, migration failure, or customer/internal audience error. Final production classification belongs to the Product Owner.

