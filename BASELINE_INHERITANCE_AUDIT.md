# v6.9.36 Pre-build Baseline Inheritance Audit

- Authoritative parent archive: `cloud-inventory-roi-v6.9.35-render-ready.zip`
- Parent archive SHA-256: `666727f7e4a6e762b8fd91435cb1edf7d52bd6f46c333f0c634ea575e17392db`
- Deployed production parent commit: `b64a9294e86505bd50eee5c935499f6bf4992645`
- Developer source snapshot: `3a31e89cf845ed57806152e220ea944c59f2d49a`
- Parent application/package version: `6.9.35`
- Target application version: `6.9.36`
- Parent migration level: `043_customer_ownership_transfer.sql`
- Existing automated test files: 91
- Active Output Registry entries: 25 (unchanged by this build)
- ROI authority: Model v2.8 / `modelVersion` 28 (unchanged)
- Brand, Application Knowledge, and Christie authorities: v1.0 (unchanged)

The exact Git tree deployed as v6.9.35 is the production baseline. The developer's verified v6.9.35 Render-ready archive is recorded as the source snapshot for the supplied delta. The v6.9.36 changes were overlaid onto the deployed tree so GitHub, Render, and release lineage remain synchronized.

## Current cleanup architecture map

| Record type | Table / primary ID | Created date | Updated date | Removed date | Owner / creator | Removal and restore | Protected children |
|---|---|---|---|---|---|---|---|
| Customer | `customers.id` | `created_at` | `updated_at` | `deleted_at` | current owner: `owner_id`; no reliable legacy creator column | soft removal through `deleted_at`; restore clears cleanup markers | scenarios, Prospect sessions, Solution Fits, immutable evidence and audit remain physically preserved |
| Scenario version | `scenarios.id` | `created_at` | `updated_at` | `deleted_at` | current owner: `owner_id`; no reliable legacy creator column | soft removal; existing current-version promotion remains; restore preserves the opportunity `base_id` | ROI Value History, stage history, scenario snapshots, immutable Prospect evidence and audit |
| Prospect / Discovery session | `discovery_sessions.id` | `created_at` | `updated_at` | `cleanup_removed_at` | current owner: `owner_id`; no reliable legacy creator column | deactivate plus cleanup timestamp; restore does not reactivate the old public link | `discovery_submissions`, submission answers and ROI value events |
| Solution Fit / Handoff | `handoffs.id` | `created_at` | `updated_at` | `deleted_at` | operational owner: `owner_id`; reliable creator: `created_by` | soft removal; restore preserves Customer owner and SE assignment | change history, attachments, saved Handoff data and audit |

The active workflow is implemented by `public/admin-cleanup-v661.js`, the Cleanup panel in `public/index.html`, and four Admin-only routes in `server.js`: preview, execute, deleted-list, and restore. Migration 031 supplies cleanup metadata and short-lived preview snapshots. The current preview stores stable IDs, and execution accepts only IDs contained in the authenticated Admin's unexpired preview.

## Pre-change limitations verified

- Filtering beyond search, status, scenario lifecycle, Prospect state and record type occurs in browser memory rather than server-authoritative query predicates.
- Search is mandatory, so date-only or owner-only cleanup cannot be performed.
- Created By is available only for Solution Fit. Legacy Customer, Scenario and Discovery creators cannot be inferred safely.
- Recently Removed is capped to 30 days and then filtered in the browser.
- The current preview has stable IDs but lacks explicit snapshot-consumption, row-fingerprint concurrency checks and batch-level audit records.
- Selecting a Customer expands only to dependencies already present in the search result, rather than every active operational dependency of that Customer.
- Selection has no Select All, Clear Selection, persistent summary, or explicit invalidation when filters change.

## Preserved authorities and critical workflows

All permanent v6.9.1-v6.9.35 protections remain binding, including governed output authorities, immutable Prospect evidence, server-authoritative ROI persistence, Product-neutral ROI, Proposal/export safeguards, Customer workspace isolation, the single-current-scenario constraint, Prospect value application and notification governance, and Sales Manager opportunity identity.

The v6.9.35 Customer Ownership Reassignment invariant is mandatory: current owner fields may transfer, while historical actors, Solution Engineer assignments, immutable evidence, ROI values, prior notifications, audit events and frozen publications must not be rewritten.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Explicit non-scope

This build does not change ROI Model v2.8, add the ROI Assumptions & Results Summary, integrate the CIP Solution Fit prototype, change customer outputs, or introduce hard deletion of governed business records.
