# Cloud Inventory ROI v6.9.48 Baseline Inheritance Audit

## Authoritative package

- Baseline archive: `cloud-inventory-roi-v6.9.47-render-ready.zip`
- Baseline SHA-256: `99815FC362B98FA30E781944251CD02FDBC66B06F2C67DAE20F4E3D287E8D8E6`
- Baseline application version: `6.9.47`
- Target application version: `6.9.48`
- `package.json` and `release-lineage.json` both identify the extracted source as 6.9.47. The release archive intentionally contains no `.git` directory.
- The archive was extracted directly into a new `work/cloud-inventory-roi-v6.9.48` directory. No earlier archive, branch, reconstructed source, or existing working folder was substituted.

## Protected authorities

- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Brand System: 1.0
- Application Knowledge: 1.0
- Christie Persona: 1.0
- Database migration level: 045
- Active output registry: 29 active production outputs, preserved
- Existing automated test inventory: 110 `*.test.js` files before v6.9.48 changes
- SE Solution Fit scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Active production paths verified before change

- Customer Business Case: `/api/business-case-shares` → `src/routes/business-case-shares.js` → frozen customer-safe publication.
- Executive Web: `switchTab('exec')` → `public/executive-output-adapters.js::renderExec()` → `/api/scenarios/:id/executive-value-story` plus `/executive-output-readiness`.
- Executive PDF/DOCX/PPTX: `/api/scenarios/:id/export-{pdf,docx,pptx}` → `executiveReportFor()` → `buildCustomerROIReportData()` → `buildExecutiveValueStory()` → format-specific export builder.
- Champion Pack / role outputs: active internal controls remain in `public/deal-export.js` and consume governed Executive story data.
- Approved Battlecard PDF/DOCX: authenticated `/api/export/battlecard-pdf` and `/api/export/battlecard-docx` routes require the current approved Battlecard revision.
- Solution Fit: `public/solution-fit.js` → authenticated `/api/handoffs` routes; stable saved identity, Primary SE, private evidence, and PS Turnover paths remain active.

## Corrective scope

This release is limited to the verified v6.9.47 Executive Web stale-state blocker:

1. Executive Web must consume one current server-owned Executive output model.
2. Automatic browser fallback from an intentionally cleared Three Why to old Prospect evidence must be removed.
3. Superseded, cross-scenario, BFCache-restored, and multi-tab Web state must not render as current.
4. The save response must expose authoritative narrative revision metadata and the browser must refetch the current model before reporting a completed Executive View save.

## Preserved v6.9.47 behavior

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

## Release blocker entering v6.9.48

Live v6.9.47 certification proved that an intentional Why Now clear persisted correctly and appeared correctly in every tested server-generated file, while Executive Web could display the prior value after refresh/navigation. The exact browser-only divergence is documented in `EXECUTIVE_WEB_STATE_LIFECYCLE_AUDIT_v6.9.48.md`.

## Outstanding certification requirements

- Supported Node 22/npm runtime observation
- Safe PostgreSQL integration and migration-level verification
- Full private R2 lifecycle and attachment authorization
- Authenticated corrective browser verification after deployment
- Remaining role, cross-customer, Field Inventory OFF, legacy-metric, and gap-label variant coverage

## Explicitly retired behavior

- Automatic `initializeThreeWhysFromEvidence()` fallback on Executive navigation
- Web rendering from separate story/readiness requests
- Same-scenario response acceptance without a request-generation check
- Reuse of an old Executive document when the current canonical request fails
- Unconditional persistence of stale editor state merely because an output is opened


## Deployment reconciliation against current main

The supplied v6.9.48 archive was reconciled with deployed Git parent `e7d231dc8e6071dc83b39239d90aebc752bdf11b`. Existing deployed corrections and permanent tests absent from the package ancestry were retained. See `DEPLOYMENT_DIFFERENTIAL_v6.9.48.md` for the actual deployment differential, the user's backup waiver and verification boundaries.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
