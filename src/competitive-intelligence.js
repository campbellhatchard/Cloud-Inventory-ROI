'use strict';
const { query, transaction }=require('./db');
const VALID_CI_PRODUCT_KEYS=Object.freeze(['cip','mep','epp']);
function validateCiProductKey(value,{allowEmpty=false}={}){const key=String(value||'').trim().toLowerCase();if(allowEmpty&&key==='')return '';if(!VALID_CI_PRODUCT_KEYS.includes(key)){const e=new Error('ciProductKey must be cip, mep, or epp.');e.status=400;throw e}return key}
const CATEGORIES=new Set(['Deployment','Architecture','Mobile','Offline','ERP Compatibility','Integration','Inventory Execution','Warehouse','Field Inventory','Low-Code / Configuration','Security','Pricing','Implementation','Services','Support']);
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const domain=u=>{try{const host=new URL(u).hostname.toLowerCase().replace(/^www\./,''),parts=host.split('.'),compound=new Set(['co.uk','com.au','co.nz','co.jp','com.br','com.sg']);if(parts.length<=2)return host;const suffix=parts.slice(-2).join('.');return compound.has(suffix)?parts.slice(-3).join('.'):suffix}catch{return null}};
/* Root domains identify companies, never products. A URL is product-specific
   evidence only when its normalized non-root path exactly matches a governed
   product URL or approved/canonical product source. Query strings, fragments,
   trailing slashes and www are ignored. */
