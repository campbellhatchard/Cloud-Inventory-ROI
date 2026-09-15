# Deployment validation — v6.9.3

Deploy the Git-produced archive with Node 22.x and the existing production environment variables. No database migration is introduced.

After deployment, authenticate as each governed role and confirm: an SE can find an unrelated active customer and create/open its Solution Fit; that SE cannot open the same customer's general scenario; a Rep can open an owned Solution Fit read-only but cannot open unrelated data; a manager can access team-scoped data only; Admin retains existing access. Confirm inactive/deleted customers are absent.

Exercise picker loading, search results, search-empty, system-empty, simulated request failure, Retry, successful recovery, and Load more. Confirm all calls use `/api/solution-fit/customers` and no legacy `/api/customers` fallback occurs.

Database-backed route validation remains required in the deployment environment because local `DATABASE_URL` was unavailable.

SE Solution Fit Scope:
Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
