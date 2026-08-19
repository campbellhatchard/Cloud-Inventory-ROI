/* ═══════════════════════════════════════════════════════════════════
   calc-wizard.js  (Pass 1 — progress tracking + guided feel)
   Enhances the existing calculator without restructuring it:
   - Live progress-tracking stepper (checkmarks, per-step completion)
   - Per-section completion states on section headers
   - "Next best action" nudge driven by what's still missing
   - Field tiering: an "Advanced" disclosure for rarely-touched benchmarks
   Pure enhancement layer. Reads existing inputs; changes no calc logic.
   ═══════════════════════════════════════════════════════════════════ */

/* Each wizard step maps to a section and the KEY fields that signal it's
   meaningfully addressed. We track "any key field filled" for a soft signal
   and "all key fields filled" for the done state — a section needn't have
   every field to count as progressed. */
const WIZARD_STEPS = [
  { id: 'prospect',    section: 'prospectSection',    num: 1, label: 'Prospect details',
    key: ['revenue', 'userCount', 'inventoryValue'] },
  { id: 'invest',      section: 'investSection',      num: 2, label: 'Investment',
    key: ['invest'] },
  { id: 'losses',      section: 'lossesSection',      num: 3, label: 'Losses & OTIF',
    key: ['annualWriteOff', 'otifBaseline', 'invTurnsCurrent'] },
  { id: 'assumptions', section: 'assumptionsSection', num: 4, label: 'Benchmarks',
    key: [] },  // benchmarks default-filled; always considered ready
  { id: 'results',     section: 'roiGrid',            num: 5, label: 'Results',
    key: [] }
];

function fieldFilled(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  const v = parseFloat(el.value);
  return el.value !== '' && !isNaN(v) && v > 0;
}

function sectionStatus(step) {
  if (!step.key.length) return 'ready';                 // no required key fields
  const filled = step.key.filter(fieldFilled).length;
  if (filled === 0) return 'empty';
  if (filled === step.key.length) return 'done';
  return 'partial';
}

/* ── Live progress-tracking stepper ─────────────────────────────────
   Re-renders the existing .workflow-steps bar with completion state.
   Falls back silently if the bar isn't present. */
function updateWizardStepper() {
  const bar = document.querySelector('.workflow-steps');
  if (!bar) return;
  let doneCount = 0;
  const parts = WIZARD_STEPS.map((step, i) => {
    const st = sectionStatus(step);
    if (st === 'done' || st === 'ready') doneCount++;
    const cls = st === 'done' ? 'ws-done' : st === 'partial' ? 'ws-partial' : st === 'ready' ? 'ws-ready' : 'ws-empty';
    const mark = st === 'done' ? '✓' : String(step.num);
    const sep = i < WIZARD_STEPS.length - 1 ? '<span class="ws-sep">›</span>' : '';
    return `<button class="ws-step ${cls}" onclick="scrollToSection('${step.section}')" title="${step.label}">
        <span class="ws-num">${mark}</span>${step.label}
      </button>${sep}`;
  }).join('');
  /* Keep the final "Executive PDF" jump as the terminal action. */
  bar.innerHTML = parts +
    `<span class="ws-sep">›</span>
     <button class="ws-step ws-exec" onclick="switchTab('exec')">
       <span class="ws-num" style="background:var(--cyan);color:#fff;">→</span>Executive PDF
     </button>`;
}

/* ── Per-section completion badges on section headers ───────────────
   Injects a small status chip into each section's header (idempotent). */
function updateSectionBadges() {
  WIZARD_STEPS.forEach(step => {
    if (!step.key.length) return;
    const section = document.getElementById(step.section);
    if (!section) return;
    const header = section.querySelector('.section-title, .card-title, h2, h3') || section.firstElementChild;
    if (!header) return;
    let badge = header.querySelector('.section-status');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'section-status';
      header.appendChild(badge);
    }
    const st = sectionStatus(step);
    const filled = step.key.filter(fieldFilled).length;
    badge.className = 'section-status ss-' + st;
    badge.textContent = st === 'done' ? '✓ Complete'
      : st === 'partial' ? `${filled}/${step.key.length}`
      : 'Not started';
  });
}

/* ── Next-best-action nudge ─────────────────────────────────────────
   Surfaces the single most useful next step based on what's missing. */
