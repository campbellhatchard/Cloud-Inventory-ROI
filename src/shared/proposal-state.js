'use strict';

const TEXT_FIELDS=['company','preparedBy','proposalDate','validThrough','title','solution','contractTerm','situation','recommendation','outcome','whyAct','whyCloud','whyNow','timeline'];
const ARRAY_FIELDS=['scope','investment','success','nextSteps'];
function cleanText(value,max=8000){return String(value==null?'':value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').slice(0,max);}
function normalizeProposalDraft(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('A proposal draft object is required.'),{status:400});
  const out={};TEXT_FIELDS.forEach(k=>{out[k]=cleanText(input[k],k==='title'?300:8000);});
  ARRAY_FIELDS.forEach(k=>{const rows=Array.isArray(input[k])?input[k].slice(0,50):[];out[k]=rows.map(row=>{
    if(typeof row==='string')return cleanText(row,1000);
    if(!row||typeof row!=='object')return '';
    return Object.fromEntries(Object.entries(row).slice(0,10).map(([a,b])=>[cleanText(a,80),cleanText(b,1000)]));
  });});return out;
}
function proposalMeta(existing,{userId,scenarioId,scenarioVersion,sourceScenarioId=null,sourceScenarioVersion=null,carriedForward=false,storyRevisionReviewed=null}={}){
  const now=new Date().toISOString(),prior=existing&&typeof existing==='object'?existing:{};
  return {createdAt:prior.createdAt||now,createdBy:prior.createdBy||userId,updatedAt:now,updatedBy:userId,revision:(Number(prior.revision)||0)+1,sourceScenarioId:sourceScenarioId||prior.sourceScenarioId||scenarioId,sourceScenarioVersion:sourceScenarioVersion||prior.sourceScenarioVersion||scenarioVersion,storyRevisionReviewed:storyRevisionReviewed||prior.storyRevisionReviewed||null,...(carriedForward?{copiedForwardAt:now,reviewRecommended:true}: {})};
}
function snapshotProposal(data){return {proposalDraft:data?.proposalDraft||null,proposalMeta:data?.proposalMeta||null};}
module.exports={TEXT_FIELDS,ARRAY_FIELDS,normalizeProposalDraft,proposalMeta,snapshotProposal};
