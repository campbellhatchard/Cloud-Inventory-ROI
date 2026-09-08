'use strict';
const express=require('express');
const {requireAuth}=require('../middleware/auth');
const {browserCatalog}=require('../shared/mep-standard-apps');
const router=express.Router();
router.use(requireAuth);
router.get('/mep-standard-apps',(req,res)=>res.json(browserCatalog()));
module.exports=router;
