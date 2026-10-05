# Final Defect Ledger

## Baseline and rules

- Authoritative source archive: `cloud-inventory-roi-v6.9.27-render-ready.zip`
- Archive SHA-256: `19854f115ea21330e9ba595e8433a2350dc495513a451da1512a63e0fc6b78b1`
- Baseline Git snapshot created from the archive: `4cbc0ed3c9047fe3b5f1efec0ba508a24387ec62`
- Application baseline: v6.9.27
- ROI authority: ROI Model v2.8 / `modelVersion: 28`
- This ledger was created before production-code changes.
- Status vocabulary: `PASS`, `FAIL`, `BLOCKED`, `DEFERRED`.

## Updates1 reconciliation

The Updates1 backlog contains 30 numbered improvements. Six were claimed complete in v6.9.27; 24 were deliberately deferred. A completion claim is not accepted without behavioral proof. Database-sensitive items remain blocked from release certification until the required clean non-production PostgreSQL suite executes with zero skips.

| ID | Severity | Roles / workflow | Original symptom and expected behavior | Current actual behavior / prior attempt | Verified layer and components | Coverage / final approach | Status |
|---|---|---|---|---|---|---|---|
| IMP-001 | P0 | All roles; scenario save and every economic output | Client-computed totals could survive persistence. Every derived value must be recalculated by the canonical server engine. | v6.9.27 replaced partial recomputation and added tamper coverage. Local engine/source behavior passes; live save still requires PostgreSQL certification. | Source of truth / persistence: `src/routes/scenarios.js`, `src/shared/roi-engine.js`. | Preserve server raw-input allowlist and complete recomputation; execute PostgreSQL tamper/save tests. | BLOCKED |
| IMP-002 | P0 methodology | All economic users; inventory-accuracy driver | 99.49% and 99.5% take radically different benefit paths. Boundary methodology must be Product Owner approved and continuous when explicit inputs exist. | Deliberately deferred; discontinuity remains by design in active v2.8 code. No approved formula change exists. | ROI methodology: `src/shared/roi-engine.js`. | Obtain Product Owner methodology decision; add below/at/above/100% fixtures before changing the formula. | DEFERRED |
| IMP-003 | P0 | Prospect; Prospect economic preview | Preview could show positive ROI/payback with zero displayed benefit. Economics must reconcile to visible customer-safe drivers or be withheld. | v6.9.27 added reconciliation and tests; source behavior passes. Live full Prospect lifecycle remains incomplete because applying submitted values currently fails. | Customer-safe projection: `src/shared/prospect-roi-preview.js`. | Preserve reconciliation; re-run full Prospect lifecycle and rendered preview. | BLOCKED |
| IMP-004 | P0 authorization | Rep, Leader, Admin; JPP attachment | JPP accepted a scenario ID without canonical edit authorization. Linkage must derive from an authorized scenario and be database constrained. | v6.9.27 added canonical access and migration 040. Local tests pass; migration/authorization integration not executed against PostgreSQL. | Authorization/schema: `src/routes/maps.js`, migration 040. | Execute ALLOW/DENY and FK tests against clean PostgreSQL. | BLOCKED |
| IMP-005 | P0 authorization | Rep, Leader, Admin; Driver Resonance | Write path lacked canonical scenario edit authorization. | v6.9.27 added authorization tests locally; live/database denial paths remain uncertified. | Authorization: `src/routes/scenarios.js`. | Execute view-only, cross-team, and cross-account PostgreSQL tests. | BLOCKED |
| IMP-006 | P0 security | Admin; audit purge | Destructive confirmation referenced an undefined token and lacked atomic single-use execution. | v6.9.27 introduced GET confirmation plus transactional POST. Destructive live execution was intentionally not performed; DB replay/rollback proof is absent. | Security/transaction: `server.js`, `src/jobs/auditPurge.js`. | Run invalid, expired, replayed, unauthorized, rollback, and success cases on throwaway DB only. | BLOCKED |
| IMP-007 | P0 authorization | All internal roles; customer/team scope | Authorization queries are distributed and can include soft-deleted or inconsistently scoped records. | No canonical consolidation completed. Sales Manager duplicate live row and historical cross-customer state issues make this active risk. | Architecture / authorization: `src/authorization.js`, customer, stakeholder, map, manager routes. | Build one customer/opportunity/team authorization service; migrate routes incrementally with ALLOW/DENY parity tests. | DEFERRED |
| IMP-008 | P0 security | Deployment | Production could start with public development JWT fallback. | v6.9.27 fails production startup without a real secret; local tests pass. A real production restart without a secret is not appropriate to exercise. | Configuration: `src/middleware/auth.js`, `src/config.js`. | Preserve startup guard and CI configuration test. | PASS |
| IMP-009 | P1 accuracy | Rep, Leader; ROI Maturity | Throughput productivity can receive labor/headcount provenance. Provenance must reflect the selected method. | Unchanged and unresolved. | Provenance: `src/shared/roi-maturity.js`. | Derive evidence requirements from `productivityMethodUsed`; add labor/throughput fixtures. | DEFERRED |
| IMP-010 | P1 accuracy | All economic users; Field Inventory | Current v2.8 still accepts legacy `fieldReconcileCost`, which can conflict with governed person/hour semantics. | Active compatibility fallback remains. Live Field Inventory calculation reversibility passed, but hidden legacy input authority is uncorrected. | ROI engine / legacy path: `src/shared/roi-engine.js`, templates. | Gate fallback strictly to historical model versions; preserve historical display only. | DEFERRED |
| IMP-011 | P1 accuracy | Sales Leader, Admin; Analytics | Mixed currencies can be added or averaged because list projections omit grouping currency. | Unresolved. | Analytics/API: scenario lists, `public/features.js`. | Carry currency in every projection and group monetary rollups by native currency. | DEFERRED |
| IMP-012 | P1 accuracy | All roles and outputs | Missing economics can be coerced to zero. Null, zero, numeric, and unavailable must stay distinct. | Prior output fixes cover several surfaces, but API/UI coercion sites remain. | Economic semantics: routes, app/UI formatters, analytics. | Create shared availability parsing at server boundaries and formatters; extend matrix tests. | DEFERRED |
| IMP-013 | P1 integrity | All data-entry roles | Permissive parsing can accept partial/non-finite/out-of-range values. | Unresolved. | Validation: `src/shared/roi-engine.js`, API boundaries. | Add strict schemas and governed ranges before calculation/persistence. | DEFERRED |
| IMP-014 | P1 security | All users/Admin; password/session | Password reset, password change, session invalidation, admin reset, and deactivation are not one atomic operation. | Unresolved; first-login save has shown production hangs in prior regression. | Transactions/authentication routes. | Transaction + row lock + single-use token/session invalidation service. | DEFERRED |
| IMP-015 | P1 concurrency | Rep, Leader; stage/outcome | Readiness evaluation and stage/outcome mutation can race. | Unresolved. | Governance transaction: stage readiness and close routes. | Evaluate and commit under one locked opportunity revision; return 409 conflicts. | DEFERRED |
| IMP-016 | P1 concurrency | Rep/Admin; scenario versioning | Concurrent promotion/deletion can create multiple current scenarios. | v6.9.28 adds deterministic de-duplication and migration 041 with a partial unique index; migration execution is not certified without PostgreSQL. | Scenario persistence/schema: migration 041 and `src/shared/sales-manager-deals.js`. | Apply migration to a clean non-production PostgreSQL database, execute concurrent-promotion tests, then verify dashboard counts. | BLOCKED |
| IMP-017 | P1 persistence | All editable workspaces | Unsaved-change protection does not cover every module. | Unresolved. Live Executive PDF sees a stale dirty flag while logout/navigation gaps were previously observed. | Client state architecture: `public/customer-gate.js` and workspace modules. | Introduce one workspace coordinator with dirty/flush/discard/reset contracts. | DEFERRED |
| IMP-018 | P1 persistence | Rep/SE; Discovery | One global debounce lets later question edits cancel earlier pending saves and success can be declared without checking status. | Unresolved. | Autosave: `public/discovery.js`. | Per-question serialized save coordinator with failure state and navigation flush. | DEFERRED |
| IMP-019 | P1 concurrency | Rep/SE; Calculator, Proposal, JPP, Solution Fit | Older responses can clear dirty state or overwrite newer edits. | Partially mitigated in individual modules; no shared revision contract. | Async state management across browser modules. | Add revision IDs or serialized queues; ignore stale responses. | DEFERRED |
| IMP-020 | P1 isolation | All roles; customer/scenario switch | Late responses can populate a newly selected customer. | v6.9.26/27 addressed major switch clearing, but no universal request-generation guard exists. | Async isolation across executive, stakeholder, picker, AI, and scenario loaders. | Shared context generation + abort/discard checks. | DEFERRED |
| IMP-021 | P1 outputs | All exporting roles | Formats do not share one saved/clean precondition. | Reproduced in v6.9.27. v6.9.28 routes PDF, DOCX, and PPTX through one output-specific saved-state precondition; local behavioral coverage passes. Deployment/browser verification remains required. | Output precondition: `public/executive-output-preconditions.js`, `public/executive-output-adapters.js`. | Deploy v6.9.28 and repeat the same saved/dirty state across all three formats. | BLOCKED |
| IMP-022 | P1 infrastructure | Deployment/Admin jobs | Migrations and singleton jobs lack distributed locking/checksums. | Unresolved. | Infrastructure: `src/migrate.js`, cleanup/background jobs. | PostgreSQL advisory locks, checksums, and singleton job lease. | DEFERRED |
| IMP-023 | P1 reliability/security | All users; API/outbound integrations | Missing bounded DB/client/outbound HTTP behavior can hang or permit unsafe fetches. | Some export deadlines exist; no comprehensive adapter/timeouts. | Infrastructure and client API. | Central timeout/SSRF-safe HTTP adapter plus DB statement/lock timeouts. | DEFERRED |
| IMP-024 | P2 identity | All users/Admin | Username/email uniqueness is not guaranteed case-insensitively. | Unresolved. | Schema/auth/admin. | Audit collisions, normalize, add safe unique indexes or `citext`. | DEFERRED |
| IMP-025 | P2 collaboration | Rep/SE/Leader; JPP, Buyer Evidence, Three Whys | Collaborative saves can silently overwrite. | Unresolved. | Persistence contracts. | Revision/`updated_at` preconditions with explicit merge/reload conflict UX. | DEFERRED |
| IMP-026 | P2 persistence | All users; logout/session expiry | UI may imply data is saved when persistence failed; logout can discard dirty work. | Unresolved. | `public/src/client/api.js`, logout coordinator. | Central 401/logout handling tied to workspace flush/discard state. | DEFERRED |
| IMP-027 | P2 AI | Internal users; field-level AI Help | Intended Field Context Object is not reliably delivered. | Reproduced in v6.9.27. v6.9.28 uses a total allowlisted context builder for focused and unfocused fields; local behavior passes. Live AI invocation and persistence remain untested. | UI/context construction: `public/internal-field-context.js`, `public/assistant.js`. | Deploy and invoke Help with focused, absent, and switched fields under relevant roles. | BLOCKED |
| IMP-028 | P2 UI reliability | All browser users | Modal/lifecycle/search behavior is fragmented. | Reproduced in v6.9.27. v6.9.28 adds shared suspend/restore ownership for transient overlays; DOM behavior passes locally. Live focus, keyboard, and screen-reader behavior remain untested. | UI lifecycle: `public/transient-overlays.js`, `public/discovery.js`. | Deploy and repeat Prospect review while onboarding/Help overlays are active. | BLOCKED |
| IMP-029 | P2 output reliability | All exporting roles | Download behavior, validation, retry, and errors are inconsistent. | v6.9.28 aligns Stakeholder PDF/PPT preconditions and preserves bounded server retry for PPT; all 25 production owners execute locally and file artifacts validate. Actual browser downloads remain untested on the new build. | Output/download architecture: `public/operational-output-preconditions.js`, `public/deal-export.js`, output adapters. | Deploy and click every registered output control; verify downloaded signatures and browser failure/retry behavior. | BLOCKED |
| IMP-030 | P2 certification | Product Owner/QA | Many tests prove source shape/builders, not live browser/document behavior. | Runtime matrix improved, but PostgreSQL, full document visual QA, and current dedicated-role live regression remain incomplete. | Test/release system. | Add real-browser workflows and rendered PDF/DOCX/PPTX inspection; require Node 22 and PostgreSQL certification. | BLOCKED |

