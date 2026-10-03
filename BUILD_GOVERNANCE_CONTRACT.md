# PART 0 — PERMANENT BUILD GOVERNANCE CONTRACT

These rules apply to this build and MUST be carried forward unchanged into every future Cloud Inventory ROI application build prompt unless the Product Owner explicitly replaces them.

## 0.1 AUTHORITATIVE BASELINE — ABSOLUTE RULE

The authoritative source package is the exact archive and SHA explicitly specified by the current Product Owner build instruction and recorded in the current `release-lineage.json` manifest.

Do not:

- start from an archive or branch not named by the current Product Owner instruction
- merge from an older archive
- reconstruct files from memory
- substitute a “cleaner” historical build
- use another package because its tests pass
- selectively copy old implementations over newer implementations

All work must be applied FORWARD from the exact authoritative baseline.

If the authoritative package cannot be located or opened:

**STOP THE BUILD.**

Do not substitute another version.

---

# 0.17 CRITICAL PATH TESTS MUST EXECUTE BEHAVIOR

Critical-path release tests must invoke production behavior with controlled data or equivalent governed fixtures. Static source inspection alone is insufficient for customerAccess, scenarioAccess, solutionFitAccess, publication, value story, output readiness, customer-safe projection, battlecard approval, and ROI output governance. Source assertions may supplement but must not replace behavioral proof. Permanent behavioral regressions must remain in both the complete test suite and production-regression-lock suite.

# 0.18 FAIL-CLOSED CUSTOMER OUTPUT INVARIANT

If an authoritative customer-output service, adapter, or data source fails, the application must show an unavailable/error state. It may never fall back to a legacy or independently calculated customer output.

# 0.19 NO GENERIC CUSTOMER NARRATIVE FALLBACK INVARIANT

Missing customer narrative remains missing / To validate. Industry templates, AI drafts, marketing copy, and seller hypotheses may never silently become governed customer facts.

# 0.20 CUSTOMER NARRATIVE PROVENANCE INVARIANT

Every Three Why used by the Executive Value Story must preserve its actual source and validation state. Customer-supported, rep-authored, AI-drafted, historical-unknown, reviewed vendor positioning, and empty states must remain distinguishable.

---

# 0.2 VERSION INHERITANCE CONTRACT

A higher application version MUST contain all approved functionality and all unresolved corrective requirements from the authoritative prior version.

A version number increase does NOT prove that prior corrective work was incorporated.

Before changing code, create an internal inheritance checklist containing:

1. Current authoritative application version.
2. Current ROI Model version.
3. Current Brand System version.
4. Current Application Knowledge version.
5. Current Christie Persona version.
6. Features that must be preserved.
7. Previously identified release blockers.
8. Previously corrected defects that must not regress.
9. Outstanding production smoke-test requirements.
10. Explicitly retired functionality that must not reappear.

Every item must be traced into the new build.

---

# 0.3 PRODUCT OWNER FINDINGS ARE CUMULATIVE

Unresolved Product Owner audit findings remain binding until a later Product Owner audit explicitly marks them resolved.

Codex may not consider a finding resolved merely because:

- a newer version exists
- a related test passes
- similar code was changed
- the issue is not mentioned in the new feature request
- the issue came from an earlier version
- the current build has a different development focus

If a previous audit classified something as a release blocker, the new build must either:

A. Correct it and prove the correction, or  
B. Explicitly report it as still unresolved.

Never silently drop an unresolved finding.

---

# 0.4 NO SILENT REGRESSION / NO SILENT REINTRODUCTION

Before release packaging, search the full active codebase for:

- retired logic
- superseded customer-output calculations
- retired UI controls
- obsolete API paths
- deprecated output builders
- old financial formulas
- old branding implementations
- old authorization bypasses
- legacy customer-safe/public endpoints

A corrected defect is considered regressed if an older implementation remains reachable through any active route, control, export, URL, compatibility path or public API.

Dead historical documentation may remain.

Reachable legacy behavior may not.

---

# 0.5 ACTIVE PATH OVER FILE PRESENCE

Do not certify a feature because a correct implementation exists somewhere in the repository.

Certification must identify what the production application ACTUALLY executes.

For every critical workflow determine:

UI control  
→ browser function  
→ API endpoint  
→ service  
→ authoritative data source  
→ output generator  
→ delivered artifact

If an older implementation is still the active path, the feature fails regardless of whether a newer implementation also exists.

---

