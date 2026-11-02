# Cloud Inventory ROI v6.9.55 Differential Audit

## v6.9.55 corrective differential

The target derives only from `cloud-inventory-roi-v6.9.54-render-ready.zip` (SHA-256 `C9A1665F16393E421E181727F04C6FAABBF6D35E4427F3CFF7716B1DC62B0915`). The correction removes the hidden Proposal-artifact prerequisite from `commercial`, classifies all 28 active Stage 2–6 requirements as Derived, Customer Evidence, or Hybrid, and exposes one server-owned requirement projection for fields, prerequisites, blockers, source status, next action, and navigation.

The Buyer Evidence drawer now renders adaptive fields from that projection, keeps customer evidence separate from Hybrid system prerequisites, offers opportunity-scoped prefill without automatic application, uses explicit Save/Update semantics, opens complete evidence in a compact summary, and navigates only to the next incomplete criterion in the current stage. Help and Christie consume the same exact blockers. Sales Manager summaries retain the authoritative proof and prerequisite metadata.

No ROI formula, ROI input, BuyCycle stage definition, percentage arithmetic, authorization rule, Buyer Evidence schema, output generator, Prospect evidence boundary, Solution Fit method, JPP behavior, or Executive narrative authority changed. ROI Model v2.8 / `modelVersion: 28` remains locked.

Tests are additive: a 28-requirement contract suite, adaptive-browser renderer coverage, retained v6.9.54 Proposal Alignment protection, and a real disposable-PostgreSQL Commercial persistence/evaluator test. Version, lineage, Application Knowledge, Help, Version History, governance, and release evidence are updated to v6.9.55.

The complete clean-PostgreSQL gate also proved two inherited integrity defects. Admin Cleanup now includes PostgreSQL row-version identity in its preview fingerprint so an intervening update cannot reuse a stale preview. Migration 046 and transaction-local preservation calls prevent owner-only customer transfer and prior-scenario version promotion from rewriting historical operational timestamps while preserving normal `updated_at` behavior for ordinary writes. The migration is not required by, and does not alter, Buyer Evidence storage; it was retained because the registered full release gate must complete with zero database failures.

---

# Cloud Inventory ROI v6.9.54 Differential Audit

## v6.9.54 corrective differential

The target derives only from `cloud-inventory-roi-v6.9.53-render-ready.zip` (SHA-256 `56636B522C27DADECE38AA793E180C2A442E0AC6F72343A821F7155BDFFE63A4`). The sole production behavior change is in `src/shared/criterion-evidence.js`: `proposal_alignment` no longer adds `scenario.data.proposalDraft` as a second hidden component requirement after qualifying Buyer Evidence.

All evidence qualification fields and lifecycle behavior remain in the shared evaluator. `proposalDraft` is retained everywhere it legitimately supports Proposal persistence, generation, preview, and output. Percentage arithmetic, stage methodology, browser refresh, evidence persistence, database schema, authorization, ROI Model v2.8, JPP, Solution Fit, Prospect evidence, and output architecture are unchanged.

All other changed files are focused tests, version/lineage metadata, permanent-test/release-runner registration, generated Application Knowledge metadata, Version History, governance documentation, and release evidence.

---

# Cloud Inventory ROI v6.9.52 Differential Audit

## v6.9.52 corrective differential

The target is derived only from `cloud-inventory-roi-v6.9.51-render-ready.zip` (SHA-256 `791AD9298068A23EA95E6FB84A42385188C01A9B14AE145E942A3219D552FAAD`). The imported baseline commit is `4f237cee3cfa5537522121598a3a235e799e5567`.

Production changes are limited to one strict JPP date-only helper, the All Plans date consumer, the public JPP date consumer, the prospect-link email date consumer, script load order, and version metadata. No persistence, authorization, sharing, database, ROI, Solution Fit, Executive narrative, Buyer Evidence, Sensitivity, or R2 behavior changed. The blank `+ New Joint Project Plan` form is confirmed expected behavior and was not modified.

## Historical v6.9.51 audit

