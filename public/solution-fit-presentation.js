(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SolutionFitPresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const text=value=>String(value==null?'':value).trim();
 function normalizeCustomApplicationName(value){return text(value);}
 function primarySePresentation({candidates=[],primarySeId=null,primarySeName='',viewerId=null,canAssignOthers=false}={}){
  const assignedId=text(primarySeId),selfId=text(viewerId),rows=Array.isArray(candidates)?candidates:[];
  const assignable=canAssignOthers?rows:rows.filter(candidate=>text(candidate.id)===selfId);
  const assignedInOptions=!!assignedId&&assignable.some(candidate=>text(candidate.id)===assignedId);
  return Object.freeze({
   assignable,
   assignedId,
   assignedName:text(primarySeName),
   includeCurrentAssignment:!!assignedId&&!assignedInOptions,
   assignmentLocked:!canAssignOthers&&!!assignedId&&assignedId!==selfId
  });
 }
 return Object.freeze({normalizeCustomApplicationName,primarySePresentation});
});
