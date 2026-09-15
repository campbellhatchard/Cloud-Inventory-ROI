# Release manifest — v6.9.2

Date: 2026-09-04. This is a release candidate, not a deployment approval.

## Provenance

Exact source: `cloud-inventory-roi-v6.9.1-render-ready.zip`.
SHA-256: `69A2D94C131036EECC8466F97E09B1C92DB9A86E7C2DD15A210CE6C60DFA2F6D`.
Baseline Git commit: `5f975dd`. Fresh extraction; no source overlay. Branch: `codex/v6.9.2`.

## Locked authorities

Application: 6.9.2. ROI Model: 2.8 / 28. Brand: 1.0. Application Knowledge: 1.0. Christie Persona: 1.0. Node: 22.x; Render pin remains 22.22.0. Dependency versions are unchanged. Migration ceiling: `036_solution_fit_cross_account.sql`.

## Included correction

Dedicated cross-account Solution Fit customer discovery and create/view/edit capability for active SE/Admin roles; active-customer lifecycle; server pagination/search; explicit create/open UI; POST-only creation; creating-SE attribution; preserved customer ownership; cross-customer context isolation; authoritative Help and permanent governance/test locks.

## Scope boundary

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

## Packaging rules

Expected archive: `cloud-inventory-roi-v6.9.2-render-ready.zip`, produced from validated Git state with `git archive`. Exclude `.git`, `node_modules`, `.env`, `.env.local`, `__MACOSX`, `.DS_Store`, and `cloud-inventory-roi-v4_0_0`. Filename and passing local tests do not constitute Product Owner approval.
