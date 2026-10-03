/* Executive Three Whys editor only. Customer-output facts are owned by the server-authoritative Executive Value Story. */
const THREE_WHY_KEYS={act:'whyChange',ci:'whyCloudInventory',now:'whyNow'};
const THREE_WHY_STATUS={customer_discovery:'Customer supported',customer_validated:'Customer supported',rep_authored:'Rep authored — validate',ai_draft:'AI draft — review and validate',historical_unknown:'Needs validation',empty:'To validate'};
const AUDIENCE_CONFIG={mixed:{label:'Mixed executive audience'},cfo:{label:'CFO'},coo:{label:'COO'},ceo:{label:'CEO'},cio:{label:'CIO'}};
let threeWhys={act:'',ci:'',now:''},threeWhysMeta={},aiGenerating=false,threeWhysSaveTimer=null,threeWhysSavePromise=null,threeWhysSaveQueued=false;
const clean=v=>String(v==null?'':v).trim();
function getExecAudience(){return document.getElementById('execAudience')?.value||'mixed';}
function discoveryEvidence(){const byQuestion=typeof latestSubmittedEvidence!=='undefined'&&latestSubmittedEvidence?.byQuestion?latestSubmittedEvidence.byQuestion:{};const answer=id=>clean(byQuestion[id]?.answer_text);return{act:answer('ve5')||answer('ve6'),now:answer('ve2'),ci:''};}
function metaFor(source){return{source,validationStatus:THREE_WHY_STATUS[source]||'To validate',updatedAt:new Date().toISOString()};}
function renderThreeWhyStatus(){for(const key of ['act','ci','now']){const el=document.getElementById('why_'+key),status=document.getElementById('whyStatus_'+key),value=clean(el?.value),meta=threeWhysMeta[THREE_WHY_KEYS[key]]||metaFor(value?'historical_unknown':'empty');if(status)status.textContent=value?(meta.validationStatus||THREE_WHY_STATUS[meta.source]||'Needs validation'):'To validate';}}
function restoreCustomerEvidence(){const evidence=discoveryEvidence();for(const key of ['act','ci','now']){const el=document.getElementById('why_'+key);if(el)el.value=evidence[key];threeWhys[key]=evidence[key];threeWhysMeta[THREE_WHY_KEYS[key]]=metaFor(evidence[key]?'customer_discovery':'empty');}renderThreeWhyStatus();saveThreeWhys({immediate:true,preserveMeta:true});}
function initializeThreeWhysFromEvidence(){const evidence=discoveryEvidence();for(const key of ['act','ci','now']){const el=document.getElementById('why_'+key),mk=THREE_WHY_KEYS[key];if(!el)continue;if(!clean(el.value)&&evidence[key]){el.value=evidence[key];threeWhys[key]=evidence[key];threeWhysMeta[mk]=metaFor('customer_discovery');}else if(clean(el.value)&&!threeWhysMeta[mk])threeWhysMeta[mk]=metaFor('historical_unknown');}renderThreeWhyStatus();}
function loadThreeWhysDefaults(){restoreCustomerEvidence();}
function markRepAuthored(key){const value=clean(document.getElementById('why_'+key)?.value);threeWhysMeta[THREE_WHY_KEYS[key]]=metaFor(value?'rep_authored':'empty');window.markNarrativeDirty?.();renderThreeWhyStatus();}
function saveThreeWhys(options={}){for(const key of ['act','ci','now']){const el=document.getElementById('why_'+key);if(el)threeWhys[key]=el.value;}if(options.persist===false)return;clearTimeout(threeWhysSaveTimer);if(!window._calcScenarioId)return;if(options.immediate)persistThreeWhys();else threeWhysSaveTimer=setTimeout(persistThreeWhys,700);}
async function persistThreeWhys(){
  clearTimeout(threeWhysSaveTimer);
  if(!window._calcScenarioId)return false;
  if(threeWhysSavePromise){threeWhysSaveQueued=true;return threeWhysSavePromise;}
  const status=document.getElementById('aiEnhanceStatus');
  threeWhysSavePromise=(async()=>{
    let saved=true;
    do{
      threeWhysSaveQueued=false;
      const scenarioId=window._calcScenarioId;
      const payload={threeWhysAct:threeWhys.act,threeWhysCi:threeWhys.ci,threeWhysNow:threeWhys.now,threeWhysMeta};
      try{
        const resp=await apiFetch('/api/scenarios/'+scenarioId+'/narrative',{method:'PATCH',body:JSON.stringify(payload)});
        if(!resp?.ok)throw Error('Narrative autosave failed');
        const result=await resp.json();
        if(window._calcScenarioId===scenarioId&&result.id)window._calcScenarioId=result.id;
        if(result.threeWhysMeta)threeWhysMeta=result.threeWhysMeta;
        window.clearNarrativeDirty?.();renderThreeWhyStatus();
        if(status&&!aiGenerating)status.textContent='✓ Narrative saved';
        window.invalidateExecutiveValueStory?.();
      }catch(e){
        saved=false;window.markNarrativeDirty?.();
        window.logClientError?.(`executive_three_whys_save.failed scenario=${scenarioId} message=${e.message}`,'executive_three_whys_save','error');
        if(status&&!aiGenerating)status.textContent='⚠ Narrative not saved — retry';
        break;
      }
    }while(threeWhysSaveQueued);
    return saved;
  })();
  try{return await threeWhysSavePromise;}finally{threeWhysSavePromise=null;}
}
async function saveExecutiveView(){saveThreeWhys({persist:false});if(!window._calcScenarioId){showToast('Save the scenario first to retain this executive view.');return saveScenario();}const ok=await persistThreeWhys();showToast(ok?'Executive view saved.':'Executive view could not be saved.');}
async function aiEnhanceWhys(){if(aiGenerating)return;saveThreeWhys({persist:false});const btn=document.getElementById('aiEnhanceBtn'),status=document.getElementById('aiEnhanceStatus'),aud=AUDIENCE_CONFIG[getExecAudience()]||AUDIENCE_CONFIG.mixed;aiGenerating=true;if(btn){btn.disabled=true;btn.textContent='✨ Generating…';}if(status)status.textContent='Creating an AI draft…';const prompt=`Rewrite the supplied Three Whys as a concise ${aud.label} draft. Use only facts in the existing draft. Do not invent customer evidence, deadlines, events, regulations, competitor claims, implementation commitments, or cost-of-delay arithmetic. Return only JSON {"act":"","ci":"","now":""}. Existing draft: ${JSON.stringify(threeWhys)}`;try{const resp=await apiFetch('/api/enhance',{method:'POST',body:JSON.stringify({max_tokens:1000,messages:[{role:'user',content:prompt}]})});if(!resp)throw Error('AI service did not respond');const data=await resp.json().catch(()=>({}))||{};if(!resp.ok){const err=new Error(data.error||('HTTP '+resp.status));err.status=resp.status;throw err;}const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim(),match=raw.match(/\{[\s\S]*\}/);if(!match)throw Error('AI response did not contain the required JSON object');const parsed=JSON.parse(match[0]);for(const key of ['act','ci','now'])if(typeof parsed[key]==='string'&&parsed[key].trim()){document.getElementById('why_'+key).value=parsed[key].trim();threeWhys[key]=parsed[key].trim();threeWhysMeta[THREE_WHY_KEYS[key]]=metaFor('ai_draft');}window.markNarrativeDirty?.();renderThreeWhyStatus();const saved=await persistThreeWhys();if(!saved)throw Error('AI draft was created but could not be saved');if(status)status.textContent='AI draft — review and validate';}catch(e){console.error('executive_three_whys_ai.failed',{status:e&&e.status||null,message:e&&e.message||'unknown'});window.logClientError?.(`executive_three_whys_ai.failed scenario=${window._calcScenarioId||'none'} status=${e?.status||'unknown'} message=${e?.message||'unknown'}`,'executive_three_whys_ai','error');if(status)status.textContent=e&&e.status===429?'AI is temporarily busy. Your content was preserved; please try again shortly.':e&&e.status===503?'AI is not configured or temporarily unavailable. Your content was preserved.':'AI draft could not be created; your content was preserved.';}finally{aiGenerating=false;if(btn){btn.disabled=false;btn.textContent='✨ AI enhance';}}}
window.AUDIENCE_CONFIG=AUDIENCE_CONFIG;window.restoreCustomerEvidence=restoreCustomerEvidence;window.initializeThreeWhysFromEvidence=initializeThreeWhysFromEvidence;window.renderThreeWhyStatus=renderThreeWhyStatus;window.markRepAuthored=markRepAuthored;window.getThreeWhysMeta=()=>threeWhysMeta;window.persistThreeWhys=persistThreeWhys;window.saveThreeWhys=saveThreeWhys;window.aiEnhanceWhys=aiEnhanceWhys;
