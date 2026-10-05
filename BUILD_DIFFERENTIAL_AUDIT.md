# v6.9.29 Differential Audit

v6.9.29 is a focused reliability build from the exact v6.9.28 corrective candidate. It changes no ROI formula, evidence boundary, role, route authorization, database schema, or output owner.

## Root-cause corrections

- **Prospect value application:** replaces a query against nonexistent `discovery_sessions.customer_id` with one immutable-evidence authority joining the value event, submission, and submitted answer by opportunity `base_id`, submission ID, canonical input, question, and value.
- **Field Help:** separates exact field semantics from formula context. Annual revenue, contribution margin, labor rates, inventory inputs, and Field Inventory inputs now retain distinct definitions and entry guidance.
- **Competitive Intelligence:** establishes scenario/product request generations, cancels stale requests, and scopes explicit product overrides to the active scenario.
- **Customer counts:** distinguishes opportunity count (`COUNT(DISTINCT base_id)`) from saved-version count (`COUNT(s.id)`) and labels both explicitly.
- **Admin Error Log:** returns rows, global total, filtered total, category totals, and page metadata from one query/snapshot.

## Explicitly unchanged

- ROI Model v2.8 / modelVersion 28, formulas, overlap rules, native currency, and Field Inventory methodology.
- Immutable Prospect submission boundary, deliberate per-value application, Value History, and Rep Confirmed provenance.
- BuyCycle, Solution Fit authorization, role/capability rules, output registry, and customer-facing document authorities.

## Test protection

`test/v6929-reliability-architecture.test.js` permanently covers the five corrected contracts and confirms ROI Model v2.8 remains unchanged.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
