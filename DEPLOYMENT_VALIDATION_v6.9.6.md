# Deployment Validation — v6.9.6

Status: NOT TESTED on Render/PostgreSQL. Complete after deploying this exact committed archive.

1. Confirm `/health` reports 6.9.6 and migration 037 succeeds once and remains idempotent on restart.
2. Run `npm ci --omit=dev --no-audit --no-fund`, `npm test`, `npm run test:production-locks`, `npm run test:routes`, and `npm run test:brand` under Node 22.
3. As a Rep, enter and save a new ROI value; verify Rep Estimate. Open Value Source & History, choose Rep Confirmed, enter an optional note, and confirm. Verify actor/date/note, save/reload persistence, and unchanged ROI.
4. Change the confirmed value. Verify immediate downgrade and the message that reconfirmation is required. Save/reload, verify the new value remains unconfirmed, then reconfirm and verify a second immutable history event while the first remains.
5. Attempt forged/missing/wrong-field/wrong-opportunity/wrong-value event IDs through the API; verify the server downgrades provenance without blocking ROI calculation.
6. Confirm a Rep Confirmed-only $500K driver can receive full Model Confidence but contributes $0 Customer-Supported Annual Value and does not elevate ROI Maturity.
7. Confirm Prospect Verified and Customer Revalidated continue independently and only immutable submitted Prospect evidence can support customer narrative facts.
8. Re-run the SE/Admin/Rep/Sales Leader cross-account Solution Fit matrix, including proof that SE access does not permit unrelated scenario access.
9. Generate and visually inspect customer PDF, Word, PowerPoint, email, public link, Customer Business Case, and internal governed outputs. Verify readiness, classification footers, native currency, no false attachment/next-step claims, no delay arithmetic, and no 70/100/130 scaling.
10. Block the Executive source service and confirm customer outputs fail closed with no legacy renderer.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

Product Owner assigns the final release classification after these checks.
