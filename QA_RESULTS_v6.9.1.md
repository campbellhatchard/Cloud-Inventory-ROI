# QA results — v6.9.1

Date: 2026-09-04. Independent release-integration evidence against live v6.9.0 production baseline.

## Fresh dependency-independent gates

- JavaScript/Node syntax: 170 `.js`/`.cjs` source files checked, zero syntax failures.
- ROI engine: 37 passed, 0 failed.
- Version consistency: package, lock, runtime and newest history entry report 6.9.1; 161 version-history records are well formed.
- Migration compatibility: 72 foreign-key type checks across 35 migrations, 72 passed, 0 failed.
- Phase 1 regression: passed; embedded ROI checks 37/37.
- v6.9.0 Solution Fit preservation: 10 passed, 0 failed.
- Permanent production locks: 14 passed, 0 failed after replacing obsolete retired-print assertions with equivalent/stronger publication and active-path protections.
- Application Knowledge generated-artifact check: passed.
- Brand generated-artifact check: passed.
- Active output prohibited-pattern audit: passed.
- `git diff --check`: clean at the validated integration checkpoint.

## Release-integrity suite without installed dependencies

`node --test test/release-integrity.test.js` recognized 13 cases. Eleven executed assertions passed. Two cases could not load their required modules because this sandbox did not have the production dependencies installed (`jszip`; and `docx` through an output-registry generator load). No executed assertion failed.

The passing publication assertions cover authorization boundaries, Draft Only blocking, Review acknowledgement, exact version/native currency freezing, source mutation not changing the frozen payload, internal-field exclusion, frozen-row public loading without latest-scenario/raw-data joins, frozen-payload-only browser rendering, Champion inactivity, legacy print/scenario-share retirement and approved-current Battlecard revision requirements.

## Attempted cumulative suite

A fresh `npm ci --omit=dev --no-audit --no-fund --registry=https://registry.npmjs.org/` was attempted in this environment, but registry access timed out before usable modules were installed.

With dependencies unavailable, the cumulative `npm test` invocation recognized 354 cases in its main Node batch: 342 passed, 9 failed at module-loading time (`pg` or `jszip`), and 3 PostgreSQL-only cases were skipped. The release-integrity run above similarly had only missing-module failures. These results are **not** represented as a full-suite pass.

A successful clean `npm ci`, full `npm test`, `npm run test:production-locks` and `npm run test:routes` are mandatory pre-push gates in the deployment PowerShell script. GitHub CI also uses PostgreSQL and applies migrations before the full suite.

## Not independently exercised in this sandbox

- Real PostgreSQL execution of migration 035 and its immutability trigger.
- Live authenticated/customer authorization flows.
- Concurrent publication.
- Render v6.9.1 build/start/health.
- SendGrid.
- Full Office/Word visual rendering across all outputs.

These are not silently counted as passes.
