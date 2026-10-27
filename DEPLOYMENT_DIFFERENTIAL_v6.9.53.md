# v6.9.53 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.53-render-ready.zip`, verified SHA-256 `56636B522C27DADECE38AA793E180C2A442E0AC6F72343A821F7155BDFFE63A4`.

Clean production main was pulled before work: `52041bc14a21dcdb184baaadd06b83aab69b673f` (v6.9.52). Publication remains on main of `campbellhatchard/Cloud-Inventory-ROI`, which deploys the existing Render `cloud-inventory-roi` service automatically.

## Reconciliation and changed boundary

Applied the supplied v6.9.53 contents forward to current main. The exact raw v6.9.52 archive is used only as a common comparison ancestor. All incoming production corrections are retained, including the PostgreSQL DATE OID 1082 text parser, shared server date-only formatter, strict browser contract, calendar-based overdue comparison, editor hydration, and JPP PDF/PPTX consumers. Timestamp parsers, schema, saved values, ownership and authorization are unchanged. Existing deployed evidence/R2/PS Turnover, workspace isolation, canonical Executive, financial-summary and regression corrections absent from the source archive ancestry remain intact. The deal-export reconciliation was clean; prior blocked-export warning behavior remains.

Preserved all three deployed PostgreSQL fixture corrections and the valid disposable fixture/strict HTTP regressions. Source-package historical PostgreSQL failure reports retain their original scope. They do not override exact-published-commit CI evidence, which must execute the complete aggregate suite, including the new five-test real PostgreSQL date boundary. Historical audit and deployment evidence remains alongside the supplied v6.9.53 records.

No migration is added; level remains 045 and every migration file remains byte-identical to main. Render YAML and service configuration are unchanged. Existing build `npm ci --omit=dev --no-audit --no-fund`, pre-deploy `npm run migrate`, start `node server.js`, `/health` and Node 22.22.0 are retained. No production environment variable, credential, database configuration, service, environment or Blueprint is created or changed.

## Local verification under Node 22.22.0

- Production dependency installation passed with the existing build command.
- All 13 changed/new JavaScript files passed syntax checks.
- `npm run test:v6953`: 61 passed, no failures/skips. Includes actual pg parser behavior, strict shared contracts, timezone/DST cases, generated internal/customer PDF and PPTX byte/OOXML inspection, previous JPP date/capability regressions, and all 29 active output owners.
- Main non-browser package script: 692 passed, no failures; 3 database-dependent skips.
- Non-browser production locks: 361 passed, no failures/skips.
- Brand/knowledge validation and active-output audit passed in those scripts.

The last two executions disable npm lifecycle pretests only to classify local non-browser evidence separately. Normal package/CI scripts retain every pretest, the headless Solution Fit browser regression, PostgreSQL 16 migrations and all 16 registered database integration suites. The restricted local PostgreSQL/browser boundary remains as previously recorded; no local real-database or headless browser PASS is claimed. CI must supplement this local evidence. Tests never use the production customer database. Private R2 and authenticated deployed acceptance remain separate boundaries and are not inferred from deployment/health success. No final Product Owner readiness colour is assigned.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
