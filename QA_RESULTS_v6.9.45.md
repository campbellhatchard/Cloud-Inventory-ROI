# QA Results — Cloud Inventory ROI v6.9.45

Date: 2026-10-23

## Outcome

All executable local non-database/non-R2 gates passed. The build is not fully certified because this workspace had no disposable PostgreSQL connection, no real R2 staging credentials, and no deployed authenticated browser session.

| Gate | Passed | Failed | Skipped / NOT TESTED | Result |
|---|---:|---:|---:|---|
| Clean production dependency install | — | 0 | 0 | PASS |
| Full application suite | 703 | 0 | 3 skipped | PASS |
| v6.9.45 focused + inherited suite | 181 | 0 | 0 | PASS |
| Production regression locks | 365 | 0 | 0 | PASS |
| Brand System | 19 | 0 | 0 | PASS |
| Active output runtime matrix | 30 tests / 29 active outputs | 0 | 0 | PASS |
| PostgreSQL migration + integration | 0 | 0 | 12 NOT TESTED | NOT TESTED |
| Real R2 lifecycle/package suites | 0 | 0 | 2 NOT TESTED | NOT TESTED |
| Standalone route gate | 0 | 0 | 1 NOT TESTED | NOT TESTED |
| Deployed authenticated browser | 0 | 0 | 1 NOT TESTED | NOT TESTED |

## Turnover package coverage

- Active-only filtering; pending, failed, removed, cross-customer, cross-fit, and unknown contexts are rejected.
- General, application/process, gap, and stable integration grouping; same-name MEP/CIP processes remain separate.
- RFC 4180 CSV escaping, exact attachment IDs, captions, filenames, type, size, uploader, timestamp, and package status.
- Valid ZIP with real Word output, manifest, binary-preserving evidence, traversal-safe paths, and duplicate-name collision handling.
- Zero-evidence success, missing-object failure, Word failure, ZIP-stream failure, cleanup, and UI busy-state recovery.
- Current Primary SE and Account Executive come from current server authority; original uploader remains unchanged.
- 25-file package test: 1,638,400 source bytes, 1,653,463 ZIP bytes, 69 ms generation, approximately 268 KB measured heap delta in that run. No SLA is inferred from this local fixture.

## Document visual QA

The generated six-page DOCX was opened through installed Microsoft Word, converted to PDF, rendered to page images, and every page was visually inspected. Branding, internal classification, evidence grouping, previews, captions, long paths, page breaks, and wrapping passed; no clipping, overlap, or unexpected blank page was found. The bundled LibreOffice-based renderer was unavailable, so Microsoft Word was the documented fallback.

## Environment

- Local execution: Node v24.19.0, npm 10.9.0, Windows x64.
- Supported CI/Render runtime remains Node 22. The local clean install emitted the expected engine warning because this desktop bundle uses Node 24.
- No database URL, R2 credential, storage secret, presigned URL, QA password, or customer evidence was written into release artifacts.

RED — Release blocker remains
