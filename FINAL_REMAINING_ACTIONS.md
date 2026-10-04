# Final Remaining Actions — v6.9.28

The complete item-by-item status is in `FINAL_DEFECT_LEDGER.md`. The actions below retain every unresolved Update1 item.

| Defect ID | Why unresolved | Impact / risk | Next corrective approach | Blocks release? |
|---|---|---|---|---|
| IMP-001 | Server-authoritative persistence has no PostgreSQL execution proof. | Tampered derived values or failed persistence could escape local tests. | Run save/tamper integration against disposable PostgreSQL. | Yes |
| IMP-002 | Inventory-accuracy boundary behavior needs Product Owner methodology approval. | Formula change could materially alter ROI. | Approve methodology, then add below/at/above/100% fixtures before code change. | No for unchanged v2.8; blocks changing methodology |
| IMP-003 / LIVE-001 | Prospect authority is corrected locally but full database/browser lifecycle is untested. | Prospect values may still fail to apply or persist in deployment. | Run immutable submission through apply, recalculation, version save, and reload. | Yes |
| IMP-004 | JPP authorization/FK migration not executed on PostgreSQL. | Unauthorized or invalid scenario attachment risk. | Run migration and ALLOW/DENY/FK integration. | Yes |
| IMP-005 | Driver Resonance authorization not executed on PostgreSQL. | Unauthorized write risk. | Run view-only, cross-team, and cross-account integration. | Yes |
| IMP-006 | Purge transaction/replay/rollback not tested on throwaway DB. | Destructive operation integrity risk. | Execute invalid, expired, replay, rollback, and success cases on disposable PostgreSQL. | Yes |
| IMP-007 | Authorization remains distributed. | Future scope drift and cross-customer leakage risk. | Build a canonical authorization service incrementally with parity tests. | Yes when touching affected routes |
| IMP-008 | Source guard passes; production misconfiguration is not intentionally induced. | Deployment secret risk remains operational. | Keep startup guard and validate staging configuration. | No |
| IMP-009 | ROI Maturity provenance is not method-specific. | Maturity label may overstate evidence. | Derive evidence rules from the actual productivity method. | No |
| IMP-010 | Legacy Field Inventory reconciliation fallback remains active. | Conflicting input authority risk. | Gate fallback to historical model versions only. | No |
| IMP-011 | Analytics can aggregate unlike currencies. | Misleading manager totals. | Carry/group native currency across every projection. | Yes for mixed-currency analytics decisions |
| IMP-012 | Null/zero handling is not centralized across all API/UI surfaces. | Missing economics may appear as zero. | Add shared strict availability parsing and matrix tests. | Yes for affected customer outputs |
| IMP-013 | Numeric boundary validation is permissive. | Non-finite, partial, or implausible values may persist. | Add strict schemas and governed ranges. | Yes for production hardening |
| IMP-014 | Password/session lifecycle is not one atomic service. | Stuck first-login flow and session invalidation risk. | Add transaction, row lock, single-use token, and session invalidation. | Yes if first-login defect reproduces |
| IMP-015 | Stage/outcome readiness and mutation can race. | Incorrect governed stage/outcome. | Lock opportunity revision and return explicit conflicts. | Yes for concurrent updates |
| IMP-016 / LIVE-004 | Migration 041 and concurrency behavior are not PostgreSQL-certified. | Duplicate current opportunities/counts may remain. | Apply migration to disposable DB and run concurrent promotion tests plus dashboard verification. | Yes |
| IMP-017 | No universal workspace save coordinator. | Unsaved changes may be lost outside corrected export paths. | Introduce shared dirty/flush/discard/reset contracts. | Yes for affected workflows |
| IMP-018 | Discovery autosave still uses fragile global debounce. | One question edit can cancel another save. | Implement per-question serialized save queues and navigation flush. | Yes |
| IMP-019 | Save responses lack a universal revision contract. | Older responses can overwrite newer edits. | Add revision IDs/queues and reject stale responses. | Yes |
| IMP-020 | No universal customer-switch request generation guard. | Late responses can cross-populate another customer. | Add abort/context generation across loaders. | Yes |
| IMP-021 / LIVE-002 | Shared precondition passes locally; deployed clicks are untested. | Cross-format export parity is not production-proven. | Repeat saved/dirty/narrative-only cases in staging. | Yes |
| IMP-022 | Migration and singleton job locking/checksums remain absent. | Multi-instance race risk. | Add PostgreSQL advisory locks, migration checksums, and job leases. | No for single-instance pilot; yes before scale-out |
| IMP-023 | Timeouts and outbound fetch controls are incomplete. | Hangs and unsafe outbound requests remain possible. | Centralize bounded DB/client/HTTP adapters and SSRF validation. | Yes for exposed integrations |
| IMP-024 | Case-insensitive user identity uniqueness is not enforced. | Duplicate identity/auth ambiguity. | Audit collisions, normalize, then add safe unique indexes or `citext`. | Yes before broader user rollout |
| IMP-025 | Collaborative records lack optimistic concurrency. | Silent overwrite risk. | Add revision/updated-at preconditions and merge/reload UX. | No for single-editor pilot; yes for collaboration |
| IMP-026 | Logout/session expiry is not tied to a universal persistence coordinator. | UI may imply unsaved work is safe. | Centralize 401/logout handling with flush/discard state. | Yes |
| IMP-027 / LIVE-005 | Field context passes locally; live AI invocation/persistence is untested. | Help may still fail in deployed browser or leak stale context. | Test focused/unfocused/switched fields across roles and customers. | Yes for AI readiness |
| IMP-028 / LIVE-003 | Overlay ownership passes locally; live focus/accessibility is untested. | Modal may remain hard to read/use. | Repeat with all tours/Help overlays and keyboard navigation in staging. | Yes for affected Prospect workflow |
| IMP-029 / LIVE-007/009/010 | Production builders and rendered fixtures pass; actual deployed controls are untested. | Download, retry, or server headers may still fail. | Click every control, validate signatures, inspect downloaded files. | Yes |
| IMP-030 | Database, role browser, AI, and deployed output certification remain incomplete. | Automated confidence is not production certification. | Complete staging matrix and attach evidence. | Yes |

## Packaging action

A Product Owner-directed corrective candidate ZIP may be used for the requested direct deployment, but it is not the final certified release. After the blocking rows pass, update the machine results, ledger, QA, deployment, and readiness reports from the same Git state and create the final certified archive from that state.
