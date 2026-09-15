# Deployment Validation — v6.9.14

Production deployment validation is pending. Merge only after the GitHub PostgreSQL 16 integration and full release-certification jobs pass. Never run automated tests against production customer data.

After Render deploys the exact merged commit, verify startup, database connectivity, migration state, `/health`, the reported application version, and absence of deployment errors. Confirm that the staging service and database remain unchanged.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
