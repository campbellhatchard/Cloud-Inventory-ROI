/* ═══════════════════════════════════════════════════════════════
   narrative.js  —  Executive Narrative Engine
   • Three Whys framework with pre-written industry defaults
   • Claude API "AI Enhance" for dynamic personalization
   • Risk of inaction calculator
   • Implementation timeline visual
   • Decision criteria checklist
   • Executive headline summary (CFO / COO / CEO voice)
   • Next steps section with date awareness
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   PRE-WRITTEN THREE WHYS LIBRARY
   Indexed by [industry][whyKey]
   whyKey: 'act' | 'ci' | 'now'
   ───────────────────────────────────────────────────────────── */
const THREE_WHYS_LIBRARY = {
  telecom: {
    act: `Field technicians are dispatched daily with inaccurate parts lists, creating truck rolls, missed SLAs, and escalating labor costs. Every inventory discrepancy translates directly into delayed service restoration — damaging customer NPS scores and triggering contract penalties. Manual reconciliation consumes hours that should be billable field time, and audit-readiness for regulatory compliance remains a persistent risk.`,
    ci:  `Cloud Inventory is purpose-built for the distributed, mobile-first reality of telecom field operations — something general WMS platforms were never designed for. Real-time scan verification at the point of activity (not after the fact at a warehouse terminal) means your field inventory data is always current. Native integration with your field service management and ERP systems eliminates the data silos that create discrepancies today. No other solution combines warehouse precision with true field inventory management in a single platform.`,
    now: `A new fiber buildout is accelerating parts consumption and exposing the fragility of manual tracking at scale. Network modernization programs create a finite window to establish accurate baseline inventory before complexity compounds. Every month of delay means continued shrinkage, continued SLA risk, and continued reconciliation burden — while your competitors who have already invested in operational excellence widen their service efficiency gap.`
  },
  mfg: {
    act: `Production stoppages caused by parts stockouts are the single most preventable source of downtime — yet they continue because inventory records are never fully trusted. Inaccurate on-hand counts drive excess safety stock (tying up working capital) while simultaneously allowing critical components to run out undetected. Customer OTIF commitments are at risk every time the warehouse team works from data that is hours or days behind reality.`,
    ci:  `Cloud Inventory delivers scan-verified accuracy at every transaction — receiving, put-away, cycle count, pick, and ship — creating a real-time record your production planners, procurement team, and warehouse staff can all trust simultaneously. Unlike ERP-native inventory modules that were designed for financial record-keeping rather than operational execution, Cloud Inventory is built for the speed and precision that modern manufacturing demands. The result is a system of action, not just a system of record.`,
    now: `A plant expansion or new product launch is the highest-risk moment to be operating on inaccurate inventory data. Lean manufacturing initiatives and supplier inventory programs require a level of data integrity that manual or semi-automated systems cannot provide. The cost of delay — in excess inventory, expediting fees, and production downtime — compounds every quarter. Establishing operational excellence now positions the business to scale without scaling the problems.`
  },
  construction: {
    act: `Material losses, tool theft, and misallocated equipment across job sites represent one of the largest controllable cost lines in any construction operation — yet most firms have no real-time visibility into what is where. Over-ordering to compensate for uncertainty drives up project cost, while the labor spent searching for materials and reconciling transfers drains productivity. Compliance and audit requirements for certain projects demand traceability that paper-based systems simply cannot provide.`,
    ci:  `Cloud Inventory is the only solution built to manage inventory across both fixed warehouse locations and dynamic, mobile job sites in a single unified platform. Scan-based tracking follows materials from receiving dock to installation point, creating a complete chain of custody that protects against loss claims and supports contract compliance. The mobile-first design means field workers can transact inventory from their phones — no laptops, no terminals, no separate systems for office and field.`,
    now: `Project backlog is growing, which means more sites to manage, more materials to track, and more exposure to the losses that come from poor visibility. Before the next major project kicks off is the optimal time to establish inventory control processes — retrofitting systems mid-project is costly and disruptive. Material cost inflation makes the consequence of waste and over-ordering more severe than ever before.`
  },
  oil: {
    act: `Unplanned downtime caused by unavailable critical spares is among the most expensive operational events in upstream and midstream operations — often measured in tens of thousands of dollars per hour. Yet the root cause is almost always an inventory record that was never fully trusted. Regulatory compliance and safety audits require verifiable traceability of specific parts and materials, creating liability exposure when records cannot be reconciled. The cost of carrying excess buffer stock to compensate for poor visibility has become unsustainable.`,
    ci:  `Cloud Inventory provides the parts traceability, lot tracking, and real-time visibility that operations in regulated environments require — without the complexity and cost of enterprise asset management platforms that take years to implement. Scan-verified transactions create an immutable audit trail for every part movement across every location, from central warehouse to remote wellsite. The platform is designed for the harsh, connectivity-variable environments of oil and gas field operations.`,
    now: `Commodity price cycles create pressure to demonstrate operational efficiency and protect margins at every level. A regulatory audit cycle is approaching that will require documentation of parts traceability and inventory management practices. Every day of delay represents quantifiable shrinkage, avoidable carrying costs, and downtime risk that your finance team has already identified as a priority to address this fiscal year.`
  },
  mining: {
    act: `Critical spare parts stockouts that trigger unplanned equipment downtime represent the largest single preventable cost in mining operations — and they occur repeatedly because nobody fully trusts the inventory count. Simultaneously, excess buffer stock ties up millions in working capital that could be redeployed. Regulatory requirements for materials management and environmental compliance demand documentation standards that manual systems cannot meet consistently.`,
    ci:  `Cloud Inventory brings scan-verified accuracy and real-time visibility to the complex, multi-location inventory environment of modern mining operations — surface warehouse, underground stores, and remote maintenance depots managed in a single system. Parts traceability supports OEM warranty compliance and maintenance program integrity. The platform's offline capability ensures continuous operation even in areas with limited or no connectivity.`,
    now: `A planned capital equipment acquisition will add new spare parts requirements and increase the complexity of inventory management beyond what current systems can handle. The window between projects is the right time to establish the foundation. Every month of delay in a high-value spare parts environment represents compounding carrying costs and downtime exposure that dwarf the cost of the solution.`
  },
  distribution: {
    act: `Order accuracy and OTIF performance are the primary metrics by which your 3PL or distribution operation is evaluated by customers — and every miss directly threatens contract retention. Manual or semi-automated pick processes introduce error rates that are visible to customers in real time through EDI chargebacks and compliance scorecards. Inventory discrepancies create the dual problem of phantom inventory (orders that cannot be fulfilled) and excess stock (capital tied up in goods that shouldn't be on hand).`,
    ci:  `Cloud Inventory's scan-verified pick, pack, and ship process eliminates the source of most order errors before they leave the building. Real-time inventory accuracy means slotting and replenishment decisions are based on data that is current to the minute — not the previous night's batch update. The platform's wave management and directed workflow capabilities drive throughput improvements that protect and grow customer relationships without adding headcount.`,
    now: `A new customer contract or volume expansion requires the confidence that your operational accuracy can scale. Peak season preparation demands a system that performs under high transaction volumes without degrading accuracy. Customer scorecard reviews are creating pressure to demonstrate a credible plan for improving OTIF and accuracy metrics before the next contract renewal date.`
  },
  food: {
    act: `FDA traceability requirements under FSMA Rule 204 create a legal obligation to track lot numbers and expiration dates across the supply chain — with penalties for non-compliance that exceed the cost of any inventory management system. Beyond compliance, expired product write-offs and FEFO failures represent direct, avoidable margin destruction. Cold chain integrity documentation is increasingly required by retail and food service customers as a condition of doing business.`,
    ci:  `Cloud Inventory's lot tracking, expiration date management, and FEFO enforcement capabilities are designed specifically for the food and beverage environment — not retrofitted from a general warehouse management system. Real-time scan verification at receiving, storage, and shipping creates the complete, timestamped audit trail that FDA inspectors and retail customers require. Integration with your ERP and production systems ensures lot data flows seamlessly across the entire operation.`,
    now: `FDA enforcement of FSMA Rule 204 traceability requirements has begun, and the compliance window is closing. A recent recall event in your product category — or a customer audit finding — has elevated executive attention on traceability readiness. Investing in compliant systems now protects the business from both regulatory penalties and the far greater cost of a preventable recall.`
  },
  retail: {
    act: `Inventory inaccuracy is the hidden driver of lost sales, markdown pressure, and customer disappointment — when the system says it's in stock but the shelf says otherwise, every channel suffers. Omnichannel fulfillment strategies are impossible to execute reliably without real-time, scan-verified inventory that store associates and online customers can trust. Shrink and inventory write-offs remain among the largest controllable line items in retail operations.`,
    ci:  `Cloud Inventory delivers the scan-verified accuracy that makes omnichannel inventory promises achievable — buy online, pick up in store, ship from store, and endless aisle all depend on inventory data that is right to the unit. Real-time cycle counting eliminates the annual physical count disruption while continuously maintaining the accuracy that drives in-stock rate. The mobile-first platform fits naturally into a retail associate's workflow without requiring terminal access.`,
    now: `Peak season planning requires reliable inventory data as its foundation — promotional accuracy, allocation decisions, and replenishment timing all depend on knowing what you actually have. A competitor's investment in supply chain visibility is creating pressure to match their fulfillment capability and in-stock performance. Establishing inventory accuracy now positions the business for growth rather than managing the consequences of inaccuracy at scale.`
  },
  default: {
    act: `Manual and disconnected inventory processes create a compounding cost structure: excess safety stock ties up working capital, shrinkage and write-offs erode margins, and the labor required to reconcile inaccurate records consumes time that should be spent on higher-value activities. The risk of making decisions based on data that is hours or days out of date touches every function — procurement, operations, finance, and customer service.`,
    ci:  `Cloud Inventory provides real-time, scan-verified accuracy across warehouse and field locations in a single unified platform — purpose-built for operational execution, not just financial record-keeping. Unlike ERP-native modules that track inventory as an afterthought, or legacy WMS platforms that require months of implementation, Cloud Inventory delivers production-ready accuracy in weeks with no-code configuration that adapts to your processes.`,
    now: `The cost of inaction is quantifiable and immediate: every month without accurate inventory data is another month of avoidable shrinkage, excess carrying costs, and operational inefficiency. Market conditions, growth initiatives, or a recent operational event have elevated inventory accuracy to a board-level priority. The ROI analysis in this document demonstrates that delay is the most expensive option available.`
  }
};

