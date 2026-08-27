/* ═══════════════════════════════════════════════════════════════════
   ux-enhancements.js  (v3.2 — Batch 1)
   - Live count-up animation for the ROI live-bar as inputs change
   - Out-of-range input warnings (benchmark-aware, non-blocking)
   - Optimistic "Saved ✓ · Ns ago" status
   - Persistent customer/scenario context header across all tabs
   Pure enhancement layer — no calc logic, no schema, degrades gracefully.
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. Live count-up animation ─────────────────────────────────────
   Animates numeric text in the live-bar from its previous value to the
   new one so a rep *sees* the case strengthen as they type. Respects
   prefers-reduced-motion. Parses/reformats currency + percent strings. */
const _lbPrev = {};   // last numeric value per element id
function animateValue(el, id, formatted) {
  if (!el) return;
  const num = parseFloat(String(formatted).replace(/[^0-9.-]/g, ''));
  const prev = _lbPrev[id];
  /* Non-numeric (—) or reduced-motion: set directly. */
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isNaN(num) || reduce || prev === undefined || prev === num) {
    el.textContent = formatted; _lbPrev[id] = isNaN(num) ? undefined : num; return;
  }
  const prefix = (String(formatted).match(/^[^0-9.-]*/) || [''])[0];
  const suffix = (String(formatted).match(/[^0-9.]*$/) || [''])[0];
  const isPct  = suffix.includes('%');
  const dur = 420, t0 = performance.now();
  const ease = x => 1 - Math.pow(1 - x, 3);           // easeOutCubic
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const cur = prev + (num - prev) * ease(p);
    el.textContent = isPct
      ? prefix + Math.round(cur) + suffix
      : prefix + Math.round(cur).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
    else { el.textContent = formatted; _lbPrev[id] = num; }
  }
  requestAnimationFrame(step);
}

/* ── 2. Out-of-range input warnings ─────────────────────────────────
   Flags values well outside plausible bounds so a fat-finger error never
   reaches a CFO. Non-blocking: a subtle inline note, never stops the rep.
   Bounds are deliberately wide — we only warn on the clearly-wrong. */
const RANGE_RULES = {
  shrinkRate:      { min: 0,  max: 15,  label: 'Shrink rate', unit: '%', hint: 'Typical is 0.5–5%.' },
  currentAccuracy: { min: 50, max: 100, label: 'Inventory accuracy', unit: '%', hint: 'Usually 70–99%.' },
  otifBaseline:    { min: 40, max: 100, label: 'OTIF baseline', unit: '%', hint: 'Usually 80–98%.' },
  otifTarget:      { min: 40, max: 100, label: 'OTIF target', unit: '%', hint: 'Usually 90–99.5%.' },
  invTurnsCurrent: { min: 0,  max: 60,  label: 'Inventory turns', unit: '', hint: 'Most operations are 2–20.' },
  laborWastePct:   { min: 0,  max: 80,  label: 'Productivity loss', unit: '%', hint: 'Usually 5–40%.' },
  pickRateGainPct: { min: 0,  max: 80,  label: 'Pick-rate gain', unit: '%', hint: 'Usually 5–40%.' },
  orderErrorPct:   { min: 0,  max: 30,  label: 'Order error rate', unit: '%', hint: 'Usually 0.5–8%.' },
  fieldLeakagePct: { min: 0,  max: 40,  label: 'Field parts leakage', unit: '%', hint: 'Usually 1–15%.' }
};
function checkFieldRange(id) {
  const el = document.getElementById(id);
  const rule = RANGE_RULES[id];
  if (!el || !rule) return;
  let note = document.getElementById(id + '_range');
  const val = parseFloat(el.value);
  const bad = el.value !== '' && !isNaN(val) && (val < rule.min || val > rule.max);
  if (bad) {
    if (!note) {
      note = document.createElement('div');
      note.id = id + '_range';
      note.className = 'range-warn';
      el.insertAdjacentElement('afterend', note);
    }
    note.innerHTML = `⚠ ${rule.label} of ${val}${rule.unit} looks unusual. ${rule.hint} Double-check before sharing.`;
    el.classList.add('input-range-warn');
  } else {
    if (note) note.remove();
    el.classList.remove('input-range-warn');
  }
}
function bindRangeChecks() {
  Object.keys(RANGE_RULES).forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._rangeBound) {
      el.addEventListener('input', () => checkFieldRange(id));
      el.addEventListener('blur',  () => checkFieldRange(id));
      el._rangeBound = true;
    }
  });
}

