'use strict';
(function(){
 const root=()=>document.getElementById('businessCase');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function renderExpired(){root().innerHTML='<h1>Updated link required</h1><p>This business case was created with an earlier output format. Please contact your Cloud Inventory representative for an updated link.</p>';}
 function renderError(){root().innerHTML='<h1>Business case unavailable</h1><p>Please retry or contact your Cloud Inventory representative.</p><button id="retryBusinessCase">Retry</button>';document.getElementById('retryBusinessCase').onclick=init;}
 function render(p){
  const money=v=>v==null?'—':new Intl.NumberFormat(undefined,{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(v),e=p.economics;
  const metrics=[['Annual modeled benefit',money(e.annualBenefit)],['Contract benefit',money(e.totalContractBenefit)],['Contract investment',money(e.totalContractInvestment)],['Contract net benefit',money(e.netEconomicBenefit)],['Contract ROI',e.contractRoi==null?'—':`${Number(e.contractRoi).toFixed(0)}%`],['Contract NPV',money(e.npv)],['Payback',e.payback==null?'Not reached within contract':`${Number(e.payback).toFixed(1)} months`],['Contract term',`${e.contractMonths} months`]];
  root().innerHTML=`<header><img src="${esc(CIBrand.logo('logoColor'))}" alt="Cloud Inventory"><h1>${esc(p.customer)} — Business Case</h1><p>Published version ${esc(p.scenarioVersion)} · ${esc(p.publishedAt.slice(0,10))} · ${esc(p.currency)}</p></header><section><h2>Value summary</h2><p>${esc(p.readiness.label)}. This published version does not change when a new scenario is created.</p><ul>${metrics.map(([k,v])=>`<li>${esc(k)}: <strong>${esc(v)}</strong></li>`).join('')}</ul></section>${[['whyChange','Why change'],['whyNow','Why now'],['whyCloudInventory','Why Cloud Inventory']].map(([k,t])=>`<section><h2>${t}</h2><p>${esc(p.threeWhys[k])}</p></section>`).join('')}<section><h2>Value drivers</h2><ul>${p.drivers.map(d=>`<li><strong>${esc(d.label)}: ${esc(money(d.annualValue))}</strong><br>${esc(d.status)}</li>`).join('')}</ul></section><section><h2>Joint next steps</h2>${p.nextSteps.length?`<ul>${p.nextSteps.map(s=>`<li>${esc(s.milestone)} — ${esc(s.owner)} · ${esc(s.dueDate||'Date to agree')}</li>`).join('')}</ul>`:'<p>Next steps have not yet been jointly agreed.</p>'}</section><footer>${esc(CIBrand.audience('customer'))}</footer>`;
 }
 async function load(){const token=new URLSearchParams(location.search).get('token');if(!token)throw new Error('Missing token');const response=await fetch('/api/business-case-shares/'+encodeURIComponent(token),{credentials:'omit',cache:'no-store'});if(response.status===410)return null;if(!response.ok)throw new Error('Load failed');return response.json();}
 async function init(){try{const p=await load();if(p===null)renderExpired();else render(p);}catch(_){renderError();}}
 init();
})();
