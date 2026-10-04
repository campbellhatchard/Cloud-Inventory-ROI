# Final Corrective Build Report — Cloud Inventory ROI v6.9.28

## 1. Executive Summary

The Update1 backlog and seven previously reproduced live defects were reconciled before correction. The build replaces competing authorities in Prospect value application, Executive output preconditions, Competitive readiness, transient overlays, Stakeholder output prerequisites, Sales Manager opportunity projection, and internal Field Help context. Visual QA subsequently found and corrected two additional output layout defects.

All available local gates pass with zero failures. All 25 active Output Registry owners executed. Twenty generated file artifacts comprising 38 rendered pages/slides were inspected. The build is not production-certified. At the Product Owner's later explicit direction, it may be packaged as a corrective deployment candidate while PostgreSQL integration and deployed v6.9.28 browser regression remain unavailable.

## 2. Authoritative Baseline

- Parent archive: `cloud-inventory-roi-v6.9.27-render-ready.zip`
- SHA-256: `19854f115ea21330e9ba595e8433a2350dc495513a451da1512a63e0fc6b78b1`
- Production parent Git commit: `ea6feb7be2b46e4f0f846984545f4aa89c1d6956`
- Developer source snapshot: `4cbc0ed3c9047fe3b5f1efec0ba508a24387ec62`
- Target version: 6.9.28
- ROI authority retained: ROI Model v2.8 / `modelVersion: 28`

## 3. Update1 Backlog Reconciliation

All 30 Update1 items appear in `FINAL_DEFECT_LEDGER.md`. None were silently removed. Locally corrected items remain BLOCKED rather than PASS when their original failure requires PostgreSQL or deployed-browser verification. Deliberately deferred architectural items remain DEFERRED with a defined next approach.

## 4. Master Defect Ledger

`FINAL_DEFECT_LEDGER.md` records severity, affected roles/workflows, original and expected behavior, prior attempts, verified layer, root cause, coverage, resolution, and explicit status. It also includes LIVE-001 through LIVE-010.

## 5. Previously Failed Defects

- Prospect value application had repeatedly been patched at the UI while the route enforced a conflicting customer-row identity.
- Executive PDF alone used a broad dirty flag, creating a format-specific block.
- Prospect modal suppression targeted the wrong overlay identity.
- Competitive preflight used browser metadata while execution used server knowledge.
- Stakeholder PDF/PPT used different empty-state rules.
- Sales Manager duplicate handling lacked both projection defense and database uniqueness.
- Field Help assumed an optional chained value was a DOM node.

The corrections consolidate authority rather than add another compatibility branch.

## 6. Root Cause Analysis

- Prospect apply: API/source-of-truth mismatch between mutable customer-row linkage and immutable opportunity `base_id` evidence.
- Executive exports: competing client preconditions.
- Overlay collision: fragmented lifecycle ownership.
- Competitive readiness: duplicate readiness implementations.
- Stakeholder exports: divergent preconditions.
- Sales Manager duplicates: missing opportunity-key de-duplication plus absent current-row database constraint.
- Field Help: non-total DOM/context construction.
- Executive PDF clipping: fixed-width metric text without wrapping.
- One-Pager crowding: unbounded title size and overlapping note/footer bands.

## 7. Alternative Solutions Considered

The architecture comparison is documented in `FINAL_DEFECT_LEDGER.md`. For each repeated failure, three approaches were assessed: relax/patch the current branch, replicate the check across paths, or introduce one canonical service/contract. Canonical opportunity evidence, shared output preconditions, total field context, server readiness, overlay ownership, and schema-backed current-opportunity uniqueness were selected because they remove competing sources of truth.

## 8. Architecture Changes

- `src/shared/prospect-value-authority.js`: one immutable opportunity-scoped apply validator.
- `public/executive-output-preconditions.js`: one cross-format saved-state contract.
- `src/shared/competitive-research-source.js`: one readiness/execution product knowledge source.
- `public/transient-overlays.js`: token-owned suspend/restore lifecycle.
- `public/operational-output-preconditions.js`: one saved Stakeholder Map prerequisite.
- `src/shared/sales-manager-deals.js` plus migration 041: projection defense and database uniqueness.
- `public/internal-field-context.js`: total allowlisted field context.

## 9. New Code Created

New shared modules, migration 041, v6.9.28 regression tests, lineage/config updates, machine evidence, defect ledger, QA report, deployment plan, readiness report, and remaining-actions report were created. No ROI formula was added or changed.

## 10. Legacy Code Retired

The active Prospect apply query no longer depends on the conflicting `discovery_sessions.customer_id` predicate. The format-specific global Executive PDF dirty check is removed. Browser-only Competitive metadata no longer independently enables server AI research. Stakeholder PPT no longer bypasses the saved-map rule. Existing inactive rollback/legacy code was not made active.

## 11. Role Regression

Local authorization and capability suites remain green, including SE Solution Fit protections and existing mixed-role production locks. A full interactive v6.9.28 ALLOW/DENY matrix was not run because v6.9.28 is not deployed. Canonical QA users were not recreated or modified.

## 12. Prospect Workflow

