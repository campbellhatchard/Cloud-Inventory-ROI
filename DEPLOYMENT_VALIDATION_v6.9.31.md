# v6.9.31 Deployment Validation

## Pre-deployment evidence

- Package version, APP_VERSION, Version History, lineage, and application knowledge agree on 6.9.31.
- Local release gates, disposable PostgreSQL, interactive Chromium, and all active output runtime checks passed.
- Package must be created from the validated Git commit and rechecked after fresh extraction.

## Required Render validation

1. Confirm `/health` reports 6.9.31 and the expected database connection.
2. Sign in with the existing authorized Sales Manager/Sales Leader QA account; do not recreate canonical users.
3. Open Sales Manager and record canonical IDs for the previously repeated visible records.
4. Confirm one row per canonical `base_id`, correct count/value/stage/health totals, Team/Rep/Stage filters, Refresh, and navigation away/back.
5. If two same-label rows have different `base_id` values, do not merge them automatically; obtain Product Owner approval for an explicit data correction.
6. In the Product Owner's original credential-manager browser profile, open Competitive Product Search and confirm it remains empty, accepts type/paste/clear, returns results, and does not create governed data without an explicit action.
7. Verify browser console/network logs contain no unexplained errors and only GET product search requests carry the transient query.
8. Complete the normal authentication, ROI, Prospect, Value History, Solution Fit, JPP, Executive/Proposal, customer document, AI/Christie, and email smoke checklist.

The Product Owner assigns final release classification after this live validation.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
