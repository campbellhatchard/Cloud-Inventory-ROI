/* ═══════════════════════════════════════════════════════════════════
   input-format.js — format guidance & forgiving input for ROI $ fields
   Closes the gap where the calculator silently rejected bad-format input
   (e.g. "$50M", "50,000,000") without telling the user what's expected.
   Three additive layers, all keeping the native type="number" protection:
     1. Persistent format hints under each dollar field.
     2. Magnitude sanity warnings ("$50 looks low — did you mean $50,000,000?").
     3. Paste-normalize: paste "$50M" or "50,000,000" → sets 50000000 and
        shows what was interpreted.
   ═══════════════════════════════════════════════════════════════════ */

/* Dollar-denominated ROI inputs, with a plausible-floor for magnitude checks.
   `floor` = a value below which the figure is almost certainly an
   order-of-magnitude entry error (e.g. revenue typed as "50" meaning $50M).
   Floors are deliberately conservative so small-but-real values don't warn. */
const DOLLAR_FIELDS = {
  revenue:            { label: 'Annual revenue',   floor: 100000,  hint: 'Whole dollars — commas added automatically (e.g. 50,000,000)' },
  inventoryValue:     { label: 'Inventory value',  floor: 10000,   hint: 'Whole dollars — commas added automatically (e.g. 10,000,000)' },
  annualWriteOff:     { label: 'Write-off value',  floor: 1000,    hint: 'Whole dollars — annual figure (e.g. 200,000)' },
  itCost:             { label: 'IT / systems cost',floor: 1000,    hint: 'Whole dollars — annual figure (e.g. 240,000)' },
  invest:             { label: 'Investment',       floor: 1000,    hint: 'Whole dollars — annual license/subscription (e.g. 120,000)' },
  laborCost:          { label: 'Fully-loaded labor cost', floor: 10000, hint: 'Whole dollars per person/year (e.g. 60,000)' },
  expediteSpendYr:    { label: 'Expedite spend',   floor: 1000,    hint: 'Whole dollars per year (e.g. 400,000)' },
  fieldInvValue:      { label: 'Field inventory value', floor: 1000, hint: 'Whole dollars (e.g. 2,000,000)' },
  fieldReconcileCost: { label: 'Reconciliation cost', floor: 10,    hint: 'Whole dollars per reconciliation (e.g. 500)' },
  psvcCost:           { label: 'Professional services', floor: 100, hint: 'One-time whole dollars (e.g. 50,000)' },
  hwCost:             { label: 'Hardware',          floor: 100,     hint: 'One-time whole dollars (e.g. 30,000)' },
  trainCost:          { label: 'Training',          floor: 100,     hint: 'One-time whole dollars (e.g. 10,000)' },
  costPerTruckRoll:   { label: 'Cost per truck roll', floor: 10,   hint: 'Whole dollars per visit (e.g. 300)' },
  costPerOrder:       { label: 'Cost per order',   floor: 0.1,     hint: 'Dollars per order (e.g. 3.50)' },
  costPerError:       { label: 'Cost per error',   floor: 1,       hint: 'Dollars per mis-ship (e.g. 120)' },
  downtimeCostPerHr:  { label: 'Downtime cost/hr', floor: 10,      hint: 'Whole dollars per hour (e.g. 5,000)' }
};

/* Parse a loosely-formatted money string into a number.
   Handles $, commas, spaces, and K/M/B/M suffixes. Returns null if nothing
   numeric is present. "$50M" → 50000000 ; "1,250,000" → 1250000 ; "2.5k" → 2500 */
function parseMoneyLoose(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim().toLowerCase().replace(/[$,\s]/g, '');
  if (s === '') return null;
  let mult = 1;
  const suf = s.slice(-1);
  if (suf === 'k') { mult = 1e3; s = s.slice(0, -1); }
  else if (suf === 'm') { mult = 1e6; s = s.slice(0, -1); }
  else if (suf === 'b') { mult = 1e9; s = s.slice(0, -1); }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return n * mult;
}

/* Whole-dollar fields that should show live thousands separators as the user
   types (e.g. 27000000 → 27,000,000). Decimal fields (costPerOrder,
   costPerError) are excluded — commas + decimals get messy and their values
   are small enough not to need grouping. */
const COMMA_FORMAT_FIELDS = [
  'revenue','inventoryValue','annualWriteOff','itCost','invest','laborCost',
  'expediteSpendYr','downtimeCostPerHr',
  'fieldInvValue','fieldReconcileCost','psvcCost','hwCost','trainCost','costPerError'
];

/* Format a raw numeric string with thousands separators, preserving a
   trailing decimal the user is mid-typing. Returns '' for empty. */
function formatWithCommas(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/[^0-9.]/g, '');
  if (s === '') return '';
  /* Keep only the first dot; drop extras. */
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  const [intPart, decPart] = s.split('.');
  const grouped = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? grouped + '.' + decPart : grouped;
}

/* Apply live formatting to one field, keeping the caret in a sensible spot.
   Called on every input event for COMMA_FORMAT_FIELDS. */
function applyLiveCommaFormat(el) {
  if (!el) return;
  const before = el.value;
  const caret = el.selectionStart;
  const digitsBeforeCaret = before.slice(0, caret).replace(/[^0-9]/g, '').length;

  const formatted = formatWithCommas(before);
  if (formatted === before) return;
  el.value = formatted;

  /* Restore caret: walk forward until we've passed the same number of digits. */
  let seen = 0, pos = 0;
  while (pos < formatted.length && seen < digitsBeforeCaret) {
    if (/[0-9]/.test(formatted[pos])) seen++;
    pos++;
  }
  try { el.setSelectionRange(pos, pos); } catch (e) { /* not focusable */ }
}


