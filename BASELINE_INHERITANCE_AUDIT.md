# v6.9.40 Pre-build Baseline Inheritance Audit

## Authoritative parent

- Archive: `cloud-inventory-roi-v6.9.39-render-ready.zip`
- SHA-256: `071a32de3aa3b56f75fb13aa66d499d5ec40faba6abb79985bda711f5f2f287d`
- Deployed parent commit: `3ad081be117574568d7608bdf952d1ef034924ca`
- Developer source snapshot: `069f02b8ed42d78e21dd0b583acdb2a3c9274674`
- Parent application version: `6.9.39`
- Target application version: `6.9.40`

The parent archive hash was verified before production source changed. The supplied developer snapshot was applied forward onto the exact deployed v6.9.39 commit so production-only release corrections and evidence remain intact.

## Protected inheritance

- ROI Model v2.8 / `modelVersion` 28 is unchanged.
- Brand System, Application Knowledge, and Christie Persona remain v1.0.
- The v6.9.39 guided Solution Fit, saved JSONB authority, MEP package behavior, application assessments, gaps, integrations, readiness, and Professional Services turnover DOCX remain intact.
- All Executive, Proposal, JPP, Stakeholder, Competitive, Prospect, Value History, Rep Confirmed, BuyCycle, Customer Email, Admin, Sales Manager, and authorization protections remain inherited.
- The dedicated `solution_fit_cross_account` discovery permission remains separate from general ROI/customer authority.
- Customers without ROI scenarios remain eligible for Solution Fit.
- No browser local or session storage is introduced.

## Verified starting architecture

- Setup modal and main-workflow owner: `public/solution-fit.js`.
- Saved state model: `public/solution-fit-state.js` over the authenticated `handoffs.data` JSONB record.
- Create authority: `POST /api/handoffs/:customerId`.
- Update authority: `PUT /api/handoffs/:customerId`.
- Dedicated customer discovery: `GET /api/solution-fit/customers`.
- Authorization owners: `src/authorization.js`, `src/routes/handoffs.js`, and `src/routes/solution-fit-customers.js`.

## Authorized scope

Correct the Solution Fit setup modal so it owns product scope only, and provide an explicit in-workspace Solution Fit customer switch with dirty-state protection, URL-backed identity, and cross-customer isolation. No other application function is authorized to change.
