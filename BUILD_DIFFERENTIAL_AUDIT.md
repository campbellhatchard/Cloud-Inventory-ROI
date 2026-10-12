# v6.9.37 Differential Audit

v6.9.37 is a focused Customer-Facing ROI Assumptions & Results Summary build from `cloud-inventory-roi-v6.9.36-render-ready.zip`, SHA-256 `17edbfff2bcd94e0a165a4e9771a940e96447846761fdf2e3036b39d2bc09128`.

## Added

- One server-authoritative ROI Assumptions report model built from the saved scenario, governed provenance, Executive Value Story, ROI Model v2.8 active-driver results, and approved customer-safe methodology metadata.
- Authenticated Web preview and branded PDF routes using the existing scenario authorization and Executive Output Readiness authority.
- Exact summary economics, relevant inputs, evidence/source classification, multi-input driver groupings, authoritative driver results, overlap notes, and methodology notes.
- Customer/internal Draft/Review classification, fail-closed unsaved-state handling, customer-safe deterministic filenames, retry-safe PDF failure handling, and responsive presentation.
- Two real Output Registry entries and executable runtime smokes using the production Web renderer and production PDF builder.
- Permanent unit, runtime, route/source, long-content, null/zero, currency, provenance, reconciliation, Build 1, Build 2, and disposable-PostgreSQL integration tests.

## Presentation-only shared PDF change

The existing dependency-free text PDF writer gained structured blocks, keep-together spacing, and repeated continuation headings. These additions are presentation primitives only; no existing economics or output authority changed.

## Preserved

ROI Model v2.8 remains the sole economic engine. v6.9.35 ownership transfer and v6.9.36 cleanup/recovery remain intact. No schema or migration is added. Existing customer/prospect evidence, Rep Confirmed, Buyer Evidence, customer identity, authorization, and output governance remain unchanged.

## Deliberately not changed

No Word, PowerPoint, public share, new ROI formula, new confidence score, new readiness model, new business-data revision system, or standalone CIP Solution Fit integration was introduced.

## SE Solution Fit Scope

Sales Engineers have cross-account access to all active customers for
Solution Fit discovery/create/view/edit only. This does not confer general
cross-account customer, scenario or opportunity access.
