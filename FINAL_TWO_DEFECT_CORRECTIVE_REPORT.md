# Final Two-Defect Corrective Report — v6.9.31

## 1. Executive Summary

This correction starts from the exact Product Owner-approved v6.9.30 archive and is limited to the Sales Manager opportunity projection and Competitive Product Search semantics.

The investigation separated two different failure classes:

1. The historical Sales Manager symptom was created when an earlier double Save produced two independent opportunity lineages with identical visible labels. Version History showed one lineage at current v3 and a second lineage at current v1. The dashboard did not create the second `base_id`. Current save serialization, the database current-row constraint, and server de-duplication prevent repeated rows for one canonical identity. v6.9.31 adds one shared server/browser canonical projection, makes every count/value calculation consume it, and fixes Rep/Stage portfolio summaries so they consume the same filtered projection as the KPI and queue.
2. Competitive Product Search was an unnamed default text input dynamically inserted beside the selector. Its missing search semantics, label association, and non-credential metadata allowed browser/password-manager heuristics to treat it as a login identifier. v6.9.31 renders a labeled search control with standards-aligned non-credential metadata and applies the same semantics to the fallback without clearing user input.

No ROI, evidence, authorization, role, output, migration, or persistence methodology changed. Product Owner release classification remains separate from this engineering report.

## 2. Authoritative Baseline

- Archive: `cloud-inventory-roi-v6.9.30-render-ready.zip`
- SHA-256: `7fc2308848fc1a1a5d5c80964824ddad6e2e3b05a91083c975619247aeb4cdea`
- Deployed GitHub parent commit: `d3d848f6e6e58b15f4117456095b37b79ae220ae`
- Developer source snapshot: `ca96786c35e793ab5839299c8a80366a22ab66c2`
- Baseline version: `6.9.30`
- Target version: `6.9.31`
- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Latest inherited migration: `042_server_authoritative_value_application.sql` (unchanged)
- Active registered outputs: 25 (unchanged)

## 3. Defect 1 Reproduction

**Original condition.** A double Save in the prior live role regression produced two visually indistinguishable active opportunities. Sales Manager then displayed both in Management Focus and the inspection queue.

**Expected.** One canonical opportunity (`base_id`) contributes once to every manager result and rollup. Two different canonical IDs remain separate even when their customer, name, owner, stage, and value match.

**Before.** The displayed identity was `QA 6917 Rep Certification 2026-10-01 / QA Rep Baseline / qa_rep_6917`; each row displayed USD 360,000; the dashboard reported 2 opportunities / USD 720,000. Version History showed one current v3 lineage and another current v1 lineage, proving that two canonical groups existed.

**After.** Repeated child, version, and authorization-path rows for one `base_id` are projected once on the server and again defensively in the browser. All filtered KPI, Management Focus, team, rep, stage, and queue calculations consume that same projection. Distinct IDs are intentionally not merged by labels.

**Verification evidence.** The deterministic A/B/C fixture returns 3 canonical opportunities and USD 4,000,000 after repeated A rows are introduced. Interactive Chromium testing showed 6 canonical active opportunities on first load; searching `v6930` showed 2 in the KPI, Management Focus, queue, and Stage 2 portfolio before and after Refresh.

## 4. Defect 1 Root Cause

The first failure layer for the historical case was opportunity creation: an earlier double activation created two canonical scenario groups. The manager route later received two different `base_id` values and correctly treated them as different identities.

The current path is:

`scenarios` → `src/routes/sales-manager.js GET /dashboard` → shared `dedupeCurrentScenarioRows()` → live readiness → one deal per canonical row → browser canonical projection → filters → metrics / Management Focus / team, rep, stage views / queue.

Inherited protections preserved from v6.9.30:

- `_scenarioSaveInFlight` prevents a second in-page save request.
- The save transaction takes a same-user/company/name advisory lock.
- Same-owner/name/company saves reuse the current scenario group.
- Migration 041 enforces one active current row per `base_id`.
- The manager route projects one current row per `base_id` before readiness and deal construction.

Interactive certification exposed and corrected one additional in-scope drift: Rep and Stage summary cards were passed the unfiltered active array while the headline, KPI, Management Focus, and queue used the filtered array.

## 5. Defect 1 Alternatives Considered

1. **Deduplicate by visible labels or value — rejected.** This could merge legitimate opportunities and violates canonical identity governance.
2. **Hide duplicate DOM rows — rejected.** It would leave totals wrong and mask the authoritative source.
3. **Use one canonical `base_id` projection before all calculations — selected.** It protects both server and browser, while preserving separate IDs.
4. **Automatically merge historical lineages — rejected.** No deterministic code can infer that two separate canonical IDs are the same business opportunity without a Product Owner data decision.

