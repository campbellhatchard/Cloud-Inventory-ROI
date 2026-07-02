# Calculation Logic Review — Cloud Inventory ROI Calculator

## Executive readout
The calculator is directionally useful, but several value buckets are currently capable of overlapping. The biggest risk is overstating ROI by treating operational benefits as independent when they may be caused by the same underlying inventory accuracy improvement.

## Highest-priority double-count risks

### 1. Carrying cost reduction and inventory turns capital freed
Current logic:
- `carrySav = inventory value × carrying cost rate × carrying cost reduction %`
- `turnsSav = capital freed from turns gap × carrying cost rate`

Why this is risky:
Both benefits monetize lower inventory carrying burden. If the carrying cost reduction assumption already represents lower buffer stock, lower excess stock, better replenishment, or improved inventory velocity, then adding the turns benefit double counts the same improvement.

Recommendation:
Make these mutually exclusive or explicitly separated:
- Option A: Use **Carrying Cost Savings** only.
- Option B: Use **Turns / Working Capital Savings** only when current turns and benchmark turns are entered.
- Option C: Keep both only if the UI defines carrying cost reduction as non-inventory-velocity savings, such as storage handling, obsolescence, insurance, and admin overhead.

### 2. Shrinkage / write-off reduction and OTIF protection
Current logic:
- Shrinkage uses write-off dollars or inventory × shrink rate.
- OTIF protection uses revenue × OTIF gap × improvement % or revenue × at-risk % × improvement %.

Why this is risky:
Poor inventory accuracy can create both write-offs and missed/late shipments. That is valid operationally, but the same inventory error can be counted once as recovered write-off and again as recovered revenue unless the OTIF value is scoped to margin, penalties, service credits, lost customer value, or incremental retained revenue.

Recommendation:
Do not use total revenue as the default economic value. Use one of:
- Gross margin on protected revenue.
- Service penalty / chargeback exposure.
- Customer-retention value at risk.
- Expedited freight / rework cost avoided.

### 3. Labor productivity and IT displacement
Current logic:
- Labor savings = users × labor cost × productivity gain %.
- IT displacement = current IT / legacy cost × displacement %.

Why this is risky:
If `Current IT / legacy cost` includes support labor, admin labor, contractors, reporting effort, or internal operations headcount, the calculator can double count labor savings.

Recommendation:
Label `Current IT / legacy cost` as **software licenses, maintenance, hosting, and external support only**. Add helper text warning users not to include operational labor already captured in user productivity.

### 4. Labor savings and carrying / shrink / OTIF savings
Current logic treats labor, shrink, carrying, and OTIF as additive.

Why this is risky:
These improvements may be causally linked. Example: scan verification reduces manual reconciliation labor, write-offs, buffer stock, and OTIF misses. The benefits are not automatically wrong, but they need boundary definitions so the same transaction error is not monetized four times.

Recommendation:
For executive-facing output, add a note that benefit categories are calculated independently and should be validated against prospect-specific baselines. For a more conservative model, apply a realization factor or allow users to exclude selected benefit categories.

## Medium-priority logic issues

### 5. OTIF calculation uses revenue rather than margin
Using full revenue can materially overstate value. A missed shipment does not always mean lost full revenue; it may mean delayed revenue, lower margin, penalties, or customer dissatisfaction.

Recommendation:
Add `Gross margin %`, `penalty rate %`, or `revenue at risk %` as explicit inputs. Default to a conservative margin-based value.

### 6. Inventory turns formula assumes inventory value is average inventory
The formula assumes `annual inventory value` is an average inventory balance. If the user enters annual inventory throughput instead, the turns calculation becomes wrong.

Recommendation:
Rename the field to **Average inventory on hand ($)** or add explicit help text.

### 7. Shrinkage baseline fallback can be misleading
If no actual write-off is entered, shrinkage is derived from inventory × shrink rate. That is acceptable for an estimate, but the confidence score should distinguish prospect-confirmed from default-derived assumptions.

Recommendation:
The new confidence logic flags entered values as complete, but the sales process should still distinguish prospect-supplied actuals from industry defaults in the executive narrative.

### 8. First-year ROI includes recurring annual subscription plus one-time costs
This is mathematically reasonable, but the model should be clear that Year 1 ROI is calculated against implementation + hardware + training + annual subscription.

Recommendation:
Keep the logic but make the investment basis explicit in tooltips and the executive presentation.

## Recommended decision rules

### Conservative default
Use only:
1. Labor savings
2. Write-off reduction
3. IT displacement
4. One of either carrying cost savings or inventory turns savings, not both
5. OTIF only if modeled on margin, penalty, or explicitly quantified revenue-at-risk

### Base case
Allow all categories, but require users to mark assumptions as confirmed and add clear assumptions in the executive output.

### Aggressive case
Allow all categories but label the case as upside potential, not the forecast.

## Suggested next code enhancement
Add toggles for each value bucket:
- Include labor savings
- Include write-off reduction
- Include carrying cost savings
- Include turns / working capital savings
- Include OTIF protection
- Include IT displacement

Then add a warning when both carrying cost and turns savings are enabled:
> Carrying cost and turns savings may overlap. Confirm these represent separate benefit pools before presenting externally.
