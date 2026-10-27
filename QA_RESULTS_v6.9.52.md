# QA Results — v6.9.52

Executed locally on Windows x64. The exact lockfile dependency install passed through npm `11.21.1`. The full and focused suites passed under the available local Node runtimes; the final machine-recorded run used Node `v26.12.1`, while production remains pinned to Node `22.22.0`. The supported-runtime GitHub/Render run remains an external gate. No unexecuted environment-dependent gate is represented as pass.

| Gate | Passed | Failed | Skipped | Not tested | Status |
|---|---:|---:|---:|---:|---|
| Exact production dependency install | 1 | 0 | 0 | 0 | PASS |
| Focused v6.9.52 gate | 54 | 0 | 0 | 0 | PASS |
| Full application regression (`node:test` machine count) | 752 | 0 | 3 | 0 | PASS |
| ROI engine assertions inside full regression | 34 | 0 | 0 | 0 | PASS |
| Focused v6.9.51 inherited gate | 48 | 0 | 0 | 0 | PASS |
| Focused v6.9.50 inherited gate | 141 | 0 | 0 | 0 | PASS |
| Production locks | 414 | 0 | 0 | 0 | PASS |
| Brand tests | 19 | 0 | 0 | 0 | PASS |
| Active output runtime matrix | 30 | 0 | 0 | 0 | PASS |
| Routes without safe PostgreSQL | 0 | 0 | 0 | 1 | NOT TESTED |
| PostgreSQL integration | 0 | 0 | 0 | 15 | NOT TESTED |
| R2 integration | 0 | 0 | 0 | 2 | NOT TESTED |
| Live Render browser acceptance | 0 | 0 | 0 | 1 | NOT TESTED |

Additional validation: 310 JavaScript files passed syntax validation. All 29 active Output Registry entries emitted an executed, passed, artifact-validated result for their registered production owner. The four internal/customer JPP PDF/PPTX owners executed successfully. A missing external service is recorded as `NOT TESTED`, never as pass.

Machine evidence: `RELEASE_GATE_RESULTS_v6.9.52.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.52.json`, `POSTGRES_INTEGRATION_RESULTS_v6.9.52.json`, and `R2_INTEGRATION_RESULTS_v6.9.52.json`.
