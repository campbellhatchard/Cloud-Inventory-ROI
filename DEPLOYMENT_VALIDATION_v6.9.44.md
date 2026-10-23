# Deployment Validation — Cloud Inventory ROI v6.9.44

## Status

Not executed against Render. This file is the required post-deployment checklist; unchecked work is not passed.

## Render environment

Configure exactly:

- `STORAGE_MODE=S3`
- `S3_ENDPOINT=https://eaca76ebb7eb4baa41e6b69405f46708.r2.cloudflarestorage.com`
- `S3_BUCKET=cloud-inventory-discovery-staging`
- `S3_REGION=auto`
- `S3_ACCESS_KEY_ID` as a Render secret
- `S3_SECRET_ACCESS_KEY` as a Render secret

Do not expose either credential through browser configuration, logs, reports, or source.

## Private R2 bucket CORS

Allow only the deployed Cloud Inventory origin (currently `https://cloud-inventory-roi.onrender.com`) for `PUT`, `GET`, and `HEAD`. Allow the `Content-Type` and `If-None-Match` request headers, expose `ETag`, and use a bounded cache age. Do not enable a public bucket URL.

## Deployment

1. Deploy the validated Git commit/package with Node 22.
2. Confirm migration `045_solution_fit_evidence_attachments.sql` completes.
3. Confirm `/health` reports `6.9.44`.
4. Confirm sign-in, customer loading, ROI scenario loading, and Solution Fit loading before evidence testing.

## Desktop evidence test

- Sign in as an authorized SE.
- Open a QA customer and its saved Solution Fit.
- Add two JPEG/PNG images and one PDF to an application/process; add captions and upload.
- Confirm three independent records, open the image, download/open the PDF, refresh, and confirm all three persist.
- Remove one image, refresh, and confirm the other image and PDF remain.
- Switch customers and confirm no evidence leakage; switch back and confirm the two remaining records.
- Confirm a read-only authorized Rep can view/download but cannot add, edit, or remove.

## Large-photo/mobile test

- On real iOS and/or Android hardware, use **Take photo** with a source image over 5 MB.
- Confirm preview, `Optimizing photo…`, correct orientation, readable labels/detail, final stored size at or below 5 MB, caption persistence, refresh persistence, second-photo upload, and individual removal.
- Confirm **Choose photo / file** remains available and camera capture is not forced.
- Confirm HEIC/HEIF receives the documented JPEG/PNG guidance rather than a false success.

## Failure and security test

- Interrupt an upload; confirm no ACTIVE evidence and retry does not duplicate the record.
- Expire/reissue an upload session.
- Reuse an upload URL after successful upload: R2 must reject replacement with HTTP 412, and the originally verified object must remain unchanged.
- Attempt wrong customer, Solution Fit, process, gap, attachment, file type, executable, zero-byte, and oversized requests; all must fail safely.
- Remove an attachment while simulating object-delete failure; confirm metadata records RETRY and reconciliation later deletes only that object.
- Temporarily remove R2 configuration; confirm Solution Fit remains usable and evidence shows the unavailable message.

## Certification commands

With a clean non-production `DATABASE_URL` and staging R2 credentials:

```text
npm ci --omit=dev --no-audit --no-fund
npm run migrate
npm run test:postgres
npm run test:r2
npm run release:gates
```

Expected: zero failures; PostgreSQL and R2 results must have `NOT TESTED = 0` before pilot approval.

RED — Release blocker remains
