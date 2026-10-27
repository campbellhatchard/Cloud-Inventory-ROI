# Cloud Inventory ROI v6.9.52 Baseline Inheritance Audit

## Authoritative v6.9.52 package

- Baseline archive: `cloud-inventory-roi-v6.9.51-render-ready.zip`
- Baseline SHA-256: `791AD9298068A23EA95E6FB84A42385188C01A9B14AE145E942A3219D552FAAD`
- Baseline application version: `6.9.51`
- Target application version: `6.9.52`
- The exact named archive was extracted directly into a new `work/cloud-inventory-roi-v6.9.52` workspace before production edits. No earlier archive, branch, convenient worktree, or reconstructed source was substituted.

## Protected authorities at inheritance

- ROI authority remains ROI Model v2.8 / `modelVersion` 28; no formula, overlap, currency, payback, NPV, or provenance change is authorized.
- Brand System 1.0, Application Knowledge 1.0, Christie Persona 1.0, database migration level 045, and all 29 active Output Registry entries are preserved.
- The inherited regression inventory contains 116 `*.test.js` files, including the permanent v6.9.51 JPP owner/non-owner capability suite.
- JPP persistence, owner authorization, non-owner read-only behavior, prospect-link capability, public-link policy, and PDF/PPTX output architecture remain unchanged.
- SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Active production path entering correction

- Saved `mutual_action_plans.target_close_date` is returned by `src/routes/maps.js` without date mutation.
- `public/map.js` stores the API value on the plan model and renders the editor with the governed `YYYY-MM-DD` component.
- The All Plans card independently passes `target_close_date` to JavaScript `Date` and formats it in the browser's local timezone.
- JPP outputs remain registered server-side builders in `src/exports/operational-pdf.js` and `src/exports/operational-pptx.js`.

## Correction-only scope

The sole production correction is JPP-DATE-01: preserve a governed `YYYY-MM-DD` target close date as the same calendar year, month, and day in the All Plans card regardless of browser timezone. The build may add one canonical JPP date-only presentation helper and route vulnerable JPP date-only presentation consumers through it. It may not add offsets, mutate persistence, or broaden into timestamp formatting.

## Explicit non-changes

- No database migration, column change, stored-value conversion, or API-contract change.
- No JPP authorization, sharing, public-link, hydration, milestone, or output architecture change.
- No ROI, Prospect evidence, Solution Fit, Executive, Proposal, Buyer Evidence, Sensitivity, R2, or customer-workspace change.

## Outstanding external certification

- Disposable PostgreSQL integration remains required for final infrastructure certification when a safe non-production database is available.
- R2 remains NOT TESTED without approved non-production credentials.
- Live Chrome verification of the exact v6.9.52 deployed archive remains a post-deployment Product Owner gate.

---

# Cloud Inventory ROI v6.9.51 Baseline Inheritance Audit

## Authoritative v6.9.51 package

- Baseline archive: `cloud-inventory-roi-v6.9.50-render-ready.zip`
- Baseline SHA-256: `A43C5B5008841B2B932716E7950B5D72902595C3ED7EC04FCAA1AD97BE99201C`
- Baseline application version: `6.9.50`
- Target application version: `6.9.51`
- The exact archive was extracted into a new release workspace and committed without modification as `ae5e7e4762fc3cdd5f384b9eda06608946ba8526` before production edits. No earlier archive, branch, or reconstructed source was substituted.

## Protected authorities at inheritance

- ROI authority remains ROI Model v2.8 / `modelVersion` 28; no formula, overlap, currency, payback, NPV, or provenance change is authorized.
- Brand System 1.0, Application Knowledge 1.0, Christie Persona 1.0, database migration level 045, and all 29 active Output Registry entries are preserved.
- The existing server-owned JPP capability remains `canEditPlan`, derived from authenticated user and saved plan ownership in `src/shared/jpp-capability.js` and enforced independently by `src/routes/maps.js`.
- Read-only JPP PDF/PPTX review access remains separate from prospect-link mutation authority.

## Correction-only scope

The sole production correction is to prevent the JPP More-menu output refresh from re-enabling Share, Rotate, or Revoke for a user whose server-returned `canEditPlan` capability is false. The browser may project this authority into read-only presentation state, but it may not derive or broaden it. Permanent behavioral tests cover actual DOM controls and actual Express mutation routes.

## Explicit non-changes

- No database migration or schema change.
- No authorization broadening, JPP ownership rule change, output-readiness change, or PDF/PPTX restriction.
- No ROI, Prospect evidence, Solution Fit, Executive, Proposal, Buyer Evidence, or customer-workspace change.

## Outstanding external certification

- Supported Node 22 execution in GitHub Actions.
- Disposable PostgreSQL 16 integration with zero failures/skips/NOT TESTED.
- Authenticated live owner/non-owner acceptance after the exact package is deployed.

---

