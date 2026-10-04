(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CITransientOverlays=api.createTransientOverlayManager(root.document);
}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const selector='#onboardCoach,.help-tour,.context-help-bg';
  function createTransientOverlayManager(doc){
    const active=new Map();
    function suspend(reason){
      const token=String(reason||'overlay')+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      const records=[];
      const nodes=doc&&typeof doc.querySelectorAll==='function'?[...doc.querySelectorAll(selector)]:[];
      nodes.forEach(node=>{
        records.push({node,hidden:Boolean(node.hidden),display:node.style&&node.style.display||'',aria:typeof node.getAttribute==='function'?node.getAttribute('aria-hidden'):null});
        node.hidden=true;if(node.style)node.style.display='none';if(typeof node.setAttribute==='function')node.setAttribute('aria-hidden','true');
      });
      active.set(token,records);return token;
    }
    function restore(token){
      const records=active.get(token)||[];
      records.forEach(({node,hidden,display,aria})=>{if(!node)return;node.hidden=hidden;if(node.style)node.style.display=display;if(typeof node.setAttribute==='function'&&aria!==null)node.setAttribute('aria-hidden',aria);else if(typeof node.removeAttribute==='function')node.removeAttribute('aria-hidden');});
      active.delete(token);
    }
    return Object.freeze({suspend,restore});
  }
  return Object.freeze({createTransientOverlayManager});
}));
