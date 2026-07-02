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

  /* ── DEFAULT / GENERIC ── */
  default: [
    { section: 'Labor & Productivity', questions: [
      { id:'dq1', text:'How many people directly touch inventory as part of their daily role — warehouse staff, field technicians, and office-based inventory controllers?', why:'Drives user count and total labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 45' },
      { id:'dq2', text:'What percentage of a typical worker\'s day is consumed by manual counts, paper processes, spreadsheet updates, or reconciliation rework?', why:'Identifies productivity gain potential. Benchmark: 20–35%.', type:'percent', placeholder:'e.g. 25%' },
      { id:'dq3', text:'How many hours per week does the team spend investigating and resolving inventory discrepancies?', why:'Quantifies hidden labor cost of inaccuracy.', type:'number', placeholder:'e.g. 20 hours/week' },
    ]},
    { section: 'Inventory Accuracy & Write-offs', questions: [
      { id:'dq4', text:'What is your current inventory accuracy rate, and how do you measure it today?', why:'CI benchmark: 99.5% accuracy. The gap drives shrinkage opportunity.', type:'percent', placeholder:'e.g. 92%' },
      { id:'dq5', text:'What is the total dollar value of inventory you write off annually due to loss, damage, expiry, or unaccounted shrinkage?', why:'Direct input for write-off savings calculation.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $250,000' },
      { id:'dq6', text:'How often do you conduct full physical inventory counts, and how many days do they take to complete?', why:'Cycle count improvement = direct labor and downtime savings.', type:'text', placeholder:'e.g. Twice a year, 3 days each' },
    ]},
    { section: 'Inventory Value & Carrying Costs', questions: [
      { id:'dq7', text:'What is the total value of inventory on hand at any given point in time?', why:'Primary input for carrying cost and turns calculation.', sync:'inventoryValue', type:'number', placeholder:'e.g. $8,000,000' },
      { id:'dq8', text:'Do you carry excess safety stock to compensate for inaccurate counts or unreliable data? If so, what percentage is buffer vs. operational need?', why:'Excess buffer = avoidable carrying cost.', type:'text', placeholder:'e.g. ~20% buffer above operational need' },
    ]},
    { section: 'Order Accuracy & OTIF', questions: [
      { id:'dq9', text:'What is your current on-time, in-full (OTIF) or order accuracy rate?', why:'Baseline for improvement. Industry avg improves 8–15% with CI.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 93%' },
      { id:'dq10', text:'Do customers impose financial penalties or chargebacks for late or incomplete deliveries? What was the total last year?', why:'Hard-dollar OTIF cost — adds directly to the ROI model.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $120,000' },
      { id:'dq11', text:'What percentage of orders require re-picking, re-packing, or expedited shipping due to inventory errors?', why:'Quantifies true cost of fulfillment inaccuracy.', type:'percent', placeholder:'e.g. 8%' },
    ]},
    { section: 'Systems & Technology', questions: [
      { id:'dq12', text:'What systems do you currently use to manage inventory — ERP module, WMS, spreadsheets, or paper?', why:'Identifies displacement opportunity and integration complexity.', type:'text', placeholder:'e.g. SAP ERP native module + Excel for field' },
      { id:'dq13', text:'What do you pay annually for inventory system licenses, maintenance, and IT support?', why:'Direct IT cost displacement input.', sync:'itCost', type:'number', placeholder:'e.g. $180,000/year' },
      { id:'dq14', text:'What mobile devices or scanners does your team currently use for inventory? What is the replacement cycle?', why:'Helps size hardware investment for the business case.', type:'text', placeholder:'e.g. 20 RF guns, 5+ years old' },
    ]},
    { section: 'Revenue & Financial Baseline', questions: [
      { id:'dq16', text:'What is the organisation\'s annual revenue?', why:'Used for OTIF value-at-risk calculation.', sync:'revenue', type:'number', placeholder:'e.g. $45,000,000' },
      { id:'dq17', text:'What hurdle rate or cost of capital does your finance team use when evaluating capital investments?', why:'NPV discount rate. Typically 8–15%.', sync:'discRate', type:'percent', placeholder:'e.g. 12%' },
    ]},
  ],

  /* ── TELECOMMUNICATIONS ── */
  telecom: [
    { section: 'Field Operations & Labor', questions: [
      { id:'dq1', text:'How many field technicians, warehouse staff, and network operations personnel handle inventory or spare parts as part of their role?', why:'Drives user count and labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 85' },
      { id:'dq2', text:'What percentage of a field technician\'s time is spent on non-productive activities — driving back for wrong parts, manual parts ordering, or paperwork?', why:'High in telecom — benchmark 25–40% non-productive time.', type:'percent', placeholder:'e.g. 30%' },
      { id:'dq3', text:'How many truck rolls are attributed to incorrect parts dispatched or unavailable spares at the point of service?', why:'Each unnecessary truck roll = $200–$500 fully loaded cost.', type:'number', placeholder:'e.g. 15 per week' },
    ]},
    { section: 'Parts Inventory & Write-offs', questions: [
      { id:'dq4', text:'What is your current parts inventory accuracy rate across warehouse and field vehicle stock?', why:'CI benchmark: 99.5%. Gap drives shrinkage and truck roll exposure.', type:'percent', placeholder:'e.g. 88%' },
      { id:'dq5', text:'What is the annual dollar value of parts written off due to loss, theft, or unreconciled field consumption?', why:'Direct write-off input — typically 2–4% of telecom parts inventory.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $400,000' },
      { id:'dq6', text:'Do technicians carry vehicle stock? How often is that stock physically audited, and how long does it take?', why:'Vehicle stock is the hardest to control — largest write-off source.', type:'text', placeholder:'e.g. 45 vehicles, audited quarterly, 2 days each' },
    ]},
    { section: 'Network & SLA Performance', questions: [
      { id:'dq9', text:'What is your mean time to repair (MTTR) for network incidents, and how often are parts availability the cause of delay?', why:'Parts stockouts directly extend MTTR and drive SLA penalties.', type:'text', placeholder:'e.g. 4hr MTTR target, parts cause ~25% of delays' },
      { id:'dq10', text:'What SLA penalties or customer credit costs did you incur last year due to delayed restoration caused by parts issues?', why:'Direct financial impact — maps to OTIF/SLA savings.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $650,000' },
      { id:'dq11', text:'What is your current on-time delivery rate for customer premises equipment (CPE) installations?', why:'CPE accuracy drives NPS and churn metrics.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 87%' },
    ]},
    { section: 'Systems & Infrastructure', questions: [
      { id:'dq12', text:'What platforms currently manage your field parts inventory — OSS/BSS system, ERP, or manual vehicle logs?', why:'Identifies integration scope and displacement cost.', type:'text', placeholder:'e.g. Oracle OSS + manual spreadsheets for vehicle stock' },
      { id:'dq13', text:'What is the annual cost of your current inventory and field service management systems, including licenses and support?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. $320,000' },
      { id:'dq7', text:'What is the total value of spare parts inventory held across central warehouse, regional depots, and field vehicles?', why:'Full inventory base for carrying cost calculation.', sync:'inventoryValue', type:'number', placeholder:'e.g. $12,000,000' },
    ]},
    { section: 'Financial Baseline', questions: [
      { id:'dq16', text:'What is the organisation\'s annual service revenue?', why:'Revenue base for SLA/OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $380,000,000' },
      { id:'dq17', text:'What hurdle rate does your finance team apply to infrastructure and operational investments?', why:'NPV discount rate for the business case.', sync:'discRate', type:'percent', placeholder:'e.g. 10%' },
    ]},
  ],

  /* ── MANUFACTURING ── */
  mfg: [
    { section: 'Production & Labor', questions: [
      { id:'dq1', text:'How many personnel are involved in inventory-related activities — receiving, warehouse, production stores, and shipping?', why:'Drives user count and labor savings.', sync:'userCount', type:'number', placeholder:'e.g. 60' },
      { id:'dq2', text:'How frequently does production stop or slow due to parts or material stockouts caused by inaccurate inventory records?', why:'Production downtime cost is the highest-impact metric in manufacturing.', type:'text', placeholder:'e.g. 2–3 times per week, avg 45 min per event' },
      { id:'dq3', text:'What percentage of production staff time is spent on inventory-related activities not directly linked to production — counting, searching, reconciling?', why:'Benchmark: 15–30% of time in manual inventory activities.', type:'percent', placeholder:'e.g. 20%' },
    ]},
    { section: 'Inventory Accuracy & Write-offs', questions: [
      { id:'dq4', text:'What is your current raw material and WIP inventory accuracy rate? How do you measure it?', why:'Accuracy below 98% significantly impacts production planning reliability.', type:'percent', placeholder:'e.g. 94%' },
      { id:'dq5', text:'What is the annual value of inventory written off — raw material scrap, component losses, obsolescence, or unreconciled variances?', why:'Direct write-off savings input.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $320,000' },
      { id:'dq6', text:'How often is a full physical count required by audit, and how many production days are lost to complete it?', why:'Lost production days during counts = direct cost opportunity.', type:'text', placeholder:'e.g. Annual count, 2 production days lost' },
    ]},
    { section: 'Supply Chain & OTIF', questions: [
      { id:'dq9', text:'What is your current customer OTIF or on-time delivery rate? What is your target?', why:'OTIF gap is a primary value driver in manufacturing.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 91% actual, 97% target' },
      { id:'dq10', text:'What financial penalties, chargebacks, or expediting costs did you incur last year due to late or incomplete shipments?', why:'Hard-dollar OTIF cost.', type:'number', placeholder:'e.g. $280,000' },
      { id:'dq11', text:'How many times per month do you expedite inbound materials due to stockouts caused by inventory record errors?', why:'Expediting premium typically 20–40% above standard purchase price.', type:'number', placeholder:'e.g. 8 times/month' },
    ]},
    { section: 'Inventory & Working Capital', questions: [
      { id:'dq7', text:'What is the total value of raw materials, WIP, and finished goods inventory on hand?', why:'Full inventory base for carrying cost and turns analysis.', sync:'inventoryValue', type:'number', placeholder:'e.g. $14,000,000' },
      { id:'dq8', text:'How many inventory turns does your business achieve annually? What is your industry target?', why:'Turns gap is a direct working capital opportunity.', sync:'invTurnsCurrent', type:'number', placeholder:'e.g. 4 turns/year' },
    ]},
    { section: 'Systems & Financial Baseline', questions: [
      { id:'dq13', text:'What is the annual cost of your ERP inventory module and any WMS or warehouse systems?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. $240,000' },
      { id:'dq16', text:'What is the organisation\'s annual revenue?', why:'Revenue base for OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $75,000,000' },
      { id:'dq17', text:'What discount rate or hurdle rate does your finance team use?', why:'NPV calculation input.', sync:'discRate', type:'percent', placeholder:'e.g. 12%' },
    ]},
  ],

  /* ── ENGINEERING & CONSTRUCTION ── */
  construction: [
    { section: 'Site & Labor Management', questions: [
      { id:'dq1', text:'How many people across your sites, yard, and office directly manage or transact inventory — materials, tools, equipment, and consumables?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 70' },
      { id:'dq2', text:'How much time per week do site supervisors or foremen spend searching for materials, investigating shortages, or processing manual inventory paperwork?', why:'Benchmark: 5–10 hours/week per supervisor in construction.', type:'text', placeholder:'e.g. ~6 hours per site supervisor per week' },
      { id:'dq3', text:'How many active job sites or locations are you managing inventory across simultaneously?', why:'Multi-site complexity multiplies the value of real-time visibility.', type:'number', placeholder:'e.g. 12 active sites' },
    ]},
    { section: 'Material Loss & Write-offs', questions: [
      { id:'dq4', text:'What percentage of materials ordered for a project are typically unaccounted for at project closeout — loss, theft, or waste beyond plan?', why:'Construction shrinkage benchmark: 2–5% of material value.', type:'percent', placeholder:'e.g. 3%' },
      { id:'dq5', text:'What is the annual dollar value of tools, equipment, and materials written off due to loss, theft, or unaccounted consumption?', why:'Direct write-off savings input — typically 3% of inventory value.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $450,000' },
      { id:'dq6', text:'How frequently are emergency material purchases made to compensate for items that should have been on-site but were lost or not tracked?', why:'Emergency purchases carry 15–35% premium over planned purchases.', type:'text', placeholder:'e.g. 2–3 times per week across all sites' },
    ]},
    { section: 'Project Delivery & Compliance', questions: [
      { id:'dq9', text:'What percentage of your projects deliver all contracted materials on time and complete to the client?', why:'Material shortfall is a primary cause of project delay claims.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 82%' },
      { id:'dq10', text:'What delay claims, liquidated damages, or project overruns were attributed to material or equipment availability issues last year?', why:'Hard-dollar project delivery cost.', type:'number', placeholder:'e.g. $1,200,000' },
      { id:'dq11', text:'Do any of your projects require material traceability for compliance (AS/NZS, ISO, client audits)? What is the current documentation burden?', why:'Compliance traceability is a growing mandate in construction.', type:'text', placeholder:'e.g. Yes — monthly audit reports take 3 days each' },
    ]},
    { section: 'Inventory & Assets', questions: [
      { id:'dq7', text:'What is the total value of materials, tools, and equipment held across your yard and active sites?', why:'Base for carrying cost and turns analysis.', sync:'inventoryValue', type:'number', placeholder:'e.g. $22,000,000' },
      { id:'dq13', text:'What do you currently spend on inventory and asset management systems — ERP, spreadsheets, or tracking software?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. $90,000' },
      { id:'dq16', text:'What is the organisation\'s annual revenue or contract value?', why:'Revenue base for OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $120,000,000' },
      { id:'dq17', text:'What cost of capital or hurdle rate does your finance team use?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 12%' },
    ]},
  ],

  /* ── OIL & GAS ── */
  oil: [
    { section: 'Field Operations & Maintenance Labor', questions: [
      { id:'dq1', text:'How many personnel are involved in maintenance, materials management, and inventory operations across your sites — onshore or offshore?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 120' },
      { id:'dq2', text:'What percentage of maintenance technician time is spent on non-wrench activities — parts searching, requisitioning, and manual inventory reconciliation?', why:'Industry benchmark: 20–35% non-productive maintenance time.', type:'percent', placeholder:'e.g. 25%' },
      { id:'dq3', text:'How many unplanned maintenance events per month are extended or worsened by parts unavailability or inventory inaccuracy?', why:'Each deferred maintenance event in O&G can cost $50K–$500K.', type:'number', placeholder:'e.g. 4 per month' },
    ]},
    { section: 'Parts Inventory & Write-offs', questions: [
      { id:'dq4', text:'What is the current inventory accuracy rate for critical spares and maintenance materials?', why:'CI benchmark: 99.5%. Below 95% = significant unplanned downtime risk.', type:'percent', placeholder:'e.g. 91%' },
      { id:'dq5', text:'What is the annual value of parts and materials written off — dead stock, unreconciled consumption, or obsolete inventory?', why:'Direct write-off savings — typically 2–4% of spares inventory value.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $800,000' },
      { id:'dq6', text:'How much excess buffer stock is carried to compensate for unreliable inventory data? What is the estimated dollar value of that buffer?', why:'Excess buffer = trapped working capital with direct carrying cost.', type:'number', placeholder:'e.g. $3,500,000 in excess stock' },
    ]},
    { section: 'Regulatory Compliance & Traceability', questions: [
      { id:'dq9', text:'Do your operations require material traceability to specific well, asset, or regulatory certificate? What is the current compliance documentation burden?', why:'Traceability compliance failure = licence risk and audit cost.', type:'text', placeholder:'e.g. Yes — NOPSEMA compliance, ~8 days/quarter on documentation' },
      { id:'dq10', text:'What was the cost of compliance audit preparation or traceability-related rework last year?', why:'Direct compliance cost that CI can reduce significantly.', type:'number', placeholder:'e.g. $240,000' },
      { id:'dq11', text:'What percentage of purchase orders are emergency or unplanned due to parts stockouts discovered at time of need?', why:'Emergency procurement premium = 20–50% above planned cost.', type:'percent', placeholder:'e.g. 18%' },
    ]},
    { section: 'Inventory Value & Systems', questions: [
      { id:'dq7', text:'What is the total value of spares, maintenance materials, and consumables held across all locations?', why:'Full inventory base for carrying cost and turns analysis.', sync:'inventoryValue', type:'number', placeholder:'e.g. $35,000,000' },
      { id:'dq13', text:'What is the annual cost of your EAM/CMMS, ERP inventory module, and associated IT support?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. $520,000' },
      { id:'dq16', text:'What is the organisation\'s annual operating revenue?', why:'Revenue base for value-at-risk calculation.', sync:'revenue', type:'number', placeholder:'e.g. $850,000,000' },
      { id:'dq17', text:'What hurdle rate does your finance team use for operational investment approvals?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 15%' },
    ]},
  ],

  /* ── DISTRIBUTION & 3PL ── */
  distribution: [
    { section: 'Warehouse Operations & Labor', questions: [
      { id:'dq1', text:'How many warehouse associates, operators, and supervisors are involved in daily inventory transactions — receiving, put-away, picking, and shipping?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 95' },
      { id:'dq2', text:'What is your current pick accuracy rate, and how many hours per week are spent re-picking, re-packing, or investigating order discrepancies?', why:'Re-work labor is a direct, measurable cost CI eliminates.', type:'text', placeholder:'e.g. 97.5% pick accuracy, 30 hrs/week rework' },
      { id:'dq3', text:'How many order lines do you ship per day, and what is your error rate per 1,000 lines?', why:'Throughput and accuracy baseline for CI value calculation.', type:'text', placeholder:'e.g. 8,000 lines/day, 4 errors per 1,000' },
    ]},
    { section: 'Inventory Accuracy & Shrinkage', questions: [
      { id:'dq4', text:'What is your perpetual inventory accuracy rate — the % of locations with the correct quantity and SKU?', why:'CI benchmark: 99.8% location accuracy. Gap drives customer chargebacks.', type:'percent', placeholder:'e.g. 96%' },
      { id:'dq5', text:'What is the annual dollar value of inventory written off due to shrinkage, damage, or unreconciled variances?', why:'Direct write-off savings input.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $180,000' },
      { id:'dq6', text:'How often is a full wall-to-wall count required, and how many operational hours does it consume?', why:'CI replaces annual counts with continuous cycle counting.', type:'text', placeholder:'e.g. Twice yearly, 16 hours each (facility closed)' },
    ]},
    { section: 'Customer OTIF & Chargebacks', questions: [
      { id:'dq9', text:'What is your current OTIF rate across your top customers? What is your contractual target?', why:'OTIF gap directly sizes the value-at-risk for the model.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 95.2% actual, 98.5% contractual' },
      { id:'dq10', text:'What was the total value of customer chargebacks, deductions, or compliance fines related to OTIF failures last year?', why:'Hard-dollar OTIF cost — key CFO metric.', type:'number', placeholder:'e.g. $420,000' },
      { id:'dq11', text:'Which customers or contracts have the highest chargeback exposure, and what is the primary failure mode — late, incomplete, or incorrect?', why:'Identifies where CI delivers the fastest chargeback reduction.', type:'text', placeholder:'e.g. 3 major retail clients, primarily incomplete orders' },
    ]},
    { section: 'Inventory & Systems', questions: [
      { id:'dq7', text:'What is the average total inventory value held in your facility at any time?', why:'Base for carrying cost and working capital analysis.', sync:'inventoryValue', type:'number', placeholder:'e.g. $28,000,000' },
      { id:'dq13', text:'What do you pay annually for your WMS, TMS, and associated system licenses and support?', why:'IT displacement and consolidation opportunity.', sync:'itCost', type:'number', placeholder:'e.g. $380,000' },
      { id:'dq16', text:'What is the organisation\'s annual revenue from 3PL and distribution operations?', why:'Revenue base for OTIF value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $65,000,000' },
      { id:'dq17', text:'What discount rate does your finance team use?', why:'NPV calculation input.', sync:'discRate', type:'percent', placeholder:'e.g. 10%' },
    ]},
  ],

  /* ── FOOD & BEVERAGE ── */
  food: [
    { section: 'Production & Warehouse Labor', questions: [
      { id:'dq1', text:'How many staff are involved in inventory operations across receiving, production stores, cold storage, and dispatch?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 55' },
      { id:'dq2', text:'What percentage of your team\'s time is spent on manual lot tracking, FEFO verification, or expiry date monitoring?', why:'Automated FEFO enforcement is a primary CI value driver in food.', type:'percent', placeholder:'e.g. 20%' },
      { id:'dq3', text:'How many hours per week are spent on compliance documentation — traceability reports, temperature logs, lot reconciliations?', why:'Compliance documentation labor is a direct, reducible cost.', type:'number', placeholder:'e.g. 25 hours/week' },
    ]},
    { section: 'Expiry, Waste & Traceability', questions: [
      { id:'dq4', text:'What is your current inventory accuracy rate for lot-tracked and date-coded products?', why:'Low accuracy = expiry failures, compliance risk, and write-offs.', type:'percent', placeholder:'e.g. 94%' },
      { id:'dq5', text:'What is the annual dollar value of product written off due to expiry, FEFO failures, temperature excursions, or unreconciled losses?', why:'Direct write-off savings — typically 2–4% in food operations.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $520,000' },
      { id:'dq6', text:'How long does it take your team to complete a mock recall or traceability exercise — tracing a lot code from receipt to all shipment points?', why:'FSMA Rule 204 requires 24-hour traceability. CI delivers 2-minute trace.', type:'text', placeholder:'e.g. 4–6 hours across multiple systems' },
    ]},
    { section: 'Customer Service & OTIF', questions: [
      { id:'dq9', text:'What is your current OTIF or order fill rate to retail, food service, or export customers?', why:'Baseline for OTIF improvement value.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 93%' },
      { id:'dq10', text:'What penalties, deductions, or returns did you absorb last year due to incorrect product, wrong lot, or late delivery?', why:'Customer chargeback input for the model.', type:'number', placeholder:'e.g. $350,000' },
      { id:'dq11', text:'Are you subject to any regulatory compliance requirements — FDA FSMA, HACCP, retailer food safety audits? What is your current compliance cost?', why:'Compliance cost reduction is a major CI value driver in food.', type:'text', placeholder:'e.g. FDA FSMA — 2 audits/year, $80K annual compliance cost' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'What is the total value of raw materials, packaging, and finished goods inventory on hand?', why:'Full inventory base for carrying cost and turns analysis.', sync:'inventoryValue', type:'number', placeholder:'e.g. $9,500,000' },
      { id:'dq13', text:'What do you spend on your production ERP, WMS, and compliance management systems annually?', why:'IT displacement and simplification opportunity.', sync:'itCost', type:'number', placeholder:'e.g. $195,000' },
      { id:'dq16', text:'What is the organisation\'s annual revenue?', why:'Revenue base for value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $55,000,000' },
      { id:'dq17', text:'What cost of capital or hurdle rate does your CFO apply?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 10%' },
    ]},
  ],

  /* ── RETAIL ── */
  retail: [
    { section: 'Store Operations & Labor', questions: [
      { id:'dq1', text:'How many store associates, warehouse staff, and inventory controllers are involved in inventory management across your network?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 180' },
      { id:'dq2', text:'How many hours per week are store associates spending on manual stock counts, discrepancy investigations, or stockroom organisation?', why:'Benchmark: 4–8 hours/week per store in manual inventory activities.', type:'text', placeholder:'e.g. ~6 hours/week per store across 25 stores' },
      { id:'dq3', text:'What is your current rate of phantom inventory — items the system shows as in-stock but are actually not on the shelf?', why:'Phantom inventory = lost sales + customer disappointment.', type:'percent', placeholder:'e.g. ~8% of SKUs are phantom inventory' },
    ]},
    { section: 'Shrink & Write-offs', questions: [
      { id:'dq4', text:'What is your current inventory accuracy rate at the store/SKU level?', why:'CI delivers 99.3%+ accuracy. Gap drives shrink and lost sales.', type:'percent', placeholder:'e.g. 92%' },
      { id:'dq5', text:'What is your total annual shrink — known and unknown — as a dollar value or percentage of sales?', why:'Retail shrink benchmark: 1.5–2% of sales. Direct write-off savings.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $1,800,000 or 1.8% of sales' },
      { id:'dq6', text:'How often do you conduct full store counts, and how do you manage cycle counting between full counts?', why:'CI replaces labour-intensive full counts with continuous cycle counting.', type:'text', placeholder:'e.g. Full count 4x/year, 2 days per store, store closed' },
    ]},
    { section: 'In-stock Rate & Customer Impact', questions: [
      { id:'dq9', text:'What is your current in-stock rate or on-shelf availability? What is your omnichannel fulfilment accuracy?', why:'In-stock rate directly drives revenue recovery and NPS.', sync:'otifBaseline', type:'percent', placeholder:'e.g. 93% in-stock rate' },
      { id:'dq10', text:'What is the estimated annual lost sales value due to phantom inventory, out-of-stocks, or omnichannel fulfilment errors?', why:'Recovered lost sales is the primary revenue value driver in retail.', type:'number', placeholder:'e.g. $2,200,000' },
      { id:'dq11', text:'Do you fulfil orders from store (click & collect, ship from store)? What is your current accuracy rate for these fulfilments?', why:'Store fulfilment accuracy is a growing competitive differentiator.', type:'percent', placeholder:'e.g. Ship from store accuracy: 94%' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'What is the total retail value of inventory held across your store network and distribution centres?', why:'Base for carrying cost and turns calculation.', sync:'inventoryValue', type:'number', placeholder:'e.g. $18,000,000' },
      { id:'dq13', text:'What do you pay annually for your retail inventory management, POS, and fulfilment systems?', why:'IT displacement opportunity.', sync:'itCost', type:'number', placeholder:'e.g. $420,000' },
      { id:'dq16', text:'What is the organisation\'s total annual revenue across all channels?', why:'Revenue base for in-stock and fulfilment value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $95,000,000' },
      { id:'dq17', text:'What hurdle rate does your finance team use for retail investment decisions?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 12%' },
    ]},
  ],

  /* ── MINERALS & MINING ── */
  mining: [
    { section: 'Maintenance & Operations Labor', questions: [
      { id:'dq1', text:'How many maintenance technicians, storekeepers, and procurement staff are involved in spare parts and materials management?', why:'User count drives labor savings baseline.', sync:'userCount', type:'number', placeholder:'e.g. 95' },
      { id:'dq2', text:'What percentage of maintenance staff time is spent on non-productive activities — parts searches, manual requisitions, and reconciliation?', why:'Benchmark: 20–30% non-productive maintenance time in mining.', type:'percent', placeholder:'e.g. 22%' },
      { id:'dq3', text:'How many times per month does planned maintenance get deferred due to parts unavailability discovered at time of work order execution?', why:'Deferred maintenance = unplanned downtime risk and safety exposure.', type:'number', placeholder:'e.g. 8 per month' },
    ]},
    { section: 'Spares Inventory & Write-offs', questions: [
      { id:'dq4', text:'What is your current critical spares inventory accuracy rate? How is it measured?', why:'CI benchmark: 99.5%. Below 95% = significant downtime risk.', type:'percent', placeholder:'e.g. 89%' },
      { id:'dq5', text:'What is the annual dollar value of spares and materials written off due to obsolescence, loss, or unreconciled consumption?', why:'Direct write-off savings — typically 2–3% of spares value.', sync:'annualWriteOff', type:'number', placeholder:'e.g. $1,100,000' },
      { id:'dq6', text:'What is the estimated value of "insurance spares" or excess buffer held to compensate for unreliable inventory data?', why:'Excess buffer = trapped capital with carrying cost.', type:'number', placeholder:'e.g. $4,500,000 in excess/buffer stock' },
    ]},
    { section: 'Production Continuity & Compliance', questions: [
      { id:'dq9', text:'What is your current plant or mine availability rate? What percentage of unplanned downtime events are linked to parts or materials issues?', why:'1% improvement in availability = millions in recovered production.', type:'text', placeholder:'e.g. 87% availability, ~30% of downtime linked to parts' },
      { id:'dq10', text:'What did unplanned production stoppages linked to parts or materials issues cost last year — in lost production and emergency labour?', why:'Production stoppage cost is the primary value driver in mining.', type:'number', placeholder:'e.g. $3,200,000' },
      { id:'dq11', text:'Are you required to meet OEM warranty conditions that require specific part lot tracking or maintenance documentation?', why:'OEM compliance documentation burden is a reducible CI opportunity.', type:'text', placeholder:'e.g. Yes — major OEM equipment with monthly compliance reports' },
    ]},
    { section: 'Inventory & Financial Baseline', questions: [
      { id:'dq7', text:'What is the total value of spare parts and maintenance materials held across your stores and underground/remote locations?', why:'Full inventory base for carrying cost and turns analysis.', sync:'inventoryValue', type:'number', placeholder:'e.g. $42,000,000' },
      { id:'dq13', text:'What is the annual cost of your EAM, CMMS, and ERP inventory management systems?', why:'IT displacement input.', sync:'itCost', type:'number', placeholder:'e.g. $680,000' },
      { id:'dq16', text:'What is the operation\'s annual production revenue?', why:'Revenue base for value-at-risk.', sync:'revenue', type:'number', placeholder:'e.g. $420,000,000' },
      { id:'dq17', text:'What hurdle rate does your finance team apply to capital and operational investments?', why:'NPV discount rate.', sync:'discRate', type:'percent', placeholder:'e.g. 15%' },
    ]},
  ],
};

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
      if (typeof fieldStates !== 'undefined') fieldStates[q.sync] = enteredBy === 'prospect' ? 'confirmed' : 'estimated';
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
  const company   = document.getElementById('companyName')?.value || '';

  try {
    const resp = await apiFetch('/api/discovery/sessions', {
      method: 'POST',
      body: JSON.stringify({ industry, company })
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
  return window.location.origin + '/prospect.html#token=' + discoverySessionToken;
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
            if (typeof fieldStates !== 'undefined') fieldStates[q.sync] = enteredBy === 'prospect' ? 'confirmed' : 'estimated';
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

  const prospectLinkHtml = discoverySessionToken
    ? `<div class="disc-prospect-link">
        <div class="disc-prospect-link-label">🔗 Prospect link active</div>
        <div class="disc-prospect-link-url" id="discProspectUrl"></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn btn-cta btn-sm" onclick="copyProspectLink()">Copy link</button>
          <button class="btn btn-ghost btn-sm" onclick="importProspectAnswers()">↻ Check submitted answers</button>
          <button class="btn btn-ghost btn-sm" onclick="rotateProspectToken()">🔄 Rotate link</button>
          <button class="btn btn-danger btn-sm" onclick="revokeProspectLink()">Revoke</button>
        </div>
        <div class="disc-prospect-note">Prospect answers are saved in real time. Click "Check submitted answers" to pull the latest from the database.</div>
      </div>`
    : `<button class="btn btn-cta btn-sm" onclick="generateProspectLink()" style="margin-left:auto;">
        🔗 Generate prospect link
      </button>`;

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
      const num = parseFloat(String(answer).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
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
