# ROI Assumptions & Results Summary — v6.9.37 Build Report

## 1. Executive Summary

v6.9.37 adds an authenticated customer-facing **ROI Assumptions & Results Summary** in Web and PDF formats. It explains the saved inputs, actual provenance, active value drivers, approved calculation basis, modeled driver results, overlap treatment, and exact business-case totals without creating a second ROI calculator.

## 2. Authoritative Baseline

The only parent is `cloud-inventory-roi-v6.9.36-render-ready.zip`, SHA-256 `17edbfff2bcd94e0a165a4e9771a940e96447846761fdf2e3036b39d2bc09128`, committed immediately after extraction as `ad9ad813191bef9601376a19e4728e9dcb9506a5`. v6.9.35 ownership reassignment and v6.9.36 cleanup/recovery are preserved.

## 3. Existing ROI Authority

The report uses the existing path: saved authorized scenario → canonical Executive source loader → Executive Value Story → ROI Model v2.8 result. The Executive story builder may expose its already-computed result only to the server report composer through a non-enumerable field; default customer story JSON and its revision are unchanged. The browser receives a customer-safe report projection, never raw scenario JSON or a new calculator.

## 4. Input-to-Driver Data Map

The governed metadata maps active authoritative driver IDs to customer labels and approved methodology text. Runtime selection comes only from `activeValueDrivers` and the model-selected alternative method.

| Value driver | Relevant saved inputs / assumptions |
|---|---|
| Workforce Productivity | employee population, loaded labor cost, avoidable-work rate, labor recovery; or annual orders, cost per order, pick-rate improvement, throughput realization |
| Inventory Write-Off Reduction | saved annual write-offs; or inventory value and loss rate; inventory accuracy and recovery assumption |
| Inventory Carrying Benefit | inventory value, carrying rate, expected reduction, and governed inventory-turn inputs when active |
| Recovered Contribution Margin | direct lost sales, margin, service recovery; or revenue, OTIF baseline/target, margin, service recovery |
| Service Penalties and Credits | annual penalties/credits and expected reduction |
| Expedite Premium | annual emergency/expedited spend and expected reduction |
| Downtime Reduction | events, hours per event, incremental cost per hour, expected reduction |
| Inventory Count Labor | count days, participants, loaded labor cost, expected reduction |
| Order-Error Operations | annual orders, error rate, cost per error, expected reduction |
| First-Time-Fix and Truck Rolls | repeat visits, cost per truck roll, expected reduction |
| Field Inventory Leakage | field inventory value, leakage rate, expected recovery |
| Field Inventory Carrying Benefit | field inventory value, carrying rate, expected reduction |
| Field Inventory Reconciliation | locations, reconciliations, person-hours, loaded labor cost, expected reduction |
| IT Cost Displacement | annual existing-system cost and expected displacement |

Contract term, subscription, one-time investment, discount rate, implementation period, and benefit ramp appear under Contract Economics when present. Blank and unrelated values are excluded.

## 5. Provenance Model

Field state is projected without inflation: `confirmed_prospect` → Prospect Submitted; `confirmed_customer` → Customer Revalidated; `confirmed` → Rep Confirmed; other seller-entered values → Rep Estimate; explicit Cloud Inventory assumptions → Model Assumption. Existing customer-support freshness/revalidation authority determines whether prospect/customer evidence is currently supported. Rep Confirmed is presented as Rep Validated, never customer validated.

## 6. Customer-Supported vs Model Assumptions

The report shows customer-supported, rep-validated, rep-estimate, and model-assumption counts. Assumptions remain visually and semantically separate from customer-provided values. No new confidence or maturity score is invented.

## 7. Report Model Architecture

`src/shared/roi-assumptions-report.js` composes one report from the saved Executive source. `src/shared/roi-assumptions-metadata.js` contains labels and methodology only. The report selects the exact model-emitted active drivers, associates their relevant saved inputs, attaches exact model results, and fails closed unless included driver totals reconcile to Annual Customer Benefit within numeric tolerance.

## 8. Web Output

`public/roi-assumptions-report.js` formats the server model into a responsive customer-output document with identity, summary cards, evidence summary, input table, driver trace, methodology notes, audience footer, and internal Draft/Review classification. The control is beside the Executive output actions. Web code formats values but does not choose or calculate economics.

## 9. PDF Output

`src/exports/roi-assumptions-pdf.js` formats the same report model through the proven server text-PDF infrastructure. It includes brand, classification, identity, exact native-currency values, detailed inputs, structured driver blocks, methodology, page numbers, and audience footer. Long sections receive repeated continuation headings; driver blocks are kept together where possible. The filename is deterministic and customer-safe.

## 10. Formula/Methodology Presentation

Plain-language calculation bases are governed in one shared metadata file and are used by both Web and PDF through the report model. They correspond to ROI Model v2.8 methods and alternatives documented by the existing formula, methodology, questionnaire-map, Field Inventory, OTIF, and overlap authorities. No JavaScript expression, internal key, or unsupported formula is exposed.

## 11. Overlap Handling

Alternative productivity, service-revenue, and carrying/turns estimates use the model-selected method and the exact active driver result. The report explains that the governed estimate is included once. It never adds excluded alternatives. Included driver results reconcile exactly to authoritative Annual Customer Benefit or output generation fails.

