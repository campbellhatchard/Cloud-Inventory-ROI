# Solution Fit Evidence & Attachments Report — v6.9.44

Date: 2026-10-23

## 1. Executive Summary

v6.9.44 adds a private, server-authoritative evidence system to the existing Solution Fit & Handoff workflow. Authorized users can associate multiple photos or documents with the overall Solution Fit, a stable application/process, a stable gap, or a stable integration. The design reuses the existing `handoff_attachments` table, stores file bytes in private Cloudflare R2, keeps governed metadata in PostgreSQL, and never uses browser storage or public object URLs as authority.

The implementation is locally regression-clean. Real PostgreSQL, real R2, authenticated desktop, large real-photo, and real mobile-camera certification remain required before pilot approval.

## 2. Authoritative Baseline

- Parent archive: `cloud-inventory-roi-v6.9.43-render-ready.zip`
- Parent SHA-256: `0ebdcb89683996a693ae4089533cfcd93b6a27e5e5ef2ec5e7b65e7d87e61d2a`
- Target: `6.9.44`
- Highest parent migration: `044_admin_bulk_cleanup.sql`
- ROI Model: v2.8 / modelVersion 28, unchanged

The parent archive and hash were recorded in `release-lineage.json` before production changes.

## 3. Existing Attachment Foundation Audit

The baseline already contained `handoff_attachments`, stable customer/Solution Fit UUID relationships, uploader metadata, and an Admin Cleanup dependency reference. These were classified **REUSE + EXTEND**. No prior upload/download API, object-storage service, presigned URL workflow, or active evidence UI existed. No competing legacy attachment implementation required removal. Full findings are in `ATTACHMENT_FOUNDATION_AUDIT_v6.9.44.md`.

## 4. Final Attachment Architecture

The governed chain is:

`authorized user → customer → saved Solution Fit → stable context → attachment record → private R2 object`

The browser requests a server-created upload session, uploads directly to a short-lived signed R2 URL, and asks the server to complete the upload. The attachment remains `PENDING` until the server verifies the exact object through R2 metadata and changes it to `ACTIVE`.

## 5. Data Model

Forward-only migration 045 extends `handoff_attachments` with context, original filename, caption, evidence category, expected metadata, lifecycle status, completion/expiry, ETag, removal attribution, and object-deletion status. Existing rows are preserved and normalized as active general evidence. Attachment IDs remain server-generated UUIDs; storage keys remain unique independently of the displayed filename.

## 6. Context Identity Model

Supported contexts are:

- `GENERAL_SOLUTION_FIT`, with no child context ID
- `APPLICATION_PROCESS`, using a stable process ID
- `GAP`, using a stable gap ID
- `INTEGRATION`, using the existing stable integration ID

Readiness-item evidence is deferred because the current production model does not provide an approved stable readiness-item identity. Display names, descriptions, array indexes, and row numbers are rejected as authority.

## 7. Cloudflare R2 Configuration

The storage adapter targets the private S3-compatible endpoint and staging bucket specified by the Product Owner. Bucket policy and credentials are not embedded in code. R2 CORS must permit the deployed Cloud Inventory origin to perform signed `PUT`, `GET`, and `HEAD` operations with `Content-Type` and expose `ETag`.

## 8. Environment Variable Contract

The canonical names are:

