# ROI Formula Reference — Model v2.8

All percentages are decimals in the engine. Monetary inputs use scenario currency. Model v2.8 applies only when `modelVersion >= 28`; saved v27 scenarios retain legacy behavior.

| Formula ID / method | Purpose and economic class | Formula | Required inputs / units | Recovery, caps, overlap | Example |
|---|---|---|---|---|---|
| workforce_productivity / labor_waste | Labor recovery; direct cost savings | users × loaded annual labor × waste × mLabor | people, $/person/year, %, % | Alternative to throughput; labor method wins when measured waste exists | 10 × $52k × 20% × 50% = $52k |
| workforce_productivity / throughput | Capacity value | orders × cost/order × pick gain × mThroughput | orders/year, $/order, %, % | Used only when labor-waste method is absent; not automatic cash savings | 100k × $3 × 20% × 50% = $30k |
| count_labor | Formal count labor; direct cost savings | count days × people × labor/260 × mCount | event days/year, people, $/year, % | Count days are not people-days; separate formal count activity | 12 × 6 × $200 × 50% = $7,200 |
| inventory_writeoff | Central write-off reduction; direct cost savings | central write-off base × effective recovery | $/year, % | Excludes field leakage | $100k × 40% = $40k |
| accuracy calibration | Recovery assumption | min(60%, (99.5 − current accuracy) × 5%) | current customer accuracy % | Explicit recovery overrides; no dollars without an economic base | 92% → 37.5% |
| inventory_carrying | Central carrying benefit; working capital | central inventory × carry rate × recovery | $, %, % | Reconciled with turns; count higher carrying estimate | $8m × 25% × 20% = $400k |
| inventory turns | Trapped-capital carrying benefit | inventory × (1 − current/benchmark) × carry rate | $, turns/year, turns/year, % | Same central carrying pool | $8m × (1−4/8) × 25% = $1m |
| service_revenue_margin / direct | Recovered contribution margin | lostSalesYr × contributionMarginPct × mOtif | $/year, %, % | Precedes modeled method; never full revenue | $500k × 30% × 20% = $30k |
| service_revenue_margin / modeled | Recovered contribution margin | revenue × OTIF gap × contribution margin × mOtif | $/year, percentage-point gap, %, % | Used only when direct lost sales absent | $10m × 5% × 30% × 20% = $30k |
| service_penalties | Direct cost savings | penalties/credits × mServicePenalty | $/year, % | Separate from expedite, errors, downtime | $100k × 25% = $25k |
| expedite_premium | Direct cost savings | expedite premium × mExpedite | $/year, % | Excludes penalties, credits, lost sales | $200k × 25% = $50k |
| downtime | Risk avoidance | events × hours/event × internal cost/hour × mDowntime | events/year, hours, $/hour, % | Excludes lost sales, penalties/credits, expedite | 10 × 2 × $1k × 50% = $10k |
| order_error | Direct operating-cost savings | orders × error rate × cost/error × mAccuracy | orders/year, %, $/error, % | Cost/error excludes penalties, expedite, lost sales | 100k × 2% × $100 × 35% = $70k |
| first_time_fix | Direct cost savings | repeat visits × cost/truck roll × mFirstFix | visits/year, $/visit, % | Separate repeat-visit cost pool | 500 × $300 × 30% = $45k |
| field_leakage | Direct cost savings | fieldInvValue × leakage rate × mFieldLeakage | $, %, % | Field-only pool; excludes central write-off | $2m × 5% × 30% = $30k |
| field carrying | Working-capital/carrying benefit | fieldInvValue × carry rate × effective recovery | $, %, % | Field-only pool; central inventory must exclude it | $2m × 25% × 20% = $100k |
| field_reconciliation | Direct cost savings | locations × frequency × person-hours × labor/2080 × mFieldCount | locations, counts/year, person-hours, $/year, % | Separate activity from generic productivity | 10 × 4 × 8 × $25 × 50% = $4k |
| it_displacement | Direct cost savings | annual IT cost × mIt | $/year, % | No overlap pool | $200k × 50% = $100k |
| ramp | Timing | monthly steady benefit × 0 during implementation, then ramp1/ramp2/ramp3 | months and factors | factors capped 0–100% | 3-month implementation then 40/75/100% |
| contract benefit | Contract economics | sum monthly ramped benefits within contract term | months, annual benefit | partial years prorated | 18 months uses months 1–18 |
| investment | Contract cost | one-time cost + prorated recurring subscription | currency | no fabricated prospect placeholder | — |
| ROI | Return | (benefit − investment) / investment | currency | unavailable when investment is zero | — |
| NPV | Present value | discounted monthly/annual net cash flows | cash flows, discount rate | zero is valid; no hidden rate | — |
| payback | Timing | first month cumulative net cash flow ≥ 0 | monthly flows | unavailable without investment or outside term | — |