## Baseline and method

The target was created only from `cloud-inventory-roi-v6.9.50-render-ready.zip` (SHA-256 `A43C5B5008841B2B932716E7950B5D72902595C3ED7EC04FCAA1AD97BE99201C`). The exact extracted baseline was committed as `ae5e7e4762fc3cdd5f384b9eda06608946ba8526`. Final review compares that commit with v6.9.51.

## Approved production differential

| Boundary | Files | Approved correction |
|---|---|---|
| JPP capability projection | `public/map.js` | Uses server-returned `canEditPlan` as the client capability, combines it with existing saved/output readiness only for prospect-link management, and keeps output availability separate. |
| Prospect-link controls | `public/map.js` | Gives Rotate/Revoke stable IDs and applies the same capability rule to Share, Rotate, and Revoke after render, reload, and dirty/clean transitions. |

## Test and governance differential

- Adds `test/v6951-jpp-capability.test.js`, which executes the real browser script in a DOM harness and mounts the real JPP router in Express.
- Permanently registers the capability invariant, focused package gate, release runner gate, lineage, Application Knowledge version, CI evidence names, and Version History entry.
- Adds no dependency, migration, route, API, data-model, ROI-model, or output-registry change.

## Explicit non-changes

- Server owner-only authorization remains unchanged and is verified, not replaced.
- Plan owners retain Save, Add/Remove, AI, Share, Rotate, and Revoke behavior subject to existing readiness.
- Authorized read-only internal/customer PDF and PowerPoint outputs remain available.
- No unrelated feature or refactor is included.

---

## Historical v6.9.50 differential audit (retained)

## Baseline and method

The target was created only from `cloud-inventory-roi-v6.9.49-render-ready.zip` (SHA-256 `A89C9A4979FDE31FCAA2B129EEEB08A9BCE8897165D66DC58D8206A95829128D`). The exact extracted baseline was committed as `62c1041` before production edits. The final review compares that commit with v6.9.50 and excludes unrelated feature work.

## Approved production differential

| Boundary | Files | Approved correction |
|---|---|---|
| Cleanup snapshot integrity | `src/shared/admin-cleanup.js`, `src/routes/admin-cleanup.js` | Canonicalizes valid Dates to UTC ISO, rejects invalid Dates, and counts only governed active attachments. |
| Active evidence authority | `src/shared/solution-fit-attachments.js`, attachment route, PS turnover service | Provides one active-evidence predicate for SQL and in-memory consumers. |
| JPP capability | `src/shared/jpp-capability.js`, `src/routes/maps.js`, `public/map.js` | Returns server-owned `canEditPlan`, disables every mutating control, and denies direct non-owner mutations. |
| Solution Fit readiness | `src/shared/solution-fit-readiness.js`, handoff/customer selector routes | Recomputes selector and open-record readiness from the same normalized saved data. |
| Output reliability | `public/executive-output-adapters.js`, `src/routes/scenarios.js` | Adds single-flight bounded Word generation, abort/retry/finalization, and non-sensitive phase logging. |
| Presentation truth | `public/features.js`, `public/buyer-readiness.js`, `public/deal-export.js`, `public/ux-enhancements.js` | Fails Sensitivity closed without a case; separates evidence completion from stage gates; corrects warning severity and explicit ownership labeling. |
| Ownership projection | `src/authorization.js`, `src/routes/customer-switcher.js` | Returns explicit server-derived ownership for mixed-role-safe labels. |

## Test-only ROI correction

`test/routes.test.js` now has two authoritative cases: legacy inputs without a qualified measured driver produce zero benefit, while a v2.8 fixture with explicit `laborWastePct` produces positive benefit. No ROI production file changed for this defect.

## Governance and evidence differential

- Versioned package, lineage, workflow artifact names, release runner, and Application Knowledge metadata to 6.9.50.
- Registered `test/v6950-production-integrity.test.js` as a permanent release protection.
- Added nested Date/null/zero/key-order coverage and PostgreSQL stale-preview/active-attachment fixtures.
- Generated current machine evidence for release gates, output owners, PostgreSQL availability, and R2 availability.

