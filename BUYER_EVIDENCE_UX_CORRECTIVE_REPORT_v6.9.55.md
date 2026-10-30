# Buyer Evidence UX Corrective Report — v6.9.55

## 1. Executive Summary

v6.9.55 makes every Buyer Evidence requirement explain what proves it, what is missing, where its authoritative source lives, and what the rep should do next. It removes the hidden Commercial Proposal-artifact prerequisite without weakening evidence quality.

## 2. Authoritative Baseline

Built only from `cloud-inventory-roi-v6.9.54-render-ready.zip`, SHA-256 `C9A1665F16393E421E181727F04C6FAABBF6D35E4427F3CFF7716B1DC62B0915`.

## 3. Current UX Problems

The prior generic form could request irrelevant fields, hide system prerequisites, make a saved evidence record look fully complete when another source was incomplete, and imply that Save meant customer confirmation.

## 4. Requirement Audit Summary

All 28 active criteria were traced from configuration through evaluator, route, browser, Help, Christie, and summaries. See the dedicated requirement audit.

## 5. Requirement Count by Stage

Stage 2: 6; Stage 3: 6; Stage 4: 5; Stage 5: 5; Stage 6: 6. Total: 28.

## 6. Proof-Type Architecture

The server owns exactly three types: 6 Derived, 19 Customer Evidence, and 3 Hybrid. The projection carries fields, source, prerequisites, blockers, status, next action, and navigation.

## 7. Derived

Derived requirements show source status and a governed navigation action. They do not show redundant evidence forms.

## 8. Customer Evidence

Customer Evidence requirements show only fields governed for the selected criterion and remain subject to normal source, strength, freshness, stakeholder, and confirmation rules.

## 9. Hybrid

Hybrid requirements visibly separate the saved customer evidence state from system prerequisites. A user can save qualifying evidence while a prerequisite remains explicitly blocked.

## 10. Hidden Prerequisites Found

Commercial required an unrelated Proposal artifact. Stakeholder and Implementation prerequisites existed semantically but were compressed into generic incomplete messages.

## 11. Removed

The Commercial `proposalDraft` gate was removed. No Proposal feature or data was removed.

## 12. Explicit Retained

Mapped/engaged stakeholder and Solution Fit Ready prerequisites remain, now exposed as named prerequisite cards with live status.

## 13. Commercial Correction

Current strong customer-confirmed Commercial evidence with the governed term completes without a Proposal artifact. A Proposal artifact alone remains insufficient.

## 14. Proposal Alignment

The v6.9.54 correction is preserved: qualifying alignment evidence is authoritative and a Proposal artifact is neither required nor sufficient.

## 15. Adaptive Form

The drawer renders its fields from the server projection. The browser does not determine completion.

## 16. Field Matrix

Core evidence fields are criterion-specific. Amount, timing, target date, and Commercial term appear only where governed. Required/optional state is explicit.

## 17. Stakeholder UX

Mapped-required criteria use engaged Stakeholder Map choices. Other criteria allow a governed unmapped-name fallback that clearly says it does not create a Stakeholder Map record.

## 18. Save vs Confirmation

Buttons say Save evidence or Update evidence. The customer-confirmed checkbox is an independent required attribute where configured.

## 19. Exact Blocker

The drawer and list show exact missing fields, quality/freshness shortcomings, and current prerequisite status. Generic “incomplete” is no longer the only explanation.

## 20. Navigation

Source actions route to ROI Calculator, Discovery, Stakeholders, Solution Fit, Competitive, Proposal, JPP, or the Buyer Evidence workspace according to the server registry.

## 21. Recent Evidence

Recent evidence is limited to the current opportunity. Choosing a record prefills only; the rep must review and explicitly save for the selected criterion. There is no apply-all action.

## 22. Completion Summary

Completed criteria open in compact read-only summary mode with source, stakeholder, date, strength, content, governed extras, and Edit evidence.

## 23. Next Incomplete

The action moves only to the next incomplete requirement in the current stage. It never changes the official or rep-assessed stage.

## 24. Christie

Christie prompts receive the criterion key, label, proof type, semantic state, exact blockers, prerequisites, current stage, and governed facts.

## 25. Accessibility

The drawer is an accessible dialog with a labelled title, explicit field labels, keyboard-focusable actions, required indicators, and textual status that does not rely on color.

## 26. Mobile

Responsive rules collapse multi-column field and action layouts and keep the drawer scrollable without changing evidence semantics.

## 27. Historical Compatibility

Historical JSON evidence remains readable. Records missing newly transparent fields are surfaced for deliberate repair; no history is rewritten.

## 28. PostgreSQL

Disposable PostgreSQL 16.14 applied all 46 migrations. The complete registered PostgreSQL gate passed 76 tests with 0 failures and 0 skips. The actual authenticated Commercial save route rejected a missing term, persisted valid evidence, reloaded it, completed without a Proposal artifact, and remained incomplete for artifact-only state.

## 29. Browser

The local v6.9.55 app was exercised in a controlled browser. Commercial blocker transparency, prefill-only behavior, adaptive gating, save/reconciliation, compact completion, next-incomplete navigation, and Hybrid Implementation prerequisite separation passed. Console: 0 warnings, 0 errors.

## 30. Full Regression

Focused Buyer Evidence, evaluator, Commercial, Proposal Alignment, JPP, Solution Fit, Executive authority, output runtime, syntax, knowledge generation, production locks, routes, brand, and ROI gates are recorded in the release evidence. External gates are never inferred.

## 31. Files Changed

Changes are limited to the shared requirement registry/evaluator/projection, readiness route/service, Buyer Evidence drawer/readiness UI/styles, Help/Christie/Application Knowledge, tests, version/lineage metadata, governance, and release documentation.

## 32. Migration

No Buyer Evidence schema migration was required: evidence extras remain inside the existing JSONB evidence object. The complete PostgreSQL gate did expose an inherited operational timestamp-integrity issue, so migration 046 adds a transaction-scoped timestamp-preservation control used only by governed ownership transfer and scenario-version promotion. It does not add or rewrite Buyer Evidence data.

## 33. Deferred Shared-Evidence Design

A safe many-to-many immutable evidence/link model is documented separately. It is intentionally not implemented in this corrective release.

## 34. Known Limitations

Final live deployment and non-production R2 certification require external environments. The current criterion-keyed model duplicates content when the rep explicitly saves one fact to multiple criteria.

## 35. Release Recommendation

Local corrective behavior and focused PostgreSQL/browser evidence support controlled deployment certification. Final production classification remains with the Product Owner after live validation.
