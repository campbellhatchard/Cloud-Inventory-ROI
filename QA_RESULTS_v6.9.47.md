# Cloud Inventory ROI v6.9.47 QA Results

## Automated results

| Gate | Passed | Failed | Skipped / NOT TESTED | Result |
|---|---:|---:|---:|---|
| Clean dependency install (`npm ci --omit=dev --no-audit --no-fund`) | 237 packages installed | 0 | Node 22 unavailable; run used Node 24.19.0 with engine warning | PASS manually |
| Full application suite | 716 | 0 | 3 skipped database cases | PASS |
| Focused v6.9.47 corrective suite | 206 | 0 | 0 | PASS |
| Production locks, including corrective pre-lock | 378 | 0 | 0 | PASS |
| Brand suite | 19 | 0 | 0 | PASS |
| Active output runtime matrix | 30 | 0 | 0 | PASS — 29/29 active outputs |
| JavaScript syntax | 298 files | 0 | 0 | PASS |
| PostgreSQL integration | 0 | 0 | 13 NOT TESTED | NOT TESTED |
| R2 integration | 0 | 0 | 2 NOT TESTED | NOT TESTED |
| Corrective controlled-browser flow | 0 | 0 | 2 fixtures NOT TESTED | NOT TESTED |

The machine-generated aggregate in `RELEASE_GATE_RESULTS_v6.9.47.json` records **3,058 passed, 0 failed, 5 skipped, and 5 NOT TESTED gate entries**. Counts include deliberate repeated permanent-release gates.

## Corrective behavior proved locally

- Explicit clear and omission are independent operations for each Three Why.
- Cleared canonical values do not rehydrate from stale compatibility mirrors or mutable Discovery fallback.
- Executive Web/PDF/DOCX/PPTX and Proposal Preview/PDF/DOCX agree on `To validate` while preserving populated siblings.
- The custom-application path contains no active `prompt()` call and uses stable non-standard identities.
- Fifteen package applications plus two custom applications remain seventeen unique rows after JSON reload; assessment remains bound to its ID.
- SE-B presentation retains SE-A as the saved Primary SE when SE-A is absent from the viewer-selectable list; the control stays locked.
- ROI Model v2.8/modelVersion 28 and all protected output, evidence, questionnaire, and authorization authorities remain unchanged.

## Environment limits

- Required runtime is Node 22.x; only Node 24.19.0 was available locally.
- No safe non-production PostgreSQL URL was supplied.
- No private R2 test credentials were supplied.
- The controlled browser blocked local fixture URLs.
- No production QA credentials or deployed v6.9.47 environment were used.

## QA recommendation

The corrective source and all locally executable regression gates pass. Deploy only as a controlled candidate, then complete PostgreSQL, R2, supported-runtime, and authenticated live-browser certification before Product Owner release approval.
