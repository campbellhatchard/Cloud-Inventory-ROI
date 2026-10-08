# v6.9.35 Deployment Validation

## Before deployment

Deploy the validated v6.9.35 Git state/ZIP and preserve current Render environment variables. Allow normal startup migrations to apply migration 043. Do not run automated tests against production data.

## Admin acceptance test

1. Confirm `/health`, login, and Version History show 6.9.35.
2. As Admin, open Admin → Customers, choose a test Customer, and select **Transfer Ownership**.
3. Confirm only active Rep-capable users are selectable; the current owner is disabled.
4. Select a different Rep, enter a reason, preview impact, and review both preservation lists.
5. Confirm the transfer. Verify the success message, old/new owner names, timestamp, and audit reference.
6. Refresh and sign out/in. Confirm the new owner remains assigned.
7. Confirm the new Rep and their Sales Manager can access the Customer; confirm old owner-derived access is removed while explicit shared access remains.
8. Complete a governed Prospect submission and confirm the future owner-routed notification targets the new Rep.

## Preservation test

Verify scenario/version IDs, ROI values, Prospect submissions, Value History and Rep Confirmed actors, Buyer Evidence history, SE assignments, JPP and Stakeholder content, proposals, and already-published Customer Business Case links/content are unchanged.

## Failure test

Verify blank reason, same owner, inactive/non-Rep target, duplicate same-name Customer under the target, and a stale preview all fail without partial mutation. Review database/audit logs using non-sensitive identifiers only.

The Product Owner records the final deployment outcome.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