## 6. Defect 1 Implementation

- Added `public/sales-manager-opportunity-authority.js`, a shared UMD production module that owns canonical identity, deterministic current-row selection, and currency-aware opportunity totals.
- `src/shared/sales-manager-deals.js` now re-exports that shared authority, so server and browser do not maintain competing de-duplication algorithms.
- `src/routes/sales-manager.js` continues to project canonical rows before readiness and deal creation.
- `public/sales-manager.js` projects the API response before storing it, replaces rather than appends on refresh, delegates totals to the shared authority, and passes the filtered canonical set to every team/rep/stage summary.
- `public/index.html` loads the authority before Sales Manager.

No SQL schema, scenario versioning, historical records, authorization, or ROI calculation changed.

## 7. Defect 1 Aggregate Reconciliation

Fixture:

- A: canonical ID A, USD 1,000,000, repeated through child/version/authorization rows
- B: canonical ID B, USD 2,000,000
- C: canonical ID C, same display labels as A, USD 1,000,000

Result:

- Canonical opportunity count: 3
- Known-value count: 3
- USD portfolio total: 4,000,000
- A contributes once
- C remains separate
- Team, rep, stage, combined filters, and repeated projection return the same canonical membership

## 8. Defect 1 Regression Results

Permanent coverage in `test/v6931-final-two-defects.test.js` verifies repeated child records, historical versions, authorization paths, count/value integrity, same-label distinct IDs, refresh replacement, and shared server/browser authority. The focused v6.9.31 gate passed 99 tests with 0 failures, 0 skipped, and 0 not tested.

**Status: FIXED — VERIFIED for canonical duplicate rows, aggregate integrity, filters, refresh, and grouped views.** The prior same-label records with different canonical IDs remain a separate data-governance decision and are not silently merged.

## 9. Defect 2 Reproduction

**Original condition.** In the earlier deployed Chromium session, Competitive Product Search displayed the signed-in username without user entry.

**Expected.** The control is recognized as search, starts empty unless the application intentionally retains a query, preserves typed/pasted text, and never persists a query as Competitive business data.

**Before.** `public/competitive-intelligence-v662.js` created an input with only an ID, class, and placeholder. It had no explicit type, name, autocomplete metadata, durable label, search role, or input semantics.

**After.** The control is a static labeled `type="search"` input named `ci-competitive-product-query`, with `autocomplete`, autocorrect, autocapitalize, and spellcheck disabled; `inputmode="search"`; `aria-controls`; and a `role="search"` container. The fallback applies the same properties. No clearing timer, mutation observer, fake credential field, paste block, or keyboard block was added.

**Verification evidence.** In the available Chromium browser the field was empty after authenticated load and after page reload, exposed search semantics/accessibility, accepted `Oracle`, returned only the Oracle product, preserved the entered value, and remained empty when revisited after reload. Runtime tests prove the query is used only on the products GET request and is absent from write payloads.

## 10. Defect 2 Root Cause

The first failing layer was HTML control semantics. The value was not read from Competitive storage or sent by a Competitive write path. Search text is used only as `q` on `GET /api/competitive-intelligence/products`; governed create/select/research/finding/approval/Battlecard writes use separate explicit fields and product IDs.

## 11. Defect 2 Alternatives Considered

1. **Only add `autocomplete="off"` to the dynamic field.** Low change, but insufficient semantic and accessibility improvement.
2. **Static labeled search control plus equivalent fallback — selected.** Deterministic semantics, durable accessible name, non-credential naming, and minimal workflow risk.
3. **Wrap the input in a search form.** Standards-valid, but adds submit/Enter behavior not present in the existing workflow.
4. **Clear after render, observe mutations, or insert fake credential inputs — rejected.** These heuristics can erase real user input and create new password-manager problems.

## 12. Defect 2 Implementation

- `public/index.html` now owns the visible labeled Product Search control.
- `public/competitive-intelligence-v662.js` centralizes control configuration for the static field and fallback.
- Existing `renderCompFilter()` GET search, product selection, create, research, findings, approved knowledge, and Battlecard code paths are unchanged.
- Search state remains transient and is never converted into governed Product data without an explicit existing action.

## 13. Defect 2 Browser Certification

Actually executed: Codex in-app Chromium browser against the local v6.9.31 application and a disposable PostgreSQL database.

