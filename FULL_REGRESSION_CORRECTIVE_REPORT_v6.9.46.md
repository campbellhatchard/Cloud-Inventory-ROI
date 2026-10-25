# Cloud Inventory ROI v6.9.46 — Full Regression Corrective Report

## 1. Executive Summary

This differential build corrects all six reproducible defect categories found in the October 24, 2026 v6.9.45 live regression. The corrections unify governed sources rather than patching individual screens. All executable local suites pass; live PostgreSQL, R2, and post-deployment browser certification remain NOT TESTED.

## 2. Authoritative Baseline

- Archive: `cloud-inventory-roi-v6.9.45-render-ready(1).zip`
- SHA-256: `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`
- Untouched imported baseline commit: `6adf41b`
- Target: `6.9.46`

## 3. Regression Report Used

The build used `LIVE_REGRESSION_v6.9.45_2026-10-24.md`, supplied outside the parent archive, which recorded 70 passed checkpoints, six failed categories, one degraded AI event, and three unavailable isolated-role browser sessions.

## 4. Scope

Only the six defects, permanent tests, release evidence, version surfaces, and the release runner’s truthful no-npm fallback changed. There is no ROI formula, schema, migration, global UI, authorization, evidence-store, or AI architecture change.

## 5. REG-6945-01 Root Cause

The saved Three Why values existed as independent legacy siblings (`threeWhysAct`, `threeWhysNow`, `threeWhysCi`) with per-field metadata. There was no canonical persisted narrative projection at the server boundary, so story consumers could observe incompatible shapes/fallbacks even though Proposal surfaces retained the seller text.

## 6. REG-6945-01 Correction

`src/shared/executive-narrative.js` owns canonical resolution and persistence of `executiveNarrative.threeWhys` while retaining the legacy mirrors. Scenario save/narrative routes persist this projection, the scenario projector permits it, and `buildExecutiveValueStory()` resolves it once for all output presenters.

## 7. Executive Story Cross-Format Results

Distinctive Why Change, Why Now, and Why Cloud Inventory values passed semantic checks in Executive Web/PDF/DOCX/PPTX and Proposal Preview/PDF/DOCX. Each missing-sibling case fell back independently to `To validate`; populated siblings remained unchanged. Draft/Internal classification tests remained green.

## 8. REG-6945-02 Root Cause

Catalog descriptors had no persisted ID, so the old key was descriptor-based. Saved governed rows had generated IDs, so their key became ID-based. The two representations could never match, causing package rows to enter the customer-specific display collection.

## 9. Standard Package Correction

`catalogIdentity()` uses governed derived identity for catalog-managed rows and preserves the stored identity of true `non_standard`/legacy rows. Tests prove 15 package + 0 custom remains 15/0 and 15 package + 2 custom remains 17/2 after save/reload. Assessments are not deleted or rewritten.

## 10. REG-6945-03 Root Cause

Internal Discovery called `getDiscoveryQuestions()` with a Field Inventory option the function did not apply, while Prospect and Impact Map used a separate function/state. The Impact Map also cached a model built with Field Inventory always enabled.

## 11. Questionnaire Registry Correction

`getApplicableQuestionnaire()` is now the governed selector used by Prospect-compatible internal Discovery, progress, ROI-field sync, evidence extraction, Impact Map, Deal Coach discovery context, and the server definition adapter. Impact Map rebuilds from current scenario Field Inventory state.

## 12. Question ID/Count Parity Results

Exact question-ID arrays match for Prospect, Discovery, and Impact Map in Manufacturing and Default fixtures with Field Inventory both on and off. Manufacturing with Field Inventory enabled produces 39 governed IDs. Frozen immutable submissions are not rewritten.

## 13. REG-6945-04 Root Cause

After the server completed an attachment, the client left the item in a local `Complete` queue state. The upload button was enabled by queue length, so a server-ACTIVE item remained visually actionable and the queue contradicted the authoritative evidence list.

## 14. Evidence State-Machine Correction

The completion response must include the authoritative ACTIVE attachment. The client accepts it idempotently by ID, removes completed entries from the local queue, derives counts from the server attachment list, enables upload only for Ready/Failed items, and uses a single-flight `uploading` guard. Failed files remain retryable.

## 15. Evidence Duplicate-Submit Results

Repeated completion payload acceptance produces one attachment. Completed items are not uploadable and leave the queue; failed items remain. The server’s existing ACTIVE idempotency path remains locked by the test. Live PostgreSQL/R2 repeat-click certification is still NOT TESTED.

