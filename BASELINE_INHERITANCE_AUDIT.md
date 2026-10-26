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
