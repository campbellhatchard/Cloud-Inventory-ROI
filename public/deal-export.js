/* ═══════════════════════════════════════════════════════════════════
   deal-export.js — Print/PDF + PowerPoint export for
   Joint Project Plans and Stakeholder Maps.

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
async function deChk(lib) {
  return typeof ensurePptxReady === 'function' && await ensurePptxReady();
}
function deEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function deDate(d, opts) {
  if (!d) return '';
  const raw = String(d);
  const date = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(raw)
    ? new Date(raw.slice(0, 10) + 'T12:00:00') : new Date(d);
  return date.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
}
function deMapGroups(map, milestones) {
  const saved = Array.isArray(map.groups) ? map.groups.filter(g => g && g.id && g.name) : [];
  if (saved.length) return saved;
  const defaults = ['Evaluate','Validate','Business Case','Legal & Procurement','Launch'];
  const names = defaults.filter(name => milestones.some(m => m.phase === name));
  milestones.forEach(m => { if (m.phase && !names.includes(m.phase)) names.push(m.phase); });
  return names.map((name, i) => ({ id:'legacy-' + i, name }));
}
function deMilestonesInGroup(milestones, group) {
  return milestones.filter(m => m.groupId === group.id || (!m.groupId && m.phase === group.name));
}
/* Open a clean print window with branded HTML and trigger print */
function dePrintWindow(title, innerHtml, extraCss, audience = 'customer') {
  const theme = window.CIBrand.documentTheme(audience);
  const themeCss = window.CIBrand.documentCss(audience);
  const w = window.open('', '_blank');
  if (!w) {
    /* Popup blocked — build document in a Blob URL instead so the user gets a clickable link */
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${deEsc(title)}</title>
    <style>${themeCss}@page{margin:.6in}*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--doc-font);color:var(--doc-body);line-height:1.5}
    .doc-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid var(--doc-accent);padding-bottom:14px;margin-bottom:20px}
    .doc-head img{height:42px}.doc-head .ht{font-size:12px;color:var(--doc-muted)}
    h1{font-size:22px;color:var(--doc-heading);margin-bottom:4px}.sub{font-size:13px;color:var(--doc-muted);margin-bottom:18px}
    h2{font-size:13px;color:var(--doc-accent);text-transform:uppercase;letter-spacing:.06em;margin:20px 0 8px;padding-bottom:4px;border-bottom:1.5px solid var(--doc-border)}
    table{width:100%;border-collapse:collapse;margin:8px 0 16px}th{background:var(--doc-heading);color:#fff;font-size:11px;text-align:left;padding:7px 9px}
    td{font-size:12px;padding:6px 9px;border-bottom:1px solid var(--doc-canvas);vertical-align:top}tr:nth-child(even) td{background:var(--doc-canvas)}
    .foot{margin-top:28px;padding-top:12px;border-top:1px solid var(--doc-border);font-size:11px;color:var(--doc-muted);text-align:center}
    .customer-purpose{margin:0 0 14px;padding:10px 13px;background:var(--doc-info);border-left:3px solid var(--doc-accent);border-radius:0 7px 7px 0;font-size:12px;line-height:1.55;color:var(--doc-body)}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}
    ${extraCss || ''}</style></head><body>${innerHtml}
    <div class="foot">${theme.footer} · Prepared for the intended recipient</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},350);}<\/script></body></html>`;
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--doc-heading);color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:90vw;';
      msg.innerHTML = '<span>Pop-up blocked. <a href="' + blobUrl + '" target="_blank" style="color:var(--doc-accent);font-weight:600;text-decoration:underline;">Open ' + deEsc(title) + ' ↗</a></span>'
        + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:18px;padding:0 4px;">×</button>';
      document.body.appendChild(msg);
      /* Keep recovery visible until the user opens it or dismisses it. */
    } catch(e) { showToast('Pop-up blocked — please allow pop-ups for this site to use PDF exports.'); }
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${deEsc(title)}</title>
    <style>${themeCss}
      @page { margin: 0.6in; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--doc-font); color: var(--doc-body); line-height: 1.5; }
      .doc-head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid var(--doc-accent); padding-bottom: 14px; margin-bottom: 20px; }
      .doc-head img { height: 42px; }
      .doc-head .ht { font-size: 12px; color: var(--doc-muted); }
      h1 { font-size: 22px; color: var(--doc-heading); margin-bottom: 4px; }
      .sub { font-size: 13px; color: var(--doc-muted); margin-bottom: 18px; }
      h2 { font-size: 13px; color: var(--doc-accent); text-transform: uppercase; letter-spacing: .06em; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid var(--doc-border); }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
      th { background: var(--doc-heading); color: #fff; font-size: 11px; text-align: left; padding: 7px 9px; }
      td { font-size: 12px; padding: 6px 9px; border-bottom: 1px solid var(--doc-canvas); vertical-align: top; }
      tr:nth-child(even) td { background: var(--doc-canvas); }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .prog-wrap { height: 12px; background: var(--doc-canvas); border-radius: 6px; overflow: hidden; max-width: 320px; margin: 6px 0 14px; }
      .prog-fill { height: 100%; background: linear-gradient(90deg,var(--doc-accent),var(--doc-success)); }
      .meta-line { font-size: 12px; color: var(--doc-muted); margin-bottom: 3px; }
      .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid var(--doc-border); font-size: 11px; color: var(--doc-muted); text-align: center; }
      .customer-purpose { margin: 0 0 14px; padding: 10px 13px; background: var(--doc-info); border-left: 3px solid var(--doc-accent); border-radius: 0 7px 7px 0; font-size: 12px; line-height: 1.55; color: var(--doc-body); }
      .overdue { color: var(--doc-danger); font-weight: 700; }
      .done td { color: var(--doc-muted); }
      .quad { position: relative; width: 460px; height: 340px; border: 1.5px solid var(--doc-border); margin: 10px 0 8px; }
      .quad-line { position: absolute; background: var(--doc-border); }
      .quad-dot { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; color: var(--doc-bg); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--doc-bg); }
      .quad-lbl { position: absolute; font-size: 9px; color: var(--doc-muted); font-weight: 700; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
      ${extraCss || ''}
    </style></head><body>${innerHtml}
    <div class="foot">${theme.footer} · Prepared for the intended recipient</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
    </body></html>`);
  w.document.close();
}

/* ═══════════════════════════════════════════════════════════════════
   JOINT PROJECT PLAN — PRINT / PDF
   variant: 'internal' | 'customer'
   ═══════════════════════════════════════════════════════════════════ */
