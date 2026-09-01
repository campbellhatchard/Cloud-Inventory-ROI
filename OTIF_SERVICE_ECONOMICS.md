# OTIF and Service Economics — Finance Review

## Inputs and provenance

Current OTIF, target OTIF, annual revenue, direct annual lost sales, contribution margin, and realization (`mOtif`) are distinct inputs. Customer/prospect answers retain customer provenance. `mOtif` and any derived recovery remain model assumptions until separately validated.

## Alternative service-revenue methods

Direct method: `lostSalesYr × contributionMarginPct × mOtif`. It takes precedence because it begins with a supported observed loss.

Modeled method: `revenue × ((target OTIF − current OTIF)/100) × contributionMarginPct × mOtif`. It is used only when direct lost sales is absent. Revenue is a scale input—not benefit or profit.

Example: $10M revenue, 90% current, 95% target, 30% contribution margin, 20% realization produces `$10M × 5% × 30% × 20% = $30K`, not $500K and not $10M.

Direct example: $500K supported annual lost sales × 30% contribution margin × 20% realization = $30K. If both examples are entered, only the direct method is counted. If contribution margin is absent, service-revenue value remains unquantified.

## Separate economic pools

- Service penalties, customer credits, chargebacks, and deductions: annual amount × `mServicePenalty`; direct cost savings.
- Expedite/emergency premium: annual expedite spend × `mExpedite`; direct cost savings. It excludes penalties, credits, deductions, and lost sales.
- Order-error operations: internal rework, return handling, and normal reship × recovery. It excludes penalties and expedite.
- Downtime: incremental internal operating/labor disruption cost × recovery; risk avoidance. It excludes lost sales, penalties/credits, and expedite.
- Retail boundary: observed lost sales enter the contribution-margin method. Hourly disruption cost is internal labor/operating cost only and must not repeat lost margin.
