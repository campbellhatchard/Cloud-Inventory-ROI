# v6.9.17 Baseline Inheritance Audit

- Product Owner supplied archive: `cloud-inventory-roi-v6.9.17-render-ready.zip`
- Supplied archive SHA-256: `7c47e6b8ecdee18db40a60838b8d9e506fe8edf7062520c326525141d04351c6`
- Declared parent archive: `cloud-inventory-roi-v6.9.16-render-ready.zip`
- Declared parent SHA-256: `2aeab488d63a05ad6553245dadedb7279f023fb0f23de8337d6d3fa9d3b50eec`
- Parent Git commit: unavailable (`null` in `release-lineage.json`)
- Parent application version: 6.9.16
- Target application version: 6.9.17
- ROI authority: ROI Model v2.8 / modelVersion 28
- Brand System: v1.0
- Application Knowledge: v1.0
- Christie Persona: v1.0
- Latest migration: `037_rep_confirmed_value_provenance.sql`; no migration added
- Output Registry: 25 active governed outputs in `src/shared/output-registry.js`
- Customer Business Case: frozen publication through `/api/business-case-shares`
- Executive outputs: authoritative `/api/scenarios/:id/export-pdf|docx|pptx` routes and governed Web renderer
- Champion Pack: intentionally inactive pending governed conversion
- Battlecard: approved-revision PDF/Word routes remain active
- Solution Fit: dedicated customer selector, isolated SE cross-account authority, saved handoff outputs and save-before-output remain active

The supplied v6.9.17 archive is the exact input to this validation. Its declared v6.9.16 parent archive was not supplied, so the parent archive SHA and file-by-file inheritance cannot be independently re-derived in this environment. The release lineage and cumulative permanent tests lock the declared parent values. The production deployment script additionally compares the package against the current GitHub `main` tree before any push and stops if the expected production version has changed.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
