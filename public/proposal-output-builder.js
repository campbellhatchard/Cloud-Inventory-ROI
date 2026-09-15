(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CIProposalOutputBuilder=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function money(value,currency,economic){
    if(economic&&!economic.hasEconomicValue(value))return 'Not yet established';
    if(value===null||value===undefined||value==='')return 'Not yet established';
    return new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:0}).format(Number(value));
  }
  function classification({audience,draft,review}){
    if(audience==='internal'||draft)return '<div class="output-classification output-classification-internal"><strong>CONFIDENTIAL — INTERNAL USE ONLY</strong><br>DRAFT — NOT READY FOR CUSTOMER SHARING</div>';
    if(review)return '<div class="output-classification output-classification-review"><strong>REVIEW BEFORE SHARING</strong></div>';
    return '';
  }
  function buildProposalOutputHtml({story={},proposal={},audience='customer',draft=false,review=false,brand,economicAvailability}={}){
    if(!['customer','internal'].includes(audience))throw new Error('Proposal audience must be customer or internal.');
    if(draft&&audience!=='internal')throw new Error('Draft Proposal must use internal audience.');
    if(!brand||typeof brand.audience!=='function')throw new Error('Brand System is required.');
    const e=story.economics||{},w=story.threeWhys||{},fit=story.solutionAlignment||{},steps=story.nextSteps?.items||[],drivers=e.activeDrivers||[],currency=story.meta?.currency||'USD';
    const percent=value=>economicAvailability?.percent?economicAvailability.percent(value):(value===null||value===undefined?'Not yet established':`${Number(value).toFixed(0)}%`);
    const payback=()=>economicAvailability?.paybackLabel?economicAvailability.paybackLabel(e):(e.contractPayback??'Not yet established');
    return `${classification({audience,draft,review})}<div class="proposal-cover"><img src="${esc(brand.logo?.('logoColor')||'')}" alt="Cloud Inventory"><div class="proposal-kicker">Commercial proposal</div><h1>${esc(proposal.title||'Executive Proposal')}</h1><p class="proposal-cover-company">Prepared for ${esc(story.meta?.customer)}</p><div class="proposal-cover-meta"><span>${esc(story.meta?.solution)}</span><span>${esc(e.contractMonths)} months</span><span>${proposal.validThrough?'Valid through '+esc(proposal.validThrough):''}</span></div></div><section><h2>Executive summary</h2><h3>Customer situation</h3><p>${esc(proposal.situation||'To validate')}</p><h3>Our recommendation</h3><p>${esc(proposal.recommendation||'To validate')}</p></section><section class="proposal-review-notice"><b>Governed Value Story — read only</b><h2>Economic outcome</h2><p>${money(e.annualBenefit,currency,economicAvailability)} annual modeled benefit · ${money(e.totalContractBenefit,currency,economicAvailability)} contract benefit · ${money(e.netEconomicBenefit,currency,economicAvailability)} net economic benefit · ${esc(percent(e.contractRoi))} Contract ROI · ${esc(payback())}</p><h2>The Three Whys</h2>${[['Why Change',w.whyChange],['Why Now',w.whyNow],['Why Cloud Inventory',w.whyCloudInventory]].map(([label,item])=>`<div class="proposal-why"><strong>${label}</strong><p>${esc(item?.value||'To validate')}</p><small>${esc(item?.status||'To validate')}</small></div>`).join('')}<h2>Solution scope</h2><p>${fit.exists?esc((fit.products||[]).join(', ')||story.meta?.solution):'To validate'}</p><h2>Implementation modeling assumption</h2><p>${esc(story.implementationContext?.modelingMonths||0)} months to implementation/go-live. This is not a delivery commitment.</p><h2>Value drivers / success measures</h2><ul>${drivers.slice(0,5).map(x=>`<li>${esc(x.label)} — ${money(x.annualValue,currency,economicAvailability)} / year · ${esc(x.status)}</li>`).join('')}</ul><h2>Joint next steps</h2>${steps.length?`<ul>${steps.map(x=>`<li>${esc(x.milestone)} — ${esc(x.owner)}${x.dueDate?' — '+esc(x.dueDate):''}</li>`).join('')}</ul>`:'<p>Joint next steps are still being defined.</p>'}</section><section><h2>Modeled Customer Investment</h2><p>${money(e.totalContractInvestment,currency,economicAvailability)} — read only from the ROI model.</p><h2>Commercial terms</h2><p>To be provided through the governed commercial process.</p><p>Prepared by ${esc(proposal.preparedBy||story.meta?.preparedBy)}${proposal.proposalDate?' · '+esc(proposal.proposalDate):''}</p><div class="proposal-footer">${brand.audience(audience)}</div></section>`;
  }
  return Object.freeze({buildProposalOutputHtml});
});
