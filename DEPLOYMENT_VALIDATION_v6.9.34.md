# v6.9.34 Deployment Validation

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

## Before deployment

- Deploy only `cloud-inventory-roi-v6.9.34-render-ready.zip` or its validated Git commit.
- Preserve the existing Render environment variables and PostgreSQL database.
- Do not run automated tests against the production database.
- Confirm Render installs production dependencies and applies existing migrations normally. v6.9.34 adds no migration.

## Health and identity

1. Confirm `/health` and the login screen report `6.9.34`.
2. Sign in as a Rep/Admin-capable test user and confirm My Profile shows the Audio alerts preference.
3. Confirm an SE-only user can continue cross-account Solution Fit but cannot create an ROI customer.

## Customer Setup

1. From the Calculator landing screen choose **Start Customer Setup**.
2. Submit blank. Confirm the dialog remains open, Company Name is listed/highlighted, focus moves to it, and no network create request succeeds.
3. Enter a unique customer name and optionally Field Inventory; select **Save & Continue**.
4. Confirm `POST /api/customers` returns 201 with a customer ID before the dialog closes.
5. Confirm Calculator opens for that exact customer and contains no prior-customer data.
6. Refresh, sign out/in, find the customer, and reopen it to prove PostgreSQL persistence.
7. Try the same name again under the same owner. Confirm the duplicate message and **Open Existing Customer** path, with no duplicate row.
8. Safely exercise a rejected request or temporary connection failure. Confirm values remain, the dialog stays open, and Retry is available.

## Second customer and unsaved protection

1. Save a real scenario for Customer A.
2. Open Customer Workspace and confirm **Create New Customer** is persistent and requires no logout.
3. Create Customer B and confirm A's Calculator, KPIs, Three Whys, evidence, AI, Stakeholders, Solution Fit, JPP, and Proposal content do not remain active.
4. Switch A → B → A and confirm each customer's newest saved state is restored.
5. With unsaved changes on A, test **Save & Continue**, **Discard & Continue**, and **Cancel** separately.
6. Cause a save failure and confirm the app remains on A with edits intact.

## No-context and alerts

1. Use the no-customer Calculator exploration state.
2. Confirm Save is disabled; Executive, Share, and Email are hidden/unavailable; KPIs show no business case / dashes rather than `$0` or `0%`.
3. Trigger representative success, warning, and error messages. Confirm consistent styling, dismissal/persistence, and ARIA behavior.
4. With Audio alerts off, confirm every workflow remains understandable and operable.
5. Enable Audio alerts after user interaction. Confirm one subtle cue per eligible event, no info/navigation sounds, no overlapping sound storm, and visible text remains present.

## Regression smoke

Verify scenario save/version, Prospect Link and Evidence review/application, Rep Confirmed, Three Whys, Sales Manager, Competitive Product Search, Proposal PDF/Word, Executive PDF/Word/PowerPoint, Solution Fit, JPP, customer switching, AI/Christie, and customer-facing output files.

Record browser network/console evidence. The Product Owner assigns the final production classification.