function injectFormatHints() {
  Object.keys(DOLLAR_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (!el || el._fmtHint) return;
    el._fmtHint = true;
    if (document.getElementById(id + '_fmt')) return;
    const hint = document.createElement('div');
    hint.id = id + '_fmt';
    hint.className = 'fmt-hint';
    hint.textContent = DOLLAR_FIELDS[id].hint;
    /* Insert after the affix-wrap ($ prefix container) if present,
       or after the .field parent, so the hint sits BELOW the input
       and is never trapped inside affix-wrap where it overlaps the text.
       ui-v4.js wraps inputs after this runs, so we also re-anchor in
       a rAF pass to catch any hints still inside an affix-wrap.        */
    const affixWrap = el.closest('.affix-wrap');
    const fieldWrap = el.closest('.field');
    const anchor = affixWrap || fieldWrap || el;
    anchor.insertAdjacentElement('afterend', hint);
  });
  /* Re-anchor any hint that ended up inside an affix-wrap after ui-v4 ran */
  requestAnimationFrame(function() {
    Object.keys(DOLLAR_FIELDS).forEach(id => {
      const hint = document.getElementById(id + '_fmt');
      if (!hint) return;
      const wrap = hint.closest('.affix-wrap');
      if (!wrap) return;
      /* Move the hint immediately after the affix-wrap */
      wrap.insertAdjacentElement('afterend', hint);
    });
  });
}

/* Layer 2 — magnitude sanity warning (reuses the range-warn styling). */
function checkDollarMagnitude(id) {
  const el = document.getElementById(id);
  const rule = DOLLAR_FIELDS[id];
  if (!el || !rule) return;
  let note = document.getElementById(id + '_mag');
  const val = parseFloat(String(el.value).replace(/[$,\s]/g, ''));
  const suspicious = el.value !== '' && !isNaN(val) && val > 0 && val < rule.floor;
  if (suspicious) {
    if (!note) {
      note = document.createElement('div');
      note.id = id + '_mag';
      note.className = 'range-warn';
      const anchor = document.getElementById(id + '_fmt') || el;
      anchor.insertAdjacentElement('afterend', note);
    }
    /* Suggest the likely intended value (×1,000 or ×1,000,000). */
    const sym = (typeof currencySymbol === 'function') ? currencySymbol() : '$';
    const suggestion = val < rule.floor / 1000
      ? sym + (val * 1e6).toLocaleString()
      : sym + (val * 1e3).toLocaleString();
    note.innerHTML = `⚠ ${rule.label} of ${sym}${val.toLocaleString()} looks unusually low. Did you mean ${suggestion}? Enter the full figure in whole ${(typeof currencyCode==='function'?currencyCode():'')} units.`;
    el.classList.add('input-range-warn');
  } else {
    if (note) note.remove();
    /* only clear the warn class if the percent range-check didn't also set it */
    if (!document.getElementById(id + '_range')) el.classList.remove('input-range-warn');
  }
}

/* Layer 3 — forgiving paste. Intercept paste of "$50M"/"1,250,000" into a
   number field, normalize, set the clean value, recalc, and show what was
   interpreted (so nothing is silently blanked or misread). */
function handleMoneyPaste(id, e) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = (e.clipboardData || window.clipboardData)?.getData('text');
  if (text == null) return;
  /* Only intervene when the pasted text isn't already a plain number the
     field would accept (contains $, comma, letter, or space). */
  if (!/[$,a-zA-Z\s]/.test(text)) return;
  const n = parseMoneyLoose(text);
  if (n === null) return;
  e.preventDefault();
  el.value = String(n);
  if (COMMA_FORMAT_FIELDS.includes(id)) applyLiveCommaFormat(el);
  el.dispatchEvent(new Event('input', { bubbles: true }));  // triggers recalc + checks
  /* Show interpretation briefly. */
  let note = document.getElementById(id + '_interp');
  if (!note) {
    note = document.createElement('div');
    note.id = id + '_interp';
    note.className = 'fmt-interp';
    el.insertAdjacentElement('afterend', note);
  }
  note.textContent = `Interpreted "${text.trim()}" as $${n.toLocaleString()}`;
  clearTimeout(note._t);
  note._t = setTimeout(() => { if (note) note.remove(); }, 4000);
}

function bindInputFormat() {
  injectFormatHints();
  Object.keys(DOLLAR_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (!el || el._fmtBound) return;
    el._fmtBound = true;
    el.addEventListener('input', () => checkDollarMagnitude(id));
    el.addEventListener('blur',  () => checkDollarMagnitude(id));
    el.addEventListener('paste', (e) => handleMoneyPaste(id, e));
  });
  /* Live thousands-formatting for whole-dollar fields. Runs before recalc so
     the stored value and display stay in sync. */
  COMMA_FORMAT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el._commaBound) return;
    el._commaBound = true;
    /* Format whatever value is already there (e.g. a loaded scenario). */
    if (el.value) applyLiveCommaFormat(el);
    el.addEventListener('input', () => applyLiveCommaFormat(el));
  });
}

if (typeof window !== 'undefined') {
  window.bindInputFormat = bindInputFormat;
  window.parseMoneyLoose = parseMoneyLoose;
  window.checkDollarMagnitude = checkDollarMagnitude;
}
