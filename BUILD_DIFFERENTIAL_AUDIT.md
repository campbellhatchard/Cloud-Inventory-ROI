# v6.9.36 Differential Audit

v6.9.36 is a focused Advanced Admin Data Cleanup & Recovery build from `cloud-inventory-roi-v6.9.35-render-ready.zip`, SHA-256 `666727f7e4a6e762b8fd91435cb1edf7d52bd6f46c333f0c634ea575e17392db`.

## Added

- Server-authoritative Created, Updated, and Removed date filters using UTC half-open ranges, including Today, Last 7/30/90 Days, Older Than 90 Days, custom, and open-ended ranges.
- Current Owner, historical Created By, record type, lifecycle status, scenario version, Prospect state, and text-search predicates that compose with AND semantics.
- Exact one-use preview snapshots with stable IDs, state fingerprints, dependency counts, filter summaries, expiry, and stale-state rejection.
- Explicit multi-select, Select All Previewed Results, View Selected, Clear Selection, dependency review, typed high-impact confirmation, and atomic Remove Selected / Remove All actions.
- Immutable cleanup batch and per-record audit events, forward-looking creator attribution without fabricated legacy creators, and cleanup-batch recovery linkage.
- Customer recovery of only those operational children removed by the same cleanup batch, preserving identity, current owner, immutable history, and inactive public links.
- Focused executable tests and a disposable-PostgreSQL integration suite.

## Preserved

The v6.9.35 ownership-reassignment transaction and all historical actor, Solution Engineer, immutable evidence, ROI, Buyer Evidence, publication, authorization, and output-governance protections remain unchanged. Cleanup never hard deletes governed business or evidence records.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Deliberately not changed

ROI Model v2.8, formulas, customer-facing outputs, Prospect submission behavior, Value History semantics, Buyer Evidence methodology, Solution Fit permissions, Backlog 1, and the standalone CIP prototype are outside this build.