/* ── 3. Optimistic save status ──────────────────────────────────────
   After a save, show "Saved ✓ · just now" and keep the relative time
   fresh, so a rep always knows their work is safe. */
let _lastSaveAt = null, _saveTicker = null;
function markSaved() {
  _lastSaveAt = Date.now();
  renderSaveStatus();
  if (_saveTicker) clearInterval(_saveTicker);
  _saveTicker = setInterval(renderSaveStatus, 15000);
}
function renderSaveStatus() {
  const el = document.getElementById('saveStatus');
  if (!el || !_lastSaveAt) return;
  const secs = Math.round((Date.now() - _lastSaveAt) / 1000);
  const rel = secs < 5 ? 'just now'
            : secs < 60 ? secs + 's ago'
            : secs < 3600 ? Math.round(secs / 60) + 'm ago'
            : Math.round(secs / 3600) + 'h ago';
  el.innerHTML = `<span class="save-ok">✓ Saved</span> <span class="save-rel">· ${rel}</span>`;
  el.style.display = 'inline-flex';
}

/* ── 4. Persistent context header ───────────────────────────────────
   Shows "Acme Corp · FY26 Scenario" on every tab so the rep never loses
   track of which customer they're working in. Updates on tab switch and
   when the identity fields change. */
function updateContextHeader() {
  const bar = document.getElementById('contextHeader');
  if (!bar) return;
  const company  = (document.getElementById('companyName')?.value || '').trim();
  const scenario = (document.getElementById('scenarioName')?.value || '').trim();
  if (!company) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = `<span class="ctx-icon" aria-hidden="true">${ctxInitialsUX(company)}</span>
    <span class="ctx-details"><span class="ctx-label">Customer workspace</span><span class="ctx-company">${escapeHtmlUX(company)}</span></span>` +
    (scenario ? `<span class="ctx-sep">/</span><span class="ctx-scenario"><span>Scenario</span>${escapeHtmlUX(scenario)}</span>` : '') +
    `<button class="ctx-switch" onclick="showCustomerGate()" title="Search and switch customer"><span aria-hidden="true">⇄</span> Switch customer</button>`;
}
function ctxInitialsUX(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2)
    .map(w => w.charAt(0).toUpperCase()).join('') || '—';
}
function escapeHtmlUX(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Wiring ─────────────────────────────────────────────────────────
   Wrap existing globals non-destructively so we don't duplicate their
   logic — we just add the enhancement after they run. */
function initUxEnhancements() {
  /* Live-bar animation: wrap recalc so after it runs we animate the bar. */
  if (typeof window.recalc === 'function' && !window.recalc._uxWrapped) {
    const origRecalc = window.recalc;
    window.recalc = function(...args) {
      const r = origRecalc.apply(this, args);
      ['lb-benefit','lb-roi','lb-npv3','lb-npv5'].forEach(id => {
        const e = document.getElementById(id);
        if (e) animateValue(e, id, e.textContent);
      });
      updateContextHeader();
      return r;
    };
    window.recalc._uxWrapped = true;
  }
  /* Save status: wrap saveScenario to stamp the save time on success. */
  if (typeof window.saveScenario === 'function' && !window.saveScenario._uxSaveWrapped) {
    const origSave = window.saveScenario;
    window.saveScenario = async function(...args) {
      const r = await origSave.apply(this, args);
      markSaved();
      return r;
    };
    window.saveScenario._uxSaveWrapped = true;
  }
  bindRangeChecks();
  updateContextHeader();
  if (typeof initKeyboardShortcuts === 'function') initKeyboardShortcuts();
  if (typeof maybeShowOnboarding === 'function') maybeShowOnboarding();
  ['companyName','scenarioName'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._ctxBound) { el.addEventListener('input', updateContextHeader); el._ctxBound = true; }
  });
}

if (typeof window !== 'undefined') {
  window.updateContextHeader = updateContextHeader;
  window.initUxEnhancements = initUxEnhancements;
  window.checkFieldRange = checkFieldRange;
}

/* ═══════════════════════════════════════════════════════════════════
   Batch 2 — Undo toasts + loading/empty states
   ═══════════════════════════════════════════════════════════════════ */

/* ── Undo toast ─────────────────────────────────────────────────────
   Replaces jarring confirm() dialogs for destructive actions. The action
   is DEFERRED for the undo window; if the user clicks Undo it never runs.
   Usage: undoableAction('Deleted "Acme"', () => actuallyDelete(), () => refreshUI());
     - message: what happened (past tense)
     - commit:  the real (destructive) action, run only if not undone
     - onUndo:  optional UI restore if the user cancels
     - delay:   ms window (default 6000) */
