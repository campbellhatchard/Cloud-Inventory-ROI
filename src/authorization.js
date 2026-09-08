/* Central authorization: roles grant capabilities; teams/ownership/sharing grant scope. */
const { query } = require('./db');

const ROLE_PERMISSIONS = Object.freeze({
  rep: ['view_own_customers','edit_own_customers','view_own_customer_solution_fit'],
  se: ['view_team_customers','view_team_solution_fits','edit_team_solution_fits','create_solution_fit'],
  sales_manager: ['view_team_customers','view_team_solution_fits','view_sales_team','view_team_dashboard','approve_stage_override'],
  value_engineering: ['view_team_customers','view_team_solution_fits'],
  admin: ['view_all_customers','edit_all_customers','view_all_solution_fits','edit_all_solution_fits','assign_solution_fit','manage_sales_teams','manage_team_members','view_team_dashboard','approve_stage_override']
});
function rolesOf(user){return [...new Set([...(user?.roleKeys||[]),user?.role].filter(Boolean))];}
function effectivePermissions(user){return [...new Set(rolesOf(user).flatMap(r=>ROLE_PERMISSIONS[r]||[]))];}
function hasPermission(user,p){return effectivePermissions(user).includes(p);}
function resolveCustomerDecision(user,{owned=false,shared=false,teamScoped=false}={},mode='view'){
  if(hasPermission(user,mode==='edit'?'edit_all_customers':'view_all_customers'))return true;
  if(owned)return true;if(mode==='view'&&shared)return true;
  return teamScoped&&hasPermission(user,mode==='edit'?'edit_team_customers':'view_team_customers');
}
function resolveSolutionFitDecision(user,{owned=false,assigned=false,teamScoped=false,shared=false}={},mode='view'){
  const scoped=owned||assigned||shared||teamScoped||hasPermission(user,'view_all_solution_fits');
  if(!scoped)return false;
  if(mode==='edit')return hasPermission(user,'edit_all_solution_fits')||hasPermission(user,'edit_team_solution_fits');
  return owned||(assigned&&hasPermission(user,'create_solution_fit'))||hasPermission(user,'view_all_solution_fits')||hasPermission(user,'view_team_solution_fits');
}

async function getUserTeams(userId){const {rows}=await query(`SELECT t.id,t.name,t.status,t.primary_leader_id,m.membership_functions FROM sales_team_memberships m JOIN sales_teams t ON t.id=m.team_id WHERE m.user_id=$1 AND m.is_active=TRUE AND t.status='active' AND m.effective_start<=CURRENT_DATE AND (m.effective_end IS NULL OR m.effective_end>=CURRENT_DATE) ORDER BY t.name`,[userId]);return rows;}
async function getAuthorizedSalesReps(user){if(hasPermission(user,'view_all_customers')){const {rows}=await query(`SELECT id,username FROM users WHERE is_active=TRUE AND ('rep'=ANY(roles) OR role='rep') ORDER BY username`);return rows;}if(!hasPermission(user,'view_team_customers')){const {rows}=await query(`SELECT id,username FROM users WHERE id=$1 AND is_active=TRUE AND ('rep'=ANY(roles) OR role='rep')`,[user.id]);return rows;}const {rows}=await query(`SELECT DISTINCT u.id,u.username FROM sales_team_memberships me JOIN sales_teams t ON t.id=me.team_id AND t.status='active' JOIN sales_team_memberships reps ON reps.team_id=me.team_id AND reps.is_active=TRUE AND reps.effective_start<=CURRENT_DATE AND (reps.effective_end IS NULL OR reps.effective_end>=CURRENT_DATE) JOIN users u ON u.id=reps.user_id AND u.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE AND me.effective_start<=CURRENT_DATE AND (me.effective_end IS NULL OR me.effective_end>=CURRENT_DATE) AND ('rep'=ANY(u.roles) OR u.role='rep') ORDER BY u.username`,[user.id]);return rows;}

