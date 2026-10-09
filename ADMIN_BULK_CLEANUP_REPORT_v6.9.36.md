# Admin Bulk Cleanup Report — v6.9.36

## 1. Executive Summary

v6.9.36 replaces the limited Admin cleanup workflow with an Admin-only, server-authoritative cleanup and recovery system. Administrators can combine search, record type, status, owner, creator, date basis, quick range, and custom date filters; review the exact result set; select individual rows or the entire reviewed snapshot; inspect impact; and perform one atomic soft-removal operation. No ROI, evidence, ownership-transfer, or customer-output authority changed.

## 2. Authoritative Baseline

- Parent archive: `cloud-inventory-roi-v6.9.35-render-ready.zip`
- Parent SHA-256: `666727f7e4a6e762b8fd91435cb1edf7d52bd6f46c333f0c634ea575e17392db`
- Extracted baseline commit: `3a31e89cf845ed57806152e220ea944c59f2d49a`
- Target application version: `6.9.36`
- ROI Model: v2.8 / `modelVersion` 28, unchanged

## 3. Existing Cleanup Architecture

The v6.9.35 baseline exposed cleanup controls in the Admin page and implemented removal/recovery routes inline in `server.js`. The browser provided search and basic type/status choices, but the action set was not bound to a durable server preview. v6.9.36 retains the Admin page location while moving active cleanup authority to `src/routes/admin-cleanup.js` and shared validation to `src/shared/admin-cleanup.js`. The old inline route block is not registered. Existing Admin export and company lookup routes remain active.

## 4. Supported Record Types

| Type | Table/object | Primary ID | Owner | Creator | Removal column | Restore | Protected children |
|---|---|---|---|---|---|---|---|
| Opportunity / Scenario | `scenarios` | UUID `id` | `owner_id` | nullable `created_by` | `deleted_at` | Yes | Value History, immutable Prospect submissions, stage history, ROI snapshots, audit |
| Prospect / Discovery session | `discovery_sessions` | UUID `id` | `owner_id` | nullable `created_by` | `cleanup_removed_at` | Yes, inactive | Submission answers, immutable submissions, related Value History, audit |
| Customer | `customers` | UUID `id` | current `owner_id` | nullable `created_by` | `deleted_at` | Yes, including dependencies removed in the same cleanup batch | Ownership transfers, scenario/prospect/economic history, audit |
| Solution Fit / Handoff | `handoffs` | UUID `id` | current `owner_id` | nullable `created_by` | `deleted_at` | Yes | Change history, attachments, audit |

No supported type is hard deleted.

## 5. Date Field Authority

Created Date uses the record's server `created_at`. Updated Date uses the record's server `updated_at`. Removed Date uses `deleted_at` for Customers, Scenarios, and Handoffs, and `cleanup_removed_at` for Discovery sessions. The system does not substitute browser time or infer removal from `updated_at`.

## 6. Date/Timezone Semantics

Cleanup calendar dates use UTC consistently. A From date is inclusive at `00:00:00.000Z`; a Through date is represented as an exclusive bound at the start of the following UTC day. This half-open range avoids `23:59:59` errors and behaves deterministically across month, year, and daylight-saving transitions. Open-ended bounds are supported. From later than Through is rejected before a query executes.

## 7. Filter Architecture

Filters are normalized and validated on the server. Different categories combine with `AND`; search matches the applicable identifying columns within a type. Supported quick ranges are Today, Last 7, Last 30, Last 90, Older Than 90, Custom, and All. The record type list is limited to the four types whose remove/restore and dependency behavior is governed. The server returns the normalized filter set and human-readable summary with each preview.

## 8. Owner vs Created By

Owner always reflects current server-authoritative ownership. Created By is historical creator attribution and is nullable for legacy rows rather than fabricated. New Customer, Scenario, and Discovery creation paths populate `created_by`; Solution Fit already carried creator attribution. A Customer transferred from Rep A to Rep B is found under Owner Rep B and, when known, Created By Rep A.

## 9. Selection Model

Rows use stable UUIDs, not display positions or names. The UI supports individual selection, Select All Current Results, Clear Selection, a persistent count, and viewing selected records. Changing any filter clears selection visibly and requires a new server preview, so hidden records cannot remain silently actionable.

## 10. Remove Selected

The browser sends explicit typed ID arrays plus the preview ID. The server verifies every ID is a member of that Admin's unexpired preview, expands Customer dependencies, calculates impact, requires a reason, applies stronger confirmation at ten or more affected records, locks targets, validates row fingerprints, and performs one atomic soft-removal transaction.

## 11. Remove All Filtered Results

Remove All uses the exact stable identities captured by the reviewed server preview. It never reruns a dynamic filter at execution time. It always requires the displayed typed phrase. A preview is single-use and bound to its Admin. New rows that later match the filter are not included.

## 12. Preview Snapshot / Concurrency Design

Preview resolution runs in a repeatable-read transaction and stores normalized filters, exact resolved IDs, row fingerprints, result count, dependency summary, SHA-256 snapshot hash, creator, expiry, and use state. Execution locks the preview and target rows. Changed fingerprints, expired previews, reused previews, or targets outside the snapshot fail closed with a refresh/review message. The entire batch rolls back on conflict.

## 13. Dependency Preview

Impact is calculated from database relationships. Counts include scenario versions, Discovery sessions, Solution Fits, scenario and business-case shares, Joint Project Plans, stakeholders, Solution Fit history and attachments, immutable submissions, Value History, stage history, ROI snapshots, audit events, and ownership-transfer history where applicable. Customer selection expands active operational descendants in the reviewed snapshot.

