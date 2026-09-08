/* Session-scoped persistence for independent AI experiences. */
(function(){
  'use strict';
  const PREFIX='ci_ai_session_v1:';
  function hash(value){let h=2166136261,s=String(value||'anonymous');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function identity(kind, explicit){
    if(explicit)return hash(explicit);
    if(kind==='prospect_help'){const p=new URLSearchParams(location.search);return hash(p.get('token')||p.get('t')||location.pathname);}
    let user='',token='';try{user=JSON.parse(sessionStorage.getItem('ci_user')||'{}').id||'';token=sessionStorage.getItem('ci_token')||'';}catch(_){}
    return hash(`${user}:${token}`);
  }
  function key(kind,explicit){return `${PREFIX}${identity(kind,explicit)}:${kind}`;}
  function empty(){return {history:[],lastResponse:'',draft:'',context:null,contextFingerprint:'',stale:false,activeField:'',fields:{},updatedAt:0};}
  function load(kind,explicit){try{return Object.assign(empty(),JSON.parse(sessionStorage.getItem(key(kind,explicit))||'{}'));}catch(_){return empty();}}
  function save(kind,state,explicit){state.updatedAt=Date.now();try{sessionStorage.setItem(key(kind,explicit),JSON.stringify(state));}catch(_){}return state;}
  function clear(kind,explicit){try{sessionStorage.removeItem(key(kind,explicit));}catch(_){} }
  function clearAll(){try{Object.keys(sessionStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>sessionStorage.removeItem(k));}catch(_){} }
  function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.keys(value).sort().reduce((o,k)=>(o[k]=stable(value[k]),o),{});return value;}
  function fingerprint(value){return hash(JSON.stringify(stable(value)));}
  function updateContext(kind,state,context,explicit){const next=fingerprint(context);if(state.lastResponse&&state.contextFingerprint&&state.contextFingerprint!==next)state.stale=true;state.context=context;state.latestContextFingerprint=next;save(kind,state,explicit);return state;}
  window.CIAIState={load,save,clear,clearAll,fingerprint,updateContext};
}());