/* ─────────────────────────────────────────────────────────────
   STATE — Three Whys content
   ───────────────────────────────────────────────────────────── */
let threeWhys = { act: '', ci: '', now: '' };
let aiGenerating = false;

/* ─────────────────────────────────────────────────────────────
   Load defaults for selected industry
   ───────────────────────────────────────────────────────────── */
function loadThreeWhysDefaults() {
  const ind = document.getElementById('industry')?.value || 'default';
  const lib = THREE_WHYS_LIBRARY[ind] || THREE_WHYS_LIBRARY.default;
  /* Prefer the prospect's own words captured in value-engineering discovery:
     ve5/ve6 (impact & cost of inaction) → why act; ve2 (compelling event) → why now. */
  const da = (typeof discoveryAnswers !== 'undefined') ? discoveryAnswers : {};
  const fromDiscovery = {
    act: da['ve5'] || da['ve6'] || '',
    ci:  '',
    now: da['ve2'] || da['ve3'] || ''
  };
  ['act','ci','now'].forEach(key => {
    const el = document.getElementById('why_'+key);
    if (el && !el.value.trim()) el.value = fromDiscovery[key] || lib[key];
    threeWhys[key] = el?.value || fromDiscovery[key] || lib[key];
  });
}

function saveThreeWhys() {
  ['act','ci','now'].forEach(key => {
    const el = document.getElementById('why_'+key);
    if (el) threeWhys[key] = el.value;
  });
}

