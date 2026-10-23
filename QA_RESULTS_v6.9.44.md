# QA Results — Cloud Inventory ROI v6.9.44

Date: 2026-10-23

## Outcome

All executable local non-database gates passed. No test failure remains. Certification is incomplete because this workspace has no disposable PostgreSQL URL, no Cloudflare R2 credentials, no authenticated deployed browser session, and no real mobile device/camera.

## Executed gates

| Gate | Passed | Failed | Skipped / NOT TESTED | Result |
|---|---:|---:|---:|---|
| Full application suite | 688 | 0 | 3 skipped | PASS |
| v6.9.44 focused + inherited Solution Fit suite | 138 | 0 | 0 | PASS |
| Production regression locks | 350 | 0 | 0 | PASS |
| Brand System | 19 | 0 | 0 | PASS |
| Active output runtime matrix | 29 tests / 28 output results | 0 | 0 | PASS |
| Attachment unit/security/image checks | 11 | 0 | 0 | PASS |
| Proposal HTTP authentication boundary rerun | 9 | 0 | 0 | PASS |
| Release lineage | 64 permanent protections | 0 | 0 | PASS |
| PostgreSQL migration + 11 integration suites | 0 | 0 | 11 NOT TESTED | NOT TESTED |
| Real R2 PUT/HEAD/GET/DELETE | 0 | 0 | 1 NOT TESTED | NOT TESTED |
| Authenticated desktop upload workflow | 0 | 0 | 1 NOT TESTED | NOT TESTED |
| Real mobile camera workflow | 0 | 0 | 1 NOT TESTED | NOT TESTED |

The release runner records route integration as NOT TESTED when `DATABASE_URL` is absent; a zero-test route command is never represented as a pass.

## Evidence-specific coverage

- Existing `handoff_attachments` schema reuse and migration preservation.
- Stable general/process/gap/integration contexts; display names and array positions rejected.
- Duplicate filenames produce independent attachment IDs and object keys.
- JPEG/PNG 5 MB and document 25 MB server limits; zero-byte, extension/MIME mismatch, executable, and oversized input rejection.
- Short-lived SigV4 URLs with no secret in client metadata.
- PENDING-to-ACTIVE only after object HEAD verification.
- Interrupted/mismatched uploads remain inactive and retry the same attachment identity.
- Multiple process/gap attachments, rename survival, removal isolation, uploader/remover attribution, ownership reassignment, and Admin Cleanup dependency coverage in the PostgreSQL suite.
- Large-photo optimization uses bounded passes, EXIF-stripping re-encode, orientation-aware decode, 4096-pixel ceiling, preserved aspect ratio, and output below the 4.65 MB target in automated mocks.
- Browser document MIME normalization covers browsers that omit DOCX/XLSX/PPTX MIME metadata.
- HEIC/HEIF is explicitly rejected with JPEG/PNG guidance; it is not claimed as supported.

## Environment

- Local runtime: Node v24.19.0 / pnpm 11.25.0.
- Supported/deployment runtime: Node 22 (`package.json`, `.node-version`, Render, and CI).
- Local production dependency install used pnpm because this desktop runtime has no npm executable. Render/CI continue to use the required `npm ci` command.
- No database or R2 secret was present or written to evidence.

## Required certification after deployment

## Deployment verification update — 2026-10-23

- Re-ran the complete local test suite and cumulative release gates on Windows with Node 22.22.0 and npm. Zero executable gate failures; all 28 output artifacts validated.
- New regression tests first reproduced the unsigned overwrite constraint, late customer response, stale reset, queued customer switch, cleanup failure handling, and withdrawn-file defect, then passed after targeted corrections.
- Local PostgreSQL and real R2 results remain explicitly NOT TESTED. Disposable PostgreSQL certification runs in GitHub Actions; real R2 is validated inside Render without exporting credentials.
- Historical environment and counts above describe the supplied package. Fresh machine evidence is in the current release result JSON files; authenticated desktop and real mobile checks require separate evidence.

## Remaining deployed workflow checks

Run migration 045 and `npm run test:postgres` against a clean non-production PostgreSQL database. Configure the private R2 bucket and CORS, run `npm run test:r2`, then complete the authenticated desktop and real mobile workflows in `DEPLOYMENT_VALIDATION_v6.9.44.md`.

RED — Release blocker remains
