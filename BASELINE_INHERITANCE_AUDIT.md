# v6.9.34 Pre-build Baseline Inheritance Audit

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

- Authoritative parent archive: `cloud-inventory-roi-v6.9.33-render-ready.zip`
- Parent archive SHA-256: `181197394a3af5898edf0194da2b5188b93b681dd07ae54bc8c14d273b6a6f88`
- Deployed GitHub parent commit: `e580a8f5696e705855805883529241e25144acc8`
- Developer source snapshot: `e26c0da511ac3339c65849cd1bee158c4ad8c237`
- Parent application/package version: `6.9.33`
- Target application version: `6.9.34`
- Latest inherited migration: `042_server_authoritative_value_application.sql` (unchanged)
- Active Output Registry entries: `25` (unchanged)
- ROI authority preserved: Model v2.8 / `modelVersion` 28
- Brand, Application Knowledge, and Christie authorities preserved at v1.0

The exact v6.9.33 Render-ready archive above is the sole source baseline. It was extracted without substituting an older branch or reconstructed source and committed before any corrective change.

## Pre-change behavior reproduced

1. **Customer creation was browser-only.** `cgCreateNew()` wrote the typed name into the calculator and a local list. No customer POST occurred, no `customer_id` was returned, and a refresh removed the apparent customer.
2. **A customer was first persisted only during scenario save.** The scenario transaction called `ensureCustomer()`, coupling customer identity to a later scenario transaction.
3. **No persistent create-another-customer command existed.** The customer switcher supported search and switching but did not expose Customer Setup.
4. **No-context actions were misleadingly available.** Save, Executive Output, Share, and Email were visible/enabled; headline KPIs rendered economic zeros rather than an unevaluated state.
5. **Alerts were fragmented.** The application used a transient toast, native `alert()`/`confirm()`, custom banners, modal errors, and screen-specific status messages with inconsistent persistence and accessibility.
6. **Current customer contract.** PostgreSQL requires customer name and owner; owner is derived from the authenticated user. `has_field_inventory` is an existing optional customer property. The authoritative uniqueness rule is owner plus case-insensitive customer name.

## Inheritance checklist

1. All v6.9.33 Proposal PDF timeout corrections remain present.
2. Server-authoritative Prospect value application, immutable evidence, notification outbox, and Value History semantics remain unchanged.
3. Sales Manager canonical opportunity identity and Competitive Intelligence governance remain unchanged.
4. Proposal Preview, Word, readiness, saved-state, canonical Executive Value Story, native currency, null semantics, and internal/customer classification remain authoritative.
5. All 25 Output Registry entries and their production-owner runtime smokes remain active.
6. No migration or ROI formula change is authorized or introduced by this correction.
