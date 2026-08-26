/* ═══════════════════════════════════════════════════════════════════
   industry-data.js — shared IND (industry defaults) + COMP (competitor data).
   Loaded by both the calculator (app.js) and the PDF print page (print.html),
   so the two never drift. Plain globals; safe to load as a classic script.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Benchmark citations ─────────────────────────────────────────────
   Every industry default has a source. These appear as footnotes in
   PDF/PPT exports and as tooltips in the calculator.
   ─────────────────────────────────────────────────────────────────── */
const BENCHMARK_CITATIONS = {
  shrinkRate: {
    source: 'National Retail Federation / Gartner Supply Chain Research',
    year: '2024–2025',
    note: 'Inventory shrinkage rate as % of on-hand inventory value. Includes damage, theft, counting error, and obsolescence.'
  },
  carryRate: {
    source: 'Gartner Supply Chain Research',
    year: '2024',
    note: 'Inventory carrying cost as % of inventory value per year. Includes capital cost, storage, insurance, and obsolescence risk.'
  },
  otifRisk: {
    source: 'Gartner Supply Chain & Logistics Research',
    year: '2024',
    note: 'Revenue at risk from OTIF non-compliance as % of revenue. Includes chargebacks, lost orders, and retailer penalties.'
  },
  mLabor: {
    source: 'Cloud Inventory published customer case studies (Art.com and Trek)',
    year: 'accessed 2026',
    note: 'Published examples report productivity improvement, but every labor assumption must be confirmed with measured customer time and treated as capacity unless cost is actually avoided.'
  },
  mShrinkage: {
    source: 'Cloud Inventory published Rawlings customer case study',
    year: 'accessed 2026',
    note: 'The published example reports lower inventory write-downs. Replace the starting assumption with the prospect’s validated loss baseline and agreed recovery target.'
  },
  mCarrying: {
    source: 'Gartner Supply Chain Research / Cloud Inventory deployments',
    year: '2024–2025',
    note: 'Carrying cost reduction from improved inventory turns, reduced safety stock, and better visibility.'
  },
  mOtif: {
    source: 'Cloud Inventory customer data / APICS SCOR benchmarks',
    year: '2024',
    note: 'OTIF improvement monetized as % of revenue risk addressed. Conservative based on customer median.'
  },
  invTurns: {
    source: 'Industry benchmark: Gartner / APICS / CFO Research',
    year: '2024',
    note: 'Industry-median inventory turns per year. Best-in-class (the benchmark target) is typically 2–3× the median.'
  }
};

const IND = {
  telecom:      { labor:30,shrinkage:45,carrying:20,otif:12,it:65,shrinkRate:2.5,carryRate:28,otifRisk:2.5,otifBaseline:92,otifTarget:97,invTurns:4,  downtime:30,expedite:25,count:40,throughput:30,accuracy:35,firstFix:35,utilization:20,leakage:30,label:'Telecommunications' },
  mfg:          { labor:25,shrinkage:40,carrying:18,otif:10,it:60,shrinkRate:2.0,carryRate:25,otifRisk:2.0,otifBaseline:91,otifTarget:97,invTurns:6,  downtime:35,expedite:30,count:45,throughput:30,accuracy:35,firstFix:20,utilization:10,leakage:20,label:'Manufacturing' },
  construction: { labor:20,shrinkage:35,carrying:15,otif:8, it:55,shrinkRate:3.0,carryRate:22,otifRisk:1.5,otifBaseline:88,otifTarget:95,invTurns:3,  downtime:25,expedite:25,count:35,throughput:25,accuracy:30,firstFix:35,utilization:20,leakage:30,label:'Engineering & Construction' },
  oil:          { labor:22,shrinkage:38,carrying:17,otif:9, it:58,shrinkRate:2.8,carryRate:24,otifRisk:2.0,otifBaseline:89,otifTarget:96,invTurns:4,  downtime:30,expedite:28,count:40,throughput:30,accuracy:35,firstFix:35,utilization:18,leakage:30,label:'Oil & Gas' },
  mining:       { labor:20,shrinkage:35,carrying:15,otif:8, it:55,shrinkRate:2.5,carryRate:23,otifRisk:1.5,otifBaseline:88,otifTarget:95,invTurns:3,  downtime:35,expedite:25,count:35,throughput:30,accuracy:35,firstFix:30,utilization:15,leakage:28,label:'Minerals & Mining' },
  distribution: { labor:35,shrinkage:50,carrying:22,otif:15,it:70,shrinkRate:1.5,carryRate:30,otifRisk:3.0,otifBaseline:94,otifTarget:99,invTurns:12, downtime:20,expedite:35,count:50,throughput:35,accuracy:40,firstFix:20,utilization:10,leakage:20,label:'Wholesale Distribution' },
  food:         { labor:28,shrinkage:42,carrying:18,otif:12,it:60,shrinkRate:2.2,carryRate:27,otifRisk:2.5,otifBaseline:92,otifTarget:98,invTurns:15, downtime:25,expedite:30,count:45,throughput:30,accuracy:35,firstFix:20,utilization:10,leakage:22,label:'Food & Beverage' },
  /* No defensible public benchmark set is bundled for this segment. Zero
     defaults force customer-specific inputs instead of silently inventing ROI. */
  retail:       { labor:0,shrinkage:0,carrying:0,otif:0,it:0,shrinkRate:0,carryRate:0,otifRisk:0,otifBaseline:0,otifTarget:0,invTurns:0,downtime:0,expedite:0,count:0,throughput:0,accuracy:0,firstFix:0,utilization:0,leakage:0,label:'Medical Devices / Life Sciences — customer inputs required' }
};

