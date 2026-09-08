'use strict';
const express=require('express'),router=express.Router();
const {requireAuth}=require('../middleware/auth');
const {relevant}=require('../shared/customer-proof-catalog');
router.use(requireAuth);
router.get('/',(req,res)=>res.json({records:relevant({industry:req.query.industry,product:req.query.product,useCase:req.query.useCase}),maximumSelection:3,catalogVersion:'2026-08-31'}));
module.exports=router;
