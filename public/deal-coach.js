/* Deal Coach — turns the existing value case into an actionable close plan. */
(function(){
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roles = { champion:'Champion', economic_buyer:'Economic buyer', technical_buyer:'Technical buyer', influencer:'Influencer', blocker:'Blocker', end_user:'End user' };
  function values(){ return typeof getVals === 'function' ? getVals() : {}; }
  function contractMonths(){ const term=String(window.proposalDraft?.contractTerm || '36 months'); const match=term.match(/(\d+)/); return Math.max(12, Math.min(60, match ? Number(match[1]) : 36)); }
  function contractEconomics(v, r){ const months=contractMonths(), yearly=Math.ceil(months/12), annualRate=Number(v.discRate||0); const monthlyRate=Math.pow(1+annualRate,1/12)-1; let benefit=0, pvNet=-(v.otc||0), cost=v.otc||0, cumulative=-(v.otc||0), payback=null;
    for(let m=1;m<=months;m++){ const subscription=(m-1)%12===0?(v.invest||0):0; const monthlyBenefit=r.monthlyProfile?.[m-1]?.benefit || 0; benefit+=monthlyBenefit; cost+=subscription; cumulative+=monthlyBenefit-subscription; if(cumulative>=0&&payback===null)payback=m; pvNet+=(monthlyBenefit-subscription)/Math.pow(1+monthlyRate,m); }
    const net=benefit-cost; return {months,years:yearly,benefit,cost,net,npv:pvNet,roi:cost>0?net/cost*100:null,payback,paybackWithinTerm:payback!==null&&payback<=months}; }
  function stakeholderState(){ const a = typeof _stakeholders !== 'undefined' && Array.isArray(_stakeholders) ? _stakeholders : []; const has = r => a.some(s=>s.role===r); return { all:a, champion:has('champion'), econ:has('economic_buyer'), tech:has('technical_buyer'), blocker:a.filter(s=>s.role==='blocker').length }; }
  function plan(){ const v=values(), maps=typeof _maps !== 'undefined' && Array.isArray(_maps) ? _maps : []; const p=maps.find(x=>x.company===v.company); return p || null; }
  function proposalReady(){ return typeof window.proposalHasDraft === 'function' ? window.proposalHasDraft() : !!window.proposalDraft; }
  async function refreshContext(v){
    if (typeof apiFetch !== 'function') return;
    const jobs = [];
    jobs.push(apiFetch('/api/maps?all=true').then(async resp => { if (resp && resp.ok && typeof _maps !== 'undefined') _maps = await resp.json(); }).catch(()=>{}));
    const company = v.company && v.company !== 'Prospect' ? v.company : '';
    if (typeof _stakeholders !== 'undefined') _stakeholders = [];
    if (company) {
      const user = window.ciAuth ? window.ciAuth.getUser() : {};
      let url = user.role === 'admin' ? '/api/stakeholders?all=true' : '/api/stakeholders';
      url += (url.includes('?') ? '&' : '?') + 'company=' + encodeURIComponent(company);
      jobs.push(apiFetch(url).then(async resp => {
        if (resp && resp.ok && typeof _stakeholders !== 'undefined') {
          _stakeholders = await resp.json();
          if (typeof _stakeCompany !== 'undefined') _stakeCompany = company;
        }
      }).catch(()=>{}));
    }
    await Promise.allSettled(jobs);
  }
  function score(){ const v=values(), s=stakeholderState(), p=plan(), d=proposalReady(), r=typeof calcROI==='function'?calcROI(v):{}, economics=contractEconomics(v,r); const items=[
    {ok:!!(v.revenue||v.inventory||v.users),label:'Value model has operational inputs',go:'calc'},
    {ok:economics.cost>0&&economics.net>0&&economics.paybackWithinTerm,label:`${economics.months}-month contract economics are positive with payback in term`,go:'calc'},
    {ok:!!(v.company&&v.company!=='Prospect'),label:'A named customer account is selected',go:'calc'},
    {ok:s.champion,label:'A champion is mapped',go:'stake'}, {ok:s.econ,label:'An economic buyer is mapped',go:'stake'},
    {ok:s.tech,label:'A technical buyer is mapped',go:'stake'}, {ok:!!p,label:'A Joint Project Plan is created',go:'map'},
    {ok:!!d,label:'An executive proposal is prepared',go:'proposal'}
  ]; return {items, pct:Math.round(items.filter(x=>x.ok).length/items.length*100)}; }
  function next(items){ return items.find(x=>!x.ok) || {label:'Validate plan milestones and keep momentum with the buying committee.',go:'map'}; }
  async function render(){ const host=document.getElementById('dealCoachWrap'); if(!host)return; const v=values(); await refreshContext(v); const s=stakeholderState(), q=score(), n=next(q.items), p=plan(); const nextAction=n.go==='proposal'?'openProposal()':`switchTab('${n.go}')`;
    host.innerHTML=`<div class="page-header"><div><div class="page-title">Deal Coach</div><div class="page-subtitle">A practical command center for turning your value case into buyer consensus and a mutual path to close.</div></div><div class="btn-row"><button class="btn btn-ghost" onclick="renderDealCoach()">↻ Refresh</button><button class="btn btn-cta" onclick="coachOpenNext()">Advance next step →</button></div></div>
    <div class="coach-score card"><div><div class="coach-overline">Deal readiness</div><div class="coach-number">${q.pct}%</div><div class="coach-progress"><span style="width:${q.pct}%"></span></div></div><div class="coach-next"><strong>Recommended next action</strong><p>${esc(n.label)}</p><button class="btn btn-primary btn-sm" onclick="${nextAction}">Open workspace</button></div></div>
    <div class="coach-grid"><section class="card"><div class="card-title">Close plan</div><div class="coach-checks">${q.items.map(i=>`<button class="coach-check ${i.ok?'done':''}" onclick="${i.go==='proposal'?'openProposal()':"switchTab('"+i.go+"')"}"><span>${i.ok?'✓':'○'}</span>${esc(i.label)}<b>→</b></button>`).join('')}</div></section>
    <section class="card"><div class="card-title">Buying committee consensus</div><div class="consensus-score"><strong>${s.all.length}</strong><span>stakeholders mapped</span></div><div class="consensus-roles">${['champion','economic_buyer','technical_buyer','influencer','blocker'].map(r=>`<div><span>${s.all.some(x=>x.role===r)?'✓':'○'}</span>${roles[r]}${r==='blocker'&&s.blocker?' ('+s.blocker+')':''}</div>`).join('')}</div><button class="btn btn-ghost btn-sm" onclick="switchTab('stake')">Manage stakeholders →</button></section>
    <section class="card"><div class="card-title">Proposal to close</div><div class="coach-flow"><button class="${v.company&&v.company!=='Prospect'?'done':''}" onclick="switchTab('calc')">1. Value case</button><button class="${proposalReady()?'done':''}" onclick="openProposal()">2. Proposal</button><button class="${s.champion?'done':''}" onclick="switchTab('stake')">3. Champion alignment</button><button class="${p?'done':''}" onclick="switchTab('map')">4. Joint project plan</button><button onclick="switchTab('map')">5. Close & launch</button></div><p class="field-hint">${p ? 'Plan: '+esc(p.title)+' · '+(p.milestones||[]).length+' milestones' : 'Create a Joint Project Plan to coordinate validation, approvals, and launch.'}</p></section>
    <section class="card"><div class="card-title">Champion enablement</div><p class="field-hint" style="margin-bottom:12px;">Give your champion a clear, forwardable case for change and a way to coordinate the evaluation.</p><div class="coach-champion-actions"><button class="btn btn-primary btn-sm" onclick="coachChampionKit()">Create champion kit</button><button class="btn btn-ghost btn-sm" onclick="openProposal()">Open proposal</button><button class="btn btn-ghost btn-sm" onclick="switchTab('map')">Open joint plan</button></div></section>
    <section class="card coach-christie"><div class="card-title"><span class="christie-mark">✦</span> Christie, your AI Deal Coach</div><p class="field-hint">Christie sees the current value case, stakeholder coverage, proposal, and Joint Project Plan. She proposes actions; you remain in control.</p><div class="christie-prompts"><button onclick="askChristie('Assess deal health and identify the single highest-impact next action.')">Assess deal health</button><button onclick="askChristie('Prepare me for my next customer meeting: agenda, questions, and likely objections.')">Prepare meeting</button><button onclick="askChristie('Draft a concise follow-up that advances buyer consensus.')">Draft follow-up</button></div><textarea id="christieQuestion" rows="2" placeholder="Ask Christie about this deal…"></textarea><div class="btn-row"><button class="btn btn-cta btn-sm" id="christieAskBtn" onclick="askChristie()">Ask Christie</button></div><div id="christieResponse" class="christie-response" aria-live="polite"></div></section></div>`;
  }
  function championKit(){ const v=values(), r=typeof calcROI==='function'?calcROI(v):{}, e=contractEconomics(v,r), company=v.company||'your organization'; const money=n=>typeof fmtFull==='function'?fmtFull(n||0):'$0'; const safeCompany=esc(company), safeBenefit=esc(money(e.benefit)), safeCost=esc(money(e.cost)), safeNet=esc(money(e.net)), safeRep=esc(v.rep||'Cloud Inventory'); const body=`<div class="modal-backdrop" id="coachKitModal"><div class="modal" style="max-width:720px"><div class="modal-head"><strong>Champion kit — ${safeCompany}</strong><button class="modal-close" onclick="document.getElementById('coachKitModal').remove()">×</button></div><div class="modal-body"><p class="field-hint">Forwardable customer messaging based on the full ${e.months}-month contract case. Review numbers and wording before sending.</p><label class="proposal-field">Champion email<textarea id="coachKitEmail" rows="10">Subject: A practical way to validate the inventory value case\n\nHi [Name],\n\nThank you for continuing to work through the inventory opportunity with us. Based on the assumptions we have reviewed together, the current ${e.months}-month business case indicates approximately ${safeBenefit} in benefit against ${safeCost} in investment, with an estimated net value of ${safeNet}.\n\nThe next useful step is not to treat these figures as a finished answer, but to validate the priority workflows and success measures with the broader team. We have put the proposal and Joint Project Plan together to make that process straightforward—clear owners, practical checkpoints, and a shared view of what needs to be true for the value to be realised.\n\nWould you be open to reviewing the plan with the operations, technical, and finance stakeholders so we can confirm the assumptions and agree on a sensible path forward?\n\nBest,\n${safeRep}</textarea></label><label class="proposal-field">Internal sponsor brief<textarea id="coachKitBrief" rows="7">${safeCompany} is evaluating Cloud Inventory to improve inventory accuracy, service performance, and frontline execution. Across the current ${e.months}-month contract case, the model shows ${safeBenefit} in benefit, ${safeCost} in investment, and ${safeNet} in net value. The value-engineering objective is to validate the priority workflows and measures with economic, operational, and technical stakeholders, then use the Joint Project Plan to manage the route to a decision and launch.</textarea></label><div class="btn-row"><button class="btn btn-primary" onclick="coachCopy('coachKitEmail')">Copy champion email</button><button class="btn btn-ghost" onclick="coachCopy('coachKitBrief')">Copy sponsor brief</button></div></div></div></div>`; document.body.insertAdjacentHTML('beforeend',body); }
  function copy(id){ const el=document.getElementById(id); el.select(); navigator.clipboard?.writeText(el.value); showToast?.('Copied to clipboard.'); }
  async function ask(question){
    const input=document.getElementById('christieQuestion'), out=document.getElementById('christieResponse'), btn=document.getElementById('christieAskBtn');
    const q=question || input?.value.trim();
    if(!q){ showToast?.('Ask Christie a question first.'); return; }
    if(input) input.value=q;
    if(btn){ btn.disabled=true; btn.textContent='Christie is thinking…'; }
    if(out) out.innerHTML='<span>Reviewing this deal…</span>';
    const v=values();
    await refreshContext(v);
    const s=stakeholderState(), p=plan(), r=typeof calcROI==='function'?calcROI(v):{}, e=contractEconomics(v,r);
    const context={
      company:v.company, dealStage:v.dealStage, solution:v.solution,
      contractEconomics:{termMonths:e.months,totalBenefit:e.benefit,totalInvestment:e.cost,netValue:e.net,contractRoi:e.roi,contractNpv:e.npv,paybackMonths:e.payback,paybackWithinTerm:e.paybackWithinTerm},
      year1:{benefit:r.year1Benefit,roi:r.roi},
      stakeholders:s.all.map(x=>({name:x.name,role:x.role,influence:x.influence,support:x.support,engaged:x.engaged})),
      plan:p?{title:p.title,milestones:(p.milestones||[]).map(x=>({task:x.task||x.title,owner:x.owner,status:x.status,due:x.dueDate||x.due_date}))}:null,
      proposalPrepared:proposalReady(), readiness:score().pct
    };
    const prompt=`You are Christie, a Toronto-based enterprise SaaS value-engineering consultant for Cloud Inventory. Your tone is warm, practical, thoughtful, and direct—like a trusted consultant, never a generic AI assistant. Use restrained Canadian spelling where natural. Answer only from the deal context. Clearly label customer facts/entered assumptions versus your suggested guidance. Do not invent numbers, commitments, dates, or stakeholder facts. Assess commercial health using contractEconomics only; Year 1 is context, not the basis for a healthy/unhealthy recommendation. For emails, write supportive, human value-engineering language that invites joint validation rather than making a hard sell. Be concise. Give: (1) Deal read, (2) recommended action(s), (3) a ready-to-use draft when asked for messaging. Question: ${q}\n\nDeal context:\n${JSON.stringify(context)}`;
    try{
      const res=await apiFetch('/api/enhance',{method:'POST',body:JSON.stringify({max_tokens:900,messages:[{role:'user',content:prompt}]})});
      if(!res||!res.ok) throw new Error('request failed');
      const data=await res.json();
      const answer=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('');
      if(!answer) throw new Error('empty response');
      if(out) out.innerHTML=`<div class="christie-answer">${esc(answer).replace(/\n/g,'<br>')}</div><button class="btn btn-ghost btn-sm" onclick="coachCopyText()">Copy response</button>`;
      window._christieLast=answer;
    }catch(err){
      console.error('Christie:',err);
      if(out) out.innerHTML='<span>Christie could not complete that request. Check the AI connection and try again.</span>';
    }finally{
      if(btn){ btn.disabled=false; btn.textContent='Ask Christie'; }
    }
  }
  window.renderDealCoach=render; window.coachOpenNext=()=>{const n=next(score().items); if(n.go==='proposal')openProposal();else switchTab(n.go)}; window.coachChampionKit=championKit; window.coachCopy=copy; window.askChristie=ask; window.coachCopyText=()=>{navigator.clipboard?.writeText(window._christieLast||'');showToast?.('Copied Christie’s response.');};
}());
