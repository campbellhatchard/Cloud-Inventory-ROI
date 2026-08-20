/* ═══════════════════════════════════════════════════════════════
   discovery.js  —  Industry-specific discovery questions
   + Shared session state for rep/prospect collaboration
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   INDUSTRY-SPECIFIC DISCOVERY QUESTIONS
   Each question has:
   - id: matches dq1–dqN for syncing
   - text: the question as asked to the prospect
   - why: internal rep note (hidden from prospect view)
   - sync: calculator field ID to auto-populate (optional)
   - type: 'text' | 'number' | 'percent' | 'select'
   - placeholder: example answer
   ───────────────────────────────────────── */
const DISC_QUESTIONS = {
  default: [
    { section: 'Labor & Productivity', questions: [
      { id:'dq1', text:'How many people directly touch inventory as part of their daily role - warehouse staff, field technicians, and office-based inventory controllers?', why:'Drives user count and total labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 45' },
      { id:'dq2', text:'What percentage of a typical worker day is consumed by manual counts, paper processes, spreadsheet updates, or reconciliation rework?', why:'Identifies productivity gain potential. Benchmark: 20-35%.', sync:'laborWastePct', type:'percent', placeholder:'e.g. 25' },
      { id:'dq3', text:'How many hours per week does the team spend investigating and resolving inventory discrepancies?', why:'Quantifies hidden labor cost of inaccuracy.', sync:'laborWastePct', syncConv:'hoursPerWeek', type:'number', placeholder:'e.g. 20' },
    ]},
    { section: 'Inventory Accuracy & Write-offs', questions: [
      { id:'dq4', text:'What is your current inventory accuracy rate (%)?', why:'CI benchmark: 99.5% accuracy. The gap drives shrinkage opportunity.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 92' },
      { id:'dq5', text:'What is the total dollar value of inventory you write off annually due to loss, damage, expiry, or unaccounted shrinkage?', why:'Direct input for write-off savings calculation.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 250000' },
      { id:'dq6a', text:'How many physical count days per year does your team perform (people-days total)?', why:'Count-labor lever: total person-days spent counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Inventory Value & Carrying Costs', questions: [
      { id:'dq7', text:'What is the total value of inventory on hand at any given point in time?', why:'Primary input for carrying cost and turns calculation.', sync:'inventoryValue', type:'number', placeholder:'e.g. 8000000' },
      { id:'dq8', text:'How many inventory turns do you achieve per year?', why:'Turns gap vs benchmark = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 5' },
    ]},
    { section: 'Order Accuracy & OTIF', questions: [
      { id:'dq9', text:'What is your current on-time, in-full (OTIF) or order accuracy rate (%)?', why:'Baseline for improvement. Industry avg improves 8-15% with CI.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 93' },
      { id:'dq10', text:'What is your target OTIF rate (%)?', why:'OTIF gap (target - baseline) drives revenue-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 98' },
      { id:'dq11', text:'What percentage of orders require re-picking, re-packing, or expedited shipping due to inventory errors?', why:'Quantifies true cost of fulfillment inaccuracy.', type:'percent', placeholder:'e.g. 8' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year does work stop or slow due to stockouts caused by inaccurate records?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 100' },
      { id:'dq19', text:'On average, how many hours are lost per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 1.5' },
      { id:'dq20', text:'What is the fully-loaded cost of one hour of that lost/slowed work ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 3000' },
      { id:'dq21', text:'What is your total annual spend on expedited or emergency orders caused by stockouts ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 200000' },
    ]},
    { section: 'Systems & Financial Baseline', questions: [
      { id:'dq13', text:'What do you pay annually for inventory system licenses, maintenance, and IT support?', why:'Direct IT cost displacement input.', sync:'itCost', type:'number', placeholder:'e.g. 180000' },
      { id:'dq12', text:'What systems do you currently use to manage inventory - ERP module, WMS, spreadsheets, or paper?', why:'Context: identifies displacement opportunity and integration complexity.', type:'text', note:true, placeholder:'e.g. SAP ERP native module + Excel' },
      { id:'dq16', text:'What is the organisations annual revenue?', why:'Used for OTIF value-at-risk calculation.', sync:'revenue', type:'number', placeholder:'e.g. 45000000' },
      { id:'dq17', text:'What hurdle rate or cost of capital does your finance team use (%)?', why:'NPV discount rate. Typically 8-15%.', sync:'discRate', type:'percent', placeholder:'e.g. 12' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  telecom: [
    { section: 'Field Operations & Labor', questions: [
      { id:'dq1', text:'How many field technicians, warehouse staff, and network operations personnel handle inventory or spare parts?', why:'Drives user count and labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 85' },
      { id:'dq2', text:'What percentage of a field technician time is non-productive - driving back for wrong parts, manual ordering, paperwork?', why:'High in telecom - benchmark 25-40% non-productive.', sync:'laborWastePct', type:'percent', placeholder:'e.g. 30' },
      { id:'dq3', text:'How many truck rolls per year are caused by incorrect or unavailable parts?', why:'Each unnecessary truck roll = $200-$500 fully loaded.', type:'number', placeholder:'e.g. 780' },
    ]},
    { section: 'Parts Inventory & Write-offs', questions: [
      { id:'dq4', text:'What is your current parts inventory accuracy rate (%) across warehouse and vehicle stock?', why:'CI benchmark: 99.5%. Gap drives shrinkage and truck-roll exposure.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 88' },
      { id:'dq5', text:'What is the annual dollar value of parts written off due to loss, theft, or unreconciled field consumption?', why:'Direct write-off input - typically 2-4% of telecom parts inventory.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 400000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Network & SLA Performance', questions: [
      { id:'dq9', text:'What is your current on-time delivery rate for CPE installations (%)?', why:'CPE accuracy drives NPS and churn.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 87' },
      { id:'dq9b', text:'What is your target on-time delivery rate (%)?', why:'OTIF gap drives revenue-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 95' },
      { id:'dq10', text:'What annual SLA penalties or customer credits did parts delays cause ($)?', why:'Direct financial impact - contributes to expedite/penalty recovery.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 650000' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many network incidents per year have restoration extended by parts unavailability?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 200' },
      { id:'dq19', text:'Average hours added to MTTR per such incident?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 3' },
      { id:'dq20', text:'Cost per hour of extended outage/SLA exposure ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 4000' },
      { id:'dq21', text:'Annual emergency/expedited parts procurement spend ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 500000' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Total value of spare parts across warehouse, depots, and vehicles?', why:'Full inventory base for carrying cost.', sync:'inventoryValue', type:'number', placeholder:'e.g. 12000000' },
      { id:'dq8', text:'How many inventory turns per year on spare parts?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 4' },
      { id:'dq13', text:'Annual cost of inventory and field service management systems?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. 320000' },
      { id:'dq16', text:'Annual service revenue?', why:'Revenue base for SLA/OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 380000000' },
      { id:'dq17', text:'Hurdle rate for infrastructure investments (%)?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 10' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  mfg: [
    { section: 'Production & Labor', questions: [
      { id:'dq1', text:'How many personnel are involved in inventory activities - receiving, warehouse, production stores, shipping?', why:'Drives user count and labor savings.', sync:'userCount', type:'number', placeholder:'e.g. 60' },
      { id:'dq3', text:'What percentage of production staff time is spent on inventory activities not tied to production - counting, searching, reconciling?', why:'Benchmark: 15-30% of time in manual inventory.', sync:'laborWastePct', type:'percent', placeholder:'e.g. 20' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year does production stop/slow due to stockouts from inaccurate records?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 120' },
      { id:'dq19', text:'Average hours of lost production per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 0.75' },
      { id:'dq20', text:'Fully-loaded cost per hour of lost production ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 5000' },
      { id:'dq21', text:'Annual spend on expedited inbound materials due to stockouts ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 400000' },
    ]},
    { section: 'Inventory Accuracy & Write-offs', questions: [
      { id:'dq4', text:'Current raw material and WIP inventory accuracy rate (%)?', why:'Accuracy below 98% impacts production planning.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 94' },
      { id:'dq5', text:'Annual value of inventory written off - scrap, component losses, obsolescence, variances?', why:'Direct write-off savings input.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 320000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Supply Chain & OTIF', questions: [
      { id:'dq9', text:'Current customer OTIF / on-time delivery rate (%)?', why:'OTIF gap is a primary value driver in manufacturing.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 91' },
      { id:'dq9b', text:'Target OTIF rate (%)?', why:'Gap drives revenue-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 97' },
      { id:'dq10', text:'Annual financial penalties, chargebacks, or expediting costs from late/incomplete shipments ($)?', why:'Hard-dollar OTIF cost.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 280000' },
    ]},
    { section: 'Inventory & Working Capital', questions: [
      { id:'dq7', text:'Total value of raw materials, WIP, and finished goods on hand?', why:'Full inventory base for carrying cost and turns.', sync:'inventoryValue', type:'number', placeholder:'e.g. 14000000' },
      { id:'dq8', text:'Inventory turns achieved annually?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 4' },
    ]},
    { section: 'Systems & Financial Baseline', questions: [
      { id:'dq13', text:'Annual cost of ERP inventory module and any WMS/warehouse systems?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. 240000' },
      { id:'dq16', text:'Annual revenue?', why:'Revenue base for OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 75000000' },
      { id:'dq17', text:'Discount/hurdle rate (%)?', why:'NPV calculation input.', sync:'discRate', type:'percent', placeholder:'e.g. 12' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  construction: [
    { section: 'Site & Labor Management', questions: [
      { id:'dq1', text:'How many people across sites, yard, and office manage or transact inventory - materials, tools, equipment, consumables?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 70' },
      { id:'dq2', text:'Hours per week site supervisors spend searching for materials, investigating shortages, or on manual paperwork?', why:'Benchmark: 5-10 hrs/week per supervisor.', sync:'laborWastePct', syncConv:'hoursPerWeek', type:'number', placeholder:'e.g. 6' },
      { id:'dq3', text:'How many active job sites are you managing inventory across simultaneously?', why:'Multi-site complexity multiplies visibility value.', type:'number', placeholder:'e.g. 12' },
    ]},
    { section: 'Material Loss & Write-offs', questions: [
      { id:'dq4', text:'What percentage of materials ordered are unaccounted for at closeout - loss, theft, waste beyond plan?', why:'Construction shrinkage benchmark: 2-5%.', type:'percent', placeholder:'e.g. 3' },
      { id:'dq5', text:'Annual dollar value of tools, equipment, materials written off due to loss, theft, or unaccounted consumption?', why:'Direct write-off savings input.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 450000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year does site work stop/slow due to missing materials from poor tracking?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 150' },
      { id:'dq19', text:'Average hours of crew idle time per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 2' },
      { id:'dq20', text:'Fully-loaded cost per hour of idle crew ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 2500' },
      { id:'dq21', text:'Annual emergency material purchase spend to cover shortfalls ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 600000' },
    ]},
    { section: 'Project Delivery & Compliance', questions: [
      { id:'dq9', text:'What percentage of projects deliver all contracted materials on time and complete (%)?', why:'Material shortfall causes project delay claims.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 82' },
      { id:'dq9b', text:'Target on-time-complete delivery rate (%)?', why:'Gap drives value-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 95' },
      { id:'dq11', text:'Do projects require material traceability for compliance (AS/NZS, ISO, client audits)?', why:'Context: compliance documentation burden.', type:'text', note:true, placeholder:'e.g. Yes - monthly audit reports, 3 days each' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Total value of materials, tools, equipment across yard and sites?', why:'Base for carrying cost and turns.', sync:'inventoryValue', type:'number', placeholder:'e.g. 22000000' },
      { id:'dq8', text:'Inventory turns per year?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 3' },
      { id:'dq13', text:'Annual spend on inventory and asset management systems?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. 90000' },
      { id:'dq16', text:'Annual revenue or contract value?', why:'Revenue base for OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 120000000' },
      { id:'dq17', text:'Cost of capital / hurdle rate (%)?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 12' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  oil: [
    { section: 'Field Operations & Maintenance Labor', questions: [
      { id:'dq1', text:'How many personnel are in maintenance, materials management, and inventory ops across sites?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 120' },
      { id:'dq2', text:'Percentage of maintenance technician time on non-wrench activities - parts searching, requisitioning, reconciliation?', why:'Benchmark: 20-35% non-productive.', sync:'laborWastePct', type:'percent', placeholder:'e.g. 25' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many unplanned maintenance events per year are extended/worsened by parts unavailability?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 48' },
      { id:'dq19', text:'Average hours of production impact per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 6' },
      { id:'dq20', text:'Cost per hour of that downtime ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 20000' },
      { id:'dq21', text:'Annual emergency/unplanned procurement spend from stockouts ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 900000' },
    ]},
    { section: 'Parts Inventory & Write-offs', questions: [
      { id:'dq4', text:'Current inventory accuracy rate for critical spares and maintenance materials (%)?', why:'CI benchmark: 99.5%. Below 95% = downtime risk.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 91' },
      { id:'dq5', text:'Annual value of parts/materials written off - dead stock, unreconciled consumption, obsolescence?', why:'Direct write-off savings.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 800000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Compliance & OTIF', questions: [
      { id:'dq9', text:'Current on-time delivery / materials availability rate (%)?', why:'Baseline for OTIF improvement.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 89' },
      { id:'dq9b', text:'Target availability rate (%)?', why:'Gap drives value-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 96' },
      { id:'dq9c', text:'Do operations require material traceability to well/asset/regulatory certificate?', why:'Context: compliance documentation burden.', type:'text', note:true, placeholder:'e.g. Yes - NOPSEMA, ~8 days/quarter' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Total value of spares, maintenance materials, consumables across locations?', why:'Full inventory base for carrying cost and turns.', sync:'inventoryValue', type:'number', placeholder:'e.g. 35000000' },
      { id:'dq8', text:'Inventory turns per year on spares?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 4' },
      { id:'dq13', text:'Annual cost of EAM/CMMS, ERP inventory module, and IT support?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. 520000' },
      { id:'dq16', text:'Annual operating revenue?', why:'Revenue base for value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 850000000' },
      { id:'dq17', text:'Hurdle rate for operational investments (%)?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 15' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  distribution: [
    { section: 'Warehouse Operations & Labor', questions: [
      { id:'dq1', text:'How many warehouse associates, operators, supervisors handle daily inventory transactions?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 95' },
      { id:'dq2', text:'Hours per week spent re-picking, re-packing, or investigating order discrepancies?', why:'Re-work labor is a direct measurable cost.', sync:'laborWastePct', syncConv:'hoursPerWeek', type:'number', placeholder:'e.g. 30' },
      { id:'dq3', text:'Current pick accuracy rate (%)?', why:'Accuracy baseline for rework reduction.', type:'percent', placeholder:'e.g. 97.5' },
    ]},
    { section: 'Inventory Accuracy & Shrinkage', questions: [
      { id:'dq4', text:'Perpetual inventory (location) accuracy rate (%)?', why:'CI benchmark: 99.8%. Gap drives chargebacks.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 96' },
      { id:'dq5', text:'Annual dollar value written off due to shrinkage, damage, or variances?', why:'Direct write-off savings input.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 180000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Customer OTIF & Chargebacks', questions: [
      { id:'dq9', text:'Current OTIF rate across top customers (%)?', why:'OTIF gap sizes value-at-risk.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 95.2' },
      { id:'dq9b', text:'Contractual target OTIF rate (%)?', why:'Gap drives chargeback recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 98.5' },
      { id:'dq10', text:'Total annual customer chargebacks/deductions/fines from OTIF failures ($)?', why:'Hard-dollar OTIF cost - key CFO metric.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 420000' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year does fulfillment halt/slow due to inaccurate inventory?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 90' },
      { id:'dq19', text:'Average hours lost per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 1' },
      { id:'dq20', text:'Cost per hour of halted fulfillment ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 2000' },
      { id:'dq21', text:'Annual expedited freight spend caused by inventory errors ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 300000' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Average total inventory value held in the facility?', why:'Base for carrying cost and working capital.', sync:'inventoryValue', type:'number', placeholder:'e.g. 28000000' },
      { id:'dq8', text:'Inventory turns per year?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 12' },
      { id:'dq13', text:'Annual WMS/TMS license and support cost?', why:'IT displacement and consolidation.', sync:'itCost', type:'number', placeholder:'e.g. 380000' },
      { id:'dq16', text:'Annual revenue from 3PL/distribution operations?', why:'Revenue base for OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 65000000' },
      { id:'dq17', text:'Discount rate (%)?', why:'NPV calculation input.', sync:'discRate', type:'percent', placeholder:'e.g. 10' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  food: [
    { section: 'Production & Warehouse Labor', questions: [
      { id:'dq1', text:'How many staff are in inventory operations across receiving, production stores, cold storage, dispatch?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 55' },
      { id:'dq2', text:'Percentage of team time on manual lot tracking, FEFO verification, or expiry monitoring?', why:'Automated FEFO is a primary CI value driver.', sync:'laborWastePct', type:'percent', placeholder:'e.g. 20' },
      { id:'dq3', text:'Hours per week on compliance documentation - traceability reports, temp logs, lot reconciliations?', why:'Compliance documentation labor is directly reducible.', sync:'laborWastePct', syncConv:'hoursPerWeek', type:'number', placeholder:'e.g. 25' },
    ]},
    { section: 'Expiry, Waste & Write-offs', questions: [
      { id:'dq4', text:'Current inventory accuracy for lot-tracked and date-coded products (%)?', why:'Low accuracy = expiry failures and write-offs.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 94' },
      { id:'dq5', text:'Annual value of product written off - expiry, FEFO failures, temp excursions, losses?', why:'Direct write-off savings - typically 2-4% in food.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 520000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Customer Service & OTIF', questions: [
      { id:'dq9', text:'Current OTIF / order fill rate to retail, food service, or export (%)?', why:'Baseline for OTIF improvement value.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 93' },
      { id:'dq9b', text:'Target OTIF / fill rate (%)?', why:'Gap drives revenue-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 98' },
      { id:'dq10', text:'Annual penalties, deductions, or returns from incorrect product, wrong lot, or late delivery ($)?', why:'Customer chargeback input.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 350000' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year does production stop/slow due to material stockouts or inaccurate records?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 80' },
      { id:'dq19', text:'Average hours lost per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 1.5' },
      { id:'dq20', text:'Cost per hour of lost production ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 4000' },
      { id:'dq21', text:'Annual expedited ingredient/packaging purchases from stockouts ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 250000' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Total value of raw materials, packaging, and finished goods on hand?', why:'Full inventory base for carrying cost and turns.', sync:'inventoryValue', type:'number', placeholder:'e.g. 9500000' },
      { id:'dq8', text:'Inventory turns per year?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 15' },
      { id:'dq11', text:'Regulatory compliance requirements - FDA FSMA, HACCP, retailer audits?', why:'Context: compliance cost is a major CI value driver.', type:'text', note:true, placeholder:'e.g. FDA FSMA - 2 audits/yr, $80K/yr' },
      { id:'dq13', text:'Annual spend on production ERP, WMS, and compliance systems?', why:'IT displacement and simplification.', sync:'itCost', type:'number', placeholder:'e.g. 195000' },
      { id:'dq16', text:'Annual revenue?', why:'Revenue base for value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 55000000' },
      { id:'dq17', text:'Cost of capital / hurdle rate (%)?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 10' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  retail: [
    { section: 'Store Operations & Labor', questions: [
      { id:'dq1', text:'How many store associates, warehouse staff, inventory controllers manage inventory across the network?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 180' },
      { id:'dq2', text:'Hours per week associates spend on manual stock counts, discrepancy investigation, or stockroom organisation?', why:'Benchmark: 4-8 hrs/week per store.', sync:'laborWastePct', syncConv:'hoursPerWeek', type:'number', placeholder:'e.g. 150' },
      { id:'dq3', text:'Current phantom inventory rate - % of SKUs shown in-stock but not on shelf?', why:'Phantom inventory = lost sales.', type:'percent', placeholder:'e.g. 8' },
    ]},
    { section: 'Shrink & Write-offs', questions: [
      { id:'dq4', text:'Current inventory accuracy rate at store/SKU level (%)?', why:'CI delivers 99.3%+. Gap drives shrink and lost sales.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 92' },
      { id:'dq5', text:'Total annual shrink - known and unknown - as a dollar value?', why:'Retail shrink benchmark: 1.5-2% of sales.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 1800000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'In-stock Rate & Customer Impact', questions: [
      { id:'dq9', text:'Current in-stock rate / on-shelf availability (%)?', why:'In-stock rate drives revenue recovery and NPS.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 93' },
      { id:'dq9b', text:'Target in-stock rate (%)?', why:'Gap drives revenue-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 98' },
      { id:'dq10', text:'Estimated annual lost sales from phantom inventory, out-of-stocks, or omnichannel errors ($)?', why:'Recovered lost sales is the primary revenue driver in retail.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 2200000' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year do out-of-stocks halt sales/fulfillment due to inaccurate records?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 200' },
      { id:'dq19', text:'Average hours of lost selling per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 2' },
      { id:'dq20', text:'Estimated lost margin per hour ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 1500' },
      { id:'dq21', text:'Annual expedited replenishment/transfer spend from stockouts ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 300000' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Total retail value of inventory across stores and DCs?', why:'Base for carrying cost and turns.', sync:'inventoryValue', type:'number', placeholder:'e.g. 18000000' },
      { id:'dq8', text:'Inventory turns per year?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 8' },
      { id:'dq13', text:'Annual spend on retail inventory, POS, and fulfilment systems?', why:'IT displacement opportunity.', sync:'itCost', type:'number', placeholder:'e.g. 420000' },
      { id:'dq16', text:'Total annual revenue across all channels?', why:'Revenue base for in-stock value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 95000000' },
      { id:'dq17', text:'Hurdle rate for retail investment (%)?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 12' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
  mining: [
    { section: 'Maintenance & Operations Labor', questions: [
      { id:'dq1', text:'How many maintenance technicians, storekeepers, procurement staff manage spare parts and materials?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 95' },
      { id:'dq2', text:'Percentage of maintenance staff time on non-productive activities - parts searches, requisitions, reconciliation?', why:'Benchmark: 20-30% non-productive in mining.', sync:'laborWastePct', type:'percent', placeholder:'e.g. 22' },
    ]},
    { section: 'Downtime & Expediting', questions: [
      { id:'dq18', text:'How many times per year is planned maintenance deferred due to parts unavailability at work-order execution?', why:'Downtime lever: events per year.', sync:'downtimeEventsYr', type:'number', placeholder:'e.g. 96' },
      { id:'dq19', text:'Average hours of resulting unplanned downtime per event?', why:'Downtime lever: hours per event.', sync:'downtimeHrsPerEvent', type:'number', placeholder:'e.g. 8' },
      { id:'dq20', text:'Cost per hour of lost production ($)?', why:'Downtime lever: cost per hour.', sync:'downtimeCostPerHr', type:'number', placeholder:'e.g. 40000' },
      { id:'dq21', text:'Annual emergency procurement spend from stockouts ($)?', why:'Expedite lever: annual expedite spend.', sync:'expediteSpendYr', type:'number', placeholder:'e.g. 1500000' },
    ]},
    { section: 'Spares Inventory & Write-offs', questions: [
      { id:'dq4', text:'Current critical spares inventory accuracy rate (%)?', why:'CI benchmark: 99.5%. Below 95% = downtime risk.', sync:'currentAccuracy', type:'percent', placeholder:'e.g. 89' },
      { id:'dq5', text:'Annual value of spares/materials written off - obsolescence, loss, unreconciled consumption?', why:'Direct write-off savings - typically 2-3% of spares.', sync:'annualWriteOff', type:'number', placeholder:'e.g. 1100000' },
      { id:'dq6a', text:'How many physical/cycle count days per year (people-days total)?', why:'Count-labor lever: person-days counting per year.', sync:'countDaysYr', type:'number', placeholder:'e.g. 12' },
      { id:'dq6b', text:'How many people are involved in those counts?', why:'Count-labor lever: people counting.', sync:'countPeople', type:'number', placeholder:'e.g. 6' },
    ]},
    { section: 'Production Continuity & OTIF', questions: [
      { id:'dq9', text:'Current plant/mine materials availability rate (%)?', why:'Availability improvement = recovered production.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 87' },
      { id:'dq9b', text:'Target availability rate (%)?', why:'Gap drives value-at-risk recovery.', sync:'otifTarget', type:'percent', placeholder:'e.g. 95' },
      { id:'dq11', text:'OEM warranty conditions requiring specific lot tracking or maintenance documentation?', why:'Context: OEM compliance documentation burden.', type:'text', note:true, placeholder:'e.g. Yes - major OEM equipment, monthly reports' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'Total value of spare parts and maintenance materials across stores and remote locations?', why:'Full inventory base for carrying cost and turns.', sync:'inventoryValue', type:'number', placeholder:'e.g. 42000000' },
      { id:'dq8', text:'Inventory turns per year on spares?', why:'Turns gap = working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 3' },
      { id:'dq13', text:'Annual cost of EAM, CMMS, and ERP inventory systems?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. 680000' },
      { id:'dq16', text:'Annual production revenue?', why:'Revenue base for value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. 420000000' },
      { id:'dq17', text:'Hurdle rate for capital/operational investments (%)?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 15' },
    ]},
    { section: 'Warehouse throughput & order accuracy', questions: [
      { id:'dqw1', text:'How many orders or order-lines do you ship per year?', why:'Throughput & accuracy levers: annual volume (entered once).', sync:'ordersPerYr', type:'number', placeholder:'e.g. 250000' },
      { id:'dqw2', text:'What is the fully-loaded labor cost to process one order/line today?', why:'Throughput lever: current cost per order.', sync:'costPerOrder', type:'number', placeholder:'e.g. 3.50' },
      { id:'dqw3', text:'What pick-rate or throughput improvement do you expect from mobile-first workflows?', why:'Throughput lever: pick-rate gain %.', sync:'pickRateGainPct', type:'percent', placeholder:'e.g. 20' },
      { id:'dqw4', text:'What is your current order error or mis-ship rate?', why:'Accuracy lever: error rate %.', sync:'orderErrorPct', type:'percent', placeholder:'e.g. 2' },
      { id:'dqw5', text:'What is the fully-loaded cost of one order error (return + re-ship + chargeback)?', why:'Accuracy lever: cost per error.', sync:'costPerError', type:'number', placeholder:'e.g. 120' },
    ]},
  ],
};

/* ─────────────────────────────────────────
   getDiscoveryQuestions(industry)
   Returns the section/question array for the given industry key,
   falling back to the generic 'default' set when the industry is
   unknown, blank, or has no bespoke questions defined.
   ───────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════
   QUALITATIVE DISCOVERY (v2.10) — context questions, NO calc impact.
   type:'context' questions carry no `sync`, so they can never affect ROI.
   `internal:true` questions are rep-only and hidden from the prospect link.
   ═══════════════════════════════════════════════════════════════════ */

/* Value-engineering strategic core — the "must-ask" set, shown for EVERY
   industry. Reduced to the 4 essential prospect-facing questions. */
const VE_CORE_QUESTIONS = {
  section: 'Value-engineering core (must-ask)',
  isVeCore: true,
  questions: [
    /* The 4 essential must-ask questions */
    { id:'ve2', text:'Why is solving this a priority now, versus 6\u201312 months ago?', why:'Identifies the compelling event driving urgency.', type:'context' },
    { id:'ve4', text:'Who in the organization feels this pain most acutely today?', why:'Begins the stakeholder and impact map.', type:'context' },
    { id:'ve9', text:'Who else is impacted across operations, finance, IT, and field teams?', why:'Maps the full set of stakeholders. Feeds the stakeholder map.', type:'context' },
    { id:'ve13', text:'How will you measure success post-implementation?', why:'Defines value-realization metrics for the business case.', type:'context' },
    /* Internal-only (rep assessment, not shown to prospects) */
    { id:'ve10', text:'Who could block or slow this decision, and why?', why:'Identifies detractors early (internal assessment).', type:'context', internal:true },
    { id:'ve11', text:'What is your decision process and typical timeline for an investment like this?', why:'Drives the mutual action plan timeline.', type:'context', internal:true },
    { id:'ve12', text:'What does the budget or funding picture look like for this initiative?', why:'Qualifies budget authority and availability (internal).', type:'context', internal:true },
    { id:'ve14', text:'Who needs to see the business case, and in what format?', why:'Shapes deliverables and the exec-readout plan.', type:'context', internal:true },
  ]
};

/* Industry-specific qualitative context — 3–5 per industry, no calc impact. */
const INDUSTRY_CONTEXT = {
  default: { section:'Industry context', questions:[
    { id:'ic_d1', text:'What operational event most recently exposed this problem?', why:'Grounds the case in a concrete recent event.', type:'context' },
    { id:'ic_d2', text:'What systems do you use today to manage inventory, and where do they fall short?', why:'Maps the current-state tech landscape.', type:'context' },
    { id:'ic_d3', text:'How is inventory data shared across sites, teams, or systems today?', why:'Reveals data-silo and integration pain.', type:'context' },
  ]},
  mfg: { section:'Manufacturing context', questions:[
    { id:'ic_m1', text:'Are you running lean / just-in-time, and how does material availability affect the line?', why:'Connects inventory to production continuity.', type:'context' },
    { id:'ic_m2', text:'Have you had line-down or slowdown events tied to material shortages recently?', why:'Concrete downtime narrative.', type:'context' },
    { id:'ic_m3', text:'What traceability or quality-audit requirements apply to your materials?', why:'Surfaces compliance drivers.', type:'context' },
    { id:'ic_m4', text:'How do you manage WIP and raw-material staging on the shop floor today?', why:'Shop-floor process color.', type:'context' },
  ]},
  telecom: { section:'Telecommunications context', questions:[
    { id:'ic_t1', text:'What is your field truck-roll volume, and how often is the wrong/missing part a cause?', why:'First-fix narrative.', type:'context' },
    { id:'ic_t2', text:'How is field technician turnover affecting inventory accuracy?', why:'Workforce dimension.', type:'context' },
    { id:'ic_t3', text:'How does your network build-out pace strain materials management?', why:'Growth-driven pressure.', type:'context' },
  ]},
  construction: { section:'Engineering & Construction context', questions:[
    { id:'ic_c1', text:'How many active job sites are you managing materials across right now?', why:'Multi-site complexity.', type:'context' },
    { id:'ic_c2', text:'How do material delays translate into schedule penalties or liquidated damages?', why:'Ties inventory to contractual risk.', type:'context' },
    { id:'ic_c3', text:'How is material allocated and tracked across concurrent projects?', why:'Project-allocation pain.', type:'context' },
    { id:'ic_c4', text:'What visibility do project managers have into on-site inventory today?', why:'Field-visibility gap.', type:'context' },
  ]},
  oil: { section:'Oil & Gas context', questions:[
    { id:'ic_o1', text:'How remote are your sites, and what connectivity constraints affect data capture?', why:'Offline/remote justification.', type:'context' },
    { id:'ic_o2', text:'How critical are MRO and safety-critical spares to avoiding downtime?', why:'Spare-parts criticality.', type:'context' },
    { id:'ic_o3', text:'What regulatory inspection or safety regime governs your operations?', why:'Compliance driver.', type:'context' },
  ]},
  mining: { section:'Minerals & Mining context', questions:[
    { id:'ic_mn1', text:'How remote are your sites, and how does that affect parts availability?', why:'Remote-operations color.', type:'context' },
    { id:'ic_mn2', text:'What is the cost of equipment downtime from a missing critical spare?', why:'Downtime-cost narrative.', type:'context' },
    { id:'ic_mn3', text:'What safety and environmental compliance requirements apply?', why:'Regulatory dimension.', type:'context' },
  ]},
  distribution: { section:'Wholesale Distribution context', questions:[
    { id:'ic_ds1', text:'How pronounced are your seasonal demand peaks, and how do they strain inventory?', why:'Seasonality pressure.', type:'context' },
    { id:'ic_ds2', text:'What customer SLA penalties apply for late or inaccurate shipments?', why:'Service-penalty exposure.', type:'context' },
    { id:'ic_ds3', text:'How complex is your channel or 3PL network today?', why:'Network-complexity color.', type:'context' },
  ]},
  food: { section:'Food & Beverage context', questions:[
    { id:'ic_f1', text:'How much lot, expiry, or FEFO pressure do you manage day to day?', why:'Perishability narrative.', type:'context' },
    { id:'ic_f2', text:'What is your recall exposure, and how quickly can you trace affected lots?', why:'Traceability/recall risk.', type:'context' },
    { id:'ic_f3', text:'How frequent are your FDA/USDA or customer audits?', why:'Compliance cadence.', type:'context' },
  ]},
  retail: { section:'Medical Devices / Life Sciences context', questions:[
    { id:'ic_r1', text:'What lot, serial, and expiry (UDI) traceability requirements apply to your inventory?', why:'Regulatory traceability is central to med-device inventory.', type:'context' },
    { id:'ic_r2', text:'How do you manage consignment and field/trunk stock at hospitals or clinician sites?', why:'Consignment and field inventory are major med-device pain points.', type:'context' },
    { id:'ic_r3', text:'What is your recall exposure, and how quickly can you trace and pull affected lots?', why:'Recall speed is a compliance and patient-safety driver.', type:'context' },
    { id:'ic_r4', text:'What FDA, ISO 13485, or other audit requirements govern your inventory records?', why:'Audit/compliance cadence for regulated devices.', type:'context' },
  ]},
};

/* ── Industry relevance for solution-specific question sections (Option B) ──
   These sections were authored into every industry's array; we show them
   only for industries where the value driver actually applies. Filtering
   here keeps the underlying data intact and the logic centralized.        */
const SECTION_INDUSTRY_RELEVANCE = {
  /* Warehouse throughput & order accuracy: DC/warehouse-heavy verticals. */
  'Warehouse throughput & order accuracy': ['distribution', 'mfg', 'retail', 'food', 'default'],
};

function isSectionRelevant(sectionLabel, industry) {
  const allow = SECTION_INDUSTRY_RELEVANCE[sectionLabel];
  if (!allow) return true;                 // not a gated section — always show
  return allow.includes(industry || 'default');
}

function getDiscoveryQuestions(industry) {
  const ind  = industry || 'default';
  const base = (DISC_QUESTIONS[ind]) ? DISC_QUESTIONS[ind] : (DISC_QUESTIONS.default || []);
  const ctx  = INDUSTRY_CONTEXT[ind] || INDUSTRY_CONTEXT.default;
  /* Drop solution-specific sections that don't apply to this industry. */
  const filteredBase = base.filter(section => isSectionRelevant(section.section, ind));
  /* VE core first (strategic framing), then the relevant quantitative
     industry set, then the qualitative industry-context questions. */
  return [VE_CORE_QUESTIONS, ...filteredBase, ctx];
}

/* Prospect-facing set excludes internal-only questions. */
function getProspectQuestions(industry) {
  return getDiscoveryQuestions(industry).map(section => ({
    ...section,
    questions: section.questions.filter(q => !q.internal)
  })).filter(section => section.questions.length > 0);
}

/* ─────────────────────────────────────────
   DISCOVERY STATE MANAGEMENT
   Stores discovery answers keyed by question ID
   Shared between rep and prospect via server session
   ───────────────────────────────────────── */
/* ─────────────────────────────────────────
   DISCOVERY STATE — DB-backed
   discoveryAnswers is an in-memory cache keyed by question id.
   discoverySessionToken is the active session token (from the DB).
   All writes go to /api/discovery/sessions/:token/answers immediately.
   ───────────────────────────────────────── */

let discoveryAnswers      = {};   // { dqN: value, dqN_by: 'rep'|'prospect' }
let discoverySessionToken = null; // current active token (from DB)
let discoveryDbSessionId  = null; // DB row id (UUID) for the session
let discoveryScenarioId   = null; // scenario this discovery session belongs to
let discoveryEngagement   = null; // { openCount, firstOpened, lastOpened } for the active session

/* Called when a scenario is loaded or a new one is started.
   Clears any in-memory discovery state from the PREVIOUS scenario so a
   prospect link can never leak across customers, then re-attaches to
   this scenario's own discovery session if one already exists.        */
async function resetDiscoveryForScenario(scenarioId) {
  /* Always clear first — prevents stale token/answers from bleeding over */
  discoverySessionToken = null;
  discoveryDbSessionId  = null;
  discoveryScenarioId   = scenarioId || null;
  discoveryAnswers      = {};
  discoveryEngagement   = null;

  /* Re-attach to this scenario's existing active session, if any */
  if (scenarioId) {
    try {
      const resp = await apiFetch('/api/discovery/sessions?scenarioId=' + encodeURIComponent(scenarioId));
      if (resp && resp.ok) {
        const sessions = await resp.json();
        if (sessions.length) {
          const s = sessions[0]; // most recent active session for this scenario
          discoverySessionToken = s.token;
          discoveryDbSessionId  = s.id;
          discoveryEngagement   = { openCount: s.open_count || 0, firstOpened: s.first_opened, lastOpened: s.last_opened };
          (s.answers || []).forEach(a => { discoveryAnswers[a.questionId] = a.answer; });
        }
      }
    } catch (e) { /* leave cleared — a fresh link can be generated */ }
  }
  if (typeof renderDiscoveryTab === 'function') renderDiscoveryTab();
}
let _answerSaveTimer      = null; // debounce timer for answer writes

/* Convert the flat { dqN, dqN_by } object to and from the DB row format */
function answersToCache(rows) {
  const out = {};
  (rows || []).forEach(r => {
    if (!r.questionId) return;
    out[r.questionId]           = r.answer    || '';
    out[r.questionId + '_by']   = r.enteredBy || 'rep';
  });
  return out;
}

/* Push a single answer to the DB — called after every rep keystroke (debounced) */
async function pushAnswerToDb(questionId, answer, enteredBy) {
  if (!discoverySessionToken) return;
  try {
    await apiFetch(
      '/api/discovery/sessions/' + encodeURIComponent(discoverySessionToken) + '/answers',
      {
        method: 'PUT',
        body: JSON.stringify({ questionId, answer, enteredBy: enteredBy || 'rep' })
      }
    );
  } catch(e) {
    console.error('pushAnswerToDb error:', e.message);
  }
}

/* Set an answer in the cache and push to DB (debounced 800ms) */
function setDiscoveryAnswer(id, value, enteredBy = 'rep') {
  discoveryAnswers[id]          = value;
  discoveryAnswers[id + '_by']  = value ? enteredBy : '';

  /* Sync to calculator field if this question maps to one */
  const industry = document.getElementById('industry')?.value || 'default';
  const qs = getDiscoveryQuestions(industry);
  const q  = qs.flatMap(s => s.questions).find(q => q.id === id);
  const num = parseFloat(String(value || '').replace(/[^0-9.]/g, ''));

  if (q?.sync && !isNaN(num) && num > 0) {
    const el = document.getElementById(q.sync);
    if (el) {
      el.value = num;
      if (typeof fieldStates !== 'undefined') fieldStates[q.sync] = enteredBy === 'prospect' ? 'confirmed_prospect' : 'estimated';
      if (typeof confirmedFields !== 'undefined' && enteredBy === 'prospect') confirmedFields.add(q.sync);
    }
  }

  if (typeof applyQuestionDrivenAssumptions === 'function') applyQuestionDrivenAssumptions(id, value, enteredBy);
  if (typeof recalc === 'function') recalc();
  if (typeof renderConfidence === 'function') renderConfidence();

  /* Debounced DB write — wait 800ms after last keystroke */
  clearTimeout(_answerSaveTimer);
  _answerSaveTimer = setTimeout(() => pushAnswerToDb(id, value, enteredBy), 800);
}

/* ─────────────────────────────────────────
   PROSPECT LINK MANAGEMENT — DB-backed
   ───────────────────────────────────────── */

/* Generate a new prospect link — creates a DB row via /api/discovery/sessions */
async function generateProspectLink() {
  const industry  = document.getElementById('industry')?.value   || 'default';
  const company   = (document.getElementById('companyName')?.value || '').trim();

  /* Hard gate: never generate a link without an active customer. */
  if (!company) {
    if (typeof showToast === 'function') showToast('Select a customer first — discovery links are tied to a customer.');
    if (typeof switchTab === 'function') switchTab('calc');
    return;
  }

  try {
    const resp = await apiFetch('/api/discovery/sessions', {
      method: 'POST',
      body: JSON.stringify({ industry, company, scenarioId: discoveryScenarioId || undefined })
    });
    if (!resp || !resp.ok) {
      const err = resp ? await resp.json() : {};
      if (typeof showToast === 'function') showToast('Failed to generate prospect link: ' + (err.error || 'Unknown error'));
      return;
    }
    const data = await resp.json();
    discoverySessionToken = data.token;
    discoveryDbSessionId  = data.sessionId;
    renderDiscoveryTab();
    if (typeof showToast === 'function') showToast('Prospect link generated!');
  } catch(e) {
    console.error('generateProspectLink error:', e.message);
    if (typeof showToast === 'function') showToast('Could not generate prospect link — check your connection.');
  }
}

/* Rotate the token — invalidates old link, issues a new one */
async function rotateProspectToken() {
  if (!discoverySessionToken) return;
  try {
    const resp = await apiFetch(
      '/api/discovery/sessions/' + encodeURIComponent(discoverySessionToken) + '/rotate',
      { method: 'PUT' }
    );
    if (!resp || !resp.ok) {
      if (typeof showToast === 'function') showToast('Could not rotate link.');
      return;
    }
    const data = await resp.json();
    discoverySessionToken = data.token;
    renderDiscoveryTab();
    if (typeof showToast === 'function') showToast('Link rotated — old link is now invalid.');
  } catch(e) {
    console.error('rotateProspectToken error:', e.message);
    if (typeof showToast === 'function') showToast('Could not rotate link — check your connection.');
  }
}

/* Revoke the link — prospect can no longer access it */
async function revokeProspectLink() {
  if (!confirm('Revoke prospect access? Their link will stop working immediately.')) return;
  if (!discoverySessionToken) return;
  try {
    await apiFetch(
      '/api/discovery/sessions/' + encodeURIComponent(discoverySessionToken),
      { method: 'DELETE' }
    );
  } catch(e) {
    console.error('revokeProspectLink error:', e.message);
  }
  discoverySessionToken = null;
  discoveryDbSessionId  = null;
  renderDiscoveryTab();
  if (typeof showToast === 'function') showToast('Prospect link revoked.');
}

function prospectUrl() {
  return window.location.origin + '/prospect.html?token=' + discoverySessionToken;
}

function updateProspectLinkDisplay() {
  const el = document.getElementById('discProspectUrl');
  if (el && discoverySessionToken) el.textContent = prospectUrl();
}

function copyProspectLink() {
  navigator.clipboard.writeText(prospectUrl()).then(() => {
    if (typeof showToast === 'function') showToast('Prospect link copied!');
  });
}

/* Pull latest answers from the DB into the local cache and re-render */
async function importProspectAnswers() {
  if (!discoverySessionToken) {
    if (typeof showToast === 'function') showToast('No active prospect link — generate one first.');
    return;
  }
  try {
    const resp = await apiFetch(
      '/api/discovery/sessions/' + encodeURIComponent(discoverySessionToken)
    );
    if (!resp || !resp.ok) throw new Error('Session not found.');
    const data = await resp.json();

    const fresh = answersToCache(data.answers || []);
    /* Merge — prospect entries take precedence over blank rep entries */
    Object.entries(fresh).forEach(([k, v]) => {
      if (!k.endsWith('_by')) {
        const existingBy = discoveryAnswers[k + '_by'];
        /* Only overwrite if the incoming is non-empty, or rep hasn't entered anything */
        if (v || !discoveryAnswers[k]) {
          discoveryAnswers[k]        = v;
          discoveryAnswers[k + '_by'] = fresh[k + '_by'] || existingBy || 'prospect';
        }
      }
    });

    if (typeof renderDiscoveryTab === 'function') renderDiscoveryTab();
    if (typeof renderCalcIndustryQuestions === 'function') renderCalcIndustryQuestions();
    if (typeof showToast === 'function') showToast('Prospect answers refreshed from the database.');
  } catch(e) {
    console.error('importProspectAnswers error:', e.message);
    if (typeof showToast === 'function') showToast(e.message || 'Could not import prospect answers.');
  }
}

/* ─────────────────────────────────────────
   LOAD DISCOVERY SESSION ON STARTUP
   Restores the active session for the current user
   from GET /api/discovery/sessions.
   Called from the inline init script in index.html.
   ───────────────────────────────────────── */
async function loadDiscoverySession() {
  try {
    const resp = await apiFetch('/api/discovery/sessions');
    if (!resp || !resp.ok) return;
    const sessions = await resp.json();
    if (!sessions.length) return;

    /* Use the most recently updated active session */
    const session = sessions[0];
    discoverySessionToken = session.token;
    discoveryDbSessionId  = session.id;

    /* Populate answer cache from DB answers */
    discoveryAnswers = answersToCache(session.answers || []);

    /* Trigger any calc field syncing for restored answers */
    Object.entries(discoveryAnswers).forEach(([k, v]) => {
      if (!k.endsWith('_by') && v) {
        const enteredBy = discoveryAnswers[k + '_by'] || 'rep';
        const industry  = document.getElementById('industry')?.value || 'default';
        const qs = getDiscoveryQuestions(industry);
        const q  = qs.flatMap(s => s.questions).find(q => q.id === k);
        if (q?.sync) {
          const num = parseFloat(String(v).replace(/[^0-9.]/g, ''));
          const el  = document.getElementById(q.sync);
          if (el && !isNaN(num) && num > 0 && !el.value) {
            el.value = num;
            if (typeof fieldStates !== 'undefined') fieldStates[q.sync] = enteredBy === 'prospect' ? 'confirmed_prospect' : 'estimated';
          }
        }
      }
    });

    if (typeof renderCalcIndustryQuestions === 'function') renderCalcIndustryQuestions();

  } catch(e) {
    console.error('loadDiscoverySession error:', e.message);
  }
}

function generateToken(len = 32) {
  /* Client-side token generation — only used as a fallback display.
     Real tokens are generated server-side with crypto.randomBytes.    */
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let t = '';
  for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

/* ─────────────────────────────────────────
   RENDER DISCOVERY TAB (rep view)
   ───────────────────────────────────────── */
function renderDiscoveryTab() {
  const el = document.getElementById('tab-disc');
  if (!el) return;
  const industry = document.getElementById('industry')?.value || 'default';
  const qs  = getDiscoveryQuestions(industry);
  const ind = (typeof IND !== 'undefined' && IND[industry]) ? IND[industry].label : 'General';

  /* Hard gate: a prospect link must belong to a customer, so a rep can never
     generate or copy a link without an active customer selected — this
     prevents sending one customer's link to another by mistake. */
  const activeCompany = (document.getElementById('companyName')?.value || '').trim();
  const activeScenario = (document.getElementById('scenarioName')?.value || '').trim();

  let prospectLinkHtml;
  if (!activeCompany) {
    prospectLinkHtml = `<div class="disc-link-gate">
        <span class="disc-link-gate-icon">🔒</span>
        <div>
          <div class="disc-link-gate-title">Select a customer to enable the prospect link</div>
          <div class="disc-link-gate-sub">Discovery links are tied to a customer so they're never sent to the wrong prospect. Choose or create a customer on the Calculator tab first.</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="switchTab('calc')">Go to Calculator</button>
      </div>`;
  } else if (discoverySessionToken) {
    prospectLinkHtml = `<div class="disc-prospect-link">
        <div class="disc-prospect-link-label">🔗 Prospect link active — <strong>${activeCompany}${activeScenario ? ' · ' + activeScenario : ''}</strong></div>
        <div class="disc-prospect-link-url" id="discProspectUrl"></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn btn-cta btn-sm" onclick="copyProspectLink()">Copy link</button>
          <button class="btn btn-ghost btn-sm" onclick="importProspectAnswers()">↻ Check submitted answers</button>
          <button class="btn btn-ghost btn-sm" onclick="rotateProspectToken()">🔄 Rotate link</button>
          <button class="btn btn-danger btn-sm" onclick="revokeProspectLink()">Revoke</button>
        </div>
        <div class="disc-prospect-note">This link belongs to <strong>${activeCompany}</strong>. Prospect answers are saved in real time. Click "Check submitted answers" to pull the latest.</div>
        ${discoveryEngagement ? `<div class="disc-engagement">
          ${discoveryEngagement.openCount > 0
            ? `👁 Opened <strong>${discoveryEngagement.openCount}</strong> time${discoveryEngagement.openCount!==1?'s':''}${discoveryEngagement.lastOpened ? ' · last ' + new Date(discoveryEngagement.lastOpened).toLocaleString() : ''}`
            : '⏳ Not opened by the prospect yet'}
        </div>` : ''}
      </div>`;
  } else {
    prospectLinkHtml = `<div style="text-align:right;">
        <div class="disc-link-customer-tag">For customer: <strong>${activeCompany}</strong></div>
        <button class="btn btn-cta btn-sm" onclick="generateProspectLink()" style="margin-left:auto;">🔗 Generate prospect link</button>
      </div>`;
  }

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Discovery guide</div>
        <div class="page-subtitle">Industry-specific questions for ${ind}. Share the prospect link for collaborative data gathering.</div>
      </div>
      ${prospectLinkHtml}
    </div>
    <div class="disc-answer-legend">
      <span class="disc-legend-rep">■ Rep entered</span>
      <span class="disc-legend-prospect">■ Prospect entered</span>
      <span class="disc-legend-synced">■ Synced to calculator</span>
    </div>
    <div class="two-col">
      ${qs.map((section) => `
        <div class="disc-section">
          <div class="disc-section-head"><h3>${section.section}</h3></div>
          ${section.questions.map(q => renderDiscQuestion(q)).join('')}
        </div>`).join('')}
    </div>
    <div class="btn-row">
      <button class="btn btn-cta" onclick="applyDiscoveryToCalc()">Apply all answers to calculator →</button>
      <button class="btn btn-ghost" onclick="downloadImpactMap()">📄 Download impact map (PDF)</button>
      <button class="btn btn-ghost" onclick="clearDiscoveryAnswers()">Clear all answers</button>
    </div>`;

  if (discoverySessionToken) updateProspectLinkDisplay();
}

function renderDiscQuestion(q) {
  const answer    = discoveryAnswers[q.id] || '';
  const enteredBy = discoveryAnswers[q.id + '_by'] || '';
  const isSynced  = q.sync && answer;
  const byClass   = enteredBy === 'prospect' ? 'disc-answer-prospect' : enteredBy === 'rep' ? 'disc-answer-rep' : '';
  const syncBadge = isSynced ? `<span class="disc-sync-badge">→ ${q.sync}</span>` : '';

  /* Context (qualitative) questions: free-text, no calc impact, tagged. */
  if (q.type === 'context') {
    const tags = `<span class="disc-context-tag">Context</span>` +
      (q.internal ? `<span class="disc-internal-tag" title="Internal — not shown to the prospect">Internal</span>` : '');
    return `
      <div class="disc-q disc-q-context ${answer ? 'disc-q-answered' : ''}">
        <div class="q-text">${q.text} ${tags}</div>
        <div class="q-why">${q.why}</div>
        <div class="disc-input-wrap">
          <textarea id="${q.id}" class="disc-textarea ${byClass}" rows="2"
            placeholder="${q.placeholder || 'Capture the answer…'}"
            oninput="handleDiscInput('${q.id}', this.value, 'rep')">${answer}</textarea>
        </div>
      </div>`;
  }

  return `
    <div class="disc-q ${answer ? 'disc-q-answered' : ''}">
      <div class="q-text">${q.text}</div>
      <div class="q-why">${q.why} ${syncBadge}</div>
      <div class="disc-input-wrap">
        <input type="text"
          id="${q.id}"
          class="${byClass}"
          value="${answer}"
          placeholder="${q.placeholder}"
          oninput="handleDiscInput('${q.id}', this.value, 'rep')"/>
        ${answer && enteredBy ? `<span class="disc-by-badge disc-by-${enteredBy}">${enteredBy}</span>` : ''}
      </div>
    </div>`;
}

/* Rep types an answer — update cache, push to DB, sync to calc */
function handleDiscInput(id, value, enteredBy) {
  /* setDiscoveryAnswer handles DB write (debounced), calc sync, and confidence */
  setDiscoveryAnswer(id, value, enteredBy || 'rep');
  if (typeof autoFlagConfidence === 'function') autoFlagConfidence();
}

function applyDiscoveryToCalc() {
  const industry = document.getElementById('industry')?.value || 'default';
  const qs = getDiscoveryQuestions(industry);
  let applied = 0;
  qs.flatMap(s => s.questions).forEach(q => {
    const answer = discoveryAnswers[q.id];
    if (answer && q.sync) {
      let num = parseFloat(String(answer).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        /* Convert hours/week to % of a 40-hour week for labor-waste sync */
        if (q.syncConv === 'hoursPerWeek') num = Math.min(100, Math.round((num / 40) * 100));
        const el = document.getElementById(q.sync);
        if (el) { el.value = num; applied++; }
      }
    }
  });
  if (typeof recalc === 'function') recalc();
  if (typeof showToast === 'function') showToast(`Applied ${applied} answers to calculator.`);
  if (typeof switchTab === 'function') switchTab('calc');
}

function clearDiscoveryAnswers() {
  if (!confirm('Clear all discovery answers? This will also clear them from the database for the active prospect session.')) return;
  discoveryAnswers = {};
  renderDiscoveryTab();
}
if (typeof escapeHtml !== 'function') {
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   downloadImpactMap() — generates a CI-branded PDF of the
   Discovery → Calculator impact map (all industries), built live from
   DISC_QUESTIONS so it always matches the app. Uses a print window →
   the browser's "Save as PDF".
   ═══════════════════════════════════════════════════════════════════ */
const IMPACT_LABELS = {
  userCount:          ['Labor savings', 'users × labor rate × recovery% → laborSav'],
  laborWastePct:      ['Labor savings', 'scales laborSav by measured productivity waste %'],
  currentAccuracy:    ['Shrink & carrying (suggested)', 'accuracy gap suggests shrink/carrying recovery %'],
  annualWriteOff:     ['Write-off / shrink savings', 'write-off $ × shrink-recovery% → shrinkSav'],
  inventoryValue:     ['Carrying cost + turns', 'inventory × carrying% and turns gap → carrySav + turnsSav'],
  invTurnsCurrent:    ['Working capital (turns)', 'inventory × (1 − current/benchmark) × carry rate → turnsSav'],
  otifBaseline:       ['OTIF revenue-at-risk', 'revenue × (target − baseline) × OTIF-recovery% → otifSav'],
  otifTarget:         ['OTIF revenue-at-risk', 'sets the OTIF gap ceiling → otifSav'],
  itCost:             ['IT displacement', 'IT cost × IT-recovery% → itSav'],
  revenue:            ['Revenue base', 'multiplier for OTIF value-at-risk'],
  discRate:           ['NPV', 'discount rate for NPV 3/5-year'],
  downtimeEventsYr:   ['Production downtime (NEW)', 'events × hrs × $/hr × recovery% → downtimeSav'],
  downtimeHrsPerEvent:['Production downtime (NEW)', 'component of downtimeSav'],
  downtimeCostPerHr:  ['Production downtime (NEW)', 'component of downtimeSav'],
  expediteSpendYr:    ['Expedite premium (NEW)', 'expedite spend × recovery% → expediteSav'],
  countDaysYr:        ['Count labor (NEW)', 'days × people × daily labor × recovery% → countSav'],
  countPeople:        ['Count labor (NEW)', 'component of countSav']
};
const IMPACT_IND_LABELS = {
  default:'Default / Generic', telecom:'Telecommunications', mfg:'Manufacturing',
  construction:'Engineering & Construction', oil:'Oil & Gas', distribution:'Wholesale Distribution',
  food:'Food & Beverage', retail:'Medical Devices / Life Sciences', mining:'Minerals & Mining'
};

function downloadImpactMap() {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let sections = '';
  Object.keys(IMPACT_IND_LABELS).forEach(ind => {
    const qs = (typeof DISC_QUESTIONS !== 'undefined' && DISC_QUESTIONS[ind]) ? DISC_QUESTIONS[ind] : null;
    if (!qs) return;
    let rows = '';
    qs.flatMap(s => s.questions).forEach(q => {
      let field, impact;
      if (q.note) { field = '— (qualitative note)'; impact = 'Context only — not calculated'; }
      else if (q.sync) {
        field = q.sync + (q.syncConv === 'hoursPerWeek' ? ' (hrs/wk → %)' : '');
        const m = IMPACT_LABELS[q.sync] || ['—','—'];
        impact = '<strong>' + m[0] + ':</strong> ' + m[1];
      } else { field = '—'; impact = 'Diagnostic — informs the conversation'; }
      rows += `<tr><td>${esc(q.text)}</td><td>${esc(q.type)}</td><td><code>${esc(field)}</code></td><td>${impact}</td></tr>`;
    });
    sections += `<h2>${esc(IMPACT_IND_LABELS[ind])}</h2>
      <table><thead><tr><th style="width:42%">Question</th><th>Type</th><th>Calculator field</th><th>ROI impact</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  });

  const leverRef = `<h2>ROI levers reference</h2>
    <p><strong>Original 6 levers:</strong> laborSav, shrinkSav, carrySav, turnsSav, otifSav, itSav.
    <strong>New in v2.5:</strong> downtimeSav (events × hrs × $/hr × recovery%),
    expediteSav (spend × recovery%), countSav (days × people × daily labor × recovery%).</p>
    <p style="color:#64748B;font-size:11px;">Scenarios saved before v2.5 compute an unchanged annual benefit — new levers contribute $0 until the new fields are entered.</p>`;

  const w = window.open('', '_blank');
  if (!w) { if (typeof showToast==='function') showToast('Pop-up blocked — allow pop-ups to download.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Discovery → Calculator Impact Map</title>
    <style>
      @page { margin: 0.5in; }
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:'Helvetica Neue',Arial,sans-serif; color:#1E2931; padding:0; }
      .head { display:flex; align-items:center; gap:14px; border-bottom:3px solid #00A9CC; padding-bottom:12px; margin-bottom:16px; }
      .head img { height:40px; } .head .t { font-size:12px; color:#64748B; }
      h1 { font-size:22px; margin-bottom:4px; }
      .intro { font-size:12px; color:#64748B; margin-bottom:16px; }
      h2 { font-size:14px; color:#00A9CC; margin:20px 0 6px; padding-bottom:3px; border-bottom:1.5px solid #E2E8F0; }
      table { width:100%; border-collapse:collapse; margin-bottom:12px; }
      th { background:#1E2931; color:#fff; font-size:10px; text-align:left; padding:6px 8px; }
      td { font-size:11px; padding:5px 8px; border-bottom:1px solid #F1F5F9; vertical-align:top; }
      tr:nth-child(even) td { background:#F5F8FA; }
      code { font-size:10px; background:#F1F5F9; padding:1px 4px; border-radius:3px; }
      .foot { margin-top:20px; padding-top:10px; border-top:1px solid #E2E8F0; font-size:10px; color:#6B7A8D; text-align:center; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    <div class="head"><img src="${window.location.origin}/ci-logo.png" onerror="this.style.display='none'"/><div class="t">Discovery → Calculator Impact Map</div></div>
    <h1>Discovery Guide → Calculator Impact Map</h1>
    <div class="intro">Every quantifiable discovery question and the ROI line it drives. Version 2.5.</div>
    ${sections}${leverRef}
    <div class="foot">Generated ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · Cloud Inventory ROI Business Case Builder</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
    </body></html>`);
  w.document.close();
}
