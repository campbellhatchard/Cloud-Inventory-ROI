/* ═══════════════════════════════════════════════════════════════════
   brand-palette.js — single source for categorical/extended colors
   Previously duplicated verbatim in app.js AND versioning.js (a DRY
   violation — any color change had to happen in two places or they'd
   drift). Now defined once and referenced by both.
   Values mirror the CSS custom properties in style.css :root; kept as a
   JS object too because several call sites build inline style strings
   / SVG fill attributes where a literal hex is simpler than resolving
   a CSS var at runtime.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* The 6-slot rotation used for the value-driver breakdown chart
     (Exec View) — 2 core brand colors + 4 extended categorical colors. */
  const DRIVER_CHART_COLORS = ['#0089A6', '#2E7D32', '#12786F', '#A6791E', '#6A4C93', '#45688A'];

  /* Deal-stage tag colors — SINGLE definition (was duplicated in app.js
     and versioning.js). */
  const STAGE_COLORS = {
    Discovery: '#0089A6',
    Demo: '#A6791E',
    Proposal: '#12786F',
    Negotiation: '#6A4C93',
    'Closed Won': '#2E7D32',
    'Closed Lost': '#C81E10'
  };

  /* Named extended-palette colors, for anywhere a semantic name reads
     better than an array index (audience tags, stakeholder roles, etc). */
  const CHART = {
    teal: '#12786F', violet: '#6A4C93', gold: '#A6791E',
    slate: '#45688A', berry: '#A23E5C'
  };

  if (typeof window !== 'undefined') {
    window.DRIVER_CHART_COLORS = DRIVER_CHART_COLORS;
    window.STAGE_COLORS = STAGE_COLORS;
    window.CHART = CHART;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DRIVER_CHART_COLORS, STAGE_COLORS, CHART };
  }
})();
