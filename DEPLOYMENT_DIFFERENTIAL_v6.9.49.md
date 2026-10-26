# v6.9.49 deployment differential

User-authorized archive: `cloud-inventory-roi-v6.9.49-render-ready.zip`, verified SHA-256 `A89C9A4979FDE31FCAA2B129EEEB08A9BCE8897165D66DC58D8206A95829128D`.

Production Git parent: `f5a7882cfc180ab2b966267052e4309b3b342038` (v6.9.48). The deployment uses the existing `campbellhatchard/Cloud-Inventory-ROI` repository, `main` branch and `cloud-inventory-roi` service.

## Reconciliation

The v6.9.49 archive supplies the scope selector, normalized persisted PUT response and serialized browser reconciliation/rollback. Existing deployed corrections absent from its package ancestry remain intact. The original v6.9.48 archive is used only as the common comparison ancestor; three-way reconciliation of `public/solution-fit.js` and `src/routes/handoffs.js` completed without conflicts. Every supplied v6.9.49 production correction is retained.

Preserved deployed authorities include evidence/R2 signatures and metadata; attachment completion/retry and cleanup; customer/modal/load isolation; PS Turnover collision, filename, cancellation, stream/file cleanup and stale-response guards; canonical-null economic summaries; timestamp fingerprints; canonical Executive output-model semantics; permanent regressions and valid disposable PostgreSQL fixtures. Historical release evidence is preserved.

Render configuration and migrations remain byte-identical to current main, retaining the build command, direct `node server.js` start, `npm run migrate` pre-deploy step and `/health` check. `npm start` remains the equivalent package script. CI retains Node 22.22.0. No environment variable, production credential, database configuration, service or Blueprint is changed. No new migration is included.

## Verification boundary

Local checks use Node 22.22.0. The existing GitHub CI performs PostgreSQL integration against its disposable database; automated integration tests must never use production customer data. Private R2 and the complete deployed role/artifact matrix remain separate certification gates. Source-build reports retain their original meaning; deployment success does not assign a Product Owner readiness colour. ZIP archives, dependencies, secrets and Git internals are excluded from the published tree.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.

## Local browser limitation

The complete release-gate runner records failures in the three npm entry points whose mandatory pretest invokes the new headless-browser regression: this container initially had no Chrome/Edge binary. A temporary Chromium 153 executable outside the repository was attempted; the supplied fixture could not complete in this restricted runtime (font/renderer failure and a bounded timeout). No application code or permanent test was changed to bypass this result. The three pure selector, route-contract and production-reconciliation assertions passed. The browser regression remains enabled in the existing GitHub CI, where a standard Chrome installation is available. Local non-browser regression scripts are executed separately and their scope is recorded distinctly from the blocked complete gates. PostgreSQL and private R2 remain NOT TESTED locally.

## Remaining local execution

The main non-browser test script passed 691 assertions, with 3 database-dependent skips and no failure/cancellation. The non-browser production-lock script passed 360 assertions with no failures. Both ran under Node 22.22.0 with npm lifecycle pretests disabled only for these separately classified non-browser executions; the mandatory browser regression remains unmodified and enabled in CI. The full local gate result remains recorded as blocked/failed, not converted to PASS. All 9 changed/new JavaScript files passed syntax checks; 29 active output artifacts passed the local runtime matrix.
