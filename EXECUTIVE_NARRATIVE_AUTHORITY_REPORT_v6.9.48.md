# Executive Narrative Authority Report v6.9.48

## 1. Executive Summary

v6.9.48 removes the browser as an authority for Executive Three Why facts. Executive Web, Executive file outputs, and Proposal outputs now resolve the same saved server model. A cleared canonical value remains cleared and renders as `To validate`; stale browser, legacy mirror, delayed-response, navigation, and multi-tab state cannot repopulate it.

## 2. Authoritative Baseline

- Parent: `cloud-inventory-roi-v6.9.47-render-ready.zip`
- Parent SHA-256: `99815FC362B98FA30E781944251CD02FDBC66B06F2C67DAE20F4E3D287E8D8E6`
- Target: `6.9.48`
- ROI authority preserved: ROI Model v2.8 / modelVersion 28

## 3. v6.9.47 Reproduction

The failing sequence was reproduced from source: save `A / B / C`, clear Why Now, save `A / null / C`, then open Executive Web. The saved canonical record and all server file outputs used the clear, while Executive Web could restore `B` from old immutable Discovery evidence and stale browser state.

## 4. Executive Web State Lifecycle Audit

The complete audit is recorded in `EXECUTIVE_WEB_STATE_LIFECYCLE_AUDIT_v6.9.48.md`. It covers navigation, editor save, render, refresh, BFCache, scenario switching, multi-tab invalidation, output generation, and all browser/server sources of Three Why values.

## 5. Passing File-Generator Data Path

`scenario ID -> executiveSourceFor() -> buildExecutiveOutputModel() -> one story/readiness revision -> Executive PDF/DOCX/PPTX or Proposal builder`. File generators did not call the browser fallback.

## 6. Failing Web Data Path

`switchTab() -> initializeThreeWhysFromEvidence() -> stale Discovery fallback -> renderExec() -> unconditional persistThreeWhys() -> separate story/readiness loads`. This path could convert an intentional canonical clear into an old populated value and could render two competing requests.

## 7. Exact Divergence Point

The divergence occurred in `public/index.html` and `public/narrative.js` before `public/executive-output-adapters.js` rendered Executive Web. File outputs entered the canonical server loader; Executive Web first mutated browser narrative from Discovery evidence and then persisted that mutation.

## 8. Proven Root Cause

`initializeThreeWhysFromEvidence()` treated cleared canonical fields as uninitialized and repopulated them. `renderExec()` then called `persistThreeWhys()` merely for opening the view. The `switchTab()` wrapper also invoked `renderExec()` a second time. This was a competing-authority defect, not a missing-delay defect.

## 9. Previous Fixes and Why They Did Not Permanently Solve It

Earlier corrections fixed canonical persistence and made file outputs server-authoritative, but retained a browser-side compatibility fallback and an output-on-open save. Those paths could still overrule the canonical null in Executive Web even though the database and exports were correct.

## 10. New Canonical Executive Output Model

`src/shared/executive-output-model.js` owns canonical narrative projection, semantic output story, readiness, and revision metadata. `buildExecutiveOutputModel()` is now the shared authority used by Executive source/report services, Proposal export, business-case publication, and the browser API.

## 11. Source-of-Truth Contract

`EXECUTIVE_NARRATIVE_SOURCE_OF_TRUTH.md` defines saved scenario data, saved Executive narrative, governed economics, immutable evidence, readiness, and browser presentation responsibilities. Browser objects, DOM, local storage, legacy mirrors, and previous responses are explicitly non-authoritative.

## 12. Clear vs Omitted Semantics

An omitted property means “preserve the existing sibling.” An explicit null/blank means “clear this canonical fact.” The raw model preserves null, records `explicitlyCleared`, and the semantic presentation emits `To validate`. Canonical presence wins over legacy populated mirrors.

## 13. Legacy Compatibility

Legacy-only scenarios remain readable through server-side canonical projection. Compatibility is resolved before the model reaches a consumer. The browser never chooses between legacy, scenario, editor, and canonical values.

## 14. Browser State Removal

