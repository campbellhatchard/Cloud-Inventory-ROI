# Deployment Validation — v6.9.36

## Before deployment

1. Confirm the package SHA-256 matches the delivery report.
2. Take a restorable PostgreSQL backup and verify rollback access.
3. Confirm required environment settings remain present; do not copy QA credentials into the package.
4. Run migration 044 through the normal Render deployment migration step.
5. Run `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` against a clean, disposable PostgreSQL database—not production.
6. Retain the generated PostgreSQL, output-runtime, and release-gate JSON artifacts.

## Immediately after deployment

1. Verify `/health` and the login/version display report `6.9.36`.
2. Sign in as an Admin and confirm Customer Ownership Reassignment still works.
3. Open Admin → Data Cleanup & Recovery.
4. Confirm filter options load without exposing tokens or secrets.
5. Preview QA-only records by Created, Updated, and Removed Date, including custom and quick ranges.
6. Verify invalid ranges are blocked and zero results disable removal.
7. Verify current Owner follows a v6.9.35 reassignment while Created By remains historical.
8. Exercise individual selection, Select All Current Results, Clear Selection, and filter-change selection clearing.
9. Review impact and typed confirmation, then soft-remove only deterministic QA records.
10. Verify Active/Recently Removed views, refresh persistence, and logout/login persistence.
11. Restore the QA records and verify IDs, current owner, creator/history, and protected evidence are unchanged.
12. In a second Admin session, alter a previewed row and confirm the first Admin's stale action fails closed.

## Authorization checks

- Admin and Admin multi-role: allowed.
- Rep-only, SE-only, and Sales Leader without Admin: direct preview/impact/execute/restore requests return 403.
- No role receives additional Customer, Scenario, Solution Fit, or evidence access.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Protected-data checks

After QA parent removal and restore, verify PostgreSQL still contains the same immutable Prospect submissions/answers, ROI Value History and Rep Confirmed events, Buyer Evidence/stage history, ROI snapshots, ownership-transfer events, and audit records. Confirm external share/Prospect links were not silently reactivated.

## Rollback

If migration, authorization, filter accuracy, preview identity, removal, or recovery fails, stop the rollout. Restore the previous application commit and database backup using the established Render rollback process. Do not manually delete cleanup rows or immutable evidence to force a retry.

## Validation status

This checklist is **PENDING**. It was not executed against a live Render environment during the local build. Product Owner approval is required after completion.
