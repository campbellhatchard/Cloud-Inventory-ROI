# v6.9.52 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.52-render-ready.zip`, verified SHA-256 `9C76181C3494DF47C3B254911326709716044D1FAB485593032993D29BD0D810`.

Clean production main was pulled before work: `df710ceffee9476f57b1775f2651da6baeb8c6e0` (v6.9.51). The release is published to the existing GitHub repository `campbellhatchard/Cloud-Inventory-ROI` and main branch, which automatically deploys the existing Render `cloud-inventory-roi` service.

## Reconciliation

Applied the supplied v6.9.52 contents to current main. The exact raw v6.9.51 archive is used only as the common comparison ancestor to distinguish release edits from already deployed corrections absent from the archive ancestry. Preserved existing R2/evidence/PS Turnover protections, workspace isolation, canonical Executive semantics, null-preserving financial summaries, strict HTTP assertions, historical evidence and all PostgreSQL fixture corrections. Prior JPP server-owned edit/link authority remains intact. All new date-only production and regression files are retained.

Production changes are the shared strict date-only formatter, authenticated All Plans/prospect-link email consumers, public JPP target/milestone formatter, helper load order and release metadata. Calendar-day values stay in their existing saved representation. No schema, persistence, authorization, ownership, ROI methodology or output architecture change is introduced. The existing overdue-status calculation remains outside this narrow presentation correction.

Migration files and Render YAML remain byte-identical to deployed main. CI retains Node 22.22.0. Build, pre-deploy `npm run migrate`, direct `node server.js` start (equivalent to `npm start`), and `/health` are preserved. No production environment variable, credential, database configuration, service or Blueprint is changed. Migration level remains 045; no migration is added.

## Local verification under Node 22.22.0

- Production dependency installation passed with the existing build command.
- All 6 changed/new JavaScript files passed syntax checks.
- `npm run test:v6952`: 54 passed, no failures/skips. Coverage includes date-only/calendar validation, four timezone probes, DST/leap/year boundaries, saved list/editor parity, role rendering, 14-milestone hydration, prior JPP capability and production-integrity regressions, and the 29-output runtime matrix.
- Main non-browser package script: 692 passed, no failures; 3 database-dependent skips.
- Non-browser production locks: 361 passed, no failures/skips.
- Brand/knowledge checks and active-output audit passed in those scripts.

The last two executions disable npm lifecycle pretests only to classify local non-browser evidence separately. Normal package and CI scripts retain every mandatory pretest, the existing headless Solution Fit browser regression, PostgreSQL 16 migrations and all 15 integration suites. Local browser/PostgreSQL restrictions remain as previously recorded, with no local PASS claim. Exact-commit CI must supplement local execution. Automated tests never use the production customer database. Private R2 and authenticated deployed acceptance remain separate boundaries, not inferred from deploy or health success. Source-package reports retain their stated scope. No final Product Owner readiness colour is assigned.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