## 12. Null/Zero Handling

Presence uses strict economic availability semantics. Missing investment displays **Not Modeled**; unavailable payback displays **Not Available**. Explicit zero remains zero. Tests cover null investment, zero implementation period, and numeric values.

## 13. Currency

Web uses `Intl.NumberFormat` with the scenario's native ISO currency. PDF displays the ISO code and formatted amount so the dependency-free WinAnsi writer cannot silently drop a GBP symbol. No foreign-exchange conversion or USD default is introduced. USD and GBP tests pass.

## 14. Authorization

Both routes are under the existing authenticated scenario router and call the canonical Executive source loader with `req.user` and scenario ID. Existing opportunity/scenario authorization therefore governs Rep, Sales Leader, Admin, and SE scope. No public link or expanded cross-account access is created.

## 15. Readiness

The existing Executive Output Readiness evaluator owns Ready, Review, and Draft. Ready produces customer classification. Review requires acknowledgement and remains visibly marked. Draft requires an explicit Internal Draft choice and is classified **CONFIDENTIAL — INTERNAL USE ONLY / DRAFT — NOT READY FOR CUSTOMER SHARING**. Dirty browser state is blocked before the request with the exact required save instruction.

## 16. Data Reconciliation

The deterministic test fixture compares the report summary and driver values directly with the same authoritative ROI result returned during Executive Value Story construction. Annual Customer Benefit, Total Contract Benefit, Modeled Investment, Net Benefit, Contract ROI, Payback, NPV, contract term, and native currency match. Every report input retains its saved semantic value, source, and driver association. Existing Executive, Proposal, Customer Business Case, and Customer Email owners are unchanged.

## 17. Interactive Browser Results

**NOT TESTED** locally. The required authenticated Rep workflow, direct-endpoint role matrix, live USD/GBP comparisons, console/network review, downloaded PDF opening, and cross-output comparison require an authorized deployed browser session. The exact deployment checklist is in `DEPLOYMENT_VALIDATION_v6.9.37.md`.

## 18. PDF Visual QA

A real six-page GBP PDF was generated from the production builder and rendered to page images. Every page was inspected. The fixture included a long scenario identity, many drivers and inputs, mixed provenance, large numbers, null economics, and overlap notes. Branding, Review classification, headings, wrapping, continuation headings, driver grouping, footers, and page numbering were visible with no observed clipping or overlap. Temporary PDF/images were removed before release packaging.

## 19. Runtime Output Certification

The registry contains 27 active outputs. `roi-assumptions-web` executes the production Web renderer; `roi-assumptions-pdf` executes the production PDF builder. Runtime results identify owner, production implementation, authoritative data source, audience, execution, validation, duration, and error. No generic substitute output is used.

## 20. PostgreSQL Results

**NOT TESTED** locally because `DATABASE_URL` is absent. The new suite covers a saved scenario, actual HTTP authorization, same-version report/PDF, provenance, and persistence against a disposable database. It is included in `test:postgres`. Production data must never be used for automated tests.

## 21. Build 1 Regression

v6.9.35 Customer Ownership Reassignment tests remain in the focused and permanent suites. The focused run validated eligible owners, preview, Admin-only authorization, atomic updates, unchanged ROI/evidence/history, access transition, concurrency, rollback, audit, notifications, and browser workflow: zero failures.

## 22. Build 2 Regression

v6.9.36 Admin Cleanup tests remain in the focused and permanent suites. The focused run validated date semantics, filters, stable IDs, preview fingerprints, migration contract, Admin-only routes, browser workflow, and creator persistence: zero failures. Its PostgreSQL case remains NOT TESTED without a disposable database.

## 23. Full Regression Results

The focused suite completed 112 passed, 0 failed, 1 PostgreSQL skip. The complete suite completed 664 passed, 0 failed, 3 database-dependent skips. Production locks completed 315 passed, 0 failed; Brand tests completed 19 passed, 0 failed; all 27 active outputs executed and passed. Routes, lineage, generated assets/knowledge, and output audit passed. Counts overlap because permanent gates deliberately repeat critical controls. Machine evidence is stored in `RELEASE_GATE_RESULTS_v6.9.37.json`.

## 24. Performance

Observed focused-test timings on Windows/Node 22: report model approximately 15 ms, Web runtime smoke approximately 3 ms, PDF runtime smoke approximately 20 ms, and long-content PDF approximately 26 ms. The route loads the canonical Executive source once and builds the report in memory; it adds no per-input database query and no client-side economics. These observations are not an SLA.

## 25. Files Changed

Production additions are limited to the report model, customer-safe metadata, Web renderer, PDF builder, route integration, Output Registry/readiness integration, customer-output control/style, and presentation-only PDF layout primitives. Release configuration, tests, version/lineage, governance, and evidence files are updated. No migration is added.

## 26. Known Limitations

Word, PowerPoint, and public-link output are intentionally outside scope. The dependency-free PDF uses ISO currency codes to preserve all native currencies reliably. PostgreSQL and live Render/browser validation are outstanding and must be completed before final Product Owner classification.

## 27. Release Recommendation

The source is suitable for controlled validation after all local release gates pass. Do not classify the release as production-ready until disposable-PostgreSQL integration and the deployed interactive checklist pass. Final GREEN/YELLOW/RED classification belongs to the Product Owner.
