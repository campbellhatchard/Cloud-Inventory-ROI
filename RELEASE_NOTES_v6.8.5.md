# Cloud Inventory ROI v6.8.5

## Fixed

- Preserved and regression-locked authenticated customer loading through the lightweight authorized-customer API, same-origin credentials, timeout, useful empty/error states, and retry recovery.
- Replaced the Executive PDF browser-print handoff with an authenticated, server-generated PDF download.
- Stabilized Executive PowerPoint and Word generation around the latest authorized saved scenario and canonical ROI engine.
- Centralized Executive PDF, PowerPoint, and Word data preparation so customer names and financial values cannot drift by format.
- Restored contract-value charts to Executive View and the three customer document formats.
- Corrected professional, customer-specific filenames and deterministic export failure/retry behavior.
- Prevented local export files, caches, logs, and temporary folders from contaminating a Git/Render deployment state.

## Improved

- Added an Executive business case Word export.
- Added editable native contract-value charting to PowerPoint and structured vector/table charting to PDF and Word.
- Improved Executive View card padding, chart spacing, responsive behavior, output logging, and no-store download headers.
- Added environment and Render deployment guidance plus release-specific regression locks.

## Preserved

- Canonical ROI Model v2.8 calculations and 12–60 month contract behavior.
- Opportunity stages, exit criteria, role and customer authorization, Solution Fit, Joint Project Plans, Action Plans, stakeholder maps, and Sales Manager dashboards.
- Brand System v1.0, Application Knowledge v1.0, and Christie Persona v1.0.

## Validation status

Automated and artifact-level results are recorded in `QA_RESULTS_v6.8.5.md`. Live Render authentication, PostgreSQL persistence, and real-role browser workflows remain post-deployment checks and are not represented as completed locally.