Local behavioral tests cover button wiring, immutable evidence retrieval, empty submissions, mapped/unmapped values, view-only behavior, safe error differentiation, and opportunity-scoped value authority. The complete link → draft → submit → review → apply → recalculate → save version → logout/login → reload lifecycle remains BLOCKED pending clean PostgreSQL and deployed browser access.

## 13. ROI Validation

ROI Model v2.8 was preserved. The 34 standalone engine checks and the full v2.8 tests pass. Coverage includes contribution margin, mutually exclusive lost-sales alternatives, bounded accuracy recovery, productivity alternatives, service penalties, first-time-fix, Field Inventory, v27 version gating, product neutrality, native currency, and server recomputation. No formula or overlap rule changed.

## 14. Persistence

Source-level persistence protections and migration definitions pass local tests. Server-authoritative scenario recomputation remains intact. PostgreSQL migrations, transaction behavior, save/reload, and logout/login persistence are NOT TESTED in this environment; therefore persistence is not certified.

## 15. AI

Internal Field Help now constructs the smallest allowlisted context for focused and unfocused fields. Competitive readiness and execution use one governed server source. Existing AI session isolation/governance tests pass. Actual provider calls, deliberate accept/save, server persistence, approval, logout/login reload, and cross-customer isolation were not executed live.

## 16. Competitive Intelligence

Product-specific knowledge remains server authoritative; RFgen and RF-SMART identity protections remain covered by existing tests. Formal output smokes execute approved Battlecard PDF and DOCX owners. Manual and AI entry through saved and approved states still require staging browser/database verification.

## 17. Customer Outputs

The runtime matrix executed the production owner for every active registry ID. All 25 passed with correct audience metadata and valid PDF/OOXML signatures where applicable. Customer and internal JPP variants, Proposal, Executive formats, Solution Fit outputs, Customer Business Case projection, Prospect preview, and Customer Value Email remain governed by their registered sources.

## 18. Document Visual QA

Generated and inspected:

- 11 PDFs / 16 pages
- 3 DOCX files / 5 pages
- 6 PPTX files / 17 slides
- 20 files / 38 rendered pages or slides total

Inspection covered branding, audience footer, margins, wrapping, clipping, charts/tables, native GBP display, customer name, Three Whys, next steps, and representative proof/long-text states. Executive PDF payback clipping and Role One-Pager title/footer crowding were found, corrected, regenerated, and visually verified. The generated QA artifacts are not intended for a release package.

## 19. PostgreSQL

`DATABASE_URL` was absent. PostgreSQL version and migrations are NOT TESTED. The four registered suites are NOT TESTED. No production database was used. Per the Live PostgreSQL Release Invariant, this alone prohibits GREEN.

## 20. Browser Runtime

The current live site is not the v6.9.28 build. Therefore interactive clicks, console/network monitoring, static-asset identity, real downloads, role matrix, and session persistence were not claimed. Deployment validation steps are in `DEPLOYMENT_VALIDATION_v6.9.28.md`.

## 21. Full Regression Results

- Dependency install: PASS
- Full suite: 600 TAP passed, 0 failed, 2 PostgreSQL-dependent skipped; 34 standalone ROI-engine checks passed
- Corrective suite: 61 passed, 0 failed, 0 skipped
- Production locks: 251 passed, 0 failed
- Brand: 19 passed, 0 failed
- Output runtime: 26 passed, including 25/25 active outputs
- Lineage, active-output audit, brand assets, application knowledge: PASS
- PostgreSQL: 4 suites and migrations NOT TESTED

## 22. Defect-by-Defect Verification

The exact local reproduction/correction status is in `FINAL_DEFECT_LEDGER.md`. LIVE-009 and LIVE-010 were verified by rendering the failing and corrected artifacts. LIVE-001 through LIVE-008 have local behavioral correction evidence but remain BLOCKED until their original deployed/database conditions are re-run.

## 23. Remaining Known Issues

Mandatory release blockers are PostgreSQL certification, full Prospect lifecycle, deployed role/browser regression, live AI persistence/governance, and actual browser download verification. The broader Update1 reliability backlog remains recorded; no unresolved item was dropped.

## 24. Deferred Items

Deferred architecture includes methodology decision IMP-002, consolidated authorization IMP-007, provenance specificity IMP-009, legacy Field Inventory gating IMP-010, currency-safe analytics IMP-011, universal economic availability IMP-012, strict input schemas IMP-013, atomic password/session service IMP-014, stage/outcome locking IMP-015, universal save/request coordinators IMP-017 through IMP-020, migration/job locking IMP-022, bounded adapters IMP-023, identity uniqueness IMP-024, collaboration concurrency IMP-025, and logout persistence coordination IMP-026.

## 25. Final Production Risks

The strongest remaining risks are unexecuted database migrations/authorization, unverified deployed persistence, potential live async/session behavior, and browser/server integration differences. Local green tests do not remove those risks. Any ZIP created before those gates is a Product Owner-directed deployment candidate, not a certified production-ready release.

## 26. Release Recommendation

Do not describe the candidate package as production-certified. Complete the clean PostgreSQL gate and the full role/Prospect/AI/output browser matrix, then update the evidence and release decision.

RED — Release blockers remain
