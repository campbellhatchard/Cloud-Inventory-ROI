# Customer Ownership Reassignment Report — v6.9.35

## 1. Executive Summary

v6.9.35 adds one Admin-only operation that transfers a Customer's current operational responsibility to another eligible Sales Rep. It does not move, clone, merge, or reinterpret business records. The Customer, opportunity, scenarios, evidence, economics, history, outputs, and independent Solution Engineer assignment retain their identities.

## 2. Authoritative Baseline

- Parent: `cloud-inventory-roi-v6.9.34-render-ready.zip`
- SHA-256: `6c0458c45541fb0cf955bb0d6c460c9bcd65acede98ceade148e33a914acdb08`
- Deployed production parent commit: `9fcbce9a527d2565f95f6c70e6cefe9581a9e50d`
- Developer source snapshot: `9cf1e0c12e8ecf64f687db2772fcd8bdf08cba18`
- Target: v6.9.35
- ROI Model: v2.8 / modelVersion 28, unchanged

## 3. Current Ownership Architecture

`customers.owner_id` is the canonical current Customer owner. Existing authorization also reads intentionally denormalized operational owner fields on scenario-linked records. Current Rep and team/manager access is evaluated server-side. Historical actors are stored separately in immutable events, applications, governance history, submissions, audit records, authorship fields, and frozen publications.

## 4. Ownership Data Map

| Domain | Field / relation | Classification | Transfer behavior |
|---|---|---|---|
| Customer | `customers.owner_id` | Canonical current owner | Change |
| Opportunities/scenario versions | `scenarios.customer_id`, `base_id`, `owner_id` | Stable identity plus operational owner copy | Preserve IDs/versions/data; change operational owner |
| Prospect Links | `discovery_sessions.scenario_id`, `owner_id` | Operational owner and future notification source | Preserve link/token; change operational owner |
| Prospect submissions | immutable submission/answer rows | Historical customer evidence | Preserve |
| Calculator/ROI | scenario `data` and canonical engine | Governed economic state | Preserve byte-for-byte |
| Value History / Rep Confirmed | event/application actors | Historical provenance | Preserve |
| Buyer Evidence / BuyCycle | governance and history actors/timestamps | Historical evidence | Preserve |
| Stakeholders | `scenario_id`, `owner_id` | Customer content plus operational scope | Preserve content; change operational owner |
| Solution Fit | `customer_id`, `owner_id` | Customer relation plus operational Sales Rep | Change operational owner only |
| Solution Engineer | primary/additional SE and creator/editor/history | Independent assignment/history | Preserve |
| JPP | scenario relation and operational owner | Customer content plus operational scope | Preserve content; change operational owner |
| Proposal / Three Whys / Executive Story | saved scenario/narrative data and revisions | Business content and provenance | Preserve |
| Published Business Case | frozen payload/token/publication owner | Historical frozen publication | Preserve |
| Customer Proof / Competitive refs / AI context | scenario-linked governed references | Business context | Preserve |
| Shared access | explicit share fields | Independent access | Preserve |
| Team/manager access | current owner team membership | Dynamically derived | Re-evaluates from new owner; no duplicate assignment |
| Notifications | historical outbox rows; session owner for future events | Historical vs operational | Preserve prior rows; future owner-routed notices use new owner |
| Audit | existing rows and new transfer event | Immutable history | Preserve prior rows; append transfer event |

## 5. Operational vs Historical Classification

Operational ownership changes on Customer, scenario versions, Prospect Link sessions, JPPs, Stakeholders, Solution Fits, and Driver Resonance because the current authorization model reads those copies. Historical evidence, actors, content, timestamps, identities, sharing, and publication records do not change. Owner-only trigger handling preserves historical `updated_at` timestamps on the legacy operational copies.

## 6. Transfer Architecture

The browser sends the Customer ID, selected new-owner ID, previewed current-owner ID, and reason to one server operation. The server—not the dropdown—validates Admin capability, Customer state, eligible active Rep status, same-owner behavior, duplicate Customer identity, and concurrency. No independent browser update sequence exists.

## 7. Impact Preview

The preview is calculated on the server and returns the actual Customer, opportunity, scenario-version, active Prospect Link, submission, Stakeholder, Solution Fit, JPP, Proposal, published-record, Value History, Rep Confirmed, Buyer Evidence, Driver Resonance, notification-history, and audit-history counts. The dialog separately explains what changes and what remains preserved.

## 8. Transaction Design

The transaction locks the Customer row, checks the expected current owner, revalidates the target, recomputes counts, updates operational scope, changes the canonical owner, inserts an immutable transfer record, and appends the audit event. Any error rolls everything back. The unique owner/name database rule remains authoritative and a concurrent identity collision returns a safe conflict without merging Customers.

## 9. Authorization Design