function undoableAction(message, commit, onUndo, delay) {
  delay = delay || 6000;
  let undone = false;
  const host = ensureToastHost();
  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `<span class="undo-msg"></span>
    <button class="undo-btn">Undo</button>
    <button class="undo-x" aria-label="Dismiss"><span aria-hidden="true">×</span></button>`;
  toast.querySelector('.undo-msg').textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  let timer = setTimeout(finish, delay);
  function finish() {
    if (undone) return;
    clearTimeout(timer);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
    try { commit(); } catch (e) { console.error('undoable commit error:', e.message); }
  }
  function cancel() {
    undone = true;
    clearTimeout(timer);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
    if (typeof onUndo === 'function') { try { onUndo(); } catch (e) {} }
  }
  toast.querySelector('.undo-btn').addEventListener('click', cancel);
  toast.querySelector('.undo-x').addEventListener('click', finish);
}
function ensureToastHost() {
  let host = document.getElementById('undoToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'undoToastHost';
    host.className = 'undo-toast-host';
    document.body.appendChild(host);
  }
  return host;
}

/* ── Loading + empty states ─────────────────────────────────────────
   Small helpers so async lists show a spinner while loading and a
   friendly guide when empty, instead of a blank gap. */
function renderLoadingState(el, label) {
  if (!el) return;
  el.innerHTML = `<div class="ux-loading"><span class="ux-spinner"></span>${escapeHtmlUX(label || 'Loading…')}</div>`;
}
function renderEmptyState(el, opts) {
  if (!el) return;
  opts = opts || {};
  const icon = opts.icon || '📄';
  const title = escapeHtmlUX(opts.title || 'Nothing here yet');
  const sub = escapeHtmlUX(opts.sub || '');
  const action = opts.actionLabel && opts.onAction
    ? `<button class="btn btn-cta btn-sm ux-empty-action">${escapeHtmlUX(opts.actionLabel)}</button>` : '';
  el.innerHTML = `<div class="ux-empty">
      <div class="ux-empty-icon">${icon}</div>
      <div class="ux-empty-title">${title}</div>
      ${sub ? `<div class="ux-empty-sub">${sub}</div>` : ''}
      ${action}
    </div>`;
  if (opts.onAction) {
    const btn = el.querySelector('.ux-empty-action');
    if (btn) btn.addEventListener('click', opts.onAction);
  }
}

if (typeof window !== 'undefined') {
  window.undoableAction = undoableAction;
  window.renderLoadingState = renderLoadingState;
  window.renderEmptyState = renderEmptyState;
}

/* ═══════════════════════════════════════════════════════════════════
   Batch 3 — keyboard shortcuts, guided onboarding, presentation mode
   ═══════════════════════════════════════════════════════════════════ */

/* ── Keyboard shortcuts ─────────────────────────────────────────────
   Power-user navigation. "g then <key>" jumps tabs; Cmd/Ctrl+S saves;
   "?" shows the shortcut sheet. Ignored while typing in a field. */
