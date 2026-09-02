/* ═══════════════════════════════════════════════════════════════════
   src/routes/scenarios.js  —  Scenario persistence API

   GET    /api/scenarios               — list user's scenarios (current versions)
   POST   /api/scenarios               — save (new or new version)
   GET    /api/scenarios/:id           — single scenario
   GET    /api/scenarios/:id/versions  — all versions for a base_id
   PATCH  /api/scenarios/:id/narrative — autosave executive Three Whys
   PATCH  /api/scenarios/:id/share     — share with other users
   DELETE /api/scenarios/:id           — soft-delete one version
   DELETE /api/scenarios/group/:baseId — soft-delete all versions of a group

   Admin: GET /api/scenarios?all=true returns all users' scenarios.
   ═══════════════════════════════════════════════════════════════════ */

const express   = require('express');
const { query, transaction } = require('../db');
const { log, ACTIONS } = require('../audit');
const { requireAuth, hasRole } = require('../middleware/auth');
const { calcROI } = require('../shared/roi-engine');
const { ensureCustomer } = require('../customers');
const { hasPermission, scenarioAccess, customerScopeSql } = require('../authorization');
const { BUYCYCLE_MIN_STAGE, parseBuyCycleStage, getBuyCycleStageLabel } = require('../shared/buycycle-stage');
const { parseOpportunityValue, validateOpportunityCurrency, buildOpportunityProfile } = require('../shared/opportunity-value');
const { normalizeProposalDraft, proposalMeta } = require('../shared/proposal-state');
const { validateSelection, resolveApproved, relevant } = require('../shared/customer-proof-catalog');
const { buildPptxContext } = require('../shared/pptx-context');
const { buildExecutiveValueStory } = require('../shared/executive-value-story');
const { evaluateExecutiveOutputReadiness } = require('../shared/executive-output-readiness');
const { buildExecutivePptx } = require('../exports/executive-pptx');
const { FINANCIAL_INPUTS, EVENT_TYPES, normalizeValue, sameValue, freshness, isFinancialInput, isCustomerEvent, unitFor, buildSnapshotRows, enforceProvenance, summarize } = require('../shared/value-history');

const router = express.Router();
router.use(requireAuth);

async function authorizedScenario(user,id,mode='view'){
  const access=await scenarioAccess(user,id,mode);
  if(!access.exists)return{error:'Scenario not found.',status:404};
  if(!access.allowed)return{error:'Access denied.',status:403};
  const {rows}=await query(`SELECT s.id,s.base_id,s.version,s.is_current,s.owner_id,s.customer_id,s.company,s.data,s.created_at,s.outcome,g.outcome governed_outcome FROM scenarios s LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id WHERE s.id=$1 AND s.deleted_at IS NULL`,[id]);
  return rows[0]||{error:'Scenario not found.',status:404};
}

