# v6.9.32 Deployment Validation

## Before deployment

- Deploy only `cloud-inventory-roi-v6.9.32-render-ready.zip` or the validated Git commit recorded with that package.
- Preserve the existing Render environment variables and PostgreSQL database.
- Do not run automated tests against the production database.

## After deployment

1. Confirm `/health` reports version `6.9.32`.
2. Sign in and select a customer with a completed immutable Prospect submission.
3. Open Discovery and record the pending Prospect evidence count.
4. Open Calculator and confirm the warning displays the identical count and wording.
5. Open **Review Prospect Evidence** and confirm that count matches rows offering **Use Prospect Value**.
6. Apply one value, verify the modal remains open, then confirm both warnings decrease by one after the authoritative review reload.
7. Reload and switch away/back to confirm the applied provenance and count persist.

Final deployment readiness remains a Product Owner decision.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
