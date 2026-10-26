# Executive Web State Lifecycle Audit — v6.9.48

## Scope and evidence

This pre-change audit traces the production v6.9.47 source extracted from the exact Product Owner archive. It compares the active Executive Web route with the already-passing PDF, DOCX, PPTX, and Proposal paths. No production source had been changed when this audit was written.

## Exact lifecycle before correction

1. `loadScenario()` fetches `/api/scenarios/:id`, assigns `_calcScenarioId`, and calls `loadFromObject(inputs)`.
2. `loadFromObject()` copies the compatibility `threeWhysAct`, `threeWhysNow`, and `threeWhysCi` fields into the editor and module-level `threeWhys` object.
3. `switchTab('exec')` invokes the original tab handler, which starts `renderExec()`.
4. The wrapper around `switchTab()` then calls `initializeThreeWhysFromEvidence()` and starts `renderExec()` a second time.
5. `initializeThreeWhysFromEvidence()` uses `if (!clean(el.value) && evidence[key])` and therefore cannot distinguish an intentional canonical clear from an uninitialized field. It writes old submitted Discovery text into the editor/module state.
6. Each pre-change `renderExec()` calls `persistThreeWhys()` before loading the output. Opening the output can therefore persist browser editor state even when the user did not make an edit in that tab.
7. Web independently requests `/executive-value-story` and `/executive-output-readiness`, combines them in the browser, and renders the result.
8. The two renders started by one navigation have no same-scenario request sequence or abort owner. Workspace identity prevents Scenario A from rendering under Scenario B, but it does not prevent an older response for Scenario A from replacing a newer response for Scenario A.
9. The module caches the most recently accepted story in `cached`/`window.executiveValueStory`. A forced Web load usually bypasses it, but the global object remains a stale-state risk for other consumers and failure handling.

## Sources and classification

| Source | Pre-change use | Classification | Disposition |
|---|---|---|---|
| `scenarios.data.executiveNarrative.threeWhys` | Canonical raw narrative; explicit `null` is meaningful | AUTHORITATIVE | Preserve |
| `resolveExecutiveNarrative()` | Canonical-vs-legacy precedence and explicit-clear semantics | AUTHORITATIVE | Preserve server-side only |
| `loadExecutiveSource()` | Loads the saved scenario and governed supporting facts | AUTHORITATIVE | Preserve |
| `buildExecutiveValueStory()` | Resolves customer-safe facts, including `To validate` | AUTHORITATIVE | Reuse inside one output-model builder |
| `evaluateExecutiveOutputReadiness()` | Resolves presentation classification | AUTHORITATIVE | Include in the same server model |
| `threeWhysAct/Now/Ci` | Long-lived saved compatibility mirrors | LEGACY COMPATIBILITY | Server may project them; browser must not select precedence |
| editor fields and module-level `threeWhys` | Editable working copy | PRESENTATION ONLY / STALE-STATE RISK | Retain only for explicit edits; never an Executive Web fact source |
| `latestSubmittedEvidence` | Immutable Discovery evidence for deliberate restore | AUTHORITATIVE EVIDENCE, NOT CURRENT NARRATIVE | Remove automatic fallback; retain explicit restore |
| `initializeThreeWhysFromEvidence()` | Repopulates blank editor values automatically | STALE-STATE RISK / REMOVE | Remove from navigation and public API |
| `cached` / `window.executiveValueStory` | Browser copy of a prior story | STALE-STATE RISK | Remove content cache; clear compatibility reference on failure/invalidation |
| prior `#execPrintTarget` DOM | Previously rendered document | PRESENTATION ONLY / STALE-STATE RISK | Replace with loading before request and unavailable state on failure |
| localStorage/sessionStorage | No Executive narrative storage found | REMOVE AS AUTHORITY | Authentication/preferences may remain; narrative authority is prohibited |
| BFCache-restored DOM | May contain an earlier document | STALE-STATE RISK | Revalidate on `pageshow` and visible-page restoration |

## Passing file-generator path

- PDF: route → `executiveReportFor()` → `loadExecutiveSource()` → `buildCustomerROIReportData()` → `buildExecutiveValueStory()` → `buildExecutivePdf()`.
- DOCX: the same source/report path → `buildExecutiveDocx()`.
- PPTX: the same source/report path → `buildExecutivePptx()`.
- Proposal: `prepareProposalExport()` → `loadExecutiveSource()` → `buildExecutiveValueStory()` → governed Proposal builder.

These paths never call `initializeThreeWhysFromEvidence()`, read editor DOM values, or use the browser module-level narrative object.

## Failing Web path and exact divergence

The Web path diverges before the authoritative fetch. `public/index.html` calls `initializeThreeWhysFromEvidence()` whenever Executive Outputs opens. That function interprets empty as absent and replaces it with old immutable Discovery evidence. `renderExec()` then unconditionally invokes `persistThreeWhys()`, so navigation itself can make a stale browser copy authoritative again. The same navigation starts two renders, while `public/executive-story.js` has no same-scenario request ordering.

The proven cause is a browser authority violation composed of truthy fallback, navigation-triggered persistence, and unordered duplicate Web requests. It is not a PostgreSQL persistence failure.

## Corrective architectural contract

- Introduce one server `buildExecutiveOutputModel()` owning story, readiness, scenario identity, and revision metadata.
- Executive Web performs one no-store request and renders only that response.
- File outputs and Proposal shared story facts use the same model/story builder.
- Request generations plus cancellation reject late responses within the same scenario.
- Output navigation never saves editor state unless the user changed it.
- Explicit Save reconciles the canonical response, invalidates prior output state, refetches the model, and only then reports completion.
- Current-model failure clears old browser content and fails closed.
- BFCache/page visibility and cross-tab save notifications trigger authoritative revalidation; they never provide facts.
