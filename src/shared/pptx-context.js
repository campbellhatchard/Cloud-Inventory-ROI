/* R13 compatibility adapter. It reshapes the authoritative Executive Value
   Story for the PowerPoint layout and contains no business-story logic. */
const {buildExecutiveValueStory,maturityHeading,safeSolutionFit,ownerLabel}=require('./executive-value-story');
const {resolveApproved}=require('./customer-proof-catalog');
function buildPptxContext(input={}){
 const story=input.story||buildExecutiveValueStory({...input,solutionFit:input.solutionFit||input.handoff,jointProjectPlan:input.jointProjectPlan||input.plan});
 const proof=story.customerProof||resolveApproved(input.scenario?.data?.customerProofSelection||[]);
 return{...story,
  customerProof:proof,
  scenario:{id:story.meta.scenarioId,name:input.scenario?.name||'',company:story.meta.customer,industry:story.meta.industry,solution:story.meta.solution,currency:story.meta.currency,preparedBy:story.meta.preparedBy,saved:true},
  threeWhys:{whyChange:story.threeWhys.whyChange.value==='To validate'?'':story.threeWhys.whyChange.value,whyNow:story.threeWhys.whyNow.value==='To validate'?'':story.threeWhys.whyNow.value,whyCloudInventory:story.threeWhys.whyCloudInventory.value==='To validate'?'':story.threeWhys.whyCloudInventory.value},
  discovery:{answers:(Array.isArray(input.discovery)?input.discovery.map(x=>({id:String(x.question_id||''),text:String(x.answer||''),status:x.entered_by==='prospect'?'Customer confirmed':'Needs validation'})).filter(x=>x.text):story.currentState.facts.map(x=>({...x,status:x.status==='Assumption — validate'?'Needs validation':x.status}))),rootCauses:story.currentState.facts.filter(x=>['dq3','dq4','dq5'].includes(x.id)).slice(0,3).map(x=>({questionId:x.id,statement:x.text,status:x.status,title:'Operational issue'})),currentStateFacts:story.currentState.facts.map(x=>({statement:x.text,status:x.status}))},
  economics:{...story.economics,maturity:{...story.economics.maturity,heading:story.economics.maturity.display},totalContractNetBenefit:story.economics.netEconomicBenefit,totalContractNpv:story.economics.npv,contractPayback:story.economics.payback,activeDrivers:story.economics.activeDrivers.map(d=>({...d,name:d.label,evidenceStatus:d.customerSupported?'Customer supported':'Assumption — validate'}))},
  solutionFit:{...story.solutionAlignment,priorityWorkflows:story.solutionAlignment.priorityWorkflows.map(w=>({name:w.name,customerValidated:w.status==='Customer validated'}))},
  implementation:story.implementationContext,
  jointProjectPlan:{exists:story.nextSteps.items.length>0,title:input.jointProjectPlan?.title||input.plan?.title||'',milestones:story.nextSteps.items.map(({milestone,owner,dueDate})=>({milestone,owner,dueDate}))},
  governance:{projection:'customer-safe'}
 };
}
module.exports={buildPptxContext,maturityHeading,safeSolutionFit,ownerLabel};
