# Cloud Inventory ROI v6.9.48 Release Manifest

## Lineage

- Target release: `6.9.48`
- Parent archive: `cloud-inventory-roi-v6.9.47-render-ready.zip`
- Parent SHA-256: `99815FC362B98FA30E781944251CD02FDBC66B06F2C67DAE20F4E3D287E8D8E6`
- ROI Model: v2.8 / `modelVersion` 28 (unchanged)
- Database migration level: 045 (unchanged; no migration added)

## Corrective scope

This release removes browser authority and stale-response races from Executive Web. One server-owned Executive output model now supplies the canonical narrative, Executive Value Story, readiness, scenario identity, and revision metadata used by Web and the existing shared file/Proposal paths. Opening an output is side-effect free; intentional clears remain unestablished; superseded, cross-scenario, BFCache-restored, and cross-tab state must revalidate before rendering.

## Production changes

- Added `src/shared/executive-output-model.js` as the single semantic composition boundary.
- Added `GET /api/scenarios/:id/executive-output-model` with private no-store headers and model revision identity.
- Narrative save responses now include canonical narrative and model revision metadata.
- Executive Web and Proposal Preview load one output model rather than independently joining story/readiness responses.
- Removed automatic Discovery fallback and navigation-triggered narrative persistence.
- Added request cancellation, generation acceptance, scenario/revision checks, BFCache/visibility revalidation, and cross-tab invalidation.

## Permanent evidence

- `test/v6948-executive-narrative-authority.test.js`
- `test/v6948-postgres-executive-authority.test.js`
- `test/browser/v6948-executive-authority.html`
- `EXECUTIVE_WEB_STATE_LIFECYCLE_AUDIT_v6.9.48.md`
- `EXECUTIVE_NARRATIVE_AUTHORITY_REPORT_v6.9.48.md`

## Certification boundary

Local source and regression evidence is recorded in `QA_RESULTS_v6.9.48.md` and `RELEASE_GATE_RESULTS_v6.9.48.json`. Safe PostgreSQL, private R2, and authenticated deployed-browser work are reported truthfully as PASS, FAIL, or NOT TESTED. Final production approval remains with the Product Owner.
