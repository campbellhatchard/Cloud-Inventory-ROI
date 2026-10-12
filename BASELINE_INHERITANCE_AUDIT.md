# v6.9.38 Pre-build Baseline Inheritance Audit

## Authoritative parent

- Archive: `cloud-inventory-roi-v6.9.37-render-ready.zip`
- SHA-256: `ea4c0b157743514f0f30b4ab57076fa2423082150fa07806f2bbee52427fe7da`
- Deployed parent commit: `184d3667067bcaf7590dda2d60842ab0c2efb23b`
- Developer source snapshot: `7954338eca8a9a756431f65ee9de8522a310095f`
- Parent application version: `6.9.37`
- Target application version: `6.9.38`

The parent archive hash was verified before production code changed. The working tree was clean at the recorded parent commit.

## Protected inheritance

- ROI authority remains ROI Model v2.8 / `modelVersion` 28.
- Intentionally preserved legacy saved scenarios remain immutable unless a user deliberately creates an upgraded v2.8 version.
- Brand System, Application Knowledge, and Christie Persona remain v1.0.
- Executive Value Story, readiness, customer-safe projections, immutable Prospect evidence, Value History, Rep Confirmed, BuyCycle, Solution Fit authorization, saved-state output authority, Customer Business Case publication, and output registry behavior remain unchanged.
- SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Baseline paths verified

- Active ROI report Web route: `GET /api/scenarios/:id/roi-assumptions-report`
- Active ROI report PDF route: `GET /api/scenarios/:id/export-roi-assumptions-pdf`
- Shared source: `loadExecutiveSource()` → `buildExecutiveValueStory()` → authoritative ROI engine result
- Active Web owner: `public/roi-assumptions-report.js`
- Active PDF owner: `src/exports/roi-assumptions-pdf.js`
- No database migration is required.

## Production findings carried into this correction

1. Desktop report modal CSS did not apply above 640 pixels.
2. Legacy saved-model method flags were absent, leaving two non-zero driver traces without inputs and misidentifying legacy service economics as v2.8 contribution-margin economics.

No other production change is authorized by this correction.