## Live v6.9.27 regression defects

| Defect | Backlog ref | Severity / roles | Original symptom and expected behavior | Current actual behavior / classification | Root cause and components | Regression coverage / final resolution | Status |
|---|---|---|---|---|---|---|---|
| LIVE-001 Prospect value application rejection | IMP-003, IMP-017, IMP-020 | Release blocker; Rep/Admin | `Use Prospect Value` must deliberately apply an immutable submitted event to the working calculator and preserve provenance. | Reproduced on two customers in v6.9.27. v6.9.28 replaces the conflicting customer-row predicate with immutable submission/opportunity authority and preserves explicit errors; local service/UI tests pass. PostgreSQL and full live Prospect lifecycle are not yet executed. | API contract/data identity: `src/shared/prospect-value-authority.js`, `src/routes/scenarios.js`, `public/features.js`. | Execute immutable submission → apply → recalculation → save/reload against clean PostgreSQL and deployed v6.9.28. | BLOCKED |
| LIVE-002 Executive PDF false dirty block | IMP-017, IMP-021, IMP-029 | High; Rep/Admin | A saved clean scenario must export equally across PDF, Word, and PowerPoint. | Reproduced in v6.9.27. The format-specific broad dirty check is removed; all three formats now use the same canonical precondition and local tests pass. Live click/retry verification is pending. | Competing client precondition: `public/executive-output-preconditions.js`, `public/executive-output-adapters.js`. | Deploy and repeat saved, calculator-dirty, and narrative-dirty cases for PDF/DOCX/PPTX. | BLOCKED |
| LIVE-003 Prospect modal/tour collision | IMP-028 | Medium; Rep/Admin | Evidence modal must remain readable and focused. | Reproduced in v6.9.27. v6.9.28 suspends all registered transient overlays with an ownership token and restores only that token's overlays; local DOM test passes. | Mismatched overlay identities: `public/transient-overlays.js`, `public/discovery.js`. | Deploy and repeat with onboarding and Help overlays active; verify focus and contrast. | BLOCKED |
| LIVE-004 Sales Manager duplicate opportunity | IMP-007, IMP-016, IMP-020, IMP-030 | High; Sales Leader/Admin | One current opportunity must appear once and count once. | Reproduced in v6.9.27. v6.9.28 adds server-side base-ID de-duplication and migration 041 uniqueness enforcement; unit behavior passes. Database migration/concurrency and live counts remain unverified. | Query/schema integrity: `src/shared/sales-manager-deals.js`, `src/routes/sales-manager.js`, migration 041. | Execute migration on clean PostgreSQL, seed duplicate/concurrent cases, and verify dashboard roll-ups. | BLOCKED |
| LIVE-005 Internal Field Help exception | IMP-027 | High; all internal roles | Field Help should explain the focused field or safely ask the user to focus one. | Reproduced in v6.9.27. Total context builder now handles no field, a real field, and a removed field without throwing; local execution passes. Live AI request/persistence remains untested. | Field context construction: `public/internal-field-context.js`, `public/assistant.js`. | Deploy and invoke Help under Rep, SE, Leader, Admin and mixed roles. | BLOCKED |
| LIVE-006 Competitive readiness contradiction | IMP-023, IMP-028, IMP-030 | High; Rep/SE/Admin | UI may say Ready only if authoritative approved canonical knowledge exists and execution can proceed. | Reproduced in v6.9.27. Readiness and execution now resolve the same server-owned product knowledge service; local available/unavailable tests pass. AI network execution and server persistence remain untested. | Source-of-truth mismatch: `src/shared/competitive-research-source.js`, `server.js`, `public/comp-research.js`. | Deploy and test canonical knowledge present/absent, manual entry, AI result, save, approval, and Battlecard export. | BLOCKED |
| LIVE-007 Empty Stakeholder PPT generic failure | IMP-021, IMP-029 | Medium; Rep/Leader/Admin | No saved stakeholder map should block before export with a specific saved-map instruction. | Reproduced in v6.9.27. PDF and PPT now call one saved-map precondition and use the same actionable message; local empty/saved cases pass. Live click behavior remains unverified. | Precondition divergence: `public/operational-output-preconditions.js`, `public/deal-export.js`. | Deploy and click both formats with empty, dirty, and saved stakeholder maps. | BLOCKED |
| LIVE-008 Prospect evidence view-only message | IMP-003, IMP-007 | Medium; view-only roles | Evidence must remain visible while apply controls are unavailable and the message must describe permission, not history. | Behavioral investigation found view-only users could receive a historical-scenario explanation even when the actual restriction was edit authority. | UI authorization messaging in `public/discovery.js`. | v6.9.28 consumes server `canEdit`, keeps evidence visible, removes apply actions, and displays a permission-specific message; local behavior passes. | BLOCKED |
| LIVE-009 Executive PDF payback clipping | IMP-029, IMP-030 | Medium; all customer-output roles | Long payback labels must remain inside the financial-summary card. | Reproduced by rendering the actual Executive PDF builder: the label extended beyond the right page margin. | Fixed-width PDF metric value with no wrapping in `src/exports/executive-pdf.js`. | v6.9.28 wraps long values inside the card; regenerated PDF was visually inspected and passes locally. Live downloaded artifact remains pending. | BLOCKED |
| LIVE-010 Role one-pager title/footer crowding | IMP-029, IMP-030 | Medium; internal exporting roles | Title and authority note must not clip or collide with the footer. | Reproduced by rendering the production one-pager builder: the large title clipped and the authority note crowded the footer. | Fixed title size and overlapping vertical bands in `public/deal-export.js`. | v6.9.28 uses bounded shrink-to-fit title geometry and reserves footer space; regenerated slide was visually inspected and passes locally. Live downloaded artifact remains pending. | BLOCKED |