Verified:

- Version 6.9.31 displayed.
- Product Search had an accessible `Product search` label and search role/type.
- Initial value was empty after authenticated navigation and reload.
- Typing `Oracle` produced the Oracle Warehouse Management result.
- Typed text remained present; normal input was not cleared.
- Search was not submitted by a form and no governed record was created.
- Navigation away and return/reload did not introduce the login identifier.
- Browser console/network behavior showed no unexplained workflow error.

Chrome, Edge, Safari/WebKit, and a browser profile with an independently configured third-party password manager were not available in this certification environment and are not claimed.

**Status: FIXED — VERIFIED in the available primary Chromium environment.** A post-deployment check with the Product Owner's original credential manager remains prudent.

## 14. Competitive Regression

Existing Competitive Intelligence, integrity, product identity, RFgen/RF-SMART isolation, AI persistence, and governance suites are included in the 99-test focused gate and the 625-test full gate. Search VM coverage verifies legitimate state preservation, GET query behavior, no automatic write, paste availability, and no clearing hacks.

## 15. Role Regression

The existing role and multi-role regression suites executed unchanged. They cover Sales Rep, Solution Engineer, Sales Leader/Manager, Admin, unioned role capabilities, team scope, shared read-only access, and cross-account isolation. Interactive certification used the disposable local Admin account; canonical production QA users were not modified or recreated.

## 16. PostgreSQL Results

- PostgreSQL: 16.15, 64-bit
- Database: disposable local `ci_v6931_test`; production was not used
- Migrations: all 42 applied/up to date; PASS
- Suites: routes, Prospect evidence, authorization, product identity, and transactional Prospect value application
- Passed: 23
- Failed: 0
- Skipped: 0
- Not tested: 0

Machine evidence: `POSTGRES_INTEGRATION_RESULTS_v6.9.31.json`.

## 17. Full Regression Results

Machine-generated final release gate:

- Production dependency install: PASS
- Full application suite: 625 passed, 0 failed, 0 skipped, 0 not tested
- v6.9.31 focused gate: 99 passed, 0 failed, 0 skipped, 0 not tested
- v6.9.30 protected workflow gate: 31 passed, 0 failed
- Production locks: 262 passed, 0 failed, 0 skipped
- Routes: 12 passed, 0 failed, 0 skipped
- Brand: 19 passed, 0 failed, 0 skipped
- Output runtime runner: 26 passed, 0 failed; all 25 active outputs executed and validated
- Lineage, active-output audit, generated brand assets, and generated application knowledge: PASS

Machine evidence: `RELEASE_GATE_RESULTS_v6.9.31.json` and `OUTPUT_RUNTIME_RESULTS_v6.9.31.json`.

## 18. Browser Runtime Findings

The first corrected browser pass uncovered a real consistency defect: with a search matching 2 opportunities, the KPI/queue displayed 2 while the Stage portfolio displayed 6. Root cause was `viewSummary(view==='team'?xs:active)`. It was corrected to `viewSummary(xs)`, protected by a permanent assertion, and rerun interactively. The final pass displayed 2 consistently in KPI, Management Focus, queue, and Stage 2, including after Refresh.

No other browser runtime defect was observed in the scoped flows.

## 19. Differential Review

- Product behavior changes are limited to Sales Manager canonical/filtered opportunity projection and Competitive Product Search semantics.
- Release metadata, evidence generators, and tests changed only to record v6.9.31.
- No ROI formula, evidence model, scenario versioning, migration, authorization grant, AI behavior, customer output, or persistence behavior changed.
- No legacy client append path, label-based de-duplication, autofill timer, hidden credential decoy, or input-clearing workaround was introduced.
- `git diff --check` passes.

## 20. Remaining Known Issues

No additional product-code defect was found in the scoped flows. The historical QA data contains same-label records with different canonical `base_id` values. They are not safely auto-mergeable. If the Product Owner confirms one is accidental, it should be remediated as an explicit audited data correction after identifying the exact canonical IDs.

Post-deployment validation should repeat the Product Owner's original password-manager profile and confirm the exact historical production opportunity records. These are deployment/data verification items, not hidden test passes.

## 21. Release Recommendation

All local code, browser, PostgreSQL, output-runtime, lineage, and full regression gates required for the build passed with zero failures, skips, or not-tested results. The validated commit and fresh package extraction must match before handoff. Per repository governance, the Product Owner—not this report—assigns the final release color after reviewing the evidence and completing the live Render check.
