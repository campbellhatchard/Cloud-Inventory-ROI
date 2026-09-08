# ROI Assumptions Register — Model v2.8

Unless a cited approved source is attached in the application, defaults below are **Cloud Inventory model assumptions**, not industry benchmarks. Customer answers improve provenance of their inputs but do not convert a derived recovery into customer-provided data.

| Assumption | Default / variation | Override? | Type and source | Rationale / use | Provenance effect |
|---|---|---|---|---|---|
| mLabor | Industry configuration; blank uses configured value | Yes | CI model assumption | labor method realization | assumption until explicitly customer validated |
| mShrinkage | configured value or accuracy-derived recovery | Yes | CI model assumption | central write-off recovery | derived from customer accuracy remains model assumption |
| mCarrying | configured value or accuracy-derived recovery | Yes | CI model assumption | central/field carrying | same |
| carryRate | industry configuration | Yes | CI model assumption unless approved source shown | annual carrying cost | assumption |
| invTurnsBenchmark | industry configuration | Yes | approved benchmark only when source/date displayed; otherwise CI assumption | turns method | benchmark/assumption as documented |
| mOtif | industry configuration | Yes | CI model assumption | service realization | assumption |
| mIt | industry configuration | Yes | CI model assumption | IT displacement | assumption |
| mDowntime | configured recovery | Yes | CI model assumption | risk avoidance | assumption |
| mExpedite | configured recovery | Yes | CI model assumption | expedite premium | assumption |
| mServicePenalty | 25% prospect start | Yes | CI model assumption | penalties/credits | assumption |
| mCount | 50% prospect start | Yes | CI model assumption | formal count labor | assumption |
| mThroughput | 30% prospect start | Yes | CI model assumption | capacity method | assumption |
| mAccuracy | 35% prospect start | Yes | CI model assumption | order-error operations | assumption |
| mFirstFix | 30% prospect start | Yes | CI model assumption | repeat truck rolls | assumption |
| mFieldLeakage | 30% prospect start | Yes | CI model assumption | field leakage | assumption |
| mFieldCount | 50% prospect start | Yes | CI model assumption | field reconciliation | assumption |
| accuracy calibration | target 99.5%; gap × 5; cap 60% | explicit recovery overrides | CI v2.8 internal modeling rule; no external source claimed | calibrates shrink/carry recovery | derived model assumption |
| implementation | 3 months prospect start | Yes | CI model assumption | benefit timing | assumption |
| benefit ramp | 40%, 75%, 100% | Yes | CI model assumption | adoption timing | assumption |
| discount rate | industry/default only when configured; zero valid | Yes | customer input preferred | NPV | customer-supported only when sourced |
