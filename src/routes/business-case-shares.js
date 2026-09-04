'use strict';
const router=require('express').Router();
const crypto=require('crypto');
const {query}=require('../db');
const {requireAuth}=require('../middleware/auth');
const {customerAccess}=require('../authorization');
const {preparePublication}=require('../shared/business-case-publication');
const {loadExecutiveSource}=require('./scenarios');
const expired='This business case was created with an earlier output format. Please contact your Cloud Inventory representative for an updated link.';
router.post('/',requireAuth,async(req,res)=>{try{
 const scenarioId=String(req.body?.scenarioId||'');if(!scenarioId)return res.status(400).json({error:'scenarioId required.'});
 const p=await preparePublication({user:req.user,scenarioId,reviewAcknowledged:req.body?.reviewAcknowledged,loadSource:loadExecutiveSource,customerAccess});
 const token=crypto.randomBytes(32).toString('hex');
 await query(`INSERT INTO business_case_shares(token,scenario_id,scenario_base_id,owner_id,company,title,scenario_version,story_revision,model_version,currency,output_readiness,review_acknowledged,published_payload,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[token,p.scenario.id,p.scenario.base_id,req.user.id,p.payload.customer,'Customer Business Case',p.scenario.version,p.story.storyRevision,p.story.meta.modelVersion,p.payload.currency,p.readiness.status,req.body?.reviewAcknowledged===true,JSON.stringify(p.payload),p.publishedAt]);
 res.status(201).json({ok:true,token,shareUrl:`/business-case.html?token=${token}`});
 }catch(e){res.status(e.status||500).json({error:e.status?e.message:'Failed to publish business case.',...(e.readiness?{readiness:e.readiness}:{})});}});
router.get('/:token',async(req,res)=>{try{
 if(!/^[a-f0-9]{64}$/.test(req.params.token))return res.status(400).json({error:'Invalid token.'});
 const {rows}=await query('SELECT id,is_active,published_payload FROM business_case_shares WHERE token=$1',[req.params.token]);
 if(!rows.length)return res.status(404).json({error:'Business case not found.'});
 const row=rows[0];if(!row.is_active||!row.published_payload)return res.status(410).json({error:expired});
 await query('UPDATE business_case_shares SET view_count=COALESCE(view_count,0)+1,first_viewed=COALESCE(first_viewed,NOW()),last_viewed=NOW() WHERE id=$1',[row.id]);
 res.set('Cache-Control','no-store');res.json(row.published_payload);
 }catch(e){res.status(500).json({error:'Failed to load business case.'});}});
router.post('/:token/assumptions',(_req,res)=>res.status(410).json({error:expired}));
module.exports=router;
