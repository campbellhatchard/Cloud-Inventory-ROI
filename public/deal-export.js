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
function dePrintWindow(title, innerHtml) {
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
