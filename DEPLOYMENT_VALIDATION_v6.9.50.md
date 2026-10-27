# Deployment Validation — v6.9.50

## Identity

1. Deploy only the committed v6.9.50 archive.
2. Confirm `/health` and Version History show `6.9.50`.
3. Confirm startup uses supported Node 22 and migration level 045; this release adds no migration.

## Mandatory safe PostgreSQL certification

Run migrations and `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` against a disposable PostgreSQL 16 database. Require zero failed, zero skipped, and zero NOT TESTED database suites. Specifically verify the updated-at-only cleanup stale preview returns 409 with zero mutation, active attachment count is exactly two for the 2 ACTIVE + 1 PENDING fixture, and non-owner JPP mutation routes return 403.

## Corrective live checks

1. Admin Cleanup: preview a scenario, change only `updated_at`, and prove the old preview cannot execute.
2. Evidence: verify active list/count, PS Turnover, and cleanup dependency preview agree while pending/failed/removed evidence is excluded.
3. Executive Word: normal generation succeeds; an induced slow/failing request exits `Building Word…`, restores the button, shows retry, and one retry succeeds.
4. JPP: owner can edit; non-owner Rep, Sales Leader, Admin, Rep+SE, and read-only viewer see disabled mutation controls and cannot bypass them through direct requests.
5. Solution Fit: after each saved readiness-affecting edit, cross-customer selector and open record agree immediately.
6. Sensitivity: no selected authorized scenario shows `No Business Case` with no Base NPV or ranges; an authorized saved scenario works normally.
7. Stakeholder export: missing saved map shows warning/error and creates no file.
8. Ownership: Rep, Leader+Rep, and Rep+SE owners never receive the “another rep” label; genuine non-owners do.
9. Buyer Evidence: 6/6 criteria plus an incomplete maturity/commitment gate shows `Evidence criteria complete: 100%` and the separate incomplete gate; advancement remains blocked.
10. Run Executive narrative A/B/C clear/restore/sibling tests and the 15 standard + 2 custom Solution Fit reload test to prove inherited behavior.

## R2 and outputs

When safe non-production R2 credentials are available, run `npm run test:r2`. Re-run the 29-owner output matrix and sample Executive PDF/DOCX/PPTX, Proposal, JPP, Stakeholder, Solution Fit, PS Turnover, Methodology, Impact Map, and Role One-Pager downloads in the deployed environment.

## Decision boundary

Do not assign final production GREEN until the supported Node 22, disposable PostgreSQL, required R2/control-plane where applicable, Render identity/log, and authenticated role checks are complete.
