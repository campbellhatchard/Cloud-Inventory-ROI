# v6.9.54 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.54-render-ready.zip`. Computed SHA-256: `C9A1665F16393E421E181727F04C6FAABBF6D35E4427F3CFF7716B1DC62B0915`. No independent expected v6.9.54 hash was supplied. ZIP CRC checks passed; extracted root contains package.json, server.js, render.yaml, public, src, and migrations.

Clean main was pulled before work: `d779e646adfb91927e8294faeb599a77c134acdb` (v6.9.53), in `campbellhatchard/Cloud-Inventory-ROI`. The existing Render service deploys main on commit.

## Differential and inheritance

The sole production behavior change is the supplied `proposal_alignment` correction in `src/shared/criterion-evidence.js`. Qualifying criterion-specific Buyer Evidence can complete without a saved Proposal artifact; an artifact alone remains insufficient. Evidence strength, freshness, stakeholder, source and customer-validation requirements and independent stage gates remain in force. New evaluator/service and real PostgreSQL route/reload regressions are registered additively in CI and permanent coverage.

Applied the release's 29-file raw-archive differential forward to deployed main, using exact raw v6.9.53 only as the common comparison ancestor. Preserved all 78 nonoverlapping deployed differences, including R2/evidence/PS Turnover, ownership, null-preserving financial summaries, stronger regression assertions, and the three PostgreSQL fixture corrections. CI and baseline/differential reports were reconciled to retain the deployed Node pin and historical reconciliation evidence. All migration files and render.yaml remain byte-identical to deployed main. Migration level remains 045.

Version, lineage, Version History, governance, evidence records, and release-gate wiring advance to 6.9.54. Existing source-package historical PostgreSQL fixture failures and readiness statements retain their original scope. They are not the result of the exact reconciled commit's CI. No final readiness colour or Production Ready status is assigned here.

No production secret, environment variable, database, service, environment or Blueprint is created or changed. Existing build `npm ci --omit=dev --no-audit --no-fund`, pre-deploy `npm run migrate`, start `node server.js`, Node 22.22.0 and `/health` are retained. ZIPs, dependencies, Git internals, backups and secrets are excluded from publication.

## Local verification under Node 22.22.0

- Production npm installation passed (240 packages).
- All six changed/new JavaScript files passed syntax checks.
- New Buyer Evidence evaluator plus inherited criterion tests: 18 passed, zero failures/skips.
- `npm run test:v6954`: 89 passed, one failure because the local shell has no Chrome/Edge for the inherited mandatory headless Solution Fit regression. The failure is not waived or weakened; CI retains the full test.
- Main package script with lifecycle pretests disabled: 692 passed, zero failures, three database-dependent skips.
- Production-lock package script with lifecycle pretests disabled: 361 passed, zero failures/skips.
- Generated brand/knowledge validation, 29 active output owners and active-path audit passed in those runs.

The two lifecycle-disabled executions are local non-browser evidence only. Normal package and CI scripts keep all pretests and mandatory headless browser coverage. Safe disposable PostgreSQL 16, all existing migrations and all 17 registered database integration files execute in CI; no real PostgreSQL PASS is claimed locally. Automated tests never use the production database. External private R2 and authenticated deployed acceptance are separate boundaries. Successful CI, deployment and public health alone do not certify those boundaries.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
