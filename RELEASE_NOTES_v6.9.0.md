# Cloud Inventory ROI v6.9.0

## Solution Fit creation and recovery

- Solution Fit now distinguishes loading, not created, ready, permission denied, removed, and recoverable error states.
- Authorized users explicitly create a Solution Fit; opening the screen no longer creates one as a side effect.
- Missing or failed records offer clear Retry, Switch Customer, and Return to ROI Calculator actions.
- Soft-deleted Solution Fits are excluded from active workspaces, manager views, stage readiness, Christie context, scenarios, and close snapshots. Admin recovery remains available.
- The customer switcher shows Create Solution Fit, Open Solution Fit, or Not started according to the server-authoritative state and the user's permissions.

## MEP product, ERP, and application setup

- Current products are Mobile Enterprise Platform (MEP), Cloud Inventory Platform, and Enterprise Printing Platform (EPP). Retired CPP and generic Platform choices are not offered for new work.
- MEP setup follows Product → ERP → Applications.
- The governed 2026-08 catalog includes JDE, EBS, Oracle Fusion, SAP ECC6, and SAP Hana with exact ordered application names and locked counts.
- Users can search, select all, clear all, add customer-specific non-standard applications, record an optional ERP version, and include optional additional Cloud Inventory products.
- Changing ERP requires confirmation. Matching application assessments carry forward; prior scope remains in change history.

## Assessment and outputs

- Standard applications start as Not reviewed and require explicit Demo, Fit, and Customer Validation results.
- Partial Fit or Gap results can create a linked gap immediately.
- Readiness cannot reach 100% merely because an application appears in the standard catalog.
- Solution Fit outputs and Christie context now include governed primary product, ERP, version, catalog, standard/non-standard application, demo, fit, validation, and critical-unvalidated summaries.

## Navigation and onboarding

- First-use onboarding waits until the saved scenario has definitively loaded, appears only on the Calculator, and remembers dismissal per authenticated user.
- Solution Fit and customer-switcher dialogs support backdrop close, Escape, focus recovery, and responsive mobile layouts.

## Version authorities

- Application: 6.9.0
- ROI Model: 2.8 (`modelVersion: 28`) — unchanged
- Brand System: 1.0 — unchanged
- Application Knowledge: 1.0 — unchanged
- Christie persona: 1.0 — unchanged