## Repeated-failure architecture analysis

### Prospect evidence application

**Approach A — relax the customer-ID predicate.** Remove `dss.customer_id=$4`. This may restore older submissions quickly, but it weakens an intentional isolation boundary and is unacceptable without a replacement.

**Approach B — repair every historical discovery session customer ID.** A migration could backfill and then retain the predicate. This improves existing data but remains fragile when customer rows are merged/repaired and does not align with the immutable submission's authoritative opportunity base ID.

**Approach C — canonical opportunity evidence validator.** Authorize the target scenario, load the requested value event, immutable submission and session, require matching `base_id` and canonical input, then validate customer identity only when both authoritative identities are present. Return explicit denial/not-found/integrity codes and never create evidence during review.

**Recommended:** C, accompanied by a narrowly scoped historical integrity audit/backfill only if PostgreSQL evidence proves malformed rows. It preserves isolation while aligning review and apply with the same opportunity authority.

### Executive output saved-state parity

**Approach A — delete only the PDF dirty check.** Low effort, but it could export genuinely unsaved calculator changes.

**Approach B — copy the PDF check into every format.** Creates parity but spreads the same over-broad stale flag and can block all outputs incorrectly.

**Approach C — one output-precondition service.** Expose a canonical client coordinator that verifies selected saved scenario identity, no pending calculator save, and no failed governed persistence. All formats call it before readiness.

