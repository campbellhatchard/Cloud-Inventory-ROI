# QA results — v6.9.2

Date: 2026-09-04. Runtime: Node 22.22.0.

## Completed local gates

- `npm ci --omit=dev --no-audit --no-fund`: completed; 148 production packages installed.
- JavaScript syntax validation for changed server, route, authorization and browser files: passed.
- `npm test`: exit 0. ROI engine: 34 passed, 0 failed. Main Node phase: 377 passed, 0 failed, 3 database-dependent tests skipped; one nested suite. Permanent v6.9.0/v6.9.2/release phase: 32 passed, 0 failed. Active output audit and Brand generation check passed.
- `npm run test:production-locks`: 53 passed, 0 failed, 0 skipped; active output, Brand and Application Knowledge checks passed.
- `npm run test:routes`: database integration suite skipped because `DATABASE_URL` was not set; 0 test cases executed, 0 failed.
- `git diff --check`: re-run before commit/package; result recorded in readiness report.

## v6.9.2 coverage

Role matrix covers SE, Rep, Sales Manager, Admin and Rep+SE multi-role. Regression locks cover cross-account capability, general-access denial, active/deleted filtering, no-scenario customers, server pagination/search, minimal response contract, explicit creation, owner/Primary SE attribution, non-reassignment, selector actions, obsolete-text removal, Help content, and cross-customer context isolation.

## Not locally executed

Configured PostgreSQL API integration, concurrent creation against PostgreSQL, live Render deployment/migration, configured email, and production identity/session testing were not executed. These are not reported as passed.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