# 0.6 ONE AUTHORITATIVE ECONOMIC MODEL

ROI Model authority remains:

**ROI Model v2.8 / modelVersion 28**

No customer-facing output may independently recreate, scale, approximate, stress-test or reinterpret ROI economics.

Customer outputs may FORMAT governed economics.

They may not CALCULATE new economics.

Prohibited examples include:

- multiplying ROI by 70%, 100% or 130%
- multiplying annual benefit by arbitrary scenario factors
- approximate driver weighting
- browser-side benefit recalculation
- annual benefit ÷ 12 presented as Cost of Delay
- annual benefit ÷ 2 presented as delayed action
- independent customer-output payback
- independent output ROI
- creating investment assumptions to manufacture ROI
- reinterpreting inventory accuracy percentage as inventory dollars

If sensitivity economics are ever required, they must be generated by an explicitly governed ROI service and approved as part of the ROI methodology.

Do not create that feature in this release.

---

# 0.7 EXECUTIVE VALUE STORY AUTHORITY

The governing rule is:

**The Executive Value Story owns the facts. The output owns the presentation.**

All customer-facing executive outputs must consume an authoritative server-generated Executive Value Story or an explicitly frozen published derivative of it.

A browser, Word generator, PDF generator, PowerPoint generator or share page must not rebuild the value story from raw scenario data.

---

# 0.8 CUSTOMER-SAFE DATA BOUNDARY

Public/customer endpoints must use explicit allow-listed customer-safe projections.

Never expose a full internal object and rely on the browser to hide fields.

Prohibited public payloads include raw:

- `scenario.data`
- internal notes
- seller coaching
- BuyCycle evidence
- manager plans
- Competitive Intelligence research
- non-approved Customer Proof
- internal Solution Fit findings
- internal assumptions
- audit metadata not intended for customers
- internal Proposal state

Server controls what customers are allowed to receive.

---

# 0.9 OUTPUT REGISTRY MUST MATCH PRODUCTION

The Output Registry is a release control, not documentation.

For every registered output verify:

- owner file/module exists
- UI control exists if output is active
- production route matches the registry
- audience classification matches reality
- authoritative source matches reality
- readiness requirement matches reality
- output is customer/internal as declared
- export is not a no-op
- generator is reachable
- deprecated outputs are marked inactive

A registry entry pointing at a nonexistent or inactive implementation is a RELEASE FAILURE.

---

# 0.10 CUSTOMER VS INTERNAL CLASSIFICATION

Every output must explicitly be one of:

**CUSTOMER SAFE**

or

**CONFIDENTIAL — INTERNAL USE ONLY**

No ambiguous output classification.

Internal-only information may never appear in customer-safe outputs because a template accidentally reused the wrong source.

---

# 0.11 IMMUTABLE EVIDENCE / VERSION PROVENANCE

Historical customer evidence must remain immutable.

Published customer outputs must not silently change because a later scenario was created.

A link or published revision must identify the exact content that was published.

New evidence may inform a future revision.

It may not rewrite history.

---

# 0.12 RELEASE VERSION NUMBER IS NOT APPROVAL

Codex must never label a package release-ready merely because:

- build completes
- tests pass
- version increments
- ZIP is generated

Only the Product Owner assigns:

**GREEN — Ready for controlled production pilot**

**YELLOW — Pilot-ready with known non-blocking issues**

**RED — Release blockers remain**

Codex may provide test evidence but may not self-assign final Product Owner approval.

---

# 0.13 REQUIRED PRE-BUILD BASELINE AUDIT

Before modifying source, run and document:

1. exact package filename
2. application version
3. git/package version indicators
4. ROI model version
5. migration level
6. output registry
7. existing tests
8. active Customer Business Case route
9. active Executive output routes
10. active Champion Pack implementation
11. active Battlecard export
12. active Solution Fit workflow

Produce `BASELINE_INHERITANCE_AUDIT.md`. The report must prove the build started from the exact archive and SHA recorded by the current release-lineage manifest.

---

# 0.14 REQUIRED POST-BUILD DIFFERENTIAL AUDIT

Before packaging, compare the new build against the authoritative baseline.

Produce:

`BUILD_DIFFERENTIAL_AUDIT.md`

Separate changes into:

- intentionally changed
- intentionally preserved
- removed as obsolete
- migrations added
- tests added
- unresolved issues

Unexpected large-scale file replacement is a failure condition requiring investigation.

---

# 0.15 REGRESSION FIREWALL

