/* ═══════════════════════════════════════════════════════════════════
   assistant.js — in-app AI assistant ("Ask")

   A floating button opens a chat panel available on every screen. It answers
   questions about fields, how to use the app, and what the calculations and
   questions mean.

   Grounding policy (per product decision): answer primarily from the app's
   own knowledge base below; Claude's general knowledge MAY be used to add
   helpful context, but whenever the answer goes beyond what's documented
   here, it must say so clearly. It must never invent how THIS app's
   calculations work.

   Security: calls go through /api/enhance (server-side proxy) — the API key
   never reaches the browser. Same endpoint the Three-Whys enhancer uses.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Knowledge base: the app's own authoritative content ──────────
     Kept concise and factual. This is what makes the assistant accurate
     to THIS app rather than a generic ROI chatbot. */
  var KB = [
    '# Cloud Inventory ROI Business Case Builder — assistant knowledge',
    '',
    '## What the app is',
    'A tool for Cloud Inventory sales teams to build data-driven executive business cases for prospects evaluating Cloud Inventory\'s warehouse management (WMS) and field inventory / MEP products. Reps enter a prospect\'s operational figures; the app computes a defensible ROI and produces an executive presentation and PDF.',
    '',
    '## The main workflow (tabs, in order)',
    '1. Calculator — enter the prospect\'s figures and see ROI update live.',
    '2. Discovery — structured questions to uncover value drivers; answers can sync into the calculator.',
    '3. Executive presentation — a polished summary for decision-makers, exportable to PDF and PowerPoint.',
    '4. Solution Fit — an internal + customer-facing handoff from sales engineering.',
    'A prospect can also be sent a shareable Discovery link to answer questions themselves.',
    '',
    '## How the ROI is calculated (methodology)',
    'The ROI combines several independent value levers, each based on the prospect\'s own inputs:',
    '- Labor productivity: time currently lost to manual counting, data entry, and reconciliation.',
    '- Inventory accuracy / shrinkage: reduction in write-offs and losses as record accuracy improves.',
    '- Carrying cost: working capital freed as inventory turns improve.',
    '- OTIF (on-time-in-full): revenue protected by improving order/delivery reliability.',
    '- IT / legacy cost: savings from retiring current tools and workarounds.',
    '- Field service levers (MEP): fewer repeat visits, recovered technician time, reduced field-inventory leakage — only when those fields are filled in.',
    'A 15% overlap deduction is applied to carrying-cost savings to avoid double-counting, and is disclosed in the footnotes. Benefits are phased in over the first three years using ramp percentages (year 1 partial, ramping to full), so year-1 net benefit is lower than steady-state. Payback is the point where cumulative benefit exceeds the investment. The model is server-authoritative: figures are recomputed on save, so numbers cannot be tampered with client-side.',
    '',
    '## Field service (MEP) drivers',
    'These are optional and collapsed by default — not every deal has a field-service component. If left blank they contribute $0 and are excluded from the ROI. Expand them only for prospects who run field service or van stock.',
    '',
    '## Key terms',
    '- OTIF: On-Time-In-Full — the share of orders delivered complete and on schedule. A core service-level metric.',
    '- Inventory turns: how many times inventory is sold and replaced in a year; higher turns mean less cash tied up.',
    '- Shrinkage / write-off: inventory lost to damage, expiry, theft, or error.',
    '- Carrying cost: the cost of holding inventory (capital, storage, insurance, obsolescence).',
    '- Ramp: the phased realization of benefits over the first years after go-live.',
    '- WMS: warehouse management system. MEP / CIP / CPP: Cloud Inventory\'s field and mobile product lines.',
    '',
    '## Sharing & tracking',
    'Scenario, business-case, and discovery links are trackable — the rep can see when a link has been opened. Scenario share links can also be revoked. A scenario must be saved before it can be shared, because tracking is tied to the saved record.',
    '',
    '## Common how-to',
    '- Switch between a customer\'s scenarios: use the scenario dropdown in the calculator header (no need to leave the page).',
    '- See earlier saved versions: use the version history button next to the scenario dropdown.',
    '- Guided mode: a step-by-step walkthrough of the calculator, one section at a time, with a numbered progress stepper.',
    '- Export: the Executive presentation tab has Download PDF and PowerPoint export.'
  ].join('\n');

  var SYSTEM_PROMPT =
    'You are the built-in assistant for the Cloud Inventory ROI Business Case Builder, helping sales reps and solution engineers use the app. ' +
    'Answer questions about fields, how to use the application, and what the calculations and questions mean.\n\n' +
    'GROUNDING RULES (important):\n' +
    '1. Answer primarily from the KNOWLEDGE BASE below. When the knowledge base covers the question, rely on it and be specific to this app.\n' +
    '2. You MAY use your general knowledge to add helpful context (e.g. general industry background on a metric). But whenever your answer goes beyond what the knowledge base documents, add a brief, clear note such as: "(This is general background, not specific to how this app is configured.)"\n' +
    '3. NEVER invent or guess how THIS app\'s calculations, fields, or features work. If the knowledge base doesn\'t cover a specific detail of the app\'s behavior, say you\'re not certain and suggest checking with their admin or the Help guide.\n' +
    '4. Stay in scope: the app and its concepts. Do not provide a specific prospect\'s ROI figure, act as a general business consultant, or give legal/financial advice.\n' +
    '5. Be concise and practical — a few sentences is usually enough. Use plain language.\n\n' +
    'KNOWLEDGE BASE:\n' + KB;

  var STARTERS = [
    'How is the ROI calculated?',
    'What does OTIF mean?',
    'How do I share a scenario with a prospect?',
    'Why are the field service questions optional?'
  ];

  var history = [];   // {role, content} — in memory only, per session
  var busy = false;

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
  /* Minimal, safe markdown: paragraphs, **bold**, and - bullets. */
  function mdToHtml(s) {
    var safe = esc(s);
    var lines = safe.split('\n');
    var out = [], inList = false;
    lines.forEach(function (ln) {
      var b = ln.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      if (/^\s*[-•]\s+/.test(ln)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + b.replace(/^\s*[-•]\s+/, '') + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (b.trim()) out.push('<p>' + b + '</p>');
      }
    });
    if (inList) out.push('</ul>');
    return out.join('');
  }

  function build() {
    if (document.getElementById('asstFab')) return;

    var fab = el('button', 'asst-fab');
    fab.id = 'asstFab';
    fab.setAttribute('aria-label', 'Open the assistant');
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Ask</span>';
    fab.onclick = openPanel;

    var panel = el('div', 'asst-panel');
    panel.id = 'asstPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Assistant');
    panel.innerHTML =
      '<div class="asst-head">' +
        '<div class="asst-title"><span class="asst-dot"></span> Assistant</div>' +
        '<button class="asst-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="asst-body" id="asstBody"></div>' +
      '<div class="asst-input">' +
        '<textarea id="asstInput" rows="1" placeholder="Ask about a field, a calculation, or how to do something…"></textarea>' +
        '<button id="asstSend" aria-label="Send">Send</button>' +
      '</div>' +
      '<div class="asst-foot">Answers are AI-generated and may not reflect your exact configuration.</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    panel.querySelector('.asst-close').onclick = closePanel;
    panel.querySelector('#asstSend').onclick = send;
    var ta = panel.querySelector('#asstInput');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    ta.addEventListener('input', function () {
      ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });

    renderWelcome();
  }

  function renderWelcome() {
    var body = document.getElementById('asstBody');
    if (!body || history.length) return;
    var chips = STARTERS.map(function (q) {
      return '<button class="asst-chip">' + esc(q) + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="asst-msg asst-bot"><div class="asst-bubble">' +
        'Hi — I can help with fields, calculations, discovery questions, and how to use the app. Ask me anything, or start with:' +
      '</div></div>' +
      '<div class="asst-chips">' + chips + '</div>';
    Array.prototype.forEach.call(body.querySelectorAll('.asst-chip'), function (c) {
      c.onclick = function () { document.getElementById('asstInput').value = c.textContent; send(); };
    });
  }

  function openPanel() {
    var p = document.getElementById('asstPanel');
    if (p) { p.classList.add('open'); setTimeout(function(){ var i=document.getElementById('asstInput'); if(i) i.focus(); }, 60); }
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
    var input = document.getElementById('asstInput');
    var q = (input.value || '').trim();
    if (!q) return;

    // Clear the welcome/starters on first real message.
    if (!history.length) { var b=document.getElementById('asstBody'); if(b) b.innerHTML=''; }

    input.value = ''; input.style.height = 'auto';
    addMsg('user', esc(q));
    history.push({ role: 'user', content: q });

    busy = true;
    var sendBtn = document.getElementById('asstSend');
    if (sendBtn) sendBtn.disabled = true;
    var thinking = addMsg('bot', '<span class="asst-typing"><i></i><i></i><i></i></span>');

    try {
      var resp = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 700,
          system: SYSTEM_PROMPT,
          messages: history.slice(-10)   // keep recent turns for context
        })
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      var text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : '';
      if (!text) throw new Error('Empty response');
      if (thinking) thinking.remove();
      addMsg('bot', mdToHtml(text));
      history.push({ role: 'assistant', content: text });
    } catch (e) {
      if (thinking) thinking.remove();
      addMsg('bot', '<span class="asst-err">Sorry — I couldn\'t reach the assistant just now. Please try again in a moment.</span>');
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
