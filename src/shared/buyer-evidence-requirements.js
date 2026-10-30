'use strict';

/*
 * Buyer Evidence requirement authority.
 *
 * This registry describes how a requirement is proved and presented. The
 * evaluator remains responsible for completion; the browser receives this
 * projection and never recreates the business rules.
 */
const PROOF_TYPES=Object.freeze({DERIVED:'DERIVED',CUSTOMER_EVIDENCE:'CUSTOMER_EVIDENCE',HYBRID:'HYBRID'});
const SOURCE_CHOICES=Object.freeze(['Customer conversation','Email','Teams / video meeting','Onsite meeting','Customer document','Other']);

const baseFields=({stakeholderMode='mapped_or_free',customerConfirmed=true,extras=[]}={})=>[
 {id:'evidence',label:'What did the customer confirm?',type:'textarea',required:true,wide:true},
 {id:'stakeholder',label:'Who confirmed it?',type:'stakeholder',required:true,wide:true,mode:stakeholderMode},
 {id:'source',label:'How was it confirmed?',type:'source',required:true,choices:SOURCE_CHOICES},
 {id:'evidenceDate',label:'Evidence date — customer confirmed',type:'date',required:true},
 {id:'quality',label:'Evidence strength',type:'strength',required:true},
 ...(customerConfirmed?[{id:'customerValidated',label:'Customer directly confirmed this evidence',type:'checkbox',required:true,wide:true}]:[]),
 ...extras
];
const amount=(required=false,label='Amount / range')=>({id:'amount',label,type:'text',required,placeholder:'Enter the customer-confirmed amount or range'});
const timing=(required=false,label='Timing')=>({id:'timing',label,type:'text',required,placeholder:'Enter the customer-confirmed timing'});
const targetDate=(required=true,label='Target date')=>({id:'targetDate',label,type:'date',required});
const term=(required=true,label='Commercial term')=>({id:'term',label,type:'text',required,placeholder:'Example: 36 months'});

const derived=(sourceModule,navigationTarget,actionLabel,proves)=>({proofType:PROOF_TYPES.DERIVED,evidenceKey:null,sourceModule,navigationTarget,actionLabel,proves,fields:[],reuseGroup:null,prerequisites:[]});
const evidence=(sourceModule,navigationTarget,actionLabel,proves,options={})=>({proofType:PROOF_TYPES.CUSTOMER_EVIDENCE,evidenceKey:'self',sourceModule,navigationTarget,actionLabel,proves,fields:baseFields(options),reuseGroup:options.reuseGroup||'customer_confirmation',prerequisites:[]});
const hybrid=(sourceModule,navigationTarget,actionLabel,proves,prerequisites,options={})=>({proofType:PROOF_TYPES.HYBRID,evidenceKey:'self',sourceModule,navigationTarget,actionLabel,proves,fields:baseFields(options),reuseGroup:options.reuseGroup||'customer_confirmation',prerequisites});

