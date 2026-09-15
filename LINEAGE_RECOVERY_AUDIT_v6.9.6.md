# Lineage Recovery Audit — v6.9.6

Generated before production implementation on 2026-09-05.

## Verified inputs

- Authoritative baseline: `cloud-inventory-roi-v6.9.4-render-ready.zip`
- Baseline SHA-256: `b56c737fac154928041e04732cb5c719d91bed476e781eaf3b4242d203500c54` (verified)
- Defective donor inspected only: `cloud-inventory-roi-v6.9.5-render-ready.zip`
- Donor SHA-256: `226022d40300925765bb256ef2bb535805bb639daf683694f70effb2737ff219` (verified)
- Application baseline: 6.9.4
- ROI model: v2.8 / modelVersion 28
- Migration ceiling: 036 (`036_solution_fit_cross_account.sql`)
- Brand System / Application Knowledge / Christie Persona: 1.0 / 1.0 / 1.0

## Preserve from v6.9.4

- `solution_fit_cross_account`, migration 036, `/api/solution-fit/customers`, the Solution Fit customer picker, and the narrowly scoped SE cross-account capability.
- Behavioral Solution Fit authorization and picker tests, including proof that the same entitlement does not confer general scenario access.
- Provenance-aware Executive Value Story, no generic `THREE_WHYS_LIBRARY` fallback, and fail-closed Executive Outputs.
- Removal of legacy Executive `renderExec()`, Executive 70/100/130 scaling, and output-side Cost-of-Delay arithmetic.
- Expanded production-output dependency registry and active customer-output audit.
- All permanent tests and release-governance artifacts carried through v6.9.4.
- Customer Business Case, customer-safe payload, Customer Proof, Competitive Battlecard, Champion Pack, Brand System, ROI Model v2.8, Application Knowledge, and Christie Persona invariants.

## Forward-port from v6.9.5

No donor file is safe to copy wholesale. The donor does contain useful intent in its scenario narrative and browser narrative changes: persist Three Whys metadata, load submitted Discovery evidence, and distinguish rep-authored and AI-draft narrative states. Those concepts will be reimplemented against the v6.9.4 server-owned provenance and fail-closed architecture.

## Reject from v6.9.5

- Deletion of migration 036 and the `solution_fit_cross_account` capability.
- Deletion of `/api/solution-fit/customers`, `solution-fit-picker.js`, and the SE authorization/picker behavioral tests.
- Authorization changes that remove the narrow SE cross-account Solution Fit entitlement or restore broader/legacy access behavior.
- Restoration of generic `THREE_WHYS_LIBRARY` narrative injection.
- Restoration of browser-owned Executive rendering, ROI recalculation, Cost-of-Delay arithmetic, and arbitrary scenario scaling.
- Removal of `scripts/production-output-dependencies.js` and reduction of the active-output audit.
- Removal of v6.9.2–v6.9.4 manifests, QA reports, deployment validations, readiness reports, and permanent behavioral tests.
- Regression of `BUILD_GOVERNANCE_CONTRACT.md` to a hard-coded v6.9.0 source.
- Stale v6.9.1/v6.9.0 baseline and differential audits.
- Whole-file replacements in customer-facing, authorization, Solution Fit, Executive, output, test, and release-governance paths.

## Reimplement cleanly

- v6.9.5 narrative authority: immutable submitted Prospect Discovery as customer evidence; browser-entered or AI-authored text cannot self-claim customer validation; stale/unverifiable evidence downgrades to Needs Validation.
- Server-authoritative Executive PPT, customer email, Prospect Link economics, Champion messaging, and customer-surface governance, while retaining the stronger v6.9.4 output architecture.
- v6.9.6 Rep Confirmed provenance: deliberate server action, immutable exact-value event, immediate client downgrade on change, server validation on save, legacy-state handling, Value Source & History presentation, and strict separation from customer-supported value.
- Version-neutral permanent governance, machine-readable lineage, permanent-test monotonicity, and truthful release-gate evidence.

## Decision

v6.9.6 will be constructed only from the verified v6.9.4 archive. The v6.9.5 archive is a read-only defect donor; no complete donor file will replace a v6.9.4 file.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
