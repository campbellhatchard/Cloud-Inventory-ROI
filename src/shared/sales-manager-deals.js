'use strict';
function compareCurrent(a,b){
  const version=Number(b.version||0)-Number(a.version||0);if(version)return version;
  return new Date(b.updated_at||0).getTime()-new Date(a.updated_at||0).getTime();
}
function dedupeCurrentScenarioRows(rows){
  const best=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const key=String(row.base_id||row.id||'');if(!key)continue;
    const current=best.get(key);if(!current||compareCurrent(row,current)<0)best.set(key,row);
  }
  return [...best.values()].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
}
module.exports={dedupeCurrentScenarioRows};
