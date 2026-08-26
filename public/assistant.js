/* ═══════════════════════════════════════════════════════════════════
   assistant.js — in-app AI assistant (Pass 2)

   Pass 2 adds context-awareness: the assistant knows which tab is active,
   which field (if any) was most recently focused, and the current
   scenario name / company — so "what does this mean?" resolves without
   the rep having to name the field.

   Session guarantee: history is scoped to THIS page load only.
   No localStorage, no sessionStorage — nothing carries between sessions.

   Security: calls go through /api/enhance (server-side proxy). API key
   never reaches the browser. Auth-gated + rate-limited on the server.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Knowledge base ───────────────────────────────────────────── */
  var KB = [
    '# Cloud Inventory ROI Business Case Builder — assistant knowledge base',
    '',
    '## What the app does',
    'A tool for Cloud Inventory sales teams to build data-driven executive business cases for prospects evaluating Cloud Inventory\'s warehouse management (WMS) and field inventory / MEP products. Reps enter a prospect\'s operational figures; the app computes a defensible ROI and produces an executive presentation and PDF.',
    '',
    '## Tabs and workflow',
    '- Calculator: enter prospect figures, see ROI update live. Use the scenario dropdown to switch between this customer\'s scenarios without leaving the page. Save before sharing.',
    '- Discovery: structured qualification questions that map to the ROI value drivers. Answers sync into the calculator.',
    '- Executive presentation: polished summary for decision-makers — exportable to PDF and PowerPoint.',
    '- Solution Fit: internal + customer-facing SE handoff.',
    '- Sensitivity / Compare: test assumptions and compare scenarios side by side.',
    '- Stakeholder map, MAP, Impact: relationship and deal-management tools.',
    '- Saved scenarios: version history and sharing. Every save appends a new version; nothing is overwritten.',
    '',
    '## ROI methodology',
    'The ROI combines independent value levers based on the prospect\'s own inputs:',
    '- Labor productivity: time saved from manual counting, data entry, and reconciliation.',
    '- Inventory accuracy / shrinkage: reduction in write-offs as accuracy improves.',
    '- Carrying cost: annual holding-cost reduction, with turns overlap removed.',
    '- OTIF (on-time-in-full): revenue protected by improving delivery reliability.',
    '- IT / legacy cost: savings from retiring current tools.',
    '- Field service (MEP, optional): fewer repeat visits, recovered technician time, reduced van-stock leakage. Left blank, these contribute $0.',
    'Direct carrying-reduction and turns-based carrying estimates are not added together; only the higher combined estimate is counted. Benefits follow the configured implementation and monthly ramp across the full five-year horizon. Payback is based on cumulative net cash flow after one-time and recurring investment. The model is server-authoritative — figures are recomputed on save.',
    '',
    '## Calculator fields — primary drivers',
    'These five inputs drive most of the ROI. They are visually emphasized in the calculator:',
    '- Annual revenue ($): used to calculate OTIF value-at-risk — the revenue exposed when delivery reliability slips.',
    '- Inventory users: everyone who touches inventory data (warehouse, field, office). Sizes the labor-productivity lever.',
    '- Avg. labor cost / user / yr ($): fully-loaded cost (salary + benefits + overhead). Default is $55,000.',
    '- Warehouse inventory value on hand ($): point-in-time value, excluding field inventory entered separately. Drives carrying-cost and shrinkage levers.',
    '- Current IT / legacy cost / yr ($): annual spend on existing tools and workarounds that Cloud Inventory would replace.',
    '',
    '## Calculator fields — other important inputs',
    '- Current accuracy (%): the share of inventory records that match physical counts. Industry average ~72%.',
    '- Annual write-off / shrinkage ($): inventory lost to damage, expiry, theft, or error per year.',
    '- OTIF baseline / target (%): current and desired on-time-in-full performance. The gap drives the revenue-protection calculation.',
    '- Inventory turns (current / benchmark): how many times inventory cycles per year. Closing the gap to benchmark frees working capital.',
    '- Downtime events / yr and cost per hour: production interruptions caused by parts not being where records say.',
    '- Expedite spend / yr ($): rush freight and premium sourcing — a direct symptom of poor inventory data.',
    '- Annual subscription cost ($): Cloud Inventory license cost, used in the net-benefit and payback calculation.',
    '',
    '## Key terms',
    '- OTIF: On-Time-In-Full — orders delivered complete and on schedule. A core service-level metric.',
    '- Inventory turns: times inventory is sold/replaced per year. Higher = less cash tied up.',
    '- Shrinkage: inventory lost to damage, expiry, theft, or unrecorded consumption.',
    '- Carrying cost: cost of holding inventory — capital, storage, insurance, obsolescence. Typically 20–30% of inventory value per year.',
    '- Ramp: phased benefit realization in years 1–3 post go-live.',
    '- WMS: warehouse management system.',
    '- MEP / CIP / CPP: Cloud Inventory field and mobile product lines.',
    '- Payback period: months until cumulative benefit equals total investment.',
    '- NPV: net present value — future benefits discounted to today\'s dollars.',
    '',
    '## Sharing and tracking',
    '- Scenario share links: trackable and revocable. The app shows when a link has been opened. Scenario must be saved before sharing.',
    '- Business-case links (Executive tab): tracked independently.',
    '- Discovery links (sent to prospects): tracked when the prospect opens and submits.',
    '- All share links are token-based — they can be revoked from the Saved tab.',
    '',
    '## Guided mode',
    'A step-by-step walkthrough of the calculator (one section at a time). The numbered stepper at the top shows which of the five sections is current and which are complete. Toggle it with the Guided mode switch in the calculator header.',
    '',
    '## Common how-to',
    '- Switch scenarios: use the scenario dropdown in the calculator header (no need to leave the page).',
    '- See earlier versions: click the version history button next to the scenario dropdown.',
    '- Send to a prospect: save the scenario, then click Share in the header.',
    '- Generate PDF: Executive tab → Download PDF. Scenario must have enough data to render.',
    '- Export PowerPoint: Executive tab → PowerPoint button.',
    '- Send discovery questionnaire: Discovery tab → generate a prospect link.'
  ].join('\n');

  /* ── Tab context: what to add to the system prompt per active tab ─ */
  var TAB_CONTEXT = {
    'tab-calc':        'The rep is currently on the CALCULATOR tab, entering prospect data.',
    'tab-disc':        'The rep is currently on the DISCOVERY tab, reviewing or editing qualification questions.',
    'tab-exec':        'The rep is currently on the EXECUTIVE PRESENTATION tab, reviewing the business case summary and export options.',
    'tab-solfit':      'The rep is currently on the SOLUTION FIT tab, completing the SE handoff.',
    'tab-comp':        'The rep is currently on the SENSITIVITY tab, adjusting assumptions to test scenarios.',
    'tab-sensitivity': 'The rep is currently on the SENSITIVITY tab.',
    'tab-compare':     'The rep is currently on the COMPARE tab, comparing multiple scenarios.',
    'tab-map':         'The rep is currently on the MAP (mutual action plan) tab.',
    'tab-stake':       'The rep is currently on the STAKEHOLDER MAP tab.',
    'tab-saved':       'The rep is currently on the SAVED SCENARIOS tab.',
    'tab-analytics':   'The rep is currently on the ANALYTICS tab.',
    'tab-impact':      'The rep is currently on the IMPACT tab.',
    'tab-help':        'The rep is currently on the HELP tab.'
  };

  /* Field-label map: input id → human-readable label.
     Used so "what does this field mean?" resolves to the focused field. */
  var FIELD_LABELS = {
    revenue:'Annual revenue', userCount:'Inventory users', laborCost:'Avg. labor cost per user per year',
    inventoryValue:'Warehouse inventory value on hand', itCost:'Current IT / legacy cost per year',
    currentAccuracy:'Current inventory accuracy %', annualWriteOff:'Annual write-off / shrinkage',
    otifBaseline:'Current OTIF %', otifTarget:'Target OTIF %',
    invTurnsCurrent:'Current inventory turns', invTurnsBenchmark:'Benchmark inventory turns',
    downtimeEventsYr:'Downtime events per year', downtimeCostPerHr:'Cost per hour of downtime',
    expediteSpendYr:'Annual expedite spend', invest:'Annual subscription cost',
    repeatVisitsYr:'Repeat / return visits per year', costPerTruckRoll:'Cost per truck roll',
    fieldTechs:'Field technicians', revenuePerJob:'Revenue per job', fieldInventoryValue:'Field inventory value',
    ramp1:'Year 1 ramp %', ramp2:'Year 2 ramp %', ramp3:'Year 3 ramp %', discRate:'Discount rate',
    scenarioName:'Scenario name', companyName:'Company name', repName:'Rep name',
    industry:'Industry', competitor:'Primary competitor'
  };

  /* ── State: page-load scoped only. Nothing persists. ─────────── */
  var history  = [];   // cleared on every page load (module-level var)
  var lastFocusedField = null;   // most recently focused input id
  var busy = false;

  /* ── Context snapshot (called at send time) ───────────────────── */
  function getContext() {
    var lines = [];
    // Active tab
    var pane = document.querySelector('.pane.active');
    if (pane && TAB_CONTEXT[pane.id]) lines.push(TAB_CONTEXT[pane.id]);
    // Last focused field
    if (lastFocusedField && FIELD_LABELS[lastFocusedField]) {
      lines.push('The most recently focused calculator field is: "' + FIELD_LABELS[lastFocusedField] + '" (id: ' + lastFocusedField + ').');
    }
    // Scenario / company in play
    var co  = (document.getElementById('companyName') || {}).value;
    var scn = (document.getElementById('scenarioName') || {}).value;
    if (co && co.trim())  lines.push('Current prospect / company: ' + co.trim() + '.');
    if (scn && scn.trim()) lines.push('Current scenario name: ' + scn.trim() + '.');
    // Guided mode
    if (typeof isGuidedOn === 'function' && isGuidedOn()) lines.push('Guided mode is currently ON.');
    return lines.length ? '\n\nCURRENT CONTEXT:\n' + lines.join('\n') : '';
  }

  function buildSystemPrompt() {
    return 'You are the built-in assistant for the Cloud Inventory ROI Business Case Builder, ' +
      'helping sales reps and solution engineers use the app. Answer questions about fields, ' +
      'calculations, how to use the application, and what things mean.\n\n' +
      'GROUNDING RULES:\n' +
      '1. Answer primarily from the KNOWLEDGE BASE below. Be specific to this app.\n' +
      '2. You MAY use general knowledge to add helpful context. When you do, flag it briefly: ' +
         '"(general background — not specific to this app\'s configuration)."\n' +
      '3. Never invent or guess how THIS app\'s calculations or features work. If the knowledge ' +
         'base doesn\'t cover a detail, say you\'re not certain and suggest the Help tab or their admin.\n' +
      '4. Stay in scope: the app and its concepts. Do not give a specific prospect\'s ROI number ' +
         'or act as a general business consultant.\n' +
      '5. If context shows a focused field, lead with what that specific field means in this app.\n' +
      '6. Be concise — a few sentences is usually right.\n\n' +
      'KNOWLEDGE BASE:\n' + KB;
  }

  /* ── Field focus tracking ─────────────────────────────────────── */
  function trackFocus(e) {
    var t = e.target;
    if (t && t.id && FIELD_LABELS[t.id]) lastFocusedField = t.id;
  }
  document.addEventListener('focusin', trackFocus, true);

  /* ── UI helpers ───────────────────────────────────────────────── */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function mdToHtml(s) {
    var safe = esc(s);
    var lines = safe.split('\n'), out = [], inList = false;
    lines.forEach(function (ln) {
      var b = ln.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
      if (/^\s*[-•]\s+/.test(ln)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + b.replace(/^\s*[-•]\s+/,'') + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (b.trim()) out.push('<p>' + b + '</p>');
      }
    });
    if (inList) out.push('</ul>');
    return out.join('');
  }

  var PERSISTENT_CHIPS = [
    'What does this field mean?',
    'How do I share this with a prospect?'
  ];

  var STARTERS = [
    'What does the field I just clicked mean?',
    'How is ROI calculated?',
    'What does OTIF mean?',
    'How do I share a scenario with a prospect?'
  ];

  function build() {
    if (document.getElementById('asstFab')) return;
    var fab = el('button', 'asst-fab');
    fab.id = 'asstFab';
    fab.setAttribute('aria-label', 'Open assistant');
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Ask</span>';
    fab.onclick = openPanel;

    var panel = el('div', 'asst-panel');
    panel.id = 'asstPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Assistant');
    panel.innerHTML =
      '<div class="asst-head">' +
        '<div class="asst-title"><span class="asst-dot"></span>Assistant</div>' +
        '<button class="asst-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="asst-body" id="asstBody"></div>' +
      '<div class="asst-persist" id="asstPersist"></div>' +
      '<div class="asst-input">' +
        '<textarea id="asstTa" rows="1" placeholder="Ask about a field, calculation, or how to do something…"></textarea>' +
        '<button id="asstSend" aria-label="Send">Send</button>' +
      '</div>' +
      '<div class="asst-foot">AI-generated — may not reflect your exact configuration.</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    panel.querySelector('.asst-close').onclick = closePanel;
    panel.querySelector('#asstSend').onclick = send;
    var ta = panel.querySelector('#asstTa');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
    renderWelcome();
    renderPersistentChips();
  }

  function renderWelcome() {
    var body = document.getElementById('asstBody');
    if (!body || history.length) return;
    var chips = STARTERS.map(function (q) {
      return '<button class="asst-chip">' + esc(q) + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="asst-msg asst-bot"><div class="asst-bubble">' +
        'Hi — I can help with fields, calculations, and how to use the app. ' +
        'Click a field first and then ask what it means, or try:' +
      '</div></div>' +
      '<div class="asst-chips">' + chips + '</div>';
    Array.prototype.forEach.call(body.querySelectorAll('.asst-chip'), function (c) {
      c.onclick = function () {
        var ta = document.getElementById('asstTa');
        if (ta) ta.value = c.textContent;
        send();
      };
    });
  }

  function renderPersistentChips() {
    var bar = document.getElementById('asstPersist');
    if (!bar) return;
    bar.innerHTML = PERSISTENT_CHIPS.map(function (q) {
      return '<button class="asst-chip asst-chip-sm">' + esc(q) + '</button>';
    }).join('');
    Array.prototype.forEach.call(bar.querySelectorAll('.asst-chip'), function (c) {
      c.onclick = function () {
        var ta = document.getElementById('asstTa');
        if (ta) { ta.value = c.textContent; ta.dispatchEvent(new Event('input')); }
        send();
      };
    });
  }

  function openPanel() {
    var p = document.getElementById('asstPanel');
    if (p) {
      p.classList.add('open');
      setTimeout(function () {
        var ta = document.getElementById('asstTa');
        if (ta) ta.focus();
      }, 60);
    }
  }
  function closePanel() {
    var p = document.getElementById('asstPanel');
    if (p) p.classList.remove('open');
  }

  function addMsg(role, html) {
    var body = document.getElementById('asstBody');
    if (!body) return null;
    var wrap = el('div', 'asst-msg ' + (role === 'user' ? 'asst-user' : 'asst-bot'));
    wrap.appendChild(el('div', 'asst-bubble', html));
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
    return wrap;
  }

  async function send() {
    if (busy) return;
    var ta = document.getElementById('asstTa');
    var q = (ta && ta.value || '').trim();
    if (!q) return;
    if (!history.length) {
      var b = document.getElementById('asstBody');
      if (b) b.innerHTML = '';
    }
    ta.value = ''; ta.style.height = 'auto';
    addMsg('user', esc(q));
    history.push({ role: 'user', content: q });

    busy = true;
    var sendBtn = document.getElementById('asstSend');
    if (sendBtn) sendBtn.disabled = true;
    var thinking = addMsg('bot', '<span class="asst-typing"><i></i><i></i><i></i></span>');

    try {
      /* Build the system prompt fresh each time so it always has the
         current context (tab, focused field, company, guided mode). */
      var systemPrompt = buildSystemPrompt() + getContext();

      var resp = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 700,
          system: systemPrompt,
          messages: history.slice(-10)
        })
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      var text = (data.content && data.content[0] && data.content[0].text) || '';
      if (!text) throw new Error('empty');
      if (thinking) thinking.remove();
      addMsg('bot', mdToHtml(text));
      history.push({ role: 'assistant', content: text });
    } catch (e) {
      if (thinking) thinking.remove();
      addMsg('bot', '<span class="asst-err">Couldn\'t reach the assistant. Please try again.</span>');
    } finally {
      busy = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
