# v6.9.35 Differential Audit

v6.9.35 is a focused Admin customer-ownership reassignment build from `cloud-inventory-roi-v6.9.34-render-ready.zip`, SHA-256 `6c0458c45541fb0cf955bb0d6c460c9bcd65acede98ceade148e33a914acdb08`.

The deployed production parent is Git commit `9fcbce9a527d2565f95f6c70e6cefe9581a9e50d`; the developer source snapshot is `9cf1e0c12e8ecf64f687db2772fcd8bdf08cba18`.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.

## Added

- Admin-only eligible Sales Rep, transfer-preview, and transfer endpoints.
- A dedicated Admin Customers transfer dialog with required reason, impact preview, explicit confirmation, accessible keyboard containment, retained failure state, and success audit reference.
- A transactional ownership service with customer-row locking, expected-owner concurrency protection, target eligibility and duplicate-customer checks, and rollback guarantees.
- Immutable `customer_ownership_transfers` history with old/new owner, Admin actor, reason, timestamp, counts, and IP address.
- Owner-only timestamp trigger behavior so an administrative ownership move does not masquerade as a historical business-content edit.
- Focused executable and disposable-PostgreSQL certification suites.

## Operational ownership updated

The transaction updates the current Customer owner and the operational owner scope used by current access and future owner-routed notifications: scenarios, Prospect Link sessions, scenario-linked/legacy JPPs and Stakeholders, Solution Fits, and Driver Resonance.

## Deliberately not updated

Immutable submissions and answers, ROI Value History and application actors, Rep Confirmed actors, Buyer Evidence history, scenario/customer/base IDs, scenario version numbers, ROI data, shared-access grants, Solution Engineer assignment and Solution Fit creator/editor history, prior notification records, audit history, and frozen publication rows remain unchanged.

## Unrelated behavior

No feature, ROI calculation, evidence methodology, output generator, public/prospect endpoint, or non-Admin role capability was added or altered.
