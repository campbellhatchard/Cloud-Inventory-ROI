# v6.9.50 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.50-render-ready.zip`, SHA-256 `A43C5B5008841B2B932716E7950B5D72902595C3ED7EC04FCAA1AD97BE99201C` (verified).

Deployment parent: `474e6708e756a39444b03e637cae1ac90525341b` (v6.9.49), latest `main` pulled before work. Target remains the existing `campbellhatchard/Cloud-Inventory-ROI` repository and Render `cloud-inventory-roi` web service.

## Reconciliation

Applied the supplied v6.9.50 corrections forward to current main. The supplied v6.9.49 archive is used only as a comparison ancestor to distinguish incoming corrections from deployed fixes omitted by the archive. Preserved unchanged historical evidence and deployed R2 signature/metadata validation, evidence upload completion/retry/cleanup, PS Turnover integrity/cancellation, customer/workspace isolation, null-preserving financial summaries and Executive output authority.

Cleanly merged the incoming Word warning, handoff readiness, attachment query and workflow changes. Overlapping Cleanup changes use the new shared active-evidence predicate and explicit invalid-Date rejection. Both the earlier timestamp regression and the new nested canonicalization regression remain. The HTTP integration fixture retains its strict persisted-data and positive-benefit assertions while adding the supplied no-measured-driver case. No permanent regression was removed or weakened. Historical baseline and differential records remain alongside the source-package records.

Render YAML, migration files and protected ROI engine sources remain unchanged. CI retains Node 22.22.0. Existing build, pre-deploy `npm run migrate`, `node server.js` start, and `/health` settings remain. No service, database, Blueprint, environment variable or credential is created or changed. Migration level remains 045.

## Local verification

Executed under Node 22.22.0:

- Production dependency installation passed with the existing build command.
- All 27 changed/new JavaScript files passed syntax checks.
- Direct production-integrity and Cleanup regressions: 24 passed, no failures or skips.
- Main non-browser package script: 692 passed, no failures; 3 database-dependent skips.
- Non-browser production locks: 361 passed, no failures or skips.
- The main and lock scripts ran with npm lifecycle pretests disabled only for these separately classified non-browser executions. The mandatory headless-browser test remains unchanged in normal npm/CI scripts. Local browser execution remains unavailable in this restricted runtime as recorded for v6.9.49; no browser PASS is claimed here.
- Brand/knowledge checks and all 29 active output runtime owners passed as part of those scripts.

The existing GitHub workflow must execute the complete release gates, including the browser regression, PostgreSQL 16 migrations and all 15 database suites on the exact published commit. Local automated tests do not use production customer data. Private R2 and the full authenticated live role/output matrix are separate certification boundaries, not inferred from deploy or health success. Source-package machine reports retain their stated scope. This deployment evidence does not assign a Product Owner readiness colour.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
