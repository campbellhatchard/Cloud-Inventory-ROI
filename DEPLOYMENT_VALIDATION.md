# Cloud Inventory ROI v5.5.9 Deployment Validation

## Purpose

Hotfix for the Render startup failure in `022_competitive_sources.sql`.

Render failed with:

```text
foreign key constraint "ci_product_sources_uploaded_by_fkey" cannot be implemented
```

## Root cause

`users.id` is UUID, but migration 022 defined `uploaded_by` and `created_by` as INTEGER references to `users(id)`. PostgreSQL cannot implement a foreign key between INTEGER and UUID columns.

## Fix included

- `ci_product_sources.uploaded_by` changed to `UUID REFERENCES users(id)`.
- `competitive_research_cache.created_by` changed to `UUID REFERENCES users(id)`.
- Version metadata updated to `5.5.9`.
- Prior hardening retained for migration 017, `requireAuth`, browser inline scripts, version consistency, and deployment ZIP exclusions.
- The PowerShell toolkit was consolidated into a single deployment script to avoid the prior cross-script parameter defects.

## Validation completed in sandbox

- ZIP/root structure: passed.
- Required Render files present.
- `package.json`, `package-lock.json`, and lockfile root package aligned to `5.5.9`.
- `.node-version` is `22.22.0`.
- Migration 017 FK hotfix retained.
- Migration 022 UUID FK hotfix applied.
- Migrations present through `022_competitive_sources.sql`.
- JavaScript syntax checks passed; 58 files checked.
- Inline HTML script syntax checks passed; 3 inline scripts checked.
- `switchAdminPanel(panel)` wrapper restored.
- ESC modal comment opener restored.
- Error Log inline quote escaping repaired.
- ROI engine tests passed: 17 passed, 0 failed.
- Route test loader passed; DB integration skipped because `DATABASE_URL` is not set in sandbox.
- Version consistency passed.
- Deployment ZIP excludes `node_modules`, `.git`, environment files, and OS metadata.

## Sandbox caveat

A full `npm ci` did not complete reliably inside this sandbox. The PowerShell toolkit runs `npm ci --omit=dev --no-audit --no-fund`, the server require smoke test, syntax checks, application tests, ZIP exclusion checks, repository replacement checks, and Git commit/push locally before it pushes to GitHub.
