(function(){
  'use strict';
  let model={deals:[],reps:[]}, view='team', selected=null;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>v==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(v);
  const pct=v=>v==null?'—':`${Math.round(v)}%`;
  const roleAllowed=u=>u && (u.role==='admin' || (Array.isArray(u.roleKeys) && u.roleKeys.includes('sales_manager')));
  const pill=(text,kind)=>`<span class="sm-pill sm-${(kind||text).toLowerCase().replace(/[^a-z]+/g,'-')}">${esc(text)}</span>`;

  window.initSalesManagerDashboard=async function(force){
    if(window._authReady) await window._authReady;
    const user=window.ciAuth&&window.ciAuth.getUser();
    const root=$('salesManagerDashboard'); if(!root)return;
    if(!roleAllowed(user)){root.innerHTML='<div class="empty-state"><h3>Sales Manager access required</h3><p>This workspace is restricted to assigned Sales Managers and administrators.</p></div>';return;}
    if(model.deals.length&&!force){render();return;}
    root.innerHTML='<div class="empty-state"><p>Refreshing current deal information…</p></div>';
    const resp=await apiFetch('/api/sales-manager/dashboard');
    if(!resp||!resp.ok){root.innerHTML='<div class="empty-state"><p>Could not load the sales management workspace.</p></div>';return;}
    model=await resp.json(); render();
  };

  function filtered(){
    const q=lower($('smSearch')?.value), rep=$('smRep')?.value||'', stage=$('smStage')?.value||'', risk=$('smRisk')?.value||'', fit=$('smFit')?.value||'', execution=$('smExecution')?.value||'', missing=$('smMissing')?.checked;
    return model.deals.filter(d=>(!q||lower(`${d.company} ${d.name} ${d.rep}`).includes(q))&&(!rep||d.repId===rep)&&(!stage||d.buyingStage===stage)&&(!risk||d.health.level===risk)&&(!fit||d.solutionFit.level===fit)&&(!execution||d.plan.level===execution)&&(!missing||(d.missing.length||d.plan.overdue)));
  }
  function lower(v){return String(v||'').toLowerCase();}
  function uniq(key){return [...new Set(model.deals.map(d=>d[key]).filter(Boolean))].sort();}
  function selectOpts(items,label){return `<option value="">${label}</option>${items.map(x=>`<option>${esc(x)}</option>`).join('')}`;}

  function render(){
    const deals=filtered(), root=$('salesManagerDashboard');
    const atRisk=deals.filter(d=>d.health.level!=='Healthy').length, overdue=deals.reduce((n,d)=>n+d.plan.overdue,0), missing=deals.filter(d=>d.missing.length).length, pipeline=deals.reduce((n,d)=>n+(d.roi.investment||0),0);
    root.innerHTML=`<div class="sm-head"><div><div class="page-title">Sales Manager Deal Management</div><div class="page-subtitle">One operational view of buying progress, deal health, Solution Fit, execution, stakeholders, and management priority.</div></div><button class="btn btn-ghost btn-sm" onclick="initSalesManagerDashboard(true)">↻ Refresh data</button></div>
    <div class="sm-viewbar">${[['team','Entire Team'],['rep','Individual Rep'],['stage','Buying Stage']].map(x=>`<button class="sm-view ${view===x[0]?'active':''}" onclick="smSetView('${x[0]}')">${x[1]}</button>`).join('')}<span class="sm-fresh">As of ${new Date(model.generatedAt).toLocaleString()}</span></div>
    <div class="sm-kpis"><button onclick="smQuick('')"><strong>${deals.length}</strong><span>Open deals</span></button><button onclick="smQuick('risk')"><strong>${atRisk}</strong><span>At risk / stalled</span></button><button onclick="smQuick('overdue')"><strong>${overdue}</strong><span>Past-due plan items</span></button><button onclick="smQuick('missing')"><strong>${missing}</strong><span>Deals missing essentials</span></button><button><strong>${money(pipeline)}</strong><span>Modeled contract investment</span></button></div>
    <div class="sm-filters"><input id="smSearch" placeholder="Search customer, scenario, or rep" oninput="smRender()"><select id="smRep" onchange="smRender()"><option value="">All reps</option>${model.reps.map(r=>`<option value="${r.id}">${esc(r.username)}</option>`).join('')}</select><select id="smStage" onchange="smRender()">${selectOpts(uniq('buyingStage'),'All buying stages')}</select><select id="smRisk" onchange="smRender()">${selectOpts(['Healthy','At Risk','Stalled'],'All deal health')}</select><select id="smFit" onchange="smRender()">${selectOpts(['Low','Moderate','High','Critical','Not Assessed'],'All Solution Fit')}</select><select id="smExecution" onchange="smRender()">${selectOpts(['On Track','Incomplete','At Risk','Missing'],'All execution')}</select><label><input id="smMissing" type="checkbox" onchange="smRender()"> Past due / missing only</label></div>
    <div id="smResults"></div><div id="smDrawer"></div>`;
    renderResults();
  }

  window.smRender=renderResults;
  window.smSetView=function(v){view=v;render();};
  window.smQuick=function(type){if(type==='risk')$('smRisk').value='At Risk';if(type==='overdue'||type==='missing')$('smMissing').checked=true;renderResults();};
  function renderResults(){
    const out=$('smResults'); if(!out)return; const deals=filtered();
    if(view==='rep'||view==='stage'){
      const key=view==='rep'?'rep':'buyingStage'; const groups={};deals.forEach(d=>(groups[d[key]]??=[]).push(d));
      out.innerHTML=`<div class="sm-groups">${Object.entries(groups).map(([name,ds])=>`<button onclick="smDrill('${key}','${encodeURIComponent(name)}')"><span>${esc(name)}</span><strong>${ds.length}</strong><small>${ds.filter(d=>d.health.level!=='Healthy').length} need attention · ${money(ds.reduce((n,d)=>n+(d.roi.investment||0),0))}</small></button>`).join('')||'<div class="empty-state"><p>No deals match these filters.</p></div>'}</div>`;return;
    }
    out.innerHTML=`<div class="sm-table-wrap"><table class="sm-table"><thead><tr><th>Opportunity</th><th>Rep / buying stage</th><th>Deal health</th><th>Solution Fit</th><th>Execution</th><th>Stakeholders</th><th>Contract ROI</th><th>Priority</th></tr></thead><tbody>${deals.map(d=>`<tr onclick="smOpenDeal('${d.id}')"><td><strong>${esc(d.company)}</strong><small>${esc(d.name)}</small>${d.missing.length?`<em>${d.missing.length} missing</em>`:''}</td><td>${esc(d.rep)}<small>${esc(d.buyingStage)}</small></td><td>${pill(d.health.level)}</td><td>${pill(d.solutionFit.level)}</td><td>${pill(d.plan.level)}${d.plan.overdue?`<small class="sm-danger">${d.plan.overdue} past due</small>`:''}</td><td>${pill(d.stakeholders.level)}</td><td><strong>${pct(d.roi.contractRoi)}</strong><small>${money(d.roi.contractNetBenefit)} net</small></td><td>${pill(d.managementPriority.level)}</td></tr>`).join('')||'<tr><td colspan="8">No deals match these filters.</td></tr>'}</tbody></table></div>`;
  }
  window.smDrill=function(key,value){value=decodeURIComponent(value);view='team';render(); const select=$(key==='rep'?'smRep':'smStage');if(select){if(key==='rep'){const d=model.deals.find(x=>x.rep===value);select.value=d?d.repId:'';}else select.value=value;}renderResults();};
  window.smOpenDeal=function(id){selected=model.deals.find(d=>d.id===id);renderDrawer();};
  window.smCloseDeal=function(){selected=null;const d=$('smDrawer');if(d)d.innerHTML='';};
  function reasons(title,item){return `<section><h4>${title}</h4><div>${pill(item.level)}</div><ul>${(item.reasons||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`;}
  function renderDrawer(){const d=selected,wrap=$('smDrawer');if(!d||!wrap)return;const suggestion=d.health.level==='Healthy'?'Protect momentum: confirm the next customer-owned commitment and executive outcome.':d.plan.overdue?'Recover execution: agree owners and dates for overdue project items before adding new tasks.':d.stakeholders.level!=='Healthy'?'Multi-thread the deal: engage the economic buyer and validate the champion’s influence.':'Resolve the highest-severity Solution Fit item and document the decision.';
    wrap.innerHTML=`<div class="sm-overlay" onclick="if(event.target===this)smCloseDeal()"><aside class="sm-drawer"><button class="sm-x" onclick="smCloseDeal()">×</button><h2>${esc(d.company)}</h2><p>${esc(d.name)} · ${esc(d.rep)} · ${esc(d.buyingStage)}</p><div class="sm-roi"><div><b>${pct(d.roi.contractRoi)}</b><span>${d.roi.contractMonths||'—'}-month ROI</span></div><div><b>${money(d.roi.contractNetBenefit)}</b><span>Contract net benefit</span></div><div><b>${money(d.roi.contractNpv)}</b><span>Contract NPV</span></div></div><div class="sm-dimensions">${reasons('Deal health',d.health)}${reasons('Solution Fit',d.solutionFit)}${reasons('Execution health',d.plan)}${reasons('Stakeholder health',d.stakeholders)}${reasons('Management priority',d.managementPriority)}</div><div class="sm-coach"><h4>Illustrative manager recommendation</h4><p>${esc(suggestion)}</p><small>Rule-based guidance from saved application data; review before acting.</small></div><div class="sm-actions"><h3>Internal action plan</h3>${d.actions.map(a=>`<div><b>${esc(a.action)}</b><span>${esc(a.owner||'Unassigned')} · ${a.due_date?new Date(a.due_date).toLocaleDateString():'No date'} · ${esc(a.status)}</span></div>`).join('')||'<p>No internal manager actions yet.</p>'}<form onsubmit="smAddAction(event)"><input id="smActionText" required placeholder="Management action"><input id="smActionOwner" placeholder="Owner"><input id="smActionDate" type="date"><select id="smActionPriority"><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option><option value="low">Low</option></select><button class="btn btn-cta btn-sm">Add action</button></form></div><div class="btn-row"><button class="btn btn-primary" onclick="smOpenRoi('${d.id}')">Open saved ROI record</button><button class="btn btn-ghost" onclick="switchTab('map');smCloseDeal()">Open Joint Project Plans</button></div></aside></div>`;
  }
  window.smAddAction=async function(e){e.preventDefault();const b={scenarioId:selected.id,customerId:selected.customerId,action:$('smActionText').value,owner:$('smActionOwner').value,dueDate:$('smActionDate').value||null,priority:$('smActionPriority').value};const r=await apiFetch('/api/sales-manager/actions',{method:'POST',body:JSON.stringify(b)});if(!r||!r.ok){showToast('Could not save action.');return;}selected.actions.unshift(await r.json());renderDrawer();};
  window.smOpenRoi=async function(id){if(typeof loadScenario==='function'){await loadScenario(id);smCloseDeal();switchTab('calc');}else showToast('Saved ROI record could not be opened.');};
})();
