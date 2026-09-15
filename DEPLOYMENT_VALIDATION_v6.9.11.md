# Deployment Validation — v6.9.11

Run after deploying the committed package to Render:

1. Test sign-in, customer loading/switching, role boundaries, and SE cross-account Solution Fit.
2. Exercise Executive Web/PDF/Word/PowerPoint for Ready, Review, and Draft states; verify currency, null values, audience, and filenames.
3. Exercise Proposal Preview/PDF/Word; verify immutable Three Why parity, customer vs Internal Draft classification, and absence of internal commercial notes.
4. Verify JPP customer/internal PDF and PowerPoint saved-state enforcement.
5. Verify Solution Fit summary, risk ledger, and handoff save-before-output behavior.
6. Verify Stakeholder, Methodology, Competitive, Impact Map, Role One-Pager, Customer Business Case, Prospect preview, and customer email outputs.
7. Validate password reset, welcome, Prospect submission/update, and purge-confirmation email delivery.
8. Run the database-dependent suites with a safe production-equivalent `DATABASE_URL`.

Rollback uses the prior validated v6.9.10 Git release and compatible database configuration.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
