# Release Validation — v6.8.2

## Help coverage

`HELP_COVERAGE_MAP.md` was completely regenerated with the v6.8.2 header and the required nine columns. It covers all active Application Knowledge 1.0 workspaces plus Prospect Link, Submission History, Value History, Customer Proof, Share Links, cleanup, CI administration, AI Help, and Field Help. It contains no legacy release-news rows and uses Buyer Evidence as the current workspace term. The complete map is the authoritative report attachment.

## AI capability matrix

The matrix now covers AI Help, Internal Field Help, Christie / Deal Coach, Prospect Help, Competitive Research AI, Proposal AI Enhance, and Three Whys AI Enhance. Each row documents purpose, audience, knowledge, authorized context, forbidden data, persistence, write/approval authority, customer safety, and fallback. Competitive Research may research/compare/propose but cannot approve or publish. Proposal and Three Whys enhancements cannot invent facts, economics, proof, quotes, or commitments.

## Manager coaching

Sales Manager opportunity drawer → **Coach This Deal** → loads the authorized selected scenario → `openChristieForPerspective('manager', id)` → Christie requests Manager perspective. The server validates Sales Manager/Admin eligibility and reduces spoofed requests. The launch does not grant edit permission. Sales Manager queue state remains in memory and a return snapshot preserves view, filters, KPI, advanced-filter, selected-deal, and scroll context.

## SE coaching

Solution Fit shows **Ask Christie** for Admin, SE, Solution Engineer, or Value Engineering roles. It opens the current scenario with SE perspective and offers the technical-validation coaching question. The server reduces an unauthorized SE request to Rep.

## Normal coaching

The ordinary Deal Coach navigation explicitly calls `openChristieForPerspective('rep')`, resetting any earlier Manager/SE lens. Special launch state therefore does not leak into later normal coaching.

## Competitive freshness

v6.8.1 read a nonexistent `label` from Value History freshness. v6.8.2 reuses the authoritative Competitive Intelligence freshness service: 20 days → Approved Current, 120 days → Approved Aging, and 220 days → Approved Stale. Conflicting evidence takes precedence. Recent research without an approved Battlecard remains “Recent research — not approved.”

## Value materiality

The pure normalization path is now:

`canonical input → Questionnaire ROI Registry + ROI Formula Registry → counted active driver → counted annual economic contribution → Christie priority`

Multi-input drivers associate each relevant input with the current counted driver contribution; multi-driver inputs sum distinct counted drivers. Method-dependent workforce inputs use only the selected labor or throughput method. Overlap-excluded alternatives never enter the active ledger. Raw input magnitude is never used as contribution: the regression fixture ranks a stale $500K write-off supporting $250K annual benefit ahead of current $100M revenue with no active service-value path.

## Business Case

The banner and footer now share the same methodology: customer-provided figures, documented Cloud Inventory model assumptions, and approved benchmarks where applicable. The universal “industry benchmarks” fallback wording is removed.

## SendGrid

The accepted v6.8.1 design is unchanged: both configuration values are required; `emailSent` reflects provider acceptance; `emailState` is sent, failed, or not_configured; message types and safe logs remain intact; notification failure does not roll back a business transaction.

## Tests

- Passed: **410** executed checks (37 ROI engine + 373 application/regression tests), with **0 failures** and **3 PostgreSQL-only suites skipped** because no test `DATABASE_URL` was available in the validation sandbox.
- Failed: **0**
- Skipped: **3**
- Environment-blocked: **3 PostgreSQL integration suites** because `DATABASE_URL` was unavailable; these were not reported as passed.

The locked v27 fixtures, ROI Model v2.8, questionnaire, BuyCycle, evidence, commitment, maturity, opportunity value, Value History, Prospect evidence, Proposal, proof, Executive Story/readiness, CI, Manager, Admin cleanup, Help/AI, SendGrid, Brand, and version-consistency suites passed.


## Production-baseline hardening

The final deployment candidate was reconciled against the exact live v5.8.0 Git tree before release sealing. Legacy production controls were restored where the v6 source lineage had regressed them: single early `requireAuth` initialization, explicit-zero ramp preservation, `fieldInvSav`, customer-input-only Medical Devices / Life Sciences, server-authoritative contract-term metrics, historical business-case contract recomputation, bounded/role-normalized Prospect AI history, authenticated Three Whys AI transport, final Three Whys logout persistence, and complete CI execution of the v6.8.1/v6.8.2 plus production-lock suites.

Migrations 025–034 remain additive to customer/opportunity records. Migration 026 intentionally replaces only `buycycle_stage_config` reference rows; the migration runner wraps each migration in its own PostgreSQL transaction, so failure rolls the entire file back before it is recorded as applied.