/* ─────────────────────────────────────────────────────────────
   CLAUDE API — AI Enhance button
   Generates personalized Three Whys content
   ───────────────────────────────────────────────────────────── */
async function aiEnhanceWhys() {
  if (aiGenerating) return;
  const v = getVals();
  const r = calcROI(v);
  const indLabel = v.industry && IND[v.industry] ? IND[v.industry].label : 'general';
  const compName = v.competitor && COMP[v.competitor] ? COMP[v.competitor].name : 'their current solution';

  saveThreeWhys();

  const btn = document.getElementById('aiEnhanceBtn');
  const status = document.getElementById('aiEnhanceStatus');
  aiGenerating = true;
  if (btn) { btn.disabled = true; btn.textContent = '✨ Generating…'; }
  if (status) status.textContent = 'Claude is personalizing your Three Whys…';

  const audienceKey = getExecAudience();
  const audienceCfg = AUDIENCE_CONFIG[audienceKey] || AUDIENCE_CONFIG.mixed;

  const prompt = `You are a senior enterprise software sales strategist helping a Cloud Inventory sales rep build an executive business case.

PROSPECT CONTEXT:
- Company: ${v.company || 'the prospect'}
- Industry: ${indLabel}
- Annual revenue: ${fmtFull(v.revenue)}
- Inventory users: ${Math.round(v.users)}
- Annual inventory value: ${fmtFull(v.inventory)}
- Current solution being displaced: ${compName}
- Deal stage: ${v.dealStage || 'Discovery'}
- Annual benefit identified: ${fmtFull(r.annualBenefit)}
- Year 1 ROI: ${fmtPct(r.roi)}
- 3-year NPV: ${fmtFull(r.npv3)}
- Payback period: ${r.payback ? r.payback.toFixed(1)+' months' : 'under 12 months'}

PRIMARY AUDIENCE: ${audienceCfg.label} — ${audienceCfg.description}
TONE INSTRUCTION: ${audienceCfg.aiInstruction}

EXISTING DRAFT (rep's current content — improve and personalize, don't ignore it entirely):
Why Act: ${threeWhys.act}
Why CI: ${threeWhys.ci}
Why Now: ${threeWhys.now}

TASK: Rewrite the Three Whys for this specific prospect and audience. Each section should:
- Be 3–5 sentences, punchy and specific to their industry and situation
- Use the financial figures provided where they strengthen the narrative
- "Why Act" = the cost of the status quo and the burning platform
- "Why Cloud Inventory" = specific differentiation vs ${compName}, not generic
- "Why Now" = urgency that is credible and specific, not manufactured
- Follow the tone instruction above for the primary audience
- Sound like an experienced enterprise sales executive wrote it, not marketing copy
- Never mention competitor weaknesses as attacks — frame CI's advantages positively

Return ONLY valid JSON in this exact format with no other text:
{"act":"<why act content>","ci":"<why ci content>","now":"<why now content>"}`;

  try {
    // Proxy through server.js — API key stays on the server, never in the browser.
    // Model is not sent — server.js selects it via the ANTHROPIC_MODEL env var
    // (defaults to claude-sonnet-4-6), so this client code never goes stale.
    const resp = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
    ['act','ci','now'].forEach(key => {
      if (parsed[key]) {
        const el = document.getElementById('why_'+key);
        if (el) el.value = parsed[key];
        threeWhys[key] = parsed[key];
      }
    });
    if (status) status.textContent = '✅ AI personalization complete — review and edit as needed.';
    if (status) setTimeout(()=>{ status.textContent=''; }, 4000);
    showToast('✨ Three Whys enhanced by AI!');
    trackEvent('ai_enhance_whys', { company: v.company, industry: v.industry });
  } catch(e) {
    console.error('AI enhance error:', e);
    if (status) status.textContent = '⚠️ AI generation failed — your defaults are still saved.';
    showToast('AI generation failed — defaults retained.');
  } finally {
    aiGenerating = false;
    if (btn) { btn.disabled = false; btn.textContent = '✨ AI enhance'; }
  }
}

