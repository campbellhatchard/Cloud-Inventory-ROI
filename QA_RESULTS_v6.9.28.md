# QA Results — Cloud Inventory ROI v6.9.28

## Environment

- Baseline: `cloud-inventory-roi-v6.9.27-render-ready.zip`
- Baseline SHA-256: `19854f115ea21330e9ba595e8433a2350dc495513a451da1512a63e0fc6b78b1`
- Node: v22.22.0
- npm: 10.9.4
- Platform: Windows x64
- PostgreSQL: unavailable; no production database was used

## Executed gates

| Gate | Passed | Failed | Skipped | Not tested | Result |
|---|---:|---:|---:|---:|---|
| Production dependency install | command passed | 0 | 0 | 0 | PASS |
| Full test suite | 600 TAP tests plus 34 standalone ROI-engine checks | 0 | 2 PostgreSQL-dependent TAP tests | 0 | PASS locally |
| v6.9.28 corrective suite | 61 | 0 | 0 | 0 | PASS |
| Production locks | 251 | 0 | 0 | 0 | PASS |
| Brand tests | 19 | 0 | 0 | 0 | PASS |
| Active output runtime matrix | 26 (registry plus 25 outputs) | 0 | 0 | 0 | PASS |
| Active output results | 25 | 0 | 0 | 0 | PASS |
| Lineage, output audit, brand assets, application knowledge | 4 commands passed | 0 | 0 | 0 | PASS |
| PostgreSQL migrations | 0 | 0 | 0 | 1 | NOT TESTED |
| PostgreSQL integration suites | 0 | 0 | 0 | 4 | NOT TESTED |

Machine evidence is in `RELEASE_GATE_RESULTS_v6.9.28.json`, `OUTPUT_RUNTIME_RESULTS_v6.9.28.json`, and `POSTGRES_INTEGRATION_RESULTS_v6.9.28.json`.

## Corrected behaviors exercised locally

- Prospect apply authority validates immutable value event, submission, opportunity `base_id`, and canonical input without fabricating evidence.
- View-only Prospect evidence remains visible while apply actions are unavailable.
- Executive PDF, DOCX, and PPTX share one saved-state precondition.
- Prospect Evidence suspends and restores transient overlays.
- Stakeholder PDF and PPTX share one saved-map precondition.
- Competitive research readiness and execution resolve one governed product source.
- Sales Manager projection de-duplicates by opportunity; migration 041 defines database uniqueness.
- Internal Field Help handles focused and unfocused states without throwing.
- Executive PDF long payback text wraps inside its metric card.
- Role One-Pager title and authority note render without clipping/footer collision.

## Output and visual QA

The production output smokes generated 20 file artifacts: 11 PDFs, 3 DOCX files, and 6 PPTX files. Every rendered page/slide was inspected:

- PDF: 16 pages
- DOCX: 5 pages, rendered through installed Microsoft Word
- PPTX: 17 slides, rendered with the bundled presentation renderer
- Total inspected: 38 pages/slides

The first pass found two layout failures: clipped Executive PDF payback text and a crowded Role One-Pager title/footer. Both builders were corrected, regenerated, and visually re-inspected successfully. OOXML/package and PDF signature checks passed through the production runtime matrix.

This visual QA used deterministic production-builder fixtures. It does not replace downloading each file from the deployed v6.9.28 browser with a real saved opportunity.

## Required but unavailable validation

- Clean non-production PostgreSQL migrations and integration suites
- Full Prospect link lifecycle against PostgreSQL
- Multi-role ALLOW/DENY browser regression on deployed v6.9.28
- Live AI provider generation, deliberate save, reload, and approval lifecycle
- Browser console/network monitoring and actual download controls on deployed v6.9.28
- Post-deployment same-scenario cross-format reconciliation

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## QA conclusion

Local source, calculation, output-owner, and rendered-artifact gates pass with zero local failures. Certification is incomplete because database and deployed-browser gates are mandatory and NOT TESTED.
