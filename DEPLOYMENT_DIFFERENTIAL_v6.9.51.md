# v6.9.51 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.51-render-ready.zip`, verified SHA-256 `791AD9298068A23EA95E6FB84A42385188C01A9B14AE145E942A3219D552FAAD`.

Latest production main was clean and pulled before work: `1a428bbbab88e0b35ccb2e70954479ed77031fc0` (v6.9.50). Work is on the requested `deploy/v6.9.51` branch for a reviewed pull request into main; deployment remains on the existing Render `cloud-inventory-roi` service.

## Reconciliation and scope

Applied the supplied v6.9.51 contents while preserving existing deployed corrections missing from its raw archive ancestry. The exact v6.9.50 archive is a comparison ancestor only. New production behavior is limited to `public/map.js`: prospect-link Share, Rotate and Revoke require server-returned `canEditPlan` plus the existing saved/clean readiness. Review PDF/PPTX availability remains independently governed. Other application edits are release/version metadata. The supplied capability regression, focused gate and permanent registration are included.

Preserved the existing evidence/R2 validation, upload and PS Turnover lifecycle protections, customer/workspace isolation, canonical Executive outputs, null-preserving financial summaries, strict HTTP assertions and all three PostgreSQL fixture corrections from the deployed v6.9.50 follow-up. Incoming governance/audit additions are retained alongside historical deployment evidence. CI retains Node 22.22.0.

Migration files and Render YAML remain byte-identical to main. ROI Model v2.8 / modelVersion 28, Brand System 1.0, Application Knowledge 1.0, Christie Persona 1.0, migration level 045 and 29 active output owners are preserved. No environment variable, production credential, database configuration, service or Blueprint changes are included. Existing build, pre-deploy migration check, direct `node server.js` start (equivalent to `npm start`) and `/health` are retained.

## Local verification under Node 22.22.0

- Production dependency installation passed with the existing build command.
- All 6 changed/new JavaScript files passed syntax checks.
- `npm run test:v6951`: 48 passed, no failures/skips. This includes the production JPP script in a DOM harness, real Express router behavior and the 29-output runtime matrix.
- Main non-browser package script: 692 passed, no failures; 3 database-dependent skips.
- Non-browser production locks: 361 passed, no failures/skips.
- Brand/knowledge validation and active-output audit passed in the package scripts.

The last two executions disable npm lifecycle pretests solely to classify local non-browser evidence separately. Normal package/CI scripts retain all mandatory pretests and the existing headless Solution Fit regression. The restricted local browser and PostgreSQL limitations remain as previously recorded; neither has a local PASS claim. The PR must pass the complete Node 22 workflow and disposable PostgreSQL 16 migrations/integration with zero database failures and skips before merging. Tests never use the production customer database. Private R2 and authenticated deployed owner/non-owner acceptance remain separate boundaries; health or deployment success does not certify them. No final Product Owner readiness colour is assigned.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
