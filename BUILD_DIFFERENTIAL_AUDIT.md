# v6.9.33 Differential Audit

v6.9.33 is a focused Proposal PDF export reliability correction built only from the exact v6.9.32 Render-ready archive, SHA-256 `b22f9196ba9a1ed9eb94d53aa91d8325ed26f370e8de6d453a4015a74646fc6e`.

## Reproduced failure and root cause

The production adapter was executed with the governed Internal Draft decision deliberately held beyond the client deadline. The operation timed out with zero HTTP requests and zero downloads. The failure therefore occurred before Express, Proposal preparation, PDF generation, or Render response delivery.

`proposalFileExport()` incorrectly wrapped Proposal save, readiness loading, and the human Ready/Review/Draft decision inside the same 30-second deadline intended for the file request. Word shared the defect but often appeared healthy because its decision completed quickly. Increasing the timeout would only hide the orchestration error.

## Corrective architecture

- Phase 1 performs save, validates the selected scenario, loads governed readiness, and waits for the user decision without a file-generation deadline.
- Phase 2 starts the unchanged 30-second deadline only when the authenticated file request begins.
- A single-flight guard prevents repeat clicks from creating duplicate readiness prompts, requests, or downloads.
- `buildProposalPdfResponse()` is the production response authority for the real PDF bytes and the governed filename, audience, readiness, cache, and content-type headers.
- The route remains protected by `requireAuth`; Proposal preparation still uses the canonical Executive source and readiness authority.

## Alternatives evaluated

1. **Selected — two-phase Proposal orchestration.** Smallest blast radius and matches the already-proven Executive export pattern.
2. **Generic export state-machine rewrite.** Potentially reusable but would touch every export and create unnecessary regression risk in a corrective build.
3. **Asynchronous server job/polling.** Appropriate for genuinely long server generation, but evidence proved the request was never sent and the real PDF builder is fast.

## Preserved behavior

ROI Model v2.8, facts, readiness rules, Internal Draft classification, Brand System, native currency, authorization, Word output, all non-Proposal outputs, and customer-safe commercial-note exclusion are unchanged.

## Permanent evidence

`test/v6933-proposal-pdf-timeout-correction.test.js` executes the production browser adapter, production preparation service, production PDF response authority, actual PDF generator, and real anonymous HTTP boundary. It covers delayed Internal Draft choice, rapid repeat clicks, timeout recovery, long content, null/zero semantics, USD/GBP, headers, filenames, classification, and authorization.

## Deployment-integration corrections

- Reconciled the parent commit to the exact v6.9.32 GitHub/Render deployment while retaining the supplied developer source snapshot separately.
- Preserved all historical release evidence rather than replacing it with regenerated or shortened copies.
- Preserved the cumulative v6.9.31 and v6.9.32 regression wiring and added the v6.9.33 suite as a separate mandatory release gate.
- Restored the required SE Solution Fit scope statement across all current controlled reports.


> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
