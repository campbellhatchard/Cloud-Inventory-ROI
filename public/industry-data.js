/* ═══════════════════════════════════════════════════════════════════
   industry-data.js — shared IND (industry defaults) + COMP (competitor data).
   Loaded by both the calculator (app.js) and the PDF print page (print.html),
   so the two never drift. Plain globals; safe to load as a classic script.
   ═══════════════════════════════════════════════════════════════════ */
const IND = {
  telecom:      { labor:30,shrinkage:45,carrying:20,otif:12,it:65,shrinkRate:2.5,carryRate:28,otifRisk:2.5,otifBaseline:92,otifTarget:97,invTurns:4,  downtime:30,expedite:25,count:40,throughput:30,accuracy:35,firstFix:35,utilization:20,leakage:30,label:'Telecommunications' },
  mfg:          { labor:25,shrinkage:40,carrying:18,otif:10,it:60,shrinkRate:2.0,carryRate:25,otifRisk:2.0,otifBaseline:91,otifTarget:97,invTurns:6,  downtime:35,expedite:30,count:45,throughput:30,accuracy:35,firstFix:20,utilization:10,leakage:20,label:'Manufacturing' },
  construction: { labor:20,shrinkage:35,carrying:15,otif:8, it:55,shrinkRate:3.0,carryRate:22,otifRisk:1.5,otifBaseline:88,otifTarget:95,invTurns:3,  downtime:25,expedite:25,count:35,throughput:25,accuracy:30,firstFix:35,utilization:20,leakage:30,label:'Engineering & Construction' },
  oil:          { labor:22,shrinkage:38,carrying:17,otif:9, it:58,shrinkRate:2.8,carryRate:24,otifRisk:2.0,otifBaseline:89,otifTarget:96,invTurns:4,  downtime:30,expedite:28,count:40,throughput:30,accuracy:35,firstFix:35,utilization:18,leakage:30,label:'Oil & Gas' },
  mining:       { labor:20,shrinkage:35,carrying:15,otif:8, it:55,shrinkRate:2.5,carryRate:23,otifRisk:1.5,otifBaseline:88,otifTarget:95,invTurns:3,  downtime:35,expedite:25,count:35,throughput:30,accuracy:35,firstFix:30,utilization:15,leakage:28,label:'Minerals & Mining' },
  distribution: { labor:35,shrinkage:50,carrying:22,otif:15,it:70,shrinkRate:1.5,carryRate:30,otifRisk:3.0,otifBaseline:94,otifTarget:99,invTurns:12, downtime:20,expedite:35,count:50,throughput:35,accuracy:40,firstFix:20,utilization:10,leakage:20,label:'Wholesale Distribution' },
  food:         { labor:28,shrinkage:42,carrying:18,otif:12,it:60,shrinkRate:2.2,carryRate:27,otifRisk:2.5,otifBaseline:92,otifTarget:98,invTurns:15, downtime:25,expedite:30,count:45,throughput:30,accuracy:35,firstFix:20,utilization:10,leakage:22,label:'Food & Beverage' },
  retail:       { labor:30,shrinkage:40,carrying:22,otif:16,it:65,shrinkRate:1.5,carryRate:26,otifRisk:2.5,otifBaseline:95,otifTarget:99,invTurns:6,  downtime:25,expedite:35,count:45,throughput:30,accuracy:45,firstFix:25,utilization:12,leakage:25,label:'Medical Devices / Life Sciences' } /* PLACEHOLDER benchmarks — tune to validated figures */
};

/* ── Competitive data ── */
const COMP = {
  sap:   { name:'SAP WM / Extended WH Mgmt', cost:'$500K–$2M+ implementation', time:'12–24 months to go-live', maint:'18–22% annual maintenance',
    pain:['Complex ABAP configuration requires expensive SAP consultants','High TCO with continuous customization costs','Difficult to adapt for mobile and field inventory','Upgrade cycles create prolonged operational risk'],
    adv:['No-code configuration vs SAP ABAP — no consultants needed','Go-live in weeks, not years','Mobile-first UX built for warehouse and field workers','Fraction of the 3-year TCO','Native Field Inventory — no SAP equivalent'] },
  rf:    { name:'Legacy RF / Paper-based', cost:'$50K–$300K in aging hardware', time:'No real-time visibility', maint:'High labor cost for manual reconciliation',
    pain:['Zero real-time inventory visibility','Error-prone manual entry drives write-offs','Disconnected field operations create blind spots','Cannot scale without adding headcount'],
    adv:['Real-time scan-verified accuracy at every transaction','Runs on modern devices — no RF gun refresh','Cloud-based — no on-premise infrastructure','Unified warehouse and field platform'] },
  oracle:{ name:'Oracle WMS', cost:'$300K–$1.5M implementation', time:'9–18 months typical', maint:'20%+ annual support costs',
    pain:['High implementation cost requires Oracle specialists','Limited mobile-first capabilities','Complex non-Oracle ERP integrations','Rigid licensing limits flexibility'],
    adv:['ERP-agnostic API-first integration','Up to 10x faster deployment','Lower 3-year TCO','Field Inventory fills a gap Oracle cannot'] },
  excel: { name:'Spreadsheets / Manual', cost:'Hidden: $80K–$200K/yr in labor waste', time:'Always running behind reality', maint:'Rework, reconciliation, audit overhead',
    pain:['Zero real-time visibility','High error rates and write-offs','No audit trail or compliance support','Cannot support multi-site operations'],
    adv:['Real-time scan-verified accuracy','Audit-ready reporting built in','Scales without adding headcount','ROI typically under 6 months'] },
  erp:   { name:'ERP-Native Module', cost:'Included but capability-limited', time:'Not optimized for warehouse ops', maint:'Tied to ERP upgrade cycle',
    pain:['Designed for records, not execution','Limited mobile scanning capability','No wave management or directed put-away','Field inventory blind spots'],
    adv:['Purpose-built execution on top of your ERP','Scan-verified at every transaction','Field Inventory fills ERP gaps','API-first sync with any ERP'] },
  other: { name:'Other WMS', cost:'$200K–$1M+ typical', time:'12–18 months average', maint:'15–20% annual maintenance',
    pain:['High ongoing customization cost','Limited field operation flexibility','Mobile UX often retrofitted','Vendor lock-in'],
    adv:['No-code config — adapt in hours','Single platform for warehouse and field','API-first for any ERP','Cloud-native SaaS'] }
};

/* Explicitly expose on window so cross-<script> access is reliable regardless
   of strict-mode context (top-level const does not always become a global
   property). print.html depends on these. */
if (typeof window !== 'undefined') { window.IND = IND; window.COMP = COMP; }
