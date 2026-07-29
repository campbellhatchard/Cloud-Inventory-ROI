/* ═══════════════════════════════════════════════════════════════════
   deal-export.js — Print/PDF + PowerPoint export for
   Mutual Action Plans and Stakeholder Maps.

   Print/PDF: opens a clean, CI-branded print window → browser print
              dialog → Save as PDF or print.
   PowerPoint: uses the same pptxgenjs engine as the Executive View.

   Action Plan has two variants:
     - internal  : shows every milestone owner (incl. Cloud Inventory items)
     - customer  : clean copy matching the prospect's shared view
   ═══════════════════════════════════════════════════════════════════ */

/* Reuse the theme + helpers from pptx-export.js (PPT, pptFmt*, pptChrome,
   pptTitle). Those load first, so they're available globally.          */

/* ── Small shared helpers ── */
function deChk(lib) {
  if (typeof PptxGenJS === 'undefined') {
    showToast('PowerPoint library not loaded — refresh and try again.');
    return false;
  }
  return true;
}
function deEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function deDate(d, opts) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
}
/* Open a clean print window with branded HTML and trigger print */
function dePrintWindow(title, innerHtml, extraCss) {
  const w = window.open('', '_blank');
  if (!w) { showToast('Pop-up blocked — allow pop-ups to print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${deEsc(title)}</title>
    <style>
      @page { margin: 0.6in; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #243646; line-height: 1.5; }
      .doc-head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #00A7CF; padding-bottom: 14px; margin-bottom: 20px; }
      .doc-head img { height: 42px; }
      .doc-head .ht { font-size: 12px; color: #5A6570; }
      h1 { font-size: 22px; color: #243646; margin-bottom: 4px; }
      .sub { font-size: 13px; color: #5A6570; margin-bottom: 18px; }
      h2 { font-size: 13px; color: #00A7CF; text-transform: uppercase; letter-spacing: .06em; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #E2E8F0; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
      th { background: #243646; color: #fff; font-size: 11px; text-align: left; padding: 7px 9px; }
      td { font-size: 12px; padding: 6px 9px; border-bottom: 1px solid #E8ECEF; vertical-align: top; }
      tr:nth-child(even) td { background: #F7F9FA; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .prog-wrap { height: 12px; background: #EEF2F5; border-radius: 6px; overflow: hidden; max-width: 320px; margin: 6px 0 14px; }
      .prog-fill { height: 100%; background: linear-gradient(90deg,#00A7CF,#2E7D32); }
      .meta-line { font-size: 12px; color: #5A6570; margin-bottom: 3px; }
      .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
      .overdue { color: #C62828; font-weight: 700; }
      .done td { color: #94A3B8; }
      .quad { position: relative; width: 460px; height: 340px; border: 1.5px solid #CBD5E1; margin: 10px 0 8px; }
      .quad-line { position: absolute; background: #E2E8F0; }
      .quad-dot { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
      .quad-lbl { position: absolute; font-size: 9px; color: #94A3B8; font-weight: 700; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
      ${extraCss || ''}
    </style></head><body>${innerHtml}
    <div class="foot">Generated ${deDate(new Date(), { month:'long', day:'numeric', year:'numeric' })} · Cloud Inventory ROI Business Case Builder</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
    </body></html>`);
  w.document.close();
}

/* ═══════════════════════════════════════════════════════════════════
   MUTUAL ACTION PLAN — PRINT / PDF
   variant: 'internal' | 'customer'
   ═══════════════════════════════════════════════════════════════════ */
function printActionPlan(variant) {
  const m = _mapCurrent;
  if (!m) { showToast('Open a plan first.'); return; }
  const ms = m.milestones || [];
  const done = ms.filter(x => x.status === 'done').length;
  const pct = ms.length ? Math.round(done / ms.length * 100) : 0;
  const ownerLabels = variant === 'customer'
    ? { rep: 'Cloud Inventory', prospect: 'Your team', joint: 'Joint' }
    : { rep: 'Cloud Inventory', prospect: 'Customer', joint: 'Joint' };
  const statusLabels = { pending: 'Pending', in_progress: 'In progress', done: 'Complete' };

  const phases = ['Evaluate','Validate','Business Case','Legal & Procurement','Launch'];
  let rowsHtml = '';
  phases.filter(p => ms.some(x => x.phase === p)).forEach(phase => {
    rowsHtml += `<h2>${deEsc(phase)}</h2><table>
      <thead><tr><th style="width:46%;">Milestone</th><th style="width:18%;">Owner</th><th style="width:18%;">Due</th><th style="width:18%;">Status</th></tr></thead><tbody>`;
    ms.filter(x => x.phase === phase).forEach(x => {
      const overdue = x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date();
      rowsHtml += `<tr class="${x.status==='done'?'done':''}">
        <td>${deEsc(x.title)}</td>
        <td>${deEsc(ownerLabels[x.owner] || x.owner)}</td>
        <td class="${overdue?'overdue':''}">${x.dueDate ? deDate(x.dueDate) : '—'}${overdue?' (overdue)':''}</td>
        <td>${statusLabels[x.status] || x.status}</td>
      </tr>`;
    });
    rowsHtml += '</tbody></table>';
  });

  const headTag = variant === 'customer' ? 'Mutual Action Plan' : 'Mutual Action Plan — Internal';
  const html = `
    <div class="doc-head">
      <img src="${window.location.origin}/ci-logo.png" onerror="this.style.display='none'"/>
      <div class="ht">${headTag}</div>
    </div>
    <h1>${deEsc(m.title)}</h1>
    <div class="sub">${deEsc(m.company || '')}${m.target_close_date ? ' · Target close: ' + deDate(m.target_close_date, {month:'long',day:'numeric',year:'numeric'}) : ''}</div>
    ${variant === 'customer' ? '<div class="meta-line" style="font-style:italic;color:#5A6570;">A jointly-owned plan built on a data-driven business case grounded in your operational metrics.</div>' : ''}
    <div class="meta-line"><strong>Progress:</strong> ${done} of ${ms.length} complete (${pct}%)</div>
    <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%;"></div></div>
    ${rowsHtml || '<p style="font-size:13px;color:#94A3B8;">No milestones yet.</p>'}`;
  dePrintWindow(m.title, html);
}

/* ═══════════════════════════════════════════════════════════════════
   MUTUAL ACTION PLAN — POWERPOINT
   ═══════════════════════════════════════════════════════════════════ */
async function pptActionPlan(variant) {
  if (!deChk()) return;
  const m = _mapCurrent;
  if (!m) { showToast('Open a plan first.'); return; }
  const btnId = variant === 'customer' ? 'mapPptCustBtn' : 'mapPptIntBtn';
  const btn = document.getElementById(btnId);
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }

  try {
    const ms = m.milestones || [];
    const done = ms.filter(x => x.status === 'done').length;
    const pct = ms.length ? Math.round(done / ms.length * 100) : 0;
    const ownerLabels = variant === 'customer'
      ? { rep: 'Cloud Inventory', prospect: 'Your team', joint: 'Joint' }
      : { rep: 'Cloud Inventory', prospect: 'Customer', joint: 'Joint' };
    const phases = ['Evaluate','Validate','Business Case','Legal & Procurement','Launch'];

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CI', width: PPT.W, height: PPT.H });
    pptx.layout = 'CI';
    pptx.title = m.title;

    /* Title slide */
    const s0 = pptx.addSlide();
    s0.background = { color: PPT.GRAY_BG };
    s0.addShape('rect', { x: 0, y: 2.3, w: PPT.W, h: 1.0, fill: { color: PPT.NAVY } });
    s0.addImage({ path: PPT.LOGO, x: 0.4, y: 0.4, w: 1.15, h: 1.15 * 349/1000 });
    s0.addText('Mutual Action Plan', { x: 0.5, y: 2.45, w: 9, h: 0.5, fontSize: 30, bold: true, color: PPT.WHITE, fontFace: PPT.FONT });
    s0.addText(m.title, { x: 0.5, y: 3.5, w: 9, h: 0.4, fontSize: 16, bold: true, color: PPT.NAVY, fontFace: PPT.FONT });
    s0.addText([
      { text: m.company || '', options: { fontSize: 13, color: PPT.GRAY_TXT } },
      { text: m.target_close_date ? '   ·   Target close: ' + deDate(m.target_close_date, {month:'long',day:'numeric',year:'numeric'}) : '', options: { fontSize: 13, color: PPT.GRAY_TXT } }
    ], { x: 0.5, y: 3.95, w: 9, h: 0.35, fontFace: PPT.FONT });
    s0.addText(`${done} of ${ms.length} milestones complete (${pct}%)`, { x: 0.5, y: 4.35, w: 9, h: 0.35, fontSize: 12, italic: true, color: PPT.CYAN, fontFace: PPT.FONT });

    /* One slide per phase (or grouped) — table of milestones */
    phases.filter(p => ms.some(x => x.phase === p)).forEach(phase => {
      const rows = [[
        { text: 'Milestone', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
        { text: 'Owner', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
        { text: 'Due', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
        { text: 'Status', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } }
      ]];
      ms.filter(x => x.phase === phase).forEach(x => {
        const overdue = x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date();
        rows.push([
          { text: x.title, options: { fontSize: 10, color: PPT.DARK_TXT } },
          { text: ownerLabels[x.owner] || x.owner, options: { fontSize: 10, color: PPT.GRAY_TXT } },
          { text: (x.dueDate ? deDate(x.dueDate) : '—') + (overdue ? ' ⚠' : ''), options: { fontSize: 10, color: overdue ? PPT.RED : PPT.GRAY_TXT } },
          { text: x.status === 'done' ? '● Complete' : x.status === 'in_progress' ? '◐ In progress' : '○ Pending', options: { fontSize: 10, color: x.status === 'done' ? PPT.GREEN : PPT.GRAY_TXT } }
        ]);
      });
      const s = pptx.addSlide();
      pptChrome(s, null);
      pptTitle(s, phase);
      s.addTable(rows, { x: 0.45, y: 1.6, w: 9.1, colW: [4.6, 1.7, 1.5, 1.3], border: { pt: 0.5, color: 'E0E4E8' }, autoPage: true });
    });

    const safe = (m.company || 'Plan').replace(/[^a-zA-Z0-9 \-_]/g, '').trim().replace(/\s+/g, '-') || 'Plan';
    await pptx.writeFile({ fileName: `Action-Plan-${safe}${variant === 'customer' ? '-Customer' : ''}-${new Date().toISOString().split('T')[0]}.pptx` });
    showToast('PowerPoint downloaded!');
  } catch (e) {
    console.error('pptActionPlan:', e);
    showToast('Export failed: ' + (e.message || 'unknown error'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   STAKEHOLDER MAP — PRINT / PDF
   ═══════════════════════════════════════════════════════════════════ */
function printStakeholderMap() {
  if (!_stakeholders.length) { showToast('Add stakeholders first.'); return; }
  const company = _stakeCompany || 'All companies';

  /* Quadrant dots as absolutely-positioned HTML */
  const dots = _stakeholders.map(s => {
    const x = ((s.support - 1) / 4) * 88 + 6;
    const y = 90 - ((s.influence - 1) / 4) * 84;
    const c = (typeof STAKE_ROLES !== 'undefined' && STAKE_ROLES[s.role]) ? STAKE_ROLES[s.role].color : '#5A6570';
    const initials = s.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<div class="quad-dot" style="left:${x}%;top:${y}%;background:${c};${s.engaged?'':'opacity:.5;'}">${deEsc(initials)}</div>`;
  }).join('');

  /* Coverage summary */
  const critical = ['champion','economic_buyer','technical_buyer'];
  const roleLabels = { champion:'Champion', economic_buyer:'Economic Buyer', technical_buyer:'Technical Buyer', influencer:'Influencer', blocker:'Blocker', end_user:'End User' };
  let coverage = '<table><thead><tr><th>Role</th><th>Count</th><th>Status</th></tr></thead><tbody>';
  Object.keys(roleLabels).forEach(k => {
    const list = _stakeholders.filter(s => s.role === k);
    const missing = critical.includes(k) && !list.length;
    coverage += `<tr><td>${roleLabels[k]}</td><td>${list.length}</td><td class="${missing?'overdue':''}">${missing?'⚠ MISSING':(list.length?'Covered':'—')}</td></tr>`;
  });
  coverage += '</tbody></table>';

  /* Roster table */
  let roster = '<table><thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Influence</th><th>Support</th><th>Engaged</th></tr></thead><tbody>';
  _stakeholders.forEach(s => {
    roster += `<tr><td><strong>${deEsc(s.name)}</strong></td><td>${deEsc(s.title||'—')}</td>
      <td>${roleLabels[s.role]||s.role}</td><td>${s.influence}/5</td><td>${s.support}/5</td><td>${s.engaged?'Yes':'No'}</td></tr>`;
  });
  roster += '</tbody></table>';

  const html = `
    <div class="doc-head">
      <img src="${window.location.origin}/ci-logo.png" onerror="this.style.display='none'"/>
      <div class="ht">Stakeholder Map — Internal</div>
    </div>
    <h1>Stakeholder Map</h1>
    <div class="sub">${deEsc(company)} · ${_stakeholders.length} stakeholder${_stakeholders.length!==1?'s':''}</div>
    <h2>Influence × Support</h2>
    <div class="quad">
      <div class="quad-line" style="left:50%;top:0;width:1px;height:100%;"></div>
      <div class="quad-line" style="top:50%;left:0;height:1px;width:100%;"></div>
      <div class="quad-lbl" style="right:6px;top:4px;">High influence · High support</div>
      <div class="quad-lbl" style="left:6px;top:4px;">High influence · Low support</div>
      <div class="quad-lbl" style="right:6px;bottom:4px;">Low influence · High support</div>
      <div class="quad-lbl" style="left:6px;bottom:4px;">Low influence · Low support</div>
      ${dots}
    </div>
    <h2>Role coverage</h2>${coverage}
    <h2>Stakeholder roster</h2>${roster}`;
  dePrintWindow('Stakeholder Map — ' + company, html);
}

/* ═══════════════════════════════════════════════════════════════════
   STAKEHOLDER MAP — POWERPOINT
   ═══════════════════════════════════════════════════════════════════ */
async function pptStakeholderMap() {
  if (!deChk()) return;
  if (!_stakeholders.length) { showToast('Add stakeholders first.'); return; }
  const btn = document.getElementById('stakePptBtn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }

  try {
    const company = _stakeCompany || 'All companies';
    const roleLabels = { champion:'Champion', economic_buyer:'Economic Buyer', technical_buyer:'Technical Buyer', influencer:'Influencer', blocker:'Blocker', end_user:'End User' };
    const roleColor = (r) => (typeof STAKE_ROLES !== 'undefined' && STAKE_ROLES[r]) ? STAKE_ROLES[r].color.replace('#','') : '5A6570';

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CI', width: PPT.W, height: PPT.H });
    pptx.layout = 'CI';
    pptx.title = 'Stakeholder Map — ' + company;

    /* Slide 1: quadrant */
    const s1 = pptx.addSlide();
    pptChrome(s1, 1);
    pptTitle(s1, 'Stakeholder Map');
    s1.addText(company, { x: 0.45, y: 1.35, w: 9, h: 0.3, fontSize: 13, color: PPT.GRAY_TXT, fontFace: PPT.FONT });

    /* Quadrant box */
    const qx = 0.9, qy = 1.75, qw = 5.4, qh = 3.3;
    s1.addShape('rect', { x: qx, y: qy, w: qw, h: qh, fill: { color: PPT.WHITE }, line: { color: 'CBD5E1', width: 1 } });
    s1.addShape('line', { x: qx + qw/2, y: qy, w: 0, h: qh, line: { color: 'E2E8F0', width: 0.75 } });
    s1.addShape('line', { x: qx, y: qy + qh/2, w: qw, h: 0, line: { color: 'E2E8F0', width: 0.75 } });
    s1.addText('Influence →', { x: qx - 0.15, y: qy + qh/2, w: 0.15, h: 0.15, fontSize: 8, color: '94A3B8', rotate: 270, fontFace: PPT.FONT });
    s1.addText('Support →', { x: qx + qw/2 - 0.5, y: qy + qh + 0.05, w: 1, h: 0.2, fontSize: 8, color: '94A3B8', align: 'center', fontFace: PPT.FONT });
    _stakeholders.forEach(s => {
      const dx = qx + ((s.support - 1) / 4) * (qw - 0.5) + 0.1;
      const dy = qy + qh - 0.4 - ((s.influence - 1) / 4) * (qh - 0.6);
      const initials = s.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      s1.addShape('ellipse', { x: dx, y: dy, w: 0.32, h: 0.32, fill: { color: roleColor(s.role), transparency: s.engaged ? 0 : 55 } });
      s1.addText(initials, { x: dx, y: dy, w: 0.32, h: 0.32, fontSize: 8, bold: true, color: PPT.WHITE, align: 'center', valign: 'middle', fontFace: PPT.FONT });
    });

    /* Coverage panel on the right */
    const critical = ['champion','economic_buyer','technical_buyer'];
    let cy = 1.85;
    s1.addText('Role coverage', { x: 6.6, y: cy, w: 3, h: 0.3, fontSize: 14, bold: true, color: PPT.NAVY, fontFace: PPT.FONT });
    cy += 0.45;
    Object.keys(roleLabels).forEach(k => {
      const list = _stakeholders.filter(x => x.role === k);
      const missing = critical.includes(k) && !list.length;
      s1.addShape('ellipse', { x: 6.6, y: cy + 0.02, w: 0.14, h: 0.14, fill: { color: roleColor(k) } });
      s1.addText(`${roleLabels[k]}: ${list.length}${missing ? '  ⚠ missing' : ''}`, {
        x: 6.85, y: cy - 0.03, w: 2.9, h: 0.28, fontSize: 11,
        color: missing ? PPT.RED : PPT.GRAY_TXT, bold: missing, fontFace: PPT.FONT
      });
      cy += 0.38;
    });

    /* Slide 2: roster table */
    const s2 = pptx.addSlide();
    pptChrome(s2, 2);
    pptTitle(s2, 'Stakeholder Roster');
    const rows = [[
      { text: 'Name', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
      { text: 'Title', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
      { text: 'Role', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
      { text: 'Infl.', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
      { text: 'Supp.', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } },
      { text: 'Engaged', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 11 } }
    ]];
    _stakeholders.forEach(s => {
      rows.push([
        { text: s.name, options: { fontSize: 10, bold: true, color: PPT.DARK_TXT } },
        { text: s.title || '—', options: { fontSize: 10, color: PPT.GRAY_TXT } },
        { text: roleLabels[s.role] || s.role, options: { fontSize: 10, color: roleColor(s.role) } },
        { text: s.influence + '/5', options: { fontSize: 10, color: PPT.GRAY_TXT } },
        { text: s.support + '/5', options: { fontSize: 10, color: PPT.GRAY_TXT } },
        { text: s.engaged ? 'Yes' : 'No', options: { fontSize: 10, color: s.engaged ? PPT.GREEN : PPT.GRAY_TXT } }
      ]);
    });
    s2.addTable(rows, { x: 0.45, y: 1.6, w: 9.1, colW: [2.3, 2.3, 1.7, 0.9, 0.9, 1.0], border: { pt: 0.5, color: 'E0E4E8' }, autoPage: true });

    const safe = company.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().replace(/\s+/g, '-') || 'Map';
    await pptx.writeFile({ fileName: `Stakeholder-Map-${safe}-${new Date().toISOString().split('T')[0]}.pptx` });
    showToast('PowerPoint downloaded!');
  } catch (e) {
    console.error('pptStakeholderMap:', e);
    showToast('Export failed: ' + (e.message || 'unknown error'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ROI METHODOLOGY & CALCULATION DETAIL
   Personalized, on-request appendix proving how the ROI was calculated.
   Driven by the SAME getVals()+calcROI() as the screen, so figures can
   never disagree with the Executive View. PDF + PowerPoint variants.
   Zero-value levers render as "Not Provided" (upside not yet captured).
   ═══════════════════════════════════════════════════════════════════ */

/* Build the personalized lever + roll-up data model once, shared by both formats. */
function buildRoiMethodology() {
  const v = getVals(), r = calcROI(v);
  const M = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$' + Math.round(n).toLocaleString();
  const PC = n => (n===null||n===undefined||isNaN(n)) ? '—' : Math.round(n*100) + '%';
  const N  = n => (n===null||n===undefined||isNaN(n)) ? '—' : Number(n).toLocaleString();

  /* effective shrink base + carry base recomputed for display transparency */
  const shrinkBase = v.effectiveShrinkBase || 0;
  const carryBase  = r.annualCarryCost || 0;
  const downtimeAnnual = (v.downtimeEventsYr||0)*(v.downtimeHrsPerEvent||0)*(v.downtimeCostPerHr||0);
  const countAnnual = (v.countDaysYr||0)*(v.countPeople||0)*((v.labor||0)/260);

  /* Each lever: provided? (has the inputs), formula string, plugged-in string, value */
  const levers = [
    { name:'Labor productivity',
      desc:'Recovered staff time from eliminating manual inventory work.',
      provided: v.users>0,
      formula: (v.modelVersion>=25 && v.laborWastePct>0) ? 'users × labor rate × productivity waste % × recovery %' : 'users × labor rate × recovery %',
      plugged: (v.modelVersion>=25 && v.laborWastePct>0)
        ? `${N(v.users)} × ${M(v.labor)} × ${PC(v.laborWastePct)} × ${PC(v.mLabor)}`
        : `${N(v.users)} × ${M(v.labor)} × ${PC(v.mLabor)}`,
      value: r.laborSav },
    { name:'Write-off / shrink reduction',
      desc:'Reduction in inventory written off to loss, damage, or shrinkage.',
      provided: shrinkBase>0,
      formula:'annual write-off base × recovery %',
      plugged:`${M(shrinkBase)} × ${PC(v.mShrinkage)}`,
      value: r.shrinkSav },
    { name:'Carrying-cost reduction',
      desc:'Lower cost of holding inventory (capital, storage, insurance, obsolescence).',
      provided: carryBase>0,
      formula:'carrying cost × recovery % − 15% overlap deduction',
      plugged:`${M(carryBase)} × ${PC(v.mCarrying)} − 15%`,
      value: r.carrySav },
    { name:'Working capital (inventory turns)',
      desc:'Capital freed by improving inventory turns toward the benchmark.',
      provided: (v.inventory>0 && v.invTurnsCurrent>0),
      formula:'freed capital × carry rate',
      plugged:`${M(r.capitalFreed)} × ${PC(v.carryRate)}`,
      value: r.turnsSav },
    { name:'Service revenue (OTIF)',
      desc:'Revenue protected by closing the on-time-in-full gap.',
      provided: (v.revenue>0 && (v.otifTarget>v.otifBaseline || v.otifRisk>0)),
      formula:'revenue × OTIF gap × recovery %',
      plugged:`${M(v.revenue)} × ${v.otifTarget>v.otifBaseline?PC((v.otifTarget-v.otifBaseline)/100):PC(v.otifRisk)} × ${PC(v.mOtif)}`,
      value: r.otifSav },
    { name:'IT displacement',
      desc:'Legacy inventory/ERP/WMS system and support costs displaced.',
      provided: v.itCost>0,
      formula:'IT cost × recovery %',
      plugged:`${M(v.itCost)} × ${PC(v.mIt)}`,
      value: r.itSav },
    { name:'Production downtime',
      desc:'Recovered production from fewer stockout-driven stoppages.',
      provided: downtimeAnnual>0,
      formula:'events/yr × hrs/event × $/hr × recovery %',
      plugged:`${N(v.downtimeEventsYr)} × ${N(v.downtimeHrsPerEvent)} × ${M(v.downtimeCostPerHr)} × ${PC(v.mDowntime)}`,
      value: r.downtimeSav, isNew:true },
    { name:'Expedite / emergency procurement',
      desc:'Reduced premium freight and rush orders caused by stockouts.',
      provided: (v.expediteSpendYr||0)>0,
      formula:'annual expedite spend × recovery %',
      plugged:`${M(v.expediteSpendYr)} × ${PC(v.mExpedite)}`,
      value: r.expediteSav, isNew:true },
    { name:'Physical / cycle-count labor',
      desc:'Labor recovered from reduced manual counting.',
      provided: countAnnual>0,
      formula:'count days × people × daily labor × recovery %',
      plugged:`${N(v.countDaysYr)} × ${N(v.countPeople)} × ${M((v.labor||0)/260)} × ${PC(v.mCount)}`,
      value: r.countSav, isNew:true },
    { name:'Warehouse throughput / pick-rate',
      desc:'Ship more with the same team from faster mobile-first workflows.',
      provided: (v.ordersPerYr>0 && v.costPerOrder>0 && v.pickRateGainPct>0),
      formula:'orders/yr × cost/order × pick-rate gain % × recovery %',
      plugged:`${N(v.ordersPerYr)} × ${M(v.costPerOrder)} × ${PC(v.pickRateGainPct)} × ${PC(v.mThroughput)}`,
      value: r.throughputSav, isNew:true },
    { name:'Order accuracy → returns & chargebacks',
      desc:'Reduced mis-ship cost: returns, re-ship freight, customer chargebacks.',
      provided: (v.ordersPerYr>0 && v.orderErrorPct>0 && v.costPerError>0),
      formula:'orders/yr × error rate % × cost/error × recovery %',
      plugged:`${N(v.ordersPerYr)} × ${PC(v.orderErrorPct)} × ${M(v.costPerError)} × ${PC(v.mAccuracy)}`,
      value: r.accuracySav, isNew:true },
    { name:'First-time-fix / truck-roll avoidance',
      desc:'Fewer repeat field visits from having the right part on the truck.',
      provided: (v.repeatVisitsYr>0 && v.costPerTruckRoll>0),
      formula:'repeat visits/yr × cost per truck roll × recovery %',
      plugged:`${N(v.repeatVisitsYr)} × ${M(v.costPerTruckRoll)} × ${PC(v.mFirstFix)}`,
      value: r.truckRollSav, isNew:true },
    { name:'Field parts leakage',
      desc:'Reduced loss of van-stock and field parts (lost, walked-off, expired).',
      provided: (v.fieldInventoryValue>0 && v.fieldLeakagePct>0),
      formula:'field inventory value × leakage rate % × recovery %',
      plugged:`${M(v.fieldInventoryValue)} × ${PC(v.fieldLeakagePct)} × ${PC(v.mLeakage)}`,
      value: r.fieldLeakageSav, isNew:true },
  ];

  /* Revenue-growth lever shown SEPARATELY from cost savings (per design). */
  const revenueLever = {
    name:'Revenue per technician (revenue growth)',
    desc:'Additional billable revenue from higher technician utilization. Shown separately from cost savings.',
    provided: (v.fieldTechs>0 && v.addedJobsPerDay>0 && v.revenuePerJob>0 && v.workingDaysYr>0),
    formula:'techs × added jobs/day × revenue/job × working days × realization %',
    plugged:`${N(v.fieldTechs)} × ${N(v.addedJobsPerDay)} × ${M(v.revenuePerJob)} × ${N(v.workingDaysYr)} × ${PC(v.mUtilization)}`,
    value: r.techRevenueSav
  };

  /* Inputs table (what the prospect provided) */
  const inputs = [
    ['Inventory users', N(v.users)],
    ['Fully-loaded labor rate', M(v.labor)],
    ['Productivity waste %', v.laborWastePct>0?PC(v.laborWastePct):'Not Provided'],
    ['Current inventory accuracy', v.currentAccuracy>0?v.currentAccuracy+'%':'Not Provided'],
    ['Annual write-off value', shrinkBase>0?M(shrinkBase):'Not Provided'],
    ['Inventory value on hand', v.inventory>0?M(v.inventory):'Not Provided'],
    ['Current inventory turns', v.invTurnsCurrent>0?N(v.invTurnsCurrent):'Not Provided'],
    ['OTIF baseline / target', (v.otifBaseline>0)?`${v.otifBaseline}% → ${v.otifTarget}%`:'Not Provided'],
    ['Annual revenue', v.revenue>0?M(v.revenue):'Not Provided'],
    ['Current IT / systems cost', v.itCost>0?M(v.itCost):'Not Provided'],
    ['Downtime (events × hrs × $/hr)', downtimeAnnual>0?`${N(v.downtimeEventsYr)} × ${N(v.downtimeHrsPerEvent)} × ${M(v.downtimeCostPerHr)}`:'Not Provided'],
    ['Annual expedite spend', (v.expediteSpendYr||0)>0?M(v.expediteSpendYr):'Not Provided'],
    ['Counting (days × people)', countAnnual>0?`${N(v.countDaysYr)} × ${N(v.countPeople)}`:'Not Provided'],
    ['Orders / lines per year', v.ordersPerYr>0?N(v.ordersPerYr):'Not Provided'],
    ['Cost per order', v.costPerOrder>0?M(v.costPerOrder):'Not Provided'],
    ['Pick-rate gain %', v.pickRateGainPct>0?PC(v.pickRateGainPct):'Not Provided'],
    ['Order error rate', v.orderErrorPct>0?PC(v.orderErrorPct):'Not Provided'],
    ['Cost per error', v.costPerError>0?M(v.costPerError):'Not Provided'],
    ['Repeat visits / yr', v.repeatVisitsYr>0?N(v.repeatVisitsYr):'Not Provided'],
    ['Cost per truck roll', v.costPerTruckRoll>0?M(v.costPerTruckRoll):'Not Provided'],
    ['Field technicians', v.fieldTechs>0?N(v.fieldTechs):'Not Provided'],
    ['Added jobs/day · rev/job', (v.addedJobsPerDay>0&&v.revenuePerJob>0)?`${N(v.addedJobsPerDay)} × ${M(v.revenuePerJob)}`:'Not Provided'],
    ['Field inventory value', v.fieldInventoryValue>0?M(v.fieldInventoryValue):'Not Provided'],
    ['Field leakage rate', v.fieldLeakagePct>0?PC(v.fieldLeakagePct):'Not Provided'],
    ['Discount rate (NPV)', PC(v.discRate)],
  ];

  /* ── Provenance: which inputs the prospect verified via discovery ──
     Reads the confidence fieldStates (confirmed_prospect = customer-verified).
     Surfaces the value-engineering credibility signal in the CFO doc.     */
  const fs = (typeof fieldStates !== 'undefined') ? fieldStates : {};
  const provFields = (typeof CONFIDENCE_FIELDS !== 'undefined') ? CONFIDENCE_FIELDS : [];
  let prospectVerified = 0, repConfirmed = 0, totalTracked = provFields.length;
  const verifiedLabels = [];
  provFields.forEach(f => {
    const s = fs[f.id] || '';
    if (s === 'confirmed_prospect') { prospectVerified++; verifiedLabels.push(f.label); }
    else if (s === 'confirmed') repConfirmed++;
  });
  const provenance = { prospectVerified, repConfirmed, totalTracked, verifiedLabels };

  return { v, r, M, PC, N, levers, revenueLever, inputs, provenance };
}

/* ── PDF variant ── */
function roiMethodologyPDF() {
  const m = buildRoiMethodology();
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const v = m.v, r = m.r, M = m.M;
  const company = (v.company && v.company !== 'Prospect') ? v.company : 'Your Company';

  const leverRows = m.levers.map(L => {
    if (!L.provided || !L.value) {
      return `<tr class="np"><td><strong>${esc(L.name)}</strong>${L.isNew?' <span class="new">new</span>':''}<div class="ld">${esc(L.desc)}</div></td>
        <td colspan="2"><em>Not Provided</em> — data not captured; represents unquantified upside.</td>
        <td class="r">—</td></tr>`;
    }
    return `<tr><td><strong>${esc(L.name)}</strong>${L.isNew?' <span class="new">new</span>':''}<div class="ld">${esc(L.desc)}</div></td>
      <td class="f">${esc(L.formula)}</td><td class="f">${esc(L.plugged)}</td><td class="r"><strong>${M(L.value)}</strong>/yr</td></tr>`;
  }).join('');

  /* Map confidence field IDs → whether prospect-verified, to badge input rows */
  const fsMap = (typeof fieldStates !== 'undefined') ? fieldStates : {};
  const verifiedByInputLabel = {
    'Annual revenue': fsMap['revenue'] === 'confirmed_prospect',
    'Inventory users': fsMap['userCount'] === 'confirmed_prospect',
    'Inventory value on hand': fsMap['inventoryValue'] === 'confirmed_prospect',
    'Annual write-off value': fsMap['annualWriteOff'] === 'confirmed_prospect',
    'OTIF baseline / target': fsMap['otifBaseline'] === 'confirmed_prospect',
    'Current inventory turns': fsMap['invTurnsCurrent'] === 'confirmed_prospect',
    'Current IT / systems cost': fsMap['itCost'] === 'confirmed_prospect'
  };
  const inputRows = m.inputs.map(([k,val]) => {
    const mark = verifiedByInputLabel[k] ? ' <span class="prov-mark" title="Verified by prospect">◉</span>' : '';
    return `<tr><td>${esc(k)}${mark}</td><td class="${val==='Not Provided'?'np-cell':''}">${esc(val)}</td></tr>`;
  }).join('');

  const rampNote = `Year-1 benefit is ramp-adjusted (${Math.round((v.ramp1||0.4)*100)}% / ${Math.round((v.ramp2||0.75)*100)}% / ${Math.round((v.ramp3||1)*100)}% over the first three periods), so it is lower than the full annual benefit.`;

  /* Prospect-verification headline (value-engineering credibility signal) */
  const p = m.provenance || { prospectVerified:0, totalTracked:0 };
  const provenanceBanner = p.prospectVerified > 0
    ? `<div class="prov-banner"><span class="prov-check">◉</span> <strong>${p.prospectVerified} of ${p.totalTracked} core value drivers were verified directly by ${esc(company)}</strong> through the discovery process — the remainder are estimated from provided data or industry benchmarks. Verified inputs are marked <span class="prov-mark">◉</span> below.</div>`
    : '';

  const html = `
    <div class="doc-head"><img src="${window.location.origin}/ci-logo.png" onerror="this.style.display='none'"/><div class="ht">ROI Methodology &amp; Calculation Detail</div></div>
    <h1>ROI Methodology &amp; Calculation Detail</h1>
    <div class="sub">${esc(company)}${v.rep?' · Prepared by '+esc(v.rep):''}${v.name?' · '+esc(v.name):''} · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
    <p class="intro">This appendix documents how the return on investment in the business case was calculated, following a structured, data-driven methodology built to withstand independent financial review. The approach captures <strong>your operational data</strong> through guided discovery, decomposes the benefit into independently-quantified value drivers each tied to a metric you provided, and models every driver conservatively — applying ramp-up, benchmark grounding, and overlap adjustments. Cost savings and revenue growth are reported separately. Every result below traces to an input in the first table. Items marked <em>Not Provided</em> were not captured and represent potential upside not included in the totals.</p>

    <h2>1. Inputs used</h2>
    ${provenanceBanner}
    <table class="kv"><tbody>${inputRows}</tbody></table>

    <h2>2. Benefit breakdown</h2>
    <table><thead><tr><th style="width:34%">Value driver</th><th>Formula</th><th>Your figures</th><th class="r">Annual value</th></tr></thead>
    <tbody>${leverRows}</tbody>
    <tfoot><tr><td colspan="3"><strong>Total annual benefit</strong> (steady-state)</td><td class="r"><strong>${M(r.annualBenefit)}</strong>/yr</td></tr></tfoot></table>

    ${m.revenueLever.provided ? `<h2>2a. Revenue growth (shown separately)</h2>
    <p class="intro">The following reflects <strong>additional revenue</strong> from higher technician utilization, not a cost saving. It is presented separately so cost-based ROI and revenue upside remain transparent and independently verifiable.</p>
    <table><thead><tr><th style="width:34%">Revenue driver</th><th>Formula</th><th>Your figures</th><th class="r">Annual value</th></tr></thead>
    <tbody><tr><td><strong>${esc(m.revenueLever.name)}</strong><div class="ld">${esc(m.revenueLever.desc)}</div></td>
      <td class="f">${esc(m.revenueLever.formula)}</td><td class="f">${esc(m.revenueLever.plugged)}</td>
      <td class="r"><strong>${M(m.revenueLever.value)}</strong>/yr</td></tr></tbody></table>` : ''}

    <h2>3. Assumptions &amp; conservatism</h2>
    <ul class="notes">
      <li><strong>Accuracy benchmark 99.5%.</strong> Recovery percentages are grounded in the gap between your current accuracy and this benchmark.</li>
      <li><strong>15% carrying-cost overlap deduction.</strong> Applied to avoid double-counting between carrying-cost, write-off, and turns benefits (${M(r.overlapAdj)} removed).</li>
      <li><strong>Ramp-up applied.</strong> ${esc(rampNote)}</li>
      <li><strong>Prospect-provided figures</strong> are used wherever supplied; industry benchmarks fill only what was not provided.</li>
    </ul>

    <h2>4. Return calculation</h2>
    <table class="kv"><tbody>
      <tr><td>Total annual benefit (steady-state)</td><td>${M(r.annualBenefit)}</td></tr>
      <tr><td>Year-1 benefit (ramp-adjusted)</td><td>${M(r.year1Benefit)}</td></tr>
      <tr><td>Total investment (Year 1)</td><td>${M(r.totalInvestY1 || (v.invest+v.otc))}</td></tr>
      <tr><td><strong>Year-1 ROI</strong></td><td><strong>${m.PC(r.roi/100)}</strong></td></tr>
      <tr><td>Payback period</td><td>${r.payback? r.payback.toFixed(1)+' months':'—'}</td></tr>
      <tr><td>NPV (3-year @ ${m.PC(v.discRate)})</td><td>${M(r.npv3)}</td></tr>
      <tr><td>NPV (5-year @ ${m.PC(v.discRate)})</td><td>${M(r.npv5)}</td></tr>
    </tbody></table>

    <p class="disc">Figures are based on data provided by ${esc(company)} and modeled conservatively with ramp-up and overlap adjustments. This analysis is an estimate for evaluation purposes and is not a guarantee of results.</p>`;

  /* Business context — qualitative discovery answers (customer-facing only, no internal-only items) */
  const da = (typeof discoveryAnswers !== 'undefined') ? discoveryAnswers : {};
  const ctxItems = [
    ['Key initiatives this supports', da['ve1']],
    ['Why now', da['ve2']],
    ['Impact of the problem', da['ve5']],
    ['Cost of inaction', da['ve6']],
    ['How success will be measured', da['ve13']]
  ].filter(([,v]) => v && v.trim());
  const contextSection = ctxItems.length
    ? `<h2>Business context</h2><table class="kv"><tbody>${
        ctxItems.map(([k,v]) => `<tr><td style="width:32%;vertical-align:top;">${esc(k)}</td><td style="text-align:left;font-weight:400;">${esc(v)}</td></tr>`).join('')
      }</tbody></table>`
    : '';
  const htmlWithContext = html.replace('<p class="disc">', contextSection + '<p class="disc">');

  const extraCss = `
    .intro{font-size:12px;color:#5A6570;line-height:1.6;margin-bottom:16px;}
    table.kv td:first-child{color:#5A6570;width:55%;}
    table.kv td:last-child{font-weight:600;text-align:right;}
    .f{font-family:'Courier New',monospace;font-size:10px;color:#5A6570;}
    .r{text-align:right;}
    .ld{font-size:10px;color:#94A3B8;font-weight:400;margin-top:2px;}
    .new{background:#F79424;color:#fff;font-size:8px;font-weight:700;padding:1px 5px;border-radius:8px;}
    tr.np td{color:#94A3B8;}
    .np-cell{color:#C77700;font-weight:600;}
    tfoot td{border-top:2px solid #243646;font-size:13px;padding-top:8px;}
    .notes{margin:4px 0 16px;padding-left:18px;} .notes li{font-size:11px;color:#5A6570;margin-bottom:5px;line-height:1.5;}
    .disc{font-size:10px;color:#94A3B8;font-style:italic;margin-top:14px;line-height:1.5;}
    .prov-banner{background:#E6F4EF;border:1px solid #0F6E56;border-radius:7px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#0B4A3A;line-height:1.5;}
    .prov-check{color:#0F6E56;font-weight:700;}
    .prov-mark{color:#0F6E56;font-size:10px;}`;
  dePrintWindow('ROI Methodology — ' + company, htmlWithContext, extraCss);
}

/* ── PowerPoint variant ── */
async function roiMethodologyPPT() {
  if (!deChk()) return;
  const btn = document.getElementById('roiMethodPptBtn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }
  try {
    const m = buildRoiMethodology();
    const v = m.v, r = m.r, M = m.M;
    const company = (v.company && v.company !== 'Prospect') ? v.company : 'Your Company';

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'CI', width:PPT.W, height:PPT.H }); pptx.layout='CI';
    pptx.title = 'ROI Methodology — ' + company;

    /* Title slide */
    const s0 = pptx.addSlide(); s0.background = { color: PPT.GRAY_BG };
    s0.addShape('rect',{x:0,y:2.3,w:PPT.W,h:1.0,fill:{color:PPT.NAVY}});
    s0.addImage({path:PPT.LOGO,x:0.4,y:0.4,w:1.15,h:1.15*349/1000});
    s0.addText('ROI Methodology & Calculation Detail',{x:0.5,y:2.42,w:9,h:0.55,fontSize:26,bold:true,color:PPT.WHITE,fontFace:PPT.FONT});
    s0.addText(`${company}${v.rep?'  ·  Prepared by '+v.rep:''}`,{x:0.5,y:3.5,w:9,h:0.35,fontSize:14,bold:true,color:PPT.NAVY,fontFace:PPT.FONT});
    s0.addText('How the business-case ROI was calculated, using your figures.',{x:0.5,y:3.9,w:9,h:0.3,fontSize:12,color:PPT.GRAY_TXT,fontFace:PPT.FONT});

    /* Benefit breakdown slide */
    const s1 = pptx.addSlide(); pptChrome(s1,2); pptTitle(s1,'Benefit Breakdown');
    const rows = [[
      {text:'Value driver',options:{bold:true,color:PPT.WHITE,fill:{color:PPT.NAVY},fontSize:10}},
      {text:'Your figures',options:{bold:true,color:PPT.WHITE,fill:{color:PPT.NAVY},fontSize:10}},
      {text:'Annual value',options:{bold:true,color:PPT.WHITE,fill:{color:PPT.NAVY},fontSize:10}}
    ]];
    m.levers.forEach(L => {
      const provided = L.provided && L.value;
      rows.push([
        {text:L.name+(L.isNew?'  (new)':''),options:{fontSize:9,color:PPT.DARK_TXT}},
        {text: provided ? L.plugged : 'Not Provided',options:{fontSize:9,color: provided?PPT.GRAY_TXT:'C77700', italic:!provided}},
        {text: provided ? M(L.value)+'/yr' : '—',options:{fontSize:9,bold:provided,color: provided?PPT.NAVY:'C77700'}}
      ]);
    });
    rows.push([
      {text:'Total annual benefit',options:{fontSize:10,bold:true,color:PPT.WHITE,fill:{color:PPT.CYAN}}},
      {text:'',options:{fill:{color:PPT.CYAN}}},
      {text:M(r.annualBenefit)+'/yr',options:{fontSize:10,bold:true,color:PPT.WHITE,fill:{color:PPT.CYAN}}}
    ]);
    s1.addTable(rows,{x:0.45,y:1.55,w:9.1,colW:[3.5,3.6,2.0],border:{pt:0.5,color:'E0E4E8'},autoPage:true});
    s1.addText('Items marked "Not Provided" were not captured and are excluded from the total — potential upside.',
      {x:0.45,y:5.05,w:9.1,h:0.3,fontSize:9,italic:true,color:PPT.GRAY_TXT,fontFace:PPT.FONT});
    if (m.revenueLever.provided) {
      s1.addText([
        {text:'+ Revenue growth (separate): ',options:{bold:true,color:PPT.ORANGE}},
        {text:`${m.revenueLever.name} = ${M(m.revenueLever.value)}/yr — additional revenue from technician utilization, shown separately from cost savings.`,options:{color:PPT.GRAY_TXT}}
      ],{x:0.45,y:5.3,w:9.1,h:0.4,fontSize:9,fontFace:PPT.FONT});
    }

    /* Return + assumptions slide */
    const s2 = pptx.addSlide(); pptChrome(s2,3); pptTitle(s2,'Return & Assumptions');
    const kv = [
      ['Total annual benefit', M(r.annualBenefit)],
      ['Year-1 benefit (ramp-adjusted)', M(r.year1Benefit)],
      ['Total investment (Year 1)', M(r.totalInvestY1 || (v.invest+v.otc))],
      ['Year-1 ROI', m.PC(r.roi/100)],
      ['Payback', r.payback? r.payback.toFixed(1)+' months':'—'],
      ['NPV (3-year)', M(r.npv3)],
      ['NPV (5-year)', M(r.npv5)],
    ];
    kv.forEach((row,i)=>{
      const y=1.6+i*0.42;
      s2.addText(row[0],{x:0.5,y,w:4.5,h:0.35,fontSize:12,color:PPT.GRAY_TXT,fontFace:PPT.FONT});
      s2.addText(row[1],{x:5.0,y,w:2.0,h:0.35,fontSize:12,bold:true,color:PPT.NAVY,align:'right',fontFace:PPT.FONT});
    });
    s2.addText('Conservative adjustments applied',{x:7.4,y:1.6,w:2.6,h:0.3,fontSize:12,bold:true,color:PPT.CYAN,fontFace:PPT.FONT});
    s2.addText([
      {text:'99.5% accuracy benchmark',options:{bullet:{indent:8},breakLine:true}},
      {text:`15% carrying-cost overlap deduction (${M(r.overlapAdj)})`,options:{bullet:{indent:8},breakLine:true}},
      {text:'Ramp-up applied to Year 1',options:{bullet:{indent:8},breakLine:true}},
      {text:'Prospect figures used where provided',options:{bullet:{indent:8}}}
    ],{x:7.4,y:2.0,w:2.6,h:2.5,fontSize:9.5,color:PPT.GRAY_TXT,fontFace:PPT.FONT,paraSpaceAfter:6,valign:'top'});

    const safe = company.replace(/[^a-zA-Z0-9 \-_]/g,'').trim().replace(/\s+/g,'-')||'Prospect';
    await pptx.writeFile({ fileName:`ROI-Methodology-${safe}-${new Date().toISOString().split('T')[0]}.pptx` });
    showToast('ROI methodology PowerPoint downloaded!');
  } catch(e){ console.error('roiMethodologyPPT:',e); showToast('Export failed: '+(e.message||'error')); }
  finally { if(btn){ btn.disabled=false; btn.innerHTML=orig; } }
}

/* ═══════════════════════════════════════════════════════════════════
   shareBusinessCase — create a trackable link to the current scenario's
   business case (link-view delivery tracking, no pixels). Requires the
   scenario to be saved first, since the link points at a stored scenario.
   The rep sees view engagement back on the Saved tab.
   ═══════════════════════════════════════════════════════════════════ */
async function shareBusinessCase() {
  const v = (typeof getVals === 'function') ? getVals() : {};
  const company = (v.company || '').trim();
  const name    = (v.name || '').trim();
  if (!company) { if (typeof showToast==='function') showToast('Select a customer first.'); return; }

  /* Resolve the current scenario id: match saved scenarios on company+name. */
  let scenario = (typeof savedScenarios !== 'undefined')
    ? savedScenarios.find(s => s.company === company && s.name === name && s.isCurrent)
    : null;

  if (!scenario) {
    if (!confirm('This business case needs to be saved before it can be shared. Save it now?')) return;
    if (typeof saveScenario === 'function') {
      await saveScenario();
      /* Re-resolve after save. */
      scenario = (typeof savedScenarios !== 'undefined')
        ? savedScenarios.find(s => s.company === company && s.name === name && s.isCurrent)
        : null;
    }
    if (!scenario) { if (typeof showToast==='function') showToast('Save the scenario, then click Share & track again.'); return; }
  }

  try {
    const resp = await apiFetch('/api/business-case-shares', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: scenario.id, company, title: name || 'ROI Business Case' })
    });
    if (!resp || !resp.ok) {
      const err = resp ? await resp.json().catch(()=>({})) : {};
      if (typeof showToast==='function') showToast('Could not create share link: ' + (err.error || 'unknown error'));
      return;
    }
    const data = await resp.json();
    showBusinessCaseShareModal(data.shareUrl, company);
    if (typeof trackEvent === 'function') trackEvent('business_case_shared', { company });
  } catch (e) {
    console.error('shareBusinessCase error:', e.message);
    if (typeof showToast==='function') showToast('Could not create share link — check your connection.');
  }
}

function showBusinessCaseShareModal(url, company) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'bcShareModal';
  modal.innerHTML = `<div class="modal" style="max-width:520px;">
    <div class="modal-title">Trackable business-case link</div>
    <p style="font-size:12px;color:var(--gray-500);margin-bottom:12px;">
      Share this link with <strong>${(company||'the prospect').replace(/</g,'&lt;')}</strong>. You'll see when they open it on the Saved tab (view count and last-viewed time). No tracking pixels are used — engagement is measured by views of this link.</p>
    <div style="display:flex;gap:8px;align-items:center;">
      <input type="text" id="bcShareUrl" readonly value="${url}" style="flex:1;padding:8px 10px;font-size:12px;border:1.5px solid var(--gray-200);border-radius:8px;"/>
      <button class="btn btn-cta btn-sm" onclick="(function(){var i=document.getElementById('bcShareUrl');i.select();navigator.clipboard.writeText(i.value).then(function(){if(typeof showToast==='function')showToast('Link copied.');});})()">Copy</button>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="document.getElementById('bcShareModal').remove()">Done</button></div>
  </div>`;
  const existing = document.getElementById('bcShareModal'); if (existing) existing.remove();
  document.body.appendChild(modal);
}
