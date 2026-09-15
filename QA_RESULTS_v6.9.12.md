# QA Results — v6.9.12

Machine evidence is in `RELEASE_GATE_RESULTS_v6.9.12.json`; per-output evidence is in `OUTPUT_RUNTIME_RESULTS_v6.9.12.json`.

- Full test suite: 528 passed, 0 failed, 3 skipped/NOT TESTED.
- Production locks: 172 passed, 0 failed.
- Brand tests: 19 passed, 0 failed.
- Active-output runtime matrix: 26 passed (registry check plus 25 outputs), 0 failed.
- Standalone route integration: 1 skipped/NOT TESTED because no safe `DATABASE_URL` was available.
- All remaining command gates exited 0.

Local host: Node v24.19.0 and npm 11.6.0. The application remains pinned to Node 22 for Render through its existing engine configuration. Render and SendGrid checks are not represented as local passes.
