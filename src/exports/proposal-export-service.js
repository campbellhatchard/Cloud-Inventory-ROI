'use strict';
const {loadExecutiveSource}=require('../shared/executive-source');
const {buildExecutiveOutputModel}=require('../shared/executive-output-model');
const {resolveProposalOutput}=require('../shared/proposal-output');

async function prepareProposalExport({user,scenarioId,internalDraft=false,reviewAcknowledged=false},dependencies={}){
 if(!scenarioId)throw Object.assign(new Error('A scenario is required for proposal export.'),{status:400});
 const source=dependencies.loadExecutiveSource
  ? await dependencies.loadExecutiveSource(user,scenarioId)
  : await loadExecutiveSource(user,scenarioId);
 if(source.error)throw Object.assign(new Error(source.error),{status:source.status});
 if(!source.proposal)throw Object.assign(new Error('Save the proposal before exporting.'),{status:409});
 const model=buildExecutiveOutputModel(source,{outputType:'proposal'}),story=model.story,readiness=model.readiness;
 const output=resolveProposalOutput(readiness,{internalDraft,reviewAcknowledged});
 return Object.freeze({source,model,story,proposal:source.proposal,readiness,output});
}
module.exports={prepareProposalExport};
