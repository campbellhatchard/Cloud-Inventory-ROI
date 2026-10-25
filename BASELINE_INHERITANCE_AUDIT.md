# Deployment Inheritance Audit — v6.9.45

The Product Owner supplied `cloud-inventory-roi-v6.9.45-render-ready.zip`; its verified SHA-256 is `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`. It was extracted separately and overlaid on the exact live Git parent `d133998e94308845cfb1356bc968084effcf51c1`. The remote backup tag is `production-before-v6.9.45`. Git metadata, environment files, dependencies and the ZIP were excluded; existing historical files absent from the package were retained.

Inherited authorities remain ROI Model v2.8 / modelVersion 28, Brand System v1.0, Application Knowledge v1.0 and Christie Persona v1.0. The migration inventory remains 45 files through migration 045; no schema change is introduced. All previous output owners remain and the supplied release adds the internal PS turnover package owner, for 29 active owners.

The supplied package predates deployed v6.9.44 corrections. Forward reconciliation preserves signed create-only uploads, original object metadata, customer-bound evidence operations, atomic expired-upload cleanup, truthful deletion retries, active dependency counts, timestamp fingerprints, and their existing regressions. Render retains Node 22, `npm start`, its existing build command and migration pre-deploy command. New turnover-package review corrections and test evidence are recorded in `BUILD_DIFFERENTIAL_AUDIT.md`. Production PostgreSQL is never used for automated tests; deployed browser acceptance and physical mobile acceptance remain distinct from local/CI checks.

Historical audit follows.

# Baseline Inheritance Audit — v6.9.43

## Exact authoritative source

- Parent archive: `cloud-inventory-roi-v6.9.42-render-ready.zip`
- Parent SHA-256: `df37636c660c0e4349fbcb2e99db074c7706fdd00a705eaf6d50ad224614a96b`
- Materialized baseline commit: `a4a34de7238d82232fd6395e6fb6f57c42f2b51d`
- Baseline application/package/lineage version: `6.9.42`
- Target version: `6.9.43`

The named archive was hashed, opened directly, extracted into a fresh workspace, and committed before production changes. No earlier archive, branch, reconstructed source, abandoned v6.9.43 worktree, prototype, or unbuilt attachment feature was substituted.

## Protected authorities

- ROI Model: v2.8 / `modelVersion` 28, unchanged.
- Brand System: v1.0, unchanged.
- Application Knowledge: v1.0, unchanged.
- Christie Persona: v1.0, unchanged.
- Database migration level: 44 migrations through `044_admin_bulk_cleanup.sql`.
- Output Registry: `src/shared/output-registry.js`, with every v6.9.42 active-output contract preserved.
- Permanent regression inventory: the complete cumulative v6.9.42 test registry, preserved and extended monotonically.

## Active production paths inherited from v6.9.42

- Customer/scenario workspace: `public/customer-switcher.js` and the governed scenario loader in `public/app.js`.
- ROI calculations: shared ROI Model v2.8 authority in `src/shared/roi-engine.js`, with server projection and persistence in the scenario route/service layer.
- Executive and Proposal outputs: canonical Executive source/readiness services and registered customer/internal output builders.
- Christie and field help: governed AI endpoints plus browser state in the current active workspace.
- Solution Fit: `public/solution-fit.js` through authenticated `/api/handoffs` routes and server-owned handoff persistence.
- Sales Manager: canonical opportunity projection and stage/readiness services.

## v6.9.42 protections that must remain

- Server-owned ROI Model v2.8 formulas, overlap rules, field-inventory behavior, native currency, and null-versus-zero semantics.
- Immutable Prospect submission evidence and deliberate, individual value application.
- Buyer evidence, Rep Confirmed provenance, Value History, and historical-scenario immutability.
- Cross-account SE Solution Fit access without expanding general customer/opportunity authority.
- Solution Fit server persistence, governed/custom process IDs, saved-state output authority, and PS turnover gates.
- Executive/Proposal canonical source, readiness classification, internal-draft branding, and commercial-note exclusion.
- JPP saved-state authority, Stakeholder saved-context authority, Customer Business Case frozen publication, and Customer Email fact locking.
- Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, output registry, lineage controls, and permanent-test monotonicity.

## v6.9.42 certification evidence inherited as evidence only

- Full automated suite: 688 passed, 0 failed, 3 skipped.
- Focused v6.9.42 suite: 163 passed, 0 failed, 0 skipped.
- Production locks: 339 passed, 0 failed, 0 skipped.
- Output runtime matrix: all 28 active output IDs passed.
- Disposable PostgreSQL/HTTP integration and authenticated deployed-browser certification were not executed in the local v6.9.42 package and must not be represented as passed by inheritance.

