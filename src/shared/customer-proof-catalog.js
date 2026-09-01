'use strict';
/* R12 starts safely with no externally approved proof. Records are added only
   after Marketing/Legal supplies both provenance and explicit customer-use
   approval. Legacy browser claims are intentionally not copied here. */
const CUSTOMER_PROOF_CATALOG=Object.freeze([]);
const STATUS=new Set(['draft','approved','retired']),NAMING=new Set(['named','anonymized']);
const INDUSTRIES=new Set(['telecom','mfg','construction','oil','mining','distribution','food','retail','broad']);
const PRODUCTS=new Set(['cip','mep','cpp','epp']);
const USE_CASES=new Set(['inventory_accuracy','cycle_count','labor_productivity','field_inventory','traceability','working_capital','otif','receiving','picking']);
function validateRecord(r){
 if(!r||typeof r!=='object')throw Error('Customer proof record must be an object.');
 if(!r.id||!/^proof_[a-z0-9_]+$/.test(r.id))throw Error('Customer proof requires a stable proof_ id.');
 if(!STATUS.has(r.status))throw Error(`${r.id}: invalid status.`);if(!Number.isInteger(r.revision)||r.revision<1)throw Error(`${r.id}: revision is required.`);
 if(!NAMING.has(r.namingMode)||!r.displayName)throw Error(`${r.id}: approved display name and naming mode are required.`);
 for(const [values,allowed,label] of [[r.industryTags,INDUSTRIES,'industry'],[r.productTags,PRODUCTS,'product'],[r.useCaseTags,USE_CASES,'use case']])if(!Array.isArray(values)||values.some(x=>!allowed.has(x)))throw Error(`${r.id}: invalid ${label} tags.`);
 if(!r.headline||!r.result)throw Error(`${r.id}: headline and result are required.`);
 if(r.status==='approved'&&r.approval?.approvedForCustomerUse===true){if(!r.source?.type||!r.source?.title||!r.source?.locator||!r.source?.sourceOwner)throw Error(`${r.id}: external proof requires authoritative provenance.`);if(!r.approval.approvedBy||!r.approval.approvedAt||!r.approval.lastReviewedAt)throw Error(`${r.id}: external proof requires server-owned approval metadata.`);}
 return true;
}
function validateCatalog(records=CUSTOMER_PROOF_CATALOG){const ids=new Set();records.forEach(r=>{validateRecord(r);if(ids.has(r.id))throw Error(`Duplicate proof id: ${r.id}`);ids.add(r.id);});return true;}
function isCustomerSafe(r){return r?.status==='approved'&&r.approval?.approvedForCustomerUse===true;}
function safeProjection(r){return {id:r.id,revision:r.revision,displayName:r.displayName,namingMode:r.namingMode,industryTags:r.industryTags,productTags:r.productTags,useCaseTags:r.useCaseTags,headline:r.headline,result:r.result,metric:r.metric||'',sourceDisplay:r.source.customerSafeDisplay||r.source.type,sourceTitle:r.source.publicTitle||r.source.title,sourceUrl:r.source.publicUrl||null,sourceDate:r.source.publishedDate||null,lastReviewedAt:r.approval.lastReviewedAt};}
function approvedRecords(){return CUSTOMER_PROOF_CATALOG.filter(isCustomerSafe);}
function resolveApproved(ids){const wanted=new Set((ids||[]).map(String));return approvedRecords().filter(r=>wanted.has(r.id)).map(safeProjection);}
function validateSelection(ids){if(!Array.isArray(ids))throw Object.assign(Error('Customer proof selection must be an array.'),{status:400});const unique=[...new Set(ids.map(String))];if(unique.length>3)throw Object.assign(Error('Select no more than three customer proof points.'),{status:400});const approved=new Set(approvedRecords().map(r=>r.id));const invalid=unique.filter(id=>!approved.has(id));if(invalid.length)throw Object.assign(Error('One or more selected proof points are not approved for customer use.'),{status:400});return unique;}
function relevant({industry,product,useCase}={}){return approvedRecords().filter(r=>(!industry||r.industryTags.includes(industry)||r.industryTags.includes('broad'))&&(!product||r.productTags.includes(product))&&(!useCase||r.useCaseTags.includes(useCase))).slice(0,20).map(safeProjection);}
validateCatalog();
module.exports={CUSTOMER_PROOF_CATALOG,validateRecord,validateCatalog,isCustomerSafe,safeProjection,approvedRecords,resolveApproved,validateSelection,relevant};
