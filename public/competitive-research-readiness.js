(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CICompetitiveResearchReadiness=api;
}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function evaluateCompetitiveResearchReadiness({serverKnowledgeReady=false,ciSource=null,competitorReady=false,loading=false}={}){
    const explicit=Boolean(ciSource&&(['file','url'].includes(ciSource.type))&&(ciSource.text||ciSource.url));
    const productReady=Boolean(serverKnowledgeReady||explicit);
    if(loading)return{ready:false,productReady:false,message:'Checking approved Cloud Inventory product knowledge…'};
    if(!productReady)return{ready:false,productReady:false,message:'An Admin must add approved canonical product knowledge before AI research can run.'};
    if(!competitorReady)return{ready:false,productReady:true,message:'Select a competitor and provide a source to continue.'};
    return{ready:true,productReady:true,message:'Ready to research'};
  }
  return Object.freeze({evaluateCompetitiveResearchReadiness});
}));
