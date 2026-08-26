/* ═══════════════════════════════════════════════════════════════════
   exec-infographics.js — data visualizations for the Executive View
   Two SVG infographics that make the business case more legible to a CFO:
     1. Benefit waterfall — how the value drivers build up, then how the
        ramp adjustment brings gross → defensible year-1 figure.
     2. Payback timeline — signing → implementation → ramp → break-even.
   Pure SVG (no libraries), themed via CSS variables so they follow the
   brand palette. Data comes from calcROI(); no new calculation.
   ═══════════════════════════════════════════════════════════════════ */

function fmtAbbrev(n) {
  if (typeof moneyAbbrev === 'function') return moneyAbbrev(n);
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}
function escInfo(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── 1. Benefit waterfall ───────────────────────────────────────────
   Rising bars for each value driver (steady-state), then a downward
   "ramp adjustment" step, ending on the ramp-adjusted Year-1 benefit.
   Communicates BOTH the composition and the conservatism in one view. */
function buildBenefitWaterfall(r) {
  const drivers = [
    { label: 'Labor',      val: r.laborSav },
    { label: 'Shrink',     val: r.shrinkSav },
    { label: 'Carrying',   val: r.carrySav },
    { label: 'OTIF',       val: r.otifSav },
    { label: 'Turns',      val: r.turnsSav },
    { label: 'IT',         val: r.itSav },
    { label: 'Ops levers', val: r.newLeverSav },
    { label: 'Warehouse',  val: r.wmsLeverSav },
    { label: 'Field',      val: r.fieldInvSav }
  ].filter(d => d.val > 0);
  if (!drivers.length) return '';

  const steady = r.annualBenefit || 0;
  const year1  = r.year1Benefit || 0;
  const rampDrop = Math.max(0, steady - year1);

  /* Layout */
  const W = 720, H = 300, padL = 48, padR = 16, padT = 20, padB = 56;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const peak = steady;                       // tallest point = full steady-state
  const yScale = v => plotH * (v / (peak || 1));
  const yBase = padT + plotH;

  /* Bar slots: drivers + [ramp adj] + [year-1 total] */
  const slots = drivers.length + 2;
  const gap = 10;
  const bw = Math.max(18, (plotW - gap * (slots - 1)) / slots);

  let cum = 0, x = padL, bars = '';
  const brand = ['var(--cyan)', 'var(--green)', 'var(--cyan-dark)', 'var(--amber)', 'var(--navy-light)', 'var(--blue)', 'var(--navy-mid)', 'var(--cyan)', 'var(--green)'];

  /* Rising driver bars (each stacks on the running cumulative). */
  drivers.forEach((d, i) => {
    const h = yScale(d.val);
    const yTop = yBase - yScale(cum) - h;
    bars += `<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${brand[i % brand.length]}"><title>${escInfo(d.label)}: ${fmtAbbrev(d.val)}</title></rect>
      <text class="wf-vlabel" x="${(x + bw/2).toFixed(1)}" y="${(yTop - 4).toFixed(1)}">${fmtAbbrev(d.val)}</text>
      <text class="wf-xlabel" x="${(x + bw/2).toFixed(1)}" y="${(yBase + 14).toFixed(1)}" transform="rotate(35 ${(x + bw/2).toFixed(1)} ${(yBase + 14).toFixed(1)})">${escInfo(d.label)}</text>`;
    /* connector line to next bar top */
    cum += d.val;
    const connY = yBase - yScale(cum);
    bars += `<line class="wf-conn" x1="${x.toFixed(1)}" y1="${connY.toFixed(1)}" x2="${(x + bw + gap).toFixed(1)}" y2="${connY.toFixed(1)}"/>`;
    x += bw + gap;
  });

  /* Ramp-adjustment downward step (steady → year-1). */
  if (rampDrop > 0) {
    const h = yScale(rampDrop);
    const yTop = yBase - yScale(steady);
    bars += `<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--gray-300)"><title>Year-1 ramp adjustment: −${fmtAbbrev(rampDrop)}</title></rect>
      <text class="wf-vlabel wf-drop" x="${(x + bw/2).toFixed(1)}" y="${(yTop - 4).toFixed(1)}">−${fmtAbbrev(rampDrop)}</text>
      <text class="wf-xlabel" x="${(x + bw/2).toFixed(1)}" y="${(yBase + 14).toFixed(1)}" transform="rotate(35 ${(x + bw/2).toFixed(1)} ${(yBase + 14).toFixed(1)})">Ramp adj.</text>`;
    x += bw + gap;
  }

  /* Final total bar (year-1 benefit). */
  const th = yScale(year1);
  const tyTop = yBase - th;
  bars += `<rect x="${x.toFixed(1)}" y="${tyTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${th.toFixed(1)}" rx="2" fill="var(--navy)"><title>Year-1 benefit: ${fmtAbbrev(year1)}</title></rect>
    <text class="wf-vlabel wf-total" x="${(x + bw/2).toFixed(1)}" y="${(tyTop - 4).toFixed(1)}">${fmtAbbrev(year1)}</text>
    <text class="wf-xlabel wf-xtotal" x="${(x + bw/2).toFixed(1)}" y="${(yBase + 14).toFixed(1)}" transform="rotate(35 ${(x + bw/2).toFixed(1)} ${(yBase + 14).toFixed(1)})">Year 1</text>`;

  /* Baseline axis */
  const axis = `<line x1="${padL}" y1="${yBase}" x2="${W - padR}" y2="${yBase}" class="wf-axis"/>`;

  return `<div class="e-section infographic-section">
    <div class="e-h2">How the annual benefit builds — and our year-1 adjustment</div>
    <div class="e-driver-lede">Each driver is quantified independently from your data. The grey step shows the conservative ramp adjustment applied in year one; the final bar is the figure we stand behind.</div>
    <svg class="wf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Benefit waterfall: value drivers building to a ramp-adjusted year-one benefit of ${fmtAbbrev(year1)}">
      ${axis}${bars}
    </svg>
    <div class="wf-legend">
      <span><span class="wf-key" style="background:var(--cyan);"></span>Value drivers (steady-state)</span>
      <span><span class="wf-key" style="background:var(--gray-300);"></span>Year-1 ramp adjustment</span>
      <span><span class="wf-key" style="background:var(--navy);"></span>Year-1 benefit</span>
    </div>
  </div>`;
}

/* ── 2. Payback timeline ────────────────────────────────────────────
   A horizontal band: signing → implementation (no benefit) → ramp →
   break-even marker. Makes an abstract "9-month payback" concrete.      */
function buildPaybackTimeline(r, v) {
  const paySign = r.paybackFromSigning;
  const impl = Math.round((v && v.implMonths) || r.implMonths || 0);
  /* Horizon: show through break-even + a little, min 12 months. */
  const beMonth = (paySign === null || paySign === undefined) ? null : paySign;
  const horizon = Math.max(12, Math.ceil(((beMonth || 12) + 2) / 3) * 3);

  const W = 720, H = 130, padL = 16, padR = 16, padT = 34, trackH = 30;
  const plotW = W - padL - padR;
  const mToX = m => padL + plotW * (m / horizon);

  /* Phase bands */
  const implEnd = mToX(impl);
  const rampEnd = mToX(Math.min(impl + 3, horizon));
  let bands = '';
  if (impl > 0) {
    bands += `<rect x="${padL}" y="${padT}" width="${(implEnd - padL).toFixed(1)}" height="${trackH}" fill="var(--gray-200)" rx="3"><title>Implementation: ${impl} mo (no benefit)</title></rect>
      <text class="pt-band" x="${((padL + implEnd) / 2).toFixed(1)}" y="${(padT + trackH/2 + 4)}">Implementation</text>`;
  }
  bands += `<rect x="${implEnd.toFixed(1)}" y="${padT}" width="${(rampEnd - implEnd).toFixed(1)}" height="${trackH}" fill="var(--amber)" opacity="0.35" rx="3"><title>Ramp-up: ~3 mo</title></rect>
    <text class="pt-band" x="${((implEnd + rampEnd) / 2).toFixed(1)}" y="${(padT + trackH/2 + 4)}">Ramp</text>`;
  bands += `<rect x="${rampEnd.toFixed(1)}" y="${padT}" width="${(W - padR - rampEnd).toFixed(1)}" height="${trackH}" fill="var(--cyan)" opacity="0.20" rx="3"></rect>
    <text class="pt-band" x="${((rampEnd + W - padR) / 2).toFixed(1)}" y="${(padT + trackH/2 + 4)}">Full run-rate</text>`;

  /* Break-even marker */
  let marker = '';
  if (beMonth !== null && beMonth !== undefined && beMonth <= horizon) {
    const bx = mToX(beMonth);
    marker = `<line x1="${bx.toFixed(1)}" y1="${padT - 10}" x2="${bx.toFixed(1)}" y2="${padT + trackH + 10}" class="pt-be-line"/>
      <circle cx="${bx.toFixed(1)}" cy="${padT - 10}" r="4" class="pt-be-dot"/>
      <text class="pt-be-label" x="${bx.toFixed(1)}" y="${padT - 16}" text-anchor="middle">Break-even · ${beMonth.toFixed(1)} mo</text>`;
  } else {
    marker = `<text class="pt-be-label" x="${(W/2).toFixed(1)}" y="${padT - 16}" text-anchor="middle">Break-even beyond ${horizon} months</text>`;
  }

  /* Month ticks (quarterly) */
  let ticks = '';
  for (let m = 0; m <= horizon; m += 3) {
    const tx = mToX(m);
    ticks += `<text class="pt-tick" x="${tx.toFixed(1)}" y="${(padT + trackH + 22)}" text-anchor="middle">${m}mo</text>`;
  }

  return `<div class="e-section infographic-section">
    <div class="e-h2">Payback timeline</div>
    <div class="e-driver-lede">From contract signing through implementation and ramp-up to the point cumulative benefit repays the investment.</div>
    <svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Payback timeline showing break-even at ${beMonth === null ? 'beyond horizon' : beMonth + ' months'} from signing">
      ${bands}${marker}${ticks}
    </svg>
  </div>`;
}

/* Build both, returned as one HTML block for insertion into the exec doc. */
function buildExecInfographics(r, v) {
  try {
    return buildBenefitWaterfall(r) + buildPaybackTimeline(r, v);
  } catch (e) {
    console.error('infographic build error:', e.message);
    return '';
  }
}

if (typeof window !== 'undefined') {
  window.buildExecInfographics = buildExecInfographics;
  window.buildBenefitWaterfall = buildBenefitWaterfall;
  window.buildPaybackTimeline = buildPaybackTimeline;
}
