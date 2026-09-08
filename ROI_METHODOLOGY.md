# ROI Methodology — Model v2.8

Cloud Inventory ROI v6.7.0 separates direct cost savings, recovered contribution margin, working-capital carrying benefit, and risk avoidance. Annual benefit is the sum of active, non-overlapping drivers. Contract benefit applies implementation timing and ramp; contract ROI and payback are shown only when an authoritative investment exists. This centralized brand-system release is presentation-only; ROI Model v2.8 formulas are unchanged and the economics are unchanged.

## Value provenance and cross-version lineage

- **Prospect Submitted** is an immutable financial value captured by an explicit Prospect Link submission.
- **Customer Provided** identifies sourced customer data; **Customer Revalidated** is a new evidence event requiring a mapped stakeholder, source, and evidence date. Revalidating the same number refreshes evidence without changing economics.
- **Rep Updated** is a seller working value that needs customer validation. A rep edit cannot retain Prospect Verified or Customer Revalidated status when it differs from its origin event.
- **Current**, **Aging**, and **Stale** use the governed 90-day customer-evidence window. Aging evidence remains customer-supported with a revalidation recommendation; stale evidence remains visible and usable mathematically but does not count as current customer-supported provenance for new ROI maturity lineage.
- A **scenario value snapshot** records the value, state, and origin event that a specific scenario version used. **Value History** is opportunity-wide by `base_id`, so later submissions and revalidations remain visible from earlier versions without recalculating them.

Revalidation changes evidence strength and freshness. It does not change any ROI formula, Opportunity Value, Customer Proof, overall value-case approval, or saved historical scenario.

Model v2.8 is used for new scenarios. Saved model v2.7 scenarios remain on v2.7 unless a user deliberately creates an upgraded scenario version. Inputs with prospect provenance are labelled prospect verified; derived rates remain assumptions.

Revenue is never treated as profit. Service revenue benefit requires a contribution margin and uses either direct annual lost sales or a modeled OTIF gap, never both. Inventory accuracy calibrates recovery but creates no dollars without a supported loss or inventory-cost base.

See `ROI_FORMULA_REFERENCE.md`, `ROI_ASSUMPTIONS_REGISTER.md`, and `ROI_OVERLAP_RULES.md`.
