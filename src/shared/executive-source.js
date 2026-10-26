'use strict';
const {query}=require('../db');
const {scenarioAccess}=require('../authorization');
const {buildCustomerROIReportData}=require('./customer-roi-report');
const {buildExecutiveOutputModel}=require('./executive-output-model');

function createExecutiveSourceLoader(dependencies={query,scenarioAccess}){return async function load(user,id){
 const {query,scenarioAccess}=dependencies;
 const access=await scenarioAccess(user,id,'view');
 if(!access.exists)return {error:'Scenario not found.',status:404};
 if(!access.allowed)return {error:'Access denied.',status:403};
 const scenarioResult=await query(`SELECT s.*,u.username owner_username FROM scenarios s JOIN users u ON u.id=s.owner_id WHERE s.id=$1 AND s.deleted_at IS NULL`,[id]);
 if(!scenarioResult.rows.length)return {error:'Scenario not found.',status:404};
 const scenario=scenarioResult.rows[0];
 const [governance,stakeholders,discovery,handoff,plans,valueHistory]=await Promise.all([
  query('SELECT evidence FROM scenario_stage_governance WHERE scenario_id=$1',[scenario.id]),
  query('SELECT id,name,title,role,engaged FROM stakeholders WHERE owner_id=$1 AND LOWER(company)=LOWER($2)',[scenario.owner_id,scenario.company]),
  query(`SELECT a.question_id,a.answer_text answer,'prospect_submission' entered_by,s.submitted_at updated_at,s.submitted_at,s.id submission_id,s.submission_number,s.source_scenario_id,s.source_scenario_version,(s.id=(SELECT id FROM discovery_submissions WHERE base_id=$1 ORDER BY submitted_at DESC,submission_number DESC LIMIT 1)) is_latest FROM discovery_submissions s JOIN discovery_submission_answers a ON a.submission_id=s.id WHERE s.base_id=$1 ORDER BY s.submitted_at DESC,s.submission_number DESC`,[scenario.base_id]),
  scenario.customer_id?query('SELECT h.data,h.primary_se_id,pse.username primary_se_name,h.readiness,h.status FROM handoffs h LEFT JOIN users pse ON pse.id=h.primary_se_id WHERE h.customer_id=$1 AND h.deleted_at IS NULL',[scenario.customer_id]):Promise.resolve({rows:[]}),
  query(`SELECT title,milestones,updated_at FROM mutual_action_plans WHERE scenario_id=$1 OR (owner_id=$2 AND LOWER(company)=LOWER($3)) ORDER BY (scenario_id=$1) DESC,updated_at DESC LIMIT 1`,[scenario.id,scenario.owner_id,scenario.company]),
  query(`SELECT x.canonical_input,x.normalized_value scenario_value,x.field_state,e.id event_id,e.normalized_value customer_value,e.event_type,e.evidence_date,e.created_at event_created_at FROM scenario_roi_value_snapshots x LEFT JOIN LATERAL(SELECT * FROM roi_value_events v WHERE v.base_id=x.base_id AND v.canonical_input=x.canonical_input AND v.event_type IN('prospect_submitted','customer_revalidated','customer_provided','legacy_prospect_recovered') ORDER BY COALESCE(v.evidence_date,v.created_at::date) DESC,v.created_at DESC LIMIT 1)e ON TRUE WHERE x.scenario_id=$1`,[scenario.id])
 ]);
 return {scenario,governance:governance.rows[0]||{},stakeholders:stakeholders.rows,discovery:discovery.rows,solutionFit:handoff.rows[0]||null,jointProjectPlan:plans.rows[0]||null,proposal:scenario.data?.proposalDraft||null,valueHistory:valueHistory.rows};
};}
const loadExecutiveSource=createExecutiveSourceLoader();
async function executiveOutputModelFor(user,id,options={}){const source=await loadExecutiveSource(user,id);return source.error?source:buildExecutiveOutputModel(source,options);}
async function executiveStoryFor(user,id){const model=await executiveOutputModelFor(user,id,{outputType:'executive_view'});return model.error?model:model.story;}
async function executiveReportFor(user,id,options={}){const source=await loadExecutiveSource(user,id);if(source.error)return source;const outputModel=buildExecutiveOutputModel(source,{outputType:options.outputType||'pdf'});return{...buildCustomerROIReportData(source,{story:outputModel.story}),outputModel};}
module.exports={createExecutiveSourceLoader,loadExecutiveSource,executiveOutputModelFor,executiveStoryFor,executiveReportFor};
