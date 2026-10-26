# Executive Narrative Source of Truth

## Raw authority

The governed Three Whys live in `scenarios.data.executiveNarrative.threeWhys`. Each canonical entry carries a value and provenance metadata. A canonical entry with `value: null` is an intentional unestablished state, not a missing value and not permission to search older text.

`threeWhysAct`, `threeWhysNow`, `threeWhysCi`, and `threeWhysMeta` remain server-maintained compatibility mirrors for historical scenarios. `resolveExecutiveNarrative()` performs compatibility resolution on the server. Once a canonical entry exists, it wins even when its value is `null`.

## Canonical model

`src/shared/executive-output-model.js::buildExecutiveOutputModel()` is the single semantic composition boundary. It combines the saved scenario and governed supporting sources into:

- canonical narrative presence/clear semantics;
- the Executive Value Story, including the presentation phrase `To validate` for an unestablished Why;
- Executive Output Readiness;
- scenario, narrative, story, and model revision identity.

PDF, DOCX, PPTX, Proposal exports, and Executive Web use this model or its exact `story` member. Presentation builders may change layout but may not resolve another narrative source.

## Browser contract

Executive Web consumes `GET /api/scenarios/:id/executive-output-model?output=executive_view`. The response is private and `no-store`. The browser renders only an accepted response whose request generation, scenario identity, story identity, readiness identity, and revision fields match the active workspace.

Starting a newer request aborts and invalidates the older request. Late same-scenario responses, cross-scenario responses, BFCache-restored content, visible-page restoration, and cross-tab narrative changes trigger discard or authoritative revalidation. If the current model cannot be loaded, the existing Executive document is replaced with an unavailable state.

## Save/reconcile contract

The editor proposes an authorized PATCH. The save response returns the canonical persisted narrative and revision metadata. A response cannot overwrite a newer local edit. After an accepted save, the client invalidates the prior model, notifies other tabs of the revision, refetches the current output model, and only then reports a completed Executive View save.

## Prohibited browser authority

The browser must not use editor values, prior rendered DOM, module globals, cached story objects, local storage, session storage, legacy mirrors, or immutable Discovery evidence as an Executive output fallback. Discovery evidence may be copied into the editor only through the explicit **Restore customer evidence** action and normal authenticated save.
