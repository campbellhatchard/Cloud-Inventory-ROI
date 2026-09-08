# Release readiness evidence — v6.9.1

This report records release evidence and known limits. Production deployment remains subject to the guarded local gates and post-push GitHub/Render verification.

## Preserved from live v6.9.0

- Solution Fit creation/recovery and governed MEP application configuration.
- ROI Model 2.8 / modelVersion 28.
- Governed BuyCycle and evidence semantics.
- Team/customer/scenario authorization.
- Brand 1.0, Application Knowledge 1.0 and Christie Persona 1.0.
- Native-currency behavior.
- Explicit-zero ramp, Field Inventory, Medical Devices customer-input-only, contract authority, Prospect AI and Three Whys production locks.
- Full cumulative CI/regression coverage.

## Corrected in v6.9.1

- Frozen exact-version customer-safe Business Case publication.
- Independent scenario and customer permission checks before publication.
- Draft/Review/Ready publication gating with explicit Review acknowledgement.
- Legacy public raw scenario and print economics retirement.
- Customer report economics sourced from the canonical Executive Value Story.
- Approved-current Battlecard revision required for formal exports.
- Champion Pack explicitly inactive pending governed conversion.
- Output registry ownership/load/route/control integrity.
- Executive/JPP/Stakeholder customer-safe output refinements.
- Permanent active-output and frozen-publication regression gates.
- Migration 035 publication immutability contract.

## Fresh independent evidence

- Syntax: 170 source JS/CJS files, zero failures.
- ROI engine: 37/37.
- Version consistency: 6.9.1; 161 history entries well formed.
- Migration compatibility: 72/72 across 35 migrations.
- Phase 1: pass.
- v6.9.0 Solution Fit locks: 10/10.
- Permanent production locks: 14/14.
- Application Knowledge / Brand generated checks: pass.
- Active output audit: pass.
- Release-integrity suite without dependencies: 11 executed assertions passed; 2 cases could not load missing `jszip`/`docx` modules.
- Cumulative `npm test` without usable installed dependencies: 342 passed, 9 module-loading failures, 3 DB skips. This is not a full-suite pass.

## Mandatory deployment conditions

The deployment script must complete a fresh `npm ci`, full cumulative `npm test`, production locks, route tests, syntax/semantic guards and exact canonical-tree match before it may push. GitHub CI then applies migration 035 against PostgreSQL and reruns the cumulative suite. Render must auto-deploy the exact pushed SHA and reach `live`, followed by `/health` and publication smoke verification.

## Residual risks requiring controlled verification

- Real PostgreSQL migration/trigger execution and retention behavior.
- Full authenticated role/customer/publication matrix.
- Concurrent publication behavior.
- Render and SendGrid runtime behavior.
- All-output visual certification, particularly Word rendering and extreme/non-Latin content.

Legacy Business Case links intentionally do not silently follow newer scenario versions; republishing may be required.