## Authorized v6.9.43 correction boundary

This build corrects only the 14 defects confirmed by the Product Owner deployed v6.9.42 role-based regression: atomic customer/scenario/output/AI context, strict client/server ROI parity, Solution Fit readiness and app-count accuracy, side-effect-free Solution Fit reads, Three Whys microphone de-duplication, bounded Christie requests, field-help cleanup, Sales Manager row identity clarity, and the related version/evidence updates. No attachment/evidence-upload feature from the unbuilt v6.9.43 prompt is included.

## SE Solution Fit Scope

Sales Engineers retain cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario, or opportunity access.
# v6.9.44 authoritative baseline addendum

- Exact parent archive: `cloud-inventory-roi-v6.9.43-render-ready.zip`
- Verified SHA-256: `0ebdcb89683996a693ae4089533cfcd93b6a27e5e5ef2ec5e7b65e7d87e61d2a`
- Baseline application: `6.9.43`
- Target application: `6.9.44`
- ROI authority: ROI Model v2.8 / modelVersion 28, unchanged
- Brand/Application Knowledge/Christie authorities: 1.0 / 1.0 / 1.0
- Baseline migration level: 044; target adds forward-only migration 045
- Active Solution Fit path: `public/solution-fit.js` → `/api/handoffs` → `src/routes/handoffs.js` → saved `handoffs` record
- Existing attachment foundation: `handoff_attachments` from migration 027 and Admin Cleanup dependency count; no baseline storage service, evidence routes, or attachment UI
- Preserved: all v6.9.43 customer-context, saved ROI, Solution Fit readiness, alert, export, authorization, output, evidence, and AI timeout protections
- Explicitly deferred: PS Turnover evidence ZIP and document/photo appendix

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

---

# v6.9.45 authoritative baseline addendum

- Exact parent archive: `cloud-inventory-roi-v6.9.44-render-ready.zip`
- Verified SHA-256: `6bd4f6a2f51037c5b794d2f5ae2d5d29fd1516f49008b2fc1f23a520de770df9`
- Materialized baseline commit: `dbfcbcb`
- Baseline application: `6.9.44`
- Target application: `6.9.45`
- ROI authority: ROI Model v2.8 / modelVersion 28, unchanged
- Brand/Application Knowledge/Christie authorities: 1.0 / 1.0 / 1.0, unchanged
- Database migration level: 045, unchanged; no v6.9.45 migration
- Authoritative evidence repository: existing `handoff_attachments`; no second turnover attachment table
- Active Solution Fit path: `public/solution-fit.js` → authenticated handoff routes → saved `handoffs` state
- Private evidence path: authenticated attachment metadata → `src/storage/r2-storage.js` → private R2 object
- Preserved: all v6.9.44 upload, stable-context, authorization, removal, reconciliation, Customer reassignment, Admin Cleanup, ROI, output, and AI protections

The v6.9.45 change boundary is limited to consuming saved Solution Fit state and active governed attachments through one canonical turnover model, enhancing the existing internal Word output, and generating an on-demand manifest/ZIP. Generated packages are not persisted as a second source of truth.

# v6.9.46 Baseline Inheritance Audit

## Authoritative parent

- Archive: `cloud-inventory-roi-v6.9.45-render-ready(1).zip`
- SHA-256: `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`
- Parent application version: `6.9.45`
- Baseline Git commit: `6adf41b`

The exact requested filename was restored as a byte-for-byte copy of the supplied v6.9.45 release archive before extraction. The hash above was calculated before any source change. The untouched extraction was committed as the release baseline.

## Preserved authorities

- ROI Model v2.8 / `modelVersion 28`
- Brand System v1.0
- Application Knowledge v1.0
- Christie Persona v1.0
- PostgreSQL migrations and authorization boundaries
- immutable Prospect submission and Value History provenance
- SE cross-account Solution Fit authorization
- JPP and Solution Fit saved-state output authority
- Executive/Proposal readiness and audience classification
- Output Registry and true-runtime certification controls
- v6.9.45 Solution Fit evidence and PS Turnover architecture

## Correction scope

Only REG-6945-01 through REG-6945-06 are in production-code scope. REG-6945-D1 remains an investigation result with no behavioral change unless a deterministic defect is proven. No ROI formula, evidence boundary, role permission, or unrelated workflow is authorized to change.

## Pre-change evidence

See `V6_9_46_DEFECT_REPRODUCTION_MATRIX.md` and `LIVE_REGRESSION_v6.9.45_2026-10-24.md`.
