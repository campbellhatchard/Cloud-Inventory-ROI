/* ═══════════════════════════════════════════════════════════════════
   currency.js — multi-currency display for international deals
   Currency is a DISPLAY concern, not a conversion: a UK rep enters GBP
   figures and the ROI reads in GBP. The math is currency-agnostic (ratios
   and the customer's own numbers), so NO exchange-rate conversion happens
   — that would introduce error and undermine credibility. This module
   only changes the symbol, code, and formatting on displayed figures.

   Format: symbol + code, US-style grouping, e.g. "£1.2M GBP", "-€500K EUR".
   ═══════════════════════════════════════════════════════════════════ */

const CURRENCIES = {
  USD: { symbol: '$',  code: 'USD', label: 'US Dollar (USD)' },
  GBP: { symbol: '\u00A3', code: 'GBP', label: 'British Pound (GBP)' },
  EUR: { symbol: '\u20AC', code: 'EUR', label: 'Euro (EUR)' },
  AUD: { symbol: '$',  code: 'AUD', label: 'Australian Dollar (AUD)' },
  NZD: { symbol: '$',  code: 'NZD', label: 'New Zealand Dollar (NZD)' }
};

/* Active currency for the current scenario. Defaults to USD. Not persisted
   in a browser store — saved per-scenario on the server (see app wiring). */
let _activeCurrency = 'USD';

function setCurrency(code) {
  _activeCurrency = CURRENCIES[code] ? code : 'USD';
  const sel = document.getElementById('currencySelect');
  if (sel && sel.value !== _activeCurrency) sel.value = _activeCurrency;
  /* Re-render anything showing money. */
  if (typeof recalc === 'function') recalc();
  if (typeof renderExec === 'function' && document.getElementById('tab-exec')?.classList.contains('active')) renderExec();
}
function getCurrency() { return _activeCurrency; }
function currencySymbol() { return (CURRENCIES[_activeCurrency] || CURRENCIES.USD).symbol; }
function currencyCode()   { return (CURRENCIES[_activeCurrency] || CURRENCIES.USD).code; }

/* Core money formatters — currency-aware. These MIRROR the app's fmt/fmtFull
   contracts so they can back them. Format = symbol + number + " " + code.  */
function moneyFull(n) {
  if (n === null || n === undefined || isNaN(n)) return '\u2014';
  const sym = currencySymbol(), code = currencyCode();
  const sign = n < 0 ? '-' : '';
  return `${sign}${sym}${Math.abs(Math.round(n)).toLocaleString()} ${code}`;
}
function moneyAbbrev(n) {
  if (n === null || n === undefined || isNaN(n)) return '\u2014';
  const sym = currencySymbol(), code = currencyCode();
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? '-' : '';
  let body;
  if (abs >= 1e6) body = (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  else if (abs >= 1e4) body = Math.round(abs / 1e3) + 'K';
  else body = abs.toLocaleString();
  return `${sign}${sym}${body} ${code}`;
}

function initCurrency() {
  const sel = document.getElementById('currencySelect');
  if (sel && !sel._curBound) {
    sel.addEventListener('change', () => setCurrency(sel.value));
    sel._curBound = true;
  }
}

if (typeof window !== 'undefined') {
  window.CURRENCIES = CURRENCIES;
  window.setCurrency = setCurrency;
  window.getCurrency = getCurrency;
  window.currencySymbol = currencySymbol;
  window.currencyCode = currencyCode;
  window.moneyFull = moneyFull;
  window.moneyAbbrev = moneyAbbrev;
  window.initCurrency = initCurrency;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CURRENCIES, moneyFull, moneyAbbrev };
}
