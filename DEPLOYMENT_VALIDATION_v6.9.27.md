# Cloud Inventory ROI v6.9.27 — Deployment Validation

## Required before production approval

1. Deploy the Git-generated v6.9.27 archive to a non-production or controlled Render environment.
2. Confirm `/health` and the login page report `6.9.27`.
3. Confirm migration `040_jpp_scenario_integrity.sql` completes against PostgreSQL.
4. Run the registered PostgreSQL suites against a clean non-production database with zero failures, skips, or NOT TESTED results.
5. Sign in as Rep, SE, Sales Manager, multi-role user, and Admin; confirm their existing permissions remain unchanged.
6. Save and reload representative CIP and MEP calculator scenarios, with Field Inventory both off and on.
7. Submit a Prospect Link, review immutable evidence, apply one eligible value, save a new scenario version, and verify the value and provenance after reload.
8. Verify Solution Fit, Joint Project Plan, Driver Resonance, Christie context, Competitive Intelligence product reuse, and audit purge confirmation.
9. Download representative PDF, DOCX, and PPTX outputs and verify file contents, audience, currency, and classification.

## Fail-closed checks

- Missing/weak production `JWT_SECRET` must prevent application startup.
- A client-supplied ROI total must never be stored as authoritative.
- A JPP cannot attach to an unauthorized scenario or save a blank milestone.
- Audit purge GET must only display confirmation; deletion occurs only after the POST confirmation.

This document is a deployment checklist, not evidence that live Render validation has already occurred.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
