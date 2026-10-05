/* Canonical Sales Manager opportunity projection shared by the server and browser. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CISalesManagerOpportunityAuthority=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function canonicalOpportunityId(row){
    if(!row||typeof row!=='object')return '';
    return String(row.baseId||row.base_id||row.id||'').trim();
  }

  function updatedAt(row){
    const value=row?.updatedAt||row?.updated_at||0;
    const parsed=new Date(value).getTime();
    return Number.isFinite(parsed)?parsed:0;
  }

  function compareCanonicalCandidate(a,b){
    const version=Number(b?.version||0)-Number(a?.version||0);
    if(version)return version;
    const updated=updatedAt(b)-updatedAt(a);
    if(updated)return updated;
    return String(b?.id||'').localeCompare(String(a?.id||''));
  }

  function dedupeCurrentScenarioRows(rows){
    const best=new Map();
    for(const row of Array.isArray(rows)?rows:[]){
      const key=canonicalOpportunityId(row);
      if(!key)continue;
      const current=best.get(key);
      if(!current||compareCanonicalCandidate(row,current)<0)best.set(key,row);
    }
    return [...best.values()].sort((a,b)=>updatedAt(b)-updatedAt(a)||canonicalOpportunityId(a).localeCompare(canonicalOpportunityId(b)));
  }

  function opportunityValue(row){
    const value=row?.commercial?.opportunityValue??row?.opportunityValue??row?.opportunity_value??null;
    if(value===null||value===undefined||value==='')return null;
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:null;
  }

  function opportunityCurrency(row){
    return String(row?.commercial?.currency||row?.opportunityCurrency||row?.currency||'USD').toUpperCase();
  }

  function summarizeOpportunityValues(rows){
    const canonical=dedupeCurrentScenarioRows(rows);
    const totals={};
    let knownValueCount=0;
    for(const row of canonical){
      const value=opportunityValue(row);
      if(value===null)continue;
      const currency=opportunityCurrency(row);
      totals[currency]=(totals[currency]||0)+value;
      knownValueCount+=1;
    }
    return {totals,knownValueCount,missingValueCount:canonical.length-knownValueCount,totalCount:canonical.length};
  }

  return {canonicalOpportunityId,dedupeCurrentScenarioRows,summarizeOpportunityValues};
});
