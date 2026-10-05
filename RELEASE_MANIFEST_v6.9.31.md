# Cloud Inventory ROI v6.9.31 Release Manifest

## Authoritative lineage

- Parent archive: `cloud-inventory-roi-v6.9.30-render-ready.zip`
- Parent SHA-256: `7fc2308848fc1a1a5d5c80964824ddad6e2e3b05a91083c975619247aeb4cdea`
- Deployed GitHub parent commit: `d3d848f6e6e58b15f4117456095b37b79ae220ae`
- Developer source snapshot: `ca96786c35e793ab5839299c8a80366a22ab66c2`
- Application version: `6.9.31`
- ROI Model: v2.8 / modelVersion 28
- Brand System / Application Knowledge / Christie: v1.0
- Latest migration: `042_server_authoritative_value_application.sql` (unchanged)
- Active Output Registry entries: 25 (unchanged)

## Scoped corrections

1. Sales Manager server and browser use one canonical `base_id` projection before filters, rendering, counts, and opportunity-value totals. Team, Rep, and Buying Stage summaries consume the same filtered projection as the KPI, Management Focus, and queue. Different canonical IDs remain separate even when their display labels match.
2. Competitive Product Search is a static, labeled search input with standards-aligned non-credential metadata. Its dynamic fallback applies the same semantics without clearing user input; search text remains transient GET state.

## Permanent evidence

- `test/v6931-final-two-defects.test.js`
- `FINAL_TWO_DEFECT_CORRECTIVE_REPORT.md`
- `QA_RESULTS_v6.9.31.md`
- `RELEASE_GATE_RESULTS_v6.9.31.json`
- `OUTPUT_RUNTIME_RESULTS_v6.9.31.json`
- `POSTGRES_INTEGRATION_RESULTS_v6.9.31.json`

The Product Owner owns final release classification after reviewing local, PostgreSQL, and deployed browser evidence.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