function customerScopeSql(alias='c',userParam='$1'){
  return `(${alias}.owner_id=${userParam}
    OR EXISTS(SELECT 1 FROM scenarios sx WHERE sx.customer_id=${alias}.id AND ${userParam}=ANY(sx.shared_with) AND sx.deleted_at IS NULL)
    OR EXISTS(SELECT 1 FROM sales_team_memberships viewer JOIN sales_teams active_team ON active_team.id=viewer.team_id AND active_team.status='active' JOIN sales_team_memberships owner_m ON owner_m.team_id=viewer.team_id AND owner_m.user_id=${alias}.owner_id AND owner_m.is_active=TRUE AND owner_m.effective_start<=CURRENT_DATE AND (owner_m.effective_end IS NULL OR owner_m.effective_end>=CURRENT_DATE) WHERE viewer.user_id=${userParam} AND viewer.is_active=TRUE AND viewer.effective_start<=CURRENT_DATE AND (viewer.effective_end IS NULL OR viewer.effective_end>=CURRENT_DATE))
  )`;
}
async function customerAccess(user,customerId,mode='view'){
  const global=hasPermission(user,mode==='edit'?'edit_all_customers':'view_all_customers');
  const {rows}=await query(`SELECT c.id,c.name,c.owner_id,
    EXISTS(SELECT 1 FROM scenarios sx WHERE sx.customer_id=c.id AND $1=ANY(sx.shared_with) AND sx.deleted_at IS NULL) explicitly_shared,
    EXISTS(SELECT 1 FROM sales_team_memberships viewer JOIN sales_teams active_team ON active_team.id=viewer.team_id AND active_team.status='active' JOIN sales_team_memberships owner_m ON owner_m.team_id=viewer.team_id AND owner_m.user_id=c.owner_id AND owner_m.is_active=TRUE AND owner_m.effective_start<=CURRENT_DATE AND (owner_m.effective_end IS NULL OR owner_m.effective_end>=CURRENT_DATE) WHERE viewer.user_id=$1 AND viewer.is_active=TRUE AND viewer.effective_start<=CURRENT_DATE AND (viewer.effective_end IS NULL OR viewer.effective_end>=CURRENT_DATE)) team_scoped
    FROM customers c WHERE c.id=$2`,[user.id,customerId]);
  if(!rows.length)return {exists:false,allowed:false,reasons:[]};const c=rows[0],reasons=[];
  if(global)reasons.push('global_permission');if(String(c.owner_id)===String(user.id))reasons.push('customer_ownership');
  if(c.explicitly_shared)reasons.push('explicit_sharing');if(c.team_scoped)reasons.push('team_membership');
  const owned=String(c.owner_id)===String(user.id);
  let allowed=resolveCustomerDecision(user,{owned,shared:c.explicitly_shared,teamScoped:c.team_scoped},mode);
  return {exists:true,allowed,reasons,customer:c};
}
async function solutionFitAccess(user,customerId,mode='view'){
  const c=await customerAccess(user,customerId,'view');if(!c.exists)return c;
  const p=effectivePermissions(user),owner=String(c.customer.owner_id)===String(user.id);
  const {rows}=await query(`SELECT primary_se_id,additional_se_ids,created_by FROM handoffs WHERE customer_id=$1 AND deleted_at IS NULL`,[customerId]);
  const h=rows[0]||{},assigned=String(h.primary_se_id||'')===String(user.id)||(h.additional_se_ids||[]).map(String).includes(String(user.id));
  const allowed=resolveSolutionFitDecision(user,{owned,assigned,teamScoped:c.reasons.includes('team_membership'),shared:c.reasons.includes('explicit_sharing')},mode);
  return {...c,allowed,reasons:[...c.reasons,...(assigned?['solution_fit_assignment']:[]),...(p.includes(mode==='view'?'view_all_solution_fits':'edit_all_solution_fits')?['global_permission']:[])]};
}
async function scenarioAccess(user,scenarioId,mode='view'){
  const {rows}=await query(`SELECT id,owner_id,customer_id,shared_with FROM scenarios WHERE id=$1 AND deleted_at IS NULL`,[scenarioId]);
  if(!rows.length)return {exists:false,allowed:false,reasons:[]};const s=rows[0];
  if(hasPermission(user,mode==='edit'?'edit_all_customers':'view_all_customers'))return {exists:true,allowed:true,reasons:['global_permission'],scenario:s};
  if(String(s.owner_id)===String(user.id))return {exists:true,allowed:true,reasons:['customer_ownership'],scenario:s};
  if((s.shared_with||[]).map(String).includes(String(user.id)))return {exists:true,allowed:mode==='view',reasons:['explicit_sharing'],scenario:s};
  if(!s.customer_id)return {exists:true,allowed:false,reasons:[],scenario:s};
  const c=await customerAccess(user,s.customer_id,mode);return {...c,scenario:s};
}
/* A base_id identifies an opportunity; it never authorizes one. Resolve the
   active scenario and delegate to centralized scenario authorization. */
