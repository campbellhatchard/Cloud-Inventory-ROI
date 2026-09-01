/* Live presentation governance. This never writes or changes BuyCycle state. */
const OUTPUTS=new Set(['executive_view','pdf','pptx','proposal','share']);
const issue=(id,category,title,detail,fixAction)=>({id,category,title,detail,fixAction});
function finiteEconomics(e={}){return['annualBenefit','totalContractBenefit','totalContractInvestment','netEconomicBenefit','contractRoi','npv'].every(k=>Number.isFinite(Number(e[k])))&&(e.payback===null||Number.isFinite(Number(e.payback)));}
function evaluateExecutiveOutputReadiness(story,{outputType='executive_view',proposalState={}}={}){
 if(!OUTPUTS.has(outputType))throw Object.assign(new Error('Unsupported executive output type.'),{status:400});
 const blockers=[],warnings=[],strengths=[],why=story.threeWhys||{},e=story.economics||{};
 if(!story.meta?.scenarioId)blockers.push(issue('unsaved','value_story','Unsaved opportunity','Save the opportunity before creating a clean customer output.','Save scenario'));
 if(!story.meta?.customer||['prospect','your company'].includes(String(story.meta.customer).toLowerCase()))blockers.push(issue('customer','value_story','Customer name required','Select or enter the correct customer.','Edit customer'));
 for(const [key,label] of [['whyChange','Why Change'],['whyNow','Why Now'],['whyCloudInventory','Why Cloud Inventory']])if(!why[key]||why[key].status==='To validate'||why[key].value==='To validate')blockers.push(issue(key,'value_story',`${label} is missing`,'The executive narrative is structurally incomplete.','Edit Three Whys'));
 if(!finiteEconomics(e))blockers.push(issue('financial_validity','economics','Financial model is not valid','One or more canonical financial values cannot be interpreted.','Review ROI Inputs'));
 if(Number(e.maturity?.level)<2)blockers.push(issue('roi_maturity','economics','Customer data is required','ROI Maturity must reach Level 2 — Customer Data for clean customer sharing.','Review ROI Inputs'));
 const assumptions=(e.activeDrivers||[]).filter(d=>!d.customerSupported);if(assumptions.length)warnings.push(issue('assumption_drivers','economics','Value drivers require validation',assumptions.map(d=>d.label).join(', '),'Review ROI Inputs'));
 const valueWarnings=e.valueHistoryWarnings||[];if(valueWarnings.length)warnings.push(issue('value_history','economics','Material values need evidence review',valueWarnings.map(v=>`${v.canonicalInput}: ${v.different?'model differs from latest customer value':v.status}`).join(', '),'Open Value History'));
 if(!(e.activeDrivers||[]).length)warnings.push(issue('no_value','economics','No modeled economic benefit established','No positive value driver is currently active.','Review ROI Inputs'));
 if(!story.solutionAlignment?.exists)warnings.push(issue('solution_fit','solution_delivery','Solution alignment is limited','Solution Fit has not been saved; no architecture is inferred.','Open Solution Fit'));
 if(Number(story.implementationContext?.modelingMonths)>0&&!story.implementationContext?.authoritativeDeliveryCommitment)warnings.push(issue('implementation_assumption','solution_delivery','Implementation timing is model-only','Timing is an ROI modeling assumption, not a delivery commitment.','Review Solution Fit'));
 if(!story.nextSteps?.items?.length)warnings.push(issue('joint_next_steps','next_steps','Joint next steps have not yet been agreed','No saved Joint Project Plan milestone is available.','Open Joint Project Plan'));
 if(story.unavailableProofIds?.length)blockers.push(issue('customer_proof','proof','Selected customer proof is unavailable','A selected proof record is retired, unapproved, or missing. It will not render.','Review Customer Proof'));
 if(Number(e.maturity?.level)>=2)strengths.push({id:'customer_data',title:e.maturity.display,detail:`${e.customerSupportedValuePct}% of annual modeled value is customer supported.`});
 if(story.nextSteps?.items?.length)strengths.push({id:'joint_plan',title:'Joint next steps documented',detail:`${story.nextSteps.items.length} active milestone(s).`});
 if(outputType==='proposal'){
  if(!story.proposalContext?.exists)blockers.push(issue('proposal_missing','proposal','Proposal is not saved','Save the proposal before exporting.','Open Proposal'));
  if(proposalState.saveFailed||proposalState.conflict)blockers.push(issue('proposal_state','proposal','Proposal changes are unresolved',proposalState.conflict?'Resolve the proposal revision conflict.':'Retry the failed proposal save.','Open Proposal'));
  const reviewed=proposalState.storyRevisionReviewed||story.proposalContext?.storyRevisionReviewed;
  if(!reviewed)warnings.push(issue('proposal_story_unreviewed','proposal','Value Story Has Not Been Reviewed','This Proposal has not yet been reviewed against the current Executive Value Story.','Refresh Value Story'));
  else if(reviewed!==story.storyRevision)warnings.push(issue('proposal_story_stale','proposal','Value Story Updated','The proposal was last reviewed against an earlier value story.','Refresh Value Story'));
 }
 return{status:blockers.length?'draft_only':warnings.length?'review':'ready',label:blockers.length?'Draft Only':warnings.length?'Review Before Sharing':'Ready to Share',blockers,warnings,strengths,outputType,storyRevision:story.storyRevision};
}
module.exports={OUTPUTS,finiteEconomics,evaluateExecutiveOutputReadiness};
