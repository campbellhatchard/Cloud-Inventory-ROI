# v6.9.30 Deployment Validation

After deployment, verify `/health` reports `6.9.30`, sign in with an authorized test user, select a current saved opportunity, and open Discovery.

1. Confirm an immutable Prospect submission appears in Review Prospect Evidence.
2. Apply a numeric value and confirm the modal remains open and marks that row Applied.
3. Reload the page and confirm the value, Prospect provenance, and ROI result remain unchanged.
4. Apply an identical submitted value and confirm provenance is still saved without a duplicate history record.
5. Confirm a historical, closed, or view-only scenario shows the evidence but offers no apply action.
6. Confirm submission notification state is `sent`, or remains safely retryable when SendGrid is unavailable.
7. Smoke-test customer switching, Calculator, Executive outputs, Proposal, JPP, Stakeholder Map, Solution Fit, Competitive outputs, Methodology, Impact Map, Role One-Pager, Customer Business Case, Prospect preview, and Customer Value Email.

Final production classification remains the Product Owner's decision after CI and live Render validation.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
