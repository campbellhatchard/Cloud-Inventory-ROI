/* ═══════════════════════════════════════════════════════════════════
   prospect-assistant.js — assistant for the prospect discovery page

   SCOPE: answers ONLY questions about the questionnaire the prospect
   is currently completing. It knows nothing about Cloud Inventory's
   internal tool, ROI model, or sales process.

   What it CAN answer:
   - Why a question is being asked (what it helps assess)
   - What a term in a question means (OTIF, inventory turns, etc.)
   - What a good answer looks like / where to find the number
   - What happens with their answers

   What it must NOT answer:
   - Questions about Cloud Inventory's product or pricing
   - How ROI is calculated internally
   - Anything about the sales process

   Session guarantee: history is a plain array, module-scoped.
   It is initialised fresh on every page load. No localStorage,
   no sessionStorage, no cookies. Nothing carries between sessions.

   Security: calls go through /api/enhance on the same origin.
   The prospect link is already auth-checked for session validity.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Questionnaire knowledge base ────────────────────────────────
     Written entirely from the prospect's perspective. No internal
     sales language, no mention of ROI models or levers. */
  var KB = [
    '# About this questionnaire',
    '',
    'You are helping a prospect complete a business operations questionnaire.',
    'The questionnaire asks about their current inventory and operations.',
    'Their answers will be used by their Cloud Inventory contact to understand',
    'their operation and prepare a relevant conversation — nothing more.',
    '',
    '## What the questions cover',
    'The questionnaire covers several areas of their operation:',
    '- Team size and how time is currently spent on inventory-related tasks.',
    '- How accurate their current inventory records are.',
    '- How much stock they hold and how quickly it turns over.',
    '- Whether orders are delivered on time and in full.',
    '- Any production or service interruptions caused by missing parts.',
    '- What they currently spend on inventory software and workarounds.',
    '- (If applicable) field service operations and van stock.',
    '',
    '## Key terms they may not know',
    '- OTIF (On-Time-In-Full): the percentage of orders delivered both complete and',
    '  on schedule. If 95% of orders arrive on time and complete, OTIF = 95%.',
    '  It is a standard logistics performance metric.',
    '- Inventory accuracy: how closely stock records match what is physically on the',
    '  shelf. If the system says 100 units but only 87 are there, accuracy is 87%.',
    '  Measured by periodic or continuous counts.',
    '- Inventory turns (or stock turns): how many times inventory is fully sold and',
    '  replaced in a year. Turns = annual cost of goods sold ÷ average inventory value.',
    '  Higher turns generally mean less cash tied up in stock.',
    '- Carrying cost: the cost of holding inventory — capital tied up, storage space,',
    '  insurance, and the risk of obsolescence. Typically 20–30% of inventory value per year.',
    '- Shrinkage / write-off: stock lost to damage, expiry, theft, or recording errors.',
    '  Usually expressed as an annual dollar value or percentage of inventory.',
    '- Expedite spend: money spent on rush freight or premium sourcing when a part',
    '  is urgently needed and normal supply cannot meet the demand in time.',
    '- Downtime: periods when production or field service stops because the right',
    '  part or material is not available where it is needed.',
    '- First-time fix rate: in field service, the percentage of jobs completed',
    '  successfully on the first visit without needing a return trip.',
    '',
    '## Where to find these numbers',
    '- OTIF: typically in an ERP, order management, or logistics system.',
    '  The distribution or customer service team usually tracks this.',
    '- Inventory accuracy: from the most recent physical or cycle count report.',
    '  The warehouse manager or inventory controller usually has this.',
    '- Inventory value: from the balance sheet or ERP — look for "inventory" under',
    '  current assets. Finance or accounting can provide this.',
    '- Inventory turns: finance or supply chain team, or calculate as:',
    '  annual cost of goods sold ÷ average inventory value.',
    '- Shrinkage / write-off: finance or accounting — look for inventory adjustments',
    '  or write-offs in the annual accounts or ERP.',
    '- Expedite spend: procurement or accounts payable records.',
    '- IT / software cost: finance or IT — annual licence and support fees for',
    '  current inventory or warehouse management systems.',
    '',
    '## What happens with their answers',
    'Their answers are saved securely and shared only with their Cloud Inventory',
    'contact. They are used to prepare a relevant, specific conversation —',
    'not to generate an automated report or score. Partial answers are fine;',
    'they can mark any question "not sure" if they do not have the number to hand.',
    '',
    '## "Not sure" answers',
    'If they do not know a number, they should click "I\'m not sure" rather than',
    'leaving it blank or guessing. This tells their contact which areas to discuss',
    'and where they can help gather the data together.',
    '',
    '## Accuracy',
    'Estimates are fine where exact figures are not available. A reasonable estimate',
    'is more useful than a blank — it gives the conversation a starting point.',
    'They should note if a figure is an estimate rather than an exact number.'
  ].join('\n');

  var SYSTEM_PROMPT =
    'You are a helpful assistant on a business operations questionnaire page. ' +
    'A prospect is completing questions about their inventory and operations. ' +
    'Your job is to help them understand what each question is asking, what terms mean, ' +
    'and where they might find the answers.\n\n' +
    'STRICT SCOPE RULES — you must follow these exactly:\n' +
    '1. ONLY answer questions about the questionnaire they are completing: ' +
       'what terms mean, what a good answer looks like, where to find a number, ' +
       'or why a question is being asked.\n' +
    '2. Do NOT discuss Cloud Inventory\'s products, pricing, ROI models, or sales process.\n' +
    '3. Do NOT act as a general business consultant or give strategic advice.\n' +
    '4. Do NOT tell the prospect what their numbers "should" be or benchmark against them.\n' +
    '5. If asked something outside this scope, say politely that you can only help ' +
       'with the questionnaire itself, and suggest they ask their Cloud Inventory contact.\n' +
    '6. Use plain, friendly language — the prospect may not be technical.\n' +
    '7. Be concise. Two or three sentences is usually enough.\n\n' +
    'KNOWLEDGE BASE:\n' + KB;

  /* Context: which question/section is currently visible on screen.
     Uses IntersectionObserver so the assistant knows what the prospect
     is looking at when they ask. */
  var visibleQuestionId   = null;
  var visibleSectionTitle = null;

  function startObserving() {
    if (!window.IntersectionObserver) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        /* question wrap has id="wrap-<questionId>" */
        if (el.id && el.id.startsWith('wrap-')) {
          visibleQuestionId = el.id.replace('wrap-', '');
          /* Also pull the section title from the nearest sec-card-title */
          var card = el.closest && el.closest('.sec-card');
          var t = card && card.querySelector('.sec-card-title');
          if (t) visibleSectionTitle = t.textContent || null;
        }
      });
    }, { threshold: 0.3 });

    /* observeAll: called after each section renders.
       In the tabbed layout wrap-* elements are replaced on every
       section switch, so we must re-observe each time. */
    function observeAll() {
      document.querySelectorAll('[id^="wrap-"]').forEach(function (el) {
        observer.observe(el);
      });
    }
    observeAll();

    /* Watch mainContent for child changes (section switches in tabbed layout)
       and re-observe newly rendered question wraps. */
    if (window.MutationObserver) {
      var mc = new MutationObserver(function() {
        observeAll();
      });
      var host = document.getElementById('mainContent');
      if (host) mc.observe(host, { childList: true, subtree: false });
    }

    /* Expose globally so showSection() in prospect.html can trigger it
       immediately after a section renders, before scroll starts. */
    window._passtReObserve = observeAll;
  }

  function getContext() {
    var lines = [];
    /* What is the prospect currently looking at? */
    if (visibleSectionTitle) {
      lines.push('The prospect is currently in the "' + visibleSectionTitle + '" section.');
    }
    if (visibleQuestionId) {
      /* Try to get the question text from the DOM so context is specific. */
      var wrap = document.getElementById('wrap-' + visibleQuestionId);
      var qText = wrap && wrap.querySelector('.q-text');
      if (qText && qText.textContent) {
        lines.push('The most recently visible question is: "' + qText.textContent.trim() + '"');
      }
    }
    return lines.length
      ? '\n\nCURRENT CONTEXT (what the prospect is looking at):\n' + lines.join('\n')
      : '';
  }

  /* ── Session-scoped history — never persisted ─────────────────── */
  var history = [];
  var busy    = false;

  /* ── UI helpers (identical pattern to assistant.js) ──────────── */
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
    var safe = esc(s), lines = safe.split('\n'), out = [], inList = false;
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
    'What if I don\'t know the exact number?',
    'Where do I find this number?'
  ];

  var STARTERS = [
    'What does OTIF mean?',
    'Where do I find my inventory accuracy?',
    'What is inventory turns?',
    'What if I don\'t know the exact number?'
  ];

  function build() {
    if (document.getElementById('passtFab')) return;
    var fab = el('button', 'asst-fab passt-fab');
    fab.id = 'passtFab';
    fab.setAttribute('aria-label', 'Open help');
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Help</span>';
    fab.onclick = openPanel;

    var panel = el('div', 'asst-panel passt-panel');
    panel.id = 'passtPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Questionnaire help');
    panel.innerHTML =
      '<div class="asst-head">' +
        '<div class="asst-title"><span class="asst-dot"></span>Questionnaire help</div>' +
        '<button class="asst-close passt-close" aria-label="Close"><span class="asst-close-x">&times;</span><span class="asst-close-label">Close</span></button>' +
      '</div>' +
      '<div class="asst-body" id="passtBody"></div>' +
      '<div class="asst-persist" id="passtPersist"></div>' +
      '<div class="asst-input">' +
        '<textarea id="passtTa" rows="1" placeholder="Ask what a question means or where to find a number…"></textarea>' +
        '<button id="passtSend" aria-label="Send">Send</button>' +
      '</div>' +
      '<div class="asst-foot">Here to help with the questionnaire only. For product questions, contact your Cloud Inventory representative.</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    panel.querySelector('.asst-close').onclick = closePanel;
    panel.querySelector('#passtSend').onclick   = send;
    var ta = panel.querySelector('#passtTa');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
    renderWelcome();
    renderPersistentChips();
    startObserving();
  }

  function renderWelcome() {
    var body = document.getElementById('passtBody');
    if (!body || history.length) return;
    var chips = STARTERS.map(function (q) {
      return '<button class="asst-chip">' + esc(q) + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="asst-msg asst-bot"><div class="asst-bubble">' +
        'Hi — I can help you understand the questions and where to find the numbers. What would you like to know?' +
      '</div></div>' +
      '<div class="asst-chips">' + chips + '</div>';
    Array.prototype.forEach.call(body.querySelectorAll('.asst-chip'), function (c) {
      c.onclick = function () {
        var ta = document.getElementById('passtTa');
        if (ta) ta.value = c.textContent;
        send();
      };
    });
  }

  function renderPersistentChips() {
    var bar = document.getElementById('passtPersist');
    if (!bar) return;
    bar.innerHTML = PERSISTENT_CHIPS.map(function (q) {
      return '<button class="asst-chip asst-chip-sm">' + esc(q) + '</button>';
    }).join('');
    Array.prototype.forEach.call(bar.querySelectorAll('.asst-chip'), function (c) {
      c.onclick = function () {
        var ta = document.getElementById('passtTa');
        if (ta) { ta.value = c.textContent; ta.dispatchEvent(new Event('input')); }
        send();
      };
    });
  }

  function openPanel() {
    var p = document.getElementById('passtPanel');
    if (p) {
      p.classList.add('open');
      setTimeout(function () {
        var ta = document.getElementById('passtTa');
        if (ta) ta.focus();
      }, 60);
    }
  }
  function closePanel() {
    var p = document.getElementById('passtPanel');
    if (p) p.classList.remove('open');
  }

  function addMsg(role, html) {
    var body = document.getElementById('passtBody');
    if (!body) return null;
    var wrap = el('div', 'asst-msg ' + (role === 'user' ? 'asst-user' : 'asst-bot'));
    wrap.appendChild(el('div', 'asst-bubble', html));
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
    return wrap;
  }

  async function send() {
    if (busy) return;
    var ta  = document.getElementById('passtTa');
    var q   = (ta && ta.value || '').trim();
    if (!q) return;
    if (!history.length) {
      var b = document.getElementById('passtBody');
      if (b) b.innerHTML = '';
    }
    ta.value = ''; ta.style.height = 'auto';
    addMsg('user', esc(q));
    history.push({ role: 'user', content: q });

    busy = true;
    var sendBtn = document.getElementById('passtSend');
    if (sendBtn) sendBtn.disabled = true;
    var thinking = addMsg('bot', '<span class="asst-typing"><i></i><i></i><i></i></span>');

    try {
      /* sessionData.token is the discovery link's bearer token.
         The prospect has no session cookie, so they use the
         /api/prospect-assist endpoint which validates by token. */
      var token = (typeof sessionData !== 'undefined' && sessionData && sessionData.token)
                  ? sessionData.token : '';
      var resp = await fetch('/api/prospect-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          messages: history.slice(-8)
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
      addMsg('bot', '<span class="asst-err">Couldn\'t reach help right now. Please try again.</span>');
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
