/* ═══════════════════════════════════════════════════════════════════
   pptx-export.js — Executive View → PowerPoint export

   Generates a 10-slide business case deck matching the Cloud Inventory
   "Value Story" template layout: 10" × 5.62" widescreen, CI theme
   colors, CI logo top-left on every slide, live data from the
   calculator (getVals + calcROI) and discovery answers.

   Library: pptxgenjs (loaded via CDN in index.html).
   All generation runs client-side; the .pptx downloads directly.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Template theme (from theme1.xml of the original deck) ── */
const PPT = {
  W: 10,           // slide width inches
  H: 5.625,        // slide height inches
  NAVY:      '1E2931',
  CYAN:      '00A9CC',
  ORANGE:    'C24A1E',
  ORANGE2:   'A6791E',
  RED:       'C81E10',
  GRAY_BG:   'F1F5F9',
  GRAY_TXT:  '64748B',
  DARK_TXT:  '1E293B',
  WHITE:     'FFFFFF',
  GREEN:     '2E7D32',
  LOGO:      'ci-logo-pptx.png',
  LOGO_W:    0.95,           // logo width in inches (1000:349 ratio)
  LOGO_H:    0.95 * 349/1000,
  FONT:      'Calibri'
};

/* ── Formatting helpers ── */
function pptFmtMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (typeof moneyAbbrev === 'function') return moneyAbbrev(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n/1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + Math.round(n/1e3) + 'K';
  return '$' + Math.round(n);
}
function pptFmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n) + '%';
}
function pptFmtPayback(pb) {
  if (pb === null || pb === undefined || isNaN(pb)) return '—';
  if (pb >= 60) return '60+ months';
  return pb.toFixed(1) + ' months';
}
function pptToday() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function pptIndustryLabel(key) {
  return (typeof IND !== 'undefined' && IND[key]) ? IND[key].label : 'your industry';
}
function pptDiscAnswer(id) {
  return (typeof discoveryAnswers !== 'undefined' && discoveryAnswers[id]) ? String(discoveryAnswers[id]).trim() : '';
}
/* Truncate long text so slides stay readable */
function pptTrunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1).trim() + '…' : str;
}