const KB_TAB_MAP = { c:'calc', d:'disc', e:'exec', s:'saved', m:'map', k:'stake', a:'analytics', h:'help' };
let _gPending = false, _gTimer = null;
function initKeyboardShortcuts() {
  if (window._kbBound) return; window._kbBound = true;
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    /* Cmd/Ctrl+S → save (works even while typing) */
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (typeof saveScenario === 'function') saveScenario();
      return;
    }
    /* Cmd/Ctrl+N → new scenario */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      if (typeof clearForm === 'function') { switchTab('calc'); clearForm(); }
      return;
    }
    /* Cmd/Ctrl+T → template picker */
    if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      if (typeof showTemplatePicker === 'function') showTemplatePicker();
      return;
    }
    /* Cmd/Ctrl+P → download PDF (override browser print) */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      if (typeof downloadPDF === 'function') downloadPDF();
      return;
    }
    if (typing) return;
    /* "?" → show shortcuts */
    if (e.key === '?') { e.preventDefault(); showShortcutSheet(); return; }
    /* Escape closes the shortcut sheet */
    if (e.key === 'Escape') { const s=document.getElementById('kbSheet'); if(s) s.remove(); }
    /* "g" then tab-letter → jump */
    if (e.key === 'g' && !_gPending) {
      _gPending = true;
      clearTimeout(_gTimer);
      _gTimer = setTimeout(() => { _gPending = false; }, 1200);
      return;
    }
    if (_gPending) {
      _gPending = false; clearTimeout(_gTimer);
      const tab = KB_TAB_MAP[e.key.toLowerCase()];
      if (tab && typeof switchTab === 'function') { e.preventDefault(); switchTab(tab); }
    }
  });
}
function showShortcutSheet() {
  if (document.getElementById('kbSheet')) return;
  const rows = [
    ['g → c', 'Calculator'], ['g → d', 'Discovery guide'],
    ['g → e', 'Executive view'], ['g → s', 'Saved scenarios'],
    ['g → m', 'Stakeholder map'], ['g → a', 'Analytics'],
    ['⌘/Ctrl+S', 'Save scenario'],
    ['⌘/Ctrl+N', 'New scenario'],
    ['⌘/Ctrl+T', 'Start from template'],
    ['⌘/Ctrl+P', 'Download PDF'],
    ['?', 'Show this help'],
    ['Esc', 'Close any modal']
  ];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'kbSheet';
  modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-label','Keyboard shortcuts');
  modal.innerHTML = `<div class="modal" style="max-width:420px;">
    <div class="modal-title">Keyboard shortcuts</div>
    <table class="kb-table">${rows.map(([k,d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="document.getElementById('kbSheet').remove()">Close</button></div>
  </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/* ── Guided first-business-case onboarding ──────────────────────────
   A dismissible, step-by-step highlight shown to a rep who has no saved
   scenarios yet. Uses a simple in-page coach panel (not intrusive modals).
   Dismissal is remembered in sessionStorage for the session only. */
function maybeShowOnboarding() {
  try {
    if (sessionStorage.getItem('ci_onboarding_done') === '1') return;
  } catch (e) {}
  /* Only for genuinely new users: no saved scenarios. */
  const noScenarios = (typeof savedScenarios === 'undefined') || !savedScenarios || savedScenarios.length === 0;
  if (!noScenarios) return;
  if (document.getElementById('onboardCoach')) return;
  const coach = document.createElement('div');
  coach.id = 'onboardCoach';
  coach.className = 'onboard-coach';
  coach.innerHTML = `
    <button class="onboard-close" aria-label="Dismiss"><span aria-hidden="true">×</span></button>
    <div class="onboard-title">👋 Welcome — let's build your first business case</div>
    <ol class="onboard-steps">
      <li><strong>Pick a customer</strong> — start on the Calculator; choose or create the company you're building for.</li>
      <li><strong>Enter what you know</strong> — the ROI updates live as you type. Send a discovery link to have the prospect fill in the rest.</li>
      <li><strong>Review the Executive View</strong> — the CFO-ready narrative and numbers.</li>
      <li><strong>Share &amp; track</strong> — send a trackable business-case link and see when they open it.</li>
    </ol>
    <div class="onboard-actions">
      <button class="btn btn-cta btn-sm" id="onboardStart">Start with a customer</button>
      <button class="btn btn-ghost btn-sm" id="onboardSkip">Skip for now</button>
    </div>`;
  document.body.appendChild(coach);
  const done = () => { try { sessionStorage.setItem('ci_onboarding_done','1'); } catch(e){} coach.remove(); };
  coach.querySelector('.onboard-close').addEventListener('click', done);
  coach.querySelector('#onboardSkip').addEventListener('click', done);
  coach.querySelector('#onboardStart').addEventListener('click', () => {
    done();
    if (typeof switchTab === 'function') switchTab('calc');
    if (typeof showCustomerGate === 'function') showCustomerGate();
  });
}

/* ── Presentation mode (tablet demo) for Executive View ─────────────
   Toggles a larger-type, cleaner layout for live demos. Adds a body
   class the CSS keys off, and a floating exit control. */
function togglePresentationMode() {
  const on = document.body.classList.toggle('presentation-mode');
  let exit = document.getElementById('presExit');
  if (on) {
    if (typeof switchTab === 'function') switchTab('exec');
    if (!exit) {
      exit = document.createElement('button');
      exit.id = 'presExit'; exit.className = 'pres-exit';
      exit.innerHTML = 'Exit presentation';
      exit.addEventListener('click', togglePresentationMode);
      document.body.appendChild(exit);
    }
    exit.style.display = 'block';
  } else if (exit) { exit.style.display = 'none'; }
}

if (typeof window !== 'undefined') {
  window.initKeyboardShortcuts = initKeyboardShortcuts;
  window.showShortcutSheet = showShortcutSheet;
  window.maybeShowOnboarding = maybeShowOnboarding;
  window.togglePresentationMode = togglePresentationMode;
}
