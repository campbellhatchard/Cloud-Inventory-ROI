# Baseline Inheritance Audit — v6.9.43

## Exact authoritative source

- Parent archive: `cloud-inventory-roi-v6.9.42-render-ready.zip`
- Parent SHA-256: `df37636c660c0e4349fbcb2e99db074c7706fdd00a705eaf6d50ad224614a96b`
- Materialized developer baseline commit: `a4a34de7238d82232fd6395e6fb6f57c42f2b51d`
- Deployed production parent commit: `46af1f156f4852551c4714ac6660df790a1b3709`
- Baseline application/package/lineage version: `6.9.42`
- Target version: `6.9.43`

The named archive was hashed, opened directly, and extracted into a fresh workspace. The v6.9.43 corrective delta was applied forward onto the exact deployed v6.9.42 production commit so production-only release corrections, safeguards, and evidence remain intact. No earlier archive, abandoned worktree, prototype, or unbuilt attachment feature was substituted.

## Protected authorities

- ROI Model: v2.8 / `modelVersion` 28, unchanged.
- Brand System: v1.0, unchanged.
- Application Knowledge: v1.0, unchanged.
- Christie Persona: v1.0, unchanged.
- Database migration level: 44 migrations through `044_admin_bulk_cleanup.sql`.
- Output Registry: `src/shared/output-registry.js`, with every v6.9.42 active-output contract preserved.
- Permanent regression inventory: the complete cumulative production test registry, preserved and extended monotonically.

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

- Full automated suite: 728 passed, 0 failed, 3 skipped.
- Focused v6.9.42 suite: 163 passed, 0 failed, 0 skipped.
- Production locks: 379 passed, 0 failed, 0 skipped.
- Output runtime matrix: all 28 active output IDs passed.
- GitHub Node 22/PostgreSQL 16 certification and the live Render deployment succeeded for production commit `46af1f156f4852551c4714ac6660df790a1b3709`.

## Authorized v6.9.43 correction boundary

This build corrects only the 14 defects confirmed by the Product Owner deployed v6.9.42 role-based regression: atomic customer/scenario/output/AI context, strict client/server ROI parity, Solution Fit readiness and app-count accuracy, side-effect-free Solution Fit reads, Three Whys microphone de-duplication, bounded Christie requests, field-help cleanup, Sales Manager row identity clarity, and the related version/evidence updates. No attachment/evidence-upload feature from the unbuilt v6.9.43 prompt is included.

## SE Solution Fit Scope

Sales Engineers retain cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario, or opportunity access.
