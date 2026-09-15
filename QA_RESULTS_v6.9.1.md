# QA results — v6.9.1
Date: 2026-09-04. Tests use synthetic customers, not production data.

## Local gates
- Clean npm ci --omit=dev --no-audit --no-fund: completed; 148 packages. Node 22.22.0, npm bundled with that runtime. Workspace-local npm cache.
- npm test: 403 node:test cases; 400 passed, 0 failed, 3 skipped. Main batch 377/380 passed; v690 + release-integrity batch 23/23 passed. Additionally the standalone engine gate reports 34 passed, 0 failed. Do not add nested script assertions to the node:test total.
- npm run test:production-locks: 44 passed, 0 failed, 0 skipped, plus prohibited-pattern, brand-generation and knowledge-generation checks.
- npm run test:routes: command exits 0 but the HTTP API integration suite is SKIPPED because DATABASE_URL is absent. Zero route tests executed; not a live HTTP pass.
- JavaScript syntax validation: 169 .js/.cjs source files checked, zero failures (dependencies excluded).
- Generated brand / knowledge check: passed.
- Permanent auth lock: prohibited legacy alias absent; one canonical early requireAuth import; existing role/capability implementation unchanged.
- Source output audit: passed. No public recalculation/raw scenario join, retired print hash or Executive scenario selector.
- Publication unit tests: scenario denial, customer denial, draft block, review acknowledgement, frozen native-currency version, internal-field exclusion and successful browser-script rendering.
- Registry checks: owners exist, server generators load, key routes/controls exist, customer readiness/classification agree, Champion inactive.
- JPP regression: ungrouped milestones included and negative logo/dark footer used.
- Browser: actual Business Case HTML/JS loaded in Codex browser against a loopback fixture server. Verified GBP values, rounded ROI/payback, exact version, Three Whys, driver assumptions, next steps and copyright. This is not a PostgreSQL/authentication test.

## Evidence locations
Local workspace outputs: v691-full-tests.log, v691-locks.log, v691-routes.log and v691-qa/ artifacts. These are kept outside the application ZIP.
See OUTPUT_CERTIFICATION_V6.9.1.md for visual coverage and limits.

## Not tested
Real PostgreSQL migration/trigger execution, persisted immutable-link behavior, live authentication/customer denial, full role matrix, concurrent publication, Render, SendGrid and all authenticated export click-throughs.
The three skipped cases are database-dependent; the HTTP integration suite is also skipped. No skip was removed or converted into a pass.
