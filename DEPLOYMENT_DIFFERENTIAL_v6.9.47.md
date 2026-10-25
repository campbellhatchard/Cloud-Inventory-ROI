# v6.9.47 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.47-render-ready.zip`, SHA-256 `99815fc362b98fa30e781944251cd02fdbc66b06f2c67dae20f4e3d287e8d8e6`.

Production Git parent: `cc93e516474160782a92f30d3a474a858d0d18ee` (v6.9.46). The existing service is `cloud-inventory-roi`, deploying `main` in `campbellhatchard/Cloud-Inventory-ROI`. Archive lineage remains unchanged and distinct from deployed Git ancestry.

## Reconciliation

The supplied archive does not inherit all corrections already deployed on main. A direct overlay removed existing behavioral regressions. Running those permanent tests against the archive behavior reproduced 12 failed and 4 cancelled cases out of 47; 31 passed. After reconciliation, all 47 passed with zero failures, cancellations, or skips.

The three supplied v6.9.47 changes are retained: explicit canonical Three Why clear/omission/restoration, application-owned custom-application creation, and read-only Primary SE display completeness.

Existing deployed corrections remain intact: create-only signed uploads and content-type binding; uncompressed R2 object metadata; conditional attachment completion/retry; atomic expired-upload cleanup and deletion retries; active-only attachment counts; cleanup timestamp fingerprints; evidence customer/modal/load isolation; PS Turnover archive-name uniqueness, safe HTTP filename, cancellation and stream/file cleanup; stale preview/download suppression; canonical-null economic summaries; existing permanent regression tests; and valid disposable PostgreSQL fixtures. Historical evidence and migrations remain unchanged.

`public/solution-fit.js` combines the supplied custom modal and Primary SE presentation with main's evidence reset, turnover preview revision, and package-action workspace guards. No new business functionality was introduced.

Render configuration remains byte-identical to production main, retaining `npm run migrate` as the pre-deploy command. CI retains Node 22.22.0. No environment settings or production secrets were edited. No service, database, or Blueprint was created. No dependency directory, secret file, Git internals, or ZIP is included in the commit.

## Verification boundaries

Verification uses Node 22.22.0. Local release gates record their actual database/R2 availability. PostgreSQL certification uses the existing CI workflow's disposable PostgreSQL 16 `ci_test` database, never the customer database. Private R2 and authenticated deployed browser certification remain separate from deployment health. Supplied archive reports are historical evidence; current machine results and CI results supersede them only for checks actually executed. Deployment success is not a Product Owner readiness classification.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.

## Local execution evidence

Locked production dependency installation and all locally available release gates passed on Node 22.22.0 (npm 11.9.0), with 3,141 passing assertions across repeated gates and no failed gate. Database-dependent and real R2 gates were explicitly recorded as NOT TESTED locally. The focused preserved-regression run passed 47/47. All 29 active output generators emitted validated artifact content. All 298 JavaScript files passed syntax checks. PostgreSQL CI results will be reviewed after the authorized main push. A local disposable PostgreSQL attempt could not initialize because this execution environment does not permit switching from root to a database process user; no integration tests used a customer database.
