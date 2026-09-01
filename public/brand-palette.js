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
  const brand = window.CIBrand;
  const DRIVER_CHART_COLORS = brand.charts.categorical.slice();

  /* Deal-stage tag colors — SINGLE definition (was duplicated in app.js
     and versioning.js). */
  const STAGE_COLORS = Object.fromEntries(Object.entries(brand.colors.status).map(([key,value]) => [key, value.color]));

  /* Named extended-palette colors, for anywhere a semantic name reads
     better than an array index (audience tags, stakeholder roles, etc). */
  const CHART = Object.fromEntries(['teal','violet','gold','slate','berry'].map((key,index)=>[key,brand.charts.categorical[index+2]]));

  if (typeof window !== 'undefined') {
    window.DRIVER_CHART_COLORS = DRIVER_CHART_COLORS;
    window.STAGE_COLORS = STAGE_COLORS;
    window.CHART = CHART;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DRIVER_CHART_COLORS, STAGE_COLORS, CHART };
  }
})();