## 16. REG-6945-05 Root Cause

The scenario list exposed some legacy aliases, but Compare received only modern `total_contract_*` values. Legacy rows could therefore show annual benefit/ROI/NPV in Saved Scenarios while Compare saw null contract fields.

## 17. Legacy Scenario Normalization

`scenarioFinancialSummary()` performs null-preserving read-time alias normalization without running ROI math. `presentScenario()` uses it to populate the semantic list/Compare projection. No historical scenario record is mutated.

## 18. Saved Scenarios vs Compare Results

A complete legacy fixture preserves contract term, annual benefit, ROI, NPV, net benefit, and payback. Explicit zero remains zero. Genuinely missing metrics remain null/unestablished. Current model fields take precedence and existing ROI calculations are unchanged.

## 19. REG-6945-06 Root Cause

The gap selector label concatenated product, ERP, group, and application verbatim. Standard MEP rows legitimately stored `erp=JDE` and `group=JDE`, creating a duplicate semantic token.

## 20. Gap Label Formatter Correction

One structured formatter now adds case-insensitively distinct tokens while retaining genuinely different package/application context. MEP/JDE renders `MEP · JDE · Inventory Transfer`; SAP, Oracle EBS, CIP, EPP, and customer-specific fixtures preserve meaningful descriptors.

## 21. Deal Coach Timeout Investigation

No deterministic product defect was reproduced. The existing fallback operated as designed. Production behavior was not changed. The new runtime fixture proves timeout produces the governed evidence-based fallback, clears loading, and does not mutate governed facts.

## 22. PostgreSQL Testing

No safe `DATABASE_URL` was available. Migrations and all 12 registered PostgreSQL integration suites are recorded as NOT TESTED in `POSTGRES_INTEGRATION_RESULTS_v6.9.46.json`. This build did not use or modify production data.

## 23. Browser Testing

v6.9.46 has not yet been deployed, so its authenticated full lifecycle and isolated-role browser checks are NOT TESTED. `BROWSER_REGRESSION_RESULTS_v6.9.46.md` and `DEPLOYMENT_VALIDATION_v6.9.46.md` define the required post-deployment run.

## 24. Role Testing

Automated authorization and role/capability suites pass, including Admin, manager, Rep, SE cross-account Solution Fit, and denial boundaries. Live isolated Sales Rep, Sales Leader, and Admin browser sessions remain NOT TESTED because this source is not deployed and credentials were not changed or embedded.

## 25. Artifact Validation

All 29 active output production owners executed. PDF signatures and semantic content, DOCX/PPTX OOXML, and ZIP generation were validated where applicable. Results: 30 matrix assertions passed, 0 failed, 0 skipped. Real private R2 byte-streaming remains NOT TESTED.

## 26. Security Regression

Production locks covering cross-customer authorization, SE Solution Fit boundaries, Admin-only surfaces, public-link boundaries, attachment route authorization, and customer output gating passed. No middleware/capability change is included.

## 27. Full Application Regression

- Full package command: 710 standardized TAP passes + 34 ROI-engine checks = 744 passed, 0 failed, 3 database-dependent skips.
- Focused v6.9.46: 200 passed, 0 failed, 0 skipped.
- Production locks: 372 passed, 0 failed, 0 skipped.
- Brand: 19 passed, 0 failed.
- Output matrix: 30 passed, 0 failed.
- JavaScript syntax: 17 changed JavaScript files passed.

## 28. Files Changed

Production changes are limited to canonical narrative/financial services, Scenario route projection, Discovery/Impact/Deal Coach questionnaire consumers, Solution Fit identity/labels/evidence reconciliation, version metadata, CI artifact names, release gates, and permanent tests. Documentation and machine result artifacts are included. The Git diff is the authoritative complete list.

## 29. Migrations

None. Database migration level remains 045. Read-time compatibility was chosen for legacy scenario metrics to avoid destructive historical rewrites.

## 30. Known Limitations

This local host provides Node v24.19.0 and pnpm but no npm; the app declares Node >=22 <23. `npm ci` is NOT TESTED locally, while required modules were load-checked. PostgreSQL, real private R2, and post-deployment browser/isolated-role runs are NOT TESTED. These are release-certification blockers, not known source-code failures.

## 31. Release Recommendation

Deploy only to the controlled validation environment, execute Node 22/npm, PostgreSQL, R2, and complete authenticated browser gates, then let the Product Owner assign the production classification. Do not promote directly to an unrestricted production rollout from local evidence alone.

RED — Release blocker remains