async function captureScenarioValueHistory(client,{scenario,sourceScenarioId,data,userId}){
  const rows=buildSnapshotRows(data),ids=rows.map(x=>x.originEventId).filter(Boolean);
  const events=ids.length?(await client.query(`SELECT * FROM roi_value_events WHERE id=ANY($1::uuid[]) AND base_id=$2`,[ids,scenario.base_id])).rows:[];
  const byId=new Map(events.map(e=>[String(e.id),e]));
  const prior=sourceScenarioId?(await client.query(`SELECT * FROM scenario_roi_value_snapshots WHERE scenario_id=$1`,[sourceScenarioId])).rows:[];
  const priorByInput=new Map(prior.map(x=>[x.canonical_input,x]));
  const fieldStates={...(data.fieldStates||{})},fieldProvenance={...(data.fieldProvenance||{})};
  for(let row of rows){
    row=enforceProvenance(row,byId.get(String(row.originEventId)));
    const old=priorByInput.get(row.canonicalInput),changed=old&&!sameValue(old.normalized_value??old.value_text,row.normalizedValue??row.valueText);
    let origin=row.originEventId&&byId.has(String(row.originEventId))?row.originEventId:null;
    if((changed||!old)&&!origin){
      const created=await client.query(`INSERT INTO roi_value_events(base_id,canonical_input,event_type,value_text,normalized_value,currency,unit,source_scenario_id,source_scenario_version,evidence_source,evidence_date,actor_user_id,provenance_state) VALUES($1,$2,'rep_updated',$3,$4,$5,$6,$7,$8,'Scenario save',CURRENT_DATE,$9,'estimated') RETURNING id`,[scenario.base_id,row.canonicalInput,row.valueText,row.normalizedValue,row.currency,row.unit,scenario.id,scenario.version,userId]);
      origin=created.rows[0].id;row.fieldState='estimated';row.provenance={state:'estimated',eventId:origin,source:'Rep updated — needs customer validation',date:new Date().toISOString().slice(0,10)};
    }else if(!changed&&old?.origin_event_id&&!origin){origin=old.origin_event_id;row.provenance=old.provenance||row.provenance;row.fieldState=old.field_state||row.fieldState;}
    fieldStates[row.canonicalInput]=row.fieldState;fieldProvenance[row.canonicalInput]={...(row.provenance||{}),eventId:origin||undefined};
    await client.query(`INSERT INTO scenario_roi_value_snapshots(scenario_id,base_id,scenario_version,canonical_input,value_text,normalized_value,unit,currency,field_state,provenance,origin_event_id,captured_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[scenario.id,scenario.base_id,scenario.version,row.canonicalInput,row.valueText,row.normalizedValue,row.unit,row.currency,row.fieldState,JSON.stringify(fieldProvenance[row.canonicalInput]),origin,scenario.created_at||new Date()]);
  }
  await client.query(`UPDATE scenarios SET data=jsonb_set(jsonb_set(data,'{fieldStates}',$2::jsonb,true),'{fieldProvenance}',$3::jsonb,true) WHERE id=$1`,[scenario.id,JSON.stringify(fieldStates),JSON.stringify(fieldProvenance)]);
}

async function loadExecutiveSource(user,id){
    const access=await scenarioAccess(user,id,'view');
    if(!access.exists)return {error:'Scenario not found.',status:404};
    if(!access.allowed)return {error:'Access denied.',status:403};
    const scenarioResult=await query(`SELECT s.*,u.username owner_username FROM scenarios s JOIN users u ON u.id=s.owner_id WHERE s.id=$1 AND s.deleted_at IS NULL`,[id]);
    if(!scenarioResult.rows.length)return {error:'Scenario not found.',status:404};
    const scenario=scenarioResult.rows[0];
    const [governance,stakeholders,discovery,handoff,plans,valueHistory]=await Promise.all([
      query('SELECT evidence FROM scenario_stage_governance WHERE scenario_id=$1',[scenario.id]),
      query('SELECT id,name,title,role,engaged FROM stakeholders WHERE owner_id=$1 AND LOWER(company)=LOWER($2)',[scenario.owner_id,scenario.company]),
      query(`SELECT DISTINCT ON (a.question_id) a.question_id,a.answer,a.entered_by,a.updated_at FROM discovery_answers a JOIN discovery_sessions d ON d.id=a.session_id WHERE d.scenario_id=$1 ORDER BY a.question_id,a.updated_at DESC`,[scenario.id]),
      scenario.customer_id?query('SELECT data FROM handoffs WHERE customer_id=$1 AND deleted_at IS NULL',[scenario.customer_id]):Promise.resolve({rows:[]}),
      query(`SELECT title,milestones,updated_at FROM mutual_action_plans WHERE scenario_id=$1 OR (owner_id=$2 AND LOWER(company)=LOWER($3)) ORDER BY (scenario_id=$1) DESC,updated_at DESC LIMIT 1`,[scenario.id,scenario.owner_id,scenario.company]),
      query(`SELECT x.canonical_input,x.normalized_value scenario_value,x.field_state,e.id event_id,e.normalized_value customer_value,e.event_type,e.evidence_date,e.created_at event_created_at FROM scenario_roi_value_snapshots x LEFT JOIN LATERAL(SELECT * FROM roi_value_events v WHERE v.base_id=x.base_id AND v.canonical_input=x.canonical_input AND v.event_type IN('prospect_submitted','customer_revalidated','customer_provided','legacy_prospect_recovered') ORDER BY COALESCE(v.evidence_date,v.created_at::date) DESC,v.created_at DESC LIMIT 1)e ON TRUE WHERE x.scenario_id=$1`,[scenario.id])
    ]);
    return {scenario,governance:governance.rows[0]||{},stakeholders:stakeholders.rows,discovery:discovery.rows,solutionFit:handoff.rows[0]||null,jointProjectPlan:plans.rows[0]||null,proposal:scenario.data?.proposalDraft||null,valueHistory:valueHistory.rows};
}
async function executiveStoryFor(user,id){const source=await loadExecutiveSource(user,id);return source.error?source:buildExecutiveValueStory(source);}

router.get('/:id/executive-value-story',async(req,res)=>{try{const story=await executiveStoryFor(req.user,req.params.id);if(story.error)return res.status(story.status).json({error:story.error});res.json(story);}catch(err){console.error('Executive Value Story error:',err.message);res.status(500).json({error:'Failed to build Executive Value Story.'});}});
router.get('/:id/executive-output-readiness',async(req,res)=>{try{const story=await executiveStoryFor(req.user,req.params.id);if(story.error)return res.status(story.status).json({error:story.error});res.json(evaluateExecutiveOutputReadiness(story,{outputType:String(req.query.output||'executive_view')}));}catch(err){res.status(err.status||500).json({error:err.message||'Failed to evaluate executive output readiness.'});}});
router.post('/:id/executive-output-readiness/acknowledge',async(req,res)=>{try{const story=await executiveStoryFor(req.user,req.params.id);if(story.error)return res.status(story.status).json({error:story.error});const outputType=String(req.body?.outputType||'pptx'),readiness=evaluateExecutiveOutputReadiness(story,{outputType});if(readiness.status!=='review')return res.status(409).json({error:'Acknowledgement is only available for Review Before Sharing outputs.',readiness});await log({userId:req.user.id,action:'executive_output.review_acknowledged',entityType:'scenario',entityId:req.params.id,detail:{outputType,storyRevision:story.storyRevision,warningIds:readiness.warnings.map(x=>x.id)},ipAddress:req.ip});res.json({acknowledged:true,storyRevision:story.storyRevision});}catch(err){res.status(500).json({error:'Failed to record review acknowledgement.'});}});

router.get('/:id/export-pptx',async(req,res)=>{
  const started=Date.now(),scenarioId=String(req.params.id),internalDraft=req.query.internalDraft==='true',reviewAcknowledged=req.query.reviewAcknowledged==='true';
  console.info('executive_pptx.started',{scenarioId,internalDraft});
  try{
    const story=await executiveStoryFor(req.user,scenarioId);
    if(story.error)return res.status(story.status).json({error:story.error});
    const readiness=evaluateExecutiveOutputReadiness(story,{outputType:'pptx'});
    if(readiness.status==='draft_only'&&!internalDraft)return res.status(409).json({error:'This output is available only as an internal draft.',readiness});
    if(readiness.status==='review'&&!reviewAcknowledged)return res.status(409).json({error:'Review acknowledgement is required before export.',readiness});
    const buffer=await buildExecutivePptx(story,{internalDraft:readiness.status==='draft_only'||internalDraft});
    const customer=String(story.meta.customer||'Prospect').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,80)||'Prospect';
    res.set('Content-Type','application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.set('Content-Disposition',`attachment; filename="Cloud-Inventory-Business-Case-${customer}-${new Date().toISOString().slice(0,10)}.pptx"`);
    res.set('X-Executive-Readiness',readiness.status);
    console.info('executive_pptx.completed',{scenarioId,status:readiness.status,bytes:buffer.length,elapsedMs:Date.now()-started});
    return res.send(buffer);
  }catch(err){
    const errorId=`pptx-${Date.now().toString(36)}`;
    console.error('executive_pptx.failed',{scenarioId,errorId,elapsedMs:Date.now()-started,message:err.message});
    return res.status(500).json({error:'PowerPoint could not be generated. Please retry.',errorId});
  }
});

/* Thin R13 compatibility adapter over the one authoritative story. */
router.get('/:id/pptx-context',async(req,res)=>{
  try{const source=await loadExecutiveSource(req.user,req.params.id);if(source.error)return res.status(source.status).json({error:source.error});const story=buildExecutiveValueStory(source);res.json(buildPptxContext({story,scenario:source.scenario,jointProjectPlan:source.jointProjectPlan}));
  }catch(err){console.error('PowerPoint context error:',err.message);res.status(500).json({error:'Failed to build PowerPoint context.'});}
});

/* ── Shared columns (never return full JSONB on list to keep payload small) ── */
const LIST_COLS = `
  s.id, s.base_id, s.version, s.is_current, s.name, s.company,
  s.owner_id, s.shared_with, s.industry, s.deal_stage, s.exec_audience, s.solution,
  s.version_note, s.created_at, s.updated_at,
  s.outcome, s.outcome_reason, s.realized_value, s.outcome_at,
  s.customer_id,
  (s.data->>'annualBenefit')::numeric AS annual_benefit,
  (s.data->>'roi')::numeric           AS roi,
  (s.data->>'npv3')::numeric          AS npv3,
  (s.data->>'npv5')::numeric          AS npv5,
  (s.data->>'payback')::numeric       AS payback,
  u.username AS owner_username
  ,COALESCE(g.current_stage, 2) AS current_buy_cycle_stage
  ,COALESCE(g.rep_assessed_stage, COALESCE(g.current_stage, 2)) AS rep_assessed_stage
  ,g.outcome AS buy_cycle_outcome
  ,g.opportunity_profile
`;

/* Governed stage/outcome are the current workflow state. The older scenario
   columns remain compatibility mirrors only and are named explicitly. */
function presentScenario(row) {
  const {
    outcome: legacyOutcome,
    outcome_reason: legacyOutcomeReason,
    outcome_at: legacyOutcomeAt,
    buy_cycle_outcome: governedOutcome,
    opportunity_profile: opportunityProfile,
    ...scenario
  } = row;
  const stage = parseBuyCycleStage(row.current_buy_cycle_stage, BUYCYCLE_MIN_STAGE);
  return {
    ...scenario,
    legacyOutcome: legacyOutcome || null,
    legacyOutcomeReason: legacyOutcomeReason || null,
    legacyOutcomeAt: legacyOutcomeAt || null,
    currentBuyCycleStage: stage,
    currentBuyCycleStageLabel: getBuyCycleStageLabel(stage),
    repAssessedStage: parseBuyCycleStage(row.rep_assessed_stage, stage),
    outcome: governedOutcome || null,
    opportunityProfile: opportunityProfile || {}
  };
}

/* ═══════════════════════════════════════
   GET /api/scenarios
   ═══════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const isAdmin  = hasPermission(req.user,'view_all_customers');
    const canViewTeam = isAdmin || hasPermission(req.user,'view_team_customers');
    const showAll  = canViewTeam && req.query.all === 'true';
    const baseId   = req.query.base_id;

    let sql, params;

    if (baseId) {
      /* All versions for one base_id */
      sql = `
        SELECT ${LIST_COLS}
        FROM scenarios s
        JOIN users u ON u.id = s.owner_id
        LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
        LEFT JOIN customers c ON c.id=s.customer_id
        WHERE s.base_id = $1
          AND s.deleted_at IS NULL
          AND (s.owner_id = $2 OR $2 = ANY(s.shared_with) OR $3 OR ($4 AND s.customer_id IS NOT NULL AND ${customerScopeSql('c','$2')}))
        ORDER BY s.version DESC`;
      params = [baseId, req.user.id, isAdmin, canViewTeam];

    } else if (showAll) {
      /* Scoped team/global current scenarios. */
      sql = `
        SELECT ${LIST_COLS}
        FROM scenarios s
        JOIN users u ON u.id = s.owner_id
        LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
        LEFT JOIN customers c ON c.id=s.customer_id
        WHERE s.is_current = TRUE AND s.deleted_at IS NULL AND ($2 OR (c.id IS NOT NULL AND ${customerScopeSql('c','$1')}))
        ORDER BY s.updated_at DESC`;
      params = [req.user.id,isAdmin];

    } else {
      /* Normal: user's own + shared — current versions only */
      sql = `
        SELECT ${LIST_COLS}
        FROM scenarios s
        JOIN users u ON u.id = s.owner_id
        LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
        WHERE s.is_current = TRUE
          AND s.deleted_at IS NULL
          AND (s.owner_id = $1 OR $1 = ANY(s.shared_with) OR ($2 AND s.customer_id IS NOT NULL AND EXISTS(SELECT 1 FROM customers c WHERE c.id=s.customer_id AND ${customerScopeSql('c','$1')})))
        ORDER BY s.updated_at DESC`;
      params = [req.user.id,canViewTeam];
    }

    const { rows } = await query(sql, params);
    res.json(rows.map(presentScenario));

  } catch (err) {
    console.error('List scenarios error:', err.message);
    res.status(500).json({ error: 'Failed to load scenarios.' });
  }
});

/* Opportunity-wide immutable evidence, resolved from any scenario version. */
router.get('/:id/discovery-submissions',async(req,res)=>{try{
  const sc=await authorizedScenario(req.user,req.params.id);if(sc.error)return res.status(sc.status).json({error:sc.error});
  const {rows}=await query(`SELECT ds.id,ds.discovery_session_id,ds.source_scenario_id,ds.source_scenario_version,ds.submission_number,ds.submitted_at,ds.answer_count,ds.submitted_by,ds.created_at,(ds.source_scenario_id=$2) selected_scenario_source FROM discovery_submissions ds WHERE ds.base_id=$1 ORDER BY ds.submitted_at DESC,ds.submission_number DESC`,[sc.base_id,sc.id]);
  res.json({baseId:sc.base_id,selectedScenario:{id:sc.id,version:sc.version},submissions:rows});
}catch(err){console.error('Submission history error:',err.message);res.status(500).json({error:'Failed to load submission history.'});}});

router.get('/:id/discovery-submissions/:submissionId',async(req,res)=>{try{
  const sc=await authorizedScenario(req.user,req.params.id);if(sc.error)return res.status(sc.status).json({error:sc.error});
  const head=await query(`SELECT * FROM discovery_submissions WHERE id=$1 AND base_id=$2`,[req.params.submissionId,sc.base_id]);if(!head.rows.length)return res.status(404).json({error:'Submission not found.'});
  const answers=await query(`SELECT question_id,question_text,section,classification,canonical_input,answer_text,normalized_value,unit FROM discovery_submission_answers WHERE submission_id=$1 ORDER BY section,question_id`,[req.params.submissionId]);
  res.json({submission:head.rows[0],answers:answers.rows,immutable:true});
}catch(err){res.status(500).json({error:'Failed to load submission snapshot.'});}});

router.get('/:id/value-history',async(req,res)=>{try{
  const sc=await authorizedScenario(req.user,req.params.id);if(sc.error)return res.status(sc.status).json({error:sc.error});
  const input=req.query.input?String(req.query.input):null;if(input&&!isFinancialInput(input))return res.status(400).json({error:'Unknown financial input.'});
  const events=(await query(`SELECT e.*,ds.submission_number FROM roi_value_events e LEFT JOIN discovery_submissions ds ON ds.id=e.discovery_submission_id WHERE e.base_id=$1 ${input?'AND e.canonical_input=$2':''} ORDER BY e.created_at DESC`,input?[sc.base_id,input]:[sc.base_id])).rows;
  const snapshots=(await query(`SELECT * FROM scenario_roi_value_snapshots WHERE base_id=$1 ${input?'AND canonical_input=$2':''} ORDER BY scenario_version DESC,canonical_input`,input?[sc.base_id,input]:[sc.base_id])).rows;
  const selected=snapshots.filter(x=>String(x.scenario_id)===String(sc.id));const grouped={};for(const key of new Set([...events.map(x=>x.canonical_input),...selected.map(x=>x.canonical_input)])){const ev=events.filter(x=>x.canonical_input===key).map(x=>({...x,freshness:isCustomerEvent(x)?freshness(x.evidence_date||x.created_at):{status:'Needs Review',days:null,customerSupported:false},occurredAfterScenario:(Number(x.source_scenario_version)||0)>Number(sc.version)}));grouped[key]=summarize(ev,selected.find(x=>x.canonical_input===key));}
  res.json({baseId:sc.base_id,selectedScenario:{id:sc.id,version:sc.version,isCurrent:sc.is_current,isClosed:!!(sc.governed_outcome||sc.outcome)},inputs:grouped,events,snapshots});
}catch(err){console.error('Value history error:',err.message);res.status(500).json({error:'Failed to load Value History.'});}});

router.post('/:id/value-history/:canonicalInput/revalidate',async(req,res)=>{try{
  const sc=await authorizedScenario(req.user,req.params.id,'edit');if(sc.error)return res.status(sc.status).json({error:sc.error});if(!sc.is_current||sc.governed_outcome||sc.outcome)return res.status(409).json({error:'Revalidation is recorded from an active current scenario; historical and closed scenarios remain read-only.'});
  const input=String(req.params.canonicalInput),b=req.body||{};if(!isFinancialInput(input))return res.status(400).json({error:'This field is not a financial ROI input.'});
  const value=normalizeValue(b.value);if(value===null)return res.status(400).json({error:'A valid value is required.'});if(!b.stakeholderId||!b.evidenceDate||!String(b.source||'').trim())return res.status(400).json({error:'Validating stakeholder, evidence date, and source are required.'});
  const date=new Date(b.evidenceDate+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date>new Date())return res.status(400).json({error:'Evidence date must be valid and cannot be in the future.'});
  const stakeholder=await query(`SELECT st.id,st.name,st.title FROM stakeholders st WHERE st.id=$1 AND ((st.scenario_id IN(SELECT id FROM scenarios WHERE base_id=$2)) OR (st.owner_id=$3 AND LOWER(st.company)=LOWER($4)))`,[b.stakeholderId,sc.base_id,sc.owner_id,sc.company]);if(!stakeholder.rows.length)return res.status(400).json({error:'The validating stakeholder must belong to this opportunity.'});const person=stakeholder.rows[0];
  const created=await query(`INSERT INTO roi_value_events(base_id,canonical_input,event_type,value_text,normalized_value,currency,unit,source_scenario_id,source_scenario_version,stakeholder_id,stakeholder_name_snapshot,stakeholder_title_snapshot,evidence_source,evidence_note,evidence_date,actor_user_id,provenance_state,supersedes_event_id) VALUES($1,$2,'customer_revalidated',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'confirmed_customer',$16) RETURNING *`,[sc.base_id,input,String(b.value),value,b.currency||sc.data?.currency||null,unitFor(input),sc.id,sc.version,person.id,person.name,person.title,String(b.source).trim(),String(b.note||'').trim()||null,b.evidenceDate,req.user.id,b.supersedesEventId||null]);
  await log({userId:req.user.id,action:'roi_value.revalidated',entityType:'roi_value_event',entityId:created.rows[0].id,detail:{baseId:sc.base_id,canonicalInput:input,scenarioId:sc.id},ipAddress:req.ip});res.status(201).json({...created.rows[0],freshness:freshness(b.evidenceDate)});
}catch(err){console.error('Value revalidation error:',err.message);res.status(err.code==='23503'?400:500).json({error:err.message||'Failed to revalidate value.'});}});

router.post('/:id/value-history/:canonicalInput/apply',async(req,res)=>{try{
  const sc=await authorizedScenario(req.user,req.params.id,'edit');if(sc.error)return res.status(sc.status).json({error:sc.error});if(!sc.is_current||sc.governed_outcome||sc.outcome)return res.status(409).json({error:'Closed or historical scenario values cannot be changed.'});
  const input=String(req.params.canonicalInput);const event=await query(`SELECT * FROM roi_value_events WHERE id=$1 AND base_id=$2 AND canonical_input=$3`,[req.body?.eventId,sc.base_id,input]);if(!event.rows.length)return res.status(404).json({error:'Value event not found for this opportunity.'});
  await log({userId:req.user.id,action:'roi_value.applied',entityType:'roi_value_event',entityId:event.rows[0].id,detail:{baseId:sc.base_id,canonicalInput:input,targetScenarioId:sc.id},ipAddress:req.ip});const eventType=event.rows[0].event_type;res.json({apply:{canonicalInput:input,value:event.rows[0].normalized_value??event.rows[0].value_text,fieldState:eventType==='prospect_submitted'?'confirmed_prospect':['customer_revalidated','customer_provided'].includes(eventType)?'confirmed_customer':'estimated',provenance:{eventId:event.rows[0].id,source:eventType,date:event.rows[0].evidence_date||event.rows[0].created_at,stakeholderId:event.rows[0].stakeholder_id,stakeholder:event.rows[0].stakeholder_name_snapshot}},dirty:true,scenarioUnchanged:true});
}catch(err){res.status(500).json({error:'Failed to apply value event.'});}});

/* ═══════════════════════════════════════
   GET /api/scenarios/:id
   ═══════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const access=await scenarioAccess(req.user,req.params.id,'view');
    if(!access.exists)return res.status(404).json({error:'Scenario not found.'});
    if(!access.allowed)return res.status(403).json({error:'Access denied.'});
    const { rows } = await query(
      `SELECT s.*, u.username AS owner_username,
              COALESCE(g.current_stage,2) AS current_buy_cycle_stage,
              COALESCE(g.rep_assessed_stage,COALESCE(g.current_stage,2)) AS rep_assessed_stage,
              g.outcome AS buy_cycle_outcome,
              g.opportunity_profile
       FROM scenarios s JOIN users u ON u.id = s.owner_id
       LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
       WHERE s.id = $1 AND s.deleted_at IS NULL
         `,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario not found.' });

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_LOADED,
      entityType: 'scenario', entityId: req.params.id,
      detail: { name: rows[0].name, company: rows[0].company }, ipAddress: req.ip
    });

    res.json(presentScenario(rows[0]));
  } catch (err) {
    console.error('Get scenario error:', err.message);
    res.status(500).json({ error: 'Failed to load scenario.' });
  }
});

/* Scenario-scoped proposal artifact. Proposal edits update JSON in place and
   deliberately do not create ROI versions or mutate governance state. */
router.get('/:id/proposal', async (req,res)=>{
  try{
    const access=await scenarioAccess(req.user,req.params.id,'view');
    if(!access.exists)return res.status(404).json({error:'Scenario not found.'});
    if(!access.allowed)return res.status(403).json({error:'Access denied.'});
    const {rows}=await query(`SELECT id,version,data->'proposalDraft' proposal,data->'proposalMeta' metadata FROM scenarios WHERE id=$1 AND deleted_at IS NULL`,[req.params.id]);
    if(!rows.length)return res.status(404).json({error:'Scenario not found.'});
    res.json({scenarioId:rows[0].id,scenarioVersion:rows[0].version,proposal:rows[0].proposal||null,metadata:rows[0].metadata||null});
  }catch(err){console.error('Get proposal error:',err.message);res.status(500).json({error:'Failed to load proposal.'});}
});

router.put('/:id/proposal',async(req,res)=>{
  try{
    const access=await scenarioAccess(req.user,req.params.id,'edit');
    if(!access.exists)return res.status(404).json({error:'Scenario not found.'});
    if(!access.allowed)return res.status(403).json({error:'Proposal is read-only for this user.'});
    const draft=normalizeProposalDraft(req.body?.proposal);
    const expected=req.body?.revision==null?0:Number(req.body.revision);
    if(!Number.isInteger(expected)||expected<0)return res.status(400).json({error:'A valid proposal revision is required.'});
    const current=await query(`SELECT version,data->'proposalMeta' metadata FROM scenarios WHERE id=$1 AND deleted_at IS NULL`,[req.params.id]);
    if(!current.rows.length)return res.status(404).json({error:'Scenario not found.'});
    const currentRevision=Number(current.rows[0].metadata?.revision)||0;
    if(currentRevision!==expected)return res.status(409).json({error:'This proposal was updated in another session. Reload the latest version before saving your changes.',currentRevision});
    const metadata=proposalMeta(current.rows[0].metadata,{userId:req.user.id,scenarioId:req.params.id,scenarioVersion:current.rows[0].version,storyRevisionReviewed:req.body?.storyRevisionReviewed||null});
    const {rows}=await query(`UPDATE scenarios SET data=jsonb_set(jsonb_set(COALESCE(data,'{}'::jsonb),'{proposalDraft}',$1::jsonb,true),'{proposalMeta}',$2::jsonb,true),updated_at=NOW() WHERE id=$3 AND COALESCE((data->'proposalMeta'->>'revision')::int,0)=$4 AND deleted_at IS NULL RETURNING updated_at`,[JSON.stringify(draft),JSON.stringify(metadata),req.params.id,expected]);
    if(!rows.length)return res.status(409).json({error:'This proposal was updated in another session. Reload the latest version before saving your changes.'});
    res.json({saved:true,scenarioId:req.params.id,proposal:draft,metadata});
  }catch(err){if(err.status)return res.status(err.status).json({error:err.message});console.error('Save proposal error:',err.message);res.status(500).json({error:'Failed to save proposal.'});}
});

router.get('/:id/customer-proof',async(req,res)=>{
  try{const access=await scenarioAccess(req.user,req.params.id,'view');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Access denied.'});const {rows}=await query(`SELECT data->'customerProofSelection' selection,industry,solution FROM scenarios WHERE id=$1 AND deleted_at IS NULL`,[req.params.id]);const selectedIds=Array.isArray(rows[0]?.selection)?rows[0].selection:[],selected=resolveApproved(selectedIds),resolvedIds=new Set(selected.map(x=>x.id));res.json({selectedIds:selectedIds.filter(id=>resolvedIds.has(id)),selected,unavailableSelectedIds:selectedIds.filter(id=>!resolvedIds.has(id)),available:relevant({industry:rows[0]?.industry,product:rows[0]?.solution}),maximumSelection:3});}catch(err){res.status(500).json({error:'Failed to load customer proof.'});}
});
router.put('/:id/customer-proof',async(req,res)=>{
  try{const access=await scenarioAccess(req.user,req.params.id,'edit');if(!access.exists)return res.status(404).json({error:'Scenario not found.'});if(!access.allowed)return res.status(403).json({error:'Customer proof selection is read-only for this user.'});const ids=validateSelection(req.body?.proofIds);await query(`UPDATE scenarios SET data=jsonb_set(COALESCE(data,'{}'::jsonb),'{customerProofSelection}',$1::jsonb,true),updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL`,[JSON.stringify(ids),req.params.id]);res.json({saved:true,selectedIds:ids,selected:resolveApproved(ids)});}catch(err){if(err.status)return res.status(err.status).json({error:err.message});res.status(500).json({error:'Failed to save customer proof selection.'});}
});

/* ═══════════════════════════════════════
   GET /api/scenarios/:id/versions
   All versions of the same base_id
   ═══════════════════════════════════════ */
router.get('/:id/versions', async (req, res) => {
  try {
    /* First get the base_id */
    const { rows: base } = await query(
      'SELECT base_id, owner_id FROM scenarios WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!base.length) return res.status(404).json({ error: 'Scenario not found.' });

    const access=await scenarioAccess(req.user,req.params.id,'view');
    if (!access.allowed) return res.status(403).json({ error: 'Access denied.' });

    const { rows } = await query(
      `SELECT ${LIST_COLS}
       FROM scenarios s JOIN users u ON u.id = s.owner_id
       LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
       WHERE s.base_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.version DESC`,
      [base[0].base_id]
    );
    res.json(rows.map(presentScenario));
  } catch (err) {
    console.error('Get versions error:', err.message);
    res.status(500).json({ error: 'Failed to load versions.' });
  }
});

/* ═══════════════════════════════════════
   PATCH /api/scenarios/:id/narrative
   Autosave the editable executive narrative in place. This deliberately does
   not create a scenario version for every keystroke; explicit scenario saves
   remain the versioning boundary.
   ═══════════════════════════════════════ */
router.patch('/:id/narrative', async (req, res) => {
  const body = req.body || {};
  const narrative = {
    threeWhysAct: typeof body.threeWhysAct === 'string' ? body.threeWhysAct.trim() : '',
    threeWhysCi:  typeof body.threeWhysCi  === 'string' ? body.threeWhysCi.trim()  : '',
    threeWhysNow: typeof body.threeWhysNow === 'string' ? body.threeWhysNow.trim() : ''
  };
  if (Object.values(narrative).some(value => value.length > 8000)) {
    return res.status(400).json({ error: 'Narrative sections must be 8,000 characters or fewer.' });
  }

  try {
    const { rows } = await query(
      `WITH requested AS (
         SELECT base_id FROM scenarios WHERE id = $2 AND deleted_at IS NULL
       ), current_target AS (
         SELECT s.id
         FROM scenarios s JOIN requested r ON r.base_id = s.base_id
         WHERE s.is_current = TRUE AND s.deleted_at IS NULL
           AND (s.owner_id = $3 OR $3 = ANY(s.shared_with) OR $4)
         LIMIT 1
       )
       UPDATE scenarios s
       SET data = s.data || $1::jsonb, updated_at = NOW()
       FROM current_target t
       WHERE s.id = t.id
       RETURNING s.id, s.updated_at`,
      [JSON.stringify(narrative), req.params.id, req.user.id, hasRole(req.user,'admin')]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario not found or access denied.' });
    res.json({ saved: true, id: rows[0].id, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error('Autosave scenario narrative error:', err.message);
    res.status(500).json({ error: 'Failed to save executive narrative.' });
  }
});

/* ═══════════════════════════════════════
   POST /api/scenarios
   Save a scenario — creates a new version if base_id exists,
   otherwise creates a new scenario group.
   Body: { name, company, data, industry?, dealStage?, execAudience?,
           versionNote?, baseId? }
   ═══════════════════════════════════════ */
router.post('/', async (req, res) => {
  const { name, company, data, industry, execAudience, solution, versionNote, baseId, opportunityValue, opportunityValueCurrency } = req.body || {};

  /* Server-side required field validation (mirrors client-side) */
  if (!name || !name.trim() || name.trim() === 'Unnamed scenario') {
    return res.status(400).json({ error: 'Scenario name is required.' });
  }
  if (!company || !company.trim() || company.trim() === 'Prospect') {
    return res.status(400).json({ error: 'Company name is required.' });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Scenario data is required.' });
  }
  try { if(Object.prototype.hasOwnProperty.call(data,'customerProofSelection'))validateSelection(data.customerProofSelection); }
  catch(err){ return res.status(err.status||400).json({error:err.message}); }

  try {
    const parsedOpportunityValue=parseOpportunityValue(opportunityValue);
    const scenarioCurrency=validateOpportunityCurrency(opportunityValueCurrency||data.currency||'USD');
    const result = await transaction(async (client) => {
      let resolvedBaseId = baseId;
      let nextVersion    = 1;
      let adminOnBehalfOwner = null;   // set if an admin edits another user's scenario
      let sourceScenarioId = null;

      if (resolvedBaseId) {
        /* Versioning an existing scenario — verify ownership */
        const { rows: existing } = await client.query(
          `SELECT id, version, owner_id, shared_with FROM scenarios
           WHERE base_id = $1 AND deleted_at IS NULL
           ORDER BY version DESC LIMIT 1`,
          [resolvedBaseId]
        );

        if (existing.length) {
          const explicitlyShared=(existing[0].shared_with||[]).some(id=>String(id)===String(req.user.id));
          if (existing[0].owner_id !== req.user.id && !explicitlyShared && !hasRole(req.user,'admin')) {
            throw Object.assign(new Error('Access denied.'), { status: 403 });
          }
          nextVersion = (existing[0].version || 1) + 1;
          sourceScenarioId = existing[0].id;
          /* Admin editing another user's scenario: keep the original owner
             (don't let admin silently take over the deal) and flag it. */
          if (existing[0].owner_id !== req.user.id && hasRole(req.user,'admin')) {
            adminOnBehalfOwner = existing[0].owner_id;
          }
        } else {
          /* baseId provided but no existing rows found — treat as new */
          resolvedBaseId = null;
        }
      }

      if (!resolvedBaseId) {
        /* New scenario — check if same name+company already exists for this user */
        const { rows: dupe } = await client.query(
          `SELECT id, base_id FROM scenarios
           WHERE owner_id = $1 AND LOWER(name) = LOWER($2) AND LOWER(company) = LOWER($3)
             AND is_current = TRUE AND deleted_at IS NULL
           LIMIT 1`,
          [req.user.id, name.trim(), company.trim()]
        );
        if (dupe.length) {
          /* Auto-version against existing group */
          resolvedBaseId = dupe[0].base_id;
          sourceScenarioId = dupe[0].id;
          const { rows: maxVer } = await client.query(
            'SELECT MAX(version) AS mv FROM scenarios WHERE base_id = $1',
            [resolvedBaseId]
          );
          nextVersion = (maxVer[0].mv || 1) + 1;
        } else {
          /* Brand new scenario */
          const { v4: uuidv4 } = require('uuid');
          resolvedBaseId = uuidv4();
          nextVersion = 1;
        }
      }

      /* Mark all previous versions as not-current */
      await client.query(
        'UPDATE scenarios SET is_current = FALSE WHERE base_id = $1',
        [resolvedBaseId]
      );

      /* ── Server-authoritative ROI recompute ──
         Recompute metrics from the submitted inputs using the SAME shared
         engine the browser uses. The stored figures are the server's, never
         the client's. If the client's numbers differ (stale tab, client bug,
         tampering), we still store ours and log the discrepancy for visibility. */
      let metrics;
      let recomputeDiscrepancy = null;
      try {
        const r = calcROI(data);
        metrics = {
          annualBenefit: r.annualBenefit || 0,
          roi:           r.roi           || 0,
          npv3:          r.npv3          || 0,
          npv5:          r.npv5          || 0,
          payback:       r.paybackFromSigning != null ? r.paybackFromSigning : null,
          contractMonths:          r.contractMonths,
          contractYears:           r.contractYears,
          totalContractBenefit:    r.totalContractBenefit,
          totalContractInvestment: r.totalContractInvestment,
          totalContractNetBenefit: r.totalContractNetBenefit,
          totalContractRoi:        r.totalContractRoi,
          totalContractNpv:        r.totalContractNpv,
          contractPayback:         r.contractPayback
        };
        /* Detect drift vs. what the client sent (>$1 or >0.5% considered drift) */
        const clientBenefit = Number(data.annualBenefit) || 0;
        if (clientBenefit > 0 && Math.abs(clientBenefit - metrics.annualBenefit) > Math.max(1, clientBenefit * 0.005)) {
          recomputeDiscrepancy = {
            clientAnnualBenefit: Math.round(clientBenefit),
            serverAnnualBenefit: Math.round(metrics.annualBenefit)
          };
        }
      } catch (e) {
        /* If recompute fails for any reason, fall back to client values so a
           save is never lost — but flag it. */
        metrics = {
          annualBenefit: Number(data.annualBenefit) || 0,
          roi:           Number(data.roi)           || 0,
          npv3:          Number(data.npv3)          || 0,
          npv5:          Number(data.npv5)          || 0,
          payback:       data.paybackFromSigning || data.payback || null,
          contractMonths:          Number.isFinite(Number.parseInt(data.contractMonths, 10)) ? Math.max(1, Math.min(60, Number.parseInt(data.contractMonths, 10))) : 36,
          contractYears:           Array.isArray(data.contractYears) ? data.contractYears : [],
          totalContractBenefit:    Number(data.totalContractBenefit) || 0,
          totalContractInvestment: Number(data.totalContractInvestment) || 0,
          totalContractNetBenefit: Number(data.totalContractNetBenefit) || 0,
          totalContractRoi:        data.totalContractRoi == null ? null : Number(data.totalContractRoi),
          totalContractNpv:        Number(data.totalContractNpv) || 0,
          contractPayback:         data.contractPayback == null ? null : Number(data.contractPayback)
        };
        recomputeDiscrepancy = { recomputeError: e.message };
      }

      /* Official stage is server-owned. A stale/tampered client dealStage is
         ignored. Versions carry the full governance snapshot forward. */
      let sourceGovernance=null,sourceCompatibility=null;
      if(sourceScenarioId){
        const governance=await client.query(`SELECT * FROM scenario_stage_governance WHERE scenario_id=$1`,[sourceScenarioId]);
        sourceGovernance=governance.rows[0]||null;
        const compatibility=await client.query(`SELECT outcome,outcome_reason,realized_value,outcome_at FROM scenarios WHERE id=$1`,[sourceScenarioId]);
        sourceCompatibility=compatibility.rows[0]||null;
      }
      const officialStage=parseBuyCycleStage(sourceGovernance?.current_stage,BUYCYCLE_MIN_STAGE);
      const officialLabel=getBuyCycleStageLabel(officialStage);
      const { opportunityValue:_clientOpportunityValue, proposalDraft:_clientProposal, proposalMeta:_clientProposalMeta, ...roiData } = data;
      let carriedProposal={};
      if(sourceScenarioId){
        const source=await client.query(`SELECT version,data->'proposalDraft' proposal,data->'proposalMeta' metadata,data->'customerProofSelection' proof_selection FROM scenarios WHERE id=$1`,[sourceScenarioId]);
        if(source.rows[0]?.proposal){
          carriedProposal.proposalDraft=source.rows[0].proposal;
          carriedProposal.proposalMeta=proposalMeta(source.rows[0].metadata,{userId:req.user.id,sourceScenarioId,sourceScenarioVersion:source.rows[0].version,carriedForward:true});
        }
        if(Array.isArray(source.rows[0]?.proof_selection))carriedProposal.customerProofSelection=source.rows[0].proof_selection;
      }
      const dataWithMetrics = { ...roiData, ...metrics, ...carriedProposal, dealStage:officialLabel };
      const sourceProfile=sourceGovernance?.opportunity_profile||{};
      const opportunityProfile=buildOpportunityProfile({existing:sourceProfile,value:parsedOpportunityValue,currency:scenarioCurrency,userId:req.user.id});

      /* Link to a first-class customer (create if new), atomic with the save. */
      const customerId = await ensureCustomer(req.user.id, company, client.query.bind(client));

      const { rows } = await client.query(
        `INSERT INTO scenarios
           (base_id, version, is_current, name, company, owner_id, customer_id,
            industry, deal_stage, exec_audience, solution, data, version_note,
            outcome,outcome_reason,realized_value,outcome_at)
         VALUES ($1, $2, TRUE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13,$14,$15,$16)
         RETURNING id, base_id, version, name, company, is_current,
                   industry, deal_stage, exec_audience, solution, version_note,
                   created_at, updated_at`,
        [
          resolvedBaseId, nextVersion, name.trim(), company.trim(), (adminOnBehalfOwner || req.user.id), customerId,
          industry || null, officialLabel, execAudience || 'mixed',
          solution || null, JSON.stringify(dataWithMetrics), versionNote || null,
          sourceGovernance?.outcome||null,sourceGovernance?.outcome?sourceCompatibility?.outcome_reason||null:null,
          sourceGovernance?.outcome==='won'?sourceCompatibility?.realized_value||null:null,
          sourceGovernance?.outcome?sourceCompatibility?.outcome_at||new Date():null
        ]
      );

      /* Preserve exactly what this version used. This may append a rep_updated
         safety event and downgrade a mismatched customer claim, but never
         changes any ROI formula or any prior scenario. */
      await captureScenarioValueHistory(client,{scenario:rows[0],sourceScenarioId,data:dataWithMetrics,userId:req.user.id});

      if(sourceGovernance){
        await client.query(`INSERT INTO scenario_stage_governance
          (scenario_id,rep_assessed_stage,evidence,meeting_notes,certifications,updated_by,updated_at,current_stage,opportunity_profile,outcome,stage_at_loss,outcome_details,legacy_setup_needed,stage_entered_at)
          VALUES($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9,$10,$11,$12,$13)`,[
          rows[0].id,sourceGovernance.rep_assessed_stage,sourceGovernance.evidence||{},sourceGovernance.meeting_notes,sourceGovernance.certifications||{},req.user.id,
          officialStage,opportunityProfile,sourceGovernance.outcome,sourceGovernance.stage_at_loss,sourceGovernance.outcome_details||{},sourceGovernance.legacy_setup_needed,sourceGovernance.stage_entered_at
        ]);
      }else{
        await client.query(`INSERT INTO scenario_stage_governance(scenario_id,current_stage,rep_assessed_stage,outcome,legacy_setup_needed,updated_by,opportunity_profile) VALUES($1,$2,$2,NULL,FALSE,$3,$4)`,[rows[0].id,BUYCYCLE_MIN_STAGE,req.user.id,JSON.stringify(opportunityProfile)]);
      }

      rows[0].currentBuyCycleStage=officialStage;
      rows[0].currentBuyCycleStageLabel=officialLabel;
      rows[0].repAssessedStage=parseBuyCycleStage(sourceGovernance?.rep_assessed_stage,officialStage);
      rows[0].outcome=sourceGovernance?.outcome||null;
      rows[0].opportunityProfile=opportunityProfile;

      return { row: rows[0], recomputeDiscrepancy, adminOnBehalfOwner };
    });
    const savedRow = result.row;

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_SAVED,
      entityType: 'scenario', entityId: savedRow.id,
      detail: { name: savedRow.name, company: savedRow.company, version: savedRow.version },
      ipAddress: req.ip
    });

    /* Admin-on-behalf edit: record who edited whose scenario, for accountability. */
    if (result.adminOnBehalfOwner) {
      await log({
        userId: req.user.id, action: ACTIONS.ADMIN_EDIT_ON_BEHALF,
        entityType: 'scenario', entityId: savedRow.id,
        detail: { editedByAdmin: req.user.id, originalOwner: result.adminOnBehalfOwner, name: savedRow.name, company: savedRow.company },
        ipAddress: req.ip
      });
    }

    /* Visibility into client/server ROI drift (Fix 1, option b) */
    if (result.recomputeDiscrepancy) {
      await log({
        userId: req.user.id, action: ACTIONS.SCENARIO_SAVED,
        entityType: 'scenario', entityId: savedRow.id,
        detail: { roiRecomputeDiscrepancy: result.recomputeDiscrepancy },
        ipAddress: req.ip
      });
    }

    res.status(201).json(savedRow);

  } catch (err) {
    if (err.status === 400 || err.status === 403) return res.status(err.status).json({ error: err.message });
    console.error('Save scenario error:', err.message);
    res.status(500).json({ error: 'Failed to save scenario.' });
  }
});

/* ═══════════════════════════════════════
   PATCH /api/scenarios/:id/share
   Body: { shareWith: [userId, ...] }
   ═══════════════════════════════════════ */
router.patch('/:id/share', async (req, res) => {
  const { shareWith } = req.body || {};
  if (!Array.isArray(shareWith)) {
    return res.status(400).json({ error: 'shareWith must be an array of user IDs.' });
  }

  try {
    /* Only owner or admin can share */
    const { rows: sc } = await query(
      'SELECT id, base_id, owner_id, name FROM scenarios WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!sc.length) return res.status(404).json({ error: 'Scenario not found.' });
    if (sc[0].owner_id !== req.user.id && !hasRole(req.user,'admin')) {
      return res.status(403).json({ error: 'Only the owner can share this scenario.' });
    }

    /* Validate all shareWith IDs exist */
    if (shareWith.length > 0) {
      const { rows: validUsers } = await query(
        'SELECT id FROM users WHERE id = ANY($1) AND is_active = TRUE',
        [shareWith]
      );
      if (validUsers.length !== shareWith.length) {
        return res.status(400).json({ error: 'One or more user IDs are invalid or inactive.' });
      }
    }

    /* Update shared_with on ALL versions of this base_id */
    await query(
      'UPDATE scenarios SET shared_with = $1 WHERE base_id = $2',
      [shareWith, sc[0].base_id]
    );

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_SHARED,
      entityType: 'scenario', entityId: req.params.id,
      detail: { name: sc[0].name, sharedWith: shareWith }, ipAddress: req.ip
    });

    res.json({ ok: true, sharedWith: shareWith });

  } catch (err) {
    console.error('Share scenario error:', err.message);
    res.status(500).json({ error: 'Failed to update sharing.' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/scenarios/:id
   Soft-delete a single version
   ═══════════════════════════════════════ */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, base_id, owner_id, version, is_current, name
       FROM scenarios WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario not found.' });

    const sc = rows[0];
    if (sc.owner_id !== req.user.id && !hasRole(req.user,'admin')) {
      return res.status(403).json({ error: 'Only the owner can delete this scenario.' });
    }

    await query(
      'UPDATE scenarios SET deleted_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    /* If this was the current version, promote the previous one */
    if (sc.is_current) {
      await query(
        `UPDATE scenarios SET is_current = TRUE
         WHERE base_id = $1 AND deleted_at IS NULL
           AND id != $2
         ORDER BY version DESC LIMIT 1`,
        [sc.base_id, req.params.id]
      );
    }

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_DELETED,
      entityType: 'scenario', entityId: req.params.id,
      detail: { name: sc.name, version: sc.version }, ipAddress: req.ip
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete scenario error:', err.message);
    res.status(500).json({ error: 'Failed to delete scenario.' });
  }
});

/* ═══════════════════════════════════════
   DELETE /api/scenarios/group/:baseId
   Soft-delete ALL versions of a scenario group
   ═══════════════════════════════════════ */
router.delete('/group/:baseId', async (req, res) => {
  try {
    /* Verify ownership of at least one version */
    const { rows } = await query(
      `SELECT owner_id, COUNT(*) AS cnt FROM scenarios
       WHERE base_id = $1 AND deleted_at IS NULL GROUP BY owner_id`,
      [req.params.baseId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scenario group not found.' });

    const ownerIds = rows.map(r => r.owner_id);
    if (!ownerIds.includes(req.user.id) && !hasRole(req.user,'admin')) {
      return res.status(403).json({ error: 'Only the owner can delete this scenario.' });
    }

    const { rowCount } = await query(
      'UPDATE scenarios SET deleted_at = NOW() WHERE base_id = $1 AND deleted_at IS NULL',
      [req.params.baseId]
    );

    await log({
      userId: req.user.id, action: ACTIONS.SCENARIO_DELETED,
      entityType: 'scenario', entityId: null,
      detail: { baseId: req.params.baseId, versionsDeleted: rowCount }, ipAddress: req.ip
    });

    res.json({ ok: true, deletedVersions: rowCount });
  } catch (err) {
    console.error('Delete scenario group error:', err.message);
    res.status(500).json({ error: 'Failed to delete scenario group.' });
  }
});

/* The Phase 1 outcome editor cannot satisfy governed Close Opportunity. */
router.put('/group/:baseId/outcome', (_req, res) => res.status(410).json({
  error:'This legacy outcome endpoint has been retired. Use Buyer Evidence & Stage Readiness → Close Opportunity.'
}));

/* Post-sale value measurement is separate from the Stage 7 outcome. */
router.put('/group/:baseId/realized-value', async (req,res)=>{
  try{
    const value=req.body?.realizedValue;
    const realized=value===null||value===undefined||value===''?null:Number(value);
    if(realized!==null&&(!Number.isFinite(realized)||realized<0))return res.status(400).json({error:'realizedValue must be a non-negative number or blank.'});
    const {rows}=await query(`SELECT s.id,s.owner_id,g.current_stage,g.outcome FROM scenarios s LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id WHERE s.base_id=$1 AND s.is_current=TRUE AND s.deleted_at IS NULL`,[req.params.baseId]);
    if(!rows.length)return res.status(404).json({error:'Scenario group not found.'});const current=rows[0];
    if(String(current.owner_id)!==String(req.user.id)&&!hasRole(req.user,'admin'))return res.status(403).json({error:'Only the owner or an administrator may record realized value.'});
    if(Number(current.current_stage)!==7||current.outcome!=='won')return res.status(409).json({error:'Realized value can be recorded only for a governed Closed Won opportunity.'});
    const result=await query(`UPDATE scenarios SET realized_value=$2,updated_at=NOW() WHERE base_id=$1 AND deleted_at IS NULL`,[req.params.baseId,realized]);
    await log({userId:req.user.id,action:'scenario.realized_value_updated',entityType:'scenario',entityId:current.id,detail:{baseId:req.params.baseId,realizedValue:realized},ipAddress:req.ip});
    res.json({ok:true,updatedVersions:result.rowCount,realizedValue:realized,outcome:'won'});
  }catch(err){console.error('Set realized value error:',err.message);res.status(500).json({error:'Failed to record realized value.'});}
});

/* ═══════════════════════════════════════════════════════════════════
   Batch C — Driver resonance / learning loop
   GET  /api/scenarios/:id/resonance   — get existing feedback
   PUT  /api/scenarios/:id/resonance   — save/update feedback
   GET  /api/resonance/summary         — admin: patterns across deals
   ═══════════════════════════════════════════════════════════════════ */

router.get('/:id/resonance', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.* FROM driver_resonance r
       JOIN scenarios s ON s.id = r.scenario_id
       WHERE r.scenario_id = $1 AND (s.owner_id = $2 OR $3)`,
      [req.params.id, req.user.id, hasRole(req.user,'admin')]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Get resonance error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback.' });
  }
});

