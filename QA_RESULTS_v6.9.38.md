# QA Results — v6.9.38

## Result

All locally executable corrective and permanent regression gates pass with zero failures. Machine evidence is recorded in `RELEASE_GATE_RESULTS_v6.9.38.json` and `OUTPUT_RUNTIME_RESULTS_v6.9.38.json`. Database integration remains explicitly **NOT TESTED** because no safe disposable PostgreSQL database was available in the local environment.

## Executed validation

| Gate | Passed | Failed | Skipped / Not Tested | Result |
|---|---:|---:|---:|---|
| v6.9.38 focused ROI, UI, and calculation regression | 47 | 0 | 0 | PASS |
| Exact package full-test script | 667 | 0 | 3 skipped | PASS; database cases remain NOT TESTED |
| All repository test files, sequential | 743 | 0 | 8 skipped | PASS; database cases remain NOT TESTED |
| Production locks | 318 | 0 | 0 | PASS |
| Brand tests | 19 | 0 | 0 | PASS |
| Active output runtime matrix | 28 | 0 | 0 | PASS; registry check plus 27 production outputs |

The focused tests prove that the ROI Assumptions & Results modal has working desktop styles, v2.8 behavior is unchanged, legacy saved scenarios retain their engine-owned economics, every non-zero legacy driver has traceable inputs and an accurate method description, null and zero remain distinct, native currency is preserved, and Web/PDF report models reconcile exactly.

Lineage, active-output path audit, generated Brand assets, generated Application Knowledge, version consistency, JavaScript syntax, authenticated Proposal HTTP boundary, and all 27 active output generators also passed.

## Not tested locally

- PostgreSQL 16 version, migrations, and the nine registered database integration suites.
- Clean dependency installation, because npm is unavailable in the managed desktop runtime; the existing dependency tree was used.
- Interactive validation of the corrected desktop modal and legacy scenario on the deployed Render service.

## Decision authority

No release colour or production-ready claim is assigned. Final classification belongs to the Product Owner after CI PostgreSQL certification and deployed interactive validation.
