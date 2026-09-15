# v6.9.0 Release Validation

## Baseline and scope

- Built on the exact committed v6.8.5 render-ready baseline (`v6.8.5-baseline`).
- Changes are limited to approved v6.9.0 Solution Fit creation, recovery, catalog, navigation, Help/Christie context, readiness, version, and regression-lock work.
- ROI Model 2.8 formulas, authoritative BuyCycle model, Brand System source, and Christie persona source have no code differences from the baseline.

## Root-cause correction

The prior Solution Fit experience collapsed multiple server outcomes into one terminal generic screen and could not distinguish a missing record from permission, removed-record, or server failures. Inconsistent active-record filtering also allowed a removed Solution Fit to remain visible to some downstream readers. The browser now maps each outcome to an explicit recoverable state, creation is an intentional authenticated action, and every active downstream reader excludes removed records.

The exact status of a specific production request could not be reconstructed without production HTTP logs and its database. The correction therefore does not claim an unobserved production status code; it fixes the confirmed application-state and active-record defects and adds permanent source-level locks.

## Automated results

- ROI calculation engine: **34 passed, 0 failed**.
- Full application suite: **377 passed, 0 failed, 3 skipped** out of 380.
- v6.9.0 release locks: **10 passed, 0 failed**.
- JavaScript syntax validation: passed for changed runtime files.
- Generated application-knowledge integrity: passed.
- Version consistency: package, login/runtime, and version history all report 6.9.0.
- Exact MEP catalog order and counts: passed with per-ERP SHA-256 locks.
- Protected-authority diff: ROI engine, BuyCycle source, Brand source, and Christie persona unchanged.

The three skipped tests require `DATABASE_URL`; no database was attached to this validation workspace. They are environment-blocked and are not reported as passes. Run the same suite against the Render-compatible PostgreSQL staging database before production promotion.

## Interactive browser validation

- Verified missing Solution Fit recovery and explicit creation.
- Verified Product → ERP → Applications flow using JDE.
- Verified selected application count and persisted scope summary.
- Verified new assessment rows and readiness presentation.
- Verified 390 × 844 responsive layout with no page-width overflow.
- Verified Escape closes the setup dialog.
- Browser console showed no errors or warnings during the validated flow.

## Catalog source note

The binary workbook `202608 Standard Apps by ERP.xlsx` was not present in the supplied workspace or attachments. The governed catalog was transcribed from the complete authoritative names and counts embedded in the approved v6.9.0 build request, then locked by ordered hashes and validation tests. If the workbook is later supplied, compare it byte-for-name/order against `config/mep-standard-apps.json` before changing the catalog version.

## Deployment

The release ZIP is created with `git archive` from the validated v6.9.0 commit. It excludes `.git`, `node_modules`, local environment files, macOS metadata, and unrelated historical packages. Render should use Node 22, install production dependencies from the lock file, apply the existing migrations, and start with `node server.js`.