function updateNextBestAction() {
  const host = document.getElementById('nextBestAction');
  if (!host) return;
  const company = (document.getElementById('companyName')?.value || '').trim();
  if (!company) { host.style.display = 'none'; return; }

  /* Find the first step with missing key fields. */
  let msg = '', jump = null;
  for (const step of WIZARD_STEPS) {
    const st = sectionStatus(step);
    if (st === 'empty' || st === 'partial') {
      const missing = step.key.filter(k => !fieldFilled(k));
      const names = missing.map(prettyFieldName).slice(0, 2).join(' and ');
      msg = `Next: add ${names} in ${step.label} to strengthen the case.`;
      jump = step.section;
      break;
    }
  }
  if (!msg) {
    msg = 'Your core value drivers are in — review the Executive View to see the full business case.';
    host.innerHTML = `<span class="nba-icon">✓</span><span>${msg}</span>
      <button class="nba-go" onclick="switchTab('exec')">Executive View →</button>`;
  } else {
    host.innerHTML = `<span class="nba-icon">→</span><span>${msg}</span>
      <button class="nba-go" onclick="scrollToSection('${jump}')">Go →</button>`;
  }
  host.style.display = 'flex';
}

function prettyFieldName(id) {
  const map = {
    revenue: 'annual revenue', userCount: 'team size', inventoryValue: 'inventory value',
    invest: 'investment amount', annualWriteOff: 'write-off value',
    otifBaseline: 'OTIF baseline', invTurnsCurrent: 'inventory turns'
  };
  return map[id] || id;
}

/* ── Field tiering: Advanced disclosure ─────────────────────────────
   Wraps the benchmarks/assumptions section in a collapsible "Advanced"
   disclosure so the default view is less overwhelming. Idempotent;
   remembers the open/closed state for the session. */
function initAdvancedDisclosure() {
  const section = document.getElementById('assumptionsSection');
  if (!section || section._advWrapped) return;
  section._advWrapped = true;
  let open = false;
  try { open = sessionStorage.getItem('ci_adv_open') === '1'; } catch (e) {}

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'adv-toggle';
  const body = document.createElement('div');
  body.className = 'adv-body';
  /* Move the section's existing children (except an injected header/status)
     into the collapsible body. */
  const children = Array.from(section.children);
  section.insertBefore(toggle, section.firstChild);
  section.appendChild(body);
  children.forEach(c => body.appendChild(c));

  function render() {
    toggle.innerHTML = `<span class="adv-caret">${open ? '▾' : '▸'}</span> Advanced: benchmark assumptions
      <span class="adv-hint">${open ? 'Hide' : 'Rarely need changing — industry defaults applied'}</span>`;
    body.style.display = open ? 'block' : 'none';
  }
  toggle.addEventListener('click', () => {
    open = !open;
    try { sessionStorage.setItem('ci_adv_open', open ? '1' : '0'); } catch (e) {}
    render();
  });
  render();
}

/* ── Wiring ─────────────────────────────────────────────────────────
   Refresh all progress UI after each recalc, and once on init. */
function refreshCalcProgress() {
  updateWizardStepper();
  updateSectionBadges();
  updateNextBestAction();
}
function initCalcWizard() {
  initAdvancedDisclosure();
  refreshCalcProgress();
  if (typeof window.recalc === 'function' && !window.recalc._wizWrapped) {
    const orig = window.recalc;
    window.recalc = function (...args) {
      const r = orig.apply(this, args);
      refreshCalcProgress();
      return r;
    };
    window.recalc._wizWrapped = true;
  }
}

if (typeof window !== 'undefined') {
  window.initCalcWizard = initCalcWizard;
  window.refreshCalcProgress = refreshCalcProgress;
  window.updateWizardStepper = updateWizardStepper;
}

/* ═══════════════════════════════════════════════════════════════════
   Pass 2 — Guided mode (optional step-by-step wizard)
   A toggle collapses the single page into one section at a time with
   Next/Back. Default stays single-page (power users unaffected). Guided
   mode is a display layer over the existing sections — no DOM surgery.
   ═══════════════════════════════════════════════════════════════════ */

/* Guided step order maps to the same sections/anchors as WIZARD_STEPS,
   but Guided mode walks the four INPUT steps then hands off to Results. */