async function opportunityAccessByBaseId(user,baseId,mode='view'){
  const {rows}=await query(`SELECT id FROM scenarios WHERE base_id=$1 AND deleted_at IS NULL ORDER BY is_current DESC,version DESC,updated_at DESC LIMIT 1`,[baseId]);
  if(!rows.length)return {exists:false,allowed:false,reasons:[]};
  return scenarioAccess(user,rows[0].id,mode);
}
async function listAuthorizedCustomers(user){const global=hasPermission(user,'view_all_customers'),team=hasPermission(user,'view_team_customers');const {rows}=await query(`SELECT c.id,c.name,c.owner_id,u.username owner_username,COUNT(s.id) FILTER(WHERE s.deleted_at IS NULL)::int scenario_count FROM customers c JOIN users u ON u.id=c.owner_id LEFT JOIN scenarios s ON s.customer_id=c.id WHERE ($2 OR c.owner_id=$1 OR EXISTS(SELECT 1 FROM scenarios sx WHERE sx.customer_id=c.id AND $1=ANY(sx.shared_with) AND sx.deleted_at IS NULL) OR ($3 AND ${customerScopeSql('c','$1')})) GROUP BY c.id,u.username ORDER BY c.name`,[user.id,global,team]);return rows;}
async function searchAuthorizedCustomers(user,filters={}){
 const global=hasPermission(user,'view_all_customers'),team=hasPermission(user,'view_team_customers');
 const limit=Math.max(1,Math.min(50,Number(filters.limit)||25)),offset=Math.max(0,Number(filters.offset)||0);
 const {rows}=await query(`WITH scoped AS (
   SELECT c.id,c.name,c.owner_id,u.username owner_username,
     c.owner_id=$1 is_owner,
     EXISTS(SELECT 1 FROM scenarios sh WHERE sh.customer_id=c.id AND $1=ANY(sh.shared_with) AND sh.deleted_at IS NULL) explicitly_shared,
     EXISTS(SELECT 1 FROM sales_team_memberships viewer JOIN sales_teams active_team ON active_team.id=viewer.team_id AND active_team.status='active' JOIN sales_team_memberships owner_m ON owner_m.team_id=viewer.team_id AND owner_m.user_id=c.owner_id AND owner_m.is_active=TRUE AND owner_m.effective_start<=CURRENT_DATE AND (owner_m.effective_end IS NULL OR owner_m.effective_end>=CURRENT_DATE) WHERE viewer.user_id=$1 AND viewer.is_active=TRUE AND viewer.effective_start<=CURRENT_DATE AND (viewer.effective_end IS NULL OR viewer.effective_end>=CURRENT_DATE)) team_scoped
   FROM customers c JOIN users u ON u.id=c.owner_id
   WHERE c.deleted_at IS NULL AND ($2 OR c.owner_id=$1 OR EXISTS(SELECT 1 FROM scenarios sx WHERE sx.customer_id=c.id AND $1=ANY(sx.shared_with) AND sx.deleted_at IS NULL) OR ($3 AND ${customerScopeSql('c','$1')}))
 )
 SELECT scoped.*,s.id scenario_id,s.name opportunity_name,s.base_id,s.version,s.deal_stage,s.data scenario_data,s.updated_at scenario_updated_at,
   g.outcome outcome,s.outcome legacy_outcome,s.solution,
   NULLIF(g.opportunity_profile->>'estimatedOpportunityValue','')::numeric opportunity_value,
   COALESCE(NULLIF(g.opportunity_profile->>'currency',''),NULLIF(s.data->>'currency',''),'USD') opportunity_currency,
   COALESCE(g.current_stage,g.rep_assessed_stage,NULLIF(SUBSTRING(s.deal_stage FROM '(\\d+)'),'')::int) current_stage,
   2 evidence_stage,0 stage_readiness,
   NULLIF(s.data->>'targetCloseDate','') target_close,
   h.readiness solution_fit_readiness,h.status solution_fit_status,h.primary_se_id,pse.username primary_se,
   COALESCE((SELECT COUNT(DISTINCT sx.base_id)::int FROM scenarios sx WHERE sx.customer_id=scoped.id AND sx.is_current=TRUE AND sx.deleted_at IS NULL),0) scenario_count,
   COALESCE((SELECT ARRAY_AGG(DISTINCT t.name ORDER BY t.name) FROM sales_team_memberships om JOIN sales_teams t ON t.id=om.team_id AND t.status='active' WHERE om.user_id=scoped.owner_id AND om.is_active=TRUE AND om.effective_start<=CURRENT_DATE AND (om.effective_end IS NULL OR om.effective_end>=CURRENT_DATE)),'{}') team_names,
   COUNT(*) OVER() total_count
 FROM scoped
 LEFT JOIN LATERAL (SELECT sx.* FROM scenarios sx WHERE sx.customer_id=scoped.id AND sx.is_current=TRUE AND sx.deleted_at IS NULL ORDER BY sx.updated_at DESC LIMIT 1) s ON TRUE
 LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
 LEFT JOIN handoffs h ON h.customer_id=scoped.id AND h.deleted_at IS NULL
 LEFT JOIN users pse ON pse.id=h.primary_se_id
 WHERE ($4='' OR scoped.name ILIKE '%'||$4||'%' OR COALESCE(s.name,'') ILIKE '%'||$4||'%' OR scoped.owner_username ILIKE '%'||$4||'%')
   AND ($5::uuid IS NULL OR scoped.owner_id=$5)
   AND ($6::uuid IS NULL OR h.primary_se_id=$6 OR $6=ANY(COALESCE(h.additional_se_ids,'{}'::uuid[])))
   AND ($7='' OR COALESCE(g.current_stage,g.rep_assessed_stage,NULLIF(SUBSTRING(s.deal_stage FROM '(\\d+)'),'')::int)::text=$7)
   AND ($8='' OR COALESCE(h.status,'not_started')=$8)
   AND ($9='all' OR ($9='closed' AND COALESCE(g.outcome,'')<>'') OR ($9='active' AND COALESCE(g.outcome,'')=''))
   AND ($10::uuid IS NULL OR EXISTS(SELECT 1 FROM sales_team_memberships fm JOIN sales_teams ft ON ft.id=fm.team_id AND ft.status='active' WHERE fm.team_id=$10 AND fm.user_id=scoped.owner_id AND fm.is_active=TRUE AND fm.effective_start<=CURRENT_DATE AND (fm.effective_end IS NULL OR fm.effective_end>=CURRENT_DATE)))
   AND ($11::uuid IS NULL OR scoped.id=$11)
 ORDER BY COALESCE(s.updated_at,'epoch'::timestamptz) DESC,scoped.name
 LIMIT $12 OFFSET $13`,[user.id,global,team,String(filters.search||'').trim(),filters.repId||null,filters.seId||null,String(filters.stage||''),String(filters.solutionFitStatus||''),filters.state||'active',filters.teamId||null,filters.customerId||null,limit,offset]);
 const scenarioRows=rows.filter(r=>r.scenario_id).map(r=>({id:r.scenario_id,base_id:r.base_id,owner_id:r.owner_id,deal_stage:r.deal_stage,data:r.scenario_data||{},customer_id:r.id,company:r.name,rep:r.owner_username}));
 if(scenarioRows.length){const {evaluateLiveStageReadinessBatch,liveReadinessSummary}=require('./shared/stage-readiness-service');const live=await evaluateLiveStageReadinessBatch(scenarioRows);for(const row of rows){const assessment=live.get(String(row.scenario_id));if(!assessment)continue;const summary=liveReadinessSummary(assessment);row.evidence_stage=summary.evidenceStage;row.stage_readiness=summary.readiness;row.alignment_risk=summary.alignmentRisk;}}
 return {rows,total:rows.length?Number(rows[0].total_count):0,limit,offset};
}
async function getTeamUsers(userId,role){const {rows}=await query(`SELECT DISTINCT u.id,u.username,u.email,u.roles FROM sales_team_memberships me JOIN sales_teams t ON t.id=me.team_id AND t.status='active' JOIN sales_team_memberships tm ON tm.team_id=me.team_id AND tm.is_active=TRUE AND tm.effective_start<=CURRENT_DATE AND (tm.effective_end IS NULL OR tm.effective_end>=CURRENT_DATE) JOIN users u ON u.id=tm.user_id AND u.is_active=TRUE WHERE me.user_id=$1 AND me.is_active=TRUE AND me.effective_start<=CURRENT_DATE AND (me.effective_end IS NULL OR me.effective_end>=CURRENT_DATE) AND ($2=ANY(u.roles) OR u.role=$2) ORDER BY u.username`,[userId,role]);return rows;}
async function listAuthorizedSolutionFits(user){const global=hasPermission(user,'view_all_solution_fits'),team=hasPermission(user,'view_team_solution_fits');const {rows}=await query(`SELECT h.id,h.customer_id,h.primary_se_id,h.additional_se_ids,h.readiness,h.status,h.updated_at,c.name customer_name,c.owner_id,u.username owner_username FROM handoffs h JOIN customers c ON c.id=h.customer_id JOIN users u ON u.id=c.owner_id WHERE h.deleted_at IS NULL AND ($2 OR h.primary_se_id=$1 OR $1=ANY(h.additional_se_ids) OR c.owner_id=$1 OR ($3 AND ${customerScopeSql('c','$1')})) ORDER BY h.updated_at DESC`,[user.id,global,team]);return rows;}

module.exports={ROLE_PERMISSIONS,rolesOf,effectivePermissions,hasPermission,resolveCustomerDecision,resolveSolutionFitDecision,getUserTeams,getAuthorizedSalesReps,customerAccess,solutionFitAccess,scenarioAccess,opportunityAccessByBaseId,listAuthorizedCustomers,searchAuthorizedCustomers,listAuthorizedSolutionFits,getTeamUsers,customerScopeSql};