/* ─────────────────────────────────────────────────────────────
   RISK OF INACTION
   ───────────────────────────────────────────────────────────── */
function calcRiskOfInaction(r, v) {
  const monthlyLoss = r.annualBenefit / 12;
  const quarterlyLoss = r.annualBenefit / 4;
  const weeklyLoss = r.annualBenefit / 52;
  return { monthlyLoss, quarterlyLoss, weeklyLoss };
}

/* ─────────────────────────────────────────────────────────────
   EXECUTIVE HEADLINE SUMMARY
   Translates model outputs into exec-language bullets
   For CFO + COO + CEO audiences
   ───────────────────────────────────────────────────────────── */
/* Audience definitions — used by buildExecHeadlines and the AI prompt */
const AUDIENCE_CONFIG = {
  cfo: {
    key: 'cfo', label: 'CFO', icon: '💰', color: '#185FA5',
    description: 'Financial focus — cost, ROI, NPV, payback',
    aiInstruction: 'Write for a CFO audience. Lead with hard financial metrics: NPV, ROI, payback period, total cost of ownership, and working capital impact. Every sentence should be defensible with the numbers in the model. Avoid operational detail unless it directly ties to a dollar figure.',
  },
  coo: {
    key: 'coo', label: 'COO / VP Operations', icon: '⚙️', color: '#0F6E56',
    description: 'Operational focus — efficiency, accuracy, headcount',
    aiInstruction: 'Write for a COO or VP of Operations audience. Focus on process improvement, accuracy rates, headcount efficiency, cycle time reduction, and operational risk elimination. Translate financial figures into operational outcomes (e.g. hours saved, error rates reduced, stockouts prevented).',
  },
  ceo: {
    key: 'ceo', label: 'CEO / Executive Sponsor', icon: '🎯', color: '#042C53',
    description: 'Strategic focus — growth, risk, competitive advantage',
    aiInstruction: 'Write for a CEO or executive sponsor audience. Focus on strategic positioning, competitive differentiation, growth enablement, and enterprise risk reduction. Connect inventory accuracy to the broader business strategy. Minimize granular financial or operational detail — executives want the "so what", not the mechanics.',
  },
  cio: {
    key: 'cio', label: 'CIO / CTO', icon: '💻', color: '#5B2D8E',
    description: 'Technology focus — integration, architecture, IT displacement, scalability',
    aiInstruction: 'Write for a CIO or CTO audience. Focus on technology integration, system architecture, IT cost displacement, implementation risk, time-to-value, and scalability. Address how Cloud Inventory integrates with the existing ERP and technology stack, the effort required from the IT team, and the elimination of legacy technical debt. Quantify IT cost savings and reduced maintenance burden. Emphasise the no-code configuration model that reduces dependence on IT for ongoing changes. Avoid financial jargon — frame value in technology and architecture terms.',
  },
  mixed: {
    key: 'mixed', label: 'Mixed audience', icon: '👥', color: '#3C3489',
    description: 'All personas — CFO, COO, CEO, and CIO/CTO',
    aiInstruction: 'Write for a mixed executive audience that includes a CFO (cost/ROI), COO (operational efficiency), CEO (strategic risk/growth), and CIO/CTO (technology integration and IT displacement). Each Why should contain at least one hook for each persona — open with the strategic framing, support with operational and technology proof, and close with financial justification.',
  }
};