const GUIDED_SEQUENCE = ['prospectSection', 'investSection', 'lossesSection', 'assumptionsSection', 'roiGrid'];
let _guidedOn = false;
let _guidedIdx = 0;

function isGuidedOn() { return _guidedOn; }

function toggleGuidedMode(on) {
  _guidedOn = (typeof on === 'boolean') ? on : !_guidedOn;
  const body = document.getElementById('calcBody');
  if (!body) return;
  try { sessionStorage.setItem('ci_guided_mode', _guidedOn ? '1' : '0'); } catch (e) {}
  body.classList.toggle('guided-mode', _guidedOn);
  const toggle = document.getElementById('guidedToggle');
  if (toggle) toggle.setAttribute('aria-checked', _guidedOn ? 'true' : 'false');
  const chk = document.getElementById('guidedToggleChk');
  if (chk) chk.checked = _guidedOn;
  if (_guidedOn) {
    /* If an Advanced disclosure collapsed the benchmarks, open it in guided
       mode so the step's content is visible. */
    _guidedIdx = 0;
    stampSectionNumbers(true);
    showGuidedStep(0);
  } else {
    /* Restore: show all sections. */
    GUIDED_SEQUENCE.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('guided-active'); });
    const nav = document.getElementById('guidedNav');
    if (nav) nav.style.display = 'none';
    stampSectionNumbers(false);
  }
}

/* Number each section header ("1", "2", …) so the badges line up with the
   numbered dots in the stepper. Injected only in guided mode; removed on exit.
   Handles the varied header markup (.acc-title, .card-title) and the
   header-less results grid. */
const GUIDED_STEP_TITLES = ['Prospect details', 'Investment', 'Losses & OTIF', 'Benchmarks', 'Results'];
function stampSectionNumbers(on) {
  GUIDED_SEQUENCE.forEach((id, i) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    let badge = sec.querySelector(':scope > .guided-num, :scope .guided-num');
    if (!on) { if (badge) badge.remove(); return; }
    if (badge) { badge.textContent = i + 1; return; }
    badge = document.createElement('span');
    badge.className = 'guided-num';
    badge.textContent = i + 1;
    badge.setAttribute('aria-label', 'Step ' + (i + 1));
    /* Preferred anchor: the visible title element, so the number sits inline
       with the section name. Fall back to the section itself. */
    const title = sec.querySelector('.acc-title') || sec.querySelector('.card-title');
    if (title) {
      title.insertBefore(badge, title.firstChild);
    } else {
      /* roiGrid has no header — stamp the section as a positioned parent. */
      sec.classList.add('guided-num-host');
      sec.insertBefore(badge, sec.firstChild);
    }
  });
}

function showGuidedStep(idx) {
  _guidedIdx = Math.max(0, Math.min(idx, GUIDED_SEQUENCE.length - 1));
  GUIDED_SEQUENCE.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('guided-active', i === _guidedIdx);
  });
  /* Ensure the active section's accordion is expanded so its fields show. */
  const active = document.getElementById(GUIDED_SEQUENCE[_guidedIdx]);
  if (active) {
    const head = active.querySelector('.acc-head');
    if (head && !head.classList.contains('open') && typeof toggleAcc === 'function') toggleAcc(head);
    /* If benchmarks step and the Advanced disclosure is collapsed, open it. */
    const advBody = active.querySelector('.adv-body');
    const advToggle = active.querySelector('.adv-toggle');
    if (advBody && advBody.style.display === 'none' && advToggle) advToggle.click();
  }
  renderGuidedNav();
  /* Scroll the step into view (top of the calc body). */
  const body = document.getElementById('calcBody');
  if (body) body.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function guidedNext() {
  /* Soft validation: warn (don't block) if the current step has unfilled key fields. */
  const step = WIZARD_STEPS[_guidedIdx];
  if (step && step.key.length) {
    const missing = step.key.filter(k => !fieldFilled(k));
    if (missing.length && !document.getElementById('guidedSkipConfirmed_' + _guidedIdx)) {
      const names = missing.map(prettyFieldName).join(', ');
      if (!confirm(`${step.label} is missing: ${names}.\n\nYou can fill these later. Continue to the next step anyway?`)) return;
      /* Remember they chose to skip this step's warning. */
      const flag = document.createElement('span');
      flag.id = 'guidedSkipConfirmed_' + _guidedIdx; flag.style.display = 'none';
      document.body.appendChild(flag);
    }
  }
  if (_guidedIdx >= GUIDED_SEQUENCE.length - 1) {
    /* Last input step done → jump to Executive View. */
    if (typeof switchTab === 'function') switchTab('exec');
    return;
  }
  showGuidedStep(_guidedIdx + 1);
}
function guidedBack() { if (_guidedIdx > 0) showGuidedStep(_guidedIdx - 1); }
function guidedGoTo(idx) { showGuidedStep(idx); }