const normalizeProductUrl=u=>{try{const x=new URL(u),host=x.hostname.toLowerCase().replace(/^www\./,''),path=x.pathname.replace(/\/+$/,'').toLowerCase();return path&&path!=='/'?`${host}${path}`:null}catch{return null}};
const freshness=date=>{if(!date)return {key:'none',label:'No research',days:null};const days=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));return days<=90?{key:'current',label:'Current',days}:days<=180?{key:'aging',label:'Aging',days}:{key:'stale',label:'Stale',days}};
function classifyIdentity({exactProductMatches=[],possibleProductMatches=[],companyMatch=null}){return {exactProductMatches,possibleProductMatches,companyMatch,classification:exactProductMatches.length?'exact_product_match':possibleProductMatches.length?'possible_product_match':companyMatch?'existing_company':'new_company_product'}}
async function findIdentity(name,url){
  const n=normalize(name),d=domain(url),productUrl=normalizeProductUrl(url);
  const exact=(await query(`SELECT p.id,p.product_name,p.primary_website,p.company_id,c.company_name,array_remove(array_agg(a.alias_name),NULL) aliases FROM competitive_products p LEFT JOIN competitive_companies c ON c.id=p.company_id LEFT JOIN competitive_product_aliases a ON a.product_id=p.id WHERE p.merged_into_id IS NULL AND (p.normalized_name=$1 OR EXISTS(SELECT 1 FROM competitive_product_aliases x WHERE x.product_id=p.id AND x.normalized_alias=$1)) GROUP BY p.id,c.company_name`,[n])).rows;
  if(productUrl&&!exact.length){const candidates=(await query(`SELECT DISTINCT p.id,p.product_name,p.primary_website,p.company_id,c.company_name,array_remove(array_agg(a.alias_name),NULL) aliases,array_remove(array_agg(s.source_url) FILTER(WHERE s.source_status='approved' OR s.is_canonical),NULL) governed_urls FROM competitive_products p LEFT JOIN competitive_companies c ON c.id=p.company_id LEFT JOIN competitive_product_aliases a ON a.product_id=p.id LEFT JOIN competitive_sources s ON s.product_id=p.id WHERE p.merged_into_id IS NULL GROUP BY p.id,c.company_name`,[])).rows;for(const p of candidates)if([p.primary_website,...(p.governed_urls||[])].some(x=>normalizeProductUrl(x)===productUrl))exact.push(p)}
  const companyMatch=d?(await query(`SELECT id,company_name,website_domain,status FROM competitive_companies WHERE status='active' AND website_domain=$1 LIMIT 1`,[d])).rows[0]||null:null;
  const possible=n?(await query(`SELECT p.id,p.product_name,p.primary_website,p.company_id,c.company_name FROM competitive_products p LEFT JOIN competitive_companies c ON c.id=p.company_id WHERE p.merged_into_id IS NULL AND p.normalized_name<>$1 AND (p.normalized_name LIKE '%'||$1||'%' OR $1 LIKE '%'||p.normalized_name||'%') LIMIT 5`,[n])).rows:[];
  return classifyIdentity({exactProductMatches:exact,possibleProductMatches:possible,companyMatch});
}
async function findDuplicate(name,url){return (await findIdentity(name,url)).exactProductMatches}
async function ensureProduct({productId,name,url,userId,credible,ciProductKey}){
  if(productId){const r=await query(`SELECT * FROM competitive_products WHERE id=$1 AND merged_into_id IS NULL`,[productId]);if(!r.rows.length)throw Object.assign(new Error('Competitive product not found.'),{status:404});return r.rows[0]}
  const identity=await findIdentity(name,url);if(identity.exactProductMatches.length)return (await query(`SELECT * FROM competitive_products WHERE id=$1`,[identity.exactProductMatches[0].id])).rows[0];
  const status=credible?'active':'draft',n=normalize(name);if(!n||n.length<3)throw Object.assign(new Error('A credible product identity is required.'),{status:400});
  const {rows}=await query(`INSERT INTO competitive_products(company_id,product_name,normalized_name,status,primary_website,relevant_ci_products,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[identity.companyMatch?.id||null,String(name).trim(),n,status,url||null,[ciProductKey||'cip'],userId]);return rows[0]
}
function findingRows(result){const rows=[];/* CI advantages remain in the raw run until separately supported by approved first-party knowledge. */for(const [category,items] of [['Architecture',result.diffs],['Inventory Execution',result.competitorPain]])for(const item of (items||[])){const claim=String(item.updated||item.text||'').trim();if(claim)rows.push({category:CATEGORIES.has(item.dimension)?item.dimension:category,claim,confidence:['high','medium','inferred'].includes(item.confidence)?item.confidence:'inferred',locator:item.sourceRef||null,support:item.confidence==='inferred'?'inferred':'direct',change:item.changed===false?'unchanged':'new'})}return rows}
async function persistResearch({productId,name,url,userId,ciProductKey,baseId,sourceType,result,model}){
  /* Trust boundary: callers may pass baseId only after centralized opportunity
     edit authorization. This service never treats a browser ID as permission. */
  ciProductKey=validateCiProductKey(ciProductKey);const credible=sourceType==='uploaded_document'||sourceType==='official_website';const product=await ensureProduct({productId,name:name||result.competitorName,url,userId,credible,ciProductKey});
  if(!credible)return {product,run:null,savedAsDraft:true};
  return transaction(async client=>{
    let source=null;if(url||sourceType==='uploaded_document'){const sr=await client.query(`INSERT INTO competitive_sources(product_id,source_type,source_name,source_url,website_domain,source_status,retrieved_at,created_by) VALUES($1,$2,$3,$4,$5,'proposed',NOW(),$6) RETURNING *`,[product.id,sourceType,sourceType==='uploaded_document'?'Uploaded research source':url,url||null,domain(url),userId]);source=sr.rows[0]}
    const vr=await client.query(`SELECT COALESCE(MAX(version),0)+1 version FROM competitive_research_runs WHERE product_id=$1 AND ci_product_key=$2`,[product.id,ciProductKey]);
    const run=(await client.query(`INSERT INTO competitive_research_runs(product_id,ci_product_key,opportunity_base_id,requested_by,version,completed_at,research_model,source_ids,research_status,result_json) VALUES($1,$2,$3,$4,$5,NOW(),$6,$7,'completed',$8) RETURNING *`,[product.id,ciProductKey,baseId||null,userId,vr.rows[0].version,model||null,source?[source.id]:[],result])).rows[0];
    const findings=findingRows(result);for(const f of findings)await client.query(`INSERT INTO competitive_findings(product_id,research_run_id,category,claim,confidence,source_id,source_locator,support_type,change_type,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'proposed')`,[product.id,run.id,f.category,f.claim,f.confidence,source?.id||null,f.locator,f.support,f.change]);
    await client.query(`UPDATE competitive_products SET status=CASE WHEN status='draft' THEN 'active' ELSE status END,last_researched_at=NOW(),updated_at=NOW() WHERE id=$1`,[product.id]);
    await client.query(`INSERT INTO competitive_recent_products(user_id,product_id,last_used_at) VALUES($1,$2,NOW()) ON CONFLICT(user_id,product_id) DO UPDATE SET last_used_at=NOW()`,[userId,product.id]);
    if(baseId)await client.query(`INSERT INTO competitive_opportunity_links(opportunity_base_id,product_id,ci_product_key,added_by) VALUES($1,$2,$3,$4) ON CONFLICT(opportunity_base_id,product_id,ci_product_key) DO UPDATE SET last_used_at=NOW(),status='active'`,[baseId,product.id,ciProductKey,userId]);
    return {product,run,source,findingCount:findings.length,savedAsDraft:false}
  })
}
module.exports={VALID_CI_PRODUCT_KEYS,validateCiProductKey,normalize,domain,normalizeProductUrl,classifyIdentity,freshness,findIdentity,findDuplicate,ensureProduct,persistResearch,CATEGORIES};
