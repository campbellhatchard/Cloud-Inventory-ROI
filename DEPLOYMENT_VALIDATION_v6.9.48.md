# Deployment Validation v6.9.48

## Pre-deployment

1. Confirm the package SHA-256 matches the delivery report.
2. Deploy the archive without `.git`, `node_modules`, `.env`, `.env.local`, `__MACOSX`, or `.DS_Store`.
3. Use the existing production migration command. v6.9.48 adds no migration.
4. Confirm `/health` and Version History report `6.9.48`.

## Mandatory live authority sequence

1. Select a test customer and current scenario.
2. Save Three Whys as `A / B / C`.
3. Open Executive Web and confirm `A / B / C`.
4. Clear Why Now and save.
5. Confirm the editor remains `A / blank / C` after hard refresh.
6. Open Executive Web and confirm `A / To validate / C`; old B must be absent.
7. Generate Executive PDF, DOCX, and PPTX; confirm `To validate` and no old B.
8. Generate Proposal Preview, PDF, and DOCX; confirm `To validate` and no old B.
9. Restore Why Now as `B2 — restored dated trigger`; save and hard refresh.
10. Confirm B2 in Executive Web and all Executive/Proposal formats.
11. Change only Why Change; save and hard refresh. Confirm B2 and Why Cloud Inventory remain unchanged.

## Stale-state validation

- Use browser Back/Forward and confirm Executive Web revalidates before representing content as current.
- Open two tabs on the same scenario; save in one and confirm the other invalidates/revalidates.
- Delay one model request, start a newer request, and confirm the older response never overwrites it.
- Switch scenarios during a delayed request and confirm the old scenario never renders under the new customer.
- Simulate a model-load failure and confirm the output fails closed instead of showing stale content.

## Integration validation

- Run migrations and `npm run test:postgres` against an isolated non-production PostgreSQL database with zero failed/skipped/NOT TESTED.
- Run `npm run test:r2` against an isolated non-production R2 bucket and delete test objects afterward.
- Never run automated integration tests against production customer data.

## Decision ownership

The Product Owner assigns final GREEN/YELLOW/RED after live validation. This document does not self-certify production readiness.
