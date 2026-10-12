(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CIExecutiveOutputPreconditions=api;
}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function inspectExecutiveOutputState(state={},options={}){
    const isRoiAssumptions=options.outputType==='roi_assumptions';
    const label=options.outputType==='pdf'?'the PDF':options.outputType==='pptx'?'the Executive PowerPoint':options.outputType==='docx'?'the Executive Word document':isRoiAssumptions?'the ROI Assumptions & Results Summary':'an Executive output';
    if(!state.scenarioId)return{ok:false,code:'SCENARIO_REQUIRED',message:`Save the scenario before creating ${label}.`};
    if(state.calculatorDirty||Number(state.appliedValueDraftCount||0)>0)return{ok:false,code:'CALCULATOR_SAVE_REQUIRED',message:isRoiAssumptions?'Save the current scenario before generating the ROI Assumptions & Results Summary.':`Save the updated ROI as a new scenario version before creating ${label}.`};
    return{ok:true,code:'SAVED_SCENARIO',message:''};
  }
  return Object.freeze({inspectExecutiveOutputState});
}));