let execAudience = 'mixed'; // default

function getExecAudience(v) {
  if (v && v.execAudience) return v.execAudience;
  const el = document.getElementById('execAudience');
  return el ? el.value || 'mixed' : execAudience;
}

function buildExecHeadlines(v, r) {
  const indLabel = v.industry && IND[v.industry] ? IND[v.industry].label : 'your operations';
  const payStr = r.payback === null ? 'within the first year' :
    r.payback <= 12 ? `in approximately ${r.payback.toFixed(0)} months` :
    r.payback >= 60 ? 'within 5 years' : `in approximately ${r.payback.toFixed(0)} months`;
  const audience = getExecAudience(v);

  /* All four cards — always built, filtered below */
  const all = [
    {
      key: 'cfo',
      audience: 'CFO',
      icon: '💰',
      color: '#185FA5',
      headline: `${fmtFull(r.npv5)} in net present value over 5 years`,
      detail: `A total year-1 investment of ${fmtFull(r.totalInvestY1)} generates ${fmtFull(r.annualBenefit)} in annual recurring benefit — a ${fmtPct(r.roi)} first-year return with payback ${payStr}. The 5-year NPV of ${fmtFull(r.npv5)} at a ${fmtPct(v.discRate*100)} discount rate delivers strong risk-adjusted returns that meet or exceed most capital allocation hurdle rates.`
    },
    {
      key: 'coo',
      audience: 'COO / VP Operations',
      icon: '⚙️',
      color: '#0F6E56',
      headline: `${fmtFull(r.laborSav + r.shrinkSav)} in annual labor and inventory loss reduction`,
      detail: `${Math.round(v.users)} inventory users reclaim an estimated ${fmtPct(v.mLabor*100)} of productive time through scan-verified, directed workflows — eliminating manual counts, paper-based processes, and reconciliation rework. Accuracy improvements reduce write-offs by ${fmtFull(r.shrinkSav)} and free ${fmtFull(r.carrySav)} in carrying costs annually.`
    },
    {
      key: 'ceo',
      audience: 'CEO / Executive Sponsor',
      icon: '🎯',
      color: '#042C53',
      headline: `Inventory accuracy as a foundation for scalable growth`,
      detail: `Real-time visibility across warehouse and field operations enables the ${indLabel} business to scale without scaling operational risk or headcount. OTIF improvement of ${fmtPct(v.mOtif*100)} protects ${fmtFull(r.otifSav)} in revenue at risk annually — while a foundation of trusted inventory data enables the automation and customer commitments that create long-term competitive differentiation.`
    },
    {
      key: 'cio',
      audience: 'CIO / CTO',
      icon: '💻',
      color: '#5B2D8E',
      headline: `${fmtFull(r.itSav)}/yr in IT & legacy system cost displacement`,
      detail: `Cloud Inventory is a cloud-native, API-first SaaS platform that integrates with ${v.competitor && COMP[v.competitor] ? 'your existing systems replacing ' + COMP[v.competitor].name : 'any ERP or system of record'} via standard REST APIs — no custom middleware, no on-premise infrastructure, no IT-managed upgrade cycles. No-code configuration means operational teams own changes without raising IT tickets. The ${fmtFull(v.otc)} one-time implementation cost covers full ERP integration, data migration, and go-live, with typical project delivery in ${v.implMonths || 3} months.`
    }
  ];

  /* Filter based on selected audience — show ONLY that persona's card.
     Mixed audience shows all four at equal weight. */
  if (audience === 'mixed') return all;

  const primary = all.find(h => h.key === audience);
  return primary ? [{ ...primary, isPrimary: true }] : all;
}

