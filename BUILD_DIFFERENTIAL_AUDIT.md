# v6.9.31 Differential Audit

v6.9.31 is a two-defect correction built from the exact v6.9.30 Render-ready archive. It does not change ROI Model v2.8, evidence methodology, authorization capabilities, scenario history, governed Competitive records, AI behavior, or customer-facing outputs.

## Production changes

- Added `public/sales-manager-opportunity-authority.js` as the single canonical opportunity projection consumed by both `src/shared/sales-manager-deals.js` and `public/sales-manager.js`.
- Canonical projection occurs before live readiness, filters, management priority, opportunity counts, and portfolio-value aggregation. It keys only on `base_id`/`baseId` (with scenario `id` as a legacy fallback), selects the latest deterministic current candidate, and preserves different canonical IDs even when labels match.
- Added browser-side defensive projection when the manager payload is received. Refresh replaces the model; it does not append.
- Corrected Rep and Buying Stage summaries to use the same filtered canonical set as KPI cards, Management Focus, and the inspection queue.
- Replaced the dynamically ambiguous Competitive Product Search control with static labeled search markup. The dynamic fallback applies the same type, name, autocomplete, keyboard, and accessibility semantics without changing or clearing its value.
- Product search remains a GET query. No Competitive write contract or persistence payload changed.

## Investigation result

The historical QA duplicate was created as two independent opportunity lineages after an earlier double Save activation. Current v6.9.30 already contains in-page save locking, a server advisory transaction lock, same-owner/name/company lineage reuse, migration 041 current-row uniqueness, and server canonical projection. v6.9.31 does not merge different `base_id` values because doing so from labels or amounts could destroy a legitimate opportunity.

## Tests and governance

- Added `test/v6931-final-two-defects.test.js` with behavioral coverage for child/version/authorization multiplicity, aggregates, same-label distinct identities, filtered team/rep/stage reconciliation, refresh replacement, semantic search markup, preserved typed text, transient GET behavior, and absence of input-clearing hacks.
- Registered the v6.9.31 test permanently and added canonical opportunity/search-transience governance invariants.
- No migration was added; the database uniqueness authority remains migration 041.

> SE Solution Fit Scope:
> Sales Engineers have cross-account access to all active customers for
> Solution Fit discovery/create/view/edit only. This does not confer general
> cross-account customer, scenario or opportunity access.