# Cloud Inventory ROI v6.9.50 Baseline Inheritance Audit

## Authoritative v6.9.50 package

- Baseline archive: `cloud-inventory-roi-v6.9.49-render-ready.zip`
- Baseline SHA-256: `A89C9A4979FDE31FCAA2B129EEEB08A9BCE8897165D66DC58D8206A95829128D`
- Baseline application version: `6.9.49`
- Target application version: `6.9.50`
- The archive was extracted directly into a new `work/cloud-inventory-roi-v6.9.50` directory and committed as Git commit `62c1041` before this audit or any production-code change. No earlier archive, reconstructed source, or existing branch was substituted.

## Protected authorities at inheritance

- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Brand System: 1.0
- Application Knowledge: 1.0
- Christie Persona: 1.0
- Database migration level: 045
- Active output registry: 29 active production outputs, preserved
- Existing automated test inventory: 123 `*.test.js` files inherited from v6.9.49
- SE Solution Fit scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario, opportunity, JPP, Buyer Evidence, Stakeholder, Proposal, Executive, or ROI access.

## Active production paths verified before change

- Customer Business Case: `/api/business-case-shares` -> `src/routes/business-case-shares.js` -> frozen, customer-safe publication.
- Executive Web: governed browser rendering in `public/executive-output-adapters.js` backed by the server-owned Executive output model.
- Executive PDF/DOCX/PPTX: scenario export routes -> canonical Executive source/value story -> `src/exports/executive-pdf.js`, `src/exports/executive-docx.js`, and `src/exports/executive-pptx.js`.
- Champion Pack / role outputs: internal controls remain in `public/deal-export.js`; the Champion Pack registry entry remains intentionally inactive while the governed Role One-Pager remains active.
- Approved Battlecard PDF/DOCX: authenticated server routes require the current approved Battlecard revision and use `src/exports/operational-pdf.js` / `src/exports/competitive-docx.js`.
- Solution Fit: `public/solution-fit.js` -> authenticated `src/routes/handoffs.js`; stable saved identity, Primary SE, private evidence, and Professional Services turnover paths remain authoritative.

## Correction-only scope entering v6.9.50

This build is restricted to the ten verified production-integrity findings in the v6.9.50 owner prompt:

1. Admin Cleanup date canonicalization and deterministic fingerprinting.
2. Active-only Solution Fit attachment list/count/turnover/cleanup consistency.
3. Stale ROI route fixture correction without ROI code or methodology change.
4. Bounded Executive Word request lifecycle with timeout, reset, and retry.
5. One server-owned JPP edit capability used consistently by route and UI enforcement.
6. Shared Solution Fit readiness interpretation across selector and opened record.
7. Explicit Sensitivity Analysis empty state when no authorized scenario exists.
8. Warning/error severity for blocked Stakeholder export.
9. Server-authoritative, multi-role-safe own-opportunity labeling.
10. Buyer Evidence percentage and mandatory readiness-gate semantic separation.

## Preserved behavior

- ROI Model v2.8 formulas, overlap rules, null-versus-zero semantics, native currency, provenance, and saved results.
- Immutable Prospect submission evidence and explicit per-value application.
- Rep Confirmed immutable provenance and Value History semantics.
- Executive, Proposal, Customer Business Case, Customer Email, and output audience governance.
- Solution Fit saved identity, cross-account SE boundary, evidence privacy, attachment identity, and Professional Services turnover authority.
- JPP saved-state output authority and server authorization.
- Buyer Evidence content, mandatory evidence rules, and stage-readiness calculation.
- Sales Manager, Sales Leader, Rep, SE, Admin, and mixed-role authorization boundaries.

## Outstanding certification requirements

- Supported Node 22/npm execution of the complete release gates.
- Clean disposable PostgreSQL migrations and the complete registered PostgreSQL integration suite with zero skips.
- Private R2 lifecycle only when safe non-production R2 credentials are available; otherwise it must remain `NOT TESTED`, never `PASS`.
- Authenticated live browser and Render verification after deployment. Local source tests cannot certify the deployed version.

## Prohibited substitutions

- No change to ROI Model v2.8 or its expected numbers to resolve the stale fixture.
- No client-derived authorization in place of server-owned facts.
- No deleted attachment treated as active evidence.
- No optimistic success notification for a blocked export.
- No local-storage persistence or test-only production path.
- No production database or production R2 credentials in automated tests.

---

# Cloud Inventory ROI v6.9.49 Baseline Inheritance Audit

## Authoritative package

- Baseline archive: `cloud-inventory-roi-v6.9.48-render-ready.zip`
- Baseline SHA-256: `B155249D3691B4C3C130D45532759D1643A60AAAA93425E7CE0DC8E2DBCA1406`
- Baseline application version: `6.9.48`
- Target application version: `6.9.49`
- The archive was extracted directly into a new `work/cloud-inventory-roi-v6.9.49` directory and committed before corrective edits. No earlier archive, reconstructed source, or existing branch was substituted.

