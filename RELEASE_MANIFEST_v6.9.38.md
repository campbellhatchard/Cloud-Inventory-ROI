# Cloud Inventory ROI v6.9.38 Release Manifest

## Lineage

- Parent: `cloud-inventory-roi-v6.9.37-render-ready.zip`
- Parent SHA-256: `ea4c0b157743514f0f30b4ab57076fa2423082150fa07806f2bbee52427fe7da`
- Exact deployed parent commit: `184d3667067bcaf7590dda2d60842ab0c2efb23b`
- Developer source snapshot: `7954338eca8a9a756431f65ee9de8522a310095f`
- Target: `6.9.38`
- ROI Model authority: v2.8 / `modelVersion` 28, unchanged
- Brand System, Application Knowledge, Christie Persona: v1.0, unchanged

## Authorized corrective scope

This release corrects two deployed v6.9.37 ROI Assumptions & Results defects:

1. The report modal styles were trapped inside the phone-only media query and therefore did not apply on desktop.
2. Intentionally preserved legacy saved scenarios could calculate non-zero labor, throughput, or service value while the report omitted the engine inputs because v2.8-only method flags were absent.

## Implementation

- The report modal rules now load at the document level while retaining the existing responsive rules.
- The report continues to consume the authoritative ROI engine result and never recalculates economics.
- Legacy saved scenarios retain their original authoritative economic result, show matching input and method metadata, display the saved model version, and identify legacy additive/service semantics accurately.
- A legacy v2.6/v2.7 throughput amount is read from the engine-owned `throughputSav` result only when needed for report reconciliation; no formula is reproduced in the output layer.

## Preserved authorities

- No ROI formula, saved customer value, evidence, readiness, authorization, role, API route, migration, or database schema change.
- v2.8 scenarios continue to use the same contribution-margin, overlap, provenance, and output-governance behavior.
- Web and PDF continue to use the same server-authoritative report model.

## Certification

See `QA_RESULTS_v6.9.38.md`, `BUILD_DIFFERENTIAL_AUDIT.md`, `OUTPUT_RUNTIME_RESULTS_v6.9.38.json`, `RELEASE_GATE_RESULTS_v6.9.38.json`, `DEPLOYMENT_VALIDATION_v6.9.38.md`, and `RELEASE_READINESS_v6.9.38.md`.
