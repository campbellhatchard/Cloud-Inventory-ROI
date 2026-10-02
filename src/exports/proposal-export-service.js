'use strict';
const {loadExecutiveSource}=require('../shared/executive-source');
const {buildExecutiveValueStory}=require('../shared/executive-value-story');
const {evaluateExecutiveOutputReadiness}=require('../shared/executive-output-readiness');
const {resolveProposalOutput}=require('../shared/proposal-output');

async function prepareProposalExport({user,scenarioId,internalDraft=false,reviewAcknowledged=false}){
 if(!scenarioId)throw Object.assign(new Error('A scenario is required for proposal export.'),{status:400});
 const source=await loadExecutiveSource(user,scenarioId);
 if(source.error)throw Object.assign(new Error(source.error),{status:source.status});
 if(!source.proposal)throw Object.assign(new Error('Save the proposal before exporting.'),{status:409});
 const story=buildExecutiveValueStory(source);
 const readiness=evaluateExecutiveOutputReadiness(story,{outputType:'proposal'});
 const output=resolveProposalOutput(readiness,{internalDraft,reviewAcknowledged});
 return Object.freeze({source,story,proposal:source.proposal,readiness,output});
}
module.exports={prepareProposalExport};
