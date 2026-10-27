# Cloud Inventory ROI v6.9.50 Differential Audit

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


## Deployment reconciliation against current main

The supplied v6.9.49 archive was reconciled against deployed Git parent `f5a7882cfc180ab2b966267052e4309b3b342038`. Existing deployed fixes and permanent tests missing from package ancestry were retained; `public/solution-fit.js` and `src/routes/handoffs.js` merged cleanly with the supplied changes. See `DEPLOYMENT_DIFFERENTIAL_v6.9.49.md` for the actual deployment differential and verification boundaries.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.


## v6.9.50 deployed-baseline reconciliation

The verified v6.9.50 archive was applied to current production main `474e6708e756a39444b03e637cae1ac90525341b`, preserving existing corrections and permanent regressions absent from its raw package ancestry. See `DEPLOYMENT_DIFFERENTIAL_v6.9.50.md` for the reconciliation and separately scoped Node 22 verification evidence.
