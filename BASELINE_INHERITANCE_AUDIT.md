# v6.9.13 Baseline Inheritance Audit

- Exact parent archive: `cloud-inventory-roi-v6.9.12-render-ready.zip`
- Verified SHA-256: `a2559fd052884c1a9f5d866799f8b111fe1b2662060aa65cea73df97707a00b8`
- Parent application version: 6.9.12
- Target application version: 6.9.13
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

Correction scope is limited to the Proposal PDF shared production builder and mandatory PostgreSQL release certification. All v6.9.12 permanent tests and controls remain cumulative.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
