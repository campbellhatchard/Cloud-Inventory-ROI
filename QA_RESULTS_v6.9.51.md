# QA Results — v6.9.51

Executed locally on Windows x64 with Node `v24.19.0` and npm `10.9.2`. The declared production engine is Node 22, so the supported-runtime workflow remains an external GitHub gate. No unexecuted environment-dependent gate is represented as PASS.

| Gate | Passed | Failed | Skipped | Not tested | Result |
|---|---:|---:|---:|---:|---|
| Focused v6.9.51 gate | 48 | 0 | 0 | 0 | PASS |
| Full application regression (`node:test` machine count) | 746 | 0 | 3 | 0 | PASS |
| ROI engine assertions inside full regression | 34 | 0 | 0 | 0 | PASS |
| Focused v6.9.50 inherited gate | 141 | 0 | 0 | 0 | PASS |
| Production locks | 408 | 0 | 0 | 0 | PASS |
| Brand tests | 19 | 0 | 0 | 0 | PASS |
| Active output runtime matrix | 30 | 0 | 0 | 0 | PASS |
| Routes without safe PostgreSQL | 0 | 0 | 0 | 1 | NOT TESTED |
| PostgreSQL integration | 0 | 0 | 0 | 15 | NOT TESTED |
| Private R2 integration | 0 | 0 | 0 | 2 | NOT TESTED |

Additional validation: 308 JavaScript files passed syntax validation; all 29 active Output Registry entries emitted an executed, passed, artifact-validated result for their registered production owner. Live authenticated owner/non-owner acceptance is `NOT TESTED` until the exact archive is deployed.

Machine evidence: `RELEASE_GATE_RESULTS_v6.9.51.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.51.json`, `POSTGRES_INTEGRATION_RESULTS_v6.9.51.json`, and `R2_INTEGRATION_RESULTS_v6.9.51.json`.
