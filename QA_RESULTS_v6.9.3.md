# QA results — v6.9.3

Validated on Node 22.22.0 on 2026-09-04.

- `npm ci --omit=dev --no-audit --no-fund`: passed (148 packages).
- `npm test`: passed; ROI engine 34/34, main Node suite 377 passed / 3 skipped, permanent release suite 42/42.
- `npm run test:production-locks`: passed 63/63.
- `npm run test:routes`: suite skipped because `DATABASE_URL` was not set.
- `npm run test:brand`: passed 19/19.
- Application knowledge check, brand asset check, active-output audit, and JavaScript syntax validation: passed.
- Authorization behavior verified for SE unrelated active, Rep owned/unrelated, manager team/unrelated, Admin, Rep+SE, inactive, and deleted customers.
- Picker behavior verified for success, zero-scenario customer, cross-team customer, both empty states, failure, retry/new request, successful recovery, and pagination.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
