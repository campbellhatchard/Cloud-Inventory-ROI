(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CICompetitiveContext=api;}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const VALID=new Set(['cip','mep','epp']);
  const overrides=new Map();
  const requests=new Map();
  const normalize=value=>VALID.has(String(value||'').toLowerCase())?String(value).toLowerCase():'cip';
  function key(value){return String(value||'unsaved');}
  function resolve({scenarioKey,savedProduct,currentProduct}={}){
    const id=key(scenarioKey),saved=String(savedProduct||'').toLowerCase();
    return overrides.has(id)?overrides.get(id):VALID.has(saved)?saved:normalize(currentProduct);
  }
  function setOverride(scenarioKey,product){overrides.set(key(scenarioKey),normalize(product));return overrides.get(key(scenarioKey));}
  function clearOverride(scenarioKey){overrides.delete(key(scenarioKey));}
  function beginRequest(channel,identity){
    const prior=requests.get(channel);if(prior&&prior.controller)prior.controller.abort();
    const controller=typeof AbortController==='function'?new AbortController():null;
    const request={channel,identity:String(identity||''),controller,signal:controller?.signal||undefined};
    requests.set(channel,request);
    request.isCurrent=()=>requests.get(channel)===request&&!request.signal?.aborted;
    return request;
  }
  function cancel(channel){const prior=requests.get(channel);if(prior?.controller)prior.controller.abort();requests.delete(channel);}
  return Object.freeze({normalize,resolve,setOverride,clearOverride,beginRequest,cancel});
}));