function buildHeadlineSection(headlines, v) {
  const audience = getExecAudience(v);
  const audienceCfg = AUDIENCE_CONFIG[audience] || AUDIENCE_CONFIG.mixed;
  const audienceLabel = audience !== 'mixed'
    ? `<div class="e-audience-badge" style="background:${audienceCfg.color}20;color:${audienceCfg.color};border:1px solid ${audienceCfg.color}40;">
        ${audienceCfg.icon} Tailored for: ${audienceCfg.label}
       </div>`
    : '';

  return `
    <div class="e-section">
      <div class="e-h2">Executive summary ${audienceLabel}</div>
      ${headlines.map(h => `
        <div class="e-headline-card ${h.isPrimary ? 'e-headline-primary' : ''} ${h.isSupporting ? 'e-headline-supporting' : ''}"
          style="border-left:4px solid ${h.color}${h.isSupporting ? '60' : ''};">
          <div class="e-headline-audience" style="color:${h.color}${h.isSupporting ? '90' : ''};">
            ${h.icon} ${h.audience}${h.isSupporting ? ' <span style="font-size:9px;font-weight:400;opacity:.7">(supporting context)</span>' : ''}
          </div>
          <div class="e-headline-text" style="${h.isSupporting ? 'font-size:12px;color:#475569;' : ''}">${h.headline}</div>
          <div class="e-headline-detail" style="${h.isSupporting ? 'color:#64748B;' : ''}">${h.detail}</div>
        </div>`).join('')}
    </div>`;
}

/* ─────────────────────────────────────────────────────────────
   IMPLEMENTATION TIMELINE
   ───────────────────────────────────────────────────────────── */
function buildTimeline() {
  return [
    { phase: 'Phase 1', name: 'Kickoff & configure', weeks: 'Weeks 1–3', color: '#185FA5',
      steps: ['Project kickoff and stakeholder alignment','ERP integration mapping and setup','System configuration — workflows, locations, users','Data migration — items, locations, on-hand counts'] },
    { phase: 'Phase 2', name: 'Pilot & train', weeks: 'Weeks 4–5', color: '#0F6E56',
      steps: ['Pilot go-live with core warehouse team','Mobile device provisioning and scanning setup','End-user training — typically 2–4 hours per user','Parallel run with existing system for validation'] },
    { phase: 'Phase 3', name: 'Full go-live', weeks: 'Week 6+', color: '#3C3489',
      steps: ['Full production go-live across all locations','Hypercare support period — daily check-ins','Field inventory module activation if applicable','First cycle count and accuracy benchmark established'] },
  ];
}

/* ─────────────────────────────────────────────────────────────
   DECISION CRITERIA CHECKLIST
   ───────────────────────────────────────────────────────────── */
