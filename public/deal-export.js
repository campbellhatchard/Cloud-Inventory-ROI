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
function dePrintWindow(title, innerHtml, extraCss) {
  const w = window.open('', '_blank');
  if (!w) {
    /* Popup blocked — build document in a Blob URL instead so the user gets a clickable link */
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${deEsc(title)}</title>
    <style>@page{margin:.6in}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#1E2931;line-height:1.5}
    .doc-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #00A9CC;padding-bottom:14px;margin-bottom:20px}
    .doc-head img{height:42px}.doc-head .ht{font-size:12px;color:#64748B}
    h1{font-size:22px;color:#1E2931;margin-bottom:4px}.sub{font-size:13px;color:#64748B;margin-bottom:18px}
    h2{font-size:13px;color:#00A9CC;text-transform:uppercase;letter-spacing:.06em;margin:20px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #E2E8F0}
    table{width:100%;border-collapse:collapse;margin:8px 0 16px}th{background:#1E2931;color:#fff;font-size:11px;text-align:left;padding:7px 9px}
    td{font-size:12px;padding:6px 9px;border-bottom:1px solid #F1F5F9;vertical-align:top}tr:nth-child(even) td{background:#F5F8FA}
    .foot{margin-top:28px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:11px;color:#6B7A8D;text-align:center}
    .customer-purpose{margin:0 0 14px;padding:10px 13px;background:#F0F9FF;border-left:3px solid #00A9CC;border-radius:0 7px 7px 0;font-size:12px;line-height:1.55;color:#475569}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}
    ${extraCss || ''}</style></head><body>${innerHtml}
    <div class="foot">© ${new Date().getFullYear()} Cloud Inventory · Confidential and proprietary · Prepared for the intended recipient</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},350);}<\/script></body></html>`;
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:#1E2931;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:90vw;';
      msg.innerHTML = '<span>Pop-up blocked. <a href="' + blobUrl + '" target="_blank" style="color:#00A9CC;font-weight:600;text-decoration:underline;">Open ' + deEsc(title) + ' ↗</a></span>'
        + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:18px;padding:0 4px;">×</button>';
      document.body.appendChild(msg);
      setTimeout(function(){ if (msg.parentElement) { msg.remove(); URL.revokeObjectURL(blobUrl); } }, 15000);
    } catch(e) { showToast('Pop-up blocked — please allow pop-ups for this site to use PDF exports.'); }
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${deEsc(title)}</title>
    <style>
      @page { margin: 0.6in; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter','Segoe UI',system-ui,sans-serif; color: #1E2931; line-height: 1.5; }
      .doc-head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #00A9CC; padding-bottom: 14px; margin-bottom: 20px; }
      .doc-head img { height: 42px; }
      .doc-head .ht { font-size: 12px; color: #64748B; }
      h1 { font-size: 22px; color: #1E2931; margin-bottom: 4px; }
      .sub { font-size: 13px; color: #64748B; margin-bottom: 18px; }
      h2 { font-size: 13px; color: #00A9CC; text-transform: uppercase; letter-spacing: .06em; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #E2E8F0; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
      th { background: #1E2931; color: #fff; font-size: 11px; text-align: left; padding: 7px 9px; }
      td { font-size: 12px; padding: 6px 9px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
      tr:nth-child(even) td { background: #F5F8FA; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
      .prog-wrap { height: 12px; background: #F1F5F9; border-radius: 6px; overflow: hidden; max-width: 320px; margin: 6px 0 14px; }
      .prog-fill { height: 100%; background: linear-gradient(90deg,#00A9CC,#2E7D32); }
      .meta-line { font-size: 12px; color: #64748B; margin-bottom: 3px; }
      .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #6B7A8D; text-align: center; }
      .customer-purpose { margin: 0 0 14px; padding: 10px 13px; background: #F0F9FF; border-left: 3px solid #00A9CC; border-radius: 0 7px 7px 0; font-size: 12px; line-height: 1.55; color: #475569; }
      .overdue { color: #C81E10; font-weight: 700; }
      .done td { color: #6B7A8D; }
      .quad { position: relative; width: 460px; height: 340px; border: 1.5px solid #CBD5E1; margin: 10px 0 8px; }
      .quad-line { position: absolute; background: #E2E8F0; }
      .quad-dot { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
      .quad-lbl { position: absolute; font-size: 9px; color: #6B7A8D; font-weight: 700; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
      ${extraCss || ''}
    </style></head><body>${innerHtml}
    <div class="foot">© ${new Date().getFullYear()} Cloud Inventory · Confidential and proprietary · Prepared for the intended recipient</div>
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
      <img src="${window.location.origin}/ci-logo.png" onerror="this.style.display='none'"/>
      <div class="ht">${headTag}</div>
    </div>
    <h1>${deEsc(m.title)}</h1>
    <div class="sub">${deEsc(m.company || '')}${m.target_close_date ? ' · Target close: ' + deDate(m.target_close_date, {month:'long',day:'numeric',year:'numeric'}) : ''}</div>
    ${customerPurpose}
    <div class="meta-line"><strong>Progress:</strong> ${done} of ${ms.length} complete (${pct}%)</div>
    <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%;"></div></div>
    ${rowsHtml || '<p style="font-size:13px;color:#6B7A8D;">No milestones yet.</p>'}`;
  dePrintWindow(m.title, html);
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
    const c = (typeof STAKE_ROLES !== 'undefined' && STAKE_ROLES[s.role]) ? STAKE_ROLES[s.role].color : '#64748B';
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
  const v = getVals(), r = calcROI(v);
  const M = n => (n===null||n===undefined||isNaN(n)) ? '—' : (typeof moneyFull==='function' ? moneyFull(n) : '$' + Math.round(n).toLocaleString());
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
      formula:'incremental carrying estimate after turns overlap',
      plugged:`max(0, ${M(carryBase)} × ${PC(v.mCarrying)} − ${M(r.turnsSav)})`,
      value: r.carrySav },
    { name:'Inventory turns — annual carrying savings',
      desc:'Annual carrying-cost savings from capital freed by improving inventory turns toward the benchmark.',
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
async function roiMethodologyPDF() {
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

  const rampNote = `Year-1 benefit is ramp-adjusted (${Math.round((v.ramp1 ?? 0.4)*100)}% / ${Math.round((v.ramp2 ?? 0.75)*100)}% / ${Math.round((v.ramp3 ?? 1)*100)}% over the first three periods), so it is lower than the full annual benefit.`;

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
      <li><strong>Inventory-carrying overlap control.</strong> Direct carrying reduction and turns-based carrying savings are not added together; ${M(r.overlapAdj)} of overlap was removed.</li>
      <li><strong>Ramp-up applied.</strong> ${esc(rampNote)}</li>
      <li><strong>Prospect-provided figures</strong> are used wherever supplied; industry benchmarks fill only what was not provided.</li>
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
    .intro{font-size:12px;color:#64748B;line-height:1.6;margin-bottom:16px;}
    table.kv td:first-child{color:#64748B;width:55%;}
    table.kv td:last-child{font-weight:600;text-align:right;}
    .f{font-family:'Courier New',monospace;font-size:10px;color:#64748B;}
    .r{text-align:right;}
    .ld{font-size:10px;color:#6B7A8D;font-weight:400;margin-top:2px;}
    .new{background:#C24A1E;color:#fff;font-size:8px;font-weight:700;padding:1px 5px;border-radius:8px;}
    tr.np td{color:#6B7A8D;}
    .np-cell{color:#C24A1E;font-weight:600;}
    tfoot td{border-top:2px solid #1E2931;font-size:13px;padding-top:8px;}
    .notes{margin:4px 0 16px;padding-left:18px;} .notes li{font-size:11px;color:#64748B;margin-bottom:5px;line-height:1.5;}
    .disc{font-size:10px;color:#6B7A8D;font-style:italic;margin-top:14px;line-height:1.5;}
    .prov-banner{background:#E3F2F0;border:1px solid #12786F;border-radius:7px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#0D5A54;line-height:1.5;}
    .prov-check{color:#12786F;font-weight:700;}
    .prov-mark{color:#12786F;font-size:10px;}`;
  dePrintWindow('ROI Methodology — ' + company, htmlWithContext, extraCss);
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
      {text:'99.5% accuracy benchmark',options:{bullet:{indent:8},breakLine:true}},
      {text:`Inventory-carrying overlap removed (${M(r.overlapAdj)})`,options:{bullet:{indent:8},breakLine:true}},
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
  if (!company || company === 'Prospect') {
    if (typeof showToast==='function') showToast('Select a customer and save the scenario first, then Share & track.');
    return;
  }

  /* Ensure scenarios are loaded before resolving (the rep may be on Exec View
     without the Saved tab ever loading the list). */
  if ((typeof savedScenarios === 'undefined' || !savedScenarios.length) && typeof fetchScenarios === 'function') {
    try { await fetchScenarios(); } catch(e) {}
  }

  const resolve = () => (typeof savedScenarios !== 'undefined')
    ? savedScenarios.find(s => s.isCurrent && (s.company||'').trim().toLowerCase() === company.toLowerCase()
        && (s.name||'').trim().toLowerCase() === name.toLowerCase())
    : null;

  let scenario = resolve();

  if (!scenario) {
    if (!confirm('This business case needs to be saved before it can be shared. Save it now?')) {
      if (typeof showToast==='function') showToast('Not shared — save the scenario first.');
      return;
    }
    if (typeof saveScenario === 'function') {
      await saveScenario();
      await new Promise(r => setTimeout(r, 150));   // let the version dialog / fetch settle
      if (typeof fetchScenarios === 'function') { try { await fetchScenarios(); } catch(e){} }
      scenario = resolve();
    }
    if (!scenario) {
      if (typeof showToast==='function') showToast('Save the scenario (check the Saved tab), then click Share & track again.');
      return;
    }
  }

  try {
    if (typeof showToast==='function') showToast('Creating share link…');
    const resp = await apiFetch('/api/business-case-shares', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: scenario.id, company, title: name || 'ROI Business Case' })
    });
    if (!resp || !resp.ok) {
      const err = resp ? await resp.json().catch(()=>({})) : {};
      if (typeof showToast==='function') showToast('Could not create share link: ' + (err.error || ('HTTP ' + (resp ? resp.status : 'no response'))));
      return;
    }
    const data = await resp.json();
    if (!data || !data.shareUrl) {
      if (typeof showToast==='function') showToast('Share link created but no URL was returned — check APP_URL configuration.');
      return;
    }
    showBusinessCaseShareModal(data.shareUrl, company);
    if (typeof trackEvent === 'function') trackEvent('business_case_shared', { company });
  } catch (e) {
    console.error('shareBusinessCase error:', e && e.message);
    if (typeof showToast==='function') showToast('Could not create share link — ' + (e && e.message ? e.message : 'check your connection.'));
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

/* ═══════════════════════════════════════════════════════════════════
   Champion enablement pack
   A concise internal deck the champion takes to their own committee,
   including practical answers to financial, operational, and IT questions.
   ═══════════════════════════════════════════════════════════════════ */

async function buildChampionPack() {
  if (!(await deChk('library'))) return;
  const btn = document.getElementById('championPackBtn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Building pack…'; }

  try {
    const v = (typeof getVals === 'function') ? getVals() : {};
    const r = (typeof calcROI === 'function') ? calcROI(v) : {};
    const company = (v.company && v.company !== 'Prospect') ? v.company : 'Your Prospect';
    const ind = (typeof IND !== 'undefined' && IND[v.industry]) ? IND[v.industry].label : 'your industry';

    const pptx = new pptxgen();
    pptx.defineLayout({ name:'CI', width:PPT.W, height:PPT.H }); pptx.layout='CI';
    pptx.title = 'Internal Business Case — ' + company;

    /* ── Slide 1: The problem statement (in their words) ── */
    const s1 = pptx.addSlide(); s1.background = { color: PPT.NAVY };
    pptConfidentialFooter(s1);
    s1.addImage({path:PPT.LOGO, x:0.4, y:0.25, w:1.0, h:1.0*349/1000, transparency:0});
    s1.addText('The case for Cloud Inventory', {
      x:0.5, y:1.0, w:9.0, h:0.5, fontSize:28, bold:true, color:PPT.WHITE, fontFace:PPT.FONT
    });
    s1.addText(company + ' — internal business case', {
      x:0.5, y:1.55, w:9.0, h:0.3, fontSize:13, color:'B5BDC1', fontFace:PPT.FONT
    });
    /* Problem statement */
    const problems = [
      v.annualWriteOff > 0 ? `${fmtMoney(v.annualWriteOff)}/yr in inventory write-offs` : null,
      v.otifBaseline > 0 ? `${v.otifBaseline}% OTIF — ${v.otifTarget ? 'target ' + v.otifTarget + '%' : 'below target'}` : null,
      v.expediteSpendYr > 0 ? `${fmtMoney(v.expediteSpendYr)}/yr in expedite spend` : null,
      v.downtimeEventsYr > 0 ? `${v.downtimeEventsYr} downtime events/year` : null,
    ].filter(Boolean).slice(0,3);
    if (problems.length) {
      s1.addText('Current situation:', {x:0.5, y:2.3, w:9, h:0.3, fontSize:12, bold:true, color:PPT.WHITE, fontFace:PPT.FONT});
      problems.forEach((p,i) => {
        s1.addText('• ' + p, {x:0.7, y:2.7 + i*0.35, w:8.6, h:0.3, fontSize:11.5, color:'DDE2E5', fontFace:PPT.FONT});
      });
    }
    s1.addText('Prepared by your Cloud Inventory rep for internal use', {
      x:0.5, y:PPT.H - 0.35, w:9, h:0.25, fontSize:8, color:'69747A', fontFace:PPT.FONT
    });

    /* ── Slide 2: The financial case ── */
    const s2 = pptx.addSlide(); s2.background = { color: PPT.GRAY_BG };
    pptChrome(s2, 2);
    pptTitle(s2, 'The financial case');
    const consR = calcROI({...v, mLabor:v.mLabor*0.7, mShrinkage:v.mShrinkage*0.7, mCarrying:v.mCarrying*0.7, mOtif:v.mOtif*0.7, mIt:v.mIt*0.7});
    const metrics = [
      ['Conservative contract benefit', fmtMoney(consR.totalContractBenefit)],
      ['Base contract benefit', fmtMoney(r.totalContractBenefit)],
      [`Total ${r.contractMonths}-month ROI`, fmtPct(r.totalContractRoi)],
      ['Payback from signing', r.contractPayback ? r.contractPayback.toFixed(1) + ' months' : 'Not in term'],
      ['Contract NPV', fmtMoney(r.totalContractNpv)],
      ['Total contract investment', fmtMoney(r.totalContractInvestment)],
    ];
    s2.addTable(
      [
        [{text:'Metric',options:{bold:true,color:PPT.WHITE,fill:{color:PPT.NAVY},fontSize:10}},
         {text:'Value',options:{bold:true,color:PPT.WHITE,fill:{color:PPT.NAVY},fontSize:10}}],
        ...metrics.map(([k,v2]) => [{text:k,options:{fontSize:10,color:PPT.DARK_TXT}},{text:v2,options:{fontSize:10,bold:true,color:PPT.CYAN}}])
      ],
      {x:0.5, y:0.9, w:9, colW:[4.5,4.5], border:{pt:0.5,color:PPT.GRAY_LT}, autoPage:false}
    );
    s2.addText('Conservative case scales all recovery assumptions to 70%. Investment cost is fixed.',
      {x:0.5, y:PPT.H-0.45, w:9, h:0.2, fontSize:8, color:PPT.GRAY_TXT, italic:true, fontFace:PPT.FONT});

    const discoveryCount = typeof discoveryAnswers !== 'undefined'
      ? Object.keys(discoveryAnswers).filter(k => !k.endsWith('_by') && discoveryAnswers[k]).length
      : 0;
    const conservativeOutcome = consR.totalContractRoi > 0
      ? `The conservative case remains positive at ${fmtPct(consR.totalContractRoi)} total-contract ROI.`
      : 'The conservative case identifies the assumptions that must be validated before approval.';
    const paybackText = r.contractPayback
      ? `${r.contractPayback.toFixed(1)} months from signing`
      : 'not achieved within the modeled contract term';

    function addChampionFaqSlide(title, number, faqs) {
      const slide = pptx.addSlide(); slide.background = { color: PPT.GRAY_BG };
      pptChrome(slide, number);
      pptTitle(slide, title);
      let yPos = 0.82;
      faqs.forEach(([q, a]) => {
        slide.addText(q, {x:0.5, y:yPos, w:9, h:0.22, fontSize:9.5, bold:true, color:PPT.NAVY, fontFace:PPT.FONT, margin:0});
        slide.addText(a, {x:0.7, y:yPos+0.23, w:8.6, h:0.34, fontSize:8.6, color:PPT.GRAY_TXT, fontFace:PPT.FONT, margin:0, breakLine:false, fit:'shrink'});
        yPos += 0.69;
      });
    }

    /* ── Slides 3–4: champion objection handling ── */
    const financialFaqs = [
      ['Are these numbers credible?',
       discoveryCount > 0 ? `${discoveryCount} discovery responses inform the case. Inputs should still be confirmed by the accountable operational and finance owners before approval.` : 'The model separates company inputs, calculations, and assumptions. The accountable operational and finance owners should validate the material inputs before approval.'],
      ['How conservative is the business case?',
       `The downside case uses 70% of the base recovery assumptions while holding investment fixed. ${conservativeOutcome}`],
      ['Are benefits being counted twice?',
       'The model reports benefits by driver and removes overlap where inventory carrying-cost and inventory-turn improvements represent the same underlying value.'],
      ['What does delaying the decision cost?',
       r.annualBenefit > 0 ? `The current model indicates approximately ${fmtMoney(r.annualBenefit/12)} of recoverable value per month. Delay should be weighed against that continuing cost, not treated as a zero-cost option.` : 'Current operating losses and avoidable work continue during delay. Confirm the monthly cost of inaction before deciding that waiting is the lower-risk option.'],
      ['When should we expect payback?',
       `Modeled payback is ${paybackText}, including an estimated ${v.implMonths || 3}-month implementation period and phased value ramp.`],
      ['What if the expected value is not realized?',
       'Use agreed baseline measures, owners, and checkpoints in the Joint Project Plan. If early indicators lag, address adoption, process, data, or scope issues before the gap compounds.']
    ];
    addChampionFaqSlide('Questions your finance and executive colleagues will ask', 3, financialFaqs);

    const deliveryFaqs = [
      ['Why not use our ERP or current tools?',
       'The ERP remains the system of record. Cloud Inventory provides the frontline execution, mobile workflows, and transaction accuracy needed to keep that record current across warehouses and field locations.'],
      ['How disruptive will implementation be?',
       'Implementation should be phased around priority workflows, integrations, and user groups. The Joint Project Plan makes dependencies, owners, validation steps, and readiness decisions visible before rollout.'],
      ['What will IT need to support?',
       'IT should validate architecture, identity, integration, security, data ownership, and support responsibilities. The Solution Fit handoff captures known requirements and unresolved items for technical review.'],
      ['How do we address security and governance?',
       'Complete the normal security, privacy, access-control, data-retention, and vendor-risk reviews. Record evidence and approvals in the Joint Project Plan rather than treating security as an informal assumption.'],
      ['Will frontline teams adopt it?',
       'Adoption depends on workflow fit, usability, leadership sponsorship, training, and measurable accountability. Pilot the highest-value workflows and use real user feedback before scaling.'],
      ['How will we prove value after go-live?',
       'Agree on baselines and targets for the selected drivers, assign a business owner to each measure, and review actual results at defined checkpoints against the approved business case.']
    ];
    addChampionFaqSlide('Questions your operations and IT colleagues will ask', 4, deliveryFaqs);

    const safe = company.replace(/[^a-zA-Z0-9 \-_]/g,'').trim().replace(/\s+/g,'-') || 'Champion';
    await pptx.writeFile({ fileName: `Champion-Pack-${safe}-${new Date().toISOString().split('T')[0]}.pptx` });
    if (typeof showToast === 'function') showToast('Champion pack downloaded!');
    if (typeof trackEvent === 'function') trackEvent('champion_pack_exported', { company });
  } catch(err) {
    console.error('Champion pack error:', err);
    if (typeof showToast === 'function') showToast('Export failed: ' + (err.message || 'unknown error'));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig || 'Champion pack'; }
  }
}
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

/* ═══════════════════════════════════════════════════════════════════
   COMPETITIVE BATTLECARD EXPORTS
   exportCompPDF()  — branded print window → Save as PDF
   exportCompDocx() — .docx download via docx CDN browser bundle
   ═══════════════════════════════════════════════════════════════════ */

function _getCompData() {
  const key = (document.getElementById('compSelect') || {}).value || '';
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
function exportCompPDF() {
  const d = _getCompData();
  if (!d) { showToast('Select a competitor first.'); return; }
  const { c, company, repName, talk } = d;
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const date = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  const html = `
    <div class="doc-head">
      <img src="${window.location.origin}/ci-logo.png" onerror="this.style.display='none'"/>
      <div class="ht">Competitive Battlecard · ${esc(company)}</div>
    </div>
    <h1>Competitive displacement: ${esc(c.name)}</h1>
    <div class="sub">${esc(company)}${repName ? ' · Prepared by ' + esc(repName) : ''} · ${date}</div>

    <h2>Current solution overview</h2>
    <table class="kv"><tbody>
      <tr><td><strong>Typical cost</strong></td><td>${esc(c.cost)}</td></tr>
      <tr><td><strong>Time to value</strong></td><td>${esc(c.time)}</td></tr>
      <tr><td><strong>Ongoing maintenance</strong></td><td>${esc(c.maint)}</td></tr>
    </tbody></table>

    <div class="two-col-grid">
      <div class="col-card pain-col">
        <div class="col-head pain-head">Pain points with ${esc(c.name)}</div>
        ${c.pain.map(p => `<div class="comp-row"><span class="x-dot">✕</span><span>${esc(p)}</span></div>`).join('')}
      </div>
      <div class="col-card adv-col">
        <div class="col-head adv-head">Cloud Inventory advantages</div>
        ${c.adv.map(a => `<div class="comp-row"><span class="chk-dot">✓</span><span>${esc(a)}</span></div>`).join('')}
      </div>
    </div>

    ${talk ? `<h2>Talk track</h2>
    <div class="talk-box">${esc(talk)}</div>` : ''}`;

  const extraCss = `
    .kv td { padding: 7px 10px; font-size: 13px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
    .kv td:first-child { font-weight: 600; color: #1E2931; width: 38%; }
    .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0 20px; }
    .col-card { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    .col-head { font-size: 12px; font-weight: 700; padding: 9px 14px; text-transform: uppercase; letter-spacing: .05em; }
    .pain-head { background: #FEF2F2; color: #991B1B; border-bottom: 1px solid #FECACA; }
    .adv-head  { background: #F0FDF4; color: #166534; border-bottom: 1px solid #BBF7D0; }
    .comp-row  { display: flex; align-items: flex-start; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #F8FAFC; font-size: 12.5px; color: #1E2931; }
    .comp-row:last-child { border-bottom: none; }
    .x-dot   { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .chk-dot { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: #DCFCE7; color: #16A34A; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .talk-box { font-size: 13px; color: #1E2931; line-height: 1.7; background: #F0F9FF; border-left: 3px solid #00A9CC; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-top: 8px; font-style: italic; }
    @media print { .two-col-grid { break-inside: avoid; } }
  `;

  dePrintWindow(`Competitive Battlecard – ${c.name}`, html, extraCss);
  if (typeof trackEvent === 'function') trackEvent('comp_pdf_exported', { competitor: d.key, company: d.company });
}

/* ── Word Export (.docx): server-side via /api/export/battlecard-docx ──
   Sends battlecard data to the server; server uses the docx npm package
   (real .docx format) and streams the file back. No CDN, no popup.    */
async function exportCompDocx() {
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
      mep_rfgen:  '“RF-SMART and RFgen are solid scanning tools, but they’re built around one ERP. MEP connects to any ERP, handles offline execution natively, and lets your team change workflows without a dev cycle.”',
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
        repName: repName
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
    a.download = 'Battlecard-' + safe + '-' + new Date().toISOString().split('T')[0] + '.docx';
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