Every release must preserve permanent tests for previously corrected critical defects.

Once a release-blocking defect receives a regression test, that test becomes part of the permanent suite.

Do not delete, skip, weaken or rewrite the test merely to make a new build pass.

If architecture legitimately changes, replace the test only with equivalent or stronger protection.

---

# 0.16 SE CROSS-ACCOUNT SOLUTION FIT INVARIANT

An active Sales Engineer discovers every active customer and can create, view, and edit its Solution Fit without ownership, team, scenario, or prior-assignment dependency. This authority is limited to the Solution Fit workflow. The same Sales Engineer does not gain broader customer, scenario, opportunity, Discovery, Buyer Evidence, Proposal, Executive output, stakeholder, Joint Project Plan, financial, or manager access unless another assigned role independently grants it.

Every future baseline audit, differential audit, release manifest, QA report, deployment validation, and readiness report must state:

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

---

## 0.21 REP CONFIRMED VALUE INVARIANT

Rep Confirmed applies to one exact value and one immutable internal confirmation event. It increases Model Confidence but never customer-supported value. If the value changes, the active Rep Confirmed state is removed until the new value is deliberately reconfirmed.

Rep Confirmed is seller-supported evidence. It is never Prospect Verified, Customer Revalidated, Buyer Evidence, customer narrative validation, or customer evidence for Executive Output Readiness.

---

## 0.22 RELEASE-LINEAGE AND TEST MONOTONICITY

Every release must include a machine-readable `release-lineage.json` that agrees with the package and release manifest. The parent archive and SHA must be those named by the current Product Owner instruction. The permanent-test manifest is cumulative: registered tests and governance invariants may not silently disappear or be weakened.

---

## 0.23 CUSTOMER-SURFACE REGISTRY INVARIANT

Any active function intentionally producing customer/prospect-facing economic, value, implementation or commitment claims must be registered as a customer-facing surface.

No customer-facing surface may independently call or reproduce ROI calculations outside its declared authoritative service.

---

## 0.24 AUTHORITATIVE OUTPUT GENERATOR INVARIANT

A governed customer-facing output may have one authoritative production generation path. Browser compatibility helpers may not reproduce an Executive document generator, economic projection, or customer-claim composition path. If the authoritative adapter or service is unavailable, the control must fail closed and must not fall back to a second generator.

---

## 0.25 NULL IS NOT ZERO INVARIANT

A missing, undefined, blank, or mathematically unavailable economic value may never be converted to zero solely through numeric coercion in a customer-facing surface. Every customer-facing financial formatter must distinguish missing, zero, numeric value, and not-achieved status.

## 0.26 GOVERNED MESSAGE FACT-LOCK INVARIANT

A customer-facing communication may expose seller-editable presentation language, but governed facts must remain locked to their authoritative application source through the final Copy, Send, or Export action. Rendering governed facts into an editable free-text field does not satisfy this rule.

## 0.27 AI CUSTOMER CLAIM INVARIANT

AI may assist presentation, but it may not originate new customer facts, customer commitments, dates, economic values, buyer validation, implementation commitments, or evidence claims. Prompt-only restrictions are insufficient.

## 0.28 SAVED-STATE CUSTOMER OUTPUT INVARIANT

If the Output Registry declares the authoritative source as a saved record, customer output must be generated from that saved record. Mutable browser state, pending autosave state, or unsaved drafts may not silently substitute for saved authority. Local changes must successfully save and reload the authoritative record or output must block.

## 0.29 OUTPUT CONTROL AVAILABILITY INVARIANT

An output action may not appear enabled when its prerequisites are not satisfied. Unsaved records, failed saves, and unavailable authoritative adapters must leave customer-output controls disabled and unable to invoke a compatibility generator.

## 0.30 NO COMPATIBILITY FALLBACK CUSTOMER GENERATOR INVARIANT

A customer output may not retain an older compatibility generator that becomes active when its authoritative path is missing or its saved-record prerequisite is absent. Customer output fails closed.

## 0.31 CROSS-FORMAT EXECUTIVE STORY INVARIANT

Every output representing the Executive Value Story or Proposal must load the same canonical Executive source and produce the same provenance and readiness interpretation for the same scenario revision. A PDF, Word, PowerPoint, email, or browser format may not implement its own evidence loader.

## 0.32 INTERNAL-DRAFT CLASSIFICATION INVARIANT

