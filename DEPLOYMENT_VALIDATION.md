# Cloud Inventory ROI v4.5.0 Deployment Validation

## Package corrections applied

- Moved `.node-version` to the package root.
- Moved `.github/workflows/ci.yml` to the package root when present.
- Removed the leftover nested `cloud-inventory-roi-v4_0_0/` folder.
- Aligned `package.json` and `package-lock.json` to version `4.5.0`.
- Added `.npmrc` to force `https://registry.npmjs.org/` and avoid inherited/private npm registry configuration.
- Removed `node_modules` and any `.git` metadata from the deployment package.

No application logic was changed during packaging.

## Validation checks

- PASS: ZIP integrity
- PASS: Required Render root files
- PASS: render.yaml structure
- PASS: package.json / package-lock.json alignment
- PASS: .node-version at package root
- PASS: .github/workflows/ci.yml at package root
- PASS: public npm registry hygiene
- PASS: JavaScript syntax checks
- PASS: Inline HTML script syntax checks
- PASS: ROI engine tests
- PASS: Route test loader
- PASS: Discovery public-link auth fix
- PASS: No node_modules included

## Details

- `package.json` version: `4.5.0`
- `package-lock.json` version: `4.5.0`
- `.node-version`: `22.22.0`
- JavaScript files checked: `52`
- Inline HTML script blocks checked: `10`
- Migrations present through: `015_scenario_shares.sql`

### Render checks

- PASS: runtime: node
- PASS: buildCommand uses npm ci
- PASS: startCommand node server.js
- PASS: healthCheckPath /health
- PASS: autoDeployTrigger commit
- PASS: maxShutdownDelaySeconds 15
- PASS: DATABASE_URL fromDatabase
- PASS: NODE_VERSION 22.22.0

### Discovery checks

- PASS: analytics router does not globally apply router.use(requireAuth)
- PASS: public discovery route exists
- PASS: prospect page supports ?token=

### ROI engine test output

```text
ROI engine tests:
  ✓ OVERLAP_DEDUCTION is 0.15
  ✓ laborSav = users×labor×mLabor
  ✓ shrinkSav = base×mShrinkage
  ✓ carrySav applies 15% overlap
  ✓ otifSav uses target-baseline gap
  ✓ itSav = itCost×mIt
  ✓ annualBenefit positive
  ✓ laborWastePct scales labor
  ✓ labor waste ignored pre-v25
  ✓ v2.5 levers = 0 at v24
  ✓ downtimeSav correct at v25
  ✓ expediteSav correct at v25
  ✓ WMS levers = 0 at v25
  ✓ throughputSav correct at v26
  ✓ accuracySav correct at v26
  ✓ Field levers = 0 at v26
  ✓ truckRollSav correct at v27
  ✓ techRevenueSav correct at v27
  ✓ fieldCostSav excludes revenue
  ✓ fieldRevenueSav = techRevenueSav
  ✓ no-new-lever inputs identical across versions
  ✓ empty input safe (benefit >= 0, no NaN)

🟢 22 passed, 0 failed
```


### Route test output

```text
TAP version 13
# Subtest: HTTP API integration
ok 1 - HTTP API integration # SKIP DATABASE_URL not set — integration tests skipped
  ---
  duration_ms: 0.443367
  type: 'suite'
  ...
1..1
# tests 0
# suites 1
# pass 0
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 59.674744
```
