# Cloud Inventory ROI v6.9.47 Deployment Validation

This document is a required post-deployment checklist. It does not claim that deployment has occurred.

## 1. Package and runtime

- Deploy the reviewed `cloud-inventory-roi-v6.9.47-render-ready.zip` Git state.
- Confirm `/health` and the login page both report `6.9.47`.
- Confirm Render uses Node 22.x.
- Confirm migrations complete at level 045; no v6.9.47 migration is expected.
- Hard refresh the browser or use a clean session before certification.

## 2. Three Why corrective flow

1. Save populated Why Change, Why Now, and Why Cloud Inventory.
2. Hard refresh and confirm exact values.
3. Clear only Why Now, save, and hard refresh.
4. Confirm the editor remains blank/unestablished and siblings are exact.
5. Confirm Executive Web/PDF/DOCX/PPTX and Proposal Preview/PDF/DOCX show `To validate` only for Why Now.
6. Enter a replacement Why Now, save, refresh, and confirm all seven consumers use it.

## 3. Custom application corrective flow

1. Open an MEP/JDE Standard Package fit with 15 governed applications.
2. Open and cancel the custom-application modal; confirm nothing is created.
3. Confirm whitespace-only input is rejected inline.
4. Add `QA Custom Application One` and `QA Custom Application Two`.
5. Confirm 15 standard, 2 customer-specific, 17 unique total.
6. Assess the first custom application and save.
7. Refresh and confirm counts, stable identities, classification, and assessment remain.

## 4. Primary SE corrective flow

1. Assign SE-A through an already-authorized flow.
2. Open the same Solution Fit as authorized SE-B.
3. Confirm the customer selector, read-only Primary SE control, readiness, summary, and PS Turnover all show SE-A.
4. Confirm SE-B cannot reassign SE-A and gains no general cross-account ROI access.
5. Confirm a genuinely null assignment alone displays `Not Assigned`.

## 5. External certification

- Run `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` against a clean non-production PostgreSQL database.
- Run the real private R2 PUT/HEAD/GET/DELETE and PS Turnover ZIP tests with test-only credentials.
- Exercise Field Inventory OFF exact-ID parity, evidence removal/logout persistence, role matrix, cross-customer denial, six-metric legacy summary, and gap-label variants.

## Acceptance record

- Deployed version: __________
- Node version: __________
- PostgreSQL: PASS / FAIL
- R2: PASS / FAIL
- Corrective browser flow: PASS / FAIL
- Product Owner classification: GREEN / YELLOW / RED
