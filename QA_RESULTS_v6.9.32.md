# v6.9.32 QA Results

## Machine gates

- Production dependency installation: PASS
- ROI engine: 34 passed, 0 failed
- Full application TAP suites: 638 passed, 0 failed, 2 skipped
- v6.9.32 focused Prospect evidence suite: 51 passed, 0 failed, 0 skipped
- v6.9.31 inherited correction suite: 99 passed, 0 failed, 0 skipped
- v6.9.30 protected Prospect workflow suite: 31 passed, 0 failed, 0 skipped
- Production locks: 289 passed, 0 failed, 0 skipped
- Brand tests: 19 passed, 0 failed, 0 skipped
- Output runtime: 26 passed, 0 failed; 25 of 25 active outputs executed and validated
- Lineage, active-output audit, generated brand assets, and generated Application Knowledge: PASS

The two full-suite skips are pre-existing database-dependent tests that require a safe `DATABASE_URL`. No safe PostgreSQL test database was available in this run, so migrations and the five registered PostgreSQL integration suites are recorded as **NOT TESTED**, not PASS. The correction does not modify server routes, SQL, schema, migrations, authorization, evidence persistence, or ROI calculations.

## Reproduced defect coverage

The focused test uses the confirmed production shape: 24 mapped review rows, 7 `APPLIED`, and 17 `AVAILABLE`. Two available rows deliberately have equal submitted and working numeric values. The shared authority still reports 17 because an equal number does not establish immutable Prospect provenance; only explicit application does.

Discovery and Calculator are verified to call the same summary and message authority. The legacy Discovery-only join over browser Value History and `activeProvenance` is absent.

## ROI and governed workflow preservation

ROI Model v2.8 tests passed, including contribution margin, overlap controls, no fabricated dollars, percentage units, contract behavior, and version gating. Prospect values remain individually applied, immutable submission boundaries remain intact, and missing verified events are not synthesized.

Machine evidence is in `RELEASE_GATE_RESULTS_v6.9.32.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.32.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.32.json`.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