function buildDecisionCriteria(v) {
  const compName = v.competitor && COMP[v.competitor] ? COMP[v.competitor].name : 'alternatives';
  return [
    { criterion: 'Mobile-first, warehouse and field in one platform', ci: true,  comp: false, note: 'Field Inventory is unique to CI' },
    { criterion: 'No-code configuration — adapts to your processes',  ci: true,  comp: false, note: 'vs. ABAP/custom dev' },
    { criterion: 'Go-live in weeks, not months or years',              ci: true,  comp: false, note: 'Avg. 6-week implementation' },
    { criterion: 'ERP-agnostic API-first integration',                 ci: true,  comp: null,  note: 'Connects to any ERP' },
    { criterion: 'Real-time scan verification at every transaction',   ci: true,  comp: null,  note: 'Not batch/end-of-day' },
    { criterion: 'Total cost of ownership over 3 years',               ci: true,  comp: false, note: `${fmtFull(calcROI(v).totalCost3)} vs estimated ${fmtFull(calcROI(v).totalCost3 * 3)} for ${compName}` },
    { criterion: 'Offline capability for remote / poor-connectivity sites', ci: true, comp: null, note: 'Critical for field ops' },
    { criterion: 'SaaS / cloud-native — no on-premise infrastructure', ci: true,  comp: null,  note: 'No servers, no upgrades' },
    { criterion: `Proven ${IND[v.industry]?.label || 'industry'} customer base`, ci: true, comp: null, note: 'Reference customers available' },
  ];
}

/* ─────────────────────────────────────────────────────────────
   NEXT STEPS SECTION
   ───────────────────────────────────────────────────────────── */
function buildNextSteps() {
  const today = new Date();
  const in2weeks = new Date(today.getTime() + 14*24*60*60*1000);
  const in30days = new Date(today.getTime() + 30*24*60*60*1000);
  const in45days = new Date(today.getTime() + 45*24*60*60*1000);
  const fmt = d => d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  return [
    { by: fmt(in2weeks), action: 'Technical discovery call', detail: 'Review ERP integration requirements, user roles, and site configuration. Refine ROI assumptions based on confirmed data.' },
    { by: fmt(in30days), action: 'Live product demonstration', detail: 'Tailored demo focused on your specific workflows — warehouse receiving, cycle counts, field inventory, and ERP sync.' },
    { by: fmt(in45days), action: 'Pilot program proposal', detail: 'Agree on pilot scope (1–2 sites, 4–6 weeks), success metrics, and go-live timeline. Begin procurement process.' },
  ];
}

/* ─────────────────────────────────────────────────────────────
   RENDER: Full enhanced executive document
   Called from app.js renderExec()
   ───────────────────────────────────────────────────────────── */
