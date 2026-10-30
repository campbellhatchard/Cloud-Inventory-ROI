# v6.9.55 deployment preparation differential

Supplied package `cloud-inventory-roi-v6.9.55-render-ready.zip` matches the user-provided SHA-256 `E5A7D5B09391AF43A739691CA29849EE70193D8A715F9FE499E0D2DAB06F9DD8`. CRC and extraction-path checks passed. Application files and folders are at the repository root.

Starting production main and currently deployed commit: `8c6bcc630355a5773cb22ddfbb7c9a36e50abad5` (v6.9.54). Clean main was pulled before creating `release/v6.9.55` in `campbellhatchard/Cloud-Inventory-ROI`. Production remains this commit until the explicit backup prerequisite is met and the release is merged.

## Reconciliation

Applied the supplied archive's 49-file differential forward to current main, comparing against exact raw v6.9.54 only as a common ancestor. Retained deployed R2/evidence/PS Turnover corrections, customer isolation and ownership, financial null preservation, stronger regressions, PostgreSQL fixture repairs, historical deployment evidence and the Node 22.22.0 CI pin. Reconciled the additive Sales Manager fixture comment with its deployed valid primary-role fixture; no assertion or authority was weakened. Baseline/differential reports retain prior reconciliation history.

Incoming scope includes the commercial evidence correction, server-owned 28-requirement projection, adaptive Buyer Evidence drawer, explicit saved-state/reuse presentation, governed Help/Christie metadata, PostgreSQL row-version cleanup fingerprints and operational timestamp preservation. All incoming production changes and new tests are retained. No independent feature was introduced during deployment preparation.

Added exactly `046_preserve_operational_transfer_timestamps.sql`, which replaces the existing scenario timestamp trigger function to honor transaction-local preservation around the supplied ownership-transfer and current-version maintenance calls. All previous migration bytes are unchanged. Buyer Evidence remains in existing storage; no data rewrite or new Buyer Evidence schema is added.

Render service `cloud-inventory-roi` remains on main with automatic commit deployment. Existing production build `npm ci --omit=dev --no-audit --no-fund`, pre-deploy `npm run migrate`, start `node server.js`, `/health`, Node 22.22.0 and Render YAML are unchanged. No environment variable, credential, production .env, database, service or Blueprint was replaced or modified. ZIPs, dependencies, Git internals, credentials and backups are excluded from publication.

## Local evidence under Node 22.22.0

- Production dependency installation passed (240 packages).
- All 22 changed/new JavaScript files passed syntax checks.
- v6.9.55 requirement/evaluator plus v6.9.54 and inherited criterion coverage: 32 passed, zero failures/skips.
- Main package script with lifecycle pretests disabled: 692 passed, zero failures; three database-dependent skips.
- Production-lock script with lifecycle pretests disabled: 361 passed, zero failures/skips.
- Brand/knowledge checks, active production-path audit and all 29 registered active output owners passed in those runs.

Lifecycle-disabled executions are local non-browser evidence only. Normal package/CI scripts retain all pretests and the mandatory headless Solution Fit regression. CI runs migrations and all 18 database integration files against disposable PostgreSQL 16. No automated tests or migration command are manually run against production. Local real PostgreSQL/headless-browser PASS is not claimed. Source-package evidence retains its source execution scope. CI evidence for the exact published commit is separate. Private R2, live email delivery and full authenticated functional acceptance are not inferred from CI or health.

## Production backup prerequisite — pending

The existing database is `cloud-inventory-roi-db` (`dpg-d938mqfavr4c73bklu70-a`). The Render connector supports inspection but has no logical-backup creation operation. The existing database dashboard was opened; Render requires sign-in. The secure sign-in flow did not complete. No backup was created or represented as completed. Do not merge/deploy this migration release until a restorable export has been created and its completion recorded. The user has authorized deployment after this prerequisite; this pending state does not request a new deployment approval.

No final Product Owner readiness colour or Production Ready claim is assigned.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
