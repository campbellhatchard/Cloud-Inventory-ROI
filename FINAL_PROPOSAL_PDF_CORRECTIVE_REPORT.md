# Proposal PDF Corrective Report — v6.9.33

## 1. Executive Summary

The Proposal PDF timeout was reproduced and traced to the browser orchestration layer. The PDF request was not slow: it had not started. v6.9.32 armed a 30-second generation deadline before Proposal save, readiness evaluation, and the user's governed Internal Draft decision. A user who reviewed the readiness information for more than 30 seconds received a timeout before any HTTP request existed.

v6.9.33 separates export into an unbounded human preflight phase and a bounded file-request phase. The timeout value was not increased. The exact original sequence now completes after a deliberate 31-second decision delay, and a repeat export also completes.

## 2. Authoritative Baseline

- Parent archive: `cloud-inventory-roi-v6.9.32-render-ready.zip`
- Parent SHA-256: `b22f9196ba9a1ed9eb94d53aa91d8325ed26f370e8de6d453a4015a74646fc6e`
- Parent source/deployed commit: `7e5a076471695da9034c8c9ea5c40fdef4e446b9`
- Baseline application and `APP_VERSION`: 6.9.32
- Corrective version: 6.9.33
- ROI Model v2.8 / modelVersion 28: unchanged

## 3. Original Reproduction

The failing production flow was reproduced as Proposal → Download PDF → Export Internal Draft. A controlled run of the actual browser adapter held the readiness choice past the existing deadline and recorded:

- `requestSent: false`
- `fetchCalls: 0`
- `failureMessage: Proposal PDF generation timed out...`
- the export button restored after failure

This proved the first failure happened before the PDF endpoint, builder, response, Blob, or browser download.

## 4. Browser Evidence

After correction, the actual v6.9.33 browser UI was exercised against the local production server and disposable PostgreSQL database:

1. Signed in as an authorized admin role.
2. Loaded a saved scenario.
3. Opened Executive Outputs and the saved Proposal.
4. Verified the Internal Draft preview and governed facts.
5. Selected Download PDF.
6. Left the Draft Only decision open for 31 seconds.
7. Selected Export Internal Draft.
8. Observed `PDF document created`.
9. Repeated the export and observed a second successful completion.
10. Cancelled a separate attempt and confirmed the Download PDF control recovered.
11. Rapidly double-activated the control and observed one Draft Only dialog and one Export Internal Draft control.

## 5. Network Evidence

Before correction, the failing slow-decision reproduction recorded zero fetch calls. After correction, browser console timestamps recorded:

- first PDF request started: `2026-10-06T16:40:34.953Z`
- first PDF request completed: `2026-10-06T16:40:35.490Z`
- repeat PDF request started: `2026-10-06T16:46:16.463Z`
- repeat PDF request completed: `2026-10-06T16:46:17.758Z`

There was no request timeout, abort, 4xx, or 5xx in the corrected browser flow.

## 6. Server Evidence

The authenticated production route returned the real Proposal PDF response authority. Tests validated a non-empty `%PDF-` response, governed headers, `private, no-store`, audience, readiness, and filename. The same route rejected an anonymous HTTP request with 401. The real builder completed quickly; no asset request, temporary file, remote font, or Render-compatible filesystem dependency was involved.

## 7. Current Export Architecture

`proposalPrint()` → single-flight `proposalFileExport('pdf')` → save/readiness/user decision preflight → request-only deadline → authenticated `POST /api/export/proposal-pdf` → `prepareProposalExport()` → canonical `loadExecutiveSource()` → `buildExecutiveValueStory()` → readiness/output resolution → `buildProposalPdfResponse()` → `buildProposalPdf()` → governed headers and bytes → browser Blob download.

## 8. Word vs PDF Comparison

Word and PDF share Proposal save, canonical source loading, readiness, Internal Draft decision, request construction, and browser Blob download. They diverge only at their registered server document builders and file media types. Word appeared healthy because users often made the decision before the incorrectly shared deadline expired; it had the same orchestration weakness. Word's document builder was not rewritten. Its corrected browser regression recorded one start, one completion, and `Word document created`.

## 9. Other PDF Path Comparison

Executive PDF already performed readiness preflight before its bounded file operation. Proposal now follows that proven phase boundary while retaining its own authoritative Proposal builder. The active output matrix executed the real Executive, JPP, Solution Fit, Stakeholder, Competitive, ROI Methodology, and Impact Map PDF owners; no substitute generator was used for Proposal certification.

## 10. Verified Root Cause

Classification: browser client timeout/orchestration race.

The 30-second `withExecutiveExportDeadline()` wrapped save, readiness loading, and human decision as well as the file request. A normal human review pause consumed a file-generation deadline even though file generation had not begun. The PDF builder, server route, database, assets, response buffering, and hosting proxy were downstream of the first broken boundary.

## 11. Why Existing Automated Tests Missed It

Existing PDF tests proved that the builder produced valid bytes from deterministic data. They did not execute the actual browser handler with a delayed readiness choice, so they could not observe a deadline expiring before fetch. v6.9.33 adds that production-adapter boundary, route response authority, authentication, single-flight, recovery, and content stress coverage.

## 12. Alternative Solutions Considered

- **Selected — two-phase preflight plus bounded request:** smallest appropriate blast radius, correct timing semantics, aligns with an existing working export pattern, and retains synchronous download behavior.
- **Generic shared export state machine:** potentially reusable but would change every output and increase regression risk in a correction-only release.
- **Asynchronous server job and polling:** appropriate for genuinely long generation, but unnecessary because the request had not started and real generation is fast.

