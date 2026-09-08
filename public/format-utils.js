/* ═══════════════════════════════════════════════════════════════════
   format-utils.js — shared money/percent formatters.

   These were defined in app.js, but narrative.js calls them (fmtFull, fmt,
   fmtPct) and the PDF print page loads narrative.js WITHOUT app.js. That
   made buildExecHeadlines() throw "fmtFull is not defined" and the PDF fail
   with "Could not load scenario". Extracting them into a file loaded by both
   the calculator and the print page fixes it at the source.

   Loaded before app.js and before narrative.js on the print page.
   Attached to window so cross-<script> access is reliable.
   ═══════════════════════════════════════════════════════════════════ */
function fmt(n) {
  if (typeof moneyAbbrev === 'function') return moneyAbbrev(n);
  if (n===null||n===undefined||isNaN(n)) return '—';
  const abs=Math.abs(Math.round(n));
  if (abs>=1000000) return (n<0?'-$':'$')+(abs/1000000).toFixed(1).replace(/\.0$/,'')+'M';
  if (abs>=10000)   return (n<0?'-$':'$')+Math.round(abs/1000)+'K';
  return (n<0?'-$':'$')+abs.toLocaleString();
}
function fmtFull(n) {
  if (typeof moneyFull === 'function') return moneyFull(n);
  if (n===null||n===undefined||isNaN(n)) return '—';
  return (n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString();
}
function fmtPct(n) { if (n===null||n===undefined||isNaN(n)) return '—'; return Math.round(n)+'%'; }

if (typeof window !== 'undefined') {
  window.fmt = fmt; window.fmtFull = fmtFull; window.fmtPct = fmtPct;
}
