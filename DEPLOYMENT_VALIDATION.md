# Cloud Inventory ROI v4.3.1 Deployment Validation

Source upload: `cloud-inventory-roi-v4_3_1.zip`

## Packaging corrections applied

- Moved `.node-version` to the package root.
- Moved `.github/workflows/ci.yml` to the package root.
- Removed leftover nested `cloud-inventory-roi-v4_0_0/` folder from the deployable package.
- Aligned `package-lock.json` root version from `2.9.3` to `4.3.1`.
- Added `.npmrc` to force the public npm registry.

No application logic was changed.

## Validation results

- **Required root files:** passed
- **package.json / package-lock.json alignment:** passed
- **.node-version at package root:** passed
- **render.yaml structure:** passed
- **NPM registry hygiene:** passed
- **JavaScript syntax checks (50 files):** passed
- **Inline HTML script syntax checks (10 blocks):** passed
- **ROI engine tests: 22 passed, 0 failed:** passed
- **Route test loader:** passed
- **Discovery public-link auth fix:** passed
- **Migrations present through 015_scenario_shares.sql:** passed
- **No node_modules included in final ZIP:** passed

## Sandbox caveat

A full live `npm ci` is not treated as authoritative in this sandbox because external registry access can be unreliable here. The PowerShell deployment toolkit runs `npm ci --omit=dev --no-audit --no-fund` locally before pushing to GitHub.

## Expected Render health response

```json
{
  "status": "ok",
  "version": "4.3.1",
  "database": "connected",
  "phase": "production"
}
```