- `STORAGE_MODE=S3`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_REGION=auto`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

The access key and secret are entered only in Render. No alternate credential aliases are introduced.

## 9. Storage Service

`src/storage/r2-storage.js` is the single R2/S3 boundary. It owns server-generated object keys and SigV4 `PUT`, `GET`, `HEAD`, and `DELETE` operations. Routes do not implement their own signing logic. Storage configuration is fail-closed while the core Solution Fit remains usable.

## 10. Presigned Upload

Initiation authenticates the user, authorizes the customer and saved Solution Fit, validates the stable context, file type, extension, and requested size, then creates a `PENDING` row and a unique object key. Completion verifies the exact R2 object, size, content type, and storage key before activation. Failed or interrupted uploads never become active evidence. Retry retains the same attachment identity to avoid duplicate records.

## 11. Download Authorization

Download requests re-run current Solution Fit access checks and require an active, non-removed attachment belonging to the selected customer and Solution Fit. Only then is a short-lived signed download URL returned. Permanent public URLs and stored presigned URLs are prohibited.

## 12. Photo Optimization

JPEG and PNG images larger than 5 MB are processed sequentially in the browser. The optimizer uses orientation-aware decoding, preserves aspect ratio, never upscales, caps the long dimension at 4096 pixels, iteratively adjusts quality and dimensions with bounded loops, targets approximately 4.65 MB, and re-encodes without source EXIF/GPS metadata. A photo that cannot meet the limit fails with explicit guidance rather than uploading the oversized source.

## 13. Mobile Camera

The production UI provides a rear-camera-friendly input using `accept="image/*"` and `capture="environment"`, plus a separate existing-photo/file chooser. Selected images receive a local preview whose object URL is revoked when replaced, removed, uploaded, or the modal closes. Processing is sequential to limit mobile memory pressure.

## 14. Supported File Types

- Photos: JPEG and PNG, maximum active size 5 MB
- Documents: PDF, DOCX, XLSX, and PPTX, maximum active size 25 MB
- HEIC/HEIF: explicitly unsupported, with instructions to select or export JPEG/PNG

Zero-byte files, executables, scripts, HTML, SVG, extension/MIME mismatches, malformed images, and unsupported types are rejected. Document files bypass image compression. No malware scanning service is present; the UI and documentation do not claim otherwise.

## 15. Multiple Attachments

Every supported context permits zero, one, or many attachments. Multi-file selection creates independent queue items and lifecycle states. Duplicate original filenames receive separate attachment IDs and server-generated object keys and therefore cannot overwrite one another.

## 16. Captions

Each queued or active attachment supports an optional caption and evidence category. Caption/category updates are authenticated, authorized, server-persisted, and do not alter file identity or storage location.

## 17. Removal/Delete Lifecycle

Removal is individual and auditable. Metadata records `REMOVED`, `removed_at`, and `removed_by`; the row is retained. The private object is then deleted. If object deletion fails, the attachment remains unavailable to users and `deletion_status`/`deletion_error` records the retry need. Removing one attachment does not affect siblings.

## 18. R2 Object Cleanup

An hourly cleanup job reconciles stale `PENDING`/`FAILED` uploads older than 24 hours and retries object deletion where required. It never activates an object and never deletes unrelated bucket keys. This also addresses the object-upload/database-completion distributed failure case without exposing incomplete evidence.

## 19. Authorization

All evidence routes reuse canonical `solutionFitAccess()`. Admin and Solution Engineer users with edit authority can initiate, complete, update, and remove. Authorized Rep-side readers can view/download but cannot mutate. Server-side authorization, not browser controls, is decisive.

## 20. Cross-Customer Isolation

Every operation validates customer, Solution Fit, context, attachment ID, and storage key relationships together. A user cannot move an attachment across customers or Solution Fits by changing request identifiers. The object key is server-generated from UUIDs and sanitized presentation metadata, not customer names or user-supplied paths.

## 21. Customer Reassignment

Ownership reassignment changes access ownership, not customer, Solution Fit, attachment, object, or uploader identity. Evidence therefore remains linked to the same customer/Solution Fit. PostgreSQL integration coverage asserts the previous owner loses owner-derived access, the new owner gains it, and `uploaded_by` remains unchanged.

## 22. Admin Cleanup Integration

Admin Cleanup counts active Solution Fit attachments as dependencies and displays that count before governed cleanup actions. Soft-removed evidence is excluded from active dependency counts. Existing preview, confirmation, audit, and soft-removal protections remain in place.

## 23. Security

The bucket is private; credentials remain server-only; signed URLs are short-lived; object keys prevent traversal and duplicate overwrite; the server verifies actual object metadata; unsafe file types are blocked; downloads require current authorization; and removed/PENDING objects cannot be downloaded as evidence. Static and unit security tests passed. Real deployed authorization and storage checks remain pending.

## 24. Desktop Browser Test

Automated production-module tests verify the chooser, multiple-file queue, captions, per-file status, preview lifecycle, alerts, and stable evidence controls. The required authenticated desktop workflow against deployed PostgreSQL and R2 is **NOT TESTED** in this workspace because no live credentials/session were available.

## 25. Mobile Test

Responsive code and camera input behavior are covered statically and through production-module tests. A real mobile device test covering camera return, orientation, touch targets, network interruption, upload, refresh, download, and independent removal is **NOT TESTED** and is a release blocker.

## 26. Large Photo Test

Automated optimizer tests use production code with controlled image/canvas objects to prove bounded iterative compression, aspect-ratio preservation, no upscaling, orientation-aware decode, metadata-stripping re-encode, and failure handling. A real photo larger than 5 MB uploaded through the deployed R2 workflow is **NOT TESTED** and is a release blocker.

## 27. R2 Integration Test

`test/v6944-r2-integration.test.js` exercises real QA-scoped `PUT → HEAD → GET → DELETE` through the canonical storage service and cleans only its own object. It records **NOT TESTED** locally because R2 credentials were not provided. `R2_INTEGRATION_RESULTS_v6.9.44.json` contains the machine result without secrets.

## 28. PostgreSQL Test

The PostgreSQL suite covers migration preservation, multiple attachments, duplicate names, stable rename relationships, interrupted/mismatched completion, removal isolation, attribution, customer reassignment, authorization changes, and Admin Cleanup dependencies. It records **NOT TESTED** locally because no safe `DATABASE_URL` was available. It must run against a disposable database, never production.

## 29. Solution Fit Regression

The v6.9.44 focused and inherited Solution Fit suite passed 138 tests with zero failures or skips. It covers product-only setup, MEP/CIP/EPP, standard/custom packages, customer switching, stable process/gap/integration identities, cross-account SE rules, dirty-state protection, outputs, and the new evidence controls.

## 30. Full Regression

The full local application suite passed 688 tests with zero failures and three existing skips. Production locks passed 350/350, Brand System passed 19/19, the active output runtime matrix passed 29 tests and 28 output results, and the focused proposal boundary passed 9/9. Database, real R2, authenticated desktop, and mobile integration gates are truthfully recorded as NOT TESTED.

## 31. Files Changed

Changes are limited to the attachment migration, canonical R2 service, attachment routes/shared validation/cleanup, Solution Fit evidence UI and styles, server route/job wiring, Admin Cleanup dependency handling, environment/deployment configuration, tests, release runner/evidence, and required governance/version documents. There are no removed baseline files and no ROI formula changes.

## 32. Migrations

`migrations/045_solution_fit_evidence_attachments.sql` is forward-only and idempotent. It extends the existing table, preserves unknown historical rows, normalizes existing records, adds lifecycle constraints and indexes, and does not drop or recreate the attachment foundation.

## 33. Known Limitations

- Real R2 lifecycle, PostgreSQL integration, authenticated desktop, and real mobile camera tests remain unexecuted locally.
- HEIC/HEIF is not decoded or optimized.
- No malware-scanning service is currently configured.
- Bucket CORS is external infrastructure configuration.
- Local validation ran on Node 24 because of the desktop runtime; CI/Render remain pinned to supported Node 22.

## 34. Deferred PS Turnover Build

v6.9.44 intentionally does not create a turnover ZIP, attachment manifest, Word/PDF evidence appendix, OCR, AI interpretation, or document summarization. The stored metadata supports future grouping by customer, Solution Fit, product/process, gap, integration, and general evidence without another attachment data-model rewrite.

## 35. Release Recommendation

The code is ready for controlled integration certification but not for Product Owner pilot approval. Run migration 045 on a clean non-production PostgreSQL database, execute every PostgreSQL suite without skips, configure and test the private R2 bucket, then complete authenticated desktop, real mobile, and real >5 MB image tests. Do not classify the release GREEN until all required evidence passes.

RED — Release blocker remains
