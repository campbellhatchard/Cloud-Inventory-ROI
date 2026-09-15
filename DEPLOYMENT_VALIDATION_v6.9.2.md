# Deployment validation — v6.9.2

## Render/GitHub deployment sequence

1. Deploy the validated v6.9.2 Git commit with Node 22.22.0 and existing production environment variables.
2. Confirm migration `036_solution_fit_cross_account.sql` is recorded once and existing customers default to `active`.
3. Sign in as an active SE with no owned customers. On Solution Fit, search Alpha (same team), Bravo (different team), and Charlie (zero scenarios) by customer and rep name.
4. Confirm all three appear. Open existing fits for Alpha/Bravo. Explicitly create Charlie; verify customer owner is unchanged, Primary SE is the creator, and no ROI scenario is created.
5. Sign in as another SE; edit Charlie and verify Primary SE does not change. Verify history/audit records actor, customer, owner, timestamps and changed fields.
6. As that SE, directly test unauthorized cross-account ROI scenario, Discovery, Buyer Evidence, Proposal, Executive output, Stakeholder, Joint Project Plan, financial and manager endpoints. They must remain denied unless another role grants access.
7. Verify Rep and Sales Manager behavior is unchanged; Admin retains cross-account Solution Fit access. Verify inactive/deleted customers do not appear and cannot be opened.
8. Exercise concurrent Create on one customer; one request succeeds and the other receives the governed conflict.
9. Re-run production smoke checks, customer-facing output checks, and rollback procedure.

## Rollback

Rollback application code to the prior validated v6.9.1 commit. Migration 036 is additive; retain the customer `status` column/index during rollback unless the database owner approves a separately tested schema rollback. Do not delete customer or Solution Fit data.

## Local limitation

No live Render service or configured PostgreSQL instance was available for this build. Deployment validation remains pending; this document is a checklist, not evidence of execution.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
