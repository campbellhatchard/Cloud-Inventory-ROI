# Cloud Inventory ROI v6.9.55 Regression Results

## Corrective behavior

- `commercial` completes from valid, current, criterion-specific, customer-confirmed evidence without `proposalDraft`.
- A Proposal artifact alone does not complete `commercial`.
- The v6.9.54 `proposal_alignment` correction remains intact.
- Derived requirements do not display redundant evidence forms.
- Hybrid requirements expose customer-evidence and system-prerequisite states independently.
- Save/Update language remains distinct from the customer-confirmed evidence attribute.
- Recent evidence is opportunity-scoped, prefill-only, and never completes a different criterion automatically.

## Complete requirement audit

All 28 active Stage 2–6 requirements are recorded in `BUYER_EVIDENCE_REQUIREMENT_AUDIT_v6.9.55.md`: 6 Derived, 19 Customer Evidence, and 3 Hybrid. Tests cover proof type, adaptive fields, evaluator state, blockers, authoritative source, prerequisites, summary projection, and completion behavior.

## Preserved permanent protections

The final runs passed the complete inherited gates for ROI v2.8, Proposal Alignment, JPP date-only/capability, production integrity, Solution Fit header and authorization, Executive narrative authority, Prospect immutable evidence, Value History, Rep Confirmed, Customer Business Case, Proposal/Executive outputs, Brand System, and active Output Registry owners.

## Final execution counts

- Full regression: 88 pretests + 465 main tests + 242 post/legacy/output tests; 0 failed, 0 skipped.
- Production certification locks: 88 pretests + 353 locks; 0 failed, 0 skipped.
- PostgreSQL: 76 passed, 0 failed, 0 skipped across 18 registered files on PostgreSQL 16.14 after 46 clean migrations.
- Active output runtime: 29/29 active outputs executed and passed; registry coverage test also passed (30 tests total).
- Routes: 12 passed, 0 failed, 0 skipped.
- Brand: 19 passed, 0 failed, 0 skipped.
- Focused Buyer Evidence: 32 passed, 0 failed, 0 skipped.

## Inherited integrity findings corrected during the gate

1. Admin Cleanup preview fingerprints now include PostgreSQL row-version identity, preventing an intervening update from reusing a stale preview when timestamps collide.
2. Migration 046 provides a transaction-scoped timestamp-preservation mechanism used by owner-only customer transfer and scenario-version promotion. Normal updates retain automatic `updated_at`; historical operational timestamps are no longer rewritten by those administrative transitions.
3. Historical PostgreSQL fixtures were aligned to canonical role representation and dependency-safe teardown order. No production authorization rule was weakened.

No Buyer Evidence schema migration was introduced, and no ROI formula or core methodology changed.

## Not tested

Private R2 integration and live deployed-environment acceptance remain NOT TESTED. They are external certification work, not inferred passes.

