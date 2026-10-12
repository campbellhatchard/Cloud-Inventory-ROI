# QA Results — v6.9.37

## Result

All locally executable focused tests pass with zero failures. Complete release-gate counts are machine-generated in `RELEASE_GATE_RESULTS_v6.9.37.json`. Database-dependent and live-browser validations remain explicitly **NOT TESTED** until a disposable PostgreSQL instance and authorized deployed browser session are available.

## Focused validation

| Gate | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---|
| Full test suite | 704 | 0 | 3 | PASS; database cases NOT TESTED |
| v6.9.37 + Build 1 + Build 2 + UI + ROI + runtime | 113 | 0 | 1 | PASS; PostgreSQL case NOT TESTED |
| Active output runtime matrix | 28 | 0 | 0 | PASS; registry check plus 27 real active outputs |
| Production locks | 355 | 0 | 0 | PASS |
| Brand tests | 19 | 0 | 0 | PASS |

The v6.9.37 tests validate exact authoritative totals, driver reconciliation, relevant-input filtering, multi-input semantics, accurate provenance, null versus zero, decimal values, USD/GBP, Ready/Review/Draft classification, long PDF content, saved/dirty-state behavior, routes, output registration, and absence of a second ROI engine.

Lineage, active-output path audit, generated Brand assets, generated Application Knowledge, route loading, version consistency, and production dependency installation also passed. Counts overlap because the permanent gates intentionally rerun critical controls.

## PDF visual QA

A six-page GBP fixture was generated with a long customer/scenario identity, mixed provenance, all active drivers, large values, null economics, overlap notes, and long labels. Every rendered page was inspected. Logo, classification, title, identity, ISO currency, section hierarchy, wrapping, continuation headings, footers, and page numbers were visible; no clipping or overlap was observed. The temporary QA PDF and page images were removed before packaging.

## Not tested locally

- PostgreSQL version, migration execution, saved-record integration, role/customer authorization, historical-version retrieval, and provenance retrieval.
- Interactive Rep Web/PDF workflow, downloaded file opening, network/console inspection, and live USD/GBP comparison on Render.
- End-to-end deployment persistence and real customer-output access by Sales Leader/Admin/SE roles.

## Decision authority

No release colour or Production Ready claim is assigned. Final classification belongs to the Product Owner after PostgreSQL and deployed interactive validation.

## SE Solution Fit Scope

Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.

