# v6.9.44 Evidence Foundation Map

This map records the source inspected before v6.9.45 implementation. It describes the exact v6.9.44 release, not a design assumption.

| Component | Classification | Verified implementation |
|---|---|---|
| Attachment repository | VERIFIED | Existing `handoff_attachments` table from migration 027, extended in place by migration 045. No parallel evidence table. |
| Stable attachment identity | VERIFIED | UUID primary key and unique server-generated storage key. |
| Solution Fit/customer association | VERIFIED | `handoff_id` and `customer_id` are stored and checked together on every authenticated operation. |
| Stable contexts | VERIFIED | `GENERAL_SOLUTION_FIT`, `APPLICATION_PROCESS`, `GAP`, and `INTEGRATION`; non-general contexts require `context_id`. |
| Stable process and gap identity | VERIFIED | Context validation resolves exact saved process/gap IDs through `solution-fit-state.js`; display names and indexes are not authority. |
| Integration identity | VERIFIED | Stable interface IDs are supported by migration 045 and the context validator. |
| Readiness-item attachment context | MISSING | v6.9.44 has no stable readiness attachment relationship. v6.9.45 does not fabricate one. |
| Lifecycle | VERIFIED | `PENDING`, `ACTIVE`, `FAILED`, and `REMOVED`; `removed_at`, remover, and deletion retry state are retained. |
| Captions/categories | VERIFIED | Caption and evidence category are editable only for active, authorized evidence. |
| Uploader/date | VERIFIED | Original `uploaded_by`, joined username, `created_at`, and `completed_at` remain historical facts. |
| Filename/type/size | VERIFIED | Original filename, canonical content type, actual verified size, expected size/type, and object ETag are retained. |
| Private object storage | VERIFIED | `src/storage/r2-storage.js` signs private S3-compatible R2 operations; browser never receives credentials. |
| Upload completion | VERIFIED | Server HEAD-verifies size and content type before changing evidence to ACTIVE. |
| Authorized listing/download | VERIFIED | `solutionFitAccess()` is checked before metadata lookup; downloads use short-lived signed URLs. |
| Individual removal | VERIFIED | Removal is audited, state-preserving, idempotent, and followed by object deletion/retry. |
| Reconciliation | VERIFIED | Background cleanup removes stale pending/failed objects and retries removed-object deletion. |
| Customer reassignment | VERIFIED | Ownership changes do not rewrite stable customer/Solution Fit/attachment identities or uploader attribution. |
| Admin Cleanup dependency | VERIFIED | Active evidence is counted through the existing Solution Fit dependency model. |
| Evidence UI | VERIFIED | General, application/process, gap, and integration evidence use the authenticated multi-file UI and server persistence. |
| PS turnover evidence consumer | MISSING | v6.9.44 deliberately deferred the Word appendix, manifest, and ZIP; v6.9.45 adds these as read-only consumers. |

No component was classified DEFECTIVE for purposes of the v6.9.45 build. The only missing elements were the explicitly deferred PS turnover consumers and the intentionally unsupported readiness-item relationship.
