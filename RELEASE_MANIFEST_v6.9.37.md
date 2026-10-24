# Cloud Inventory ROI v6.9.37 Release Manifest

## Lineage

- Parent: `cloud-inventory-roi-v6.9.36-render-ready.zip`
- Parent SHA-256: `17edbfff2bcd94e0a165a4e9771a940e96447846761fdf2e3036b39d2bc09128`
- Exact extracted baseline commit: `ad9ad813191bef9601376a19e4728e9dcb9506a5`
- Target: `6.9.37`
- ROI Model: v2.8 / `modelVersion` 28, unchanged
- Brand System, Application Knowledge, Christie Persona: v1.0, unchanged

## Authorized scope

Customer-facing ROI Assumptions & Results Summary only: one server-owned saved-scenario report model; authenticated Web review; governed customer/Internal Draft PDF; customer-safe input, source, driver, methodology, overlap, and exact-result presentation; Output Registry/runtime certification; tests and release evidence.

## Database

No migration or schema change. The report reads through the existing scenario authorization and canonical Executive source loader. Database integration is covered by a disposable-PostgreSQL suite and must not be run against production customer data.

## Calculation and evidence authority

No ROI formula is added or changed. The report invokes the existing Executive Value Story once and consumes its hidden authoritative ROI result. It filters and formats active modeled inputs but never recalculates benefit, ROI, NPV, payback, contract economics, or overlap. Provenance labels remain Prospect Submitted, Customer Revalidated, Rep Confirmed, Rep Estimate, and Model Assumption without inflation.

## Active outputs

- `roi-assumptions-web` — `public/roi-assumptions-report.js`
- `roi-assumptions-pdf` — `src/exports/roi-assumptions-pdf.js`

Both consume the same server-authoritative report JSON. No Word, PowerPoint, or public-link variant is included.

## Certification evidence

See `ROI_ASSUMPTIONS_RESULTS_REPORT_v6.9.37.md`, `QA_RESULTS_v6.9.37.md`, `POSTGRES_INTEGRATION_RESULTS_v6.9.37.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.37.json`, `RELEASE_GATE_RESULTS_v6.9.37.json`, `DEPLOYMENT_VALIDATION_v6.9.37.md`, and `RELEASE_READINESS_v6.9.37.md`.
