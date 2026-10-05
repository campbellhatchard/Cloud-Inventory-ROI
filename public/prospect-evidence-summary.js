'use strict';

/* A single presentation authority for Prospect evidence review counts.
 * The server owns row status; browser surfaces must not reconstruct status
 * from mutable calculator state or from a second Value History projection. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CIProspectEvidenceSummary=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function summarize(review){
    const rows=Array.isArray(review?.rows)?review.rows:[];
    const availableRows=rows.filter(row=>row?.status==='AVAILABLE');
    const appliedRows=rows.filter(row=>row?.status==='APPLIED');
    return {
      mappedCount:rows.length,
      appliedCount:appliedRows.length,
      pendingReviewCount:availableRows.length,
      pendingCanonicalInputs:availableRows.map(row=>row.canonicalInput).filter(Boolean)
    };
  }

  function pendingMessage(summary){
    const count=Number(summary?.pendingReviewCount)||0;
    if(!count)return '';
    return count+' prospect-verified value'+(count===1?' has':'s have')+' not been applied to this working business case.';
  }

  return {summarize,pendingMessage};
});
