# Cloud Inventory ROI v6.9.47 Differential Audit

## Baseline and method

The target was created only from `cloud-inventory-roi-v6.9.46-render-ready.zip` (SHA-256 `7C7E582588B8C01AF7B612C7DF4642D6089F4767541118A2B5422542BF06EE72`). The release lineage was recorded before production edits. The review compared v6.9.47 with that extracted baseline and rejected unrelated feature work.

## Production differential

| Boundary | Files | Approved change |
|---|---|---|
| Executive narrative persistence | `src/shared/executive-narrative.js`, `src/shared/executive-value-story.js`, `src/routes/scenarios.js`, `public/narrative.js`, `public/app.js` | Distinguish omitted, populated, and explicitly cleared fields; canonical `null` outranks legacy mirrors; adopt server-returned state before success; block Discovery fallback after a canonical clear. |
| Customer-specific application creation | `public/solution-fit.js` | Replace the native `prompt()` path with an accessible modal; validate/trim; single-flight submit; persist before closing; roll back the in-memory row after a failed save. |
| Primary SE presentation | `public/solution-fit-presentation.js`, `public/solution-fit.js`, `public/index.html` | Include a saved assignment in the control even when the viewer's assignable list excludes it, without granting edit authority. |

## Version, release, and evidence differential

- Version metadata changed from 6.9.46 to 6.9.47 in `package.json`, `package-lock.json`, `server.js`, `public/index.html`, `public/version-history.js`, and governed configuration.
- `.github/workflows/ci.yml`, `scripts/run-release-gates.js`, `config/permanent-release-tests.json`, and `config/output-runtime-tests.json` point to v6.9.47 evidence.
- Added permanent corrective, PostgreSQL, and browser fixtures under `test/`.
- Added v6.9.47 release evidence and documentation.
- `BUILD_GOVERNANCE_CONTRACT.md` adds explicit-clear, app-native custom-application, and Primary-SE display invariants.

## Explicit non-changes

- No migration was added; migration level remains 045.
- No ROI formula, overlap rule, model version, currency rule, NPV, payback, investment, or financial-provenance code changed.
- No questionnaire registry, evidence/R2, PS Turnover, Buyer Evidence, authorization, JPP, Proposal audience, or output-classification architecture changed.
- No browser local/session storage authority was introduced.

## Review conclusion

Every production change maps to one of the three approved corrective boundaries. Automated regression and production-lock suites show no unrelated functional drift. PostgreSQL, R2, supported Node 22, and deployed browser certification remain external gates.


## Deployment reconciliation against current main

This supplied-archive report describes the package build. Before deployment, archive SHA-256 `99815fc362b98fa30e781944251cd02fdbc66b06f2c67dae20f4e3d287e8d8e6` was reconciled with deployed Git parent `cc93e516474160782a92f30d3a474a858d0d18ee`. Existing deployed corrections and permanent tests missing from the archive were preserved. `DEPLOYMENT_DIFFERENTIAL_v6.9.47.md` records the actual deployment differential and verification boundaries.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
