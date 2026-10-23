# Deployment Validation — v6.9.42

## Before deployment

1. Verify the delivered ZIP SHA-256 from the build handoff.
2. Require CI to run against a clean disposable PostgreSQL database; never use production customer data.
3. Review `POSTGRES_INTEGRATION_RESULTS_v6.9.42.json`, `RELEASE_GATE_RESULTS_v6.9.42.json`, and `OUTPUT_RUNTIME_RESULTS_v6.9.42.json`.
4. Deploy the committed archive and confirm `/health`, Version History, and served assets identify `6.9.42`.

## Authenticated desktop validation

1. Sign in as a Solution Engineer and open a saved CIP or MEP Solution Fit.
2. Open General Inventory Configuration and verify ten spacious cards in two columns.
3. Verify every select offers exactly: Not answered, Yes, No, Unknown / To confirm, Not applicable.
4. Enter the deterministic values in `SOLUTION_FIT_INVENTORY_UI_REPORT_v6.9.42.md`; verify `9 of 10 answered`.
5. Open Add note for Lot Numbers, enter `Customer tracks lot-controlled inventory.`, add a second note, and verify the actions change to Edit note.
6. Set LPNs / Handling Units / Packing Units to Yes; verify the connected Inbound/Internal/Outbound/Nested subsection appears. Change it away from Yes and verify only that subsection closes.
7. Use keyboard Tab/Shift+Tab and select controls; verify visible focus, logical order, and no focus/scroll jumps.

## Persistence and customer isolation

1. Wait for the saved-state confirmation, navigate to another Solution Fit step, and return.
2. Refresh, switch customer, return to the original customer, sign out/in, and reopen.
3. Verify every answer, note, LPN value, and the 9/10 count remains exact.
4. Confirm the other customer did not inherit any values.

## Mobile/responsive validation

1. Repeat the inventory flow at a narrow phone viewport.
2. Verify one card column, full-width selects, 44px controls/note actions, readable expanded notes, no clipping, and no horizontal scrolling.

## Regression and monitoring

Verify product-only Create/Edit Scope, Switch Customer, MEP/CIP/EPP and mixed scope, stable process/gap IDs, Primary SE, MEP ERP/version and ERP-change history, Demo & Fit, Gaps, Integrations, Readiness, outputs, and PS turnover. Monitor browser console and network; record any unexplained error.

## Status

PENDING deployment execution. Do not infer browser, database, refresh, logout/login, or customer-switch persistence success from local unit tests.
