# Final Customer and Alert Workflow Report — v6.9.34

## 1. Executive Summary

v6.9.34 replaces transient browser-only customer creation with one validated server transaction and makes customer/scenario context the authority for Save, Executive, Share, Email, and KPI presentation. It also adds a shared, accessible alert service with optional local audio. The change is intentionally isolated from ROI, evidence, outputs, and unrelated product behavior.

## 2. Baseline

The build started only from `cloud-inventory-roi-v6.9.33-render-ready.zip`, SHA-256 `181197394a3af5898edf0194da2b5188b93b681dd07ae54bc8c14d273b6a6f88`. The deployed GitHub parent is `e580a8f5696e705855805883529241e25144acc8`; the developer source snapshot is retained separately as `e26c0da511ac3339c65849cd1bee158c4ad8c237`.

## 3. Existing Customer Creation Architecture

The former Calculator landing action called `cgCreateNew()`, cleared the form, and pushed a customer-like item into browser state. PostgreSQL did not receive a customer row until a later scenario save called the server's `ensureCustomer` logic. Consequently, a customer could appear created and then disappear after refresh. The switcher also lacked a persistent Create New Customer action.

## 4. Required Field Authority

The database requires customer name and owner. The owner is derived from the authenticated user and is not accepted from the browser. The shared v1 Customer Setup contract therefore defines:

- Company Name — required, normalized, maximum 255 characters.
- Field Inventory — optional existing customer property.
- Account Owner — server-derived, displayed read-only.

Both the setup-schema endpoint and server write validation use this contract, preventing a second browser-only definition.

## 5. Customer Setup UX

New Customer opens an accessible desktop dialog that becomes a full-screen mobile sheet. It explains the transaction, marks Required/Optional fields, validates before POST, lists missing fields, associates field errors, focuses the first invalid field, traps keyboard focus, supports Escape/Cancel, and uses **Save & Continue**. The dialog remains open and preserves values on validation, duplicate, network, or server failure.

## 6. Server Persistence

`POST /api/customers` requires authentication and Rep/Admin role capability. It normalizes and validates input, inserts the customer, applies the existing owner + case-insensitive-name identity rule, writes the existing audit action, and returns the saved customer including its authoritative ID. Calculator navigation occurs only after that ID is successfully selected as active context.

The pure service behavior is locally tested. A real HTTP/PostgreSQL suite was added to `test:postgres`; it could not execute locally because no safe database URL was present.

## 7. Duplicate Handling

The implementation uses the existing unique identity of `(owner_id, lower(name))`; it does not invent a global display-name match. A conflict returns a generic duplicate message. An existing record is returned for **Open Existing Customer** only when it belongs to the same authenticated owner and is active/not removed. Unauthorized records are not disclosed.

## 8. Create Another Customer Workflow

Rep/Admin users now see **Create New Customer** in the existing Customer Workspace switcher. The path reuses current authorized-customer loading, recent/team filters, context selection, and permission behavior. No logout, login, URL change, or second navigation system is required.

## 9. Unsaved Change Protection

Creating or switching customers with dirty governed work presents **Save & Continue**, **Discard & Continue**, and **Cancel**. Save & Continue awaits the actual server save promise rather than polling a browser dirty flag. If save fails, context does not change and the edits remain. Discard is explicit. Cancel closes the guard without clearing work.

## 10. No-Context UI State

One context authority distinguishes:

1. No customer.
2. Customer selected, no scenario.
3. Valid working unsaved scenario.
4. Saved clean scenario.
5. Dirty saved scenario.

No-customer state disables Save, hides Executive/Share/Email actions, blocks direct Executive navigation, and renders **No business case** / dashes. A selected customer without modeled inputs also shows unavailable economics instead of false zeroes. Saved clean state restores governed output actions; dirty state requires a save before those actions.

## 11. Alert Architecture

`AppAlerts` provides `info`, `success`, `warning`, and `error` entry points with shared visuals, severity, persistence, dismissal, and duplicate suppression. Existing material `showToast` callers enter this authority without changing their business operations. Warnings/errors default to persistent; routine info/success may auto-dismiss. The detailed inventory is in `ALERT_WORKFLOW_AUDIT.md`.

## 12. Audio Alert Architecture

Short Web Audio cues are available for success, warning, and error only. Info and normal navigation are silent. Audio is disabled by default, throttled to prevent overlap, and failures are ignored so sound can never interrupt an operation. The My Profile preference is stored only in `localStorage['ci_audio_alerts']`; no governed data is stored there.

## 13. Accessibility

Info/success alerts use `role=status` and polite announcements. Warning/error alerts use `role=alert` and assertive announcements. Customer validation uses visible text, `aria-invalid`, associated descriptions, a linked summary, focus movement, keyboard-contained dialogs, and a visible dismiss path. Audio is always supplemental.

## 14. Browser Tests

The v6.9.33 deployed browser was used before code changes to reproduce browser-only customer creation, absent persistent creation access, active no-context actions, and false zero KPIs. The corrected package is not yet deployed, so post-change live browser tests are not represented as passed. The required deployment sequence is recorded in `DEPLOYMENT_VALIDATION_v6.9.34.md`.

## 15. Server Persistence Tests

Local pure-service tests verify validation-before-query, normalized insertion, returned ID, duplicate behavior, safe failure, and audit call. `test/v6934-postgres-customer-creation.test.js` exercises the real Express route, migrations, PostgreSQL row, owner spoof protection, fresh customer list, and duplicate row count when `DATABASE_URL` is supplied. It is wired into `test:postgres` and truthfully recorded NOT TESTED locally.

## 16. Regression Results

- Focused customer/context/alert + switcher/UI/ROI: 71 passed, 0 failed, 0 skipped.
- Full inherited application suite: 645 passed, 0 failed, 2 database-only skips.
- Production locks: 262 passed, 0 failed, 0 skipped.
- Output runtime: 26 passed; all 25 active output IDs executed.
- Brand: 19 passed, 0 failed.
- PostgreSQL certification: 6 registered suites NOT TESTED locally; the focused v6.9.34 suite emitted one explicit skip.

## 17. Files Changed

Production changes are confined to:

- Customer Setup contract, service, route, browser dialog, and styles.
- Existing customer authorization projections and switcher metadata.
- Customer gate, customer switcher, save return semantics, context action guard, and no-context KPI rendering.
- Shared alert service, Prospect failure alert, team-help alert, and My Profile audio preference.
- Version/lineage/governance/release records and focused regression tests.

No migration or ROI engine file changed.

## 18. Known Limitations

- A disposable PostgreSQL environment was unavailable, so real persistence and refresh/logout/login recovery require CI or deployed validation.
- The npm CLI was unavailable; the fresh `npm ci` gate is NOT TESTED. Executable tests used the bundled Node runtime and installed production dependencies.
- Existing native confirmations remain for destructive or governed acknowledgement decisions by design; they are documented in the alert audit.
- Live audio behavior depends on browser user-interaction policies and must be checked after deployment.

## 19. Release Recommendation

The source is suitable as a corrective deployment candidate because all executable non-database gates passed and the change preserves ROI Model v2.8, authorization boundaries, and output behavior. Final production classification must wait for Product Owner live validation and disposable-PostgreSQL certification. This report does not self-assign GREEN, YELLOW, or RED.