## Protected authorities

- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Brand System: 1.0
- Application Knowledge: 1.0
- Christie Persona: 1.0
- Database migration level: 045
- Active output registry: 29 active production outputs, preserved
- Existing automated test inventory: 110 `*.test.js` files inherited from v6.9.48
- SE Solution Fit scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Active production paths verified before change

- Customer Business Case: `/api/business-case-shares` → `src/routes/business-case-shares.js` → frozen customer-safe publication.
- Executive Web: the locked v6.9.48 server-owned Executive output-model path and stale-response protection.
- Executive PDF/DOCX/PPTX: `/api/scenarios/:id/export-{pdf,docx,pptx}` → `executiveReportFor()` → `buildCustomerROIReportData()` → `buildExecutiveValueStory()` → format-specific export builder.
- Champion Pack / role outputs: active internal controls remain in `public/deal-export.js` and consume governed Executive story data.
- Approved Battlecard PDF/DOCX: authenticated `/api/export/battlecard-pdf` and `/api/export/battlecard-docx` routes require the current approved Battlecard revision.
- Solution Fit: `public/solution-fit.js` → authenticated `/api/handoffs` routes; stable saved identity, Primary SE, private evidence, and PS Turnover paths remain active.

## Corrective scope

This release is limited to the verified v6.9.48 Solution Fit header synchronization defect. The authenticated save response returns the normalized persisted data; one reconciled browser model then derives the header, scope body, and progress panel. Failed saves restore the last confirmed model, and overlapping saves are serialized.

## Preserved v6.9.48 behavior

- Populated Three Why cross-format parity
- ROI save/reload and ROI Model v2.8 calculations
- Immutable Prospect submission and explicit Prospect value application
- Manufacturing Field Inventory ON 39-question identity parity
- JDE Standard Package 15 standard / 0 custom behavior
- Stable governed/custom application identities
- Normalized gap labels
- ACTIVE evidence queue transition, refresh persistence, image optimization, duplicate filename isolation, and PS Turnover packaging
- Proposal governance and internal commercial-note exclusion
- JPP, Buyer Evidence, Stakeholders, AI, Sales Manager, and Admin behavior
- SE cross-account Solution Fit and Rep+SE authorization boundaries
- Legacy financial read-time normalization

## Defect entering v6.9.49

Live v6.9.48 certification proved that ERP and application membership persisted correctly and appeared after hard refresh, while the header could remain at `ERP not selected · 0 apps in scope` immediately after the body and progress showed JDE and 17 applications. This is a browser presentation-reconciliation defect, not a persistence or identity defect.

## Outstanding certification requirements

- Supported Node 22/npm runtime observation
- Safe PostgreSQL integration and migration-level verification
- Full private R2 lifecycle and attachment authorization
- Authenticated corrective browser verification after deployment
- Remaining role, cross-customer, Field Inventory OFF, legacy-metric, and gap-label variant coverage

## Explicitly retired behavior

- Header summary rendered only during full page initialization
- Save success that refreshes body/progress but leaves the header snapshot untouched
- Failed scope save that leaves optimistic, unsaved scope visible as if governed
- Concurrent scope saves whose completion order can overwrite newer presentation state


## Deployment reconciliation against current main

The supplied v6.9.49 archive was reconciled against deployed Git parent `f5a7882cfc180ab2b966267052e4309b3b342038`. Existing deployed fixes and permanent tests missing from package ancestry were retained; `public/solution-fit.js` and `src/routes/handoffs.js` merged cleanly with the supplied changes. See `DEPLOYMENT_DIFFERENTIAL_v6.9.49.md` for the actual deployment differential and verification boundaries.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.


## v6.9.50 deployed-baseline reconciliation

The verified v6.9.50 archive was applied to current production main `474e6708e756a39444b03e637cae1ac90525341b`, preserving existing corrections and permanent regressions absent from its raw package ancestry. See `DEPLOYMENT_DIFFERENTIAL_v6.9.50.md` for the reconciliation and separately scoped Node 22 verification evidence.


## v6.9.51 deployed-baseline reconciliation

Verified archive applied to current production main `1a428bbbab88e0b35ccb2e70954479ed77031fc0` on `deploy/v6.9.51`. Existing deployed corrections, PostgreSQL fixtures and historical evidence are preserved. See `DEPLOYMENT_DIFFERENTIAL_v6.9.51.md` for reconciliation and separately scoped local Node 22 verification.


## v6.9.52 deployed-baseline reconciliation

The verified v6.9.52 archive was applied to current production main `df710ceffee9476f57b1775f2651da6baeb8c6e0`, retaining existing deployed corrections, PostgreSQL fixtures and historical evidence. See `DEPLOYMENT_DIFFERENTIAL_v6.9.52.md` for reconciliation and separately scoped local Node 22 verification.
