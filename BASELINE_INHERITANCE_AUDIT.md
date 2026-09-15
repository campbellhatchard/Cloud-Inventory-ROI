# v6.9.14 Baseline Inheritance Audit

- Exact parent archive: `cloud-inventory-roi-v6.9.13-render-ready.zip`
- Verified SHA-256: `4a61dbdb2c64e6968acf240f107079dc58a014c44f382fb56a4fc134999ae562`
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

Correction scope is limited to the PostgreSQL scenario creation contract: the integration request now supplies the required top-level company field, and the create response returns the persisted customer identity. All v6.9.13 permanent tests and controls remain cumulative.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
