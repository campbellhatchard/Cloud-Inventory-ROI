# Deployment Validation — v6.9.28

## Current state

The corrective-candidate archive has been supplied and independently validated for controlled deployment. GitHub Actions PostgreSQL certification and deployed-browser validation remain pending. v6.9.28 has not yet been deployed.

## Required staging procedure

1. Provision a clean, disposable PostgreSQL 16 database. Never use the production customer database.
2. Set `DATABASE_URL` to the disposable database and `REQUIRE_DATABASE_INTEGRATION=1`.
3. Run `npm run release:gates`; require migrations and every PostgreSQL suite to report zero failed, zero skipped, and zero not tested.
4. Build from the exact validated Git state, deploy to Render staging, and confirm `/health` plus the login/version surfaces report 6.9.28.
5. Clear or version-bust static assets and verify the served JavaScript contains the v6.9.28 paths.
6. Execute the canonical QA role matrix without recreating or changing QA users.
7. Run the complete Prospect lifecycle, including deliberate value application, ROI recalculation, save, refresh, logout/login, and reload.
8. Exercise every registered output from its actual browser control and inspect the downloaded file.
9. Run manual and AI Competitive Intelligence flows through saved and approved states.
10. Monitor console and network for exceptions, rejected promises, failed assets, unexpected 4xx/5xx responses, timeouts, CORS failures, and request loops.

## Mandatory live checks

- Customer/scenario switching and cross-customer isolation
- Sales Rep, SE, Admin, Leader, and mixed-role ALLOW/DENY paths
- SE cross-account Solution Fit access without general customer access
- Sales Manager counts after migration 041
- Executive outputs saved/dirty parity across PDF, DOCX, and PPTX
- Stakeholder empty/saved precondition parity
- Internal Field Help focused/unfocused behavior
- Competitive readiness available/unavailable behavior
- Prospect modal contrast/focus while tours or Help overlays are active
- AI generation, explicit save/accept, persistence, provenance, and no cross-customer leakage

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Result

PENDING — require the isolated GitHub Actions PostgreSQL gate and post-deployment browser validation. No production database is used for pre-deployment certification.