## 14. Immutable Evidence Protection

Cleanup never deletes immutable Prospect submissions or answers, ROI Value History (including Rep Confirmed), Buyer Evidence and stage history, ROI snapshots, audit records, ownership-transfer events, or publication identity. Tests assert those rows remain after parent removal. Missing provenance is not synthesized.

## 15. Soft Removal

Removal sets the authoritative removal timestamp, actor, reason, optional note, and cleanup batch ID. Scenario and business-case shares are deactivated. Discovery sessions are marked inactive. No governed business table is physically deleted. Batch size is capped at 500 affected records so the application does not start an unbounded transaction.

## 16. Recovery / Restore

Restore preserves the same primary identity and current owner. Customer recovery restores only operational descendants removed by that Customer's same cleanup batch; it cannot accidentally reactivate records removed earlier for a different reason. One appropriate current Scenario version is retained/promoted under existing version rules. Public links remain inactive and Discovery links remain inactive until deliberately re-enabled through their governed workflow.

## 17. Audit Trail

Each execution writes immutable `admin_cleanup_batches`, per-record `admin.cleanup_record_removed` entries, and a batch `admin.cleanup_batch_removed` audit entry containing actor, preview, selection identities, filter, reason, counts, preserved authorities, and result. Restore writes `admin.cleanup_restored`. Passwords, tokens, raw Prospect answers, and secrets are not logged.

## 18. Authorization

Every cleanup route is protected by canonical authentication before mounting and then by an Admin-role check in the router. Direct Rep and SE requests return 403. Multi-role users are allowed only when one role is Admin. The implementation does not expand Sales Leader, Rep, or SE permissions.

## 19. Interactive Browser Results

**NOT TESTED in this local build.** No authorized live deployment or browser session was used for destructive Admin QA. The post-deployment checklist covers date filters, transferred ownership, multi-select, impact review, remove selected, exact-snapshot remove all, stale-preview conflict, Recently Removed, restore, refresh, and logout/login persistence. This gap must not be reported as a pass.

## 20. PostgreSQL Results

**NOT TESTED: no safe non-production `DATABASE_URL` was available.** Eight registered sequential PostgreSQL suites, migration execution, and real transaction/locking verification remain required in CI or an isolated test database. `POSTGRES_INTEGRATION_RESULTS_v6.9.36.json` records 0 passed, 0 failed, 0 skipped, and 8 not tested. The suite fails certification when `REQUIRE_DATABASE_INTEGRATION=1` and PostgreSQL is unavailable.

## 21. Build 1 Regression

The v6.9.35 ownership-transfer automated suite passed 89 tests with 0 failures. v6.9.36 cleanup tests also verify current owner and historical creator are distinct and that remove/restore preserves reassigned ownership. Real PostgreSQL verification remains part of the unexecuted database gate.

## 22. Full Regression Results

- Machine release runner: all executed gates passed; zero failed gates.
- Full application suite: 650 passed, 0 failed, 2 skipped.
- v6.9.36 focused suite: 99 passed, 0 failed, 1 skipped (PostgreSQL unavailable).
- Production locks: 301 passed, 0 failed.
- Brand tests: 19 passed, 0 failed.
- Active output runtime matrix: 26 passed (registry plus all 25 active outputs), 0 failed.
- Static lineage, active-output audit, brand assets, and application knowledge checks passed.

Counts overlap because focused and permanent gates deliberately re-run protected tests. Skips are not represented as successful database coverage.

## 23. Performance Observations

Filtering, sorting, dependency resolution, and result limiting happen on the server. Migration 044 adds indexes for creator/removal and preview lifecycle lookups. Preview and execution are capped at 500 records. The design avoids browser-side full-database filtering and avoids per-row client requests. No trustworthy PostgreSQL query timing is reported because the database suite was not run.

## 24. Files Changed

Primary production changes are `public/admin-cleanup-v661.js`, `public/index.html`, `public/style.css`, `src/routes/admin-cleanup.js`, `src/shared/admin-cleanup.js`, `server.js`, Customer/Scenario/Discovery creation paths, migration 044, CI/release evidence configuration, version metadata, governance documents, and v6.9.36 permanent tests. Customer-facing outputs and ROI calculation modules were not changed.

## 25. Migrations

`044_admin_bulk_cleanup.sql` adds nullable creator attribution, cleanup actor/reason/note/batch fields, preview snapshot metadata, immutable batch records, foreign keys, and targeted indexes. It is additive, idempotent through guarded DDL, and does not backfill uncertain creators or delete data. It must be executed on a backup-protected deployment database before application traffic uses v6.9.36.

## 26. Known Limitations

- UTC—not each user's local timezone—is the documented calendar-date convention.
- A preview is intentionally capped at 500 affected records; larger work requires narrower filters and multiple reviewed batches.
- Legacy rows with unknown creator remain unclassified by Created By.
- Restore does not reactivate external Prospect or customer-share links automatically.
- Live browser behavior and PostgreSQL transaction behavior remain unverified in this local environment.

## 27. Release Recommendation

The committed package may proceed to isolated PostgreSQL certification and controlled deployment validation. A final readiness colour is intentionally not assigned here. The Product Owner must review the database result, live Admin workflow, backup/rollback readiness, and post-deployment smoke results before classifying the release.