Automatic Discovery restoration was removed from navigation. Executive Web does not use DOM text, hidden fields, local/session storage, or `currentScenario` as Three Why authority. Explicit “Restore customer evidence” remains a deliberate seller action.

## 15. Cache Policy

Executive model routes send `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and `Expires: 0`. Each governed render starts by clearing the previously accepted browser model and requesting the current server model.

## 16. Revision / Stale-Response Protection

Responses include scenario ID/version, scenario updated time, narrative revision, story revision, and model revision. A monotonically increasing request generation and `AbortController` reject late or mismatched responses. Scenario and revision assertions fail closed.

## 17. Save/Reconciliation Flow

The narrative PATCH returns authoritative canonical narrative and revision metadata. The editor replaces its saved reference, invalidates old output state, broadcasts the revision, refetches the output model, and only then shows save success. A save-generation guard prevents an older response from overwriting newer typing.

## 18. Multi-Tab Handling

`BroadcastChannel('ci-executive-narrative')` announces saved narrative revisions. A visible Executive tab invalidates and revalidates when another tab saves the same scenario. It does not trust the message payload as story content.

## 19. Out-of-Order Response Handling

The permanent test starts two same-scenario requests and resolves the newer response first. The older response is discarded even when it arrives later with a plausible scenario ID. Scenario-switch delayed responses are rejected by the same identity/revision gate.

## 20. Cross-Format Parity Results

Permanent tests prove `A / null / C` becomes `A / To validate / C` and the old B sentence is absent in Executive Web semantics, Executive PDF/DOCX/PPTX, and Proposal Preview/PDF/DOCX builders. A subsequent `B2 — restored dated trigger` appears in all formats and the old B does not.

## 21. Browser E2E Results

The production browser scripts passed the automated VM/state harness for save authority, stale injection, same-scenario out-of-order completion, scenario switch, network failure, BFCache revalidation, and cross-tab invalidation. The desktop-controlled local `file:` harness was **NOT TESTED** because the browser security policy prohibits local-file navigation; no bypass was attempted. Authenticated deployed E2E remains a deployment-certification action.

## 22. PostgreSQL Results

No safe non-production `DATABASE_URL` was available. Migrations and 14 registered PostgreSQL integration suites are truthfully recorded as **NOT TESTED**, with zero false passes and zero production-database use. The new PostgreSQL authority suite is registered for CI/certification execution.

## 23. Full Regression

- Clean locked production dependency installation: PASS (Node 22.22.0 / npm 10.9.4; 237 packages)
- Full suite: 723 passed, 0 failed, 3 skipped
- v6.9.48 authority gate: 105 passed, 0 failed, 0 skipped
- Production locks: 385 passed, 0 failed
- Brand: 19 passed, 0 failed
- Active output runtime matrix: 30 tests passed; 29/29 active outputs certified
- JavaScript syntax: 301 files checked, 0 failed
- PostgreSQL routes/integration: NOT TESTED without a safe database
- R2 integration: 2 suites NOT TESTED without credentials

## 24. Files Changed

Production changes are concentrated in the canonical Executive model/service and its direct consumers: `src/shared/executive-output-model.js`, `src/shared/executive-source.js`, `src/shared/customer-roi-report.js`, `src/shared/business-case-publication.js`, `src/exports/proposal-export-service.js`, `src/routes/scenarios.js`, `public/executive-story.js`, `public/executive-output-adapters.js`, `public/narrative.js`, `public/proposal.js`, and the navigation wrapper in `public/index.html`. Remaining changes are versioning, governance, tests, CI evidence names, and release documentation.

## 25. Migration Status

No database migration was added. Existing saved narrative fields and version semantics were sufficient; the defect was caused by application state authority and request ordering.

## 26. Known Limitations

Safe PostgreSQL and R2 credentials were unavailable, so their integration suites are NOT TESTED. The desktop-controlled browser could not open the local harness because `file:` navigation is prohibited. Live authenticated deployment certification, including hard refresh and real multi-tab behavior on Render, remains required.

## 27. Release Recommendation

The source correction and local machine-evidence gates are complete with zero source-test failures. Proceed to controlled deployment certification only after the Product Owner reviews the known NOT TESTED integration items; do not assign final production readiness from this build report alone.
