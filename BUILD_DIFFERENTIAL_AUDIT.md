# v6.9.45 Deployment Reconciliation

The exact supplied v6.9.45 ZIP was verified with SHA-256 `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31` and imported forward from live commit `d133998e94308845cfb1356bc968084effcf51c1`. Existing files missing from the archive were retained. No production credentials or dependency directories are included.

- Preserved deployed v6.9.44 upload immutability, signed Content-Type, uncompressed R2 metadata, evidence workspace generation guards, atomic cleanup and deletion retries, active attachment dependency counting, timestamp fingerprints, and the existing behavioral regressions. Six inherited regressions failed against the raw imported source and all 18 passed after reconciliation.
- Kept `npm start` and `npm run migrate` in the existing Render Blueprint, matching the Product Owner's deployment instruction and live settings. No migration was added or changed.
- Corrected final ZIP member allocation to account for generated suffixes and case collisions, preserving every manifest member's bytes.
- Bound turnover previews, download initiation, completed bytes and UI recovery to their originating customer/workspace generation; older previews cannot replace newer ones.
- Propagated request cancellation through storage reads, registered response cleanup before generation, and cleaned late results. Observed and raced archive/output failures immediately, closed streams before deleting partial ZIPs, aborted pending object requests, and discarded late streams.
- Used an ASCII-safe HTTP download filename for valid Unicode customer names while preserving customer content inside the package.
- Added eight red-then-green turnover regressions. The final v6.9.45 plus inherited v6.9.44 focused run passed 39 tests with zero failures. Full local Node 22 execution had zero failures; database integration remains a separate disposable CI run, and real R2 checks use only the QA object prefix.
- Retained previous pretest coverage and updated the new R2 package check to use the preserved signed-upload header contract.
- Disposable PostgreSQL CI exposed two supplied fixture defects. Restored the already-deployed ordering of the immutable-history assertion before later deliberate scenario edits, preserving every assertion; represented the new Sales Manager fixture with the schema's valid legacy `rep` role and governed `sales_manager` role array. Production schema and application behavior are unchanged by these test-fixture corrections.
- Archive lineage retains the supplied Product Owner policy's unknown (`null`) archive parent commit. The independently verified deployed Git parent remains recorded in this audit and the release manifest. A deployment-bookkeeping mismatch between those distinct authorities was caught by CI and corrected; the final local full suite passed 751 tests with zero failures and three explicitly skipped database cases.

The supplied package and historical pre-deployment reports are preserved as provenance. The final deployment receipt records exact commits, CI results, migration verification and the live health response; no Product Owner readiness designation is assigned by the agent.

# v6.9.44 Differential Audit

## Exact comparison

The final source was compared by SHA-256 file inventory with a fresh extraction of `cloud-inventory-roi-v6.9.43-render-ready.zip` (`0ebdcb89683996a693ae4089533cfcd93b6a27e5e5ef2ec5e7b65e7d87e61d2a`). No baseline files were removed.

Final inventory result: **19 files added, 21 files changed, 0 files removed**. Dependency directories, Git metadata, and temporary QA logs were excluded from the inventory.

## Authorized additions

- Forward-only migration 045 extends the existing `handoff_attachments` table; it does not create a parallel attachment store.
- One canonical private R2/S3 presigning service, one authenticated attachment route module, and one reconciliation job.
- One compact Solution Fit evidence UI for general, application/process, gap, and stable integration contexts.
- Multiple files, mobile camera selection, photo preview, sequential optimization/upload, caption/category metadata, authenticated open/download, metadata edit, and individual audited removal.
- PostgreSQL, fake-private-object-store, real credential-gated R2, image optimization, security, and inherited Solution Fit regression tests.
- v6.9.44 lineage, environment contract, CI evidence paths, release manifest, QA/readiness evidence, and permanent-test entries.

## Authorized modifications

- `server.js` mounts the attachment API, permits only the configured R2 origin in `connect-src`, and schedules bounded reconciliation.
- `public/solution-fit.js`, `public/index.html`, and `public/style.css` integrate compact evidence controls without replacing Solution Fit state or navigation.
- Admin Cleanup counts active attachment dependencies.
- Version, lineage, Application Knowledge, governance, Render, and release-runner files are synchronized to v6.9.44.

## Explicitly unchanged

ROI Model v2.8, economic formulas, native currency, Prospect/Rep evidence semantics, Value History, Buyer Evidence, BuyCycle, customer/scenario authorization, SE cross-account Solution Fit scope, Executive/Proposal authority, outputs, Brand System, and Christie Persona are unchanged. PS Turnover evidence ZIP/appendix generation is deferred.

---

# v6.9.43 Differential Audit

## Authorized correction scope

This build starts from the verified v6.9.42 archive and corrects only the fourteen defects confirmed in the deployed role-based regression. The unbuilt v6.9.43 evidence-attachment prompt is explicitly excluded.

