'use strict';
/* Dedicated customer discovery for Solution Fit. This route intentionally does
   not reuse or widen the global customer switcher or scenario authorization. */
const express=require('express');
const {query}=require('../db');
const {requireAuth}=require('../middleware/auth');
const {hasPermission,customerScopeSql,resolveSolutionFitDecision}=require('../authorization');
const router=express.Router();
router.use(requireAuth);

router.get('/',async(req,res)=>{
  try{
    const search=String(req.query.search||'').trim().slice(0,120);
    const limit=Math.max(5,Math.min(25,Number(req.query.limit)||12));
    const offset=Math.max(0,Number(req.query.offset)||0);
    const crossAccount=hasPermission(req.user,'solution_fit_cross_account');
    const teamScoped=hasPermission(req.user,'view_team_customers');
    const canCreate=hasPermission(req.user,'create_solution_fit')||hasPermission(req.user,'edit_all_solution_fits');
    const {rows}=await query(`SELECT c.id,c.name,c.owner_id,u.username owner_name,c.owner_id=$1 is_owner,
      EXISTS(SELECT 1 FROM scenarios sh WHERE sh.customer_id=c.id AND $1=ANY(sh.shared_with) AND sh.deleted_at IS NULL) explicitly_shared,
      EXISTS(SELECT 1 FROM sales_team_memberships viewer JOIN sales_teams active_team ON active_team.id=viewer.team_id AND active_team.status='active' JOIN sales_team_memberships owner_m ON owner_m.team_id=viewer.team_id AND owner_m.user_id=c.owner_id AND owner_m.is_active=TRUE AND owner_m.effective_start<=CURRENT_DATE AND (owner_m.effective_end IS NULL OR owner_m.effective_end>=CURRENT_DATE) WHERE viewer.user_id=$1 AND viewer.is_active=TRUE AND viewer.effective_start<=CURRENT_DATE AND (viewer.effective_end IS NULL OR viewer.effective_end>=CURRENT_DATE)) team_scoped,
      h.id solution_fit_id,h.readiness,h.status,h.updated_at,h.primary_se_id,pse.username primary_se,
      COALESCE(h.data->'solutionScope'->>'primaryProduct','') primary_product,
      COALESCE(h.data->'solutionScope'->>'erp','') erp,
      COALESCE((SELECT ARRAY_AGG(DISTINCT t.name ORDER BY t.name) FROM sales_team_memberships om JOIN sales_teams t ON t.id=om.team_id AND t.status='active' WHERE om.user_id=c.owner_id AND om.is_active=TRUE AND om.effective_start<=CURRENT_DATE AND (om.effective_end IS NULL OR om.effective_end>=CURRENT_DATE)),'{}') team_names,
      COUNT(*) OVER() total_count
      FROM customers c
      JOIN users u ON u.id=c.owner_id
      LEFT JOIN handoffs h ON h.customer_id=c.id AND h.deleted_at IS NULL
      LEFT JOIN users pse ON pse.id=h.primary_se_id
      WHERE c.deleted_at IS NULL AND COALESCE(c.status,'active')='active'
        AND ($2 OR c.owner_id=$1 OR EXISTS(SELECT 1 FROM scenarios sx WHERE sx.customer_id=c.id AND $1=ANY(sx.shared_with) AND sx.deleted_at IS NULL) OR ($6 AND ${customerScopeSql('c','$1')}))
        AND ($3='' OR c.name ILIKE '%'||$3||'%' OR u.username ILIKE '%'||$3||'%')
      ORDER BY CASE WHEN h.updated_at IS NULL THEN 1 ELSE 0 END,h.updated_at DESC,c.name
      LIMIT $4 OFFSET $5`,[req.user.id,crossAccount,search,limit,offset,teamScoped]);
    const items=rows.map(r=>{const fitExists=!!r.solution_fit_id;const scope={owned:r.is_owner,shared:r.explicitly_shared,teamScoped:r.team_scoped,assigned:String(r.primary_se_id||'')===String(req.user.id)};const scopedDecision=resolveSolutionFitDecision(req.user,scope,fitExists?'view':'edit');return {
      id:r.id,name:r.name,owner:{id:r.owner_id,name:r.owner_name},teams:r.team_names||[],erp:r.erp||null,
      solutionFit:{exists:fitExists,status:fitExists?(r.status||'not_ready'):'not_started',readiness:fitExists?Number(r.readiness)||0:null,updatedAt:r.updated_at||null,primarySe:r.primary_se||null,primarySeId:r.primary_se_id||null},
      actions:{canOpen:fitExists&&scopedDecision,canCreate:!fitExists&&canCreate&&scopedDecision}
    };});
    res.json({items,total:rows.length?Number(rows[0].total_count):0,limit,offset,scope:'solution_fit_only'});
  }catch(err){console.error('Solution Fit customer search:',err.message);res.status(500).json({error:'Solution Fit customers could not be searched.'});}
});

module.exports=router;
