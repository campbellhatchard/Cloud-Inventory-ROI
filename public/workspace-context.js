/* Atomic customer workspace identity. Async consumers capture a token before
   loading and must verify it before publishing any result to the page. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CIWorkspaceContext=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  let state={revision:0,customerId:null,scenarioId:null};
  const value=v=>v==null||v===''?null:String(v);
  const snapshot=()=>Object.freeze({...state});
  function notify(){
    if(typeof root.dispatchEvent==='function'&&typeof root.CustomEvent==='function'){
      root.dispatchEvent(new root.CustomEvent('ci-workspace-context-changed',{detail:snapshot()}));
    }
  }
  function begin(identity={}){
    /* Resolve any readiness decision that belongs to the workspace being
       replaced; leaving its promise open could otherwise outlive a switch. */
    if(typeof root.closeExecutiveReadiness==='function')root.closeExecutiveReadiness(false);
    state={revision:state.revision+1,customerId:value(identity.customerId),scenarioId:value(identity.scenarioId)};
    notify();
    return snapshot();
  }
  function isCurrent(token){
    if(!token)return false;
    return Number(token.revision)===state.revision;
  }
  function commit(token,identity={}){
    if(!isCurrent(token))return false;
    state={...state,customerId:value(identity.customerId??state.customerId),scenarioId:value(identity.scenarioId??state.scenarioId)};
    notify();
    return true;
  }
  function belongs({customerId,scenarioId}={}){
    return (customerId==null||value(customerId)===state.customerId)
      && (scenarioId==null||value(scenarioId)===state.scenarioId);
  }
  return Object.freeze({begin,capture:snapshot,isCurrent,commit,belongs,current:snapshot});
});
