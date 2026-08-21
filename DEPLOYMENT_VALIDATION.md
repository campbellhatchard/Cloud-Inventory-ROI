# Cloud Inventory ROI v4.9.5 Deployment Validation
Generated: 2026-08-21T19:47:33.843334Z
## Corrections applied
- Removed leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package-lock.json` to `4.9.5`.
- Confirmed `.node-version` at repository root with `22.22.0`.
- Confirmed `.npmrc` forces the public npm registry.
- Confirmed migration `017_share_links_follow_latest.sql` includes the v4.9.2 foreign-key hotfix.
- Excluded `node_modules`, `.git`, and environment files from the deployment ZIP.

## Validation results

- **PASS** — Original ZIP integrity: unzip -t passed
- **PASS** — Required Render root files: all required files/folders present
- **PASS** — Render Blueprint structure: checks passed
- **PASS** — package.json / package-lock.json alignment: package=4.9.5 lock=4.9.5 root=4.9.5 node=22.22.0
- **PASS** — NPM registry hygiene: no private/local registry references detected
- **PASS** — JavaScript syntax checks: checked 53 JavaScript files
- **PASS** — Inline HTML script syntax checks: checked 10 inline scripts
- **PASS** — ROI engine tests: 17 passed, 0 failed
- **PASS** — Route test loader: passed; DB integration skipped because DATABASE_URL is not set in sandbox
- **PASS** — Discovery public-link auth fix: public route present; analytics router does not use broad requireAuth
- **PASS** — Migration 017 FK hotfix: scenario_base_id has no invalid FK to scenarios(id)
- **PASS** — Migrations present: 001_initial_schema.sql through 018_discovery_submission.sql (18 files)
- **PASS** — No node_modules included: node_modules not present
- **WARN** — Live npm ci in sandbox: attempted but timed out in sandbox; toolkit runs npm ci locally before push

## Notes
- No application logic was changed during deployment packaging.
- Database-backed route integration tests were not executed because `DATABASE_URL` is not set in the sandbox.
- Render should use Node `22.22.0` via `NODE_VERSION` and run `npm ci --omit=dev --no-audit --no-fund`.
