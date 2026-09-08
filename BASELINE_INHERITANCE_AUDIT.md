# v6.9.1 baseline inheritance audit

## Authoritative production baseline

The authoritative baseline for this release is the application actually deployed to production, not an earlier developer ZIP:

- GitHub repository: `campbellhatchard/Cloud-Inventory-ROI`
- Branch: `main`
- Production commit: `19c9d9b537f8eedf593110360c876817eb107297`
- Commit message: `Deploy Cloud Inventory ROI v6.9.0`
- Production Git tree: `b050db4e2fdf89fb4d47361e0218a9d739da4b79`
- Reference validated artifact: `cloud-inventory-roi-v6.9.0-validated-render-ready.zip`
- Render: production service verified live on the same v6.9.0 commit before this release was integrated.

The v6.9.1 developer package was originally produced from `cloud-inventory-roi-v6.9.0-render-ready.zip` with SHA-256 `37361EA84BB089E49BD9FE80F4D9A4499E951D4664425F3A07A4F465E5929972` and developer baseline commit `38ede78870ddc9b6c196893f84e3fb61eb32e088`. That source is retained only as upstream package provenance. It is **not** the production baseline because the deployed v6.9.0 release had been corrected and validated after that raw package was created.

The v6.9.1 final candidate was therefore integrated forward onto the exact production v6.9.0 tree. No older application tree was substituted.

## Authority checklist before v6.9.1 changes

- Application baseline: v6.9.0 production commit above.
- ROI Model: 2.8 / `modelVersion: 28`; formulas and registries preserved.
- Brand System: 1.0; preserved.
- Application Knowledge: 1.0; preserved.
- Christie Persona: 1.0; preserved.
- Migration ceiling before this release: `034_ai_coaching_preferences.sql`.
- v6.9.0 Solution Fit creation, access, missing/removed/recovery states, MEP catalog, additional products, scope history, validation and readiness preserved.
- Permanent production regression locks preserved and adapted only where v6.9.1 intentionally retired an old path; replacement assertions are equivalent or stronger.
- Customer switching, Three Whys persistence, scenario versions, immutable evidence, governed BuyCycle, team authorization, native currency, approved proof, customer-safe AI and output classification preserved.

## v6.9.1 active-path findings

The intended v6.9.1 release corrects publication/output integrity rather than changing ROI economics:

- Customer Business Case publication is frozen at an exact scenario version and served from an explicit customer-safe payload.
- Legacy raw scenario/public share paths and browser-side economic printing are retired.
- Executive output no longer exposes the legacy scenario-scaling path.
- Champion Pack remains disabled pending governed conversion.
- Formal Battlecard exports require an approved current publication revision.
- Customer output registry ownership and runtime entrypoints are validated.

## Integration correction applied

A direct comparison of the raw v6.9.1 package with live v6.9.0 production found stale production-critical code inherited from the raw developer v6.9.0 baseline. The final candidate was rebuilt/integrated onto production and retains the live implementations for explicit-zero ramp handling, Field Inventory semantics, Medical Devices customer-input-only policy, Three Whys authenticated persistence, contract-term server authority, Prospect AI bounding, cumulative CI coverage and production locks.

This audit does not claim that PostgreSQL migration 035, live authentication, SendGrid or Render deployment have already been exercised for v6.9.1. Those remain controlled deployment gates.
