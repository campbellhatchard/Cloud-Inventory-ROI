/* Solution Fit product-scope and customer-switch coordination.
   Browser/Node compatible so the exact production behavior is regression tested. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SolutionFitScope=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PRODUCTS=Object.freeze(['MEP','CIP','EPP']);
  const PRODUCT_LABELS=Object.freeze({
    MEP:'Mobile Enterprise Platform (MEP)',
    CIP:'Cloud Inventory Platform',
    EPP:'Enterprise Printing Platform (EPP)'
  });
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const uniqueProducts=values=>[...new Set((values||[]).filter(value=>PRODUCTS.includes(value)))];

  function activeProducts(state){
    const scope=state?.solutionScope||{};
    const scoped=uniqueProducts([scope.primaryProduct,...(scope.additionalProducts||[])]);
    return scoped.length?scoped:uniqueProducts(state?.opportunity?.products||[]);
  }

  function createDraft(state,mode='create'){
    const products=activeProducts(state);
    return{
      mode,
      primaryProduct:products[0]||'',
      additionalProducts:products.slice(1),
      removalConfirmed:false,
      error:''
    };
  }

  function hasAssessment(process){
    if(!process||typeof process!=='object')return false;
    return !!process.selected
      || !['','Not reviewed'].includes(String(process.demoStatus||''))
      || !['','Not reviewed'].includes(String(process.fit||''))
      || !['','Not validated'].includes(String(process.customerValidation||''))
      || !!String(process.notes||process.reason||'').trim();
  }

  function planChange(state,draft){
    const before=activeProducts(state);
    const after=uniqueProducts([draft?.primaryProduct,...(draft?.additionalProducts||[])]);
    const removed=before.filter(product=>!after.includes(product));
    const assessmentCounts={};
    for(const product of removed){
      assessmentCounts[product]=(state?.processes||[]).filter(process=>process?.product===product&&hasAssessment(process)).length;
    }
    return{before,after,removed,assessmentCounts,hasHistoricalAssessment:removed.some(product=>assessmentCounts[product]>0)};
  }

  function applyProductScope(state,draft,options={}){
    if(!PRODUCTS.includes(draft?.primaryProduct)){
      const error=new Error('Select one Primary Cloud Inventory Product.');
      error.code='PRIMARY_PRODUCT_REQUIRED';
      throw error;
    }
    const plan=planChange(state,draft);
    if(plan.removed.length&&!draft.removalConfirmed){
      const error=new Error('Confirm that removed products leave active scope while their saved assessment history remains preserved.');
      error.code='PRODUCT_REMOVAL_CONFIRMATION_REQUIRED';
      error.plan=plan;
      throw error;
    }
    const next=clone(state);
    next.solutionScope=next.solutionScope||{};
    next.opportunity=next.opportunity||{};
    next.processes=Array.isArray(next.processes)?next.processes:[];
    next.solutionScope.primaryProduct=draft.primaryProduct;
    next.solutionScope.additionalProducts=uniqueProducts(draft.additionalProducts).filter(product=>product!==draft.primaryProduct);
    next.opportunity.products=[draft.primaryProduct,...next.solutionScope.additionalProducts];
    for(const process of next.processes){
      if(plan.removed.includes(process?.product))process.selected=false;
    }
    if(plan.removed.length){
      next.scopeHistory=Array.isArray(next.scopeHistory)?next.scopeHistory:[];
      next.scopeHistory.push({
        changedAt:options.now||new Date().toISOString(),
        reason:'Product removed from active scope; saved assessment records preserved.',
        removedProducts:plan.removed.slice(),
        previousProducts:plan.before.slice(),
        activeProducts:plan.after.slice()
      });
    }
    return{state:next,plan};
  }

  function renderDialog({draft,state,customerName=''}){
    const d=draft||createDraft(state,'create');
    const plan=planChange(state||{},d);
    const removal=plan.removed.length?`<div class="sf-scope-removal" role="alert"><strong>Product scope change</strong><p>${esc(plan.removed.join(', '))} will leave active scope. ${plan.hasHistoricalAssessment?'Saved application assessments and history will be preserved and will not be deleted.':'Any saved history will remain preserved.'}</p><label><input type="checkbox" data-sfscope-confirm-removal ${d.removalConfirmed?'checked':''}> I understand the saved assessment remains in history but is removed from active scope.</label></div>`:'';
    return `<section class="sf-scope-wizard"><header><div><div class="sf-gate-kicker">Solution Fit setup</div><h2 id="sfScopeTitle">${d.mode==='create'?'Create':'Edit'} Solution Fit scope</h2><p>${esc(customerName||'Customer')} · Product scope only</p></div><button class="sf-scope-close" aria-label="Close">×</button></header>
      <div class="sf-scope-step"><div class="sf-step-number">1</div><div><h3>Primary Cloud Inventory product</h3><p class="sf-muted">Choose the primary product and any optional additional products. ERP and application configuration is completed once in the main Solution Fit workflow.</p><div class="sf-product-cards">${PRODUCTS.map(product=>`<label class="sf-product-card ${d.primaryProduct===product?'selected':''}"><input type="radio" name="sfPrimaryProduct" value="${product}" ${d.primaryProduct===product?'checked':''}><strong>${esc(PRODUCT_LABELS[product])}</strong><span>${product==='MEP'?'Mobile workflows connected to the customer ERP.':product==='CIP'?'Cloud inventory visibility and control.':'Enterprise document and label printing.'}</span></label>`).join('')}</div><fieldset class="sf-additional-products"><legend>Additional products <span>(optional)</span></legend>${PRODUCTS.filter(product=>product!==d.primaryProduct).map(product=>`<label><input type="checkbox" data-sfadditional="${product}" ${d.additionalProducts.includes(product)?'checked':''}> ${esc(PRODUCT_LABELS[product])}</label>`).join('')}</fieldset>${removal}${d.error?`<div class="sf-scope-error" role="alert">${esc(d.error)}</div>`:''}</div></div>
      <footer><button class="btn btn-ghost" data-sfscope="cancel">Cancel</button><button class="btn btn-primary" data-sfscope="save">${d.mode==='create'?'Create Solution Fit':'Save Scope'}</button></footer></section>`;
  }

  function createSwitchCoordinator({isDirty,save,discard,clear,load,navigate}){
    let generation=0;
    async function prepare(decision){
      if(!isDirty())return{status:'ready'};
      if(!decision)return{status:'decision-required'};
      if(decision==='cancel')return{status:'cancelled'};
      if(decision==='save'){
        const saved=await save();
        if(!saved)return{status:'blocked',reason:'save-failed'};
      }else if(decision==='discard'){
        await discard?.();
      }else throw new Error('Unsupported Solution Fit switch decision.');
      return{status:'ready'};
    }
    async function select(customerId){
      const token=++generation;
      clear?.(customerId);
      navigate?.(customerId);
      const result=await load(customerId,token);
      return token===generation?{status:'loaded',result}:{status:'stale'};
    }
    function invalidate(){generation++;}
    return{prepare,select,invalidate,currentGeneration:()=>generation};
  }

  function customerIdFromUrl(value){
    try{return new URL(value,typeof location!=='undefined'?location.href:'http://localhost/').searchParams.get('sfCustomer')||'';}catch(_){return '';}
  }
  function urlForCustomer(value,customerId){
    const url=new URL(value,typeof location!=='undefined'?location.href:'http://localhost/');
    if(customerId)url.searchParams.set('sfCustomer',customerId);else url.searchParams.delete('sfCustomer');
    return url.pathname+url.search+url.hash;
  }

  return{PRODUCTS,PRODUCT_LABELS,activeProducts,createDraft,planChange,applyProductScope,renderDialog,createSwitchCoordinator,customerIdFromUrl,urlForCustomer};
});