/* ── Competitive data ── */
const COMP = {
  /* ── WMS / inventory displacement competitors ── */
  sap:   { solution:'cip', name:'SAP WM / Extended WH Mgmt',
    cost:'$500K–$2M+ implementation', time:'12–24 months to go-live', maint:'18–22% annual maintenance',
    pain:['Complex ABAP configuration requires expensive SAP consultants','High TCO with continuous customization costs','Difficult to adapt for mobile and field inventory','Upgrade cycles create prolonged operational risk'],
    adv: ['No-code configuration — no consultants needed','Go-live in weeks, not years','Mobile-first UX built for warehouse and field workers','Fraction of the 3-year TCO','Native Field Inventory — no SAP equivalent'],
    targetProfile:'$50M+ revenue with multiple facilities, ERP instances, or inconsistent inventory processes.',
    targetBuyers:'VP Supply Chain, VP Operations, VP Manufacturing, CIO, Director of Inventory.',
    compLandscape:'Enterprise WMS: Deposco, Infios WMS, Logiwa WMS, Easy WMS.',
    compReframe:'Do not force a warehouse feature checklist before confirming the operating problem. Separate targeted inventory execution from a full WMS replacement decision.',
    discPrequalify:['Where is inventory stored, moved, consumed, or returned outside the primary warehouse?','Which ERP systems and inventory applications are in use?','How are frontline transactions captured today?'],
    discQualify:['Which inventory workflows create the most errors, delays, or rework?','How many sites, users, business units, and ERP instances are involved?','What systems must exchange governed, real-time transactions?'],
    whyWin:['Inventory-specific execution across warehouse, production, field, and distributed operations','Preserves the ERP as system of record without forcing replacement','Supports multi-ERP and multi-location operating models','Configurable workflows reduce dependence on custom ERP code'] },

  rf:    { solution:'cip', name:'Legacy RF / Paper-based',
    cost:'$50K–$300K in aging hardware', time:'No real-time visibility', maint:'High labor cost for manual reconciliation',
    pain:['Zero real-time inventory visibility','Error-prone manual entry drives write-offs','Disconnected field operations create blind spots','Cannot scale without adding headcount'],
    adv: ['Real-time scan-verified accuracy at every transaction','Runs on modern devices — no RF gun refresh','Cloud-based — no on-premise infrastructure','Unified warehouse and field platform'],
    targetProfile:'$50M+ revenue; inventory spans warehouses, production, field, stockrooms, or distributed sites.',
    targetBuyers:'VP Operations, Director of Inventory, warehouse and plant operations leaders.',
    compLandscape:'Status quo: ERP-native modules, spreadsheets, paper, custom apps, disconnected scanning tools.',
    compReframe:'Ask whether inventory extends beyond the warehouse into production, field, stockrooms, or distributed locations. Lead with accuracy, control, productivity, and lower disruption.',
    discPrequalify:['How are frontline transactions captured today?','How often are balances corrected through counts, reconciliations, or manual adjustments?','Where is inventory stored outside the primary warehouse?'],
    discQualify:['Which inventory workflows create the most errors, delays, or rework?','Where is connectivity unreliable or work performed away from fixed stations?','How quickly must new workflows or process changes be deployed?'],
    whyWin:['Inventory-specific execution across warehouse, production, field, and distributed operations','Mobile-first frontline execution improves adoption and data capture','Targeted deployment supports faster value and expansion over time'] },

  oracle:{ solution:'cip', name:'Oracle WMS',
    cost:'$300K–$1.5M implementation', time:'9–18 months typical', maint:'20%+ annual support costs',
    pain:['High implementation cost requires Oracle specialists','Limited mobile-first capabilities','Complex non-Oracle ERP integrations','Rigid licensing limits flexibility'],
    adv: ['ERP-agnostic API-first integration','Up to 10x faster deployment','Lower 3-year TCO','Field Inventory fills a gap Oracle cannot'],
    targetProfile:'$50M+ revenue; operational complexity matters more than size alone. Multiple facilities, ERP instances, or inconsistent inventory processes.',
    targetBuyers:'VP Supply Chain, VP Operations, VP Manufacturing, CIO, Director of Inventory, Distribution, or Warehousing.',
    compLandscape:'Enterprise / mid-market WMS: Deposco, Infios WMS, Logiwa WMS, Easy WMS. Inventory applications: Fishbowl, Cin7 Core, inFlow Inventory, SkuVault by Linnworks.',
    compReframe:'Do not force a warehouse feature checklist before confirming the operating problem. Test multi-ERP, configurability, integration, offline, and technical-debt requirements.',
    discPrequalify:['Is the requirement limited to warehouse management, or broader inventory execution?','Which ERP systems and inventory applications are in use?','How are frontline transactions captured today?'],
    discQualify:['Which inventory workflows create the most errors, delays, or rework?','How many sites, users, business units, and ERP instances are involved?','What systems must exchange governed, real-time transactions?'],
    whyWin:['Inventory-specific execution across warehouse, production, field, and distributed operations','Preserves the ERP as system of record without forcing replacement','Configurable workflows reduce dependence on custom ERP code and one-off applications'] },

  excel: { solution:'cip', name:'Spreadsheets / Manual',
    cost:'Hidden: $80K–$200K/yr in labor waste', time:'Always running behind reality', maint:'Rework, reconciliation, audit overhead',
    pain:['Zero real-time visibility','High error rates and write-offs','No audit trail or compliance support','Cannot support multi-site operations'],
    adv: ['Real-time scan-verified accuracy','Audit-ready reporting built in','Scales without adding headcount','ROI typically under 6 months'],
    targetProfile:'$50M+ revenue; spreadsheets, custom apps, and disconnected scanning tools creating technical debt.',
    targetBuyers:'VP Operations, VP Supply Chain, Director of Inventory, warehouse and plant operations leaders.',
    compLandscape:'Status quo: ERP-native modules, spreadsheets, paper, custom apps, disconnected scanning tools.',
    compReframe:'Reframe ERP or WMS discussions around the gap between system records and physical execution. Lead with accuracy, control, productivity, traceability, and lower disruption.',
    discPrequalify:['What is the annual cost of write-offs, expedites, stockouts, excess inventory, and reconciliation labor?','How often are balances corrected through counts, reconciliations, or manual adjustments?'],
    discQualify:['How does inventory inaccuracy affect service levels, production, OTIF, invoicing, or working capital?','Which outcomes will justify action, and who owns those measures?'],
    whyWin:['Inventory-specific execution across warehouse, production, field, and distributed operations','Mobile-first frontline execution improves adoption and data capture','Targeted deployment supports faster value and expansion over time'] },

  erp:   { solution:'cip', name:'ERP-Native Module',
    cost:'Included but capability-limited', time:'Not optimized for warehouse ops', maint:'Tied to ERP upgrade cycle',
    pain:['Designed for records, not execution','Limited mobile scanning capability','No wave management or directed put-away','Field inventory blind spots'],
    adv: ['Purpose-built execution on top of your ERP','Scan-verified at every transaction','Field Inventory fills ERP gaps','API-first sync with any ERP'],
    targetProfile:'$50M+ revenue; ERP records do not match physical operations. Inventory becomes stranded across systems, facilities, vehicles, or field sites.',
    targetBuyers:'VP Supply Chain, VP Operations, CIO, Director of Inventory, ERP applications owners.',
    compLandscape:'Specialists: Katana Cloud Manufacturing, ShipHero. Status quo: ERP-native modules, spreadsheets, paper, custom apps.',
    compReframe:'ERP objection: the ERP remains system of record; the gap is frontline execution and capture. Separate targeted inventory execution from a full WMS replacement decision.',
    discPrequalify:['Is the requirement limited to warehouse management, or broader inventory execution?','How are frontline transactions captured today?','How often are balances corrected through counts or manual adjustments?'],
    discQualify:['Which inventory workflows create the most errors, delays, or rework?','Where is connectivity unreliable or work performed away from fixed stations?'],
    whyWin:['Inventory-specific execution across warehouse, production, field, and distributed operations','Preserves the ERP as system of record without forcing replacement','Configurable workflows reduce dependence on custom ERP code'] },

  /* ── MEP displacement competitors ── */
  mep_lowcode: { solution:'mep', name:'Low-code Platform (Power Apps / Mendix / Appian)',
    cost:'$100K–$500K+ build + ongoing dev', time:'6–18 months to first workflow', maint:'High: custom code, versioning, and dev dependency',
    pain:['Generic platform requires custom development for every workflow','No offline-first or governed sync built in','ERP integration requires bespoke connectors','Scaling means more dev cycles, not configuration'],
    adv: ['Purpose-built for governed enterprise workflow mobilization','Reliable online and offline execution with governed sync','No-code configuration — no developers required','Connects to ERPs, APIs, databases, and enterprise systems out of the box','Role-based workflows and simplified frontline experiences'],
    targetProfile:'$50M+ revenue; employees work away from desks, fixed terminals, or reliable connectivity. Paper, spreadsheets, or disconnected mobile tools remain common.',
    targetBuyers:'CIO, VP Operations, VP Field Service, VP Digital Transformation, IT Applications, Enterprise Architecture.',
    compLandscape:'Low-code platforms: Neptune Software, Alpha Software, Microsoft Power Apps, Mendix, OutSystems, Appian.',
    compReframe:'Avoid a generic low-code feature war; qualify the frontline execution problem first. Compare lifecycle cost, change speed, governance, and technical debt — not license availability alone.',
    discPrequalify:['Which employees perform critical work away from desktops or reliable networks?','Is the requirement a single form, scanning workflow, or broader process mobilization?','Which enterprise systems contain the workflows and data they need?'],
    discQualify:['What must users complete when fully disconnected?','Which transactions require validation, approval, photos, signatures, barcode scans, or attachments?','How frequently do workflows and business rules change?'],
    whyWin:['Purpose-built for mobilizing governed enterprise workflows at the point of work','Reliable online and offline operation for frontline environments','No-code configuration speeds change and reduces dependence on custom development','Simplified role-based experiences improve frontline adoption'] },

  mep_rfgen: { solution:'mep', name:'ERP Mobility / Scanning (RFgen / RF-SMART)',
    cost:'$50K–$300K + ERP consulting', time:'3–9 months, ERP-specific', maint:'Tied to ERP version; limited to scanning workflows',
    pain:['ERP-specific — locked to one system','Limited to scanning and data capture, not full workflow execution','No offline-first capability for field environments','Cannot mobilize cross-system or non-ERP workflows'],
    adv: ['Works across ERPs, APIs, databases, and enterprise systems','Full workflow execution — not just scanning','Reliable offline operation with governed sync','No-code configuration for any workflow type'],
    targetProfile:'Frontline employees work across multiple systems, locations, device types, and connectivity conditions.',
    targetBuyers:'CIO, VP Operations, VP Field Service, IT Applications, ERP owners, mobile app teams.',
    compLandscape:'ERP mobility / scanning: RFgen, RF-SMART, ERP Suites Scanability.',
    compReframe:'Test offline depth, governed synchronization, ERP transaction complexity, security, and device conditions. Ask whether the need extends beyond forms into end-to-end enterprise workflows.',
    discPrequalify:['Which enterprise systems contain the workflows and data they need?','Is the requirement a single form, scanning workflow, or broader process mobilization?','How many users, locations, device types, and connectivity conditions are involved?'],
    discQualify:['What must users complete when fully disconnected?','What security, governance, integration, and support standards apply?','How frequently do workflows and business rules change?'],
    whyWin:['Connects to ERPs, databases, APIs, and other enterprise systems','Reliable online and offline operation for frontline environments','No-code configuration speeds change and reduces dependence on custom development','Central governance supports reusable applications and consistent processes at scale'] },

  other: { solution:'cip', name:'Other WMS',
    cost:'$200K–$1M+ typical', time:'12–18 months average', maint:'15–20% annual maintenance',
    pain:['High ongoing customization cost','Limited field operation flexibility','Mobile UX often retrofitted','Vendor lock-in'],
    adv: ['No-code config — adapt in hours','Single platform for warehouse and field','API-first for any ERP','Cloud-native SaaS'],
    targetProfile:'$50M+ revenue; operational complexity matters more than size alone.',
    targetBuyers:'VP Supply Chain, VP Operations, CIO, Director of Inventory.',
    compLandscape:'Enterprise / mid-market WMS: Deposco, Infios WMS, Logiwa WMS, Easy WMS.',
    compReframe:'Do not force a warehouse feature checklist before confirming the operating problem. Test multi-ERP, configurability, integration, offline, and technical-debt requirements.',
    discPrequalify:['Where is inventory stored outside the primary warehouse?','Which ERP systems and inventory applications are in use?','How are frontline transactions captured today?'],
    discQualify:['Which inventory workflows create the most errors, delays, or rework?','How many sites, users, business units, and ERP instances are involved?'],
    whyWin:['Inventory-specific execution across warehouse, production, field, and distributed operations','Preserves the ERP as system of record without forcing replacement','Configurable workflows reduce dependence on custom ERP code'] }
};

/* Explicitly expose on window so cross-<script> access is reliable regardless
   of strict-mode context (top-level const does not always become a global
   property). print.html depends on these. */
if (typeof window !== 'undefined') { window.IND = IND; window.COMP = COMP; window.BENCHMARK_CITATIONS = BENCHMARK_CITATIONS; }
