# Discovery Guide → Calculator Impact Map

**Version 2.5** — every quantifiable discovery question now feeds the ROI model. This map shows, for each question, the calculator field it populates and the ROI line it moves.

---

## Default / Generic

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many people directly touch inventory as part of their daily role -… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| What percentage of a typical worker day is consumed by manual counts, … | percent | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| How many hours per week does the team spend investigating and resolvin… | number | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| What is your current inventory accuracy rate (%)? | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| What is the total dollar value of inventory you write off annually due… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical count days per year does your team perform (people-d… | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| What is the total value of inventory on hand at any given point in tim… | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| How many inventory turns do you achieve per year? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| What is your current on-time, in-full (OTIF) or order accuracy rate (%… | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| What is your target OTIF rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| What percentage of orders require re-picking, re-packing, or expedited… | percent | — | Not synced |
| How many times per year does work stop or slow due to stockouts caused… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| On average, how many hours are lost per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| What is the fully-loaded cost of one hour of that lost/slowed work ($)… | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| What is your total annual spend on expedited or emergency orders cause… | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| What do you pay annually for inventory system licenses, maintenance, a… | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| What systems do you currently use to manage inventory - ERP module, WM… | text | — (qualitative note) | Context only — not calculated |
| What is the organisations annual revenue? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| What hurdle rate or cost of capital does your finance team use (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Telecommunications

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many field technicians, warehouse staff, and network operations pe… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| What percentage of a field technician time is non-productive - driving… | percent | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| How many truck rolls per year are caused by incorrect or unavailable p… | number | — | Not synced |
| What is your current parts inventory accuracy rate (%) across warehous… | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| What is the annual dollar value of parts written off due to loss, thef… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| What is your current on-time delivery rate for CPE installations (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| What is your target on-time delivery rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| What annual SLA penalties or customer credits did parts delays cause (… | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| How many network incidents per year have restoration extended by parts… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours added to MTTR per such incident? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Cost per hour of extended outage/SLA exposure ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual emergency/expedited parts procurement spend ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Total value of spare parts across warehouse, depots, and vehicles? | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| How many inventory turns per year on spare parts? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual cost of inventory and field service management systems? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual service revenue? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Hurdle rate for infrastructure investments (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Manufacturing

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many personnel are involved in inventory activities - receiving, w… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| What percentage of production staff time is spent on inventory activit… | percent | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| How many times per year does production stop/slow due to stockouts fro… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours of lost production per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Fully-loaded cost per hour of lost production ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual spend on expedited inbound materials due to stockouts ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Current raw material and WIP inventory accuracy rate (%)? | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| Annual value of inventory written off - scrap, component losses, obsol… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| Current customer OTIF / on-time delivery rate (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Target OTIF rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| Annual financial penalties, chargebacks, or expediting costs from late… | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Total value of raw materials, WIP, and finished goods on hand? | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns achieved annually? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual cost of ERP inventory module and any WMS/warehouse systems? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual revenue? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Discount/hurdle rate (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Engineering & Construction

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many people across sites, yard, and office manage or transact inve… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| Hours per week site supervisors spend searching for materials, investi… | number | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| How many active job sites are you managing inventory across simultaneo… | number | — | Not synced |
| What percentage of materials ordered are unaccounted for at closeout -… | percent | — | Not synced |
| Annual dollar value of tools, equipment, materials written off due to … | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| How many times per year does site work stop/slow due to missing materi… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours of crew idle time per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Fully-loaded cost per hour of idle crew ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual emergency material purchase spend to cover shortfalls ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| What percentage of projects deliver all contracted materials on time a… | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Target on-time-complete delivery rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| Do projects require material traceability for compliance (AS/NZS, ISO,… | text | — (qualitative note) | Context only — not calculated |
| Total value of materials, tools, equipment across yard and sites? | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns per year? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual spend on inventory and asset management systems? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual revenue or contract value? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Cost of capital / hurdle rate (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Oil & Gas

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many personnel are in maintenance, materials management, and inven… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| Percentage of maintenance technician time on non-wrench activities - p… | percent | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| How many unplanned maintenance events per year are extended/worsened b… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours of production impact per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Cost per hour of that downtime ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual emergency/unplanned procurement spend from stockouts ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Current inventory accuracy rate for critical spares and maintenance ma… | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| Annual value of parts/materials written off - dead stock, unreconciled… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| Current on-time delivery / materials availability rate (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Target availability rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| Do operations require material traceability to well/asset/regulatory c… | text | — (qualitative note) | Context only — not calculated |
| Total value of spares, maintenance materials, consumables across locat… | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns per year on spares? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual cost of EAM/CMMS, ERP inventory module, and IT support? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual operating revenue? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Hurdle rate for operational investments (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Distribution & 3PL

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many warehouse associates, operators, supervisors handle daily inv… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| Hours per week spent re-picking, re-packing, or investigating order di… | number | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| Current pick accuracy rate (%)? | percent | — | Not synced |
| Perpetual inventory (location) accuracy rate (%)? | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| Annual dollar value written off due to shrinkage, damage, or variances… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| Current OTIF rate across top customers (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Contractual target OTIF rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| Total annual customer chargebacks/deductions/fines from OTIF failures … | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| How many times per year does fulfillment halt/slow due to inaccurate i… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours lost per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Cost per hour of halted fulfillment ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual expedited freight spend caused by inventory errors ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Average total inventory value held in the facility? | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns per year? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual WMS/TMS license and support cost? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual revenue from 3PL/distribution operations? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Discount rate (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Food & Beverage

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many staff are in inventory operations across receiving, productio… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| Percentage of team time on manual lot tracking, FEFO verification, or … | percent | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| Hours per week on compliance documentation - traceability reports, tem… | number | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| Current inventory accuracy for lot-tracked and date-coded products (%)… | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| Annual value of product written off - expiry, FEFO failures, temp excu… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| Current OTIF / order fill rate to retail, food service, or export (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Target OTIF / fill rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| Annual penalties, deductions, or returns from incorrect product, wrong… | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| How many times per year does production stop/slow due to material stoc… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours lost per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Cost per hour of lost production ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual expedited ingredient/packaging purchases from stockouts ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Total value of raw materials, packaging, and finished goods on hand? | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns per year? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Regulatory compliance requirements - FDA FSMA, HACCP, retailer audits? | text | — (qualitative note) | Context only — not calculated |
| Annual spend on production ERP, WMS, and compliance systems? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual revenue? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Cost of capital / hurdle rate (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Retail

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many store associates, warehouse staff, inventory controllers mana… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| Hours per week associates spend on manual stock counts, discrepancy in… | number | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| Current phantom inventory rate - % of SKUs shown in-stock but not on s… | percent | — | Not synced |
| Current inventory accuracy rate at store/SKU level (%)? | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| Total annual shrink - known and unknown - as a dollar value? | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| Current in-stock rate / on-shelf availability (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Target in-stock rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| Estimated annual lost sales from phantom inventory, out-of-stocks, or … | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| How many times per year do out-of-stocks halt sales/fulfillment due to… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours of lost selling per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Estimated lost margin per hour ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual expedited replenishment/transfer spend from stockouts ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Total retail value of inventory across stores and DCs? | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns per year? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual spend on retail inventory, POS, and fulfilment systems? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Total annual revenue across all channels? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Hurdle rate for retail investment (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

## Minerals & Mining

| Question | Input type | Calculator field | ROI impact |
|---|---|---|---|
| How many maintenance technicians, storekeepers, procurement staff mana… | number | `userCount` | **Labor savings**: users x labor rate x labor-recovery% → laborSav |
| Percentage of maintenance staff time on non-productive activities - pa… | percent | `laborWastePct` | **Labor savings**: scales laborSav by measured productivity-waste% |
| How many times per year is planned maintenance deferred due to parts u… | number | `downtimeEventsYr` | **Production downtime (NEW)**: events x hrs x $/hr x downtime-recovery% → downtimeSav |
| Average hours of resulting unplanned downtime per event? | number | `downtimeHrsPerEvent` | **Production downtime (NEW)**: component of downtimeSav |
| Cost per hour of lost production ($)? | number | `downtimeCostPerHr` | **Production downtime (NEW)**: component of downtimeSav |
| Annual emergency procurement spend from stockouts ($)? | number | `expediteSpendYr` | **Expedite premium (NEW)**: expedite spend x expedite-recovery% → expediteSav |
| Current critical spares inventory accuracy rate (%)? | percent | `currentAccuracy` | **Shrink & carrying (suggested)**: accuracy gap suggests shrink/carrying recovery% |
| Annual value of spares/materials written off - obsolescence, loss, unr… | number | `annualWriteOff` | **Write-off/shrink savings**: write-off $ x shrink-recovery% → shrinkSav |
| How many physical/cycle count days per year (people-days total)? | number | `countDaysYr` | **Count labor (NEW)**: count days x people x daily labor x count-recovery% → countSav |
| How many people are involved in those counts? | number | `countPeople` | **Count labor (NEW)**: component of countSav |
| Current plant/mine materials availability rate (%)? | percent | `otifBaseline` | **OTIF revenue-at-risk**: revenue x (target-baseline) x OTIF-recovery% → otifSav |
| Target availability rate (%)? | percent | `otifTarget` | **OTIF revenue-at-risk**: sets the OTIF gap ceiling → otifSav |
| OEM warranty conditions requiring specific lot tracking or maintenance… | text | — (qualitative note) | Context only — not calculated |
| Total value of spare parts and maintenance materials across stores and… | number | `inventoryValue` | **Carrying cost + turns**: inventory x carrying% (and turns gap) → carrySav + turnsSav |
| Inventory turns per year on spares? | number | `invTurnsCurrent` | **Working capital (turns)**: inventory x (1 - current/benchmark turns) x carry rate → turnsSav |
| Annual cost of EAM, CMMS, and ERP inventory systems? | number | `itCost` | **IT displacement**: IT cost x IT-recovery% → itSav |
| Annual production revenue? | number | `revenue` | **Revenue base**: multiplier for OTIF value-at-risk |
| Hurdle rate for capital/operational investments (%)? | percent | `discRate` | **NPV**: discount rate for NPV 3/5-year |

---

## ROI levers reference

The model computes annual benefit as the sum of these levers:

**Original 6 levers**

1. **laborSav** = users × labor rate × labor-recovery%
2. **shrinkSav** = annual write-off × shrink-recovery%
3. **carrySav** = inventory × carrying% (−15% overlap)
4. **turnsSav** = inventory × (1 − current/benchmark turns) × carry rate
5. **otifSav** = revenue × (OTIF target − baseline) × OTIF-recovery%
6. **itSav** = IT cost × IT-recovery%

**New in v2.5 (3 levers)**

7. **downtimeSav** = downtime events/yr × hrs/event × $/hr × downtime-recovery%
8. **expediteSav** = annual expedite spend × expedite-recovery%
9. **countSav** = count days/yr × people × (labor ÷ 260) × count-recovery%

> Recovery percentages default to industry benchmarks and can be overridden per scenario in the Operational Cost Drivers and Improvement Assumptions sections.

> **Version guard:** scenarios saved before v2.5 carry no new-lever inputs and therefore compute an unchanged annual benefit — the three new levers contribute $0 until a scenario is re-entered with the new fields.