async function printActionPlan(variant) {
  const m = _mapCurrent;
  if (!m) { showToast('Open a plan first.'); return; }
  const ms = m.milestones || [];
  const done = ms.filter(x => x.status === 'done').length;
  const pct = ms.length ? Math.round(done / ms.length * 100) : 0;
  const ownerLabels = variant === 'customer'
    ? { rep: 'Cloud Inventory', prospect: 'Your team', joint: 'Joint' }
    : { rep: 'Cloud Inventory', prospect: 'Customer', joint: 'Joint' };
  const statusLabels = { pending: 'Pending', in_progress: 'In progress', done: 'Complete' };

  const phases = deMapGroups(m, ms);
  let rowsHtml = '';
  phases.filter(p => deMilestonesInGroup(ms, p).length).forEach(phase => {
    rowsHtml += `<h2>${deEsc(phase.name)}</h2><table>
      <thead><tr><th style="width:46%;">Milestone</th><th style="width:18%;">Owner</th><th style="width:18%;">Due</th><th style="width:18%;">Status</th></tr></thead><tbody>`;
    deMilestonesInGroup(ms, phase).forEach(x => {
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

  const headTag = variant === 'customer' ? 'Joint Project Plan' : 'Joint Project Plan — Internal';
  const customerPurpose = variant === 'customer'
    ? '<div class="customer-purpose"><strong>Why we are sharing this plan</strong><br>This shared plan gives both teams one clear view of the actions, owners, and dates that turn your operational priorities into a measurable business outcome. Keeping decisions and dependencies visible helps us reduce evaluation risk, validate the value case, and move confidently toward a successful rollout.</div>'
    : '';
  const html = `
    <div class="doc-head">
      <img src="${window.location.origin}/${window.CIBrand.logo('logoColor')}" onerror="this.style.display='none'"/>
      <div class="ht">${headTag}</div>
    </div>
    <h1>${deEsc(m.title)}</h1>
    <div class="sub">${deEsc(m.company || '')}${m.target_close_date ? ' · Target close: ' + deDate(m.target_close_date, {month:'long',day:'numeric',year:'numeric'}) : ''}</div>
    ${customerPurpose}
    <div class="meta-line"><strong>Progress:</strong> ${done} of ${ms.length} complete (${pct}%)</div>
    <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%;"></div></div>
    ${rowsHtml || '<p style="font-size:13px;color:#6B7A8D;">No milestones yet.</p>'}`;
  dePrintWindow(m.title, html, '', variant === 'internal' ? 'internal' : 'customer');
}

/* ═══════════════════════════════════════════════════════════════════
   JOINT PROJECT PLAN — POWERPOINT
   ═══════════════════════════════════════════════════════════════════ */
async function pptActionPlan(variant) {
  if (!(await deChk())) return;
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
    const phases = deMapGroups(m, ms);

    const pptx = new pptxgen();
    pptx.defineLayout({ name: 'CI', width: PPT.W, height: PPT.H });
    pptx.layout = 'CI';
    pptx.title = m.title;

    /* Title slide */
    const s0 = pptx.addSlide();
    s0.background = { color: PPT.GRAY_BG };
    pptConfidentialFooter(s0);
    s0.addShape('rect', { x: 0, y: 2.3, w: PPT.W, h: 1.0, fill: { color: PPT.NAVY } });
    s0.addImage({ path: PPT.LOGO, x: 0.4, y: 0.4, w: 1.15, h: 1.15 * 349/1000 });
    s0.addText('Joint Project Plan', { x: 0.5, y: 2.45, w: 9, h: 0.5, fontSize: 30, bold: true, color: PPT.WHITE, fontFace: PPT.FONT });
    s0.addText(m.title, { x: 0.5, y: 3.5, w: 9, h: 0.4, fontSize: 16, bold: true, color: PPT.NAVY, fontFace: PPT.FONT });
    s0.addText([
      { text: m.company || '', options: { fontSize: 13, color: PPT.GRAY_TXT } },
      { text: m.target_close_date ? '   ·   Target close: ' + deDate(m.target_close_date, {month:'long',day:'numeric',year:'numeric'}) : '', options: { fontSize: 13, color: PPT.GRAY_TXT } }
    ], { x: 0.5, y: 3.95, w: 9, h: 0.35, fontFace: PPT.FONT });
    s0.addText(`${done} of ${ms.length} milestones complete (${pct}%)`, { x: 0.5, y: 4.35, w: 9, h: 0.35, fontSize: 12, italic: true, color: PPT.CYAN, fontFace: PPT.FONT });
    if (variant === 'customer') {
      s0.addText('This jointly-owned plan aligns decisions, owners, and timing so we can validate the value case, reduce evaluation risk, and move confidently toward measurable operational improvement.', { x: 0.5, y: 4.85, w: 8.8, h: 0.55, fontSize: 11, color: PPT.GRAY_TXT, fontFace: PPT.FONT });
    }

    /* Keep the deck compact: workstreams remain a column, not separate slide sections. */
    const planRows = ms.map(x => {
      const group = phases.find(p => p.id === x.groupId) || phases.find(p => p.name === x.phase) || { name: 'Plan' };
      const overdue = x.status !== 'done' && x.dueDate && new Date(x.dueDate) < new Date();
      return [
        { text: group.name, options: { fontSize: 8.5, color: PPT.CYAN, bold: true } },
        { text: x.title, options: { fontSize: 9.5, color: PPT.DARK_TXT } },
        { text: ownerLabels[x.owner] || x.owner, options: { fontSize: 9, color: PPT.GRAY_TXT } },
        { text: (x.dueDate ? deDate(x.dueDate) : '—') + (overdue ? ' ⚠' : ''), options: { fontSize: 9, color: overdue ? PPT.RED : PPT.GRAY_TXT } },
        { text: x.status === 'done' ? 'Complete' : x.status === 'in_progress' ? 'In progress' : 'Pending', options: { fontSize: 9, color: x.status === 'done' ? PPT.GREEN : PPT.GRAY_TXT } }
      ];
    });
    const rowsPerSlide = 11;
    for (let start = 0; start < planRows.length || (start === 0 && !planRows.length); start += rowsPerSlide) {
      const rows = [[
        { text: 'Workstream', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 9 } },
        { text: 'Milestone', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 9 } },
        { text: 'Owner', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 9 } },
        { text: 'Due', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 9 } },
        { text: 'Status', options: { bold: true, color: PPT.WHITE, fill: { color: PPT.NAVY }, fontSize: 9 } }
      ], ...planRows.slice(start, start + rowsPerSlide)];
      if (rows.length === 1) rows.push([{ text: 'No milestones yet', options: { fontSize: 10, color: PPT.GRAY_TXT } }, '', '', '', '']);
      const s = pptx.addSlide();
      pptChrome(s, null);
      pptTitle(s, start ? 'Joint Project Plan — continued' : 'Joint Project Plan milestones');
      s.addTable(rows, { x: 0.35, y: 1.55, w: 9.3, colW: [1.35, 4.15, 1.25, 1.2, 1.35], border: { pt: 0.5, color: 'E0E4E8' } });
    }

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
async function printStakeholderMap() {
  if (!_stakeholders.length) { showToast('Add stakeholders first.'); return; }
  const company = _stakeCompany || 'All companies';

  /* Quadrant dots as absolutely-positioned HTML */
  const dots = _stakeholders.map(s => {
    const x = ((s.support - 1) / 4) * 88 + 6;
    const y = 90 - ((s.influence - 1) / 4) * 84;
    const c = (typeof STAKE_ROLES !== 'undefined' && STAKE_ROLES[s.role]) ? STAKE_ROLES[s.role].color : 'var(--doc-muted)';
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
      <img src="${window.location.origin}/${window.CIBrand.logo('logoColor')}" onerror="this.style.display='none'"/>
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
  dePrintWindow('Stakeholder Map — ' + company, html, '', 'internal');
}

/* ═══════════════════════════════════════════════════════════════════
   STAKEHOLDER MAP — POWERPOINT
   ═══════════════════════════════════════════════════════════════════ */
async function pptStakeholderMap() {
  if (!(await deChk())) return;
  if (!_stakeholders.length) { showToast('Add stakeholders first.'); return; }
  const btn = document.getElementById('stakePptBtn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }

  try {
    const company = _stakeCompany || 'All companies';
    const roleLabels = { champion:'Champion', economic_buyer:'Economic Buyer', technical_buyer:'Technical Buyer', influencer:'Influencer', blocker:'Blocker', end_user:'End User' };
    const roleColor = (r) => (typeof STAKE_ROLES !== 'undefined' && STAKE_ROLES[r]) ? STAKE_ROLES[r].color.replace('#','') : '5A6570';

    const pptx = new pptxgen();
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
  const v=getVals(),r=calcROI(v);
  const M=n=>(n===null||n===undefined||isNaN(n))?'—':(typeof moneyFull==='function'?moneyFull(n):'$'+Math.round(n).toLocaleString());
  const PC=n=>(n===null||n===undefined||isNaN(n))?'—':Math.round(n*100)+'%';
  const N=n=>(n===null||n===undefined||isNaN(n))?'—':Number(n).toLocaleString();
  const classLabels={direct_cost_savings:'Direct cost savings',recovered_contribution_margin:'Recovered contribution margin',working_capital_carrying_benefit:'Working-capital / carrying benefit',capacity_value:'Capacity value',risk_avoidance:'Risk avoidance'};
  const details={
    workforce_productivity:()=>r.productivityMethodUsed==='throughput'
      ?{formula:'orders/year × cost/order × pick-rate gain × recovery',plugged:`${N(v.ordersPerYr)} × ${M(v.costPerOrder)} × ${PC(v.pickRateGainPct)} × ${PC(v.mThroughput)}`,desc:'Counted throughput-capacity method; not represented as automatic cash savings.'}
      :{formula:'users × loaded labor × measured waste × recovery',plugged:`${N(v.users)} × ${M(v.labor)} × ${PC(v.laborWastePct)} × ${PC(v.mLabor)}`,desc:'Counted workforce-productivity labor-recovery method.'},
    inventory_writeoff:()=>({formula:'annual central write-off base × effective recovery',plugged:`${M(v.effectiveShrinkBase)} × ${PC(r.effectiveShrinkRecovery)}`,desc:r.accuracyDerivedRecovery!==null&&!r.shrinkRecoveryExplicit?'Recovery is a derived model assumption from customer inventory accuracy.':'Central inventory write-off reduction; excludes field leakage.'}),
    inventory_carrying:()=>({formula:'max(direct carrying estimate, turns carrying estimate)',plugged:`counted ${M(r.inventoryCarrySav)}; overlap removed ${M(r.overlapAdj)}`,desc:'Central inventory working-capital/carrying pool.'}),
    service_revenue_margin:()=>({formula:r.serviceRevenueMethod==='direct_lost_sales'?'lost sales × contribution margin × realization':'revenue × OTIF gap × contribution margin × realization',plugged:r.serviceRevenueMethod==='direct_lost_sales'?`${M(v.lostSalesYr)} × ${PC(v.contributionMarginPct)} × ${PC(v.mOtif)}`:`${M(v.revenue)} × ${PC((v.otifTarget-v.otifBaseline)/100)} × ${PC(v.contributionMarginPct)} × ${PC(v.mOtif)}`,desc:`Method: ${r.serviceRevenueMethod||'unquantified — contribution margin required'}. Revenue is not treated as profit.`}),
    service_penalties:()=>({formula:'annual penalties / credits × reduction',plugged:`${M(v.servicePenaltyCostYr)} × ${PC(v.mServicePenalty)}`,desc:'Separate customer penalties, credits, chargebacks, and deductions pool.'}),
    expedite_premium:()=>({formula:'annual expedite premium × reduction',plugged:`${M(v.expediteSpendYr)} × ${PC(v.mExpedite)}`,desc:'Separate premium freight and emergency procurement pool.'}),
    downtime:()=>({formula:'events × hours/event × internal operating cost/hour × reduction',plugged:`${N(v.downtimeEventsYr)} × ${N(v.downtimeHrsPerEvent)} × ${M(v.downtimeCostPerHr)} × ${PC(v.mDowntime)}`,desc:'Risk avoidance: excludes lost sales, penalties/credits, and expedite reported separately.'}),
    count_labor:()=>({formula:'count days × people × loaded daily labor × recovery',plugged:`${N(v.countDaysYr)} × ${N(v.countPeople)} × ${M((v.labor||0)/260)} × ${PC(v.mCount)}`,desc:'Count days are event days, not people-days.'}),
    order_error:()=>({formula:'orders × error rate × operational cost/error × recovery',plugged:`${N(v.ordersPerYr)} × ${PC(v.orderErrorPct)} × ${M(v.costPerError)} × ${PC(v.mAccuracy)}`,desc:'Internal rework, return handling, and normal reship only; excludes penalties, expedite, and lost sales.'}),
    first_time_fix:()=>({formula:'repeat visits × cost/truck roll × reduction',plugged:`${N(v.repeatVisitsYr)} × ${M(v.costPerTruckRoll)} × ${PC(v.mFirstFix)}`,desc:'Avoided repeat-visit direct cost.'}),
    field_leakage:()=>({formula:'field inventory × field leakage rate × recovery',plugged:`${M(v.fieldInvValue)} × ${PC(v.fieldLeakageRate/100)} × ${PC(v.mFieldLeakage)}`,desc:'Field-only leakage; excludes central write-offs.'}),
    field_carrying:()=>({formula:'field inventory × carrying rate × effective recovery',plugged:`${M(v.fieldInvValue)} × ${PC(v.carryRate)} × ${PC(r.effectiveCarryingRecovery)}`,desc:'Field-only working-capital/carrying pool.'}),
    field_reconciliation:()=>({formula:'locations × frequency × person-hours × loaded hourly labor × recovery',plugged:`${N(v.fieldLocations)} × ${N(v.fieldReconcilePerYr)} × ${N(v.fieldReconcilePersonHours)} × ${M((v.labor||0)/2080)} × ${PC(v.mFieldCount)}`,desc:'Field reconciliation labor; separate from generic labor recovery.'}),
    it_displacement:()=>({formula:'annual IT cost × displacement',plugged:`${M(v.itCost)} × ${PC(v.mIt)}`,desc:'Direct legacy system cost displacement.'})
  };
  const levers=(r.activeValueDrivers||[]).map(d=>{const x=details[d.formulaId]?details[d.formulaId]():{formula:'Engine-calculated value',plugged:M(d.annualValue),desc:''};return{name:d.label,desc:x.desc+' Economic class: '+(classLabels[d.economicClass]||d.economicClass)+'.',provided:true,formula:x.formula,plugged:x.plugged,value:d.annualValue,economicClass:d.economicClass,counted:true};});
  const alternatives=(r.overlapAdjustments||[]).filter(x=>Number(x.removedValue)>0).map(x=>({name:'Alternative estimate — not additionally counted',desc:`${x.pool} overlap policy; selected method: ${x.method}.`,provided:true,formula:'Alternative-method comparison',plugged:Object.entries(x.candidateValues||{}).map(([k,val])=>k+' '+M(val)).join(' · '),value:0,counted:false}));
  const inputs=[['Inventory users',N(v.users)],['Loaded labor',M(v.labor)],['Central inventory value',M(v.inventory)],['Field inventory value',M(v.fieldInvValue)],['Central annual write-off',M(v.effectiveShrinkBase)],['Current accuracy',v.currentAccuracy?N(v.currentAccuracy)+'%':'Not Provided'],['OTIF baseline / target',v.otifBaseline?`${v.otifBaseline}% → ${v.otifTarget}%`:'Not Provided'],['Annual lost sales',v.lostSalesYr?M(v.lostSalesYr):'Not Provided'],['Contribution margin',v.contributionMarginPct?PC(v.contributionMarginPct):'Not Provided'],['Service penalties / credits',v.servicePenaltyCostYr?M(v.servicePenaltyCostYr):'Not Provided'],['Annual expedite premium',v.expediteSpendYr?M(v.expediteSpendYr):'Not Provided'],['Discount rate',PC(v.discRate)]];
  const fs=(typeof fieldStates!=='undefined')?fieldStates:{},provFields=(typeof CONFIDENCE_FIELDS!=='undefined')?CONFIDENCE_FIELDS:[];let prospectVerified=0,customerProvided=0,repConfirmed=0;const verifiedLabels=[];provFields.forEach(f=>{const s=fs[f.id]||'';if(s==='confirmed_prospect'){prospectVerified++;verifiedLabels.push(f.label);}else if(s==='confirmed_customer'){customerProvided++;verifiedLabels.push(f.label);}else if(s==='confirmed')repConfirmed++;});
  const provenance={prospectVerified,customerProvided,customerSupported:prospectVerified+customerProvided,repConfirmed,totalTracked:provFields.length,verifiedLabels};
  const categories={directCostSavings:r.annualDirectCostSavings,recoveredContributionMargin:r.annualRecoveredContributionMargin,workingCapitalBenefit:r.annualWorkingCapitalBenefit,capacityValue:r.annualCapacityValue,riskAvoidance:r.annualRiskAvoidance,annualEconomicBenefit:r.annualEconomicBenefit};
  return{v,r,M,PC,N,levers,alternatives,inputs,provenance,categories};
}

/* ── PDF variant ── */
async function roiMethodologyPDF() {
  const m = buildRoiMethodology();
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const v = m.v, r = m.r, M = m.M;
  const company = (v.company && v.company !== 'Prospect') ? v.company : 'Your Company';

  const leverRows = [...m.levers,...m.alternatives].map(L => {
    if(L.counted===false)return `<tr class="np"><td><strong>${esc(L.name)}</strong><div class="ld">${esc(L.desc)}</div></td><td class="f">${esc(L.formula)}</td><td class="f">${esc(L.plugged)}</td><td class="r">Not counted</td></tr>`;
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
    'Annual revenue': ['confirmed_prospect','confirmed_customer'].includes(fsMap['revenue']),
    'Inventory users': ['confirmed_prospect','confirmed_customer'].includes(fsMap['userCount']),
    'Inventory value on hand': ['confirmed_prospect','confirmed_customer'].includes(fsMap['inventoryValue']),
    'Annual write-off value': ['confirmed_prospect','confirmed_customer'].includes(fsMap['annualWriteOff']),
    'OTIF baseline / target': ['confirmed_prospect','confirmed_customer'].includes(fsMap['otifBaseline']),
    'Current inventory turns': ['confirmed_prospect','confirmed_customer'].includes(fsMap['invTurnsCurrent']),
    'Current IT / systems cost': ['confirmed_prospect','confirmed_customer'].includes(fsMap['itCost'])
  };
  const inputRows = m.inputs.map(([k,val]) => {
    const mark = verifiedByInputLabel[k] ? ' <span class="prov-mark" title="Verified by prospect">◉</span>' : '';
    return `<tr><td>${esc(k)}${mark}</td><td class="${val==='Not Provided'?'np-cell':''}">${esc(val)}</td></tr>`;
  }).join('');

  const rampNote = `Year-1 benefit is ramp-adjusted (${Math.round((v.ramp1 ?? 0.4)*100)}% / ${Math.round((v.ramp2 ?? 0.75)*100)}% / ${Math.round((v.ramp3 ?? 1)*100)}% over the first three periods), so it is lower than the full annual benefit.`;

  /* Prospect-verification headline (value-engineering credibility signal) */
  const p = m.provenance || { prospectVerified:0, totalTracked:0 };
  const provenanceBanner = (p.customerSupported||p.prospectVerified) > 0
    ? `<div class="prov-banner"><span class="prov-check">◉</span> <strong>${p.customerSupported||p.prospectVerified} of ${p.totalTracked} tracked inputs have recorded customer provenance</strong> — ${p.prospectVerified||0} were entered through the Prospect Link and ${p.customerProvided||0} were recorded from another customer source. Customer-supported inputs are marked <span class="prov-mark">◉</span> below.</div>`
    : '';

  const html = `
    <div class="doc-head"><img src="${window.location.origin}/${window.CIBrand.logo('logoColor')}" onerror="this.style.display='none'"/><div class="ht">ROI Methodology &amp; Calculation Detail</div></div>
    <h1>ROI Methodology &amp; Calculation Detail</h1>
    <div class="sub">${esc(company)}${v.rep?' · Prepared by '+esc(v.rep):''}${v.name?' · '+esc(v.name):''} · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
    <p class="intro">This appendix reports the calculation executed by ROI Model v2.8. Customer-provided inputs are supplemented by documented model assumptions and approved benchmarks where applicable. Counted drivers, excluded alternatives, economic classes, ramp, and overlap decisions reconcile to the calculator.</p>

    <h2>1. Inputs used</h2>
    ${provenanceBanner}
    <table class="kv"><tbody>${inputRows}</tbody></table>

    <h2>2. Benefit breakdown</h2>
    <table><thead><tr><th style="width:34%">Value driver</th><th>Formula</th><th>Your figures</th><th class="r">Annual value</th></tr></thead>
    <tbody>${leverRows}</tbody>
    <tfoot><tr><td colspan="3"><strong>Total annual benefit</strong> (steady-state)</td><td class="r"><strong>${M(r.annualBenefit)}</strong>/yr</td></tr></tfoot></table>

    <h2>2a. Economic-class reconciliation</h2><table class="kv"><tbody>
      <tr><td>Direct cost savings</td><td>${M(m.categories.directCostSavings)}</td></tr><tr><td>Recovered contribution margin</td><td>${M(m.categories.recoveredContributionMargin)}</td></tr><tr><td>Working-capital / carrying benefit</td><td>${M(m.categories.workingCapitalBenefit)}</td></tr><tr><td>Capacity value</td><td>${M(m.categories.capacityValue)}</td></tr><tr><td>Risk avoidance</td><td>${M(m.categories.riskAvoidance)}</td></tr><tr><td><strong>Annual economic benefit</strong></td><td><strong>${M(m.categories.annualEconomicBenefit)}</strong></td></tr>
    </tbody></table>

    <h2>3. Assumptions &amp; conservatism</h2>
    <ul class="notes">
      <li><strong>Internal accuracy-calibration rule.</strong> The 99.5% modeling target, gap × 5 rule, and 60% cap are Cloud Inventory model assumptions, not an industry benchmark.</li>
      <li><strong>Inventory-carrying overlap control.</strong> Direct carrying reduction and turns-based carrying savings are not added together; ${M(r.overlapAdj)} of overlap was removed.</li>
      <li><strong>Ramp-up applied.</strong> ${esc(rampNote)}</li>
      <li><strong>Input provenance.</strong> Customer-provided inputs are supplemented by documented model assumptions and approved benchmarks where applicable.</li>
    </ul>

    <h2>3a. Benchmark sourcing</h2>
    <p class="intro">Where the customer's own figures were not available, the following default benchmarks were used. Each is documented so it can be reviewed and challenged.</p>
    <ul class="notes">
      ${(typeof benchmarkProvenanceLines === 'function' ? benchmarkProvenanceLines(v.industry) : []).map(line => `<li>${esc(line)}</li>`).join('')}
    </ul>

    <h2>4. Return calculation</h2>
    <table class="kv"><tbody>
      <tr><td>Total ${r.contractMonths}-month benefit</td><td>${M(r.totalContractBenefit)}</td></tr>
      <tr><td>Total contract investment</td><td>${M(r.totalContractInvestment)}</td></tr>
      <tr><td>Total contract net benefit</td><td>${M(r.totalContractNetBenefit)}</td></tr>
      <tr><td><strong>Total contract ROI</strong></td><td><strong>${m.PC(r.totalContractRoi/100)}</strong></td></tr>
      <tr><td>Payback period</td><td>${r.contractPayback? r.contractPayback.toFixed(1)+' months':'Not achieved during contract term'}</td></tr>
      <tr><td>Contract NPV @ ${m.PC(v.discRate)}</td><td>${M(r.totalContractNpv)}</td></tr>
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
    .intro{font-size:12px;color:var(--doc-muted);line-height:1.6;margin-bottom:16px;}
    table.kv td:first-child{color:var(--doc-muted);width:55%;}
    table.kv td:last-child{font-weight:600;text-align:right;}
    .f{font-family:'Courier New',monospace;font-size:10px;color:var(--doc-muted);}
    .r{text-align:right;}
    .ld{font-size:10px;color:#6B7A8D;font-weight:400;margin-top:2px;}
    .new{background:#C24A1E;color:#fff;font-size:8px;font-weight:700;padding:1px 5px;border-radius:8px;}
    tr.np td{color:#6B7A8D;}
    .np-cell{color:#C24A1E;font-weight:600;}
    tfoot td{border-top:2px solid var(--doc-heading);font-size:13px;padding-top:8px;}
    .notes{margin:4px 0 16px;padding-left:18px;} .notes li{font-size:11px;color:var(--doc-muted);margin-bottom:5px;line-height:1.5;}
    .disc{font-size:10px;color:#6B7A8D;font-style:italic;margin-top:14px;line-height:1.5;}
    .prov-banner{background:#E3F2F0;border:1px solid #12786F;border-radius:7px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#0D5A54;line-height:1.5;}
    .prov-check{color:#12786F;font-weight:700;}
    .prov-mark{color:#12786F;font-size:10px;}`;
  dePrintWindow('ROI Methodology — ' + company, htmlWithContext, extraCss, 'internal');
}

/* ── PowerPoint variant ── */
async function roiMethodologyPPT() {
  if (!(await deChk())) return;
  const btn = document.getElementById('roiMethodPptBtn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }
  try {
    const m = buildRoiMethodology();
    const v = m.v, r = m.r, M = m.M;
    const company = (v.company && v.company !== 'Prospect') ? v.company : 'Your Company';

    const pptx = new pptxgen();
    pptx.defineLayout({ name:'CI', width:PPT.W, height:PPT.H }); pptx.layout='CI';
    pptx.title = 'ROI Methodology — ' + company;

    /* Title slide */
    const s0 = pptx.addSlide(); s0.background = { color: PPT.GRAY_BG };
    pptConfidentialFooter(s0);
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
    [...m.levers,...m.alternatives].forEach(L => {
      if(L.counted===false){rows.push([{text:L.name,options:{fontSize:9,color:PPT.DARK_TXT}},{text:L.plugged,options:{fontSize:9,color:PPT.GRAY_TXT,italic:true}},{text:'Not counted',options:{fontSize:9,color:'C77700'}}]);return;}
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

    /* Return + assumptions slide */
    const s2 = pptx.addSlide(); pptChrome(s2,3); pptTitle(s2,'Return & Assumptions');
    const kv = [
      [`Total ${r.contractMonths}-month benefit`, M(r.totalContractBenefit)],
      ['Total contract investment', M(r.totalContractInvestment)],
      ['Total contract net benefit', M(r.totalContractNetBenefit)],
      ['Total contract ROI', m.PC(r.totalContractRoi/100)],
      ['Payback', r.contractPayback? r.contractPayback.toFixed(1)+' months':'Not in term'],
      ['Contract NPV', M(r.totalContractNpv)],
    ];
    kv.forEach((row,i)=>{
      const y=1.6+i*0.42;
      s2.addText(row[0],{x:0.5,y,w:4.5,h:0.35,fontSize:12,color:PPT.GRAY_TXT,fontFace:PPT.FONT});
      s2.addText(row[1],{x:5.0,y,w:2.0,h:0.35,fontSize:12,bold:true,color:PPT.NAVY,align:'right',fontFace:PPT.FONT});
    });
    s2.addText('Conservative adjustments applied',{x:7.4,y:1.6,w:2.6,h:0.3,fontSize:12,bold:true,color:PPT.CYAN,fontFace:PPT.FONT});
    s2.addText([
      {text:'99.5% internal accuracy-calibration target (model assumption)',options:{bullet:{indent:8},breakLine:true}},
      {text:`Inventory-carrying overlap removed (${M(r.overlapAdj)})`,options:{bullet:{indent:8},breakLine:true}},
      {text:'Ramp-up applied to Year 1',options:{bullet:{indent:8},breakLine:true}},
      {text:'Customer inputs plus documented assumptions and approved benchmarks where applicable',options:{bullet:{indent:8}}}
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
async function shareBusinessCase(savedScenarioId) {
  if(!savedScenarioId&&!window._calcScenarioId)return showToast('Save and select the exact scenario version before publishing.');
  if(!savedScenarioId&&typeof persistThreeWhys==='function'){
    saveThreeWhys({persist:false});
    if(!await persistThreeWhys())return showToast('Wait for the narrative save to finish, then retry publishing.');
  }
  const scenarioId=savedScenarioId||window._calcScenarioId;
  let reviewAcknowledged=false;
  for(let attempt=0;attempt<2;attempt++){
    const response=await apiFetch('/api/business-case-shares',{method:'POST',body:JSON.stringify({scenarioId,reviewAcknowledged})});
    const data=await response.json();
    if(response.ok){showBusinessCaseShareModal(new URL(data.shareUrl,location.origin).href,window.executiveValueStory?.meta?.customer||'Customer');return;}
    if(data.readiness?.status==='review'&&!reviewAcknowledged){reviewAcknowledged=confirm('Review Before Sharing: '+data.readiness.warnings.map(x=>x.title).join('; ')+'. I have reviewed these limitations and acknowledge them before publishing.');if(reviewAcknowledged)continue;}
    showToast(data.error||'Publication failed.');return;
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
      <button class="btn btn-primary btn-sm" onclick="(function(){var i=document.getElementById('bcShareUrl');i.select();navigator.clipboard.writeText(i.value).then(function(){if(typeof showToast==='function')showToast('Link copied.');});})()">Copy</button>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="document.getElementById('bcShareModal').remove()">Done</button></div>
  </div>`;
  const existing = document.getElementById('bcShareModal'); if (existing) existing.remove();
  document.body.appendChild(modal);
}

/* ═══════════════════════════════════════════════════════════════════
   Champion enablement pack
   A concise internal deck the champion takes to their own committee,
   including practical answers to financial, operational, and IT questions.
   ═══════════════════════════════════════════════════════════════════ */

function buildChampionPack(){showToast('Champion Pack is unavailable pending governed output conversion. CONFIDENTIAL — INTERNAL USE ONLY.');}
window.buildChampionPack = buildChampionPack;

function fmtMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const s = typeof CURR_SYMBOLS !== 'undefined' ? (CURR_SYMBOLS.USD || '$') : '$';
  if (abs >= 1e6) return (n < 0 ? '-' : '') + s + (abs/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n < 0 ? '-' : '') + s + Math.round(abs).toLocaleString();
  return (n < 0 ? '-' : '') + s + Math.round(abs);
}
function fmtPct(n) { return (n === null || n === undefined || isNaN(n)) ? '—' : Math.round(n) + '%'; }

/* ═══════════════════════════════════════════════════════════════════
   Role-specific one-pager PPT export
   One slide, audience-specific emphasis, no jargon.
   ═══════════════════════════════════════════════════════════════════ */

async function exportOnePager() {
  if (!(await deChk('library'))) return;
  const btn = document.getElementById('onePagerBtn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building…'; }

  try {
    const v = (typeof getVals === 'function') ? getVals() : {};
    const r = (typeof calcROI === 'function') ? calcROI(v) : {};
    const audience = v.execAudience || 'mixed';
    const company = (v.company && v.company !== 'Prospect') ? v.company : 'Your Prospect';
    const ind = (typeof IND !== 'undefined' && IND[v.industry]) ? IND[v.industry].label : 'your industry';

    /* Audience config */
    const AUD = {
      cfo: {
        label:'CFO', icon:'💰',
        headline: 'Financial case for Cloud Inventory',
        focus: ['Total contract ROI', 'Payback period', 'Contract NPV', 'Capital freed by turns improvement'],
        color: '0089A6',
        emphasis: [
          ['Conservative annual benefit', fmtMoney(r.annualBenefit * 0.7)],
          ['Base case annual benefit',    fmtMoney(r.annualBenefit)],
          [`Total ${r.contractMonths}-month ROI`, fmtPct(r.totalContractRoi)],
          ['Payback from signing', r.contractPayback ? r.contractPayback.toFixed(1) + ' months' : 'Not in term'],
          ['Contract NPV', fmtMoney(r.totalContractNpv)],
          ['Annual subscription',        fmtMoney(v.invest) + '/yr'],
          ['One-time implementation',    fmtMoney(v.otc)],
        ],
        note: 'Conservative case scales all efficiency recovery assumptions to 70%. Investment cost is fixed in all scenarios.'
      },
      coo: {
        label:'VP Operations', icon:'⚙️',
        headline: 'Operational case for Cloud Inventory',
        focus: ['Labor savings', 'OTIF improvement', 'Shrinkage reduction', 'Downtime avoided'],
        color: '2E7D32',
        emphasis: [
          ['Annual labor savings',       fmtMoney(r.laborSav)],
          ['Shrinkage / write-off reduction', fmtMoney(r.shrinkSav)],
          ['OTIF improvement value',     fmtMoney(r.otifSav)],
          ['Expedite spend reduction',   fmtMoney(r.expediteSav || 0)],
          ['Downtime avoided',           fmtMoney(r.downtimeSav || 0)],
          ['Total annual benefit',       fmtMoney(r.annualBenefit)],
        ],
        note: 'Focus: labor redeployment (not headcount reduction), accuracy improvement, and OTIF compliance.'
      },
      ceo: {
        label:'CEO / Executive Sponsor', icon:'🎯',
        headline: 'Strategic case for Cloud Inventory',
        focus: ['Total value', 'Competitive position', 'Risk reduction', 'Speed to value'],
        color: '45688A',
        emphasis: [
          ['Annual recurring value',     fmtMoney(r.annualBenefit)],
          ['Contract NPV',               fmtMoney(r.totalContractNpv)],
          ['Speed to go-live',           (v.implMonths || 3) + ' months'],
          ['Payback from signing',        r.contractPayback ? r.contractPayback.toFixed(1) + ' months' : 'Not in term'],
          ['Working capital freed',       fmtMoney(r.capitalFreed || 0)],
          [`Total ${r.contractMonths}-month ROI`, fmtPct(r.totalContractRoi)],
        ],
        note: 'Cloud Inventory is deployed 5–10× faster than SAP or Oracle WMS alternatives, with a fraction of the implementation risk.'
      },
      cio: {
        label:'CIO / IT', icon:'💻',
        headline: 'Technical case for Cloud Inventory',
        focus: ['Integration', 'IT cost displacement', 'Security', 'Architecture'],
        color: '6A4C93',
        emphasis: [
          ['Annual IT cost displaced',   fmtMoney(r.itSav)],
          ['Integration approach',       'ERP-agnostic REST API'],
          ['Deployment model',           'Cloud SaaS — no on-premise infrastructure'],
          ['Mobile platform',            'iOS and Android — no RF gun refresh'],
          ['Go-live timeline',           (v.implMonths || 3) + ' months'],
          ['Total annual benefit',       fmtMoney(r.annualBenefit)],
        ],
        note: 'Cloud Inventory integrates with any ERP via REST API. No ABAP, no Oracle middleware, no proprietary connectors.'
      },
      mixed: {
        label:'Executive', icon:'👥',
        headline: 'Business case for Cloud Inventory',
        focus: ['ROI', 'Payback', 'Benefit breakdown', 'Next steps'],
        color: '1E2931',
        emphasis: [
          ['Total contract benefit',     fmtMoney(r.totalContractBenefit)],
          [`Total ${r.contractMonths}-month ROI`, fmtPct(r.totalContractRoi)],
          ['Payback from signing',        r.contractPayback ? r.contractPayback.toFixed(1) + ' months' : 'Not in term'],
          ['Contract NPV',               fmtMoney(r.totalContractNpv)],
          ['Total contract investment',  fmtMoney(r.totalContractInvestment)],
          ['Go-live timeline',           (v.implMonths || 3) + ' months'],
        ],
        note: 'Analysis uses ' + company + ' operational data where available, supplemented by ' + ind + ' benchmarks.'
      }
    };

    const aud = AUD[audience] || AUD.mixed;
    const pptx = new pptxgen();
    pptx.defineLayout({ name:'CI', width:PPT.W, height:PPT.H }); pptx.layout = 'CI';
    pptx.title = aud.label + ' One-Pager — ' + company;

    const s = pptx.addSlide(); s.background = { color: PPT.GRAY_BG };

    /* Left column: brand + headline + key metrics */
    s.addShape('rect', {x:0, y:0, w:4.2, h:PPT.H, fill:{color:aud.color}});
    s.addImage({path:PPT.LOGO, x:0.3, y:0.25, w:1.0, h:1.0*349/1000});
    s.addText(aud.icon + ' ' + aud.label, {x:0.3, y:1.0, w:3.6, h:0.4, fontSize:13, bold:true, color:'BEC4C8', fontFace:PPT.FONT});
    s.addText(aud.headline, {x:0.3, y:1.45, w:3.6, h:0.7, fontSize:18, bold:true, color:PPT.WHITE, fontFace:PPT.FONT, wrap:true});
    s.addText(company, {x:0.3, y:2.2, w:3.6, h:0.3, fontSize:12, color:'BEC4C8', fontFace:PPT.FONT});

    /* Key metrics table in left column */
    aud.emphasis.forEach(([k,v2], i) => {
      const y = 2.75 + i * 0.52;
      if (y > 6.8) return;
      s.addText(k, {x:0.3, y, w:3.6, h:0.22, fontSize:9, color:'B5BDC1', fontFace:PPT.FONT});
      s.addText(v2, {x:0.3, y:y+0.22, w:3.6, h:0.26, fontSize:13, bold:true, color:PPT.WHITE, fontFace:PPT.FONT});
    });

    /* Right column: narrative */
    pptTitle(s, company + ' — Cloud Inventory', 4.5);
    s.addText('What this analysis covers:', {x:4.5, y:1.0, w:5.2, h:0.3, fontSize:11, bold:true, color:PPT.NAVY, fontFace:PPT.FONT});
    aud.focus.forEach((f, i) => {
      s.addText('• ' + f, {x:4.7, y:1.35 + i*0.3, w:4.9, h:0.28, fontSize:10.5, color:PPT.GRAY_TXT, fontFace:PPT.FONT});
    });

    /* Cost of inaction box */
    const ab = r.annualBenefit || 0;
    if (ab > 0) {
      const yBox = 2.7;
      s.addShape('roundRect', {x:4.5, y:yBox, w:5.2, h:1.1, fill:{color:'FFF0EB'}, line:{color:PPT.ORANGE, pt:1}, rectRadius:0.08});
      s.addText('Cost of delayed decision', {x:4.7, y:yBox+0.08, w:4.8, h:0.3, fontSize:10, bold:true, color:PPT.ORANGE, fontFace:PPT.FONT});
      s.addText(fmtMoney(ab/12) + ' per month  ·  ' + fmtMoney(ab/2) + ' per 6-month delay', {
        x:4.7, y:yBox+0.42, w:4.8, h:0.5, fontSize:11, color:PPT.ORANGE, fontFace:PPT.FONT, wrap:true
      });
    }

    /* Footnote */
    s.addText(aud.note, {x:4.5, y:PPT.H-0.55, w:5.2, h:0.4, fontSize:8, color:PPT.GRAY_TXT, italic:true, fontFace:PPT.FONT, wrap:true});
    s.addText('Cloud Inventory  ·  cloudinventory.com', {x:4.5, y:PPT.H-0.22, w:5.2, h:0.2, fontSize:7.5, color:PPT.GRAY_TXT, fontFace:PPT.FONT});

    const safe = (aud.label + '-' + company).replace(/[^a-zA-Z0-9 \-_]/g,'').replace(/\s+/g,'-');
    await pptx.writeFile({ fileName: `One-Pager-${safe}-${new Date().toISOString().split('T')[0]}.pptx` });
    if (typeof showToast === 'function') showToast(aud.icon + ' ' + aud.label + ' one-pager downloaded!');
    if (typeof trackEvent === 'function') trackEvent('one_pager_exported', { audience, company });
  } catch(err) {
    console.error('One-pager error:', err);
    if (typeof showToast === 'function') showToast('Export failed: ' + (err.message || 'unknown'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig || 'One-pager'; }
  }
}
window.exportOnePager = exportOnePager;

/* v6.8.4 governed replacement. The legacy builder above is retained only for
   rollback inspection and is no longer bound to an active control. This output
   is Internal Only until a separately approved customer-safe product exists. */
async function exportGovernedOnePager(){
  if(!(await deChk('library')))return;
  const btn=document.getElementById('onePagerBtn'),orig=btn?.innerHTML;
  if(btn){btn.disabled=true;btn.textContent='Building…';}
  try{
    if(!window._calcScenarioId)throw new Error('Save the opportunity before creating the one-pager.');
    const story=await loadExecutiveValueStory(true),e=story.economics,c=story.meta.currency,audience=(typeof getVals==='function'?getVals().execAudience:'mixed')||'mixed',labels={cfo:'CFO',coo:'VP Operations',ceo:'CEO / Executive Sponsor',cio:'CIO / IT',mixed:'Executive'},pptx=new pptxgen();
    pptx.defineLayout({name:'CI',width:PPT.W,height:PPT.H});pptx.layout='CI';pptx.title=`Internal ${labels[audience]||labels.mixed} One-Pager — ${story.meta.customer}`;
    const s=pptx.addSlide();s.background={color:PPT.GRAY_BG};pptChrome(s,1);s.addShape('rect',{x:4.6,y:PPT.H-.43,w:5.1,h:.3,fill:{color:PPT.GRAY_BG},line:{color:PPT.GRAY_BG}});s.addText(window.CIBrand.audience('internal'),{x:5,y:PPT.H-.4,w:4.4,h:.2,fontSize:7.5,color:PPT.GRAY_TXT,align:'right',fontFace:PPT.FONT});s.addText('CONFIDENTIAL — INTERNAL USE ONLY',{x:.45,y:.35,w:4.4,h:.25,fontSize:9,bold:true,color:PPT.RED,fontFace:PPT.FONT});pptTitle(s,`${labels[audience]||labels.mixed} value-case brief`);
    s.addText(story.meta.customer,{x:.5,y:1.35,w:4.4,h:.35,fontSize:18,bold:true,color:PPT.NAVY,fontFace:PPT.FONT});
    [['Annual Customer Benefit',pptMoney(e.annualBenefit,c)],['Total Contract Benefit',pptMoney(e.totalContractBenefit,c)],['Modeled Customer Investment',pptMoney(e.totalContractInvestment,c)],['Net Economic Benefit',pptMoney(e.netEconomicBenefit,c)],['Contract ROI',Number.isFinite(Number(e.contractRoi))?Math.round(e.contractRoi)+'%':'—'],['NPV',pptMoney(e.npv,c)],['Payback',e.payback==null?'Not within term':Number(e.payback).toFixed(1)+' months'],['Customer-Supported Value',`${e.customerSupportedValuePct}%`]].forEach(([k,v],i)=>{const x=.5+(i%2)*2.25,y=1.9+Math.floor(i/2)*.68;s.addText(k,{x,y,w:2.05,h:.2,fontSize:8,color:PPT.GRAY_TXT,fontFace:PPT.FONT});s.addText(v,{x,y:y+.2,w:2.05,h:.3,fontSize:13,bold:true,color:PPT.NAVY,fontFace:PPT.FONT});});
    s.addText('Executive Value Story',{x:5.25,y:1.35,w:4.2,h:.3,fontSize:15,bold:true,color:PPT.CYAN_DARK,fontFace:PPT.FONT});[['Why Change',story.threeWhys.whyChange],['Why Now',story.threeWhys.whyNow],['Why Cloud Inventory',story.threeWhys.whyCloudInventory]].forEach(([k,v],i)=>{const y=1.8+i*1.05;s.addText(k,{x:5.25,y,w:4.2,h:.23,fontSize:10,bold:true,color:PPT.NAVY,fontFace:PPT.FONT});s.addText(v.value,{x:5.25,y:y+.25,w:4.2,h:.55,fontSize:9.5,color:PPT.GRAY_TXT,fontFace:PPT.FONT,fit:'shrink'});});
    s.addText('Uses the authoritative Executive Value Story. No independent ROI, cost-of-delay, benchmark, competitor, or implementation claim is generated.',{x:5.25,y:5.0,w:4.2,h:.3,fontSize:7.5,italic:true,color:PPT.GRAY_TXT,fontFace:PPT.FONT});
    const safe=story.meta.customer.replace(/[^a-z0-9]+/gi,'-');await pptx.writeFile({fileName:`Cloud-Inventory-Internal-${labels[audience]||labels.mixed}-One-Pager-${safe}-${new Date().toISOString().slice(0,10)}.pptx`});showToast?.('Internal one-pager downloaded.');
  }catch(err){console.error('governed_one_pager.failed',{message:err.message});showToast?.(err.message||'One-pager could not be generated.');}
  finally{if(btn){btn.disabled=false;btn.innerHTML=orig||'Role one-pager';}}
}
window.exportOnePager=exportGovernedOnePager;

/* ═══════════════════════════════════════════════════════════════════
   COMPETITIVE BATTLECARD EXPORTS
   exportCompPDF()  — branded print window → Save as PDF
   exportCompDocx() — .docx download via docx CDN browser bundle
   ═══════════════════════════════════════════════════════════════════ */

function _getCompData() {
  const key = (document.getElementById('compSelect') || {}).value || '';
  const intel=window._ciCurrentIntelligence;
  if(intel&&intel.product&&intel.product.id===key){
    const approved=(intel.findings||[]).filter(f=>f.status==='approved'),latest=(intel.researchRuns||[])[0],raw=latest?.result_json||{};
    const c={name:intel.product.product_name,cost:'See governed source details',time:'See governed source details',maint:'See governed source details',pain:approved.length?approved.map(f=>f.claim):(raw.competitorPain||[]).map(x=>x.text),adv:approved.length?[]:(raw.ciAdvantages||[]).map(x=>x.text)};
    const company=(document.getElementById('company')||{}).value||'Internal sales team',repName=(typeof currentUser!=='undefined'&&currentUser)?currentUser.full_name||currentUser.username:'';
    return {key,c,company,repName,talk:approved.length?'':raw.talkTrack||'',battlecardRevisionId:intel.battlecard?.current_revision_id||null,statusLabel:approved.length?`Approved Battlecard v${intel.battlecard?.revision_version||1}`:'Research — not yet approved'};
  }
  if (!key || !window.COMP || !window.COMP[key]) return null;
  const c = window.COMP[key];
  const company = (document.getElementById('company') || {}).value || 'Prospect';
  const repName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.full_name || currentUser.username : '';

  const TALK_TRACKS = {
    sap:    '"Most SAP shops we talk to are spending 20%+ of their WMS budget just keeping the system running — consultants, customizations, and upgrade projects that never quite end. Cloud Inventory gives you the same inventory control with zero ABAP and a fraction of the maintenance cost. Our last SAP displacement went live in 11 weeks."',
    rf:     '"RF-gun systems were built for a world where warehouses didn\'t move. Your team is managing field inventory on clipboards and radio calls, which means your shrinkage numbers are really just guesses. We give you real-time visibility across every truck, van, and job site — same platform as the warehouse."',
    oracle: '"Oracle WMS is a serious product, but it\'s engineered for Oracle shops. The moment you\'re connecting to a non-Oracle ERP or you want your field teams on mobile, the integration cost explodes. We\'re ERP-agnostic, API-first, and we deploy in months, not years."',
    excel:  '"Spreadsheets are really a hidden cost center — we typically find $80K to $200K a year in labor waste just from reconciliation, write-offs, and the time it takes to answer \'where is this inventory right now?\' The ROI math is usually under six months, which is why this tends to be an easy buy-in."',
    erp:    '"ERP inventory modules are great at recording transactions, but they\'re not designed for execution — no directed put-away, limited scanning, and zero support for field inventory. We sit on top of your ERP and handle the execution layer it was never built for."',
    other:  '"Most WMS platforms were built to be configured once and frozen. If your business changes — new sites, new workflows, new ERP — you\'re back in a services engagement. We\'re no-code and cloud-native, so your team can adapt the system without calling us."'
  };

  return { key, c, company, repName, talk: TALK_TRACKS[key] || '' };
}

/* ── PDF Export ── */
async function exportCompPDF() {
  const id=window._ciCurrentIntelligence?.battlecard?.current_revision_id;
  if(!id)return showToast('Formal export requires an approved Battlecard revision. Research remains available internally.');
  const response=await apiFetch('/api/export/battlecard/'+encodeURIComponent(id));
  if(!response.ok)return showToast('An approved active Battlecard revision is required.');
  const data=await response.json();
  dePrintWindow('Competitive Battlecard', '<p>INTERNAL COMPETITIVE INTELLIGENCE · CONFIDENTIAL</p><h1>'+deEsc(data.product)+'</h1><p>Approved revision '+deEsc(data.version)+'</p>'+data.findings.map(x=>'<section><h2>'+deEsc(x.category)+'</h2><p>'+deEsc(x.claim)+'</p></section>').join(''),'','internal');
}

/* ── Word Export (.docx): server-side via /api/export/battlecard-docx ──
   Sends battlecard data to the server; server uses the docx npm package
   (real .docx format) and streams the file back. No CDN, no popup.    */
async function exportCompDocx() {
  if(!window._ciCurrentIntelligence?.battlecard?.current_revision_id)return showToast('Formal export requires an approved Battlecard revision. Research remains available internally.');
  const d = _getCompData();
  if (!d) { showToast('Select a competitor first.'); return; }
  const btn  = document.getElementById('compDocxBtn');
  const orig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

  try {
    const { c, company, repName, talk } = d;
    const TALK_TRACKS = {
      sap:        '“Most SAP shops we talk to are spending 20%+ of their WMS budget just keeping the system running — consultants, customizations, and upgrade projects that never quite end. Cloud Inventory gives you the same inventory control with zero ABAP and a fraction of the maintenance cost.”',
      rf:         '“RF-gun systems were built for a world where warehouses didn’t move. We give you real-time visibility across every truck, van, and job site — same platform as the warehouse.”',
      oracle:     '“Oracle WMS is a serious product, but it’s engineered for Oracle shops. We’re ERP-agnostic, API-first, and we deploy in months, not years.”',
      excel:      '“Spreadsheets are really a hidden cost center. The ROI math is usually under six months, which is why this tends to be an easy buy-in.”',
      erp:        '“ERP modules are great at recording transactions, but they’re not designed for execution. We sit on top of your ERP and handle the execution layer it was never built for.”',
      mep_lowcode:'“Low-code platforms give you a blank canvas — which sounds good until you realize someone has to build and maintain every single workflow. MEP is purpose-built for governed enterprise workflow mobilization.”',
      mep_rfgen:  '“RFgen is a distinct competitive product. Validate current product-specific evidence before using this internal talk track.”',
      mep_rfsmart:'“RF-SMART is a distinct competitive product. Validate current product-specific evidence before using this internal talk track.”',
      other:      '“Most WMS platforms were built to be configured once and frozen. We’re no-code and cloud-native, so your team can adapt the system without calling us.”'
    };
    const talkText = (talk || TALK_TRACKS[d.key] || '');

    const resp = await fetch('/api/export/battlecard-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (window.ciAuth ? window.ciAuth.getToken() : '')
      },
      body: JSON.stringify({
        competitorName: c.name,
        cost:    c.cost,
        time:    c.time,
        maint:   c.maint,
        pain:    c.pain,
        adv:     c.adv,
        talk:    talkText,
        company: company,
        repName: repName,
        battlecardRevisionId: d.battlecardRevisionId || null,
        researchStatus: d.statusLabel || 'Legacy curated content — provenance requires review'
      })
    });

    if (!resp.ok) {
      var errData = await resp.json().catch(function(){ return {}; });
      showToast('Word export failed: ' + (errData.error || resp.status));
      return;
    }

    var blob = await resp.blob();
    var url  = URL.createObjectURL(blob);
    var safe = c.name.replace(/[^a-zA-Z0-9]/g, '-');
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'Cloud-Inventory-Internal-Battlecard-' + safe + '-' + new Date().toISOString().split('T')[0] + '.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Word battlecard downloaded — open in Word, Google Docs, or LibreOffice.');
    if (typeof trackEvent === 'function') trackEvent('comp_docx_exported', { competitor: d.key, company: company });
  } catch(err) {
    console.error('Battlecard Word export error:', err);
    showToast('Word export failed: ' + (err.message || 'network error'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

window.exportCompPDF  = exportCompPDF;
window.exportCompDocx = exportCompDocx;

/* Primary production paths for saved operational PowerPoints. The older
   builders remain compatibility fallbacks only for unsaved local drafts. */
async function deServerPpt(url,button,fileName,retry){const old=button?.innerHTML;if(button){button.disabled=true;button.textContent='Generating…';}try{const r=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`Request failed (${r.status})`);const blob=await r.blob(),a=document.createElement('a'),objectUrl=URL.createObjectURL(blob);a.href=objectUrl;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);showToast('PowerPoint downloaded.');return true;}catch(e){console.error('operational_pptx.failed',{message:e.message});let n=document.getElementById('operationalPptRetry');if(!n){n=document.createElement('div');n.id='operationalPptRetry';n.className='proposal-review-notice';n.innerHTML='<b>PowerPoint could not be generated.</b> <button class="btn btn-secondary btn-sm">Retry</button>';n.querySelector('button').onclick=retry;(document.querySelector('.pane.active .page-header')||document.querySelector('.pane.active')||document.body).prepend(n);}showToast('PowerPoint could not be generated.');return false;}finally{if(button){button.disabled=false;button.innerHTML=old||'PowerPoint';}}}
const legacyPptActionPlan=pptActionPlan;
window.pptActionPlan=pptActionPlan=async function(variant){if(!_mapCurrent?.id)return legacyPptActionPlan(variant);const customer=String(_mapCurrent.company||'Customer').replace(/[^a-z0-9]+/gi,'-'),button=document.getElementById(variant==='customer'?'mapPptCustBtn':'mapPptIntBtn'),name=`Cloud-Inventory-${variant==='internal'?'Internal-':''}Joint-Project-Plan-${customer}-${new Date().toISOString().slice(0,10)}.pptx`;await deServerPpt(`/api/maps/${encodeURIComponent(_mapCurrent.id)}/export-pptx?audience=${variant}`,button,name,()=>window.pptActionPlan(variant));};
const legacyPptStakeholderMap=pptStakeholderMap;
window.pptStakeholderMap=pptStakeholderMap=async function(){if(!_stakeCompany)return legacyPptStakeholderMap();const company=String(_stakeCompany).replace(/[^a-z0-9]+/gi,'-'),button=document.getElementById('stakePptBtn');await deServerPpt(`/api/stakeholders/export-pptx?company=${encodeURIComponent(_stakeCompany)}`,button,`Cloud-Inventory-Internal-Stakeholder-Map-${company}-${new Date().toISOString().slice(0,10)}.pptx`,()=>window.pptStakeholderMap());};
