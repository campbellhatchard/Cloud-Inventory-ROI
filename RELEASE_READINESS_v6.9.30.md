# v6.9.30 Release Readiness

Release readiness is not self-assigned. Local machine evidence must show zero executed-test failures, the package must match the validated Git commit, PostgreSQL integration must complete against a disposable database with zero failures/skips, and live Render validation must confirm the durable apply/reload workflow.

Known local certification limitation: when no safe disposable PostgreSQL database is available, the five database suites are explicitly `NOT TESTED`, never counted as passed. The Product Owner assigns the final release classification after CI and Render verification.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