const REQUIREMENTS=Object.freeze({
 economic_impact:derived('ROI Calculator','calc','Open ROI Calculator','Automatically evaluated from saved ROI value drivers and quantified annual customer benefit.'),
 current_baseline:derived('ROI Calculator','calc','Open ROI Calculator','Automatically evaluated from the current-state baseline inputs required by each active ROI value driver.'),
 future_state:evidence('Discovery','disc','Open Discovery','Customer confirms the desired future state and the measures that will define success.'),
 process_owner:hybrid('Stakeholder Map','stake','Open Stakeholder Map','Customer evidence identifies the accountable process owner, and that person is mapped and engaged in the Stakeholder Map.',[{key:'mapped_engaged_stakeholder',label:'Process owner mapped and engaged',required:true}],{stakeholderMode:'mapped_required'}),
 compelling_event:evidence('Buyer Evidence','readiness','Review Buyer Evidence','Customer confirms the compelling event, its date, and the consequence of missing it.',{extras:[targetDate(true,'Compelling-event date')]}),
 economic_ack:evidence('Buyer Evidence','readiness','Review Buyer Evidence','A named customer stakeholder confirms that the economic consequence is important enough to solve.'),

 funding:evidence('Buyer Evidence','readiness','Review Buyer Evidence','A customer funding authority confirms that funding is identified, approved, or committed.',{extras:[amount(false,'Funding amount / range')]}),
 budget:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the supported budget amount or range and currency.',{extras:[amount(true,'Budget amount / range')]}),
 funding_timing:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the funding release period or approval timing.',{extras:[timing(true,'Funding timing')]}),
 financial_authority:derived('Stakeholder Map','stake','Open Stakeholder Map','Automatically evaluated from an engaged Economic Buyer or funding authority in the Stakeholder Map.'),
 procurement_path:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the approval, purchase-order, procurement, or financing path.'),
 roi_funding:derived('ROI Calculator','calc','Open ROI Calculator','Automatically evaluated from the governed value case, modeled investment, and contract economics.'),

 criteria:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the decision criteria, priorities, and must-have outcomes.'),
 decision_process:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the evaluation and approval steps that will lead to a decision.'),
 decision_stakeholders:hybrid('Stakeholder Map','stake','Open Stakeholder Map','Customer evidence identifies the decision participants, and the validating stakeholder is mapped and engaged.',[{key:'stakeholder_map_present',label:'Decision stakeholders mapped',required:true},{key:'mapped_engaged_stakeholder',label:'Validating stakeholder mapped and engaged',required:true}],{stakeholderMode:'mapped_required'}),
 decision_timeline:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the target decision date and evaluation timing.',{extras:[targetDate(true,'Target decision date'),timing(false,'Evaluation timing')]}),
 solution_fit:derived('Solution Fit','solfit','Open Solution Fit','Automatically evaluated from the saved Solution Fit, selected workflows, Demo status, Fit status, gaps, dependencies, and readiness.'),

 workflows:derived('Solution Fit','solfit','Open Solution Fit','Automatically evaluated from customer validation of every selected Solution Fit workflow and its material gaps.'),
 criteria_addressed:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms that the proposed solution addresses the priority decision criteria.'),
 alternatives:evidence('Competitive Intelligence','comp','Open Competitive','The customer confirms the alternatives being evaluated, including status quo or internal build where relevant.'),
 proposal_alignment:evidence('Proposal','proposal','Open Proposal','The customer confirms that proposed scope and investment align to the agreed value and decision criteria.'),
 preference:evidence('Buyer Evidence','readiness','Review Buyer Evidence','A named buyer provides a credible preference signal for Cloud Inventory.'),

 selected:evidence('Buyer Evidence','readiness','Review Buyer Evidence','A named customer stakeholder confirms that Cloud Inventory has been selected.'),
 commercial:evidence('Proposal','proposal','Open Proposal','The customer confirms the agreed products, services, commercial term, and pricing or commercial structure.',{extras:[amount(false,'Commercial amount / range'),term(true,'Commercial term')]}),
 contract:evidence('Joint Project Plan','map','Open Joint Project Plan','The customer confirms the remaining contract, procurement, and security owners, status, and dates.',{extras:[timing(false,'Contract / procurement timing')]}),
 funding_reconfirmed:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer reconfirms that the Stage 3 funding evidence remains current.'),
 signature_date:evidence('Buyer Evidence','readiness','Review Buyer Evidence','The customer confirms the target signature date.',{extras:[targetDate(true,'Target signature date')]}),
 implementation:hybrid('Solution Fit','solfit','Open Solution Fit','Customer evidence confirms the implementation assumptions, and the saved Solution Fit & Handoff is Ready.',[{key:'solution_fit_ready',label:'Solution Fit & Handoff is Ready',required:true}])
});
const STAGE_BY_REQUIREMENT=Object.freeze({economic_impact:2,current_baseline:2,future_state:2,process_owner:2,compelling_event:2,economic_ack:2,funding:3,budget:3,funding_timing:3,financial_authority:3,procurement_path:3,roi_funding:3,criteria:4,decision_process:4,decision_stakeholders:4,decision_timeline:4,solution_fit:4,workflows:5,criteria_addressed:5,alternatives:5,proposal_alignment:5,preference:5,selected:6,commercial:6,contract:6,funding_reconfirmed:6,signature_date:6,implementation:6});

function getRequirementDefinition(id){
 const definition=REQUIREMENTS[id];
 if(!definition)throw new Error(`Missing Buyer Evidence requirement definition: ${id}`);
 return JSON.parse(JSON.stringify({...definition,stage:STAGE_BY_REQUIREMENT[id],requirementKey:id,evidenceKey:definition.evidenceKey==='self'?id:null}));
}
function requiredFieldIds(id){return getRequirementDefinition(id).fields.filter(field=>field.required).map(field=>field.id);}
function projectRequirementDefinition(criterion){
 const registered=!!REQUIREMENTS[criterion.id],definition=registered?getRequirementDefinition(criterion.id):{
  proofType:PROOF_TYPES.CUSTOMER_EVIDENCE,
  evidenceKey:criterion.id,
  sourceModule:'Buyer Evidence',
  navigationTarget:'readiness',
  actionLabel:'Review Buyer Evidence',
  proves:criterion.description||'Criterion-specific customer evidence proves this requirement.',
  fields:baseFields({customerConfirmed:!!criterion.customerValidation}),
  reuseGroup:'customer_confirmation',
  prerequisites:[],
  stage:null,
  requirementKey:criterion.id,
  registered:false
 };
 const fields=definition.fields.map(field=>field.id==='customerValidated'?{...field,required:!!criterion.customerValidation}:field);
 return {...definition,registered,label:criterion.name,description:criterion.description,minimumEvidenceStrength:criterion.minQuality||'weak',customerValidationRequired:!!criterion.customerValidation,fields,requiredFields:fields.filter(field=>field.required).map(field=>field.id)};
}

module.exports={PROOF_TYPES,SOURCE_CHOICES,REQUIREMENTS,STAGE_BY_REQUIREMENT,getRequirementDefinition,requiredFieldIds,projectRequirementDefinition};
