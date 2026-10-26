# Deployment Validation — v6.9.49

## Required controlled deployment checks

1. Confirm `/health` reports `6.9.49` and the deployed commit/archive identity.
2. Open an MEP Solution Fit with no ERP; verify the approved zero state.
3. Select JDE and confirm the header updates immediately after save.
4. Select JDE Standard Package; confirm header, body, and progress all show 15.
5. Add two customer-specific applications; confirm 16 then 17 without refresh.
6. Remove one custom application; confirm 16 immediately and after refresh.
7. Switch customers and confirm no prior-customer header remains.
8. Confirm Primary SE remains unchanged in a second authorized SE session.
9. Run the disposable PostgreSQL gate and require zero failed/skipped/NOT TESTED.
10. Run direct R2 evidence lifecycle/security checks where credentials are safely available.
11. Review Render build/startup logs and complete the seven-role interactive matrix.

## Local status

Corrective source behavior is ready for controlled deployment certification. PostgreSQL, R2, Render, and live role validation remain unexecuted infrastructure gates and must not be inferred from local source results.
