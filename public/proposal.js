/* Executive proposal workspace — editable, branded, and exportable. */
(function () {
  const KEY = 'cloudInventory.executiveProposal.';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' })[c]);
  const iso = date => date.toISOString().slice(0, 10);
  const addDays = days => { const d = new Date(); d.setDate(d.getDate() + days); return iso(d); };
  const money = value => typeof fmtFull === 'function' ? fmtFull(value || 0) : ('$' + Number(value || 0).toLocaleString());
  const label = value => ({ cip: 'Cloud Inventory Platform', mep: 'Mobile Enterprise Platform (MEP)', cpp: 'Cloud Inventory Planning' })[String(value || '').toLowerCase()] || 'Cloud Inventory';

  function defaults() {
    const v = typeof getVals === 'function' ? getVals() : {};
    const r = typeof calcROI === 'function' ? calcROI(v) : {};
    const library = typeof THREE_WHYS_LIBRARY !== 'undefined' ? (THREE_WHYS_LIBRARY[v.industry] || THREE_WHYS_LIBRARY.default || {}) : {};
    const why = typeof threeWhys !== 'undefined' ? threeWhys : {};
    const company = v.company || 'Prospect';
    const benefit = money(r.totalContractBenefit || 0);
    const payback = r.contractPayback == null ? 'not achieved during the proposed term' : (Number(r.contractPayback).toFixed(1) + ' months');
    const solution = label(v.solution);
    return {
      company, preparedBy: v.rep || 'Cloud Inventory', proposalDate: iso(new Date()), validThrough: addDays(30),
      title: company + ' inventory execution proposal', solution, contractTerm: (v.contractMonths || 36) + ' months',
      situation: 'Today, inventory teams are balancing accuracy, service levels, and labor capacity across disconnected workflows. This proposal is designed to create a practical path to measurable, governed execution improvement.',
      recommendation: 'Deploy ' + solution + ' to connect inventory workflows, give frontline teams reliable mobile execution, and provide leaders a measurable operating model.',
      outcome: 'Over the proposed ' + (v.contractMonths || 36) + '-month term, the modeled business case generates ' + benefit + ' in total economic benefit against ' + money(r.totalContractInvestment || 0) + ' in total investment, producing ' + money(r.totalContractNetBenefit || 0) + ' in net economic benefit, a total contract ROI of ' + (r.totalContractRoi == null ? 'N/A' : Math.round(r.totalContractRoi) + '%') + ', and estimated payback of ' + payback + '.',
      whyAct: why.act || library.act || 'Manual inventory processes create avoidable cost, delay, and risk that compounds as operations scale.',
      whyCloud: why.ci || library.ci || 'Cloud Inventory connects people, systems, and inventory workflows in one governed execution layer.',
      whyNow: why.now || library.now || 'A focused evaluation now turns the value hypothesis into a validated plan with accountable outcomes.',
      scope: ['Mobile inventory execution for priority workflows', 'Integration planning and governed data synchronization', 'Role-based enablement, reporting, and adoption support'],
      investment: [
        { label: 'Annual platform subscription', value: money(v.invest) },
        { label: 'Implementation services', value: money(v.psvc) },
        { label: 'Training and enablement', value: money(v.train) }
      ].filter(row => row.value !== '$0'),
      timeline: 'A focused implementation plan is typically structured over ' + (v.implMonths || 3) + ' months, with scope confirmation, configuration, validation, and launch readiness.',
      success: [
        { metric: 'Total contract economic benefit', target: benefit },
        { metric: 'Total contract ROI', target: r.totalContractRoi == null ? 'N/A' : Math.round(r.totalContractRoi) + '%' },
        { metric: 'Payback period', target: payback },
        { metric: 'Inventory accuracy', target: v.currentAccuracy ? Math.min(99.9, Number(v.currentAccuracy) + 2).toFixed(1) + '% or better' : 'Baseline and improve during discovery' },
        { metric: 'Service / OTIF performance', target: v.otifTarget ? Number(v.otifTarget).toFixed(1) + '% target' : 'Confirm baseline and target together' }
      ],
      nextSteps: ['Confirm priority workflows and success measures', 'Validate scope, stakeholders, and integration requirements', 'Align commercial terms and launch a joint project plan']
    };
  }

  function storageKey() { const v = typeof getVals === 'function' ? getVals() : {}; return KEY + (v.company || 'prospect').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function getDraft() { try { return window.proposalDraft || JSON.parse(localStorage.getItem(storageKey())) || defaults(); } catch (_) { return defaults(); } }
  function saveDraft() { try { localStorage.setItem(storageKey(), JSON.stringify(window.proposalDraft)); } catch (_) {} }
  function setField(key, value) { window.proposalDraft[key] = value; saveDraft(); render(); }
  function setArray(key, index, value, prop) { window.proposalDraft[key][index][prop] = value; saveDraft(); }
  function setPrimitive(key, index, value) { window.proposalDraft[key][index] = value; saveDraft(); }
  function addRow(key, row) { window.proposalDraft[key].push(row); saveDraft(); render(); }
  function removeRow(key, index) { window.proposalDraft[key].splice(index, 1); saveDraft(); render(); }

  function rows(key, fields, placeholder) {
    const d = getDraft();
    return `<div class="proposal-repeat">${d[key].map((row, i) => `<div class="proposal-repeat-row">${fields.map(f => f.key === '' ? `<input aria-label="${esc(f.label)}" value="${esc(row)}" placeholder="${esc(f.label)}" oninput="proposalSetPrimitive('${key}',${i},this.value)">` : `<input aria-label="${esc(f.label)}" value="${esc(row[f.key])}" placeholder="${esc(f.label)}" oninput="proposalSetArray('${key}',${i},this.value,'${f.key}')">`).join('')}<button class="proposal-icon-button" title="Remove" onclick="proposalRemoveRow('${key}',${i})">×</button></div>`).join('')}<button class="btn btn-ghost btn-sm" onclick="proposalAddRow('${key}',${JSON.stringify(placeholder).replace(/"/g, '&quot;')})">+ Add item</button></div>`;
  }

  function render() {
    const host = document.getElementById('proposalEditorWrap'); if (!host) return;
    const d = getDraft(); window.proposalDraft = d;
    host.innerHTML = `<div class="proposal-page-header"><div><div class="page-title">Executive proposal</div><div class="page-subtitle">A customer-ready proposal built from the calculator and executive narrative. Edits save locally in this browser.</div></div><div class="btn-row"><button class="btn btn-ghost" onclick="proposalReset()">Reset defaults</button><button class="btn btn-ghost" onclick="proposalEnhance()" id="proposalEnhanceBtn">✨ AI enhance case</button><button class="btn btn-primary" onclick="proposalExportWord()">Export Word</button><button class="btn btn-cta" onclick="proposalPrint()">Download PDF</button></div></div>
      <div class="proposal-workspace"><section class="proposal-editor card"><div class="proposal-editor-title">Edit proposal <span>Defaults are drawn from this scenario</span></div>
      <div class="proposal-field-grid"><label>Customer<input value="${esc(d.company)}" oninput="proposalSet('company',this.value)"></label><label>Prepared by<input value="${esc(d.preparedBy)}" oninput="proposalSet('preparedBy',this.value)"></label><label>Proposal date<input type="date" value="${esc(d.proposalDate)}" oninput="proposalSet('proposalDate',this.value)"></label><label>Valid through<input type="date" value="${esc(d.validThrough)}" oninput="proposalSet('validThrough',this.value)"></label><label>Solution<input value="${esc(d.solution)}" oninput="proposalSet('solution',this.value)"></label><label>Contract term<input value="${esc(d.contractTerm)}" oninput="proposalSet('contractTerm',this.value)"></label></div>
      <label class="proposal-field">Proposal title<input value="${esc(d.title)}" oninput="proposalSet('title',this.value)"></label>
      ${[['situation','Customer situation'],['recommendation','Our recommendation'],['outcome','Expected outcome'],['whyAct','Why act'],['whyCloud','Why Cloud Inventory'],['whyNow','Why now'],['timeline','Delivery timeline']].map(([key,title])=>`<label class="proposal-field">${title}<textarea rows="3" oninput="proposalSet('${key}',this.value)">${esc(d[key])}</textarea></label>`).join('')}
      <div class="proposal-editor-section"><h3>Solution scope</h3>${rows('scope',[{key:'',label:'Scope item'}], '')}</div>
      <div class="proposal-editor-section"><h3>Commercial investment</h3>${rows('investment',[{key:'label',label:'Line item'},{key:'value',label:'Amount / detail'}], {label:'',value:''})}</div>
      <div class="proposal-editor-section"><h3>Success measures</h3>${rows('success',[{key:'metric',label:'Measure'},{key:'target',label:'Target'}], {metric:'',target:''})}</div>
      <div class="proposal-editor-section"><h3>Next steps</h3>${rows('nextSteps',[{key:'',label:'Next step'}], '')}</div></section>
      <aside class="proposal-preview-wrap"><div class="proposal-preview-label">Customer-facing preview</div><div class="proposal-document">${documentHtml(d)}</div></aside></div>`;
  }

  function bulletList(values) { return `<ul>${values.map(v => `<li>${esc(typeof v === 'string' ? v : v[''])}</li>`).join('')}</ul>`; }
  function documentHtml(d) { return `<div class="proposal-cover"><img src="ci-logo-full-color.png" alt="Cloud Inventory"><div class="proposal-kicker">Commercial proposal</div><h1>${esc(d.title)}</h1><p class="proposal-cover-company">Prepared for ${esc(d.company)}</p><div class="proposal-cover-meta"><span>${esc(d.solution)}</span><span>${esc(d.contractTerm)}</span><span>Valid through ${esc(d.validThrough)}</span></div></div><section><h2>Executive summary</h2><h3>Your opportunity</h3><p>${esc(d.situation)}</p><h3>Our recommendation</h3><p>${esc(d.recommendation)}</p><div class="proposal-outcome"><strong>Expected outcome</strong><p>${esc(d.outcome)}</p></div></section><section><h2>The value case</h2><div class="proposal-why"><strong>Why act</strong><p>${esc(d.whyAct)}</p></div><div class="proposal-why"><strong>Why Cloud Inventory</strong><p>${esc(d.whyCloud)}</p></div><div class="proposal-why"><strong>Why now</strong><p>${esc(d.whyNow)}</p></div></section><section><h2>Solution and investment</h2><h3>In scope</h3>${bulletList(d.scope)}<h3>Investment</h3><table>${d.investment.map(row=>`<tr><td>${esc(row.label)}</td><td>${esc(row.value)}</td></tr>`).join('')}</table><h3>Delivery approach</h3><p>${esc(d.timeline)}</p></section><section><h2>Success and next steps</h2><table>${d.success.map(row=>`<tr><td>${esc(row.metric)}</td><td>${esc(row.target)}</td></tr>`).join('')}</table><h3>Recommended next steps</h3>${bulletList(d.nextSteps)}<div class="proposal-footer">© ${new Date().getFullYear()} Cloud Inventory · Confidential and proprietary · Prepared for ${esc(d.company)}</div></section></div>`; }

  async function enhance() {
    const b = document.getElementById('proposalEnhanceBtn'); const original = b?.textContent;
    if (b) { b.disabled = true; b.textContent = 'Enhancing…'; }
    try {
      const d = getDraft();
      const response = await apiFetch('/api/enhance', { method:'POST', body:JSON.stringify({ max_tokens:900, messages:[{role:'user',content:`Strengthen this Cloud Inventory proposal for ${d.company}. Return JSON only with keys situation, recommendation, outcome, whyAct, whyCloud, whyNow. Make it specific, credible, concise, and customer-facing. Do not invent metrics. Current content: ${JSON.stringify({situation:d.situation,recommendation:d.recommendation,outcome:d.outcome,whyAct:d.whyAct,whyCloud:d.whyCloud,whyNow:d.whyNow})}`}] }) });
      const body = await response.json(); const text = body.text || body.result || (body.content || []).filter(x=>x.type==='text').map(x=>x.text).join('') || '';
      const parsed = typeof text === 'string' ? JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')) : text;
      ['situation','recommendation','outcome','whyAct','whyCloud','whyNow'].forEach(key => { if (parsed[key]) d[key] = String(parsed[key]); });
      window.proposalDraft = d; saveDraft(); render(); if (typeof showToast === 'function') showToast('Proposal narrative enhanced. Review and edit before sharing.');
    } catch (err) { console.error(err); if (typeof showToast === 'function') showToast('AI enhancement could not be completed. Your proposal is unchanged.'); }
    finally { if (b) { b.disabled = false; b.textContent = original || '✨ AI enhance case'; } }
  }
  function print() { const d = getDraft(); const w = window.open('', '_blank'); if (!w) return showToast?.('Please allow pop-ups to create the PDF.'); w.document.write(`<!doctype html><html><head><title>${esc(d.company)} Proposal</title><style>${printCss()}</style></head><body>${documentHtml(d)}</body></html>`); w.document.close(); setTimeout(() => w.print(), 250); }
  function printCss() { return `@page{size:letter;margin:.55in}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1E2931;line-height:1.45;margin:0}.proposal-document{max-width:7.4in;margin:auto}.proposal-cover{min-height:3.55in;background:#1E2931;color:#fff;padding:.48in;margin:-.55in -.55in .3in}.proposal-cover img{width:160px;max-height:42px;object-fit:contain;object-position:left}.proposal-kicker{color:#55D4EA;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:bold;margin-top:.65in}.proposal-cover h1{font-size:29px;line-height:1.1;margin:.12in 0}.proposal-cover-company{font-size:16px}.proposal-cover-meta{display:flex;gap:16px;font-size:10px;margin-top:.38in;color:#DCE7EA}section{padding:.14in 0;border-bottom:1px solid #DCE4E8}h2{font-size:20px;color:#007B94;margin:.15in 0}h3{font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:.15in 0 .04in}p{font-size:11px;margin:.04in 0 .12in}li{font-size:11px;margin:.06in 0}.proposal-outcome{background:#E5F7FA;border-left:4px solid #00A9CC;padding:.1in .16in;margin:.14in 0}.proposal-why{margin:.1in 0}.proposal-why strong{color:#007B94;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px;margin:.08in 0}td{padding:.08in;border-bottom:1px solid #DCE4E8}td:last-child{font-weight:bold;text-align:right}.proposal-footer{text-align:center;color:#64748B;font-size:8px;margin-top:.25in}@media print{section{break-inside:avoid}.proposal-cover{break-after:page}}`; }
  async function word() { try { const res = await apiFetch('/api/export/proposal-docx', { method:'POST', body:JSON.stringify(getDraft()) }); if (!res || !res.ok) throw new Error('Export failed'); const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Executive-Proposal-' + getDraft().company.replace(/[^a-z0-9]+/gi,'-') + '.docx'; a.click(); URL.revokeObjectURL(a.href); } catch (_) { showToast?.('Word export could not be completed. Please try again.'); } }
  window.proposalHasDraft = () => { try { return !!(window.proposalDraft || localStorage.getItem(storageKey())); } catch (_) { return !!window.proposalDraft; } };
  window.openProposal = () => { switchTab('proposal'); render(); };
  window.proposalSet = setField; window.proposalSetArray = setArray; window.proposalSetPrimitive = setPrimitive; window.proposalAddRow = (key,row) => addRow(key, row); window.proposalRemoveRow = removeRow;
  window.proposalReset = () => { window.proposalDraft = defaults(); saveDraft(); render(); };
  window.proposalEnhance = enhance; window.proposalPrint = print; window.proposalExportWord = word;
}());
