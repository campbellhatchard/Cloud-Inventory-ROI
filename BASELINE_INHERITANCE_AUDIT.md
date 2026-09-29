# v6.9.14 Baseline Inheritance Audit

- Exact parent archive: `cloud-inventory-roi-v6.9.13-synchronized-production-baseline.zip`
- Verified SHA-256: `e0dc27c163ec52cfd50b81d1d73b9986086da5fd2177149efa0c03cbad77a048`
- Parent Git commit: `00a269fa8d373c1501bf5fc60448add4b365536b`
- Parent application version: 6.9.13
- Target application version: 6.9.14
- ROI authority: ROI Model v2.8 / modelVersion 28
- Brand System: v1.0
- Application Knowledge: v1.0
- Christie Persona: v1.0
- Latest migration: `037_rep_confirmed_value_provenance.sql`
- Output Registry: 25 active governed outputs in `src/shared/output-registry.js`
- Customer Business Case: frozen publication through `/api/business-case-shares`
- Executive outputs: authoritative `/api/scenarios/:id/export-pdf|docx|pptx` routes and governed Web renderer
- Champion Pack: intentionally inactive pending governed conversion
- Battlecard: approved-revision PDF/Word routes remain active
- Solution Fit: dedicated customer selector, SE cross-account scope, saved handoff outputs and save-before-output remain active

Correction scope is limited to Prospect Evidence review-control wiring and explicit submission-load error handling. The synchronized v6.9.13 recovery components are retained, including `public/prospect-runtime.js`, `src/shared/discovery-session-query.js`, and `test/v6913-production-recovery.test.js`. All earlier permanent tests and controls remain cumulative.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
