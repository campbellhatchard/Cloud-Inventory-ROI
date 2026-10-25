# Cloud Inventory ROI v6.9.47 Certification Corrective Report

## 1. Executive Summary

v6.9.47 is a narrow correction for three v6.9.46 certification findings: governed Three Why clear persistence, the unsupported customer-specific application `prompt()`, and a read-only Primary SE display mismatch. All locally executable application and release locks pass; external production certification remains incomplete.

## 2. Authoritative Baseline

Parent: `cloud-inventory-roi-v6.9.46-render-ready.zip`; SHA-256: `7C7E582588B8C01AF7B612C7DF4642D6089F4767541118A2B5422542BF06EE72`. The baseline was extracted into a new workspace and recorded in `release-lineage.json` before production changes.

## 3. v6.9.46 Certification Evidence Used

The Product Owner's supplied certification packet and build prompt were treated as the defect source of truth. NOT TESTED findings were not converted into source defects.

## 4. Scope

Only the three named corrective boundaries, permanent tests, version metadata, machine evidence, and release documentation changed. ROI, questionnaires, R2/evidence, PS Turnover, Buyer Evidence, authorization, Standard Package identity, and legacy-financial normalization were preserved.

## 5. REG-6945-01 Root Cause

The path did not consistently distinguish an absent field from a present blank field. Canonical resolution and the Executive Value Story also allowed legacy/Discovery fallback to refill an intentionally cleared value.

## 6. Explicit Clear vs Omitted Semantics

The server now uses property presence: absent preserves, present text replaces, and present blank/`null` writes canonical `null`. Each sibling is independent.

## 7. Canonical Narrative Correction

Canonical `executiveNarrative.threeWhys` presence outranks compatibility mirrors. A clear also clears the mirror and records unestablished metadata. Presentation resolves null to `To validate`. The client reconciles the authoritative response before displaying save success.

## 8. Cross-Format Story Results

Executive Web/PDF/DOCX/PPTX and Proposal Preview/PDF/DOCX all used the real production builders. A cleared Why Now rendered `To validate`; exact Why Change and Why Cloud Inventory values remained; stale Why Now text was absent. Result: PASS.

## 9. Custom Application prompt() Root Cause

The active creation action called native `prompt()`, which the controlled browser shell does not support and which cannot express governed save/validation state.

## 10. Modal/Form Implementation

The new accessible modal has one required Application Name, trims input, cancels without mutation, rejects blank input inline, prevents double submit, creates stable `APP-CUSTOM-*`/`non_standard` state, saves through the existing authenticated handoff route, rolls back after failure, and closes only after success.

## 11. 15 + 2 = 17 Application Results

The permanent model test creates 15 governed JDE package rows and two independently identified customer-specific rows. JSON save/reload retains 15/2/17, unique IDs, source classifications, and an assessment attached to the first custom ID. Result: PASS. Real deployed browser execution: NOT TESTED.

## 12. Primary SE Display Root Cause

The UI checked whether the assignment existed in the full SE directory but rendered a role-filtered assignable subset. When SE-A was excluded from SE-B's editable options, no selected option existed and the disabled control displayed `Not Assigned`.

## 13. Primary SE Source Reconciliation

The route still owns `handoffs.primary_se_id` and its server-derived name. The presentation helper compares the assignment with the actual rendered option list and inserts a current read-only option if necessary. It does not expand reassignment or ROI authorization.

## 14. Cross-Surface Primary SE Results

Pure production presentation tests cover Admin, SE-A, SE-B, unassigned, disabled, and inactive/filtered cases. The handoff route remains joined to the authoritative user identity. Automated result: PASS. Deployed selector/readiness/PS Turnover parity: NOT TESTED.

## 15. PostgreSQL Results

`POSTGRES_INTEGRATION_RESULTS_v6.9.47.json`: NOT TESTED. No safe `DATABASE_URL` was provided. Thirteen suites, including real narrative PATCH, custom identity, and Primary SE reload, remain pending.

## 16. R2/Evidence Certification Results

`R2_INTEGRATION_RESULTS_v6.9.47.json`: NOT TESTED because test-only credentials were unavailable. Existing attachment and PS Turnover unit/integration simulations passed; no evidence code changed.

## 17. Questionnaire FI OFF Results

The permanent exact-ID test (`REG-6945-03`) passed Field Inventory ON and OFF parity locally. Live Prospect/Discovery/Impact Map execution remains NOT TESTED. No questionnaire code changed.

## 18. Legacy Metric Certification

Legacy financial normalization tests passed and were unchanged. Live six-metric Saved Scenarios/Compare inspection remains NOT TESTED.

## 19. Gap Label Variant Results

Structured formatter tests passed, including deduplication and customer-specific identity. Live JDE/SAP/Oracle EBS/Fusion/CIP/EPP variant inspection remains NOT TESTED.

## 20. Role Certification

Automated authorization suites passed, including SE cross-account Solution Fit and combined-role boundaries. Live credential-based seven-role certification remains NOT TESTED; no credentials are stored in this release.

## 21. Security Certification

Automated scenario, customer, Solution Fit, evidence-context, and authorization denial checks passed. Live wrong-customer/wrong-attachment operations remain NOT TESTED. No authorization code was broadened.

## 22. Artifact Validation

All 29 active registry outputs executed their registered production owner. PDF signatures and DOCX/PPTX OOXML validations passed; customer/internal audiences, native currency, null semantics, and saved-state rules remained enforced.

## 23. Full Regression

Machine results: 3,058 passed, 0 failed, 5 skipped, 5 NOT TESTED gate entries. Corrective suite: 206/206. Production locks: 378/378. Brand: 19/19. Runtime matrix: 30/30 and 29/29 active outputs. JavaScript syntax: 298/298 files.

## 24. Files Changed

Production changes are limited to the Executive narrative server/client chain and Solution Fit presentation/UI files. Version, CI, release-runner, governed configuration, tests, and reports were updated for v6.9.47. `BUILD_DIFFERENTIAL_AUDIT.md` is the complete mapping.

## 25. Migrations

None. The existing JSONB representation supports canonical `null`; migration level remains 045.

## 26. Known Limitations

The available local runtime was Node 24.19.0 rather than supported Node 22.x. The first clean npm install passed; a second nested npm invocation hit an npm 10 internal exit-handler error, so machine evidence used the runner's direct-Node fallback. The controlled browser blocked local fixtures. PostgreSQL/R2/live-role credentials were unavailable.

## 27. Remaining NOT TESTED Gates

Supported Node 22, PostgreSQL migrations/integration/routes, private R2, deployed corrective browser flows, complete role matrix, live cross-customer denial, live FI OFF, evidence removal/logout, legacy six-metric UI, and gap-label variants.

## 28. Release Recommendation

Use this archive only as a controlled deployment candidate. Complete `DEPLOYMENT_VALIDATION_v6.9.47.md`; final production approval remains with the Product Owner.

YELLOW — Corrective source fixes pass but non-blocking certification gate remains incomplete