Any output offered through an Internal Draft action must use the Internal Use Only Brand System audience across the entire artifact. A draft banner on a customer-classified document is not sufficient.

## 0.33 EXECUTABLE RUNTIME-COVERAGE INVARIANT

Every active Output Registry entry must have an executable smoke test whose successful execution is recorded in the current release gate results. A file path, source regex, or nonexistent test anchor is not runtime coverage.

## 0.34 TRUE RUNTIME OUTPUT CERTIFICATION INVARIANT

A runtime smoke test must execute the same production builder, generator, route service, or document renderer used by the active Output Registry owner. An unrelated generator, generic HTML fixture, generic OOXML file, or source-pattern assertion cannot certify another output. Every active output must emit its own machine-readable execution result, and the recorded owner and authoritative source must match the Output Registry.

## 0.35 WEB DRAFT AUDIENCE INVARIANT

Any registered customer-facing Web or Preview output in Draft Only state must visually become an Internal Draft inside the rendered document. A readiness banner outside the document does not replace Internal Use Only classification within content that can be printed, copied, or captured.

## 0.36 LIVE POSTGRESQL RELEASE INVARIANT

A controlled production pilot cannot be classified GREEN when a registered PostgreSQL integration suite is skipped or NOT TESTED. Release certification requires a clean non-production PostgreSQL database, all migrations, all database integration suites, zero database test failures, and zero database skips. Automated tests must never use the production customer database.

---
## SE SOLUTION FIT DISCOVERABILITY INVARIANT

An SE-only user with no general ROI customer workspaces must receive a clear path to the dedicated Solution Fit customer selector. That path may use the independently authorized cross-account Solution Fit capability, but it must never imply or confer general customer, scenario, calculator, or opportunity access. Solution Fit create/open actions must remain visible without horizontal clipping at supported workspace widths.
## SE INTERACTIVE WORKFLOW INTEGRITY INVARIANT

SE-facing workspaces must retain the selected product and saved customer context across adjacent workflows. Discovery progress must reflect entered answers immediately. Sensitivity must use the selected contract-term NPV rather than a fixed horizon. AI Help must send canonical Application Knowledge workspace identifiers. Output actions that save before opening a browser document must preserve the initiating user gesture so the document is not silently blocked.

## SAVED WORKING-STATE INTEGRITY INVARIANT

A successful scenario save must persist every active ROI input, seller-authored Three Why narrative and its evidence metadata, and the authoritative customer-level field-inventory state. Navigation must not silently discard an explicitly applied Prospect value. Customer-level configuration persistence must complete successfully before the scenario save can report success.

## GOVERNED FILE EXPORT LIFECYCLE INVARIANT

Proposal PDF and Word must resolve from the same server-owned saved Proposal, canonical Executive Value Story, readiness, and audience decision. Customer PDF generation must produce an actual PDF response and may not depend on a browser print window. Every client export operation must have a bounded execution time, restore its controls on failure, and provide an explicit retry path. ROI Methodology PDF must report the canonical saved ROI result and may not implement independent economic calculations.

## SCENARIO / CUSTOMER IDENTITY INVARIANT

Every new scenario version must retain the canonical customer identifier of its source opportunity. An administrator saving on behalf of another user must not silently bind that scenario to an administrator-owned customer with the same display name. Historical repair may reconcile identity from scenario owner plus normalized company name, but may not alter ROI values, evidence, or authorization scope.

## GOVERNED OPERATIONAL PDF INVARIANT

Joint Project Plan, Stakeholder Map, Solution Fit, Competitive Battlecard, and Impact Map PDF controls must download an actual server-generated PDF from the registered authoritative source. They may not depend on popup timing, browser print dialogs, or an unrelated compatibility generator. Missing saved authority must fail closed with an actionable message.

## CUSTOMER WORKSPACE STATE ISOLATION INVARIANT

Changing customer or scenario must enter a loading state, clear the prior scenario identity, picker selection, transient notices, Prospect evidence cache, and AI customer context, and render only after the selected customer's authoritative record is loaded. A customer with no saved scenario must never inherit values, version labels, warnings, or KPI totals from the prior customer.

## ROI PRODUCT-NEUTRALITY INVARIANT

Cloud Inventory product selection controls solution guidance and scope; it does not independently change ROI. With identical economic inputs, CIP, MEP, and EPP must produce identical ROI Model v2.8 results. Field Inventory contributes only when its customer-level flag is explicitly enabled and may change only the governed Field Inventory value drivers and their resulting economic rollups.