/* ── Shared slide chrome: logo + page number + light background ── */
function pptChrome(slide, pageNum) {
  slide.background = { color: PPT.GRAY_BG };
  slide.addImage({ path: PPT.LOGO, x: 0.38, y: 0.3, w: PPT.LOGO_W, h: PPT.LOGO_H });
  if (pageNum) {
    slide.addText(String(pageNum), {
      x: 0.15, y: PPT.H - 0.42, w: 0.5, h: 0.3,
      fontSize: 9, bold: true, color: PPT.NAVY, fontFace: PPT.FONT
    });
  }
}
/* Slide title in template style: cyan, bold, top-left below logo */
function pptTitle(slide, text) {
  slide.addText(text, {
    x: 0.45, y: 0.82, w: 8.0, h: 0.55,
    fontSize: 28, bold: true, color: PPT.CYAN, fontFace: PPT.FONT
  });
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT FUNCTION
   ═══════════════════════════════════════════════════════════════════ */
async function exportToPowerPoint() {
  if (typeof pptxgen === 'undefined') {
    showToast('PowerPoint library not loaded — check your connection and refresh.');
    return;
  }
  const btn = document.getElementById('pptxExportBtn');
  const btnOriginal = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building deck…'; }

  try {
    const v = getVals();
    const r = calcROI(v);
    const industryLabel = pptIndustryLabel(v.industry);
    const company = v.company && v.company !== 'Prospect' ? v.company : 'Your Company';
    const roiMultiple = r.totalInvestY1 > 0 ? (r.year1Benefit / r.totalInvestY1) : 0;

    const pptx = new pptxgen();
    pptx.defineLayout({ name: 'CI', width: PPT.W, height: PPT.H });
    pptx.layout = 'CI';
    pptx.author  = v.rep || 'Cloud Inventory';
    pptx.company = 'Cloud Inventory';
    pptx.title   = `Business Case — ${company}`;

    /* ════════ SLIDE 1 — COVER ════════ */
    {
      const s = pptx.addSlide();
      s.background = { color: PPT.GRAY_BG };
      /* Right navy panel (template has an image; we use a clean navy block) */
      s.addShape('rect', { x: 5.7, y: 0, w: 4.3, h: PPT.H, fill: { color: PPT.NAVY } });
      /* Cyan dot grid accent on the navy panel */
      for (let row = 0; row < 14; row++) {
        for (let col = 0; col < 5; col++) {
          s.addShape('ellipse', {
            x: 8.85 + col * 0.22, y: 0.35 + row * 0.36,
            w: 0.055, h: 0.055,
            fill: { color: PPT.CYAN, transparency: 15 + row * 4 }
          });
        }
      }
      s.addImage({ path: PPT.LOGO, x: 0.38, y: 0.35, w: 1.15, h: 1.15 * 349/1000 });
      s.addText('Business Case', {
        x: 0.42, y: 1.55, w: 5.1, h: 0.75,
        fontSize: 40, bold: true, color: PPT.DARK_TXT, fontFace: PPT.FONT
      });
      s.addText('& Value Story', {
        x: 0.42, y: 2.22, w: 5.1, h: 0.6,
        fontSize: 32, color: PPT.DARK_TXT, fontFace: PPT.FONT
      });
      s.addText(`Prepared for ${company}`, {
        x: 0.45, y: 3.15, w: 5.0, h: 0.4,
        fontSize: 16, bold: true, color: PPT.CYAN, fontFace: PPT.FONT
      });
      s.addText('Transform inventory from cost center to competitive advantage', {
        x: 0.45, y: 3.55, w: 4.9, h: 0.55,
        fontSize: 13, color: PPT.GRAY_TXT, fontFace: PPT.FONT
      });
      const metaLines = [pptToday()];
      if (v.rep) metaLines.push('Prepared by ' + v.rep);
      if (v.name && v.name !== 'Unnamed scenario') metaLines.push('Scenario: ' + v.name);
      s.addText(metaLines.join('   ·   '), {
        x: 0.45, y: 4.35, w: 5.0, h: 0.35,
        fontSize: 10, color: PPT.GRAY_TXT, fontFace: PPT.FONT
      });
    }

    /* ════════ SLIDE 2 — EXECUTIVE SUMMARY ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 2);
      pptTitle(s, 'Executive Summary');

      const currentState = pptTrunc(pptDiscAnswer('dq1') || pptDiscAnswer('dq2'), 160) ||
        'Manual processes and disconnected systems inflate costs, degrade service and increase risk.';

      s.addText('Current State', {
        x: 0.5, y: 1.6, w: 4.7, h: 0.35,
        fontSize: 16, bold: true, color: PPT.DARK_TXT, fontFace: PPT.FONT
      });
      s.addText(currentState, {
        x: 0.5, y: 1.95, w: 4.7, h: 0.75,
        fontSize: 12, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top'
      });
      s.addText('Opportunity', {
        x: 0.5, y: 2.8, w: 4.7, h: 0.35,
        fontSize: 16, bold: true, color: PPT.DARK_TXT, fontFace: PPT.FONT
      });
      s.addText(
        `Cloud Inventory delivers real-time visibility, mobility and low-code adaptability for ${industryLabel} — ` +
        `projecting ${pptFmtMoney(r.annualBenefit)} in annual benefit at steady state.`, {
        x: 0.5, y: 3.15, w: 4.7, h: 0.85,
        fontSize: 12, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top'
      });

      /* ROI callout — navy box, template style */
      s.addShape('roundRect', { x: 5.6, y: 1.6, w: 3.9, h: 2.35, rectRadius: 0.06, fill: { color: PPT.NAVY } });
      s.addText('Expected Outcome', {
        x: 5.85, y: 1.8, w: 3.4, h: 0.3,
        fontSize: 13, color: PPT.WHITE, fontFace: PPT.FONT
      });
      s.addText(pptFmtPct(r.roi) + ' ROI', {
        x: 5.85, y: 2.1, w: 3.4, h: 0.85,
        fontSize: 46, bold: true, color: PPT.WHITE, fontFace: PPT.FONT
      });
      s.addText(
        `Year-1 return with ${pptFmtPayback(r.paybackFromSigning)} payback from signing, ` +
        `through improved cash flow, service levels, and risk reduction.`, {
        x: 5.85, y: 2.95, w: 3.4, h: 0.85,
        fontSize: 11.5, color: PPT.WHITE, fontFace: PPT.FONT, valign: 'top'
      });

      /* Section nav dots along the bottom — template motif */
      const sections = ['Challenges','Root Causes','Opportunities','Financial Impact','Solution','Implementation','Success Stories','Next Steps'];
      const navY = 4.55, startX = 0.55, span = 8.9;
      s.addShape('line', { x: startX, y: navY + 0.05, w: span, h: 0, line: { color: 'BFDDE8', width: 2 } });
      sections.forEach((label, i) => {
        const cx = startX + (span / (sections.length - 1)) * i;
        s.addShape('ellipse', { x: cx - 0.055, y: navY - 0.005, w: 0.11, h: 0.11, fill: { color: PPT.CYAN } });
        s.addText(label, {
          x: cx - 0.6, y: navY + 0.16, w: 1.2, h: 0.25,
          fontSize: 8, color: PPT.GRAY_TXT, align: 'center', fontFace: PPT.FONT
        });
      });
    }

    /* ════════ SLIDE 3 — COST OF DOING NOTHING ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 3);
      pptTitle(s, 'Cost of Doing Nothing');

      const totalAtRisk = r.annualBenefit;
      const shrinkAnnual = r.shrinkSav / (v.mShrinkage || 1);
      const cards = [
        { title: 'Cost', color: PPT.CYAN,
          lines: [
            `${pptFmtMoney(totalAtRisk)} in annual benefit left unrealized every year the status quo continues`,
            `Carrying costs of ${pptFmtMoney(r.annualCarryCost)}/yr with reduction potential of ${pptFmtPct((v.mCarrying||0)*100)}`
          ]},
        { title: 'Service', color: PPT.GREEN,
          lines: [
            'Manual systems create hundreds of errors across spreadsheets',
            v.otifBaseline > 0
              ? `OTIF at ${v.otifBaseline}% today vs ${v.otifTarget || 'best-in-class'}% target — every point is revenue at risk`
              : 'Real-time visibility improves fulfilment speed & customer satisfaction'
          ]},
        { title: 'Risk', color: PPT.RED,
          lines: [
            shrinkAnnual > 0
              ? `${pptFmtMoney(shrinkAnnual)} in annual write-offs and shrinkage exposure`
              : 'Fragmented data weakens audit trails & compliance',
            'Legacy systems & manual processes create operational fragility'
          ]}
      ];
      cards.forEach((c, i) => {
        const x = 0.5 + i * 3.1;
        s.addShape('roundRect', { x, y: 1.65, w: 2.9, h: 2.75, rectRadius: 0.05, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
        s.addText(c.title, {
          x: x + 0.25, y: 1.9, w: 2.4, h: 0.4,
          fontSize: 18, bold: true, color: c.color, fontFace: PPT.FONT
        });
        s.addText(c.lines.map(t => ({ text: t, options: { bullet: { indent: 10 }, breakLine: true } })), {
          x: x + 0.25, y: 2.45, w: 2.45, h: 1.8,
          fontSize: 11, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top', paraSpaceAfter: 8
        });
      });
    }

    /* ════════ SLIDE 4 — ROOT CAUSES ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 4);
      pptTitle(s, 'Root Causes & Execution Gap');

      const painPoints = [pptDiscAnswer('dq3'), pptDiscAnswer('dq4'), pptDiscAnswer('dq5')].filter(Boolean);
      const cols = [
        { title: 'Manual Processes', color: PPT.CYAN,
          body: pptTrunc(painPoints[0], 130) || 'Paper-based and spreadsheet systems create delayed updates and high error rates' },
        { title: 'Disconnected Systems', color: PPT.GREEN,
          body: pptTrunc(painPoints[1], 130) || 'ERP, WMS & custom spreadsheets operate in silos — no single version of truth' },
        { title: 'Delayed Transactions', color: PPT.ORANGE,
          body: pptTrunc(painPoints[2], 130) || 'Data captured hours or days after the event — gap between planned, recorded & physical inventory' }
      ];
      cols.forEach((c, i) => {
        const x = 0.5 + i * 3.1;
        s.addShape('roundRect', { x, y: 1.65, w: 2.9, h: 2.6, rectRadius: 0.05, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
        s.addShape('roundRect', { x: x + 0.25, y: 1.9, w: 0.5, h: 0.5, rectRadius: 0.08, fill: { color: c.color, transparency: 82 } });
        s.addText(c.title, {
          x: x + 0.25, y: 2.55, w: 2.45, h: 0.55,
          fontSize: 15, bold: true, color: c.color, fontFace: PPT.FONT
        });
        s.addText(c.body, {
          x: x + 0.25, y: 3.1, w: 2.45, h: 1.05,
          fontSize: 11, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top'
        });
      });
    }

    /* ════════ SLIDE 5 — VALUE DRIVERS ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 5);
      pptTitle(s, 'Value Drivers & Opportunities');

      const drivers = [
        { t: 'Inventory Accuracy',  c: PPT.NAVY,   v: r.shrinkSav + r.carrySav, d: 'Reduced write-offs and carrying costs free working capital' },
        { t: 'Labor Efficiency',    c: PPT.GREEN,  v: r.laborSav,               d: 'Mobile, low-code workflows eliminate manual tasks and overtime' },
        { t: 'Service Excellence',  c: PPT.ORANGE, v: r.otifSav,                d: 'Real-time visibility accelerates throughput and improves fulfillment' },
        { t: 'Risk Reduction',      c: PPT.CYAN,   v: r.itSav,                  d: 'IT displacement plus better traceability & audit trails' },
        { t: 'Turns Carrying Savings', c: PPT.GREEN, v: r.turnsSav, d: r.capitalFreed > 0 ? `${pptFmtMoney(r.capitalFreed)} working capital identified; ${pptFmtMoney(r.turnsSav)} annual carrying-cost savings` : 'Annual carrying-cost savings from improved inventory turns' }
      ];
      /* 2×2 grid + 1 centered */
      const positions = [
        { x: 0.5,  y: 1.6 }, { x: 5.1, y: 1.6 },
        { x: 0.5,  y: 2.95 }, { x: 5.1, y: 2.95 },
        { x: 2.8,  y: 4.3 }
      ];
      drivers.forEach((d, i) => {
        const p = positions[i];
        const h = i === 4 ? 1.05 : 1.2;
        s.addShape('roundRect', { x: p.x, y: p.y, w: 4.4, h, rectRadius: 0.05, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
        s.addText([
          { text: d.t + '   ', options: { fontSize: 14, bold: true, color: d.c } },
          { text: d.v > 0 ? pptFmtMoney(d.v) + '/yr' : '', options: { fontSize: 14, bold: true, color: PPT.DARK_TXT } }
        ], {
          x: p.x + 0.22, y: p.y + 0.12, w: 4.0, h: 0.35, fontFace: PPT.FONT
        });
        s.addText(d.d, {
          x: p.x + 0.22, y: p.y + 0.47, w: 4.0, h: h - 0.55,
          fontSize: 10.5, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top'
        });
      });
    }

    /* ════════ SLIDE 6 — FINANCIAL IMPACT & ROI (chart) ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 6);
      pptTitle(s, 'Financial Impact & ROI');

      /* Native editable bar chart */
      const chartData = [{
        name: 'Annual benefit',
        labels: ['Inventory & Carrying', 'Labor Savings', 'Service Revenue', 'Risk & IT'],
        values: [
          Math.round(r.shrinkSav + r.carrySav + r.turnsSav),
          Math.round(r.laborSav),
          Math.round(r.otifSav),
          Math.round(r.itSav)
        ]
      }];
      s.addChart('bar', chartData, {
        x: 0.45, y: 1.6, w: 5.3, h: 3.4,
        barDir: 'col',
        chartColors: [PPT.CYAN],
        showValue: true,
        dataLabelFormatCode: '$#,##0,,"M";$#,##0,"K"',
        dataLabelFontSize: 10,
        dataLabelColor: PPT.NAVY,
        catAxisLabelFontSize: 11,
        valAxisLabelFontSize: 10,
        valAxisLabelFormatCode: '$#,##0,,"M"',
        showLegend: false,
        valGridLine: { color: 'D8DDE2', style: 'solid', size: 0.5 },
        catGridLine: { style: 'none' }
      });

      /* ROI summary card */
      s.addShape('roundRect', { x: 6.1, y: 1.7, w: 3.4, h: 3.1, rectRadius: 0.06, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
      s.addText('Estimated ROI', {
        x: 6.35, y: 1.9, w: 2.9, h: 0.35,
        fontSize: 17, bold: true, color: PPT.CYAN, fontFace: PPT.FONT
      });
      s.addText(pptFmtPct(r.roi) + ' Year-1 return', {
        x: 6.35, y: 2.28, w: 2.9, h: 0.35,
        fontSize: 15, bold: true, color: PPT.DARK_TXT, fontFace: PPT.FONT
      });
      const kv = [
        ['Annual benefit',   pptFmtMoney(r.annualBenefit)],
        ['Year-1 benefit',   pptFmtMoney(r.year1Benefit)],
        ['NPV (3-year)',     pptFmtMoney(r.npv3)],
        ['NPV (5-year)',     pptFmtMoney(r.npv5)],
        ['Payback',          pptFmtPayback(r.paybackFromSigning)]
      ];
      kv.forEach(([k, val], i) => {
        const y = 2.75 + i * 0.38;
        s.addText(k, { x: 6.35, y, w: 1.7, h: 0.3, fontSize: 11, color: PPT.GRAY_TXT, fontFace: PPT.FONT });
        s.addText(val, { x: 8.0, y, w: 1.4, h: 0.3, fontSize: 11, bold: true, color: PPT.NAVY, align: 'right', fontFace: PPT.FONT });
      });
    }

    /* ════════ SLIDE 7 — SOLUTION OVERVIEW ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 7);
      pptTitle(s, 'Solution Overview & Architecture');

      const layers = [
        { t: 'ERP / Legacy Systems',       d: 'SAP, Oracle, custom systems — connected, not replaced', c: PPT.GRAY_TXT },
        { t: 'Cloud Inventory Platform',   d: 'Real-time data engine · low-code configuration · offline-capable mobile apps', c: PPT.CYAN },
        { t: 'Execution Layer',            d: 'Receiving & put-away · picking & packing · field & service operations', c: PPT.NAVY }
      ];
      layers.forEach((l, i) => {
        const y = 1.7 + i * 1.0;
        s.addShape('roundRect', { x: 0.5, y, w: 5.4, h: 0.82, rectRadius: 0.05, fill: { color: PPT.WHITE }, line: { color: l.c, width: 1.25 } });
        s.addText(l.t, { x: 0.75, y: y + 0.08, w: 4.9, h: 0.3, fontSize: 14, bold: true, color: l.c, fontFace: PPT.FONT });
        s.addText(l.d, { x: 0.75, y: y + 0.4, w: 4.9, h: 0.32, fontSize: 10.5, color: PPT.GRAY_TXT, fontFace: PPT.FONT });
        if (i < layers.length - 1) {
          s.addShape('line', { x: 3.2, y: y + 0.82, w: 0, h: 0.18, line: { color: PPT.CYAN, width: 2, endArrowType: 'triangle' } });
        }
      });

      s.addShape('roundRect', { x: 6.3, y: 1.7, w: 3.2, h: 2.85, rectRadius: 0.05, fill: { color: PPT.NAVY } });
      s.addText('Why Cloud Inventory?', {
        x: 6.55, y: 1.9, w: 2.7, h: 0.35,
        fontSize: 14, bold: true, color: PPT.WHITE, fontFace: PPT.FONT
      });
      s.addText([
        { text: 'Real-time visibility across manufacturing, warehouse & field', options: { bullet: { indent: 8 }, breakLine: true } },
        { text: 'Mobile-first, works offline', options: { bullet: { indent: 8 }, breakLine: true } },
        { text: 'Low-code: rapid configuration without IT backlog', options: { bullet: { indent: 8 }, breakLine: true } },
        { text: 'Unified data & workflows — eliminates silos', options: { bullet: { indent: 8 } } }
      ], {
        x: 6.55, y: 2.3, w: 2.7, h: 2.1,
        fontSize: 10.5, color: PPT.WHITE, fontFace: PPT.FONT, valign: 'top', paraSpaceAfter: 7
      });
    }

    /* ════════ SLIDE 8 — IMPLEMENTATION PLAN ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 8);
      pptTitle(s, 'Implementation & Adoption Plan');
      s.addText('Proven methodology ensures rapid deployment and minimal disruption', {
        x: 0.45, y: 1.4, w: 8.5, h: 0.35,
        fontSize: 13, color: PPT.GRAY_TXT, fontFace: PPT.FONT
      });

      const implTotal = Math.max(1, Math.round(v.implMonths || 3));
      const phases = [
        { t: 'Assess',    w: 'Weeks 1–2',                     c: PPT.NAVY,   d: 'Align on scope, success criteria & baseline metrics' },
        { t: 'Configure', w: 'Weeks 2–4',                     c: PPT.GREEN,  d: 'Tailor workflows & data structures using low-code tools' },
        { t: 'Pilot',     w: 'Weeks 4–6',                     c: PPT.ORANGE, d: 'Validate solution in a controlled environment' },
        { t: 'Roll-Out',  w: `Through month ${implTotal}`,     c: PPT.NAVY,   d: 'Deploy across sites with training & change management' },
        { t: 'Optimize',  w: 'Ongoing',                        c: PPT.GREEN,  d: 'Continuously monitor performance & refine processes' }
      ];
      phases.forEach((p, i) => {
        const x = 0.42 + i * 1.86;
        s.addShape('roundRect', { x, y: 2.05, w: 1.72, h: 1.15, rectRadius: 0.05, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
        s.addText(p.t, { x: x + 0.1, y: 2.2,  w: 1.52, h: 0.35, fontSize: 15, bold: true, color: p.c, align: 'center', fontFace: PPT.FONT });
        s.addText(p.w, { x: x + 0.1, y: 2.58, w: 1.52, h: 0.3,  fontSize: 10, color: PPT.GRAY_TXT, align: 'center', fontFace: PPT.FONT });
        s.addText(p.d, { x: x + 0.05, y: 3.35, w: 1.66, h: 1.1, fontSize: 9.5, color: PPT.GRAY_TXT, align: 'center', fontFace: PPT.FONT, valign: 'top' });
        if (i < phases.length - 1) {
          s.addShape('line', { x: x + 1.72, y: 2.62, w: 0.14, h: 0, line: { color: PPT.CYAN, width: 1.75, endArrowType: 'triangle' } });
        }
      });
      s.addText(
        `Go-live in ~${implTotal} month${implTotal !== 1 ? 's' : ''} · benefits ramp to full run-rate by month ${implTotal + 3}`, {
        x: 0.45, y: 4.65, w: 9.0, h: 0.35,
        fontSize: 12, italic: true, color: PPT.NAVY, align: 'center', fontFace: PPT.FONT
      });
    }

    /* ════════ SLIDE 9 — CUSTOMER SUCCESS STORIES ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 9);
      pptTitle(s, 'Customer Success Stories');

      const stories = [
        { co: 'Womble Company', ind: 'Manufacturing & Field Services',
          pts: ['Improved inventory accuracy & customer satisfaction', 'Tracked 57K miles of pipe with zero loss', 'Employees refocused on value-added tasks'] },
        { co: 'Old Dutch Foods', ind: 'Food Distribution',
          pts: ['Hundreds of thousands saved in TCO', 'Real-time visibility anywhere, anytime', 'Drivers sell more, admin reduced'] },
        { co: 'Domtar', ind: 'Pulp & Paper',
          pts: ['Manual processes eliminated', 'Remote rollouts with minimal disruption', 'Real-time visibility across warehouses'] }
      ];
      stories.forEach((st, i) => {
        const x = 0.5 + i * 3.1;
        s.addShape('roundRect', { x, y: 1.65, w: 2.9, h: 2.9, rectRadius: 0.05, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
        s.addText(st.co, { x: x + 0.22, y: 1.85, w: 2.5, h: 0.35, fontSize: 14, bold: true, color: PPT.NAVY, fontFace: PPT.FONT });
        s.addText(st.ind, { x: x + 0.22, y: 2.2, w: 2.5, h: 0.28, fontSize: 10, italic: true, color: PPT.CYAN, fontFace: PPT.FONT });
        s.addText(st.pts.map(t => ({ text: t, options: { bullet: { indent: 8 }, breakLine: true } })), {
          x: x + 0.22, y: 2.55, w: 2.5, h: 1.85,
          fontSize: 10.5, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top', paraSpaceAfter: 7
        });
      });
    }

    /* ════════ SLIDE 10 — CONCLUSION & NEXT STEPS ════════ */
    {
      const s = pptx.addSlide();
      pptChrome(s, 10);
      pptTitle(s, 'Conclusion & Next Steps');

      s.addText('WHAT SUCCESS LOOKS LIKE', {
        x: 0.5, y: 1.5, w: 4.6, h: 0.3,
        fontSize: 13, bold: true, color: PPT.DARK_TXT, fontFace: PPT.FONT
      });
      const successes = [
        { h: 'Improve inventory accuracy & visibility', d: `${pptFmtMoney(r.shrinkSav + r.carrySav)}/yr from accuracy and carrying-cost gains` },
        { h: 'Reduce carrying costs & operational waste', d: `${pptFmtMoney(r.laborSav)}/yr in labor efficiency across ${v.users || '—'} users` },
        { h: 'Strengthen compliance, traceability & service', d: `${pptFmtMoney(r.otifSav + r.itSav)}/yr from service revenue and risk reduction` }
      ];
      successes.forEach((it, i) => {
        const y = 1.9 + i * 0.78;
        s.addText(it.h, { x: 0.5, y, w: 4.6, h: 0.3, fontSize: 12.5, bold: true, color: PPT.CYAN, fontFace: PPT.FONT });
        s.addText(it.d, { x: 0.5, y: y + 0.28, w: 4.6, h: 0.42, fontSize: 11, color: PPT.GRAY_TXT, fontFace: PPT.FONT, valign: 'top' });
      });

      s.addText('NEXT STEPS', {
        x: 5.6, y: 1.5, w: 3.9, h: 0.3,
        fontSize: 13, bold: true, color: PPT.DARK_TXT, align: 'center', fontFace: PPT.FONT
      });
      const steps = [
        'Validate business case with your data',
        'Align on success criteria & priorities',
        'Schedule a solution design workshop',
        'Plan pilot & phased implementation',
        'Build a custom ROI model & final proposal'
      ];
      steps.forEach((t, i) => {
        const y = 1.88 + i * 0.52;
        s.addShape('roundRect', { x: 5.6, y, w: 3.9, h: 0.42, rectRadius: 0.04, fill: { color: PPT.WHITE }, line: { color: 'E0E4E8', width: 0.75 } });
        s.addText(t, { x: 5.75, y: y + 0.03, w: 3.6, h: 0.36, fontSize: 10.5, bold: true, color: PPT.NAVY, align: 'center', valign: 'middle', fontFace: PPT.FONT });
        if (i < steps.length - 1) {
          s.addShape('line', { x: 7.55, y: y + 0.42, w: 0, h: 0.1, line: { color: PPT.CYAN, width: 1.5, endArrowType: 'triangle' } });
        }
      });

      s.addShape('roundRect', { x: 0.9, y: 4.62, w: 8.2, h: 0.55, rectRadius: 0.05, fill: { color: 'E3F3F8' } });
      s.addText([
        { text: "Let's design your ", options: { color: PPT.DARK_TXT } },
        { text: 'digital inventory solution', options: { color: PPT.CYAN, bold: true } },
        { text: ' together.', options: { color: PPT.DARK_TXT } }
      ], {
        x: 0.9, y: 4.62, w: 8.2, h: 0.55,
        fontSize: 15, bold: true, align: 'center', valign: 'middle', fontFace: PPT.FONT
      });
    }

    /* ── Download ── */
    const safeCompany = company.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().replace(/\s+/g, '-') || 'Prospect';
    await pptx.writeFile({ fileName: `Business-Case-${safeCompany}-${new Date().toISOString().split('T')[0]}.pptx` });

    if (typeof trackEvent === 'function') trackEvent('pptx_exported', { company });
    showToast('PowerPoint deck downloaded!');

  } catch (err) {
    console.error('PPTX export error:', err);
    showToast('Export failed: ' + (err.message || 'unknown error'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnOriginal || 'Export to PowerPoint'; }
  }
}
