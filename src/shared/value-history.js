'use strict';
const { INPUTS } = require('./questionnaire-roi-registry');
const FINANCIAL_INPUTS=Object.freeze(Object.keys(INPUTS));
const CUSTOMER_EVENTS=new Set(['prospect_submitted','customer_revalidated','customer_provided','legacy_prospect_recovered']);
const EVENT_TYPES=new Set(['prospect_submitted','customer_revalidated','customer_provided','rep_updated','legacy_scenario_snapshot','legacy_prospect_recovered']);
const FRESH_DAYS=90,AGING_FROM_DAYS=60;
function normalizeValue(value){if(value===null||value===undefined||value==='')return null;const n=Number(String(value).replace(/[$,%\s]/g,'').replace(/,/g,''));return Number.isFinite(n)?n:null;}
function sameValue(a,b){const x=normalizeValue(a),y=normalizeValue(b);return x===null||y===null?String(a??'').trim()===String(b??'').trim():Math.abs(x-y)<=Math.max(.000001,Math.abs(y)*1e-9);}
function freshness(date,now=new Date()){if(!date)return{status:'Needs Review',days:null,customerSupported:false};const days=Math.max(0,Math.floor((now-new Date(date))/86400000));return{status:days>FRESH_DAYS?'Stale':days>=AGING_FROM_DAYS?'Aging':'Current',days,customerSupported:days<=FRESH_DAYS};}
function isFinancialInput(input){return FINANCIAL_INPUTS.includes(input);}
function isCustomerEvent(event){return CUSTOMER_EVENTS.has(event?.event_type||event?.eventType);}
function unitFor(input){return INPUTS[input]?.[1]||null;}
function buildSnapshotRows(data={}){const states=data.fieldStates||{},provenance=data.fieldProvenance||{};return FINANCIAL_INPUTS.filter(k=>Object.prototype.hasOwnProperty.call(data,k)&&data[k]!==''&&data[k]!==null&&data[k]!==undefined).map(k=>({canonicalInput:k,valueText:String(data[k]),normalizedValue:normalizeValue(data[k]),unit:unitFor(k),currency:data.currency||null,fieldState:states[k]||'estimated',provenance:provenance[k]||{},originEventId:provenance[k]?.eventId||null}));}
function enforceProvenance(row,event){const p={...(row.provenance||{})};if(!['confirmed_prospect','confirmed_customer'].includes(row.fieldState))return row;if(!event||!isCustomerEvent(event)||!sameValue(row.normalizedValue,event.normalized_value??event.normalizedValue))return{...row,fieldState:'estimated',provenance:{state:'estimated',source:'Rep updated — needs customer validation'}};return row;}
function summarize(events=[],snapshot=null,now=new Date()){const sorted=[...events].sort((a,b)=>new Date(b.evidence_date||b.created_at)-new Date(a.evidence_date||a.created_at));const supported=sorted.find(isCustomerEvent)||null;return{valueUsed:snapshot||null,latestEvent:sorted[0]||null,latestCustomerSupported:supported,supportedFreshness:supported?freshness(supported.evidence_date||supported.created_at,now):freshness(null,now),events:sorted};}
module.exports={FINANCIAL_INPUTS,CUSTOMER_EVENTS,EVENT_TYPES,FRESH_DAYS,AGING_FROM_DAYS,normalizeValue,sameValue,freshness,isFinancialInput,isCustomerEvent,unitFor,buildSnapshotRows,enforceProvenance,summarize};