## Explicit non-changes

- No migration or schema change; migration level remains 045.
- No ROI formula, overlap rule, modelVersion, currency, NPV, payback, or provenance change.
- No Executive narrative, questionnaire, Standard Package membership, attachment lifecycle, role permission, or stage-gate methodology change.
- No framework/dependency upgrade, storage redesign, local-storage authority, or unrelated UI redesign.

## Review conclusion

Every production edit maps to one of the ten approved corrective defects. Local executable gates have zero failures. Safe PostgreSQL, private R2, supported Node 22, and deployed authenticated browser certification remain external gates and are not represented as PASS.

---

## Historical v6.9.49 differential audit (retained)

# Cloud Inventory ROI v6.9.49 Differential Audit

## Baseline and method

The target was created only from `cloud-inventory-roi-v6.9.48-render-ready.zip` (SHA-256 `B155249D3691B4C3C130D45532759D1643A60AAAA93425E7CE0DC8E2DBCA1406`). The exact extracted baseline was committed before production edits. The final review compares that commit with v6.9.49 and rejects unrelated feature work.

## Production differential

| Boundary | Files | Approved correction |
|---|---|---|
| Shared Solution Fit selector | `public/solution-fit-state.js` | Adds pure `scopePresentation()` derived from the existing active-product and active-process authorities. |
| Server save response | `src/routes/handoffs.js` | Returns the normalized data already persisted by the authenticated PUT transaction; route, authorization, schema, and readiness remain unchanged. |
| Browser reconciliation | `public/solution-fit.js` | Adopts the server response at save success; derives header/body/progress from one model; serializes overlapping saves; restores the last confirmed model on failure. |

## Governance, release, and test differential

- Updated version and exact-parent lineage metadata from 6.9.48 to 6.9.49.
- Added a permanent pure-selector, route-contract, and actual headless-browser behavioral suite.
- Added the header-state audit, defect matrix, release report, manifest, readiness, and machine evidence.

## Explicit non-changes

- No database migration was added; migration level remains unchanged.
- No ROI formula, overlap rule, model version, payback, NPV, investment, currency, or economic-provenance code changed.
- No immutable Prospect evidence, Value History, questionnaire, Standard Package membership, application identity, Primary SE, attachment, PS Turnover, JPP, role, team, or authorization boundary changed.
- No local/session storage authority or timing-based workaround was added.

## Evidence review

- Final exact counts are generated from the v6.9.49 execution and recorded in `QA_RESULTS_v6.9.49.md` and `RELEASE_GATE_RESULTS_v6.9.49.json`.
- PostgreSQL and R2 are recorded as NOT TESTED when safe non-production services are unavailable; they are never converted into PASS.

## Review conclusion

Every production edit maps to Solution Fit save reconciliation, derived scope presentation, failure rollback, or direct version/governance support. No unrelated feature or core-calculation change is present.
# v6.9.53 differential — JPP PostgreSQL date-only boundary

Authoritative parent: `cloud-inventory-roi-v6.9.52-render-ready.zip` (`9C76181C3494DF47C3B254911326709716044D1FAB485593032993D29BD0D810`).

Production changes are limited to the PostgreSQL `DATE` adapter, the shared strict server/browser date-only contract, and JPP list/editor/public/PDF/PPTX consumers. No schema, authorization, ROI, Solution Fit, Executive narrative, Buyer Evidence, or R2 production logic changed. `.github/workflows/ci.yml` changed only to publish v6.9.53 evidence filenames. All remaining changes are version metadata, permanent tests, and release evidence.

Changed production files: `src/db.js`, `src/shared/date-only.js`, `src/exports/operational-pdf.js`, `src/exports/operational-pptx.js`, `public/jpp-date-only.js`, `public/map.js`, `public/prospect-map.html`, and `public/deal-export.js`.

No migration was added. The existing `mutual_action_plans.target_close_date DATE` schema remains authoritative.

