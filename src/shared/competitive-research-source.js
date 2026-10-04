'use strict';
async function loadConfiguredProductKnowledge(query,ciProductKey){
  const {rows}=await query(`SELECT id,source_type,source_name,source_url,content_text,file_size,created_at
    FROM ci_product_sources WHERE is_active=TRUE AND ci_product_key=$1 ORDER BY created_at DESC LIMIT 1`,[ciProductKey]);
  const source=rows&&rows[0]||null;
  return source?{ready:true,source,blocker:null}:{ready:false,source:null,blocker:'Approved Cloud Inventory product knowledge is unavailable. Ask an Admin to add a canonical source for this product.'};
}
async function resolveProductKnowledge({query,ciProductKey,fetchUrlContent}){
  const configured=await loadConfiguredProductKnowledge(query,ciProductKey);
  if(!configured.ready)return configured;
  const source=configured.source;
  if(source.content_text)return{...configured,content:String(source.content_text).slice(0,12000),label:source.source_name};
  if(source.source_url&&typeof fetchUrlContent==='function'){
    const fetched=await fetchUrlContent(source.source_url);
    if(fetched&&fetched.ok&&fetched.text)return{...configured,content:String(fetched.text).slice(0,12000),label:source.source_url};
  }
  return{ready:false,source,content:'',label:source.source_name,blocker:'Approved Cloud Inventory product knowledge could not be loaded. Ask an Admin to verify the canonical source.'};
}
module.exports={loadConfiguredProductKnowledge,resolveProductKnowledge};
