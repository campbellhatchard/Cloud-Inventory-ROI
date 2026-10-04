(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CIOperationalOutputPreconditions=api;
}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function stakeholderOutputContext({company,stakeholders}={}){
    const name=String(company||'').trim(),records=Array.isArray(stakeholders)?stakeholders:[];
    if(!name||!records.length)return{ok:false,message:'Select a saved customer stakeholder map before exporting PowerPoint or PDF.'};
    return{ok:true,company:name,stakeholders:records};
  }
  return Object.freeze({stakeholderOutputContext});
}));
