# Deployment Validation — v6.9.13

Production recovery revision deployed on 2026-09-29. The release identity was normalized back to v6.9.13 so the next developer iteration can remain v6.9.14. The recovery code is preserved; this is not a rollback to the earlier v6.9.13 archive.

Required production checks: `/health` returns HTTP 200 and reports v6.9.13; a public Prospect Link displays ROI progress; changing a material answer changes the modeled annual benefit; submitted answers refresh for the rep; unsaved ROI changes block Executive PDF; and a saved scenario version produces a PDF with current ROI values.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
