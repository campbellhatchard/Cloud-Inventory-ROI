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
  revenue:            { label: 'Annual revenue',   floor: 100000,  hint: 'Whole dollars — no $ or commas (e.g. 50000000)' },
  inventoryValue:     { label: 'Inventory value',  floor: 10000,   hint: 'Whole dollars — no $ or commas (e.g. 10000000)' },
  annualWriteOff:     { label: 'Write-off value',  floor: 1000,    hint: 'Whole dollars — annual figure (e.g. 200000)' },
  itCost:             { label: 'IT / systems cost',floor: 1000,    hint: 'Whole dollars — annual figure (e.g. 240000)' },
  invest:             { label: 'Investment',       floor: 1000,    hint: 'Whole dollars — annual license/subscription (e.g. 120000)' },
  laborCost:          { label: 'Fully-loaded labor cost', floor: 10000, hint: 'Whole dollars per person/year (e.g. 60000)' },
  expediteSpendYr:    { label: 'Expedite spend',   floor: 1000,    hint: 'Whole dollars per year (e.g. 400000)' },
  fieldInventoryValue:{ label: 'Field inventory value', floor: 1000, hint: 'Whole dollars (e.g. 2000000)' },
  costPerTruckRoll:   { label: 'Cost per truck roll', floor: 10,   hint: 'Whole dollars per visit (e.g. 300)' },
  revenuePerJob:      { label: 'Revenue per job',  floor: 10,      hint: 'Whole dollars per job (e.g. 250)' },
  costPerOrder:       { label: 'Cost per order',   floor: 0.1,     hint: 'Dollars per order (e.g. 3.50)' },
  costPerError:       { label: 'Cost per error',   floor: 1,       hint: 'Dollars per mis-ship (e.g. 120)' },
  downtimeCostPerHr:  { label: 'Downtime cost/hr', floor: 10,      hint: 'Dollars per hour (e.g. 5000)' }
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

/* Layer 1 — persistent format hint under each dollar field (idempotent). */
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
    /* Place after any existing range-warning slot, else right after the input. */
    el.insertAdjacentElement('afterend', hint);
  });
}

/* Layer 2 — magnitude sanity warning (reuses the range-warn styling). */
function checkDollarMagnitude(id) {
  const el = document.getElementById(id);
  const rule = DOLLAR_FIELDS[id];
  if (!el || !rule) return;
  let note = document.getElementById(id + '_mag');
  const val = parseFloat(el.value);
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
}

if (typeof window !== 'undefined') {
  window.bindInputFormat = bindInputFormat;
  window.parseMoneyLoose = parseMoneyLoose;
  window.checkDollarMagnitude = checkDollarMagnitude;
}