function renderGuidedNav() {
  let nav = document.getElementById('guidedNav');
  if (!nav) {
    nav = document.createElement('div');
    nav.id = 'guidedNav';
    nav.className = 'guided-nav';
    const body = document.getElementById('calcBody');
    /* Place at the TOP of the calculator body (sticky), so the rep sees
       overall progress without scrolling to the bottom. */
    if (body) body.insertBefore(nav, body.firstChild);
  }
  nav.style.display = 'flex';
  const total = GUIDED_SEQUENCE.length;
  const stepLabels = ['Prospect details', 'Investment', 'Losses & OTIF', 'Benchmarks', 'Results'];
  const isLast = _guidedIdx >= total - 1;
  const dots = GUIDED_SEQUENCE.map((_, i) => {
    const step = WIZARD_STEPS[i];
    const st = step ? sectionStatus(step) : 'ready';
    const done = (st === 'done' || st === 'ready');
    const cls = i === _guidedIdx ? 'gd-cur' : done ? 'gd-done' : 'gd-todo';
    return `<button class="gd-dot ${cls}" onclick="guidedGoTo(${i})" title="${stepLabels[i]}" aria-label="Go to ${stepLabels[i]}">${done && i !== _guidedIdx ? '✓' : (i + 1)}</button>`;
  }).join('<span class="gd-line"></span>');

  nav.innerHTML = `
    <div class="gd-progress">${dots}</div>
    <div class="gd-controls">
      <span class="gd-step-label">Step ${_guidedIdx + 1} of ${total} · ${stepLabels[_guidedIdx]}</span>
      <div class="gd-btns">
        <button class="btn btn-ghost btn-sm" onclick="guidedBack()" ${_guidedIdx === 0 ? 'disabled' : ''}>← Back</button>
        <button class="btn btn-cta btn-sm" onclick="guidedNext()">${isLast ? 'Finish → Executive View' : 'Next →'}</button>
      </div>
    </div>`;
}

/* Inject the Guided-mode toggle into the calc header area (once). */
function initGuidedToggle() {
  if (document.getElementById('guidedToggle')) return;
  const bar = document.querySelector('.workflow-steps');
  if (!bar || !bar.parentElement) return;
  const wrap = document.createElement('div');
  wrap.className = 'guided-toggle-wrap';
  wrap.innerHTML = `
    <label class="guided-toggle" id="guidedToggle" role="switch" aria-checked="false" title="Walk through the calculator one step at a time">
      <input type="checkbox" id="guidedToggleChk" onchange="toggleGuidedMode(this.checked)"/>
      <span class="gt-track"><span class="gt-thumb"></span></span>
      <span class="gt-label">Guided mode</span>
    </label>`;
  bar.parentElement.insertBefore(wrap, bar);
  /* Restore preference. */
  let pref = false;
  try { pref = sessionStorage.getItem('ci_guided_mode') === '1'; } catch (e) {}
  if (pref) toggleGuidedMode(true);
}

/* Extend init to set up the toggle. */
const _origInitCalcWizard = (typeof initCalcWizard === 'function') ? initCalcWizard : null;
initCalcWizard = function () {
  if (_origInitCalcWizard) _origInitCalcWizard();
  initGuidedToggle();
};

if (typeof window !== 'undefined') {
  window.toggleGuidedMode = toggleGuidedMode;
  window.isGuidedOn = isGuidedOn;
  window.stampSectionNumbers = stampSectionNumbers;
  window.guidedNext = guidedNext;
  window.guidedBack = guidedBack;
  window.guidedGoTo = guidedGoTo;
  window.initCalcWizard = initCalcWizard;
}
