# v6.9.33 Deployment Validation

## Before deployment

- Deploy only `cloud-inventory-roi-v6.9.33-render-ready.zip` or its validated Git commit.
- Preserve the existing Render environment variables and PostgreSQL database.
- Never run automated release tests against the production database.

## After deployment

1. Confirm `/health` reports version `6.9.33`.
2. Sign in with an authorized seller account and select a saved current scenario.
3. Open Executive View → Proposal and confirm readiness is **Draft Only**.
4. Select **Download PDF**, then **Export Internal Draft**. Deliberately leave the readiness dialog open for more than 30 seconds before confirming.
5. Confirm the browser starts **Building PDF…** only after confirmation and downloads exactly one non-empty PDF.
6. Confirm the filename includes `Internal-Draft-Proposal`, the document includes `CONFIDENTIAL — INTERNAL USE ONLY` and `DRAFT — NOT READY FOR CUSTOMER SHARING`, and it omits the customer confidentiality footer and internal commercial notes.
7. Repeat with a Ready/Review fixture and confirm customer classification, native currency, customer name, facts, and readiness match Proposal Word.
8. Double-click the export control and confirm only one request/download occurs.
9. Confirm an unauthenticated direct request to `/api/export/proposal-pdf` remains rejected.

Record browser console/network evidence and visually inspect the downloaded PDF. Final deployment classification belongs to the Product Owner.


> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
