/* ═══════════════════════════════════════════════════════════════════
   assistant.js — in-app AI assistant (Pass 2)

   Pass 2 adds context-awareness: the assistant knows which tab is active,
   which field (if any) was most recently focused, and the current
   scenario name / company — so "what does this mean?" resolves without
   the rep having to name the field.

   State is isolated by AI experience and retained for the authenticated
   browser session. Navigation never regenerates or clears prior responses.

   Security: calls go through /api/enhance (server-side proxy). API key
   never reaches the browser. Auth-gated + rate-limited on the server.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Knowledge base ───────────────────────────────────────────── */
  /* Product facts are assembled server-side from Application Knowledge 1.0. */
  /* ── Tab context: what to add to the system prompt per active tab ─ */
  var TAB_CONTEXT = {
    'tab-calc':        'The rep is currently on the CALCULATOR tab, entering prospect data.',
    'tab-disc':        'The rep is currently on the DISCOVERY tab, reviewing or editing qualification questions.',
    'tab-exec':        'The rep is currently on the EXECUTIVE PRESENTATION tab, reviewing the business case summary and export options.',
    'tab-solfit':      'The rep is currently on the SOLUTION FIT tab, completing the SE handoff.',
    'tab-comp':        'The rep is currently in Competitive Intelligence. Explain reuse versus refresh, product-specific sources, research freshness, opportunity memory, and the difference between saved research and an approved Battlecard.',
    'tab-sensitivity': 'The rep is currently on the SENSITIVITY tab.',
    'tab-compare':     'The rep is currently on the COMPARE tab, comparing multiple scenarios.',
    'tab-map':         'The rep is currently on the Joint Project Plan tab.',
    'tab-stake':       'The rep is currently on the STAKEHOLDER MAP tab.',
    'tab-saved':       'The rep is currently on the SAVED SCENARIOS tab.',
    'tab-analytics':   'The rep is currently on the ANALYTICS tab.',
    'tab-manager':     'The user is currently on the SALES MANAGER workspace. Explain the selected view, filters, Management Priority, Deal Health, next customer commitment, saved buyer evidence, and internal manager actions. Never imply that the application reads or writes a CRM.',
    'tab-impact':      'The rep is currently on the IMPACT tab.',
    'tab-help':        'The rep is currently on the HELP tab.',
    'tab-readiness':   'The rep is currently on BUYER EVIDENCE & STAGE READINESS, reviewing customer evidence and governed stage progression.',
    'tab-coach':       'The rep is currently with CHRISTIE, the internal AI deal coach.'
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
    fieldInvValue:'Field inventory value', fieldLeakageRate:'Field leakage rate', fieldLocations:'Field locations',
    fieldReconcilePerYr:'Field reconciliations per year', fieldReconcilePersonHours:'Person-hours per reconciliation',
    lostSalesYr:'Annual lost sales', contributionMarginPct:'Contribution margin', servicePenaltyCostYr:'Service penalties and credits',
    ramp1:'Year 1 ramp %', ramp2:'Year 2 ramp %', ramp3:'Year 3 ramp %', discRate:'Discount rate',
    scenarioName:'Scenario name', companyName:'Company name', repName:'Rep name',
    industry:'Industry', competitor:'Primary competitor'
  };

  /* ── Independent session state for Assistant and field Help. ─── */
  var assistantState = window.CIAIState ? window.CIAIState.load('assistant') : {history:[]};
  var helpState = window.CIAIState ? window.CIAIState.load('internal_help') : {history:[],fields:{}};
  var mode = 'assistant';
  var history  = assistantState.history || [];
  var lastFocusedField = null;   // most recently focused input id
  var busy = false;
  window.resetCustomerAIContext = function(){
    window.CIAIState?.clear('assistant');window.CIAIState?.clear('internal_help');
    assistantState={history:[]};helpState={history:[],fields:{}};history=[];lastFocusedField=null;
    if(document.getElementById('asstBody')){renderConversation();renderPersistentChips();}
  };

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
      'Authoritative product knowledge is supplied by the server-owned /api/ai-help endpoint.';
  }

  /* ── Field focus tracking ─────────────────────────────────────── */
  function trackFocus(e) {
    var t = e.target;
    if (t && t.id && (FIELD_LABELS[t.id] || t.closest('.field'))) {
      if (mode === 'internal_help') saveCurrent();
      lastFocusedField = t.id;
      helpState.activeField = t.id;
      helpState.fields = helpState.fields || {};
      helpState.fields[t.id] = helpState.fields[t.id] || { history:[], lastResponse:'', stale:false };
      if (mode === 'internal_help') { history = helpState.fields[t.id].history || []; renderConversation(); }
      if (window.CIAIState) window.CIAIState.save('internal_help', helpState);
    }
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
    fab.setAttribute('aria-label', 'Open AI Help');
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>AI Help</span>';
    fab.onclick = openPanel;

    var panel = el('div', 'asst-panel');
    panel.id = 'asstPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Assistant');
    panel.innerHTML =
      '<div class="asst-head">' +
        '<div class="asst-title"><span class="asst-dot"></span><span id="asstTitle">Ask AI Help</span></div>' +
        '<button class="asst-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="ai-mode-tabs"><button id="asstMode" class="active">Assistant</button><button id="helpMode">Field Help</button><button id="asstRefresh">Refresh</button><button id="asstClear">Clear</button></div>' +
      '<div id="asstContext" class="asst-context"></div>' +
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
    panel.querySelector('#asstMode').onclick = function(){ switchMode('assistant'); };
    panel.querySelector('#helpMode').onclick = function(){ switchMode('internal_help'); };
    panel.querySelector('#asstRefresh').onclick = function(){ send(true, 'Refresh the prior response using the latest application information.'); };
    panel.querySelector('#asstClear').onclick = clearCurrent;
    panel.querySelector('#asstSend').onclick = function(){ send(false); };
    var ta = panel.querySelector('#asstTa');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
    renderConversation();
    renderPersistentChips();
  }

  function helpFieldState(){var id=lastFocusedField||helpState.activeField||'__none__';helpState.fields=helpState.fields||{};helpState.fields[id]=helpState.fields[id]||{history:[],lastResponse:'',stale:false};return helpState.fields[id];}
  function stateForMode(){ return mode === 'internal_help' ? helpFieldState() : assistantState; }
  function saveCurrent(){ var s=stateForMode(); s.history=history; s.lastResponse=history.filter(function(x){return x.role==='assistant';}).slice(-1)[0]?.content||''; if(window.CIAIState)window.CIAIState.save(mode,mode==='internal_help'?helpState:s); }
  function switchMode(next){ saveCurrent(); mode=next; history=(stateForMode().history||[]); document.getElementById('asstMode').classList.toggle('active',mode==='assistant');document.getElementById('helpMode').classList.toggle('active',mode==='internal_help');document.getElementById('asstTitle').textContent=mode==='internal_help'?'Internal Field Help':'Ask AI Help';renderConversation();renderPersistentChips(); }
  function clearCurrent(){ history=[]; var s=stateForMode();s.history=[];s.lastResponse='';s.stale=false;saveCurrent();renderConversation(); }
  function fieldContext(){var id=lastFocusedField||helpState.activeField||'',field=id&&document.getElementById(id),wrap=field&&field.closest('.field'),label=wrap&&wrap.querySelector('label'),pane=document.querySelector('.pane.active'),section=field&&field.closest('.card,.accordion,.sf-section'),type=field?(field.type||field.tagName):'',units='';if(/revenue|cost|value|writeoff|invest|spend/i.test(id))units='Currency';else if(/pct|rate|otif|accuracy|ramp|discount/i.test(id))units='Percentage';return {audience:'Internal User',screen:pane?.id||'',section:section?.querySelector('.card-title,.acc-title,h2,h3')?.textContent?.trim()||'',field:id,fieldLabel:(label?.textContent||FIELD_LABELS[id]||id).trim(),question:(label?.textContent||FIELD_LABELS[id]||'').trim(),description:field?.getAttribute('title')||wrap?.querySelector('.field-hint')?.textContent?.trim()||'',inputType:type,units,existingValue:field?.value||'',relevantPriorInputs:[],allowedContext:'Application usage and field explanation',contextClassification:'Internal'};}
  function currentContextObject(){return mode==='internal_help'?fieldContext():{screen:document.querySelector('.pane.active')?.id||'',field:lastFocusedField||'',company:(document.getElementById('companyName')||{}).value||'',scenario:(document.getElementById('scenarioName')||{}).value||''};}
  function renderConversation(){var body=document.getElementById('asstBody'),ctx=document.getElementById('asstContext'),s=stateForMode();if(!body)return;if(ctx)ctx.innerHTML=mode==='internal_help'?(fieldContext().field?'<strong>'+esc(fieldContext().fieldLabel)+'</strong><span>'+esc(fieldContext().screen.replace('tab-',''))+'</span>':'<span>Focus a field for exact guidance.</span>'):'';if(!history.length){body.innerHTML='';renderWelcome();return;}body.innerHTML=(s.stale?'<div class="ai-stale">Information used for this AI response has changed. Refresh the analysis to incorporate the latest information.</div>':'')+history.map(function(m){return '<div class="asst-msg '+(m.role==='user'?'asst-user':'asst-bot')+'"><div class="asst-bubble">'+(m.role==='assistant'?mdToHtml(m.content):esc(m.content))+'</div></div>';}).join('');body.scrollTop=body.scrollHeight;}

  function renderWelcome() {
    var body = document.getElementById('asstBody');
    if (!body || history.length) return;
    var chips = STARTERS.map(function (q) {
      return '<button class="asst-chip">' + esc(q) + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="asst-msg asst-bot"><div class="asst-bubble">' +
        (mode==='internal_help'?'Focus a field and I’ll explain what it means, why it matters, and what belongs there. ':'Hi — I can help with calculations and how to use the app. ') +
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
    var chips=mode==='internal_help'?['What does this field mean, why does it matter, and what should I enter?','What source should I use for this field?']:PERSISTENT_CHIPS;
    bar.innerHTML = chips.map(function (q) {
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
      var s=stateForMode(),fp=window.CIAIState&&window.CIAIState.fingerprint(currentContextObject());if(s.lastResponse&&s.contextFingerprint&&s.contextFingerprint!==fp)s.stale=true;renderConversation();
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

  async function send(refresh, forcedQuestion) {
    if (busy) return;
    var ta = document.getElementById('asstTa');
    var q = forcedQuestion || (ta && ta.value || '').trim();
    if (!q) return;
    if(refresh){history=[];var rs=stateForMode();rs.history=[];rs.stale=false;}
    if (!history.length) {
      var b = document.getElementById('asstBody');
      if (b) b.innerHTML = '';
    }
    ta.value = ''; ta.style.height = 'auto';
    addMsg('user', esc(q));
    history.push({ role: 'user', content: q });
    saveCurrent();

    busy = true;
    var sendBtn = document.getElementById('asstSend');
    if (sendBtn) sendBtn.disabled = true;
    var thinking = addMsg('bot', '<span class="asst-typing"><i></i><i></i><i></i></span>');

    try {
      /* Build the system prompt fresh each time so it always has the
         current context (tab, focused field, company, guided mode). */
      var contextObject=currentContextObject(), s=stateForMode(), fp=window.CIAIState&&window.CIAIState.fingerprint(contextObject);
      if(s.lastResponse&&s.contextFingerprint&&s.contextFingerprint!==fp)s.stale=true;
      var resp = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          workspaceId: contextObject.screen || '',
          focusedFieldId: contextObject.field || '',
          scenarioId: window.currentScenarioId || null,
          recentHelpConversation: history.slice(-10)
        })
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      var text = (data.content && data.content[0] && data.content[0].text) || '';
      if (!text) throw new Error('empty');
      if (thinking) thinking.remove();
      addMsg('bot', mdToHtml(text));
      history.push({ role: 'assistant', content: text });
      s.context=contextObject;s.contextFingerprint=fp;s.stale=false;saveCurrent();
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