## 13. Selected Architecture/Fix

Save, readiness evaluation, and the user's Ready/Review/Draft choice now complete before the request deadline is armed. Only the authenticated request, response, and Blob processing are bounded by the unchanged 30-second limit. One shared in-flight promise prevents duplicate work. Failure always restores the control and exposes a retry action.

## 14. Files/Components Changed

Production logic changed only in the Proposal export orchestration, Proposal PDF response authority, a test seam for canonical Proposal preparation, and a two-line Internal Draft header placement correction in the shared text-PDF renderer. Version, lineage, release evidence, tests, and release documentation were updated for v6.9.33.

## 15. Legacy Code Retired

The monolithic Proposal file-export function that combined human preflight and network generation under one deadline was replaced. No alternate Proposal fact loader, browser-calculated economics, or legacy PDF generator was introduced.

## 16. Focused Automated Tests

The v6.9.33 focused gate passed 35 tests with 0 failures and 0 skips. It covers delayed decision timing, single-flight behavior, request-timeout recovery, real PDF response bytes/headers, Internal Draft classification, long content, USD/GBP, null/zero semantics, route wiring, and HTTP authentication.

## 17. Interactive Browser Certification

The original slow-decision PDF path and a repeat PDF path completed. Cancel/retry recovered, double activation remained single-flight, and Proposal Word still completed. The UI remained usable and did not retain a spinner or show false failure.

## 18. PDF Visual QA

The real production Proposal PDF builder output was opened by rendering it to a page image. The valid one-page PDF showed Cloud Inventory branding, customer/title, economic case, Three Whys, scope, next steps, modeled investment, page number, and Internal Use Only footer. Both red Internal Draft classification lines are above the cyan header rule with no clipping, overlap, blank page, broken margin, or malformed text.

## 19. Data Reconciliation

Preview, Word, and PDF continue to consume the same saved Proposal plus canonical Executive Value Story. The test fixture reconciled customer, scenario/story revision, Three Whys, investment, benefit, ROI, payback, currency, value drivers, and next steps. Internal commercial notes remained excluded from document facts.

## 20. Authorization Regression

The route still uses canonical `requireAuth`; no role or capability middleware changed. The real anonymous HTTP request was rejected with 401. Authorized preparation still resolves the scenario through the existing canonical source and access controls.

## 21. Other Proposal Regression

Proposal Preview, Proposal Word, Ready/Review/Draft classification, saved-state flush, optimistic revision metadata, internal/customer filenames, fact locking, and customer-safe commercial text remained unchanged or were explicitly retested.

## 22. Other PDF Regression

All 25 active Output Registry IDs executed their real registered production implementation. The runtime matrix passed 26 tests with 0 failures, including representative Executive, JPP, Solution Fit, Stakeholder, Competitive, Methodology, and Impact Map files.

## 23. Previous-Fix Regression

The preserved v6.9.30-v6.9.32 suites passed 181 tests with 0 failures and 0 skips, covering Prospect Evidence/value application, Sales Manager duplicate opportunity handling, Competitive Product identity/search behavior, UI regression, authorization, and ROI v2.8.

## 24. PostgreSQL Results

PostgreSQL 16.14 ran in a disposable non-production database. All 42 migrations applied. The five registered suites passed 23 tests with 0 failed, 0 skipped, and 0 NOT TESTED. No production database or production credential was used.

## 25. Full Regression Results

- Full suite: 625 passed, 0 failed, 0 skipped.
- Focused v6.9.33: 35 passed, 0 failed, 0 skipped.
- Preserved v6.9.30-v6.9.32: 181 passed, 0 failed, 0 skipped.
- Production locks: 262 passed, 0 failed, 0 skipped.
- Routes: 12 passed, 0 failed, 0 skipped.
- Brand: 19 passed, 0 failed, 0 skipped.
- Output runtime: 26 passed; all 25 active output IDs executed and passed.
- PostgreSQL: 23 passed, 0 failed, 0 skipped, 0 NOT TESTED.
- Lineage, output-path audit, generated brand assets, and generated application knowledge: PASS.

## 26. Browser Runtime Findings

No corrected-flow JavaScript exception, promise rejection, authentication error, HTTP error, request abort, or indefinite loading state was observed. The in-app browser did not expose its Blob-triggered file as a Playwright download event, but the application recorded two completed Blob downloads and the same production route/builder bytes were independently validated and visually opened.

## 27. Remaining Known Issues

No source-level Proposal PDF blocker remains in local certification. Live Render still runs the previously deployed version until v6.9.33 is deployed. The slow-decision workflow, `/health` version, filename, and downloaded PDF classification must be verified once on Render before the Product Owner makes the final production decision.

## 28. Release Recommendation

**ORIGINAL CONDITION:** Proposal → Export Internal Draft → PDF timed out after the readiness dialog remained open.

**EXPECTED:** Human review time does not consume the file-generation deadline; after confirmation one governed Internal Draft PDF is created.

**BEFORE:** The 30-second deadline started before save/readiness/user decision, and the controlled failure recorded zero fetch calls.

**ROOT CAUSE:** The browser used a file-generation timeout to govern a human preflight step.

**CORRECTION:** Two-phase orchestration with unbounded preflight, unchanged request-only deadline, and single-flight protection.

**AFTER:** A 31-second decision delay followed by Export Internal Draft produced `PDF document created`; a second export also completed.

**VERIFICATION EVIDENCE:** Browser console, real HTTP authorization test, production PDF response test, rendered PDF visual inspection, 25-output runtime matrix, disposable PostgreSQL integration, and the complete regression gate.

YELLOW — Pilot-ready with known non-blocking issue
