# Cloud Inventory ROI v5.6.1 Deployment Validation

Source upload: `cloud-inventory-roi-v5_6_1.zip`  
Validated package: `cloud-inventory-roi-v5.6.1-render-ready.zip`

## Packaging corrections applied

- Removed leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package-lock.json` root metadata from `4.9.2` to `5.6.1`.
- Preserved `render.yaml` production build target with `npm ci --omit=dev --no-audit --no-fund`.
- Confirmed `.node-version` is `22.22.0`.
- Confirmed `.npmrc` uses the public npm registry.
- Confirmed migration `017_share_links_follow_latest.sql` keeps the scenario_base_id FK hotfix.
- Confirmed migration `022_competitive_sources.sql` uses UUID for `uploaded_by` and `created_by`, matching `users.id`.
- Replaced legacy `_reqAuthCompanies` references with `requireAuth` and ensured `requireAuth` is declared before protected routes.
- Fixed browser inline JavaScript errors in `public/index.html`:
  - error-log filter button quote escaping;
  - error-log stack-trace button quote escaping;
  - ESC modal comment opener.
- Removed `node_modules`, `.git`, `.env`, `.env.local`, and OS metadata from the deployment ZIP.

## Important lockfile handling

This release adds real npm dependencies, including `pptxgenjs` and `docx`. The uploaded lockfile was stale, so the PowerShell toolkit refreshes `package-lock.json` with:

```powershell
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
```

Then it runs:

```powershell
npm ci --omit=dev --no-audit --no-fund
```

The updated lockfile is what gets committed and pushed to GitHub. Do not manually push the ZIP contents without running the toolkit, or Render may fail at `npm ci` because the lockfile would not yet include the new dependencies.

## Validation checks completed in sandbox

- ZIP/root structure: passed.
- Render Blueprint structure: passed.
- `package.json` / `package-lock.json` version metadata alignment: passed.
- Migration 017 FK hotfix: passed.
- Migration 022 UUID FK compatibility: passed.
- Migrations present: 001 through 022.
- `requireAuth` initialization-order validation: passed.
- Legacy `_reqAuthCompanies` reference check: passed.
- JavaScript syntax checks: passed; 60 files checked.
- Inline HTML script syntax checks: passed; 12 scripts checked.
- Browser inline fixes: passed.
- ROI engine tests: 17 passed, 0 failed.
- Version consistency: passed; package, APP_VERSION, and VERSION_HISTORY all report `5.6.1`.
- Migration schema compatibility tests: 26 passed, 0 failed.
- No `node_modules`, `.git`, `.env`, `.env.local`, or OS metadata included in the deployment ZIP.

## Sandbox caveat

A full registry-backed lockfile regeneration could not be completed in this sandbox because the sandbox cannot reach npm reliably. The PowerShell toolkit performs that step on the deployment machine before cloning, committing, or pushing to GitHub.
