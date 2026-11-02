# Buyer Evidence Shared Record — Future Design

## Status

Deferred design only. v6.9.55 deliberately preserves the current criterion-keyed JSON evidence records and introduces no migration.

## Why a future redesign may be useful

One customer conversation can legitimately support several requirements, but the current persistence model stores a separate evidence object under each criterion key. v6.9.55 safely offers same-opportunity prefill and requires an explicit save for every target criterion. It does not create shared mutable evidence or silently apply one record to multiple criteria.

## Recommended future model

- `buyer_evidence_records`: immutable/customer-fact record with opportunity base ID, source, evidence date, stakeholder reference or governed unmapped identity, strength, customer-confirmation flag, content, creator, timestamps, and supersession metadata.
- `buyer_evidence_requirement_links`: many-to-many links from an evidence record to criterion key plus stage/config version, link actor, link timestamp, and a requirement-specific interpretation note.
- `buyer_evidence_prerequisite_snapshots`: optional immutable snapshots of derived prerequisite state at evaluation time; never the current authority.
- Current requirement completion remains evaluated by the same server criterion service against the active requirement definition, linked evidence, source records, and current prerequisites.

## Safety rules

1. Links are deliberate and auditable; no apply-all behavior.
2. Cross-customer and cross-opportunity reuse is prohibited.
3. Editing a fact creates a revision rather than mutating historical evidence.
4. Customer confirmation, strength, source, and date remain explicit attributes.
5. Historical criterion-keyed JSON remains readable through a compatibility projection.
6. A migration must be reversible, row-count reconciled, and certified on disposable PostgreSQL before deployment.
7. No redesign may change ROI Model v2.8, BuyCycle methodology, authorization, immutable Prospect submissions, or Value History.

## Decision

Do not implement this design in v6.9.55. The current scoped prefill workflow is the lowest-risk corrective solution.