**Recommended:** C. It resolves the source-of-truth problem and prevents future format divergence.

### Field-level AI Help

**Approach A — optional-call `section?.querySelector?.(...)`.** Prevents the immediate exception but leaves the dense implicit context builder fragile.

**Approach B — default `section` to `null`.** Fixes this path but does not validate the context object or stale active field.

**Approach C — extract a total `buildInternalFieldContext(fieldId, document)` function.** It returns a complete allowlisted object for focused, missing, removed, and switched fields and can be executed directly in tests.

**Recommended:** C, with a compatibility wrapper for existing UI calls.

### Competitive research readiness

**Approach A — change the label from Ready.** Avoids contradiction cosmetically but still permits a doomed request.

**Approach B — let execution proceed with browser-curated fallback.** Violates governed approved-source authority.

**Approach C — one server readiness contract used by both preflight and execution.** It returns product identity, canonical approved-source availability, blocker text, and capability.

**Recommended:** C. Fail closed and keep approved research separate from AI drafts.

### Download and operational-output lifecycle

**Approach A — add output-specific guard messages.** Corrects individual symptoms but continues the repeated patch pattern.

**Approach B — keep current generators and centralize only fetch/download mechanics.** Improves timeout/MIME/error handling but leaves saved-authority checks distributed.

**Approach C — governed output coordinator.** Registry owner supplies readiness/precondition and builder endpoint; one adapter performs fetch, MIME/signature validation, filename/audience handling, retry, and machine-readable result.

**Recommended:** phased C. This corrective build should implement the shared precondition/download core for affected active outputs without rewriting stable generators.

## Certification blockers recorded before implementation

- No local `psql` or Docker executable is currently available.
- No safe `DATABASE_URL` has been supplied.
- PostgreSQL certification is therefore `BLOCKED`, never `PASS`.
- The package cannot be represented as production-ready unless the required database suites run on a clean non-production PostgreSQL instance with zero skipped and zero not-tested results.
- Final Product Owner release colour remains outside Codex authority under the repository governance contract.
