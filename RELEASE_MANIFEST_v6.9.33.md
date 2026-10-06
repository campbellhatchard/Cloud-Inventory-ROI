# Cloud Inventory ROI v6.9.33 Release Manifest

## Authoritative lineage

- Parent archive: `cloud-inventory-roi-v6.9.32-render-ready.zip`
- Parent SHA-256: `b22f9196ba9a1ed9eb94d53aa91d8325ed26f370e8de6d453a4015a74646fc6e`
- Exact deployed GitHub parent commit: `ae933586fca8966b49b04b05e5539b62ad30d7a7`
- Developer source snapshot: `7e5a076471695da9034c8c9ea5c40fdef4e446b9`
- Application version: `6.9.33`
- ROI Model: v2.8 / modelVersion 28 (unchanged)
- Brand System / Application Knowledge / Christie: v1.0 (unchanged)
- Latest migration: `042_server_authoritative_value_application.sql` (unchanged)
- Active Output Registry entries: 25 (unchanged)

## Scoped correction

Proposal PDF export is now a two-phase workflow. Save/readiness/user decision complete first; the existing 30-second deadline begins only when the authenticated file request starts. Repeat activations share one in-flight operation. The Proposal PDF route uses one response authority for real PDF bytes and governed headers, audience, readiness, and filename.

No timeout value was increased. Proposal facts, customer-safe content, Internal Draft classification, Word output, authorization, ROI calculations, other outputs, migrations, and schema are unchanged.

## Permanent evidence

- `test/v6933-proposal-pdf-timeout-correction.test.js`
- `BUILD_DIFFERENTIAL_AUDIT.md`
- `BUILD_GOVERNANCE_CONTRACT.md`
- `QA_RESULTS_v6.9.33.md`
- `RELEASE_GATE_RESULTS_v6.9.33.json`
- `OUTPUT_RUNTIME_RESULTS_v6.9.33.json`
- `POSTGRES_INTEGRATION_RESULTS_v6.9.33.json`

The Product Owner owns final release classification after deployment validation.


> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
