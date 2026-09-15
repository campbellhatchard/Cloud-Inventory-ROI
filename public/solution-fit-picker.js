(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SolutionFitCustomerPicker=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function cards(items){
    return (items||[]).map(c=>`<article class="sf-customer-result" role="option" data-customer-id="${esc(c.id)}">
      <div class="sf-customer-result-main"><strong>${esc(c.name)}</strong><span>Sales rep: ${esc(c.owner?.name||'Unassigned')}</span>${c.erp?`<span>ERP: ${esc(c.erp)}</span>`:''}</div>
      <div class="sf-customer-result-status"><span class="sf-stage-pill">${c.solutionFit?.exists?`${esc(String(c.solutionFit.status||'not_ready').replaceAll('_',' '))} · ${Number(c.solutionFit.readiness)||0}%`:'Not started'}</span>${c.solutionFit?.primarySe?`<small>Primary SE: ${esc(c.solutionFit.primarySe)}</small>`:''}</div>
      <div class="sf-customer-result-actions">${c.actions?.canOpen?`<button class="btn btn-primary btn-sm" data-sfcustomer-open="${esc(c.id)}">Open existing Solution Fit</button>`:''}${c.actions?.canCreate?`<button class="btn btn-primary btn-sm" data-sfcustomer-create="${esc(c.id)}">Create new Solution Fit</button>`:''}</div>
    </article>`).join('');
  }

  function createController({request,view,limit=12}){
    if(typeof request!=='function'||!view)throw new TypeError('Picker request and view are required.');
    let offset=0,lastSearch='',lastAppend=false;
    async function load(search='',append=false){
      lastSearch=String(search||'');lastAppend=!!append;
      if(!append)offset=0;
      view.loading?.({append:!!append,search:lastSearch});
      try{
        const payload=await request({search:lastSearch,limit,offset});
        const items=Array.isArray(payload?.items)?payload.items:[];
        const total=Number(payload?.total)||0;
        if(!append&&!items.length)view.empty?.({kind:lastSearch?'search':'system',search:lastSearch});
        else view.results?.({items,total,append:!!append,html:cards(items)});
        offset+=items.length;
        view.pagination?.({visible:offset<total,offset,total});
        return payload;
      }catch(error){
        view.error?.({error,search:lastSearch,retry});
        view.pagination?.({visible:false,offset,total:0});
        return null;
      }
    }
    function retry(){return load(lastSearch,lastAppend);}
    return{load,retry,getState:()=>({offset,lastSearch,lastAppend})};
  }

  return{cards,createController};
});
