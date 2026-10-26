# Solution Fit Header State Audit — v6.9.49

## Reproduction

The certified v6.9.48 browser path reproduced the divergence after ERP/package/application mutations: the scope pane and progress panel read the mutated module state `S`, while the header retained the HTML produced by the earlier full `renderApp()` call. Persistence was confirmed because reopening the fit reloaded the correct JDE and application count.

## Surface data flow before correction

| Surface | State read | Render trigger |
|---|---|---|
| Header summary | `S.solutionScope` through `scopeSummary()` | Full `renderApp()` only |
| Scope body | `S`, `SolutionFitState.activeProcesses(S)` | `rerenderScope()` after each scope mutation |
| Progress panel | `S`, `activeProcesses()` | `refreshSolutionFitProgress()` after each mutation/save |

There were not three business-state objects. The defect was that one DOM snapshot was excluded from the common successful-save presentation path.

## Save path before correction

`changeMepErp()`, `setMepPackageMode()`, application selection, and custom application creation mutated `S`, synchronized `solutionScope`, rerendered the body/progress, and called `saveHandoff()`. A successful PUT refreshed readiness and progress but neither adopted the server-returned saved row nor rerendered the header. The server already persisted normalized JSON and hard refresh therefore corrected the header.

## Additional proven risk

Normal failed saves left optimistic mutations in `S`; only custom application creation attempted a handler-specific rollback. Overlapping saves were not serialized, so completion order could potentially make presentation status misleading even though workspace-generation guards protected customer loading.

## Corrected authority path

`SolutionFitState.scopePresentation(state)` is the pure selector for product, ERP, package mode, stable active application IDs, and application count. `PUT /api/handoffs/:customerId` returns the normalized JSON row it committed. The browser serializes saves, adopts that response into `S`, and invokes one reconciliation boundary that derives the header, scope body, and progress panel from the adopted model. A newer edit is queued behind the in-flight save. A failed save restores `lastSavedState` across all presentations.

## Non-causes

- Database persistence: working
- JDE Standard Package membership: working at 15
- Custom application identity: working and stable
- Authorization: unchanged and not causal
- Primary SE: unchanged and not causal
- Executive narrative architecture: unchanged and not causal

## Conclusion

The proven root cause was a missing header presentation invalidation at the shared save-success boundary, combined with failure handling that was not centralized. v6.9.49 corrects that boundary rather than adding mutation-handler header patches or forcing reloads.
