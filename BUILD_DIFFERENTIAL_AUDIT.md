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

## Deployment reconciliation and targeted corrections — 2026-10-23

- Applied forward to exact production parent `18c7bb2015223a8c956570719fe03d7caea04d10`; recorded this deployed Git lineage separately from the supplied archive lineage.
- Restored `public/style.css` directly from the checksum-verified v6.9.44 archive after detecting corrupted content in the interrupted transfer. Relative to production this stylesheet adds eight lines; it does not replace the prior styles.
- Upload signatures now bind the approved Content-Type and mandatory `If-None-Match: *`, preventing replacement of an existing verified object with a reused PUT URL. The browser receives those required signed headers.
- Evidence loading and all asynchronous modal actions retain their initiating customer/context generation. Customer changes reset metadata and cancel queued work; removing a waiting file prevents its upload.
- Reconciliation atomically claims expired pending rows before object deletion, respects renewed upload expiry, and retains failed deletions for retry. Activation and retry renewal fail if another operation already removed the row.
- Added executable regression coverage for delayed customer responses, reset, queued customer switches, withdrawn files, signed headers, and cleanup failures. The disposable PostgreSQL suite additionally checks expired versus renewed and ACTIVE evidence.
- Real R2 certification now attempts to reuse the upload URL and requires rejection with HTTP 412 before checking the unchanged downloaded bytes.
- Disposable PostgreSQL exposed a dependency-count defect: failed/pending uploads were counted as active Admin Cleanup dependencies. The query now requires `status='ACTIVE'` and no removal timestamp; the existing integration assertion remains unchanged.
- Final deployed R2 certification exposed compressed HEAD responses without Content-Length and with a transformed weak ETag. Internal object metadata requests now send `Accept-Encoding: identity`, preserving the original stored size and ETag; a red-then-green regression reproduces the response transformation.

## Preserved authorities

ROI Model v2.8, economic formulas, native currency, Prospect/Rep evidence semantics, Value History, Buyer Evidence, BuyCycle, customer/scenario authorization, SE cross-account Solution Fit scope, Executive/Proposal authority, outputs, Brand System, and Christie Persona are unchanged. PS Turnover evidence ZIP/appendix generation is deferred.

---

# Historical v6.9.43 Differential Audit (prior release)

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
- The deployed Render build command, pre-deploy migration command, `npm start` command, PostgreSQL database, environment variables, historical certification evidence, cumulative pretest hooks, timestamp fingerprint correction, and ownership-transfer regression ordering.

## Deferred by scope

No file upload, evidence attachment, attachment gallery, new product feature, new ROI formula, authorization expansion, or browser-local authoritative storage is included.

## Migrations

No migration or schema change is introduced. The migration inventory remains 44 files through `044_admin_bulk_cleanup.sql`.

## Packaging reconciliation

- The supplied archive was based on v6.9.42 developer parent `a4a34de7238d82232fd6395e6fb6f57c42f2b51d`; the exact production parent is `46af1f156f4852551c4714ac6660df790a1b3709`.
- The v6.9.43 corrective delta was applied forward to that deployed production commit.
- Historical evidence rewrites, removed cumulative test hooks, the removed pre-deploy migration command, the alternate start command, and unrelated regression reversions were rejected as packaging regressions.

## Unresolved certification

- Disposable PostgreSQL integration and live Render role-based validation remain mandatory until CI and deployment complete.
