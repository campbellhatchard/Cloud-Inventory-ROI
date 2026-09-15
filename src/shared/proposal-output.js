'use strict';
function resolveProposalOutput(readiness,{internalDraft=false,reviewAcknowledged=false}={}){
 if(!readiness||!['ready','review','draft_only'].includes(readiness.status))throw Object.assign(new Error('Invalid Proposal readiness result.'),{status:500});
 if(readiness.status==='draft_only'&&!internalDraft)throw Object.assign(new Error('This proposal is Draft Only. Resolve blockers or explicitly export an internal draft.'),{status:409,readiness});
 if(readiness.status==='review'&&!reviewAcknowledged)throw Object.assign(new Error('Review acknowledgement is required before export.'),{status:409,readiness});
 const draft=readiness.status==='draft_only',audience=draft?'internal':'customer';
 return Object.freeze({draft,audience,customerSafe:!draft,classification: draft?['CONFIDENTIAL — INTERNAL USE ONLY','DRAFT — NOT READY FOR CUSTOMER SHARING']:['Confidential and Proprietary']});
}
function proposalFilename(customer,{draft=false,extension='docx'}={}){const safe=String(customer||'Prospect').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'Prospect';return `Cloud-Inventory-${draft?'Internal-Draft-Proposal':'Proposal'}-${safe}-${new Date().toISOString().slice(0,10)}.${extension}`;}
const customerCommercialTerms='To be provided through the governed commercial process.';
module.exports={resolveProposalOutput,proposalFilename,customerCommercialTerms};