## Intentionally changed

- Added one browser workspace-generation authority so customer/scenario switches invalidate stale asynchronous responses.
- Bound Executive, Proposal, AI Help, and Christie loading/rendering to the originating customer and scenario.
- Made scenario save responses return the exact persisted ROI projection and made the browser adopt it immediately.
- Prevented a legacy v2.7 scenario from silently saving through a v2.8 server calculation; the existing governed upgrade preview is required.
- Extended Solution Fit readiness to General Inventory Configuration, Professional Services turnover, gap disposition, and clean saved state.
- Recomputed Solution Fit progress and selected-application counts after active scope/assessment changes.
- Removed read-time Solution Fit mutation/autosave behavior.
- Removed duplicate explicit Three Whys microphone controls while retaining the single generic dictation control per field.
- Scoped Christie memory to the opportunity, cleared invalid field-help context, and bounded both AI requests to twenty seconds.
- Added a short opportunity reference to Sales Manager rows/cards/drawer so different opportunities with the same labels remain visibly distinct.
- Added focused permanent regression coverage and synchronized release/version evidence.

## Intentionally preserved

- ROI Model v2.8 formulas, economic classes, overlap rules, contract schedule, native currency, and null-versus-zero semantics.
- Immutable Prospect evidence, deliberate per-value application, Value History, Rep Confirmed provenance, and historical scenario immutability.
- Buyer Evidence and BuyCycle governance, authorization/capability rules, and SE cross-account Solution Fit scope.
- Solution Fit state schema, application/gap identity, MEP catalog/package behavior, outputs, and authenticated persistence.
- Executive/Proposal canonical source/readiness, draft classification, and commercial-note exclusion.
- Output Registry ownership, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, and permanent-test monotonicity.

## Data and database impact

No migration or schema change is introduced. The migration inventory remains 44 files through `044_admin_bulk_cleanup.sql`.

## Explicit exclusions

No file upload, evidence attachment, attachment gallery, new product feature, new ROI formula, authorization expansion, or browser-local authoritative storage is included.

---

# v6.9.45 Differential Audit

## Authorized additions

- One canonical server-side PS turnover model over saved `handoffs` state and active `handoff_attachments` rows.
- One read-only repeatable-read snapshot service using the existing Solution Fit authorization boundary.
- One streaming turnover package builder, RFC 4180 manifest generator, collision-safe/sanitized ZIP paths, R2 object preflight, and selected image previews.
- One registered `solution-turnover-package` runtime output and permanent unit, PostgreSQL, R2, security, failure, performance, and output-owner tests.
- v6.9.45 release evidence, foundation map, deployment checklist, and machine-generated gate artifacts.

## Authorized modifications

- The approved turnover Word builder now consumes the canonical model and adds evidence references, a compact manifest, and up to two document-quality previews per stable context.
- The handoff route delegates Word/ZIP generation to shared services and records package generation metadata without storing package contents.
- The R2 abstraction adds authenticated object streaming with abort support.
- The Solution Fit readiness panel adds server-authoritative package counts, pending-upload warnings, save-before-output, progress, failure recovery, and ZIP download support.
- The shared server-download helper accepts governed PDF, DOCX, PPTX, and ZIP media types.

## Explicitly unchanged

No database migration, second evidence repository, browser-local authority, ROI formula, Prospect evidence rule, Customer ownership rule, SE capability, Solution Fit stable identity, attachment upload workflow, public output, or customer-facing classification was changed.

---

# v6.9.46 Differential Audit

## Exact comparison

The correction starts from `cloud-inventory-roi-v6.9.45-render-ready(1).zip`, SHA-256 `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`, materialized as untouched baseline commit `6adf41b`. No prior release or reconstructed branch was used.

## Authorized corrections

- Added a canonical, backward-compatible Executive Narrative projection and routed the Executive Value Story through it.
- Unified Prospect, Discovery, evidence review, and Impact Map applicability through the existing governed questionnaire source.
- Classified package rows by stable governed catalog identity while preserving independent custom and legacy records.
- Reconciled server-confirmed ACTIVE evidence into the visible saved list, removed completed queue items, and enforced single-flight uploads.
- Added a null-preserving read-time scenario financial summary used by both Saved Scenarios and Compare.
- Added a structured Solution Fit application-label formatter that removes only repeated semantic context.
- Added focused semantic artifact and behavior regression coverage for all six defects and the existing Deal Coach timeout fallback.

## Explicitly unchanged

ROI Model v2.8 formulas, overlap rules, native currency, immutable Prospect submissions, Value History, Rep Confirmed, Buyer Evidence, BuyCycle, authorization roles/capabilities, SE cross-account Solution Fit boundary, attachment storage architecture, PS Turnover authority, customer-facing output classifications, Brand System v1.0, Application Knowledge v1.0, and Christie Persona v1.0 are unchanged. No database migration is introduced.
