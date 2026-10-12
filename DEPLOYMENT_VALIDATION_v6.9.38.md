# Deployment Validation — v6.9.38

## Before deployment

1. Confirm the delivered ZIP SHA-256 against the handoff report.
2. Preserve the current Render environment and take a restorable PostgreSQL backup.
3. Run the GitHub CI workflow or `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` against a clean disposable PostgreSQL database, never production customer data.
4. Retain the PostgreSQL, output-runtime, and release-gate JSON artifacts.
5. Confirm that no migration is pending; v6.9.38 adds no schema change.

## Immediately after deployment

1. Verify `/health`, the login page, and Version History report `6.9.38`.
2. Sign in as an authorized Rep and open a saved current-model scenario. Open **ROI Assumptions & Results** on a desktop viewport and confirm it appears as a centred, readable overlay rather than an inline oversized report.
3. Confirm the report closes normally, remains scrollable, and still adapts on a phone-width viewport.
4. Open the preserved legacy scenario that previously displayed non-zero Workforce Productivity or Recovered Contribution Margin with no inputs.
5. Confirm the report identifies the saved legacy model, displays the contributing inputs and matching method, and reconciles every displayed driver exactly to the authoritative annual benefit.
6. Confirm legacy throughput appears when the saved engine result contains a non-zero `throughputSav` value.
7. Confirm the legacy service row does not claim the v2.8 contribution-margin method.
8. Repeat Web and PDF output checks with USD and GBP, explicit zero, null investment, and long content.
9. Confirm a new/current v2.8 scenario still uses contribution margin and alternative overlap handling exactly as before.
10. Change a calculator input without saving and confirm Web/PDF remain blocked until the scenario is saved.

## Regression checks

- Authentication, customer switching, Calculator save/versioning, Prospect submission/review/apply, Value History, Executive outputs, Proposal, JPP, Stakeholder Map, Solution Fit, Competitive Intelligence, Sales Manager, AI/Christie, role authorization, and all active export formats.

## Failure rule

Stop rollout for any economic mismatch, missing active driver, incorrect saved-model label, v2.8 behavior change, null-to-zero conversion, currency mismatch, dirty-state export, audience-classification error, unauthorized access, corrupt output, or PostgreSQL failure.

## Validation status

This deployed checklist is **PENDING**. It was not executed against Render during the local corrective build.