All three APIs require authenticated Admin capability. Rep, Sales Manager/Leader, SE, and non-Admin multi-role users are denied. An Admin multi-role user is allowed because Admin capability is present. Target eligibility is read from the server and rechecked inside the transaction; active Rep-capable multi-role users are eligible, while inactive and SE-only users are not.

## 10. Team/Manager Behavior

Team and manager visibility continues to derive from the current Customer/operational owner and existing team memberships. New owner/team visibility appears on the next authorized request. Old owner/team visibility disappears when it had no independent basis. Explicit shared access remains.

## 11. Solution Engineer Preservation

Primary/additional SE assignment, Solution Fit creator/editor attribution, and change history are never updated. The SE cross-account Solution Fit permission model is unchanged.

## 12. Prospect/Notification Behavior

Existing Prospect Link tokens and immutable submissions stay attached to the same scenario/opportunity. `discovery_sessions.owner_id` changes as the existing owner-based notification source, so future owner-routed completion notices resolve to the new Rep. Previously sent/failed notification rows are not rewritten.

## 13. Historical Integrity

Tests compare Customer ID, base ID, scenario IDs/versions, ROI data, submissions, Value History and Rep Confirmed actors, stage evidence/history, SE fields, frozen publication ID/token/payload/owner, shared access, and prior notifications before and after transfer. Only operational owner fields and the new transfer/audit records change.

## 14. Concurrency Protection

The Customer row is selected `FOR UPDATE`. Confirmation must provide the owner returned by preview. If another Admin commits first, the stale operation receives HTTP 409 and cannot overwrite the newer owner. The database uniqueness constraint independently protects against a concurrent same-name collision under the target owner.

## 15. Audit Trail

Migration 043 creates immutable `customer_ownership_transfers` rows containing Customer ID/name, old/new owner IDs/names, Admin actor, reason, counts, IP address, and timestamp. A transaction-bound `customer.ownership_transferred` audit event references the transfer ID. Existing audit rows are untouched.

## 16. Interactive Browser Results

Post-change deployed-browser testing is **NOT TESTED** because v6.9.35 has not yet been deployed. The Admin dialog's rendering, preview-before-confirm rule, failure-state retention, keyboard focus containment, and success refresh are covered locally. The complete live sequence is in `DEPLOYMENT_VALIDATION_v6.9.35.md`.

## 17. PostgreSQL Results

The real PostgreSQL/HTTP test suite exists and is registered in `test:postgres`, including authorization, actual counts, owner/team access, future actions, future Prospect notification ownership, identity/economic/history preservation, no-scenario transfer, stale conflict, and induced rollback. No safe non-production `DATABASE_URL` was available locally, so all seven registered PostgreSQL suites are **NOT TESTED** here. No production database was used.

## 18. Role Regression

Executable role/authorization tests passed for Admin, Admin multi-role, Rep, Sales Manager, SE, Rep+SE/Manager eligibility, explicit sharing, owner access, and team-derived manager access. Live login testing with deployed canonical QA accounts remains part of deployment validation.

## 19. Full Regression Results

- Focused ownership/authorization/migration/UI/switcher/ROI gate: 89 passed, 0 failed, 0 skipped.
- Full inherited application gate: 679 passed, 0 failed, 2 database-dependent skips.
- Production regression locks: 330 passed, 0 failed, 0 skipped.
- Active output runtime matrix: 26 passed, including 25 active outputs, 0 failed.
- Brand System gate: 19 passed, 0 failed.
- PostgreSQL suites: 0 passed, 0 failed, 7 suites NOT TESTED (no safe database).
- Fresh locked `npm ci --no-audit --no-fund`: passed under Node v24.19.0 with the expected engine warning. Exact configured Node 22 execution remains a CI/deployment gate.

## 20. Files Changed

Production changes are limited to `src/shared/customer-ownership-transfer.js`, `src/routes/customers.js`, `src/audit.js`, `public/admin-customers.js`, `public/style.css`, and migration 043. Remaining changes are tests, version/lineage configuration, governance, generated Application Knowledge version output, and release evidence.

## 21. Migrations

`043_customer_ownership_transfer.sql` is the smallest proven schema addition: immutable transfer history plus owner-only-aware updated-time triggers on legacy operational owner copies. It adds no ROI, evidence, role, or Customer identity migration.

## 22. Known Limitations

This release supports one Customer per confirmed transfer; it does not bulk reassign or merge. Inactive/removed Customers must be restored first. Existing frozen publication ownership remains historical. Local PostgreSQL and post-deployment interactive certification remain outstanding environmental gates.

## 23. Release Recommendation

The code is a regression-tested release candidate, but it is not eligible for a self-assigned GREEN classification until the disposable PostgreSQL suite and deployed role-based browser acceptance test pass. The Product Owner owns the final GREEN/YELLOW/RED decision.
