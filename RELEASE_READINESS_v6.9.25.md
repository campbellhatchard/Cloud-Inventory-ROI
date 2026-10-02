# Release Readiness — v6.9.25

Local source and artifact validation is required before packaging. A disposable PostgreSQL integration run and the live Render checklist remain independent release gates.

## Decision authority

This document does not self-assign GREEN. The Product Owner assigns GREEN, YELLOW, or RED after reviewing machine evidence and completing live deployment validation.

## Required evidence

- `RELEASE_GATE_RESULTS_v6.9.25.json`
- `OUTPUT_RUNTIME_RESULTS_v6.9.25.json`
- `POSTGRES_INTEGRATION_RESULTS_v6.9.25.json`
- SHA-256 of `cloud-inventory-roi-v6.9.25-render-ready.zip`

If PostgreSQL is unavailable locally, its result is `NOT TESTED`; it must pass with zero failures and zero skips in the disposable CI database before a controlled production pilot can be classified GREEN.
