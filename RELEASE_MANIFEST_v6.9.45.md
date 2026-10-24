# Cloud Inventory ROI v6.9.45 Release Manifest

## Lineage

- Authoritative parent: `cloud-inventory-roi-v6.9.44-render-ready.zip`
- Parent SHA-256: `6bd4f6a2f51037c5b794d2f5ae2d5d29fd1516f49008b2fc1f23a520de770df9`
- Target: `6.9.45`
- Deployment Git parent: `d133998e94308845cfb1356bc968084effcf51c1`; backup tag: `production-before-v6.9.45`.
- Supplied v6.9.45 ZIP SHA-256: `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`; forward deployment reconciliation is documented in `BUILD_DIFFERENTIAL_AUDIT.md`.
- ROI Model: v2.8 / modelVersion 28 (unchanged)
- Brand System: v1.0 (unchanged)
- Application Knowledge: v1.0 (unchanged)
- Christie Persona: v1.0 (unchanged)

## Approved scope

This corrective feature release consumes the existing private `handoff_attachments` evidence foundation in a single canonical Professional Services turnover model. It enhances the internal Word turnover document with governed evidence references and selected image previews and adds an on-demand ZIP containing that Word document, an RFC 4180 attachment manifest, and every active evidence object in the saved snapshot.

No ROI formula, Prospect evidence rule, Customer ownership rule, Solution Fit stable identity, upload workflow, or authorization policy is changed.

## Database

- No migration is added.
- No second evidence repository or generated-package persistence table is added.
- Existing `handoff_attachments` rows remain authoritative.

## Evidence and certification

See `V6_9_44_EVIDENCE_FOUNDATION_MAP.md`, `PS_TURNOVER_EVIDENCE_INTEGRATION_REPORT_v6.9.45.md`, `QA_RESULTS_v6.9.45.md`, `POSTGRES_INTEGRATION_RESULTS_v6.9.45.json`, `R2_INTEGRATION_RESULTS_v6.9.45.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.45.json`, and `RELEASE_GATE_RESULTS_v6.9.45.json`.

Final production readiness remains the Product Owner's decision after PostgreSQL, R2, and deployed-browser certification.
