# v6.8.3 Production Customer & Executive Export Recovery

Release date: 2026-09-01
Application: 6.8.3
ROI Model: v2.8 / modelVersion 28
Brand System: 1.0
Application Knowledge: 1.0
Christie Persona: 1.0

## Customer loading

Root cause: the initial customer gate used the enriched `/api/customer-switcher` portfolio service. That service calculates information needed by the full switcher—including readiness, evidence, Solution Fit, opportunity and filter metadata—before showing customer identity.

The sign-in picker now calls the lightweight, authorized `GET /api/customers` endpoint. It returns only customer identity, owner and scenario count. Search filters that loaded list locally. Selecting a customer then retrieves the enriched `/api/customer-switcher?customerId=...` record for that one customer.

The landing panel now has explicit loading, available, empty, timeout/error and Retry states. The request aborts after eight seconds. Browser and server diagnostics record start, completion/status, elapsed time and count without logging customer record bodies. Existing centralized ownership, sharing, team and Admin scope remains in force.

## Executive View

The v6.8.2 renderer omitted the `.e-body` container expected by the presentation CSS, putting sections against the document edge and reducing the financial story to minimally formatted content.

The presentation now renders the authoritative Executive Value Story as a branded cover followed by a padded body. It includes three distinct Why cards, an eight-metric financial KPI grid, up to five active-driver bars, solution alignment, implementation context, approved customer proof when present, joint next steps and a customer confidentiality footer. The readable document width is capped at 960px and adapts through tablet and 390px layouts.

The Value Breakdown sidebar is populated directly from `story.economics.activeDrivers` and `annualBenefit`. Its true empty state is `No modeled value drivers yet.` No generic cost-of-delay calculation was restored.

## PDF

The prior click handler awaited readiness and story loading before opening a browser window. Hosted browsers can treat that later `window.open()` as no longer user initiated and block it.

The handler now opens a blank window synchronously as its first action, then evaluates readiness and loads the authoritative story. Cancellation closes the unused window; success navigates it to `/print.html?autoprint=1#data=...`. If the initial popup is blocked, a persistent `Open PDF` button lets the user retry directly. The print renderer uses the same presentation semantics: cover, Why cards, KPI cards, driver bars, solution context, approved proof and next steps.

## PowerPoint

The old primary export depended on browser-side JSZip and PptxGenJS execution. The primary path is now the authenticated and scenario-authorized `GET /api/scenarios/:id/export-pptx` route. The server builds the authoritative Executive Value Story, reevaluates output readiness, enforces Review acknowledgement and Draft Only rules, and generates the branded deck with the server Office theme. Draft output is visibly marked by the server.

The client receives a valid PowerPoint Blob and downloads `Business-Case-{customer}-{date}.pptx`. The legacy browser exporter remains only for an unsaved internal draft. Export failures show a persistent Retry control and safe server error identifier. Automated validation opens the result as OOXML, verifies the ZIP signature, slide count, customer/story facts and draft marking.

## Automated tests

- Passed: 399
- Failed: 0
- Skipped/environment-blocked: 3
- Environment limitation: `DATABASE_URL` was unavailable, so the real PostgreSQL authorization/product-identity integration checks did not run.
- Manual Render smoke test: pending deployment.

## Required Render smoke test

1. Deploy the v6.8.3 zip with the existing Render environment variables and database.
2. Sign in as a Rep who has at least five authorized customers.
3. Confirm customer names appear promptly and the browser Network panel shows the initial request to `/api/customers`, not a full portfolio request.
4. Search the locally loaded list, select a customer and confirm the current saved scenario loads.
5. Open Executive View and confirm internal margins, Three Whys cards, all KPI cards, active-driver bars, the populated Value Breakdown total and approved proof when selected.
6. At desktop and mobile widths, confirm the document does not clip or overflow.
7. Select Download PDF. Confirm readiness is enforced, the print window opens, formatting matches Executive View and Save as PDF works.
8. Temporarily block popups and confirm the persistent `Open PDF` recovery button appears.
9. Select Export to PowerPoint. Confirm readiness is enforced and a non-zero `.pptx` downloads.
10. Open the deck and confirm customer, Three Whys, annual benefit, investment, ROI, active drivers, currency, approved proof and draft status exactly match Executive View.
11. Test an account with no authorized customers and confirm the intentional empty message.
12. Simulate/observe a failed customer request and confirm `Customers could not be loaded` plus Retry replaces Loading.

Do not certify v6.8.3 until steps 1–12 pass on Render.
