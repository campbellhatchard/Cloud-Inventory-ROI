# Deployment Validation — v6.9.37

## Before deployment

1. Confirm the delivered ZIP SHA-256 against the handoff report.
2. Preserve the current Render environment and take a restorable PostgreSQL backup.
3. Run `REQUIRE_DATABASE_INTEGRATION=1 npm run release:gates` against a clean disposable PostgreSQL database, never the production database.
4. Retain the generated PostgreSQL, output-runtime, and release-gate JSON artifacts.
5. Confirm no migration is pending for this release; v6.9.37 adds no schema change.

## Immediately after deployment

1. Verify `/health`, login, and Version History report `6.9.37`.
2. Sign in as an authorized Rep and open a saved USD QA scenario.
3. Open **ROI Assumptions & Results** beside the Executive output controls.
4. Compare every summary value with Calculator, Executive Web/PDF, Proposal economics, Customer Business Case, and Customer Value Email for the same version.
5. Compare displayed inputs, sources, customer-support status, active drivers, driver benefits, and overlap notes with saved scenario/Value History authority.
6. Download and inspect the PDF; verify customer name, scenario/version, native currency, classification, layout, page numbers, and deterministic filename.
7. Repeat with a saved GBP scenario, a null investment/payback case, explicit zero, mixed provenance, and long content.
8. Change a calculator input without saving. Confirm Web/PDF are blocked with: “Save the current scenario before generating the ROI Assumptions & Results Summary.”
9. Exercise Ready, Review acknowledgement, and Draft/Internal Preview states. Confirm a Draft never appears customer-ready.
10. Test direct report/PDF endpoints as authorized owner, scoped Sales Leader/Admin/SE, and unauthorized user. Confirm no customer facts leak.

## Regression checks

- v6.9.35 Customer Ownership Reassignment: preview, transfer, immediate access change, historical actors/evidence/audit preservation.
- v6.9.36 Admin Cleanup: dates, Owner, Created By, selection, dependency preview, soft remove, restore, concurrency.
- Authentication, customer switcher, Calculator/save/versioning, Prospect Link/submission/notification/review/apply, Value History, Three Whys, Sales Manager, Solution Fit, JPP, Proposal, Executive outputs, Competitive Intelligence, Customer Proof, AI/Christie, and persistence.

## Failure rule

Stop rollout for any economic mismatch, provenance inflation, overlap mismatch, null-to-zero conversion, currency mismatch, dirty-state export, customer/internal classification error, unauthorized access, corrupt/clipped PDF, PostgreSQL failure, Build 1 regression, or Build 2 regression.

## Validation status

This deployment checklist is **PENDING**. It was not executed against Render during the local build. Product Owner approval is required after completion.