router.put('/:id/resonance', async (req, res) => {
  try {
    const { driversResonated, driversQuestioned, meetingNotes, meetingOutcome } = req.body || {};
    const VALID_OUTCOMES = ['progressed','stalled','lost','no_decision','closed_won',null,''];
    if (meetingOutcome !== undefined && !VALID_OUTCOMES.includes(meetingOutcome)) {
      return res.status(400).json({ error: 'Invalid meeting outcome.' });
    }
    /* Upsert — one feedback row per scenario */
    const { rows } = await query(
      `INSERT INTO driver_resonance
         (scenario_id, owner_id, drivers_resonated, drivers_questioned, meeting_notes, meeting_outcome)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
       ON CONFLICT (scenario_id)
       DO UPDATE SET
         drivers_resonated  = EXCLUDED.drivers_resonated,
         drivers_questioned = EXCLUDED.drivers_questioned,
         meeting_notes      = EXCLUDED.meeting_notes,
         meeting_outcome    = EXCLUDED.meeting_outcome,
         updated_at         = NOW()
       RETURNING *`,
      [
        req.params.id, req.user.id,
        JSON.stringify(driversResonated || []),
        JSON.stringify(driversQuestioned || []),
        meetingNotes || null,
        meetingOutcome || null
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Save resonance error:', err.message);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

/* Admin summary — which drivers resonate most, by industry */
router.get('/resonance/summary', async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const { rows } = await query(
      `SELECT
         s.industry,
         r.meeting_outcome,
         jsonb_array_elements_text(r.drivers_resonated)  AS driver,
         COUNT(*) AS resonance_count
       FROM driver_resonance r
       JOIN scenarios s ON s.id = r.scenario_id
       WHERE r.drivers_resonated != '[]'
       GROUP BY s.industry, r.meeting_outcome, driver
       ORDER BY resonance_count DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('Resonance summary error:', err.message);
    res.status(500).json({ error: 'Failed to load summary.' });
  }
});

/* AI narrative summary over the resonance data — separate, slower endpoint
   so the bar chart above loads instantly and the summary fills in after.
   Returns null (not an error) if AI isn't configured or the call fails. */
router.get('/resonance/summary/ai', async (req, res) => {
  if (!hasRole(req.user,'admin')) return res.status(403).json({ error: 'Admin only.' });
  try {
    const { rows } = await query(
      `SELECT
         s.industry,
         r.meeting_outcome,
         jsonb_array_elements_text(r.drivers_resonated)  AS driver,
         COUNT(*) AS resonance_count
       FROM driver_resonance r
       JOIN scenarios s ON s.id = r.scenario_id
       WHERE r.drivers_resonated != '[]'
       GROUP BY s.industry, r.meeting_outcome, driver
       ORDER BY resonance_count DESC
       LIMIT 100`
    );
    if (!rows.length) return res.json({ summary: null });
    const { summarizeResonancePatterns } = require('../ai');
    const summary = await summarizeResonancePatterns(rows);
    res.json({ summary });
  } catch (err) {
    console.error('Resonance AI summary error:', err.message);
    res.json({ summary: null });  /* never a hard error — the chart above still works */
  }
});

module.exports = router;
