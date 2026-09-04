# Release manifest — v6.9.1

Date: 2026-09-04.

## Production provenance

Authoritative baseline:

- GitHub `main` commit: `19c9d9b537f8eedf593110360c876817eb107297`
- Commit message: `Deploy Cloud Inventory ROI v6.9.0`
- Git tree: `b050db4e2fdf89fb4d47361e0218a9d739da4b79`
- Reference artifact: `cloud-inventory-roi-v6.9.0-validated-render-ready.zip`

The developer-supplied v6.9.1 ZIP was derived from the original raw v6.9.0 package SHA-256 `37361EA84BB089E49BD9FE80F4D9A4499E951D4664425F3A07A4F465E5929972` / developer commit `38ede78870ddc9b6c196893f84e3fb61eb32e088`. That lineage is recorded as upstream provenance only. It was not used as the final production baseline because it differed from the corrected v6.9.0 tree actually deployed.

The intended v6.9.1 delta was isolated and integrated onto the exact production tree before release sealing.

## Locked authorities

- Application: 6.9.1.
- ROI Model: 2.8 / `modelVersion: 28`.
- Brand System: 1.0.
- Application Knowledge: 1.0.
- Christie Persona: 1.0.
- Existing v6.9.0 Solution Fit authority preserved.
- Migration ceiling: `035_published_business_cases.sql`; migrations 001–034 preserved.
- Node production pin: 22.22.0.
- Dependency versions unchanged from production v6.9.0.

## Release scope

Frozen publication and explicit customer-safe projection; legacy public scenario sharing/printing retired; Executive scenario scaling retired; Champion Pack inactive; approved-current Battlecard revision required; report economics supplied by Executive Value Story; output/customer-safe projection corrections; output registry and permanent release-integrity gates; deterministic generated-asset line endings.

## Packaging constraints

The final sealed ZIP is produced from the reviewed corrected tree, not from a developer working directory. It must not contain `.git`, `node_modules`, `.env`, `.env.local`, `__MACOSX`, `.DS_Store` or `cloud-inventory-roi-v4_0_0`.

The companion guarded PowerShell script records and enforces the final ZIP SHA-256, file count, production baseline SHA, expected delta counts and canonical target Git tree before any commit or push.