function buildNarrativeSections(v, r) {
  saveThreeWhys();
  const roi = calcRiskOfInaction(r, v);
  const headlines = buildExecHeadlines(v, r);
  const timeline = buildTimeline();
  const criteria = buildDecisionCriteria(v);
  const nextSteps = buildNextSteps();
  const indLabel = v.industry && IND[v.industry] ? IND[v.industry].label : '—';

  /* ── Executive headline summary (audience-aware) ── */
  const headlineSection = buildHeadlineSection(headlines, v);

  /* ── Three Whys ── */
  const why_act = threeWhys.act || THREE_WHYS_LIBRARY[v.industry]?.act || THREE_WHYS_LIBRARY.default.act;
  const why_ci  = threeWhys.ci  || THREE_WHYS_LIBRARY[v.industry]?.ci  || THREE_WHYS_LIBRARY.default.ci;
  const why_now = threeWhys.now || THREE_WHYS_LIBRARY[v.industry]?.now || THREE_WHYS_LIBRARY.default.now;

  const whysSection = `
    <div class="e-section">
      <div class="e-h2">The business case — three critical questions</div>
      <div class="e-why-card" style="border-left:4px solid #C62828;">
        <div class="e-why-label" style="color:#C62828;">01 &nbsp;WHY ACT AT ALL?</div>
        <div class="e-why-sub">The cost of the status quo</div>
        <div class="e-why-text">${why_act}</div>
      </div>
      <div class="e-why-card" style="border-left:4px solid #185FA5;">
        <div class="e-why-label" style="color:#185FA5;">02 &nbsp;WHY CLOUD INVENTORY?</div>
        <div class="e-why-sub">Why this solution, not an alternative</div>
        <div class="e-why-text">${why_ci}</div>
      </div>
      <div class="e-why-card" style="border-left:4px solid #2E7D32;">
        <div class="e-why-label" style="color:#2E7D32;">03 &nbsp;WHY NOW?</div>
        <div class="e-why-sub">The urgency to act in this window</div>
        <div class="e-why-text">${why_now}</div>
      </div>
    </div>`;

  /* ── Risk of inaction ── */
  const roiSection = `
    <div class="e-section">
      <div class="e-h2">Risk of inaction — the cost of delay</div>
      <div class="e-roi-strip">
        <div class="e-roi-cell">
          <div class="e-roi-period">Every week of delay costs</div>
          <div class="e-roi-amount" style="color:#C62828;">${fmtFull(roi.weeklyLoss)}</div>
          <div class="e-roi-label">in avoidable losses</div>
        </div>
        <div class="e-roi-cell e-roi-featured">
          <div class="e-roi-period">Every month of delay costs</div>
          <div class="e-roi-amount" style="color:#C62828;">${fmtFull(roi.monthlyLoss)}</div>
          <div class="e-roi-label">in avoidable losses</div>
        </div>
        <div class="e-roi-cell">
          <div class="e-roi-period">Every quarter of delay costs</div>
          <div class="e-roi-amount" style="color:#C62828;">${fmtFull(roi.quarterlyLoss)}</div>
          <div class="e-roi-label">in avoidable losses</div>
        </div>
      </div>
      <p class="e-footnote">Delay cost is calculated as the annualized benefit (${fmtFull(r.annualBenefit)}/yr) divided by the period. This represents value that is foregone for every period the current state continues.</p>
    </div>`;

  /* ── Implementation timeline ── */
  const timelineSection = `
    <div class="e-section">
      <div class="e-h2">Path to value — typical implementation timeline</div>
      <div class="e-timeline">
        ${timeline.map((phase, i) => `
          <div class="e-timeline-phase">
            <div class="e-timeline-header" style="background:${phase.color};">
              <div class="e-tl-phase">${phase.phase}</div>
              <div class="e-tl-name">${phase.name}</div>
              <div class="e-tl-weeks">${phase.weeks}</div>
            </div>
            <div class="e-timeline-steps">
              ${phase.steps.map(s => `<div class="e-tl-step">✓ ${s}</div>`).join('')}
            </div>
          </div>
          ${i < timeline.length-1 ? '<div class="e-timeline-arrow">→</div>' : ''}`).join('')}
      </div>
      <div style="margin-top:.75rem;font-size:10px;color:#64748B;">Timeline is indicative. Actual duration depends on integration complexity, site count, and data migration scope. Cloud Inventory implementations average 4–8 weeks to full production go-live.</div>
    </div>`;

  /* ── Decision criteria ── */
  const criteriaSection = `
    <div class="e-section">
      <div class="e-h2">Evaluation framework — what a great solution looks like</div>
      <table class="e-criteria-tbl">
        <thead><tr><th class="left">Evaluation criterion</th><th>Cloud Inventory</th><th>${v.competitor && COMP[v.competitor] ? COMP[v.competitor].name : 'Status quo'}</th><th class="left">Notes</th></tr></thead>
        <tbody>
          ${criteria.map(c => `
            <tr>
              <td class="left">${c.criterion}</td>
              <td class="ci-yes">✓</td>
              <td class="${c.comp===false?'ci-no':c.comp===null?'ci-partial':'ci-yes'}">${c.comp===false?'✗':c.comp===null?'~':'✓'}</td>
              <td class="left" style="font-size:10px;color:#64748B;">${c.note}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:.5rem;font-size:10px;color:#94A3B8;">✓ = Full capability &nbsp;~ = Partial / requires configuration &nbsp;✗ = Not available or requires separate solution</div>
    </div>`;

  /* ── Next steps ── */
  const nextSection = `
    <div class="e-section e-next-steps">
      <div class="e-h2">Recommended next steps</div>
      ${nextSteps.map((step, i) => `
        <div class="e-next-row">
          <div class="e-next-num" style="background:#042C53;">${i+1}</div>
          <div class="e-next-body">
            <div class="e-next-by">By ${step.by}</div>
            <div class="e-next-action">${step.action}</div>
            <div class="e-next-detail">${step.detail}</div>
          </div>
        </div>`).join('')}
      <div class="e-next-cta">
        <div class="e-next-cta-text">Ready to move forward?</div>
        <div style="font-size:11px;color:#7DB8DC;margin-top:4px;">Contact your Cloud Inventory representative to schedule the next step &nbsp;·&nbsp; cloudinventory.com</div>
      </div>
    </div>`;

  return { headlineSection, whysSection, roiSection, timelineSection, criteriaSection, nextSection };
}
